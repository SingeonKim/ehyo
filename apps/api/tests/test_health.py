"""/api/v1/health 엔드포인트 스모크 테스트."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_ok() -> None:
    """헬스 체크가 200 + status=ok 응답을 반환한다."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_openapi_spec_available() -> None:
    """OpenAPI 스펙이 /api/v1/openapi.json에서 서빙된다 — 프론트 타입 동기화 전제."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/openapi.json")

    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"] == "My Music App API"
    assert "/api/v1/health" in spec["paths"]
