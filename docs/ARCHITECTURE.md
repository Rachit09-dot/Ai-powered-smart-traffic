# Architecture — AI Smart Traffic & Accident Detection System

## Data Flow

```
VIDEO INPUT (file / webcam / RTSP / synthetic)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│          VideoProcessingWorker (background thread)   │
│                                                     │
│  1. Frame read (OpenCV VideoCapture / synthetic gen) │
│  2. Resize if width > MAX_PROCESSING_FRAME_WIDTH    │
│  3. VehicleDetector.detect() → YOLOv8 inference     │
│     (or synthetic bbox mapping in demo mode)        │
│  4. VehicleTracker.update() → IoU greedy matching   │
│     (maintains velocity, speed, stationary_duration)│
│  5. TrafficAnalyzer.analyze() → density + congestion│
│  6. HeuristicAccidentDetector.process_frame()       │
│     → stopped vehicle / sudden decel / bbox overlap │
│  7. Incident persistence (AlertService)             │
│  8. Frame overlay rendering (OpenCV)                │
│  9. JPEG encode → latest_encoded_frame (lock-safe)  │
│ 10. Every 3s: TrafficObservation saved to SQLite    │
│ 11. WebSocket broadcast via run_coroutine_threadsafe│
└────────┬──────────────────────────┬────────────────┘
         │ async (main loop)        │ MJPEG bytes
         ▼                          ▼
┌──────────────────┐    ┌────────────────────────────┐
│  SQLite Database │    │  FastAPI Async HTTP Engine  │
│  (aiosqlite)     │    │                            │
│  ├ cameras       │    │  REST API (all routes)      │
│  ├ sessions      │    │  WebSocket /ws/traffic      │
│  ├ observations  │    │  MJPEG /api/processing/     │
│  └ incidents     │    │        stream/{camera_id}   │
└──────────────────┘    └──────────────┬─────────────┘
                                       │ HTTP + WS
                                       ▼
                          ┌────────────────────────┐
                          │  React Vite Dashboard   │
                          │  (port 5173 dev)        │
                          │                        │
                          │  fetchData() every 6s  │
                          │  WebSocket listener    │
                          │  MJPEG <img> src=...   │
                          └────────────────────────┘
```

## Key Design Decisions

### Thread-Safe DB Operations
The `VideoProcessingWorker` runs in a background OS thread (not async). All database writes from the worker use `asyncio.run_coroutine_threadsafe(coro, event_loop)` to safely schedule coroutines on the main FastAPI event loop, avoiding the nested `asyncio.run()` anti-pattern.

### Incident Deduplication
Two layers of deduplication:
1. **Heuristic cooldown** in `HeuristicAccidentDetector` — per-event-key cooldown dict prevents the same track pair from firing repeatedly within `ALERT_COOLDOWN_SECONDS`.
2. **Database deduplication** in `AlertService.create_incident_from_event()` — checks for a PENDING incident of the same type and camera within the last 30 seconds before inserting a new row.

### Tracker Design
The vehicle tracker is a custom greedy IoU bipartite matcher — not SORT or Deep SORT. It:
- Builds a cost matrix between existing tracks and new detections
- Greedily matches highest-IoU pairs above threshold
- Maintains velocity, acceleration, stationary duration, and trajectory history
- Expires tracks after `max_missing_frames` consecutive unmatched frames

### Synthetic Demo Mode
When `source_path == "demo_synthetic"` or the path doesn't exist on disk, the worker generates animated frames programmatically (no video file needed). A staged stopped-vehicle anomaly fires at frame steps 180–340 to demonstrate incident detection.

### MJPEG Streaming
`/api/processing/stream/{camera_id}` returns a `multipart/x-mixed-replace` stream using an async generator — it does not block the event loop. The frontend renders this as a simple `<img>` tag.

## Component Inventory

| Component | File | Responsibility |
|-----------|------|---------------|
| `VideoProcessingWorker` | `services/video_processor.py` | Per-camera CV pipeline thread |
| `VideoProcessingManager` | `services/video_processor.py` | Worker lifecycle manager (singleton) |
| `VehicleDetector` | `services/vehicle_detector.py` | YOLOv8 inference wrapper |
| `VehicleTracker` | `services/vehicle_tracker.py` | IoU-based multi-object tracker |
| `TrafficAnalyzer` | `services/traffic_analyzer.py` | Density, congestion, flow rate |
| `HeuristicAccidentDetector` | `services/accident_detector.py` | Kinematic anomaly heuristics |
| `DeepLearningAccidentDetector` | `services/accident_detector.py` | Stub for trained model integration |
| `AlertService` | `services/alert_service.py` | Incident CRUD + deduplication |
| `ConnectionManager` | `api/websocket.py` | WebSocket client registry + broadcast |
