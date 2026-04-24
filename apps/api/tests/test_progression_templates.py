"""Integration tests for /api/v1/progression-templates."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_all_returns_seed_data(api_client: AsyncClient) -> None:
    """시드 10개가 전부 반환된다."""
    response = await api_client.get("/api/v1/progression-templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10
    slugs = {t["slug"] for t in data}
    assert "12-bar-blues-major" in slugs
    assert "jazz-ii-V-I" in slugs


@pytest.mark.asyncio
async def test_filter_by_category(api_client: AsyncClient) -> None:
    """category=blues 필터 시 3개만."""
    response = await api_client.get("/api/v1/progression-templates", params={"category": "blues"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    for tpl in data:
        assert tpl["category"] == "blues"


@pytest.mark.asyncio
async def test_filter_empty_category_returns_nothing(api_client: AsyncClient) -> None:
    response = await api_client.get(
        "/api/v1/progression-templates", params={"category": "nonexistent"}
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_by_slug(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/progression-templates/12-bar-blues-major")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "12-bar-blues-major"
    assert data["bars"] == 12
    assert data["time_signature"] == "4/4"
    assert data["default_bpm"] == 90
    assert len(data["progression"]) == 12
    assert data["progression"][0] == {"bar": 1, "chord": "I7"}


@pytest.mark.asyncio
async def test_get_by_slug_not_found(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/v1/progression-templates/does-not-exist")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_openapi_contains_endpoints(api_client: AsyncClient) -> None:
    """프론트 openapi-typescript 생성용 — 엔드포인트가 스펙에 포함되어야."""
    response = await api_client.get("/api/v1/openapi.json")
    paths = response.json()["paths"]
    assert "/api/v1/progression-templates" in paths
    assert "/api/v1/progression-templates/{slug}" in paths
