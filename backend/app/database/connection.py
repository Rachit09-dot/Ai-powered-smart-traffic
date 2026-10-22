from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.models.db_models import Base, Camera, CameraSourceType, CameraStatus
from sqlalchemy import select
import uuid

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Seed default sample cameras if none exist
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Camera))
        cameras = result.scalars().all()
        if not cameras:
            sample_cameras = [
                Camera(
                    id="cam-01",
                    name="North Ring Expressway - Gate 4",
                    source_type=CameraSourceType.DEMO_SYNTHETIC.value,
                    source_path="demo_synthetic",
                    location="North Highway km 14.2",
                    status=CameraStatus.ONLINE.value,
                    resolution="1280x720",
                    fps=30.0
                ),
                Camera(
                    id="cam-02",
                    name="Downtown Avenue & 5th Crossing",
                    source_type=CameraSourceType.DEMO_SYNTHETIC.value,
                    source_path="demo_synthetic",
                    location="Downtown Sector B",
                    status=CameraStatus.ONLINE.value,
                    resolution="1280x720",
                    fps=25.0
                ),
                Camera(
                    id="cam-03",
                    name="West Tunnel Entrance",
                    source_type=CameraSourceType.DEMO_SYNTHETIC.value,
                    source_path="demo_synthetic",
                    location="West Bypass Tunnel",
                    status=CameraStatus.ONLINE.value,
                    resolution="1280x720",
                    fps=30.0
                )
            ]
            session.add_all(sample_cameras)
            await session.commit()
