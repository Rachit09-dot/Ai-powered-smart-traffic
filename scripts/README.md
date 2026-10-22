# Utility & Evaluation Scripts

This directory contains standalone execution scripts for generating test traffic feeds and running performance benchmarks.

## 1. `generate_sample_traffic.py`
Generates a 20-second synthetic 1280x720 30FPS highway traffic MP4 video clip with multi-lane vehicles and a simulated stopped vehicle hazard with flashing emergency lights.

### Usage:
```bash
# Windows
.\backend\venv\Scripts\python.exe scripts\generate_sample_traffic.py

# Linux
./backend/venv/bin/python scripts/generate_sample_traffic.py
```
Outputs: `backend/data/sample_traffic.mp4`

---

## 2. `evaluate_pipeline.py`
Benchmarks real computer vision pipeline performance, wall-clock FPS, per-frame latency (mean, median, 95th percentile), component latencies (YOLO inference vs Kalman tracking), and incident frequency.

### Usage:
```bash
# Windows
.\backend\venv\Scripts\python.exe scripts\evaluate_pipeline.py backend\data\sample_traffic.mp4

# Linux
./backend/venv/bin/python scripts/evaluate_pipeline.py backend/data/sample_traffic.mp4
```
Outputs: Terminal summary metrics table + JSON benchmark results saved to `backend/data/evaluation_benchmark.json`.
