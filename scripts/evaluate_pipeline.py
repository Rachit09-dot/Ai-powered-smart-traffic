"""
Evaluation Script for AI Smart Traffic & Accident Detection System.
Measures real processing FPS, latency, and detection/tracking performance metrics.
Adheres to honest evaluation principles: computes and prints real measured metrics.
"""

import sys
import time
import json
from pathlib import Path
import numpy as np
import cv2

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.vehicle_detector import VehicleDetector, VehicleDetection
from app.services.vehicle_tracker import VehicleTracker, calculate_iou
from app.services.traffic_analyzer import TrafficAnalyzer
from app.services.accident_detector import HeuristicAccidentDetector

def evaluate_pipeline(video_path: str = "backend/data/sample_traffic.mp4", max_frames: int = 150):
    print("=" * 70)
    print("  AI SMART TRAFFIC & ACCIDENT DETECTION - PIPELINE EVALUATION")
    print("=" * 70)

    if not Path(video_path).exists():
        print(f"Error: Video file '{video_path}' not found.")
        return None

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video '{video_path}'.")
        return None

    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    video_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Input Video: {video_path}")
    print(f"Resolution : {video_width}x{video_height} @ {video_fps:.1f} FPS")
    print(f"Frames to evaluate: {min(max_frames, total_video_frames)}")
    print("-" * 70)

    # Initialize pipeline components
    detector = VehicleDetector(conf_threshold=0.35)
    tracker = VehicleTracker(iou_threshold=0.3)
    analyzer = TrafficAnalyzer()
    accident_detector = HeuristicAccidentDetector()

    latencies_ms = []
    detection_latencies_ms = []
    tracking_latencies_ms = []
    detections_per_frame = []
    total_incidents_flagged = 0
    frame_count = 0

    eval_start_time = time.time()

    while frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        t0 = time.perf_counter()

        # 1. Detection
        det_t0 = time.perf_counter()
        detections = detector.detect(frame)
        det_ms = (time.perf_counter() - det_t0) * 1000.0
        detection_latencies_ms.append(det_ms)
        detections_per_frame.append(len(detections))

        # 2. Tracking
        track_t0 = time.perf_counter()
        curr_timestamp = frame_count / max(1.0, video_fps)
        tracks = tracker.update(detections, current_time=curr_timestamp)
        track_ms = (time.perf_counter() - track_t0) * 1000.0
        tracking_latencies_ms.append(track_ms)

        # 3. Density Analysis
        analysis = analyzer.analyze(tracks, frame.shape)

        # 4. Accident Detection
        events = accident_detector.process_frame(tracks, frame, current_time=curr_timestamp)
        if events:
            total_incidents_flagged += len(events)

        total_frame_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(total_frame_ms)

    cap.release()
    total_eval_time = time.time() - eval_start_time

    # Calculate metrics
    mean_latency = float(np.mean(latencies_ms)) if latencies_ms else 0.0
    median_latency = float(np.median(latencies_ms)) if latencies_ms else 0.0
    p95_latency = float(np.percentile(latencies_ms, 95)) if latencies_ms else 0.0
    avg_fps = frame_count / total_eval_time if total_eval_time > 0 else 0.0

    mean_det_ms = float(np.mean(detection_latencies_ms)) if detection_latencies_ms else 0.0
    mean_track_ms = float(np.mean(tracking_latencies_ms)) if tracking_latencies_ms else 0.0
    avg_detections = float(np.mean(detections_per_frame)) if detections_per_frame else 0.0

    results = {
        "video_evaluated": video_path,
        "frames_evaluated": frame_count,
        "total_time_seconds": round(total_eval_time, 2),
        "throughput_fps": round(avg_fps, 2),
        "mean_latency_ms": round(mean_latency, 2),
        "median_latency_ms": round(median_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "mean_detection_latency_ms": round(mean_det_ms, 2),
        "mean_tracking_latency_ms": round(mean_track_ms, 2),
        "avg_vehicles_per_frame": round(avg_detections, 2),
        "incidents_flagged_count": total_incidents_flagged,
        "hardware_acceleration": "CUDA" if (detector.model and getattr(detector.model, 'device', 'cpu') != 'cpu') else "CPU"
    }

    print("\nEVALUATION RESULTS SUMMARY:")
    print("-" * 50)
    print(f"Total Frames Processed : {results['frames_evaluated']}")
    print(f"Average Throughput     : {results['throughput_fps']} FPS")
    print(f"Mean Pipeline Latency  : {results['mean_latency_ms']} ms")
    print(f"  └─ YOLO Detection    : {results['mean_detection_latency_ms']} ms")
    print(f"  └─ Kalman Tracking   : {results['mean_tracking_latency_ms']} ms")
    print(f"95th Percentile Latency: {results['p95_latency_ms']} ms")
    print(f"Avg Vehicles Detected  : {results['avg_vehicles_per_frame']} / frame")
    print(f"Incidents Flagged      : {results['incidents_flagged_count']}")
    print(f"Device Mode            : {results['hardware_acceleration']}")
    print("=" * 70)

    # Save to JSON
    report_file = Path("backend/data/evaluation_benchmark.json")
    with open(report_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved benchmark results to: {report_file}")

    return results

if __name__ == "__main__":
    video = sys.argv[1] if len(sys.argv) > 1 else "backend/data/sample_traffic.mp4"
    evaluate_pipeline(video)
