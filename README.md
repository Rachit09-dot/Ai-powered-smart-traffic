# AI Smart Traffic & Accident Detection System

A production-quality, end-to-end computer vision platform for real-time traffic monitoring, multi-object vehicle tracking, congestion analysis, kinematic anomaly detection, and operator incident management.

---

## 1. Implemented Features

| Feature | Status |
|---------|--------|
| Real-time vehicle detection (YOLOv8n, COCO classes) | ✅ Working |
| Multi-frame vehicle tracking (custom IoU tracker) | ✅ Working |
| Traffic density & congestion classification (LOW/MEDIUM/HIGH) | ✅ Working |
| Heuristic anomaly detection (stopped vehicle, sudden deceleration, bbox overlap) | ✅ Working |
| Incident deduplication (heuristic cooldown + DB window check) | ✅ Working |
| Incident lifecycle (PENDING → ACKNOWLEDGED → RESOLVED / FALSE_POSITIVE) | ✅ Working |
| Live MJPEG video stream with rendered overlays | ✅ Working |
| WebSocket real-time telemetry | ✅ Working |
| Dashboard analytics (vehicle counts, density trends, incident table) | ✅ Working |
| Video upload with content validation (OpenCV probe) | ✅ Working |
| CSV export (incidents + traffic observations) with date filtering | ✅ Working |
| Synthetic demo mode (no video file required) | ✅ Working |
| ProcessingSession database persistence | ✅ Working |
| Configurable backend URL via environment variable | ✅ Working |

**Not implemented (documented limitations):**
- Trained deep learning accident model (interface stub only)
- Authentication / authorization
- Rate limiting
- Real RTSP stream validation (requires live camera)

---

## 2. Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for data flow and component design.

```
Video Input → Background CV Worker → SQLite → FastAPI → React Dashboard
                                             → WebSocket broadcast
                                             → MJPEG stream
```

---

## 3. Prerequisites

- **Python** 3.11 or 3.13
- **Node.js** 18+, npm 9+
- **pip** (Python package manager)
- Optional: NVIDIA GPU with CUDA 11.8+ for accelerated inference

---

## 4. Backend Setup (Windows PowerShell)

```powershell
# From repository root
pip install -r backend\requirements.txt

# Start development server
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

API available at:
- **Swagger UI**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/api/health

---

## 5. Frontend Setup

```powershell
cd frontend
npm install
npm run dev     # Development server at http://localhost:5173
```

For production:
```powershell
npm run build   # Outputs to frontend/dist/
```

---

## 6. Environment Configuration

Copy `.env.example` to `.env` in the repository root and configure:

```powershell
Copy-Item .env.example .env
```

Key variables (see `.env.example` for full list):
```
YOLO_MODEL_NAME=yolov8n.pt
CONFIDENCE_THRESHOLD=0.35
CORS_ALLOW_ALL=False
```

For the frontend, copy `frontend/.env.example` to `frontend/.env`:
```powershell
Copy-Item frontend\.env.example frontend\.env
```

The default frontend `.env` points to `http://localhost:8000/api` — change this for deployment.

---

## 7. Model Setup

YOLOv8 weights are **automatically downloaded** on first use by the Ultralytics library.

The default model `yolov8n.pt` (~6 MB) will be cached locally. No manual download is required.

To use a different model variant:
```
YOLO_MODEL_NAME=yolov8s.pt   # Larger, more accurate
```

---

## 8. Database

SQLite database is created automatically at first startup:
```
backend/data/traffic_system.db
```
Three demo cameras are seeded if none exist.

---

## 9. Running Tests

```powershell
python -m pytest backend/tests -v
```

Expected: **38 tests pass**.

See [`docs/TESTING.md`](docs/TESTING.md) for full test guide.

---

## 10. Testing the Live Pipeline

### Option 1: Instant Synthetic Demo (no files needed)
1. Start backend + frontend
2. Open http://localhost:5173 → **Live Monitoring** tab
3. Select **cam-01** → click **Start Processing**
4. A synthetic highway simulation starts immediately with animated vehicles
5. A staged stopped-vehicle event fires after ~10 seconds → appears in **Incidents** tab

### Option 2: Generated Test Video
```powershell
python scripts\generate_sample_traffic.py
```
Writes `backend/data/sample_traffic.mp4`.  
In the dashboard → Cameras → Add Camera → set path to `backend/data/sample_traffic.mp4`.

### Option 3: Your Own Traffic Video
Upload via **Cameras → Add Camera Feed → Upload Video File** (max 250 MB, `.mp4 .avi .mov .mkv .webm`). The file is validated with OpenCV before acceptance.

---

## 11. Performance Evaluation

```powershell
python scripts\evaluate_pipeline.py backend\data\sample_traffic.mp4
```

Outputs wall-clock FPS, per-stage latency, and saves `backend/data/evaluation_benchmark.json`.

> **Note:** Metrics are hardware-specific. No claims are made about performance on hardware not tested.

---

## 12. Known Limitations

- **Accident detection is heuristic-only** — no trained collision model. Events require operator verification. See [`docs/MODEL_LIMITATIONS.md`](docs/MODEL_LIMITATIONS.md).
- **`total_vehicles_detected`** in the dashboard accumulates detection events over time, not unique vehicles.
- **Single-camera density** does not account for lane count, road type, or speed limits.
- **No authentication** — all API endpoints are open. Add a reverse proxy with auth for any networked deployment.
- **SQLite** is appropriate for development; replace with PostgreSQL for concurrent production use.
- **RTSP streams** are supported by OpenCV but not tested with live hardware in this setup.

---

## 13. Documentation

- [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) — Complete codebase audit
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture and data flow
- [`docs/API.md`](docs/API.md) — Full API reference
- [`docs/TESTING.md`](docs/TESTING.md) — Test guide and results
- [`docs/MODEL_LIMITATIONS.md`](docs/MODEL_LIMITATIONS.md) — Honest model evaluation

---

## 14. License

Academic/research project. YOLOv8 weights © Ultralytics, AGPL-3.0.
