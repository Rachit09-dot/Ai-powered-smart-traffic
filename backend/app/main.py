import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings, EFFECTIVE_CORS_ORIGINS
from app.database.connection import init_db
from app.api import health, cameras, videos, processing, incidents, traffic, reports, websocket
from app.services.video_processor import video_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("TrafficSystem")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database and system state...")
    await init_db()
    
    # Register the running event loop with the video manager for thread-safe DB ops
    loop = asyncio.get_running_loop()
    video_manager.set_event_loop(loop)

    # Connect video_manager telemetry broadcast to WebSocket manager
    def sync_broadcast_bridge(payload: dict):
        try:
            asyncio.run_coroutine_threadsafe(websocket.manager.broadcast(payload), loop)
        except Exception:
            pass
    video_manager.set_broadcast_callback(sync_broadcast_bridge)

    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} online and ready.")
    yield

    logger.info("Shutting down active video processing pipelines...")
    for cam_id in list(video_manager.workers.keys()):
        video_manager.stop_pipeline(cam_id)
    logger.info("All pipelines terminated gracefully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-time Computer Vision Traffic Monitoring, Vehicle Tracking, Congestion Analysis, and Accident Anomaly Detection System.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=EFFECTIVE_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(cameras.router, prefix=settings.API_V1_PREFIX)
app.include_router(videos.router, prefix=settings.API_V1_PREFIX)
app.include_router(processing.router, prefix=settings.API_V1_PREFIX)
app.include_router(incidents.router, prefix=settings.API_V1_PREFIX)
app.include_router(traffic.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(websocket.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
