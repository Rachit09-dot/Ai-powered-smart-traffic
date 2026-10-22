import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import select, update
from app.database.connection import AsyncSessionLocal
from app.models.db_models import Incident, AlertLog, IncidentStatus
from app.services.accident_detector import AccidentEvent

logger = logging.getLogger(__name__)

# How far back to look when checking for duplicate incidents (seconds)
_DUPLICATE_WINDOW_SECONDS = 30


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)  # Store as naive UTC in SQLite


class AlertService:

    @staticmethod
    async def create_incident_from_event(
        camera_id: str,
        session_id: Optional[str],
        event: AccidentEvent,
        snapshot_path: Optional[str] = None
    ) -> Optional[Incident]:
        """
        Persist a detected anomaly event as an Incident record.
        Skips creation if an identical pending incident for the same camera and
        event type exists within the deduplication window. This prevents alert storms
        that the heuristic detector's cooldown alone may not fully prevent across
        process restarts or concurrent workers.
        """
        async with AsyncSessionLocal() as db:
            # Deduplication check: look for recent PENDING incident of same type + camera
            cutoff = utc_now() - timedelta(seconds=_DUPLICATE_WINDOW_SECONDS)
            existing_q = await db.execute(
                select(Incident).filter(
                    Incident.camera_id == camera_id,
                    Incident.incident_type == event.event_type,
                    Incident.status == IncidentStatus.PENDING.value,
                    Incident.timestamp >= cutoff
                ).limit(1)
            )
            existing = existing_q.scalar_one_or_none()
            if existing:
                logger.debug(
                    f"Skipping duplicate incident creation for camera={camera_id} "
                    f"type={event.event_type} (existing: {existing.id})"
                )
                return existing

            incident_id = f"inc-{uuid.uuid4().hex[:8]}"
            bbox_json = json.dumps(event.bbox) if event.bbox else None

            incident = Incident(
                id=incident_id,
                session_id=session_id,
                camera_id=camera_id,
                timestamp=utc_now(),
                incident_type=event.event_type,
                severity=event.severity,
                confidence=round(float(event.confidence), 4),
                bounding_box=bbox_json,
                status=IncidentStatus.PENDING.value,
                notes=event.description,
                snapshot_path=snapshot_path
            )
            db.add(incident)

            alert_log = AlertLog(
                incident_id=incident_id,
                channel="DASHBOARD_WEBSOCKET",
                sent_at=utc_now()
            )
            db.add(alert_log)

            try:
                await db.commit()
                await db.refresh(incident)
                logger.info(
                    f"Created incident [{incident.id}] "
                    f"type={incident.incident_type} severity={incident.severity} "
                    f"camera={camera_id}"
                )
                return incident
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to persist incident for camera={camera_id}: {e}")
                return None

    @staticmethod
    async def get_incidents(
        camera_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Incident]:
        async with AsyncSessionLocal() as db:
            query = select(Incident).order_by(Incident.timestamp.desc()).limit(limit)
            if camera_id:
                query = query.filter(Incident.camera_id == camera_id)
            if status:
                query = query.filter(Incident.status == status)
            result = await db.execute(query)
            return list(result.scalars().all())

    @staticmethod
    async def update_incident_status(
        incident_id: str,
        new_status: str,
        notes: Optional[str] = None,
        operator: Optional[str] = "Command Center Operator"
    ) -> Optional[Incident]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Incident).filter(Incident.id == incident_id)
            )
            incident = result.scalar_one_or_none()
            if not incident:
                return None

            incident.status = new_status
            if notes:
                existing_notes = incident.notes or ""
                timestamp_tag = f"[{utc_now().strftime('%H:%M:%S UTC')}]"
                incident.notes = f"{existing_notes} | {timestamp_tag} {notes}".strip(" |")

            now = utc_now()
            if new_status == IncidentStatus.ACKNOWLEDGED.value:
                incident.acknowledged_by = operator
                incident.acknowledged_at = now
            elif new_status == IncidentStatus.RESOLVED.value:
                incident.resolved_at = now
                if not incident.acknowledged_by:
                    incident.acknowledged_by = operator

            try:
                await db.commit()
                await db.refresh(incident)
                logger.info(
                    f"Updated incident [{incident_id}] status={new_status} by={operator}"
                )
                return incident
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update incident [{incident_id}]: {e}")
                return None
