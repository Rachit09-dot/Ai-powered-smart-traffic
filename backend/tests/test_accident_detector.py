"""Tests for heuristic accident/anomaly detector."""
import pytest
from app.services.accident_detector import HeuristicAccidentDetector
from app.services.vehicle_tracker import TrackedVehicle
from app.services.vehicle_detector import VehicleDetection


def make_track(track_id: int, bbox: list, speed: float = 30.0, stationary: float = 0.0,
               acceleration: float = 0.0) -> TrackedVehicle:
    det = VehicleDetection(bbox=bbox, confidence=0.9, class_id=2, class_name="car")
    track = TrackedVehicle(track_id=track_id, detection=det, timestamp=10.0)
    track.speed = speed
    track.stationary_duration = stationary
    track.acceleration = acceleration
    return track


# ─── Stopped Vehicle ──────────────────────────────────────────────────────────

def test_moving_vehicle_does_not_trigger_stopped_alert():
    detector = HeuristicAccidentDetector(stopped_time_threshold=4.0, cooldown_seconds=20.0)
    track = make_track(1, [100, 200, 180, 260], speed=35.0, stationary=1.0)
    events = detector.process_frame([track], current_time=10.0)
    assert len(events) == 0


def test_stopped_vehicle_triggers_alert():
    detector = HeuristicAccidentDetector(stopped_time_threshold=4.0, cooldown_seconds=20.0)
    track = make_track(2, [300, 200, 380, 260], speed=0.0, stationary=5.2)
    events = detector.process_frame([track], current_time=10.0)
    assert len(events) == 1
    assert events[0].event_type == "STOPPED_VEHICLE"
    assert events[0].track_ids == [2]
    assert 0.0 <= events[0].confidence <= 1.0


def test_stopped_vehicle_cooldown_suppression():
    detector = HeuristicAccidentDetector(stopped_time_threshold=4.0, cooldown_seconds=20.0)
    track = make_track(2, [300, 200, 380, 260], speed=0.0, stationary=5.2)
    events = detector.process_frame([track], current_time=10.0)
    assert len(events) == 1

    # Within cooldown → suppressed
    events_repeat = detector.process_frame([track], current_time=15.0)
    assert len(events_repeat) == 0


def test_stopped_vehicle_retriggers_after_cooldown():
    detector = HeuristicAccidentDetector(stopped_time_threshold=4.0, cooldown_seconds=20.0)
    track = make_track(2, [300, 200, 380, 260], speed=0.0, stationary=5.2)
    detector.process_frame([track], current_time=10.0)
    # After cooldown expires
    events_after = detector.process_frame([track], current_time=35.0)
    assert len(events_after) == 1


# ─── Collision Detection ──────────────────────────────────────────────────────

def test_collision_overlap_triggers_alert():
    detector = HeuristicAccidentDetector(collision_iou_threshold=0.15)
    t1 = make_track(10, [200, 300, 290, 370], speed=5.0)
    t2 = make_track(11, [230, 310, 310, 380], speed=4.0)
    events = detector.process_frame([t1, t2], current_time=100.0)
    assert len(events) == 1
    assert events[0].event_type == "POTENTIAL_ACCIDENT"
    assert set(events[0].track_ids) == {10, 11}
    assert events[0].bbox == [200, 300, 310, 380]  # union bbox


def test_non_overlapping_vehicles_no_collision():
    detector = HeuristicAccidentDetector(collision_iou_threshold=0.15)
    t1 = make_track(1, [0, 0, 80, 60], speed=35.0)
    t2 = make_track(2, [500, 300, 600, 380], speed=30.0)
    events = detector.process_frame([t1, t2], current_time=100.0)
    collision_events = [e for e in events if e.event_type == "POTENTIAL_ACCIDENT"]
    assert len(collision_events) == 0


# ─── Sudden Deceleration ──────────────────────────────────────────────────────

def test_sudden_deceleration_triggers_alert():
    detector = HeuristicAccidentDetector()
    track = make_track(1, [100, 200, 180, 260], speed=5.0, acceleration=-200.0)
    # Need enough history entries
    for _ in range(10):
        track.history.append((140.0, 230.0, 10.0))
    events = detector.process_frame([track], current_time=50.0)
    decel_events = [e for e in events if e.event_type == "SUDDEN_DECELERATION"]
    assert len(decel_events) == 1


# ─── Empty frame ──────────────────────────────────────────────────────────────

def test_empty_tracks_no_events():
    detector = HeuristicAccidentDetector()
    events = detector.process_frame([], current_time=10.0)
    assert events == []
