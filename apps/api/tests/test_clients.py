"""Tests for the /api/clients endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_isolation_list_clients(
    authed_client: AsyncClient,
    second_authed_client: AsyncClient,
    sample_client: dict,
):
    """User B should not see User A's clients."""
    # User A has one client (sample_client)
    resp_a = await authed_client.get("/api/clients")
    assert resp_a.status_code == 200
    assert len(resp_a.json()) == 1

    # User B should see zero clients
    resp_b = await second_authed_client.get("/api/clients")
    assert resp_b.status_code == 200
    assert resp_b.json() == []


@pytest.mark.asyncio
async def test_user_isolation_get_client(
    authed_client: AsyncClient,
    second_authed_client: AsyncClient,
    sample_client: dict,
):
    """User B should get 404 when accessing User A's client by ID."""
    client_id = sample_client["id"]
    resp = await second_authed_client.get(f"/api/clients/{client_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_isolation_delete_client(
    authed_client: AsyncClient,
    second_authed_client: AsyncClient,
    sample_client: dict,
):
    """User B cannot delete User A's client."""
    client_id = sample_client["id"]
    resp = await second_authed_client.delete(f"/api/clients/{client_id}")
    assert resp.status_code == 404

    # Client still exists for User A
    resp_a = await authed_client.get(f"/api/clients/{client_id}")
    assert resp_a.status_code == 200


@pytest.mark.asyncio
async def test_list_clients_empty(authed_client: AsyncClient):
    resp = await authed_client.get("/api/clients")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_client(authed_client: AsyncClient):
    payload = {
        "name": "Test Insurance Co",
        "industry": "Professional Services",
        "description": "A test client for coverage analysis",
        "contact_email": "test@example.com",
    }
    resp = await authed_client.post("/api/clients", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Insurance Co"
    assert data["industry"] == "Professional Services"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_client_name_required(authed_client: AsyncClient):
    resp = await authed_client.post("/api/clients", json={"industry": "Tech"})
    assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_get_client(authed_client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await authed_client.get(f"/api/clients/{client_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == client_id
    assert resp.json()["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_get_client_not_found(authed_client: AsyncClient):
    resp = await authed_client.get("/api/clients/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_client(authed_client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await authed_client.patch(f"/api/clients/{client_id}", json={"name": "Acme Corp Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Acme Corp Updated"


@pytest.mark.asyncio
async def test_delete_client(authed_client: AsyncClient, sample_client: dict):
    client_id = sample_client["id"]
    resp = await authed_client.delete(f"/api/clients/{client_id}")
    assert resp.status_code in (200, 204)

    # Should be gone
    resp = await authed_client.get(f"/api/clients/{client_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_clients_returns_multiple(authed_client: AsyncClient):
    names = ["Client A", "Client B", "Client C"]
    for name in names:
        await authed_client.post("/api/clients", json={"name": name, "industry": "Tech"})

    resp = await authed_client.get("/api/clients")
    assert resp.status_code == 200
    returned_names = [c["name"] for c in resp.json()]
    for name in names:
        assert name in returned_names
