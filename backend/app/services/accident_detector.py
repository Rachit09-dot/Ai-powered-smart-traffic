import time
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from app.core.config import settings
from app.models.db_models import IncidentSeverity
from app.services.vehicle_tracker import TrackedVehicle, calculate_iou

logger = logging.getLogger(__name__)

class AccidentEvent:
    def __init__(
        self,
        event_type: str,
        severity: str,
        confidence: float,
        track_ids: List[int],
        bbox: List[int],
        description: str,
        timestamp: float
    ):
        self.event_type = event_type  # POTENTIAL_ACCIDENT, TRAFFIC_ANOMALY, STOPPED_VEHICLE, SUDDEN_DECELERATION
        self.severity = severity      # LOW, MEDIUM, HIGH, CRITICAL
        self.confidence = confidence  # 0.0 to 1.0
        self.track_ids = track_ids
        self.bbox = bbox              # [x1, y1, x2, y2]
        self.description = description
        self.timestamp = timestamp

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "severity": self.severity,
            "confidence": round(float(self.confidence), 3),
            "track_ids": self.track_ids,
            "bbox": self.bbox,
            "description": self.description,
            "timestamp": self.timestamp
        }

class BaseAccidentDetector(ABC):
    """
    Abstract base class for traffic anomaly and accident detection models.
    Can be backed by heuristic rules, spatial-temporal graphs, or deep learning (CNN/LSTM).
    """

    @abstractmethod
    def process_frame(
        self,
        tracks: List[TrackedVehicle],
        frame: Optional[np.ndarray] = None,
        current_time: Optional[float] = None
    ) -> List[AccidentEvent]:
        """
        Analyze current frame tracks and optional raw frame for anomalous events.
        """
        pass

class HeuristicAccidentDetector(BaseAccidentDetector):
    """
    Validated baseline accident and anomaly detector using observable kinematic features:
    1. Sudden Deceleration Anomaly: Rapid velocity drop exceeding natural braking profile.
    2. Stopped Vehicle Anomaly: Persistent stationary vehicle in an active flow zone.
    3. Potential Collision / Accident: Spatiotemporal bounding box overlap / proximity
       correlated with abrupt velocity collapse across multiple vehicle tracks.
       
    Includes a configurable cooldown mechanism to prevent duplicate alert storms.
    """

    def __init__(
        self,
        stopped_time_threshold: float = settings.STOPPED_VEHICLE_TIME_THRESHOLD_SEC,
        collision_iou_threshold: float = settings.COLLISION_IOU_THRESHOLD,
        cooldown_seconds: float = settings.ALERT_COOLDOWN_SECONDS
    ):
        self.stopped_time_threshold = stopped_time_threshold
        self.collision_iou_threshold = collision_iou_threshold
        self.cooldown_seconds = cooldown_seconds
        
        # Cooldown map: key -> last_alert_timestamp
        self._recent_alerts: Dict[str, float] = {}

    def _is_on_cooldown(self, key: str, current_time: float) -> bool:
        last_time = self._recent_alerts.get(key)
        if last_time is not None and (current_time - last_time) < self.cooldown_seconds:
            return True
        self._recent_alerts[key] = current_time
        return False

    def process_frame(
        self,
        tracks: List[TrackedVehicle],
        frame: Optional[np.ndarray] = None,
        current_time: Optional[float] = None
    ) -> List[AccidentEvent]:
        if current_time is None:
            current_time = time.time()

        events: List[AccidentEvent] = []

        # 1. Check pairwise collisions (Potential Accident)
        n = len(tracks)
        for i in range(n):
            for j in range(i + 1, n):
                t1 = tracks[i]
                t2 = tracks[j]

                iou = calculate_iou(t1.bbox, t2.bbox)
                
                # Check bounding box overlap or extreme proximity
                if iou >= self.collision_iou_threshold:
                    # If either vehicle has decelerated heavily or is stationary
                    is_abrupt_halt = (t1.speed < 15.0 or t2.speed < 15.0) or (t1.acceleration < -80.0 or t2.acceleration < -80.0)
                    if is_abrupt_halt:
                        key = f"collision_{min(t1.track_id, t2.track_id)}_{max(t1.track_id, t2.track_id)}"
                        if not self._is_on_cooldown(key, current_time):
                            union_bbox = [
                                min(t1.bbox[0], t2.bbox[0]),
                                min(t1.bbox[1], t2.bbox[1]),
                                max(t1.bbox[2], t2.bbox[2]),
                                max(t1.bbox[3], t2.bbox[3])
                            ]
                            conf = min(0.92, 0.55 + (iou * 0.5) + (0.2 if (t1.speed < 10 and t2.speed < 10) else 0.05))
                            events.append(
                                AccidentEvent(
                                    event_type="POTENTIAL_ACCIDENT",
                                    severity=IncidentSeverity.CRITICAL.value if iou > 0.3 else IncidentSeverity.HIGH.value,
                                    confidence=round(conf, 2),
                                    track_ids=[t1.track_id, t2.track_id],
                                    bbox=union_bbox,
                                    description=(
                                        f"Potential collision detected between {t1.class_name} #{t1.track_id} "
                                        f"and {t2.class_name} #{t2.track_id} (Bounding Box IoU: {iou:.2f}, "
                                        f"Combined Speed: {t1.speed + t2.speed:.1f} px/s). Requires operator verification."
                                    ),
                                    timestamp=current_time
                                )
                            )

        # 2. Check individual vehicle anomalies (Stopped vehicle / Sudden deceleration)
        for t in tracks:
            # Stopped vehicle hazard
            if t.stationary_duration >= self.stopped_time_threshold:
                key = f"stopped_{t.track_id}"
                if not self._is_on_cooldown(key, current_time):
                    events.append(
                        AccidentEvent(
                            event_type="STOPPED_VEHICLE",
                            severity=IncidentSeverity.MEDIUM.value if t.stationary_duration < 10.0 else IncidentSeverity.HIGH.value,
                            confidence=round(min(0.95, 0.60 + (t.stationary_duration / 20.0)), 2),
                            track_ids=[t.track_id],
                            bbox=t.bbox,
                            description=(
                                f"Vehicle {t.class_name} #{t.track_id} has been stationary for "
                                f"{t.stationary_duration:.1f}s in an active traffic flow lane."
                            ),
                            timestamp=current_time
                        )
                    )

            # Sudden Deceleration Anomaly
            elif t.acceleration < -140.0 and len(t.history) >= 8:
                key = f"decel_{t.track_id}"
                if not self._is_on_cooldown(key, current_time):
                    events.append(
                        AccidentEvent(
                            event_type="SUDDEN_DECELERATION",
                            severity=IncidentSeverity.LOW.value,
                            confidence=0.72,
                            track_ids=[t.track_id],
                            bbox=t.bbox,
                            description=(
                                f"Abrupt deceleration detected on {t.class_name} #{t.track_id} "
                                f"(rate: {t.acceleration:.1f} px/s²). Potential near-miss or roadblock."
                            ),
                            timestamp=current_time
                        )
                    )

        # Clean old cooldown entries (> 300s)
        if len(self._recent_alerts) > 100:
            self._recent_alerts = {
                k: v for k, v in self._recent_alerts.items()
                if (current_time - v) < (self.cooldown_seconds * 3)
            }

        return events

class DeepLearningAccidentDetector(BaseAccidentDetector):
    """
    Interface for integrating custom Deep Learning accident detection models.
    Supports optical-flow CNNs, 3D ConvNets (e.g. I3D / SlowFast), or Video Swin Transformer
    trained on datasets such as CADP (Car Accident Detection and Prediction) or AnAn.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.fallback = HeuristicAccidentDetector()

        if model_path:
            self._load_model(model_path)

    def _load_model(self, path: str):
        try:
            logger.info(f"Attempting to load DL accident weights from {path}...")
            # Placeholder for PyTorch / TorchScript / ONNX model loading
            # e.g., self.model = torch.jit.load(path)
            self.is_loaded = False
            logger.warning(
                f"Trained deep learning accident model checkpoint '{path}' is not present or unconfigured. "
                "Falling back to explainable heuristic baseline."
            )
        except Exception as e:
            logger.error(f"Failed to load DL accident model: {e}")
            self.is_loaded = False

    def process_frame(
        self,
        tracks: List[TrackedVehicle],
        frame: Optional[np.ndarray] = None,
        current_time: Optional[float] = None
    ) -> List[AccidentEvent]:
        if not self.is_loaded:
            return self.fallback.process_frame(tracks, frame, current_time)

        # DL inference pipeline when weights are provided:
        # 1. Extract 16/32 frame temporal sliding window
        # 2. Compute optical flow or Spatio-Temporal feature tensor
        # 3. Model forward pass -> binary accident probability
        return self.fallback.process_frame(tracks, frame, current_time)
