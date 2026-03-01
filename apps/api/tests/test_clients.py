"""Tests for the /api/clients endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_clients_empty(client: AsyncClient):
    resp = await client.get("/api/clients")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_client(client: AsyncClient):
    payload = {
        "name": "Test Insurance Co",
        "industry": "Professional Services",
        "description": "A test client for coverage analysis",
        "contact_email": "test@example.com",
    }
    resp = await client.post("/api/clients", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Insurance Co"
    assert data["industry"] == "Professional Services"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_client_name_required(client: AsyncClient):
    resp = await client.post("/api/clients", json={"industry": "Tech"})
    assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_get_client(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await client.get(f"/api/clients/{client_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == client_id
    assert resp.json()["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_get_client_not_found(client: AsyncClient):
    resp = await client.get("/api/clients/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_client(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await client.patch(f"/api/clients/{client_id}", json={"name": "Acme Corp Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Acme Corp Updated"


@pytest.mark.asyncio
async def test_delete_client(client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await client.delete(f"/api/clients/{client_id}")
    assert resp.status_code in (200, 204)

    # Should be gone
    resp = await client.get(f"/api/clients/{client_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_clients_returns_multiple(client: AsyncClient):
    names = ["Client A", "Client B", "Client C"]
    for name in names:
        await client.post("/api/clients", json={"name": name, "industry": "Tech"})

    resp = await client.get("/api/clients")
    assert resp.status_code == 200
    returned_names = [c["name"] for c in resp.json()]
    for name in names:
        assert name in returned_names
