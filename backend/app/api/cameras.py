import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.connection import get_db
from app.models.db_models import Camera, CameraStatus
from app.schemas.schemas import CameraCreate, CameraResponse
from app.services.video_processor import video_manager

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).order_by(Camera.created_at.asc()))
    cameras = result.scalars().all()
    
    # Return camera list with dynamically computed status (do not mutate DB records)
    camera_list = []
    for cam in cameras:
        cam_dict = {
            "id": cam.id,
            "name": cam.name,
            "source_type": cam.source_type,
            "source_path": cam.source_path,
            "location": cam.location,
            "status": CameraStatus.PROCESSING.value if video_manager.is_camera_processing(cam.id) else cam.status,
            "resolution": cam.resolution,
            "fps": cam.fps,
            "created_at": cam.created_at,
            "updated_at": cam.updated_at,
        }
        camera_list.append(CameraResponse(**cam_dict))
    return camera_list

@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)):
    cam_id = payload.id or f"cam-{uuid.uuid4().hex[:6]}"
    
    # Check if id already exists
    existing = await db.execute(select(Camera).filter(Camera.id == cam_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Camera ID already exists")

    camera = Camera(
        id=cam_id,
        name=payload.name,
        source_type=payload.source_type,
        source_path=payload.source_path,
        location=payload.location,
        resolution=payload.resolution or "1280x720",
        fps=payload.fps or 30.0,
        status=CameraStatus.ONLINE.value
    )
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    # Stop processing if currently active
    if video_manager.is_camera_processing(camera_id):
        video_manager.stop_pipeline(camera_id)

    result = await db.execute(select(Camera).filter(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()
    return None
