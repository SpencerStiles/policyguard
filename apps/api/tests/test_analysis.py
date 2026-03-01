"""Tests for analysis run lifecycle and findings endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_analysis(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await client.post("/api/analysis", json={
        "client_id": client_id,
        "title": "Q1 2025 Coverage Review",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["client_id"] == client_id
    assert data["status"] in ("pending", "running", "completed", "failed")
    assert "id" in data


@pytest.mark.asyncio
async def test_get_analysis(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]

    # Create
    create_resp = await client.post("/api/analysis", json={
        "client_id": client_id,
        "title": "Test Analysis",
    })
    assert create_resp.status_code == 200
    analysis_id = create_resp.json()["id"]

    # Fetch
    get_resp = await client.get(f"/api/analysis/{analysis_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == analysis_id
    assert "gaps" in data
    assert "conflicts" in data
    assert "recommendations" in data


@pytest.mark.asyncio
async def test_list_analyses_for_client(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]

    # Create two analyses
    for title in ["Analysis 1", "Analysis 2"]:
        await client.post("/api/analysis", json={"client_id": client_id, "title": title})

    resp = await client.get(f"/api/analysis/client/{client_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_delete_analysis(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    create_resp = await client.post("/api/analysis", json={
        "client_id": client_id,
        "title": "To Delete",
    })
    analysis_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/analysis/{analysis_id}")
    assert del_resp.status_code in (200, 204)

    get_resp = await client.get(f"/api/analysis/{analysis_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_analysis_client_not_found(client: AsyncClient):
    resp = await client.post("/api/analysis", json={
        "client_id": "00000000-0000-0000-0000-000000000000",
        "title": "Ghost Analysis",
    })
    assert resp.status_code == 404
