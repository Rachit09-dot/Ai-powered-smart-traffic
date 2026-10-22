"""Tests for traffic density analysis and congestion classification."""
import pytest
from app.services.traffic_analyzer import TrafficAnalyzer
from app.services.vehicle_tracker import TrackedVehicle
from app.services.vehicle_detector import VehicleDetection
from app.models.db_models import CongestionLevel


def make_track(track_id: int, bbox: list, speed: float = 35.0, class_name: str = "car") -> TrackedVehicle:
    det = VehicleDetection(bbox=bbox, confidence=0.85, class_id=2, class_name=class_name)
    track = TrackedVehicle(track_id=track_id, detection=det, timestamp=100.0)
    track.speed = speed
    return track


def test_empty_tracks_gives_low_congestion():
    analyzer = TrafficAnalyzer()
    result = analyzer.analyze([], frame_shape=(720, 1280, 3))
    assert result.total_vehicles == 0
    assert result.congestion_level == CongestionLevel.LOW.value
    assert result.density_score == 0.0


def test_low_congestion():
    analyzer = TrafficAnalyzer()
    tracks = [make_track(i, [i * 150, 200, i * 150 + 80, 260]) for i in range(1, 4)]
    result = analyzer.analyze(tracks, frame_shape=(720, 1280, 3))
    assert result.total_vehicles == 3
    assert result.congestion_level == CongestionLevel.LOW.value
    assert result.density_score < 0.40


def test_medium_congestion():
    analyzer = TrafficAnalyzer()
    tracks = [make_track(i, [i * 90, 200, i * 90 + 70, 250]) for i in range(1, 9)]
    result = analyzer.analyze(tracks, frame_shape=(720, 1280, 3))
    assert result.total_vehicles == 8
    assert result.congestion_level == CongestionLevel.MEDIUM.value


def test_high_congestion():
    analyzer = TrafficAnalyzer()
    tracks = [make_track(i, [i * 50, 200, i * 50 + 60, 250]) for i in range(1, 17)]
    result = analyzer.analyze(tracks, frame_shape=(720, 1280, 3))
    assert result.total_vehicles == 16
    assert result.congestion_level == CongestionLevel.HIGH.value
    assert result.density_score >= 0.60


def test_vehicle_breakdown_counts():
    analyzer = TrafficAnalyzer()
    tracks = [
        make_track(1, [10, 200, 90, 260], class_name="car"),
        make_track(2, [100, 200, 200, 270], class_name="bus"),
        make_track(3, [210, 200, 280, 250], class_name="truck"),
        make_track(4, [290, 200, 330, 240], class_name="motorcycle"),
    ]
    result = analyzer.analyze(tracks, frame_shape=(720, 1280, 3))
    assert result.breakdown["car"] == 1
    assert result.breakdown["bus"] == 1
    assert result.breakdown["truck"] == 1
    assert result.breakdown["motorcycle"] == 1


def test_density_score_bounded():
    analyzer = TrafficAnalyzer()
    # Very dense scenario
    tracks = [make_track(i, [i * 20, 200, i * 20 + 80, 400]) for i in range(30)]
    result = analyzer.analyze(tracks, frame_shape=(720, 1280, 3))
    assert 0.0 <= result.density_score <= 1.0
    assert 0.0 <= result.road_occupancy_ratio <= 1.0


def test_flow_rate_zero_when_no_vehicles():
    analyzer = TrafficAnalyzer()
    result = analyzer.analyze([], frame_shape=(720, 1280, 3))
    assert result.estimated_flow_rate_vpm == 0.0
    assert result.avg_speed_px_sec == 0.0
