"""Seed 데이터 — 코드 진행 카탈로그.

데이터 단일 소스:
    apps/web/lib/api/catalog.json

apps/web가 빌드 타임에 정적 import해서 사용하는 동일 파일을 그대로 읽는다.
DB 도입 시점(Phase 5+)에 이 스크립트로 upsert. 현재는 dev tool 잔존.

실행:
    docker compose exec api uv run python -m app.scripts.seed
    # 또는 로컬 DATABASE_URL 설정 후:
    uv run python -m app.scripts.seed

이미 존재하는 slug는 건너뛴다 (idempotent). Alembic 마이그레이션에 seed를
포함하지 않는 이유: 스키마와 데이터를 분리해야 마이그레이션 기록이 깨끗함.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_sessionmaker
from app.models.progression_template import ProgressionTemplate

# apps/api/app/scripts/seed.py → parents[3] = apps/
# → apps/web/lib/api/catalog.json
CATALOG_PATH = Path(__file__).resolve().parents[3] / "web" / "lib" / "api" / "catalog.json"


def _load_catalog() -> list[dict]:
    """JSON 카탈로그를 list[dict]로 로드. 파일이 없거나 비어있으면 명확히 실패."""
    with CATALOG_PATH.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"Catalog at {CATALOG_PATH} is empty or malformed")
    return data


SEED_TEMPLATES: list[dict] = _load_catalog()


async def seed(session: AsyncSession) -> tuple[int, int]:
    """카탈로그를 upsert. 반환: (inserted, skipped)."""
    inserted = 0
    skipped = 0
    for tpl in SEED_TEMPLATES:
        existing = await session.execute(
            select(ProgressionTemplate).where(ProgressionTemplate.slug == tpl["slug"])
        )
        if existing.scalar_one_or_none() is not None:
            skipped += 1
            continue
        session.add(ProgressionTemplate(**tpl))
        inserted += 1
    await session.commit()
    return inserted, skipped


async def main() -> None:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        inserted, skipped = await seed(session)
    print(f"Seed complete: inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    asyncio.run(main())
