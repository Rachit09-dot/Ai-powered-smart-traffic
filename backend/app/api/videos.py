import os
import uuid
import re
from pathlib import Path
import cv2
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings
from app.schemas.schemas import VideoUploadResponse

router = APIRouter(prefix="/videos", tags=["Videos"])


def sanitize_filename(filename: str) -> str:
    """Strip dangerous path characters from a filename."""
    # Remove directory separators and non-safe characters
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', Path(filename).name)
    # Prevent hidden files / path traversal
    clean = clean.lstrip('.')
    return clean or "upload"


def _validate_video_content(file_path: Path) -> dict:
    """
    Open the file with OpenCV to verify it is a valid, decodable video.
    Returns a dict with width, height, fps, frame_count on success.
    Raises HTTPException on failure.
    """
    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        raise HTTPException(
            status_code=422,
            detail="Uploaded file could not be opened as a video. Ensure it is a valid, non-corrupted video file."
        )
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Try to read at least one frame to confirm decodability
    ret, _ = cap.read()
    cap.release()

    if not ret or width == 0 or height == 0:
        raise HTTPException(
            status_code=422,
            detail="Uploaded file appears to be a video container but contains no decodable frames."
        )
    return {"width": width, "height": height, "fps": fps, "frame_count": frame_count}


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
        )

    clean_name = sanitize_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex[:8]}_{clean_name}"
    save_path = settings.UPLOAD_DIR / unique_filename

    # Stream write with size enforcement
    total_bytes = 0
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    try:
        with open(save_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    buffer.close()
                    save_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # Validate actual video content
    try:
        video_info = _validate_video_content(save_path)
    except HTTPException:
        save_path.unlink(missing_ok=True)
        raise

    size_mb = round(total_bytes / (1024 * 1024), 3)
    return VideoUploadResponse(
        filename=unique_filename,
        file_path=str(save_path),
        size_mb=size_mb,
        message=(
            f"Video '{file.filename}' uploaded and validated successfully. "
            f"({size_mb} MB, {video_info['width']}x{video_info['height']} @ "
            f"{video_info['fps']:.1f} FPS, {video_info['frame_count']} frames)"
        )
    )


@router.get("/list")
async def list_uploads():
    """List available uploaded video files in the uploads directory."""
    uploads = []
    if settings.UPLOAD_DIR.exists():
        for f in settings.UPLOAD_DIR.iterdir():
            if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS:
                uploads.append({
                    "filename": f.name,
                    "file_path": str(f),
                    "size_mb": round(f.stat().st_size / (1024 * 1024), 3)
                })
    return sorted(uploads, key=lambda x: x["filename"])
