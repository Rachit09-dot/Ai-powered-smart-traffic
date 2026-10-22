# Testing Guide

## Running Tests

From the repository root:

```powershell
python -m pytest backend/tests -v
```

This uses `pytest.ini` which sets:
- `pythonpath = backend` — makes `app` importable
- `testpaths = backend/tests`
- `asyncio_mode = auto` — all async tests run without `@pytest.mark.asyncio` boilerplate

### With coverage (optional):
```powershell
pip install pytest-cov
python -m pytest backend/tests -v --cov=backend/app --cov-report=term-missing
```

## Test Architecture

### Isolated Database
`conftest.py` overrides `DATABASE_URL` to a temporary file before any app imports. This ensures:
- Tests never touch the development `traffic_system.db`
- Each test session starts with a clean schema

### Test Files

| File | What it tests |
|------|--------------|
| `test_accident_detector.py` | Stopped vehicle, cooldown, collision detection, sudden deceleration, empty frame |
| `test_health_and_cameras.py` | Health endpoint structure, DB status, camera CRUD, duplicate ID rejection, 404 on delete |
| `test_incident_flow.py` | Full lifecycle (create → acknowledge → resolve), invalid status 400, 404 not found, deduplication, filter by status, count endpoint |
| `test_reports_and_dashboard.py` | Dashboard structure, traffic history, CSV export (incidents + traffic), invalid report type, invalid date 400, camera filter |
| `test_traffic_analyzer.py` | Empty tracks, LOW/MEDIUM/HIGH classification, vehicle breakdown, density score bounds, flow rate at zero vehicles |
| `test_video_upload.py` | Invalid extension 400, empty filename, fake MP4 content validation 422, path traversal sanitisation |

## Current Results

```
38 passed in ~6s
```

## What is NOT covered by automated tests

- **Live MJPEG stream** — requires an active processing pipeline; tested manually via browser
- **WebSocket real-time broadcast** — requires a running server; validated manually
- **YOLO inference quality** — no ground-truth labelled dataset; FPS measured via `scripts/evaluate_pipeline.py`
- **End-to-end real video processing** — tested manually using `backend/data/sample_traffic.mp4`
- **GPU acceleration** — tested only if CUDA hardware is available on the test machine

## Manual Verification Steps

1. Start backend: `python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000`
2. Open `http://localhost:8000/docs` — confirm all routes visible
3. Open `http://localhost:8000/api/health` — confirm `database_status: healthy`
4. Open frontend dev server: `cd frontend && npm run dev`
5. Navigate to Live Monitoring → select cam-01 → Start Pipeline
6. Observe MJPEG stream with vehicle tracks
7. Wait ~10s for first stopped-vehicle alert in Incidents tab
8. Navigate to Reports → Export CSV → confirm download
9. Navigate to Analytics → confirm charts show real data after pipeline has run
