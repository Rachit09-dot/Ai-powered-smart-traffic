"""Tests for incident creation, deduplication, lifecycle transitions, and filtering."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.connection import init_db
from app.services.alert_service import AlertService
from app.services.accident_detector import AccidentEvent


@pytest.mark.asyncio
async def test_incident_lifecycle():
    await init_db()
    event = AccidentEvent(
        event_type="POTENTIAL_ACCIDENT",
        severity="HIGH",
        confidence=0.88,
        track_ids=[3, 4],
        bbox=[200, 300, 450, 450],
        description="Near collision at intersection sector 4",
        timestamp=100.0
    )
    inc = await AlertService.create_incident_from_event(
        camera_id="cam-01",
        session_id="test-session",
        event=event
    )
    assert inc is not None
    assert inc.id.startswith("inc-")
    assert inc.status == "PENDING"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Query incidents
        list_res = await ac.get("/api/incidents?camera_id=cam-01")
        assert list_res.status_code == 200
        inc_list = list_res.json()
        assert any(i["id"] == inc.id for i in inc_list)

        # Acknowledge
        ack_res = await ac.patch(f"/api/incidents/{inc.id}", json={
            "status": "ACKNOWLEDGED",
            "notes": "Verified by traffic operator Alpha",
            "acknowledged_by": "Operator Alpha"
        })
        assert ack_res.status_code == 200
        assert ack_res.json()["status"] == "ACKNOWLEDGED"

        # Resolve
        res_res = await ac.patch(f"/api/incidents/{inc.id}", json={
            "status": "RESOLVED",
            "notes": "Corridor cleared by roadside assistance"
        })
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "RESOLVED"
        assert res_res.json()["resolved_at"] is not None


@pytest.mark.asyncio
async def test_incident_invalid_status_returns_400():
    await init_db()
    # Need an incident to try to update
    event = AccidentEvent(
        event_type="STOPPED_VEHICLE",
        severity="MEDIUM",
        confidence=0.7,
        track_ids=[5],
        bbox=[100, 100, 200, 200],
        description="Stopped vehicle test",
        timestamp=200.0
    )
    inc = await AlertService.create_incident_from_event(
        camera_id="cam-02",
        session_id="test-session-2",
        event=event
    )
    assert inc is not None

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(f"/api/incidents/{inc.id}", json={"status": "MADE_UP_STATUS"})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_incident_not_found_returns_404():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch("/api/incidents/inc-doesnotexist", json={"status": "ACKNOWLEDGED"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_incident_deduplication():
    """
    Creating two identical events within the deduplication window should return
    the existing incident, not create a second one.
    """
    import time
    await init_db()
    event = AccidentEvent(
        event_type="TRAFFIC_ANOMALY",
        severity="LOW",
        confidence=0.6,
        track_ids=[99],
        bbox=[10, 10, 50, 50],
        description="Duplicate test anomaly",
        timestamp=time.time()
    )
    inc1 = await AlertService.create_incident_from_event(
        camera_id="cam-03",
        session_id="dedup-session",
        event=event
    )
    inc2 = await AlertService.create_incident_from_event(
        camera_id="cam-03",
        session_id="dedup-session",
        event=event
    )
    assert inc1 is not None
    assert inc2 is not None
    # Both calls should return the same incident ID (deduplication)
    assert inc1.id == inc2.id


@pytest.mark.asyncio
async def test_incident_filter_by_status():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Filter PENDING
        res = await ac.get("/api/incidents?status=PENDING")
        assert res.status_code == 200
        data = res.json()
        assert all(i["status"] == "PENDING" for i in data)

        # Filter with invalid status
        res_bad = await ac.get("/api/incidents?status=GARBAGE")
        assert res_bad.status_code == 400


@pytest.mark.asyncio
async def test_incident_count_endpoint():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/incidents/count")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert isinstance(data["total"], int)
