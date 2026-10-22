import time
import cv2
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.database.connection import get_db

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health")
async def get_health(db: AsyncSession = Depends(get_db)):
    # Check GPU availability
    gpu_available = False
    gpu_name = "None"
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    # Check database connectivity
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {type(e).__name__}"

    # Check YOLO model availability
    yolo_model_path = settings.MODELS_DIR / settings.YOLO_MODEL_NAME
    yolo_root_path = settings.BASE_DIR.parent / settings.YOLO_MODEL_NAME
    yolo_available = yolo_model_path.exists() or yolo_root_path.exists()

    overall_status = "healthy" if db_status == "healthy" else "degraded"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "opencv_version": cv2.__version__,
        "cuda_available": gpu_available,
        "device": gpu_name if gpu_available else "CPU",
        "yolo_model": settings.YOLO_MODEL_NAME,
        "yolo_model_found": yolo_available,
        "database_status": db_status,
        "upload_dir": str(settings.UPLOAD_DIR)
    }
