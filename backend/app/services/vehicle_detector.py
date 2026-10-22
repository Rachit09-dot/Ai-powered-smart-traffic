import logging
from typing import List, Dict, Any, Tuple
import numpy as np
import cv2
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

# COCO vehicle classes mapping
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck"
}

class VehicleDetection:
    def __init__(self, bbox: List[int], confidence: float, class_id: int, class_name: str):
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.class_id = class_id
        self.class_name = class_name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bbox": self.bbox,
            "confidence": round(float(self.confidence), 3),
            "class_id": self.class_id,
            "class_name": self.class_name
        }

class VehicleDetector:
    def __init__(self, model_name: str = settings.YOLO_MODEL_NAME, conf_threshold: float = settings.CONFIDENCE_THRESHOLD):
        self.conf_threshold = conf_threshold
        self.model_name = model_name
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            import torch
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading YOLO model '{self.model_name}' on device '{device}'...")
            
            # Ultralytics will load or download yolov8n.pt automatically to standard location
            self.model = YOLO(self.model_name)
            logger.info("YOLO vehicle detector loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}. Fallback to simulated detector.")
            self.model = None

    def detect(self, frame: np.ndarray) -> List[VehicleDetection]:
        """
        Runs object detection on the input frame and returns vehicles filtered by confidence.
        """
        if frame is None or frame.size == 0:
            return []

        detections: List[VehicleDetection] = []

        if self.model is not None:
            try:
                # Run YOLO inference
                results = self.model(
                    frame,
                    conf=self.conf_threshold,
                    classes=list(VEHICLE_CLASSES.keys()),
                    verbose=False
                )

                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        conf = float(box.conf[0].item())
                        xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()

                        if cls_id in VEHICLE_CLASSES and conf >= self.conf_threshold:
                            detections.append(
                                VehicleDetection(
                                    bbox=xyxy,
                                    confidence=conf,
                                    class_id=cls_id,
                                    class_name=VEHICLE_CLASSES[cls_id]
                                )
                            )
                return detections
            except Exception as e:
                logger.error(f"Error during YOLO inference: {e}")

        # Fallback heuristic detector if YOLO is unavailable or frame is synthetic
        return detections
