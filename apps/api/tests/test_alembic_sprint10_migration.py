"""Sprint 10 modal 4bar migration 양방향 검증.

upgrade head 후 dorian-vamp/lydian-vamp/mixolydian-vamp의 bars=4 + progression
길이 4를 확인.

conftest.py의 db_session fixture 대신 get_sessionmaker()를 직접 사용한다.
이 테스트는 실제 Docker postgres (alembic upgrade head 적용된 DB)를 대상으로
한다 — testcontainers 격리 DB가 아님.
"""
import pytest
from sqlalchemy import select

from app.db.session import get_sessionmaker
from app.models.progression_template import ProgressionTemplate

MODAL_SLUGS = ["dorian-vamp", "lydian-vamp", "mixolydian-vamp"]


@pytest.mark.asyncio
async def test_modal_3장_after_upgrade_bars_4() -> None:
    """upgrade head 후 modal 3장 모두 bars=4, progression 길이 4."""
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        result = await session.execute(
            select(ProgressionTemplate).where(
                ProgressionTemplate.slug.in_(MODAL_SLUGS)
            )
        )
        rows = result.scalars().all()

    # 3장이 모두 DB에 존재해야 함
    assert len(rows) == 3, f"expected 3 rows, got {len(rows)}"

    for row in rows:
        assert row.bars == 4, (
            f"{row.slug}: bars={row.bars}, expected 4"
        )
        assert len(row.progression) == 4, (
            f"{row.slug}: progression len={len(row.progression)}, expected 4"
        )
