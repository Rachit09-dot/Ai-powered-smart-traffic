"""Tests for health endpoint and camera CRUD operations."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.connection import init_db


@pytest.mark.asyncio
async def test_health_endpoint():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "opencv_version" in data
    assert "cuda_available" in data
    assert "database_status" in data
    assert "uptime_seconds" in data


@pytest.mark.asyncio
async def test_health_reports_db_status():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    # DB must be reachable in test environment
    assert data["database_status"] == "healthy"


@pytest.mark.asyncio
async def test_camera_list_returns_seeded_cameras():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        list_res = await ac.get("/api/cameras")
    assert list_res.status_code == 200
    cams = list_res.json()
    assert isinstance(cams, list)
    assert len(cams) >= 1  # init_db seeds 3 demo cameras


@pytest.mark.asyncio
async def test_camera_crud_flow():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create camera
        new_cam_payload = {
            "name": "Highway Overpass Test",
            "source_type": "DEMO_SYNTHETIC",
            "source_path": "demo_synthetic",
            "location": "North Sector 5",
            "resolution": "1280x720",
            "fps": 30.0
        }
        create_res = await ac.post("/api/cameras", json=new_cam_payload)
        assert create_res.status_code == 201
        cam_data = create_res.json()
        cam_id = cam_data["id"]
        assert cam_data["name"] == "Highway Overpass Test"
        assert cam_data["status"] == "ONLINE"

        # 2. Verify it appears in list
        list_res = await ac.get("/api/cameras")
        assert list_res.status_code == 200
        ids = [c["id"] for c in list_res.json()]
        assert cam_id in ids

        # 3. Delete camera
        del_res = await ac.delete(f"/api/cameras/{cam_id}")
        assert del_res.status_code == 204

        # 4. Confirm deleted
        list_res2 = await ac.get("/api/cameras")
        ids_after = [c["id"] for c in list_res2.json()]
        assert cam_id not in ids_after


@pytest.mark.asyncio
async def test_delete_nonexistent_camera_returns_404():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.delete("/api/cameras/cam-does-not-exist-xyz")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_create_duplicate_camera_id_returns_400():
    await init_db()
    payload = {
        "id": "cam-dupe-test",
        "name": "Dup Cam",
        "source_type": "DEMO_SYNTHETIC",
        "source_path": "demo_synthetic",
        "location": "Test"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r1 = await ac.post("/api/cameras", json=payload)
        assert r1.status_code == 201
        r2 = await ac.post("/api/cameras", json=payload)
        assert r2.status_code == 400
        # cleanup
        await ac.delete("/api/cameras/cam-dupe-test")
