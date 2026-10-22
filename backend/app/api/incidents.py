from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from fastapi import Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database.connection import get_db
from app.models.db_models import Incident, IncidentStatus
from app.schemas.schemas import IncidentResponse, IncidentUpdate
from app.services.alert_service import AlertService

router = APIRouter(prefix="/incidents", tags=["Incidents"])

# Valid status values as a set for O(1) lookup
_VALID_STATUSES = {s.value for s in IncidentStatus}

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    incident_status: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)"),
    incident_type: Optional[str] = Query(None, description="Filter by incident type"),
    start_date: Optional[datetime] = Query(None, description="Filter incidents from this UTC datetime"),
    end_date: Optional[datetime] = Query(None, description="Filter incidents up to this UTC datetime"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).order_by(Incident.timestamp.desc())

    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)
    if incident_status:
        if incident_status not in _VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{incident_status}'. Allowed: {sorted(_VALID_STATUSES)}"
            )
        query = query.filter(Incident.status == incident_status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if start_date:
        # Ensure timezone-naive for SQLite comparison
        start_naive = start_date.replace(tzinfo=None) if start_date.tzinfo else start_date
        query = query.filter(Incident.timestamp >= start_naive)
    if end_date:
        end_naive = end_date.replace(tzinfo=None) if end_date.tzinfo else end_date
        query = query.filter(Incident.timestamp <= end_naive)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_incidents(
    camera_id: Optional[str] = Query(None),
    incident_status: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    """Return total incident count with optional filters."""
    query = select(func.count(Incident.id))
    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)
    if incident_status:
        query = query.filter(Incident.status == incident_status)
    total = (await db.execute(query)).scalar() or 0
    return {"total": int(total)}


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: AsyncSession = Depends(get_db)
):
    if payload.status and payload.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {sorted(_VALID_STATUSES)}"
        )

    updated = await AlertService.update_incident_status(
        incident_id=incident_id,
        new_status=payload.status or IncidentStatus.ACKNOWLEDGED.value,
        notes=payload.notes,
        operator=payload.acknowledged_by or "Command Center Operator"
    )
    if not updated:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found"
        )
    return updated
