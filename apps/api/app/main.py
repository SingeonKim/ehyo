"""FastAPI 애플리케이션 엔트리.

Phase 5 초기에는 /api/v1/health 하나만 노출한다. 엔드포인트는 라우터 단위로
app/routers/ 아래에 분리하며 main.py는 조립·미들웨어·CORS만 담당.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health


def create_app() -> FastAPI:
    """앱 팩토리. 테스트에서 재사용하기 쉽게 팩토리 패턴."""
    settings = get_settings()

    app = FastAPI(
        title="My Music App API",
        version="0.1.0",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # Phase 5는 인증 없음
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api/v1", tags=["health"])

    return app


app = create_app()
