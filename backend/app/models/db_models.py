from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class CameraSourceType(str, enum.Enum):
    VIDEO_FILE = "VIDEO_FILE"
    WEBCAM = "WEBCAM"
    RTSP = "RTSP"
    DEMO_SYNTHETIC = "DEMO_SYNTHETIC"

class CameraStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    PROCESSING = "PROCESSING"
    ERROR = "ERROR"

class CongestionLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class IncidentSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IncidentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    source_type = Column(String(32), default=CameraSourceType.VIDEO_FILE.value)
    source_path = Column(String(512), nullable=False)
    location = Column(String(256), default="Main Expressway Junction")
    status = Column(String(32), default=CameraStatus.ONLINE.value)
    resolution = Column(String(32), default="1280x720")
    fps = Column(Float, default=30.0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    sessions = relationship("ProcessingSession", back_populates="camera", cascade="all, delete-orphan")
    observations = relationship("TrafficObservation", back_populates="camera", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="camera", cascade="all, delete-orphan")

class ProcessingSession(Base):
    __tablename__ = "processing_sessions"

    id = Column(String(64), primary_key=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    status = Column(String(32), default="RUNNING")  # RUNNING, PAUSED, STOPPED, COMPLETED, ERROR
    started_at = Column(DateTime, default=utc_now)
    stopped_at = Column(DateTime, nullable=True)
    frames_processed = Column(Integer, default=0)
    average_fps = Column(Float, default=0.0)

    camera = relationship("Camera", back_populates="sessions")
    observations = relationship("TrafficObservation", back_populates="session")
    incidents = relationship("Incident", back_populates="session")

class TrafficObservation(Base):
    __tablename__ = "traffic_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("processing_sessions.id"), nullable=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    total_vehicles = Column(Integer, default=0)
    cars = Column(Integer, default=0)
    motorcycles = Column(Integer, default=0)
    buses = Column(Integer, default=0)
    trucks = Column(Integer, default=0)
    density_score = Column(Float, default=0.0)  # Ratio 0.0 - 1.0 or vehicle density index
    congestion_level = Column(String(16), default=CongestionLevel.LOW.value)
    avg_speed_estimate = Column(Float, default=0.0)  # relative pixels/sec or estimated km/h

    camera = relationship("Camera", back_populates="observations")
    session = relationship("ProcessingSession", back_populates="observations")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), ForeignKey("processing_sessions.id"), nullable=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=utc_now)
    incident_type = Column(String(64), nullable=False)  # POTENTIAL_ACCIDENT, TRAFFIC_ANOMALY, STOPPED_VEHICLE, SUDDEN_DECELERATION
    severity = Column(String(16), default=IncidentSeverity.MEDIUM.value)
    confidence = Column(Float, default=0.0)
    bounding_box = Column(Text, nullable=True)  # JSON [x1, y1, x2, y2]
    status = Column(String(32), default=IncidentStatus.PENDING.value)
    notes = Column(Text, nullable=True)
    acknowledged_by = Column(String(64), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    snapshot_path = Column(String(512), nullable=True)

    camera = relationship("Camera", back_populates="incidents")
    session = relationship("ProcessingSession", back_populates="incidents")

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), nullable=False)
    channel = Column(String(32), default="DASHBOARD_WEBSOCKET")
    sent_at = Column(DateTime, default=utc_now)
    acknowledged_by = Column(String(64), nullable=True)
