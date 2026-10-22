# Project Audit — AI Smart Traffic & Accident Detection System

**Audit Date:** 2026-10-22  
**Auditor:** Kiro AI Engineering Agent  
**Repository Root:** `Ai powered smart traffic/`

---

## 1. Current Architecture and Folder Structure

```
Ai powered smart traffic/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, lifespan, CORS, router registration
│   │   ├── api/                     # REST API route modules
│   │   │   ├── health.py            # GET /health
│   │   │   ├── cameras.py           # CRUD cameras
│   │   │   ├── videos.py            # Video upload
│   │   │   ├── processing.py        # Start/stop/status/stream
│   │   │   ├── incidents.py          # List/update incidents
│   │   │   ├── traffic.py           # Dashboard summary, traffic history
│   │   │   ├── reports.py           # CSV export
│   │   │   └── websocket.py         # WebSocket /ws/traffic
│   │   ├── core/
│   │   │   └── config.py            # Pydantic Settings, all config constants
│   │   ├── database/
│   │   │   └── connection.py        # Async SQLAlchemy engine, session factory, init_db
│   │   ├── models/
│   │   │   └── db_models.py          # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py            # Pydantic request/response schemas
│   │   └── services/
│   │       ├── vehicle_detector.py   # YOLOv8 wrapper
│   │       ├── vehicle_tracker.py    # Custom IoU-based tracker
│   │       ├── traffic_analyzer.py   # Density/congestion analysis
│   │       ├── accident_detector.py  # Heuristic anomaly detection
│   │       ├── alert_service.py      # Incident persistence & status updates
│   │       └── video_processor.py    # Background video processing worker + manager
│   ├── data/
│   │   ├── traffic_system.db        # SQLite database
│   │   ├── sample_traffic.mp4       # Generated synthetic test video
│   │   ├── evaluation_benchmark.json
│   │   └── uploads/                  # Uploaded video files
│   ├── tests/                        # 5 test files, 10 tests total
│   ├── conftest.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Root app, state, API/WebSocket integration
│   │   ├── main.jsx
│   │   └── components/               # 14 React components
│   ├── package.json
│   └── vite.config.js
├── models/                           # README only, no weights committed
├── scripts/                          # Evaluation and video generation scripts
├── datasets/                         # README only
├── .env.example
├── .gitignore
├── pytest.ini
├── README.md
└── yolov8n.pt                        # YOLOv8 nano weights (root)
```

**Tech Stack:**
- Backend: Python 3.11, FastAPI, SQLAlchemy 2.0 (async), aiosqlite, OpenCV 4.9, Ultralytics YOLOv8, NumPy
- Frontend: React 19, Vite 8, Tailwind CSS 3, Recharts 3, Lucide React
- Database: SQLite (via aiosqlite async driver)
- Real-time: WebSocket (FastAPI), MJPEG streaming

---

## 2. Existing Features and Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Health endpoint | Implemented and verified | Returns OpenCV version, CUDA availability, uptime |
| Camera CRUD (list/create/delete) | Implemented and verified | No update endpoint |
| Video upload | Implemented but not verified | Extension check only, no content validation. Test uses dummy bytes, not real video. |
| Processing start/stop/pause | Implemented and verified | Worker runs in background thread |
| MJPEG video stream | Implemented but not verified | Synchronous generator in async route (blocks event loop) |
| Vehicle detection (YOLOv8) | Implemented and verified | Ultralytics auto-downloads weights. Fallback returns empty list. |
| Vehicle tracking | Implemented and verified | Custom greedy IoU matcher (not SORT as labeled) |
| Traffic density analysis | Implemented and verified | Vehicle count + road occupancy composite score |
| Congestion classification | Implemented and verified | LOW/MEDIUM/HIGH with configurable thresholds |
| Accident/anomaly detection | Implemented and verified | Heuristic: stopped vehicle, sudden deceleration, bbox overlap. Has cooldown deduplication. |
| Incident persistence | Implemented and verified | AlertService creates Incident + AlertLog |
| Incident lifecycle (acknowledge/resolve) | Implemented and verified | Status transitions PENDING → ACKNOWLEDGED → RESOLVED/FALSE_POSITIVE |
| Dashboard summary | Implemented and verified | Aggregates from DB + live workers |
| Traffic history | Implemented and verified | Returns observations in chronological order |
| CSV report export | Implemented but not verified | Date range params accepted but not implemented |
| WebSocket telemetry | Implemented and verified | Broadcasts traffic updates + incident events. No reconnect test. |
| Frontend dashboard | Implemented and verified | Build succeeds. Hardcoded localhost:8000 in 5 locations. |
| Synthetic demo mode | Implemented and verified | Generates animated traffic frames with staged anomaly |
| Frontend analytics charts | Partially implemented | Fallback to hardcoded dummy data when empty |
| Frontend settings | Partially implemented | localStorage only, not sent to backend |
| Date range filtering | Missing | Reports and incidents don't filter by date |
| Pagination | Missing | Incidents list has limit but no offset/cursor |
| Authentication | Missing | All endpoints are open |
| Rate limiting | Missing | No rate limits on uploads or API |
| Video content validation | Missing | Only extension check |
| Model weights management | Partially implemented | yolov8n.pt exists at root, auto-download works but path not configurable |

---

## 3. Backend and Frontend Startup Instructions

### Backend
```powershell
# From repository root
pip install -r backend\requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev     # Development at http://localhost:5173
npm run build   # Production build to dist/
```

---

## 4. API Endpoint Inventory

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/health` | System health, GPU info | Working |
| GET | `/api/cameras` | List all cameras | Working |
| POST | `/api/cameras` | Create camera | Working |
| DELETE | `/api/cameras/{id}` | Delete camera | Working |
| POST | `/api/videos/upload` | Upload video file | Working (extension check only) |
| POST | `/api/processing/start` | Start CV pipeline | Working |
| POST | `/api/processing/stop` | Stop pipeline | Working |
| POST | `/api/processing/pause/{id}` | Toggle pause | Working |
| GET | `/api/processing/status/{id}` | Worker status | Working |
| GET | `/api/processing/stream/{id}` | MJPEG video stream | Working (sync generator) |
| GET | `/api/dashboard/summary` | Aggregated KPIs | Working |
| GET | `/api/traffic/history` | Traffic observations | Working |
| GET | `/api/incidents` | List incidents | Working |
| PATCH | `/api/incidents/{id}` | Update incident status | Working |
| GET | `/api/reports/export` | CSV download | Working (date params unused) |
| WS | `/ws/traffic` | Real-time telemetry | Working |

---

## 5. Database Schema and Relationships

```
cameras (1) ──< processing_sessions (N)
cameras (1) ──< traffic_observations (N)
cameras (1) ──< incidents (N)
processing_sessions (1) ──< traffic_observations (N)
processing_sessions (1) ──< incidents (N)
incidents (1) ──< alert_logs (N)
```

**Tables:**
- `cameras`: id (PK), name, source_type, source_path, location, status, resolution, fps, timestamps
- `processing_sessions`: id (PK), camera_id (FK), status, started_at, stopped_at, frames_processed, avg_fps
- `traffic_observations`: id (PK auto), session_id (FK), camera_id (FK), timestamp, vehicle counts, density_score, congestion_level, avg_speed
- `incidents`: id (PK), session_id (FK), camera_id (FK), timestamp, incident_type, severity, confidence, bounding_box, status, notes, acknowledged_by, timestamps, snapshot_path
- `alert_logs`: id (PK auto), incident_id (FK), channel, sent_at, acknowledged_by

---

## 6. ML Models, Weights, Dependencies, and Data Flow

**Vehicle Detection:** Ultralytics YOLOv8n (yolov8n.pt, 3.2M params). COCO classes: car(2), motorcycle(3), bus(5), truck(7). Auto-downloads on first use. Runs on CUDA if available, otherwise CPU.

**Vehicle Tracking:** Custom greedy IoU-based matcher. NOT Deep SORT, NOT the canonical SORT algorithm. Uses IoU cost matrix with greedy bipartite matching. Maintains velocity, acceleration, stationary duration, and trajectory history.

**Traffic Analysis:** Composite density score = 0.65 * normalized_vehicle_count + 0.35 * road_occupancy_ratio. Congestion classification uses configurable vehicle count + occupancy thresholds (Greenshields-inspired).

**Accident/Anomaly Detection:** Pure heuristic baseline. No trained ML model. Detects: stopped vehicles (configurable time threshold), sudden deceleration (pixel/s² threshold), potential collisions (bbox IoU overlap + abrupt halt). Has configurable cooldown deduplication per event key.

**Deep Learning Interface:** `DeepLearningAccidentDetector` exists as a stub interface that falls back to heuristic. No trained accident model is present.

**Data Flow:**
1. Video frame read (file/webcam/synthetic)
2. Frame resize if > MAX_PROCESSING_FRAME_WIDTH
3. Vehicle detection (YOLO or synthetic mapping)
4. IoU tracking update
5. Traffic density analysis
6. Accident/anomaly detection (if enabled)
7. Incident persistence to DB + alert broadcast
8. Frame rendering with overlays (bounding boxes, HUD, alerts)
9. JPEG encode for MJPEG stream
10. Periodic traffic observation save to DB (every 3s)
11. WebSocket telemetry broadcast

---

## 7. Security Vulnerabilities and Configuration Problems

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| Wildcard CORS | HIGH | `config.py` | `CORS_ORIGINS = ["*"]` allows any origin |
| No authentication | HIGH | All endpoints | Any user can access/modify all data |
| No video content validation | MEDIUM | `videos.py` | Only checks file extension, not actual video format |
| Path traversal risk | MEDIUM | `cameras.py` | `source_path` accepted as-is, could reference arbitrary paths |
| asyncio.run() in thread | MEDIUM | `video_processor.py` | Creates new event loop per DB operation in worker thread |
| No rate limiting | MEDIUM | All endpoints | Upload/API abuse possible |
| Exposed full error details | LOW | `videos.py` | Exception messages returned to client |
| MJPEG sync generator | MEDIUM | `processing.py` | Synchronous generator blocks async event loop |
| No session timeout | LOW | WebSocket | Stale connections not cleaned up proactively |

---

## 8. Existing Bugs and Test Failures

**Test Results (baseline):** 10/10 tests PASS

**Known Bugs:**
1. `video_processor.py`: Uses `asyncio.run()` inside background thread to call `AlertService.create_incident_from_event()` and `_save_traffic_observation_sync()`. This creates a new event loop each time. Should use `asyncio.run_coroutine_threadsafe()` with the main event loop (as already done for the broadcast callback).
2. `list_cameras` endpoint mutates `cam.status` on ORM objects for display but doesn't commit or refresh, creating stale state.
3. `incidents.py` route parameter `status` shadows the imported `fastapi.status` module (not a runtime bug but a code smell).
4. `reports.py` accepts `start_date` and `end_date` parameters but never uses them in the query.
5. `OverviewTab.jsx` and `AnalyticsTab.jsx` fall back to hardcoded dummy chart data when real data is empty, presenting fake data as real.
6. Frontend has 5 hardcoded `http://localhost:8000` references across 4 files, preventing deployment configuration.
7. Dashboard `total_vehicles_detected` sums all observation snapshots, which double-counts vehicles seen across multiple time windows.

---

## 9. Missing Functionality

1. **Video content validation** — only extension is checked, not actual video decoding
2. **Date range filtering** — incidents and reports accept but don't implement date filters
3. **Pagination** — no offset/cursor pagination on incident list
4. **Camera update** — no PUT/PATCH endpoint to update camera config
5. **Authentication** — no auth on any endpoint
6. **Rate limiting** — no limits on uploads or API calls
7. **Environment-based frontend config** — no `.env` support for backend URL
8. **Session persistence** — ProcessingSession records are created with ID but never persisted to DB
9. **Frontend error states** — API fetch failures silently logged, no user-visible error UI
10. **Report date filtering** — parameters accepted but not implemented

---

## 10. Prioritized Implementation Plan

### Phase 1: Critical Backend Fixes (HIGHEST PRIORITY)
1. Fix `asyncio.run()` in video_processor.py → use `run_coroutine_threadsafe` with shared loop
2. Fix MJPEG streaming to use async generator
3. Persist ProcessingSession records to database
4. Fix reports.py date filtering implementation
5. Add video content validation (OpenCV probe)

### Phase 2: Computer Vision Correctness
1. Relabel tracker honestly (not "SORT" — it's a custom IoU tracker)
2. Fix synthetic mode label clarity
3. Add temporal evidence requirement for collision events (multi-frame confirmation)

### Phase 3: Backend Reliability
1. Fix camera status mutation in list_cameras
2. Add incident type and date filtering
3. Fix shadowed `status` import in incidents.py
4. Add proper error responses for DB failures
5. Add health-check DB connectivity verification

### Phase 4: Incident Processing
1. Fix duplicate incident prevention (check for existing pending incident for same camera+type)
2. Ensure WebSocket messages match REST API format
3. Add incident count endpoint

### Phase 5: Frontend Integration
1. Create `.env` support with `VITE_API_BASE_URL`
2. Replace all 5 hardcoded localhost:8000 references
3. Remove hardcoded fallback chart data
4. Add proper error/empty states
5. Fix WebSocket URL construction

### Phase 6: Security
1. Replace wildcard CORS with configurable origins
2. Add video content validation
3. Sanitize source_path in camera creation
4. Add request size limits
5. Update .env.example with CORS origins

### Phase 7: Testing
1. Use isolated test database
2. Add WebSocket tests
3. Add processing pipeline tests
4. Add date filtering tests
5. Add video content validation tests
6. Add duplicate incident prevention tests

### Phase 8: Performance & Documentation
1. Optimize DB queries (avoid N+1)
2. Add code-splitting to frontend
3. Create comprehensive documentation
4. Clean up repository structure

---

## Summary Assessment

The project is a well-structured academic prototype with a functioning end-to-end pipeline. The backend architecture is sound, the CV pipeline works correctly with both real YOLO inference and synthetic demo mode, and the frontend dashboard provides a professional operator interface. The primary areas needing improvement are: (1) thread-to-async DB operations, (2) frontend environment configuration, (3) security hardening, (4) removal of fake fallback data, and (5) expanded test coverage. No fundamental rewrites are needed — targeted fixes and enhancements will bring this to production quality.
