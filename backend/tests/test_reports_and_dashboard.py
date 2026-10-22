"""Tests for reports export and dashboard summary endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.connection import init_db


@pytest.mark.asyncio
async def test_dashboard_summary_structure():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    required_fields = [
        "total_vehicles_detected", "active_camera_feeds", "total_cameras",
        "current_congestion_level", "total_incidents", "pending_incidents",
        "avg_traffic_flow_rate", "system_status", "system_uptime_seconds",
        "vehicle_breakdown", "recent_incidents"
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    assert data["current_congestion_level"] in ("LOW", "MEDIUM", "HIGH")
    assert isinstance(data["recent_incidents"], list)
    assert isinstance(data["vehicle_breakdown"], dict)
    assert data["system_status"] == "OPERATIONAL"


@pytest.mark.asyncio
async def test_traffic_history_returns_list():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/traffic/history?limit=10")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_reports_export_incidents_csv():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/reports/export?report_type=incidents")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    content = res.text
    # Must have header row
    assert "Incident ID" in content


@pytest.mark.asyncio
async def test_reports_export_traffic_csv():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/reports/export?report_type=traffic")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    content = res.text
    assert "Timestamp" in content


@pytest.mark.asyncio
async def test_reports_export_invalid_type_returns_422():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/reports/export?report_type=malicious")
    assert res.status_code == 422  # FastAPI pattern validator


@pytest.mark.asyncio
async def test_reports_export_with_invalid_date_returns_400():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/reports/export?report_type=incidents&start_date=not-a-date")
    assert res.status_code == 400
    assert "date" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reports_export_camera_filter():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/reports/export?report_type=incidents&camera_id=cam-01")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
