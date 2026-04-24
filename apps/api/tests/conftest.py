"""pytest fixtures — testcontainers Postgres + FastAPI app + seeded DB.

전략:
- 세션 전체에서 공유되는 Postgres 컨테이너 1개 (testcontainers).
- 스키마는 Base.metadata.create_all로 1회만 생성.
- 각 테스트마다 트랜잭션을 열고 rollback해 상태 격리.
- API 테스트에서 override한 get_session은 fresh session을 반환하며
  실제 DB 상태(시드)와 상호작용.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

from app.config import get_settings
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models.progression_template import ProgressionTemplate
from app.scripts.seed import seed


@pytest.fixture(scope="session")
def event_loop() -> Iterator[asyncio.AbstractEventLoop]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def postgres_url() -> Iterator[str]:
    """세션 전체에서 한 번만 컨테이너를 띄운다."""
    with PostgresContainer("postgres:16-alpine", driver="asyncpg") as container:
        yield container.get_connection_url()


@pytest_asyncio.fixture(scope="session")
async def test_engine(postgres_url: str) -> AsyncIterator[AsyncEngine]:
    # NullPool: asyncpg의 "cannot perform operation: another operation is in progress"
    # 회피. pytest-asyncio가 여러 이벤트 루프를 만들 때 풀된 연결이 다른 루프로
    # 새는 문제를 막는다. 테스트 속도보다 안정성 우선.
    engine = create_async_engine(postgres_url, echo=False, future=True, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_clean(test_engine: AsyncEngine) -> AsyncIterator[None]:
    """매 테스트 전에 테이블 비우고, 시드 데이터 삽입."""
    sessionmaker = async_sessionmaker(test_engine, expire_on_commit=False)
    async with sessionmaker() as session:
        await session.execute(delete(ProgressionTemplate))
        await session.commit()
    async with sessionmaker() as session:
        await seed(session)
    yield
    async with sessionmaker() as session:
        await session.execute(delete(ProgressionTemplate))
        await session.commit()


@pytest_asyncio.fixture
async def api_client(
    test_engine: AsyncEngine, db_clean: None
) -> AsyncIterator[AsyncClient]:
    """FastAPI의 get_session을 test_engine 기반 세션으로 교체."""
    sessionmaker = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    get_settings.cache_clear()
