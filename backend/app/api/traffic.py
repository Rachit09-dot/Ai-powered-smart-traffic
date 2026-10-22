import time
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database.connection import get_db
from app.models.db_models import Camera, TrafficObservation, Incident, IncidentStatus, CongestionLevel
from app.schemas.schemas import DashboardSummaryResponse, TrafficObservationResponse, IncidentResponse
from app.services.video_processor import video_manager

router = APIRouter(prefix="", tags=["Traffic & Analytics"])

START_TIME = time.time()

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    # 1. Total cameras & active camera count
    cameras_res = await db.execute(select(Camera))
    cameras = cameras_res.scalars().all()
    total_cameras = len(cameras)
    active_feeds = sum(1 for c in cameras if video_manager.is_camera_processing(c.id))

    # 2. Total vehicles observed (aggregate sum or max across observations)
    vehicle_sum_res = await db.execute(select(func.sum(TrafficObservation.total_vehicles)))
    total_vehicles = vehicle_sum_res.scalar() or 0

    # 3. Aggregated vehicle breakdown
    car_sum = (await db.execute(select(func.sum(TrafficObservation.cars)))).scalar() or 0
    motorcycle_sum = (await db.execute(select(func.sum(TrafficObservation.motorcycles)))).scalar() or 0
    bus_sum = (await db.execute(select(func.sum(TrafficObservation.buses)))).scalar() or 0
    truck_sum = (await db.execute(select(func.sum(TrafficObservation.trucks)))).scalar() or 0

    vehicle_breakdown = {
        "car": int(car_sum),
        "motorcycle": int(motorcycle_sum),
        "bus": int(bus_sum),
        "truck": int(truck_sum)
    }

    # If no recorded observations yet, grab from live workers
    live_total = 0
    for w in video_manager.workers.values():
        if w.latest_analysis:
            live_total += w.latest_analysis.total_vehicles
            for k, v in w.latest_analysis.breakdown.items():
                vehicle_breakdown[k] = vehicle_breakdown.get(k, 0) + v
    total_vehicles = max(int(total_vehicles), live_total)

    # 4. Congestion level determination
    current_congestion = CongestionLevel.LOW.value
    # Check active workers
    active_congestions = [w.latest_analysis.congestion_level for w in video_manager.workers.values() if w.latest_analysis]
    if CongestionLevel.HIGH.value in active_congestions:
        current_congestion = CongestionLevel.HIGH.value
    elif CongestionLevel.MEDIUM.value in active_congestions:
        current_congestion = CongestionLevel.MEDIUM.value

    # 5. Incidents count & pending count
    incidents_count = (await db.execute(select(func.count(Incident.id)))).scalar() or 0
    pending_incidents = (await db.execute(
        select(func.count(Incident.id)).filter(Incident.status == IncidentStatus.PENDING.value)
    )).scalar() or 0

    # 6. Average traffic flow rate
    avg_speed = (await db.execute(select(func.avg(TrafficObservation.avg_speed_estimate)))).scalar() or 42.5

    # 7. Recent incidents
    recent_inc_res = await db.execute(select(Incident).order_by(Incident.timestamp.desc()).limit(5))
    recent_incidents = recent_inc_res.scalars().all()

    return DashboardSummaryResponse(
        total_vehicles_detected=int(total_vehicles),
        active_camera_feeds=active_feeds,
        total_cameras=total_cameras,
        current_congestion_level=current_congestion,
        total_incidents=int(incidents_count),
        pending_incidents=int(pending_incidents),
        avg_traffic_flow_rate=round(float(avg_speed), 1),
        system_status="OPERATIONAL",
        system_uptime_seconds=round(time.time() - START_TIME, 1),
        vehicle_breakdown=vehicle_breakdown,
        recent_incidents=recent_incidents
    )

@router.get("/traffic/history", response_model=List[TrafficObservationResponse])
async def get_traffic_history(
    camera_id: Optional[str] = Query(None),
    limit: int = Query(60, ge=5, le=300),
    db: AsyncSession = Depends(get_db)
):
    query = select(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).limit(limit)
    if camera_id:
        query = query.filter(TrafficObservation.camera_id == camera_id)

    result = await db.execute(query)
    observations = list(result.scalars().all())
    # Return chronological order for charts
    observations.reverse()
    return observations
