import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.connection import get_db
from app.models.db_models import Camera
from app.schemas.schemas import (
    ProcessingStartRequest, ProcessingStopRequest, ProcessingStatusResponse
)
from app.services.video_processor import video_manager

router = APIRouter(prefix="/processing", tags=["Processing"])

@router.post("/start", response_model=ProcessingStatusResponse)
async def start_processing(payload: ProcessingStartRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).filter(Camera.id == payload.camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera feed not found")

    worker = video_manager.start_pipeline(
        camera_id=camera.id,
        source_path=camera.source_path,
        conf_threshold=payload.confidence_threshold or 0.35,
        enable_accident_detection=payload.enable_accident_detection if payload.enable_accident_detection is not None else True
    )

    analysis = worker.latest_analysis
    return ProcessingStatusResponse(
        camera_id=camera.id,
        session_id=worker.session_id,
        status="RUNNING",
        is_processing=True,
        fps=worker.current_fps,
        frames_processed=worker.frames_processed,
        total_vehicles=analysis.total_vehicles if analysis else 0,
        congestion_level=analysis.congestion_level if analysis else "LOW",
        active_incidents_count=len(worker.latest_events)
    )

@router.post("/stop", response_model=ProcessingStatusResponse)
async def stop_processing(payload: ProcessingStopRequest):
    video_manager.stop_pipeline(payload.camera_id)
    return ProcessingStatusResponse(
        camera_id=payload.camera_id,
        session_id=None,
        status="STOPPED",
        is_processing=False,
        fps=0.0,
        frames_processed=0,
        total_vehicles=0,
        congestion_level="LOW",
        active_incidents_count=0
    )

@router.post("/pause/{camera_id}")
async def toggle_pause(camera_id: str):
    worker = video_manager.get_worker(camera_id)
    if not worker:
        raise HTTPException(status_code=404, detail="No active processing worker for this camera")
    worker.pause()
    return {"camera_id": camera_id, "is_paused": worker.is_paused}

@router.get("/status/{camera_id}", response_model=ProcessingStatusResponse)
async def get_processing_status(camera_id: str):
    worker = video_manager.get_worker(camera_id)
    if not worker or not worker.is_running:
        return ProcessingStatusResponse(
            camera_id=camera_id,
            session_id=None,
            status="STOPPED",
            is_processing=False,
            fps=0.0,
            frames_processed=0,
            total_vehicles=0,
            congestion_level="LOW",
            active_incidents_count=0
        )

    analysis = worker.latest_analysis
    return ProcessingStatusResponse(
        camera_id=camera_id,
        session_id=worker.session_id,
        status="PAUSED" if worker.is_paused else "RUNNING",
        is_processing=True,
        fps=worker.current_fps,
        frames_processed=worker.frames_processed,
        total_vehicles=analysis.total_vehicles if analysis else 0,
        congestion_level=analysis.congestion_level if analysis else "LOW",
        active_incidents_count=len(worker.latest_events)
    )

async def mjpeg_frame_generator(camera_id: str):
    """Async generator for MJPEG stream — does not block the event loop."""
    while True:
        worker = video_manager.get_worker(camera_id)
        if not worker or not worker.is_running:
            await asyncio.sleep(0.1)
            continue

        frame_bytes = worker.get_latest_frame()
        if frame_bytes:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        await asyncio.sleep(0.04)  # ~25 FPS stream delivery

@router.get("/stream/{camera_id}")
async def get_camera_stream(camera_id: str, db: AsyncSession = Depends(get_db)):
    # Auto-start pipeline if camera exists but not running
    if not video_manager.is_camera_processing(camera_id):
        result = await db.execute(select(Camera).filter(Camera.id == camera_id))
        camera = result.scalar_one_or_none()
        if camera:
            video_manager.start_pipeline(camera_id=camera.id, source_path=camera.source_path)

    return StreamingResponse(
        mjpeg_frame_generator(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
