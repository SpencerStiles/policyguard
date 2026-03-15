"""Smoke tests: health check and domain data endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("status") == "healthy"
    assert body.get("database") == "ok"


@pytest.mark.asyncio
async def test_domain_coverage_types(authed_client: AsyncClient):
    resp = await authed_client.get("/api/analysis/domain/coverage-types")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "id" in first
    assert "name" in first


@pytest.mark.asyncio
async def test_domain_industry_profiles(authed_client: AsyncClient):
    resp = await authed_client.get("/api/analysis/domain/industry-profiles")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_domain_gap_patterns(authed_client: AsyncClient):
    resp = await authed_client.get("/api/analysis/domain/gap-patterns")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
