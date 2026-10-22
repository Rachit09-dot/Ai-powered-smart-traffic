import io
import csv
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.connection import get_db
from app.models.db_models import Incident, TrafficObservation

router = APIRouter(prefix="/reports", tags=["Reports"])

def _parse_date(date_str: Optional[str], param_name: str) -> Optional[datetime]:
    """Parse ISO date string to datetime; raise 400 on bad format."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise HTTPException(
        status_code=400,
        detail=f"Invalid date format for '{param_name}'. Expected ISO 8601 (e.g. 2024-01-15T14:00:00 or 2024-01-15)."
    )


@router.get("/export")
async def export_csv_report(
    report_type: str = Query("incidents", pattern="^(incidents|traffic)$"),
    camera_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, description="Start datetime in ISO 8601 format"),
    end_date: Optional[str] = Query(None, description="End datetime in ISO 8601 format"),
    db: AsyncSession = Depends(get_db)
):
    start_dt = _parse_date(start_date, "start_date")
    end_dt = _parse_date(end_date, "end_date")

    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "incidents":
        query = select(Incident).order_by(Incident.timestamp.desc())
        if camera_id:
            query = query.filter(Incident.camera_id == camera_id)
        if start_dt:
            query = query.filter(Incident.timestamp >= start_dt)
        if end_dt:
            query = query.filter(Incident.timestamp <= end_dt)

        result = await db.execute(query)
        incidents = result.scalars().all()

        writer.writerow([
            "Incident ID", "Timestamp (UTC)", "Camera ID", "Type",
            "Severity", "Confidence", "Status", "Notes",
            "Acknowledged By", "Resolved At", "Session ID"
        ])
        for inc in incidents:
            writer.writerow([
                inc.id,
                inc.timestamp.isoformat() if inc.timestamp else "",
                inc.camera_id,
                inc.incident_type,
                inc.severity,
                f"{inc.confidence:.3f}",
                inc.status,
                inc.notes or "",
                inc.acknowledged_by or "",
                inc.resolved_at.isoformat() if inc.resolved_at else "",
                inc.session_id or ""
            ])
        filename = f"traffic_incidents_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    else:
        # Traffic observations
        query = select(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).limit(5000)
        if camera_id:
            query = query.filter(TrafficObservation.camera_id == camera_id)
        if start_dt:
            query = query.filter(TrafficObservation.timestamp >= start_dt)
        if end_dt:
            query = query.filter(TrafficObservation.timestamp <= end_dt)

        result = await db.execute(query)
        observations = result.scalars().all()

        writer.writerow([
            "ID", "Timestamp (UTC)", "Camera ID", "Session ID",
            "Total Vehicles", "Cars", "Motorcycles", "Buses", "Trucks",
            "Density Score (0-1)", "Congestion Level",
            "Avg Speed (px/s)"
        ])
        for obs in observations:
            writer.writerow([
                obs.id,
                obs.timestamp.isoformat() if obs.timestamp else "",
                obs.camera_id,
                obs.session_id or "",
                obs.total_vehicles,
                obs.cars,
                obs.motorcycles,
                obs.buses,
                obs.trucks,
                f"{obs.density_score:.4f}",
                obs.congestion_level,
                f"{obs.avg_speed_estimate:.2f}"
            ])
        filename = f"traffic_observations_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Record-Count": str(csv_data.count("\n") - 1)
        }
    )
