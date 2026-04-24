"""헬스 체크 라우터.

운영 환경에서는 단순 alive 체크 외에도 DB 연결 확인 같은 readiness 분리가
필요하지만 Phase 5 초기에는 최소 alive 응답만.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")
