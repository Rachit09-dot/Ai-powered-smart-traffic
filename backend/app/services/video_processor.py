import asyncio
import cv2
import numpy as np
import time
import threading
import logging
from typing import Dict, Optional, Callable, Generator, Any
import uuid
import json
from pathlib import Path

from app.core.config import settings
from app.database.connection import AsyncSessionLocal
from app.models.db_models import (
    Camera, ProcessingSession, TrafficObservation, CameraStatus,
    CongestionLevel, IncidentSeverity
)
from app.services.vehicle_detector import VehicleDetector, VehicleDetection
from app.services.vehicle_tracker import VehicleTracker, TrackedVehicle
from app.services.traffic_analyzer import TrafficAnalyzer, TrafficAnalysisResult
from app.services.accident_detector import HeuristicAccidentDetector, AccidentEvent
from app.services.alert_service import AlertService
from app.models.db_models import utc_now

logger = logging.getLogger(__name__)

class VideoProcessingWorker:
    def __init__(
        self,
        camera_id: str,
        source_path: str,
        broadcast_callback: Optional[Callable] = None,
        conf_threshold: float = settings.CONFIDENCE_THRESHOLD,
        enable_accident_detection: bool = True,
        event_loop: Optional[asyncio.AbstractEventLoop] = None
    ):
        self.camera_id = camera_id
        self.source_path = source_path
        self.broadcast_callback = broadcast_callback
        self.conf_threshold = conf_threshold
        self.enable_accident_detection = enable_accident_detection
        self.event_loop = event_loop

        self.session_id = f"sess-{uuid.uuid4().hex[:8]}"
        self.is_running = False
        self.is_paused = False
        self._thread: Optional[threading.Thread] = None

        # CV Pipeline components
        self.detector = VehicleDetector(conf_threshold=conf_threshold)
        self.tracker = VehicleTracker(iou_threshold=settings.IOU_THRESHOLD)
        self.analyzer = TrafficAnalyzer()
        self.accident_detector = HeuristicAccidentDetector()

        # Latest frame JPEG bytes for live MJPEG streaming
        self.latest_encoded_frame: Optional[bytes] = None
        self._frame_lock = threading.Lock()

        # Telemetry & performance metrics
        self.current_fps = 0.0
        self.frames_processed = 0
        self.latest_analysis: Optional[TrafficAnalysisResult] = None
        self.latest_events: list[AccidentEvent] = []

        # Synthetic simulation state (if source_path is DEMO_SYNTHETIC)
        self._is_synthetic = (source_path == "demo_synthetic" or not Path(source_path).exists())
        self._synthetic_step = 0
        self._synthetic_cars = [
            {"id": 1, "x": 100, "y": 280, "vx": 4.5, "vy": 0.0, "w": 90, "h": 50, "cls": "car", "color": (40, 180, 240)},
            {"id": 2, "x": 350, "y": 380, "vx": 6.0, "vy": 0.0, "w": 95, "h": 55, "cls": "car", "color": (220, 120, 40)},
            {"id": 3, "x": 50, "y": 480, "vx": 3.8, "vy": 0.0, "w": 160, "h": 70, "cls": "bus", "color": (50, 220, 100)},
            {"id": 4, "x": 600, "y": 280, "vx": 5.2, "vy": 0.0, "w": 85, "h": 48, "cls": "car", "color": (240, 80, 80)},
            {"id": 5, "x": 200, "y": 380, "vx": 5.0, "vy": 0.0, "w": 50, "h": 30, "cls": "motorcycle", "color": (180, 50, 240)},
            {"id": 6, "x": 800, "y": 480, "vx": 3.2, "vy": 0.0, "w": 180, "h": 80, "cls": "truck", "color": (120, 120, 120)}
        ]

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.is_paused = False
        self._persist_session_start()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"Started video processing worker for camera {self.camera_id} (Session {self.session_id})")

    def pause(self):
        self.is_paused = not self.is_paused

    def stop(self):
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._persist_session_stop()
        logger.info(f"Stopped video processing worker for camera {self.camera_id}")

    def _schedule_db(self, coro):
        """
        Schedule a coroutine on the main event loop from a background thread.
        Falls back to asyncio.run() if no event loop is available (e.g. in tests).
        """
        if self.event_loop is not None and self.event_loop.is_running():
            future = asyncio.run_coroutine_threadsafe(coro, self.event_loop)
            return future
        else:
            # Fallback for standalone execution without a running loop
            return asyncio.run(coro)

    def _persist_session_start(self):
        """Persist a ProcessingSession record to the database when pipeline starts."""
        async def _save():
            async with AsyncSessionLocal() as db:
                session = ProcessingSession(
                    id=self.session_id,
                    camera_id=self.camera_id,
                    status="RUNNING",
                    started_at=utc_now(),
                    frames_processed=0,
                    average_fps=0.0
                )
                db.add(session)
                await db.commit()
        try:
            self._schedule_db(_save())
        except Exception as e:
            logger.error(f"Error persisting processing session start: {e}")

    def _persist_session_stop(self):
        """Update ProcessingSession status when pipeline stops."""
        async def _update():
            from sqlalchemy import update as sql_update
            async with AsyncSessionLocal() as db:
                await db.execute(
                    sql_update(ProcessingSession)
                    .where(ProcessingSession.id == self.session_id)
                    .values(
                        status="STOPPED",
                        stopped_at=utc_now(),
                        frames_processed=self.frames_processed,
                        average_fps=round(self.current_fps, 1)
                    )
                )
                await db.commit()
        try:
            self._schedule_db(_update())
        except Exception as e:
            logger.error(f"Error persisting processing session stop: {e}")

    def get_latest_frame(self) -> Optional[bytes]:
        with self._frame_lock:
            return self.latest_encoded_frame

    def _generate_synthetic_frame(self, width: int = 960, height: int = 540) -> np.ndarray:
        """
        Creates a dynamic synthetic road highway simulation with realistic lane marks,
        moving cars, and periodically staged anomalies (stopped vehicle / near collision)
        so testing and demonstration work flawlessly without external video files.
        """
        frame = np.full((height, width, 3), (35, 38, 46), dtype=np.uint8)

        # Draw Asphalt Road
        road_top = 220
        road_bottom = 540
        cv2.rectangle(frame, (0, road_top), (width, road_bottom), (55, 60, 68), -1)

        # Draw Road Borders
        cv2.line(frame, (0, road_top), (width, road_top), (220, 220, 220), 3)
        cv2.line(frame, (0, road_bottom - 2), (width, road_bottom - 2), (220, 220, 220), 3)

        # Draw Lane Dashes
        lane_y1 = 330
        lane_y2 = 440
        dash_offset = (self._synthetic_step * 8) % 60
        for x in range(-60 + dash_offset, width + 60, 60):
            cv2.line(frame, (x, lane_y1), (x + 30, lane_y1), (200, 200, 200), 2)
            cv2.line(frame, (x, lane_y2), (x + 30, lane_y2), (200, 200, 200), 2)

        # Overhead gantry sign
        cv2.rectangle(frame, (0, 0), (width, 80), (22, 27, 34), -1)
        cv2.putText(frame, f"SMART CITY TRAFFIC MONITORING - {self.camera_id.upper()}", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (56, 189, 248), 2)
        cv2.putText(frame, "LIVE SURVEILLANCE FEED", (20, 62),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1)

        self._synthetic_step += 1

        # Periodic staged anomaly: Car #4 stops on highway at step 200-350 to demonstrate stopped-vehicle detection
        stage_stopped_hazard = (180 <= (self._synthetic_step % 600) <= 340)

        # Animate vehicles
        for car in self._synthetic_cars:
            if car["id"] == 4 and stage_stopped_hazard:
                # Vehicle stationary
                pass
            else:
                car["x"] += car["vx"]
                if car["x"] > width + 100:
                    car["x"] = -150

            cx = int(car["x"])
            cy = int(car["y"])
            w = car["w"]
            h = car["h"]

            # Vehicle body
            cv2.rectangle(frame, (cx, cy), (cx + w, cy + h), car["color"], -1)
            # Windshield
            cv2.rectangle(frame, (cx + int(w * 0.6), cy + 4), (cx + int(w * 0.85), cy + h - 4), (200, 230, 255), -1)
            # Headlights
            cv2.circle(frame, (cx + w, cy + 8), 4, (255, 255, 200), -1)
            cv2.circle(frame, (cx + w, cy + h - 8), 4, (255, 255, 200), -1)
            # Label
            cv2.putText(frame, car["cls"].upper(), (cx + 5, cy + int(h/2) + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)

        return frame

    def _draw_overlay(
        self,
        frame: np.ndarray,
        tracks: list[TrackedVehicle],
        analysis: TrafficAnalysisResult,
        events: list[AccidentEvent]
    ) -> np.ndarray:
        overlay = frame.copy()

        # Color mapping for congestion
        congestion_color = (16, 185, 129)  # Green LOW
        if analysis.congestion_level == CongestionLevel.MEDIUM.value:
            congestion_color = (245, 158, 11)  # Amber MEDIUM
        elif analysis.congestion_level == CongestionLevel.HIGH.value:
            congestion_color = (239, 68, 68)  # Red HIGH

        # Draw Vehicle Tracks
        for t in tracks:
            x1, y1, x2, y2 = t.bbox
            
            # Highlight stationary / anomalous vehicles
            box_color = (56, 189, 248)  # Cyan default
            if t.stationary_duration > 3.0:
                box_color = (239, 68, 68)  # Red stopped hazard
            elif t.acceleration < -100.0:
                box_color = (245, 158, 11) # Yellow abrupt deceleration

            # Draw bounding box
            cv2.rectangle(overlay, (x1, y1), (x2, y2), box_color, 2)

            # Draw trajectory trail
            if len(t.history) > 1:
                pts = np.array([(int(pt[0]), int(pt[1])) for pt in t.history], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(overlay, [pts], False, box_color, 1)

            # Label badge: ID, Class, Speed
            label = f"#{t.track_id} {t.class_name} {t.speed:.0f}px/s"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(overlay, (x1, max(0, y1 - 20)), (x1 + lw + 8, y1), box_color, -1)
            cv2.putText(overlay, label, (x1 + 4, max(14, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 15, 25), 1, cv2.LINE_AA)

        # Draw Incident / Anomaly warning boxes
        for ev in events:
            bx1, by1, bx2, by2 = ev.bbox
            alert_color = (220, 38, 38) if ev.severity == IncidentSeverity.CRITICAL.value else (245, 158, 11)
            # Pulsing thick rectangle
            cv2.rectangle(overlay, (bx1 - 4, by1 - 4), (bx2 + 4, by2 + 4), alert_color, 3)
            alert_tag = f"ALERT: {ev.event_type} ({int(ev.confidence*100)}%)"
            cv2.rectangle(overlay, (bx1, by2 + 4), (bx1 + 240, by2 + 28), (15, 23, 42), -1)
            cv2.putText(overlay, alert_tag, (bx1 + 6, by2 + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, alert_color, 2)

        # HUD Top-Right Telemetry Card
        hud_w, hud_h = 320, 120
        h_frame, w_frame = overlay.shape[:2]
        hud_x = w_frame - hud_w - 15
        hud_y = 15

        # Glassmorphic semi-transparent HUD panel
        hud_bg = overlay[hud_y:hud_y + hud_h, hud_x:hud_x + hud_w].copy()
        cv2.rectangle(hud_bg, (0, 0), (hud_w, hud_h), (11, 19, 38), -1)
        overlay[hud_y:hud_y + hud_h, hud_x:hud_x + hud_w] = cv2.addWeighted(
            overlay[hud_y:hud_y + hud_h, hud_x:hud_x + hud_w], 0.2, hud_bg, 0.8, 0
        )
        cv2.rectangle(overlay, (hud_x, hud_y), (hud_x + hud_w, hud_y + hud_h), (30, 53, 103), 1)

        # HUD Text
        cv2.putText(overlay, f"FPS: {self.current_fps:.1f} | DENSITY: {analysis.congestion_level}",
                    (hud_x + 12, hud_y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, congestion_color, 2)
        cv2.putText(overlay, f"Active Vehicles: {analysis.total_vehicles} (Cars: {analysis.breakdown.get('car', 0)}, Trucks: {analysis.breakdown.get('truck', 0)})",
                    (hud_x + 12, hud_y + 52), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (226, 232, 240), 1)
        cv2.putText(overlay, f"Flow Rate: {analysis.estimated_flow_rate_vpm:.1f} v/min | Avg Speed: {analysis.avg_speed_px_sec:.1f} px/s",
                    (hud_x + 12, hud_y + 78), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (148, 163, 184), 1)
        cv2.putText(overlay, f"Active Incidents: {len(events)}",
                    (hud_x + 12, hud_y + 104), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                    (239, 68, 68) if events else (16, 185, 129), 1)

        return overlay

    def _run_loop(self):
        cap = None
        if not self._is_synthetic:
            try:
                # Check if camera is webcam (integer like 0)
                if str(self.source_path).isdigit():
                    cap = cv2.VideoCapture(int(self.source_path))
                else:
                    cap = cv2.VideoCapture(str(self.source_path))
                if not cap.isOpened():
                    logger.warning(f"Could not open video source '{self.source_path}'. Falling back to synthetic mode.")
                    self._is_synthetic = True
            except Exception as e:
                logger.error(f"Error opening video capture: {e}")
                self._is_synthetic = True

        last_time = time.time()
        last_db_save = time.time()

        while self.is_running:
            if self.is_paused:
                time.sleep(0.1)
                continue

            frame_start = time.time()

            # Read frame
            if self._is_synthetic:
                frame = self._generate_synthetic_frame()
            else:
                ret, frame = cap.read()
                if not ret:
                    # Loop video if reached end of file
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                    if not ret:
                        time.sleep(0.05)
                        continue

            # Scale frame down if too large for real-time throughput
            h, w = frame.shape[:2]
            if w > settings.MAX_PROCESSING_FRAME_WIDTH:
                scale = settings.MAX_PROCESSING_FRAME_WIDTH / float(w)
                frame = cv2.resize(frame, (settings.MAX_PROCESSING_FRAME_WIDTH, int(h * scale)))

            curr_time = time.time()

            # 1. Vehicle Detection
            if self._is_synthetic:
                # In synthetic mode, map known simulated vehicle boxes directly into VehicleDetection
                detections = []
                for car in self._synthetic_cars:
                    cx, cy = int(car["x"]), int(car["y"])
                    cw, ch = car["w"], car["h"]
                    detections.append(
                        VehicleDetection(
                            bbox=[cx, cy, cx + cw, cy + ch],
                            confidence=0.92,
                            class_id=2 if car["cls"] == "car" else (5 if car["cls"] == "bus" else 7),
                            class_name=car["cls"]
                        )
                    )
            else:
                detections = self.detector.detect(frame)

            # 2. Tracking
            tracks = self.tracker.update(detections, current_time=curr_time)

            # 3. Traffic Density Analysis
            analysis = self.analyzer.analyze(tracks, frame.shape)
            self.latest_analysis = analysis

            # 4. Incident & Anomaly Detection
            events = []
            if self.enable_accident_detection:
                events = self.accident_detector.process_frame(tracks, frame, current_time=curr_time)
                self.latest_events = events

                # Persist detected incidents thread-safely on main event loop
                for ev in events:
                    try:
                        self._schedule_db(
                            AlertService.create_incident_from_event(
                                camera_id=self.camera_id,
                                session_id=self.session_id,
                                event=ev
                            )
                        )
                    except Exception as e:
                        logger.error(f"Error persisting incident: {e}")

            # 5. Render HUD & Overlays
            rendered_frame = self._draw_overlay(frame, tracks, analysis, events)

            # 6. Encode Frame to JPEG for MJPEG Streaming
            ret, jpeg = cv2.imencode('.jpg', rendered_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                with self._frame_lock:
                    self.latest_encoded_frame = jpeg.tobytes()

            self.frames_processed += 1
            dt = max(0.001, time.time() - frame_start)
            self.current_fps = round(1.0 / dt, 1)

            # 7. Periodically save traffic observation snapshot to DB (every 3 seconds)
            if (curr_time - last_db_save) >= 3.0:
                last_db_save = curr_time
                self._save_traffic_observation_sync(analysis)

            # 8. Broadcast telemetry update to WebSocket subscribers
            if self.broadcast_callback:
                telemetry_payload = {
                    "type": "TRAFFIC_UPDATE",
                    "camera_id": self.camera_id,
                    "session_id": self.session_id,
                    "fps": self.current_fps,
                    "frames_processed": self.frames_processed,
                    "metrics": analysis.to_dict(),
                    "active_tracks": [t.to_dict() for t in tracks[:10]],
                    "active_events": [e.to_dict() for e in events]
                }
                self.broadcast_callback(telemetry_payload)

            # Maintain target FPS throttle to avoid burning 100% CPU on fast systems
            target_dt = 1.0 / float(settings.PROCESSING_TARGET_FPS)
            elapsed = time.time() - frame_start
            if elapsed < target_dt:
                time.sleep(target_dt - elapsed)

        if cap is not None:
            cap.release()

    def _save_traffic_observation_sync(self, analysis: TrafficAnalysisResult):
        async def _save():
            async with AsyncSessionLocal() as db:
                obs = TrafficObservation(
                    session_id=self.session_id,
                    camera_id=self.camera_id,
                    total_vehicles=analysis.total_vehicles,
                    cars=analysis.breakdown.get("car", 0),
                    motorcycles=analysis.breakdown.get("motorcycle", 0),
                    buses=analysis.breakdown.get("bus", 0),
                    trucks=analysis.breakdown.get("truck", 0),
                    density_score=analysis.density_score,
                    congestion_level=analysis.congestion_level,
                    avg_speed_estimate=analysis.avg_speed_px_sec
                )
                db.add(obs)
                await db.commit()
        try:
            self._schedule_db(_save())
        except Exception as e:
            logger.error(f"Error saving traffic observation: {e}")

class VideoProcessingManager:
    """
    Singleton Manager for managing multiple active camera processing pipelines.
    """
    def __init__(self):
        self.workers: Dict[str, VideoProcessingWorker] = {}
        self.broadcast_callback: Optional[Callable] = None
        self.event_loop: Optional[asyncio.AbstractEventLoop] = None

    def set_broadcast_callback(self, cb: Callable):
        self.broadcast_callback = cb

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Register the main asyncio event loop for thread-safe DB operations."""
        self.event_loop = loop

    def start_pipeline(
        self,
        camera_id: str,
        source_path: str,
        conf_threshold: float = settings.CONFIDENCE_THRESHOLD,
        enable_accident_detection: bool = True
    ) -> VideoProcessingWorker:
        if camera_id in self.workers and self.workers[camera_id].is_running:
            return self.workers[camera_id]

        worker = VideoProcessingWorker(
            camera_id=camera_id,
            source_path=source_path,
            broadcast_callback=self.broadcast_callback,
            conf_threshold=conf_threshold,
            enable_accident_detection=enable_accident_detection,
            event_loop=self.event_loop
        )
        self.workers[camera_id] = worker
        worker.start()
        return worker

    def stop_pipeline(self, camera_id: str):
        if camera_id in self.workers:
            self.workers[camera_id].stop()
            del self.workers[camera_id]

    def pause_pipeline(self, camera_id: str):
        if camera_id in self.workers:
            self.workers[camera_id].pause()

    def get_worker(self, camera_id: str) -> Optional[VideoProcessingWorker]:
        return self.workers.get(camera_id)

    def is_camera_processing(self, camera_id: str) -> bool:
        worker = self.workers.get(camera_id)
        return worker is not None and worker.is_running

video_manager = VideoProcessingManager()
