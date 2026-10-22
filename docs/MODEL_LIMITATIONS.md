# Model Limitations & Honest Evaluation

## Vehicle Detection (YOLOv8n)

**What it does:** Detects vehicles in individual frames using COCO-pretrained YOLOv8 nano weights. Supported classes: `car` (2), `motorcycle` (3), `bus` (5), `truck` (7).

**Known limitations:**
- YOLOv8n is the smallest variant — higher false-negative rate than larger models (YOLOv8m/l) in occluded or distant scenarios.
- Pretrained on COCO — not fine-tuned on traffic camera footage. Performance may degrade on unusual camera angles, night-time scenes, or non-Western vehicle types.
- Does not classify vehicle speed in real-world units; speed is estimated in pixels/second relative to the frame.
- `total_vehicles_detected` in the dashboard sums all observation snapshots over time — this represents cumulative detection events, not unique vehicles.

## Vehicle Tracking

**What it is:** A custom greedy IoU bipartite matcher. **NOT** Deep SORT or the canonical SORT algorithm (which uses a Kalman filter for state prediction). This tracker is simpler and will drift or lose tracks in dense occlusion or rapid direction changes.

**Known limitations:**
- IoU-only association fails when vehicles overlap significantly or move quickly between frames.
- No Kalman prediction — tracks cannot bridge gaps between frames without detection.
- Track IDs reset on every pipeline restart.

## Traffic Density / Congestion

**What it measures:** Congestion level is computed from:
1. Number of active tracks in the current frame
2. Total bounding box area as a fraction of frame area (road occupancy)

**Not measured:**
- Road speed limit context
- Lane count (a single-lane reading with 6 vehicles differs from a 4-lane reading)
- Queue length or spillback
- Travel time or delay

**Metric definitions (important):**
| Metric | Definition |
|--------|-----------|
| `total_vehicles` (live) | Active vehicle tracks in the most recent frame |
| `total_vehicles_detected` (dashboard) | Sum of `total_vehicles` across all saved observation snapshots — represents accumulated detection events, not unique vehicles |
| `density_score` | Composite (0–1): 0.65 × normalized count + 0.35 × occupancy ratio |
| `congestion_level` | LOW / MEDIUM / HIGH based on configurable count + occupancy thresholds |
| `estimated_flow_rate_vpm` | Approximation: `total_vehicles × (avg_speed / 50.0) × 1.2`. Not validated against ground truth. |

## Accident / Anomaly Detection

**This system uses heuristic-based anomaly detection, NOT trained accident recognition.**

A COCO-pretrained YOLO model cannot identify collisions. The `HeuristicAccidentDetector` detects:

| Event Type | Trigger Condition |
|-----------|------------------|
| `STOPPED_VEHICLE` | `stationary_duration >= STOPPED_VEHICLE_TIME_THRESHOLD_SEC` (default 4s) |
| `SUDDEN_DECELERATION` | `acceleration < -140 px/s²` with `≥ 8` history frames |
| `POTENTIAL_ACCIDENT` | Bounding box IoU ≥ `COLLISION_IOU_THRESHOLD` (default 0.15) AND at least one vehicle speed < 15 px/s or deceleration < -80 px/s² |

**What these events mean:**
- `POTENTIAL_ACCIDENT` signals spatially overlapping bounding boxes concurrent with low speed — consistent with a collision but also consistent with normal close-proximity driving, parking, or occlusion.
- `STOPPED_VEHICLE` fires for any vehicle stationary beyond the threshold — including buses at stops, vehicles waiting at traffic lights (if threshold is too low), or parked vehicles that enter the tracked zone.
- All events require **operator verification** before being treated as confirmed incidents.

**False positive risk factors:**
- Dense traffic causes natural bbox overlap
- Camera angle causes perspective foreshortening that makes distant vehicles appear to overlap
- Normal braking at intersections triggers deceleration events if the threshold is set too aggressively
- Parked vehicles at frame edges may sustain stationary duration indefinitely

**Do NOT use this system for emergency dispatch without validated operational thresholds specific to your camera installation.**

## Deep Learning Accident Detector

`DeepLearningAccidentDetector` is a documented interface stub. No trained weights are included. It falls back to the heuristic detector until a custom model is integrated. See `models/README.md` for integration guidance.

## Performance

No standardized benchmarks have been run against labeled accident datasets (e.g. CADP, D2-City). Reported FPS measurements from `scripts/evaluate_pipeline.py` are wall-clock throughput on the evaluation machine only and depend on hardware, video resolution, and vehicle density.
