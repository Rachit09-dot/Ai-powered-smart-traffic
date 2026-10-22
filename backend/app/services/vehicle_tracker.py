import numpy as np
import time
from typing import List, Dict, Any, Optional
from collections import deque
from app.services.vehicle_detector import VehicleDetection

def calculate_iou(boxA: List[int], boxB: List[int]) -> float:
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

class TrackedVehicle:
    def __init__(self, track_id: int, detection: VehicleDetection, timestamp: float):
        self.track_id = track_id
        self.class_name = detection.class_name
        self.class_id = detection.class_id
        self.confidence = detection.confidence
        self.bbox = detection.bbox
        self.center = self._get_center(detection.bbox)
        
        # Motion history: stores (x, y, timestamp)
        self.history = deque(maxlen=40)
        self.history.append((self.center[0], self.center[1], timestamp))
        
        self.velocity = (0.0, 0.0) # (vx, vy) in pixels/sec
        self.speed = 0.0           # magnitude in pixels/sec
        self.acceleration = 0.0    # delta speed / delta time
        self.stationary_duration = 0.0  # seconds stationary
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.missing_frames = 0

    @staticmethod
    def _get_center(bbox: List[int]) -> tuple:
        return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)

    def update(self, detection: VehicleDetection, timestamp: float):
        prev_center = self.center
        prev_speed = self.speed
        dt = max(0.001, timestamp - self.last_seen)

        self.bbox = detection.bbox
        self.center = self._get_center(detection.bbox)
        self.confidence = detection.confidence
        self.last_seen = timestamp
        self.missing_frames = 0
        self.history.append((self.center[0], self.center[1], timestamp))

        # Calculate velocity & speed
        vx = (self.center[0] - prev_center[0]) / dt
        vy = (self.center[1] - prev_center[1]) / dt
        self.velocity = (vx, vy)
        self.speed = np.sqrt(vx * vx + vy * vy)

        # Acceleration (negative = deceleration)
        self.acceleration = (self.speed - prev_speed) / dt

        # Update stationary duration
        if self.speed < 12.0:  # Threshold for stationary vehicle in pixels/second
            self.stationary_duration += dt
        else:
            self.stationary_duration = max(0.0, self.stationary_duration - dt * 0.5)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "class_name": self.class_name,
            "confidence": round(self.confidence, 3),
            "bbox": self.bbox,
            "center": [round(c, 1) for c in self.center],
            "speed": round(float(self.speed), 1),
            "acceleration": round(float(self.acceleration), 1),
            "stationary_duration": round(float(self.stationary_duration), 2)
        }

class VehicleTracker:
    def __init__(self, iou_threshold: float = 0.25, max_missing_frames: int = 15):
        self.iou_threshold = iou_threshold
        self.max_missing_frames = max_missing_frames
        self.tracks: Dict[int, TrackedVehicle] = {}
        self.next_track_id = 1

    def update(self, detections: List[VehicleDetection], current_time: Optional[float] = None) -> List[TrackedVehicle]:
        if current_time is None:
            current_time = time.time()

        if not detections:
            # Increment missing frames for all existing tracks
            expired_ids = []
            for track_id, track in self.tracks.items():
                track.missing_frames += 1
                if track.missing_frames > self.max_missing_frames:
                    expired_ids.append(track_id)
            for track_id in expired_ids:
                del self.tracks[track_id]
            return list(self.tracks.values())

        track_ids = list(self.tracks.keys())
        active_tracks = [self.tracks[tid] for tid in track_ids]

        # Compute IoU cost matrix between existing tracks and new detections
        matched_detections = set()
        matched_tracks = set()

        if active_tracks and detections:
            cost_matrix = np.zeros((len(active_tracks), len(detections)), dtype=np.float32)
            for t_idx, track in enumerate(active_tracks):
                for d_idx, det in enumerate(detections):
                    cost_matrix[t_idx, d_idx] = calculate_iou(track.bbox, det.bbox)

            # Greedy bipartite matching
            while True:
                max_iou = np.max(cost_matrix)
                if max_iou < self.iou_threshold:
                    break
                t_idx, d_idx = np.unravel_index(np.argmax(cost_matrix), cost_matrix.shape)
                track_id = track_ids[t_idx]
                
                self.tracks[track_id].update(detections[d_idx], current_time)
                matched_tracks.add(t_idx)
                matched_detections.add(d_idx)
                
                # Zero out row and column
                cost_matrix[t_idx, :] = -1.0
                cost_matrix[:, d_idx] = -1.0

        # Handle unmatched existing tracks
        expired_ids = []
        for t_idx, track_id in enumerate(track_ids):
            if t_idx not in matched_tracks:
                self.tracks[track_id].missing_frames += 1
                if self.tracks[track_id].missing_frames > self.max_missing_frames:
                    expired_ids.append(track_id)
        for track_id in expired_ids:
            del self.tracks[track_id]

        # Handle new unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_detections:
                new_track = TrackedVehicle(self.next_track_id, det, current_time)
                self.tracks[self.next_track_id] = new_track
                self.next_track_id += 1

        return list(self.tracks.values())
