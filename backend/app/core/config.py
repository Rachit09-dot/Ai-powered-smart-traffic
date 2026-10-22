import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Smart Traffic & Accident Detection System"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"

    # Base paths — resolved relative to this config file's location
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    MODELS_DIR: Path = BASE_DIR.parent / "models"

    # Database — async SQLite
    DATABASE_URL: str = ""  # Populated by validator below

    # YOLO & CV Settings
    YOLO_MODEL_NAME: str = "yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    PROCESSING_TARGET_FPS: int = 15
    MAX_PROCESSING_FRAME_WIDTH: int = 960

    # Traffic Congestion Thresholds (vehicles visible in a single frame)
    # LOW:    vehicle_count <= CONGESTION_LOW_MAX   AND occupancy < 0.22
    # MEDIUM: vehicle_count <= CONGESTION_MEDIUM_MAX AND occupancy < 0.45
    # HIGH:   otherwise
    CONGESTION_LOW_MAX: int = 5
    CONGESTION_MEDIUM_MAX: int = 12

    # Accident & Anomaly Heuristics (all are configurable via .env)
    ACCIDENT_DECELERATION_THRESHOLD: float = 0.75
    STOPPED_VEHICLE_TIME_THRESHOLD_SEC: float = 4.0
    COLLISION_IOU_THRESHOLD: float = 0.15
    # Suppress duplicate alerts for the same incident key for this many seconds
    ALERT_COOLDOWN_SECONDS: int = 30

    # CORS — for production, replace "*" with your specific frontend origin(s).
    # Example: CORS_ORIGINS=["http://localhost:5173","https://yourdomain.com"]
    # Development default allows any origin for convenience.
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    CORS_ALLOW_ALL: bool = False  # Set True in .env to revert to wildcard (dev only)

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 250
    ALLOWED_EXTENSIONS: set = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    def model_post_init(self, __context):
        # Build DATABASE_URL from DATA_DIR if not explicitly set
        if not self.DATABASE_URL:
            object.__setattr__(
                self, "DATABASE_URL",
                f"sqlite+aiosqlite:///{self.DATA_DIR.as_posix()}/traffic_system.db"
            )


settings = Settings()

# Ensure required directories exist at startup
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Resolve effective CORS origins
EFFECTIVE_CORS_ORIGINS = ["*"] if settings.CORS_ALLOW_ALL else settings.CORS_ORIGINS
