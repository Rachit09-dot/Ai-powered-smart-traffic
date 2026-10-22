from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# Camera schemas
class CameraBase(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Downtown Crossroad 4"})
    source_type: str = Field("VIDEO_FILE", json_schema_extra={"example": "VIDEO_FILE"})
    source_path: str = Field(..., json_schema_extra={"example": "backend/data/uploads/sample.mp4"})
    location: str = Field("City Center", json_schema_extra={"example": "North Highway KM 12"})
    resolution: Optional[str] = "1280x720"
    fps: Optional[float] = 30.0

class CameraCreate(CameraBase):
    id: Optional[str] = None

class CameraResponse(CameraBase):
    id: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Processing schemas
class ProcessingStartRequest(BaseModel):
    camera_id: str
    confidence_threshold: Optional[float] = 0.35
    enable_accident_detection: Optional[bool] = True

class ProcessingStopRequest(BaseModel):
    camera_id: str

class ProcessingStatusResponse(BaseModel):
    camera_id: str
    session_id: Optional[str] = None
    status: str
    is_processing: bool
    fps: float = 0.0
    frames_processed: int = 0
    total_vehicles: int = 0
    congestion_level: str = "LOW"
    active_incidents_count: int = 0

# Traffic observation schemas
class TrafficObservationResponse(BaseModel):
    id: int
    session_id: Optional[str] = None
    camera_id: str
    timestamp: datetime
    total_vehicles: int
    cars: int
    motorcycles: int
    buses: int
    trucks: int
    density_score: float
    congestion_level: str
    avg_speed_estimate: float

    model_config = ConfigDict(from_attributes=True)

# Incident schemas
class IncidentCreate(BaseModel):
    camera_id: str
    session_id: Optional[str] = None
    incident_type: str
    severity: str = "MEDIUM"
    confidence: float
    bounding_box: Optional[str] = None
    notes: Optional[str] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    acknowledged_by: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    camera_id: str
    timestamp: datetime
    incident_type: str
    severity: str
    confidence: float
    bounding_box: Optional[str] = None
    status: str
    notes: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    snapshot_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Dashboard Summary schemas
class DashboardSummaryResponse(BaseModel):
    total_vehicles_detected: int
    active_camera_feeds: int
    total_cameras: int
    current_congestion_level: str
    total_incidents: int
    pending_incidents: int
    avg_traffic_flow_rate: float
    system_status: str
    system_uptime_seconds: float
    vehicle_breakdown: Dict[str, int]
    recent_incidents: List[IncidentResponse]

# Upload response
class VideoUploadResponse(BaseModel):
    filename: str
    file_path: str
    size_mb: float
    message: str
