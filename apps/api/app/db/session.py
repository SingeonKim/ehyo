"""Async SQLAlchemy engine / session factory.

- engine: 모듈 스코프 싱글턴, DATABASE_URL 기반.
- get_session: FastAPI Depends 용 async generator.
- 테스트에서는 engine을 override 하거나 testcontainers로 별도 엔진 사용.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """앱 전역 async engine. 최초 호출 시 lazy 생성."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            get_engine(),
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI Depends용. 요청 수명 동안 세션 유지, 종료 시 자동 close."""
    async with get_sessionmaker()() as session:
        yield session
