# API Reference — AI Smart Traffic & Accident Detection System

Base URL: `http://localhost:8000/api` (development)  
Interactive Docs: `http://localhost:8000/docs` (Swagger UI)  
OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## Health

### `GET /api/health`
Returns service status, OpenCV version, GPU availability, database connectivity, and model availability.

**Response:**
```json
{
  "status": "healthy",
  "service": "AI Smart Traffic & Accident Detection System",
  "version": "1.0.0",
  "uptime_seconds": 142.3,
  "opencv_version": "4.9.0",
  "cuda_available": false,
  "device": "CPU",
  "yolo_model": "yolov8n.pt",
  "yolo_model_found": true,
  "database_status": "healthy",
  "upload_dir": "/path/to/backend/data/uploads"
}
```

---

## Cameras

### `GET /api/cameras`
List all registered cameras with live processing status.

### `POST /api/cameras`
Create a new camera configuration.

**Body:**
```json
{
  "name": "North Highway Cam",
  "source_type": "DEMO_SYNTHETIC",
  "source_path": "demo_synthetic",
  "location": "Highway KM 14",
  "resolution": "1280x720",
  "fps": 30.0
}
```
`source_type` values: `VIDEO_FILE`, `WEBCAM`, `RTSP`, `DEMO_SYNTHETIC`

### `DELETE /api/cameras/{camera_id}`
Delete a camera (stops active pipeline first).

---

## Video Upload

### `POST /api/videos/upload`
Upload a video file. Validates file extension AND actual video content via OpenCV.

- Max size: `MAX_UPLOAD_SIZE_MB` (default 250 MB)
- Allowed extensions: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`
- Returns 400 on bad extension, 422 if file is not a valid decodable video

### `GET /api/videos/list`
List uploaded video files in the uploads directory.

---

## Processing

### `POST /api/processing/start`
Start the computer vision pipeline for a camera.

**Body:**
```json
{
  "camera_id": "cam-01",
  "confidence_threshold": 0.35,
  "enable_accident_detection": true
}
```

### `POST /api/processing/stop`
Stop the pipeline.

**Body:** `{ "camera_id": "cam-01" }`

### `POST /api/processing/pause/{camera_id}`
Toggle pause/resume.

### `GET /api/processing/status/{camera_id}`
Get worker status, FPS, frame count, and live metrics.

### `GET /api/processing/stream/{camera_id}`
MJPEG live video stream with detection overlays.  
Use as `<img src="http://localhost:8000/api/processing/stream/cam-01">` in HTML.

---

## Traffic & Dashboard

### `GET /api/dashboard/summary`
Aggregated KPIs: total vehicles, active cameras, congestion, incidents.

### `GET /api/traffic/history`
Historical traffic observations in chronological order.

**Query params:**
- `camera_id` — filter by camera
- `limit` — number of observations (5–300, default 60)

---

## Incidents

### `GET /api/incidents`
List incidents with filtering and pagination.

**Query params:**
- `camera_id` — filter by camera
- `status` — `PENDING` | `ACKNOWLEDGED` | `RESOLVED` | `FALSE_POSITIVE`
- `incident_type` — e.g. `POTENTIAL_ACCIDENT`, `STOPPED_VEHICLE`
- `start_date` — ISO 8601 datetime (e.g. `2024-01-15T08:00:00`)
- `end_date` — ISO 8601 datetime
- `limit` — 1–500 (default 50)
- `offset` — pagination offset (default 0)

### `GET /api/incidents/count`
Return total count with optional filters.

### `PATCH /api/incidents/{incident_id}`
Update incident status.

**Body:**
```json
{
  "status": "ACKNOWLEDGED",
  "notes": "Verified by operator",
  "acknowledged_by": "Operator Alpha"
}
```
Valid status values: `PENDING`, `ACKNOWLEDGED`, `RESOLVED`, `FALSE_POSITIVE`

---

## Reports

### `GET /api/reports/export`
Download CSV report.

**Query params:**
- `report_type` — `incidents` | `traffic`
- `camera_id` — optional filter
- `start_date` — ISO 8601 (e.g. `2024-01-15`)
- `end_date` — ISO 8601

Returns `Content-Disposition: attachment` CSV file.

---

## WebSocket

### `WS /ws/traffic`
Real-time telemetry stream.

**Inbound (from client):**
```json
{ "type": "PING" }
```

**Outbound — Connection established:**
```json
{ "type": "CONNECTION_ESTABLISHED", "message": "..." }
```

**Outbound — Traffic update (broadcast):**
```json
{
  "type": "TRAFFIC_UPDATE",
  "camera_id": "cam-01",
  "session_id": "sess-abc123",
  "fps": 14.8,
  "frames_processed": 450,
  "metrics": {
    "total_vehicles": 6,
    "cars": 4,
    "motorcycles": 1,
    "buses": 0,
    "trucks": 1,
    "density_score": 0.312,
    "congestion_level": "LOW",
    "avg_speed_px_sec": 38.2,
    "estimated_flow_rate_vpm": 5.5,
    "road_occupancy_ratio": 0.08
  },
  "active_tracks": [...],
  "active_events": [...]
}
```
