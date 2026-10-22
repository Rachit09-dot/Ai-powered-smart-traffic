import numpy as np
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.models.db_models import CongestionLevel
from app.services.vehicle_tracker import TrackedVehicle

class TrafficAnalysisResult:
    def __init__(
        self,
        total_vehicles: int,
        breakdown: Dict[str, int],
        density_score: float,
        congestion_level: str,
        avg_speed_px_sec: float,
        estimated_flow_rate_vpm: float,
        road_occupancy_ratio: float
    ):
        self.total_vehicles = total_vehicles
        self.breakdown = breakdown
        self.density_score = density_score
        self.congestion_level = congestion_level
        self.avg_speed_px_sec = avg_speed_px_sec
        self.estimated_flow_rate_vpm = estimated_flow_rate_vpm  # Vehicles per minute
        self.road_occupancy_ratio = road_occupancy_ratio

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_vehicles": self.total_vehicles,
            "cars": self.breakdown.get("car", 0),
            "motorcycles": self.breakdown.get("motorcycle", 0),
            "buses": self.breakdown.get("bus", 0),
            "trucks": self.breakdown.get("truck", 0),
            "density_score": round(self.density_score, 3),
            "congestion_level": self.congestion_level,
            "avg_speed_px_sec": round(self.avg_speed_px_sec, 1),
            "estimated_flow_rate_vpm": round(self.estimated_flow_rate_vpm, 1),
            "road_occupancy_ratio": round(self.road_occupancy_ratio, 3)
        }

class TrafficAnalyzer:
    """
    Traffic Density & Flow Analysis Module.
    
    Theoretical Assumptions:
    1. Greenshields' Fundamental Diagram of Traffic Flow:
       q = k * v, where:
       - q is Traffic Flow Rate (vehicles/minute)
       - k is Traffic Density (vehicles/frame area or road occupancy)
       - v is Mean Speed (pixels/sec or km/h)
       
    2. Road Occupancy Ratio:
       Ratio of total vehicle bounding box pixel surface area to total frame area.
       Trucks and buses contribute higher physical road occupancy than motorcycles and cars.
       
    3. Congestion Thresholds:
       - LOW: vehicle_count <= 5 and occupancy < 0.20 (smooth flow)
       - MEDIUM: 5 < vehicle_count <= 12 or 0.20 <= occupancy < 0.45 (moderate density)
       - HIGH: vehicle_count > 12 or occupancy >= 0.45 (saturated flow / bumper-to-bumper)
    """

    def __init__(
        self,
        low_max: int = settings.CONGESTION_LOW_MAX,
        medium_max: int = settings.CONGESTION_MEDIUM_MAX
    ):
        self.low_max = low_max
        self.medium_max = medium_max

    def analyze(self, tracks: List[TrackedVehicle], frame_shape: Tuple[int, int]) -> TrafficAnalysisResult:
        frame_h, frame_w = frame_shape[:2]
        frame_area = max(1, frame_h * frame_w)

        total_vehicles = len(tracks)
        breakdown = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0}
        total_bbox_area = 0.0
        speeds: List[float] = []

        for track in tracks:
            cname = track.class_name.lower()
            if cname in breakdown:
                breakdown[cname] += 1
            else:
                breakdown["car"] += 1

            bbox = track.bbox
            box_area = max(0, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
            total_bbox_area += box_area
            speeds.append(track.speed)

        # Occupancy ratio: fraction of visual frame occupied by vehicles
        occupancy_ratio = min(1.0, total_bbox_area / float(frame_area))

        # Composite density score (0.0 to 1.0)
        # Weighted combination of normalized vehicle count and occupancy ratio
        norm_count = min(1.0, total_vehicles / float(self.medium_max))
        density_score = float(np.clip(0.65 * norm_count + 0.35 * occupancy_ratio, 0.0, 1.0))

        # Classification
        if total_vehicles <= self.low_max and occupancy_ratio < 0.22:
            congestion_level = CongestionLevel.LOW.value
        elif total_vehicles <= self.medium_max and occupancy_ratio < 0.45:
            congestion_level = CongestionLevel.MEDIUM.value
        else:
            congestion_level = CongestionLevel.HIGH.value

        # Speeds and Flow rate
        avg_speed = float(np.mean(speeds)) if speeds else 0.0
        # Flow rate estimation: calibrated vehicle throughput
        estimated_flow_rate = total_vehicles * (avg_speed / 50.0) * 1.2

        return TrafficAnalysisResult(
            total_vehicles=total_vehicles,
            breakdown=breakdown,
            density_score=density_score,
            congestion_level=congestion_level,
            avg_speed_px_sec=avg_speed,
            estimated_flow_rate_vpm=estimated_flow_rate,
            road_occupancy_ratio=occupancy_ratio
        )
