"""Seed 데이터 — 코드 진행 카탈로그 (planning.md §6.3.2 기반).

실행:
    docker compose exec api uv run python -m app.scripts.seed
    # 또는 로컬 DATABASE_URL 설정 후:
    uv run python -m app.scripts.seed

이미 존재하는 slug는 건너뛴다 (idempotent). Alembic 마이그레이션에 seed를
포함하지 않는 이유: 스키마와 데이터를 분리해야 마이그레이션 기록이 깨끗함.
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_sessionmaker
from app.models.progression_template import ProgressionTemplate

# ─── 카탈로그 정의 ────────────────────────────────────────────

# 로마 숫자 표기: I·IV·V = 메이저, i·iv·v = 마이너, 숫자 뒤의 7 = 7th.
# bars와 progression 길이가 일치해야 한다 (렌더러가 1:1 매핑).
SEED_TEMPLATES: list[dict] = [
    # ── Blues (3) ─────────────────────────────────
    {
        "slug": "12-bar-blues-major",
        "name": "12-Bar Blues (Major)",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 90,
        "recommended_scales": ["major_blues", "minor_blues", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I7"},
            {"bar": 2, "chord": "I7"},
            {"bar": 3, "chord": "I7"},
            {"bar": 4, "chord": "I7"},
            {"bar": 5, "chord": "IV7"},
            {"bar": 6, "chord": "IV7"},
            {"bar": 7, "chord": "I7"},
            {"bar": 8, "chord": "I7"},
            {"bar": 9, "chord": "V7"},
            {"bar": 10, "chord": "IV7"},
            {"bar": 11, "chord": "I7"},
            {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "12-bar-blues-minor",
        "name": "12-Bar Blues (Minor)",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 80,
        "recommended_scales": ["minor_blues", "minor_pentatonic", "dorian"],
        "progression": [
            {"bar": 1, "chord": "i7"},
            {"bar": 2, "chord": "i7"},
            {"bar": 3, "chord": "i7"},
            {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"},
            {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"},
            {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "V7"},
            {"bar": 10, "chord": "iv7"},
            {"bar": 11, "chord": "i7"},
            {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "12-bar-blues-quick-change",
        "name": "12-Bar Blues (Quick Change)",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 95,
        "recommended_scales": ["major_blues", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I7"},
            {"bar": 2, "chord": "IV7"},  # quick change
            {"bar": 3, "chord": "I7"},
            {"bar": 4, "chord": "I7"},
            {"bar": 5, "chord": "IV7"},
            {"bar": 6, "chord": "IV7"},
            {"bar": 7, "chord": "I7"},
            {"bar": 8, "chord": "I7"},
            {"bar": 9, "chord": "V7"},
            {"bar": 10, "chord": "IV7"},
            {"bar": 11, "chord": "I7"},
            {"bar": 12, "chord": "V7"},
        ],
    },
    # ── Pop / Standard (2) ─────────────────────────
    {
        "slug": "pop-I-V-vi-IV",
        "name": "I–V–vi–IV (Axis Progression)",
        "category": "pop",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["major", "major_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "I"},
            {"bar": 2, "chord": "V"},
            {"bar": 3, "chord": "vi"},
            {"bar": 4, "chord": "IV"},
        ],
    },
    {
        "slug": "50s-I-vi-IV-V",
        "name": "50s Doo-wop (I–vi–IV–V)",
        "category": "pop",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 100,
        "recommended_scales": ["major", "major_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "I"},
            {"bar": 2, "chord": "vi"},
            {"bar": 3, "chord": "IV"},
            {"bar": 4, "chord": "V"},
        ],
    },
    # ── Jazz (1) ──────────────────────────────────
    {
        "slug": "jazz-ii-V-I",
        "name": "Jazz ii–V–I",
        "category": "jazz",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 140,
        "recommended_scales": ["major", "dorian", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "iim7"},
            {"bar": 2, "chord": "V7"},
            {"bar": 3, "chord": "Imaj7"},
            {"bar": 4, "chord": "Imaj7"},
        ],
    },
    # ── Minor (1) ─────────────────────────────────
    {
        "slug": "minor-i-VI-III-VII",
        "name": "Minor i–VI–III–VII",
        "category": "minor",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 100,
        "recommended_scales": ["natural_minor", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i"},
            {"bar": 2, "chord": "VI"},
            {"bar": 3, "chord": "III"},
            {"bar": 4, "chord": "VII"},
        ],
    },
    # ── Modal vamps (3) ───────────────────────────
    {
        "slug": "dorian-vamp",
        "name": "Dorian Vamp (i–IV)",
        "category": "modal",
        "bars": 2,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["dorian", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i7"},
            {"bar": 2, "chord": "IV7"},
        ],
    },
    {
        "slug": "lydian-vamp",
        "name": "Lydian Vamp (I–II)",
        "category": "modal",
        "bars": 2,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["lydian", "major_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "Imaj7"},
            {"bar": 2, "chord": "II"},
        ],
    },
    {
        "slug": "mixolydian-vamp",
        "name": "Mixolydian Vamp (I–VII)",
        "category": "modal",
        "bars": 2,
        "time_signature": "4/4",
        "default_bpm": 115,
        "recommended_scales": ["mixolydian", "major_blues"],
        "progression": [
            {"bar": 1, "chord": "I7"},
            {"bar": 2, "chord": "VII"},
        ],
    },
    # ── Blues 추가 (5) ─────────────────────────────
    {
        "slug": "slow-minor-blues",
        "name": "Slow Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 70,
        "recommended_scales": ["minor_blues", "dorian", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "i7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "iv7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "hard-bop-minor-blues",
        "name": "Hard Bop Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 130,
        "recommended_scales": ["minor_blues", "dorian"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "i7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "iim7b5"}, {"bar": 10, "chord": "V7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "shuffle-minor-blues",
        "name": "Shuffle Minor Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 100,
        "recommended_scales": ["minor_blues", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i7"}, {"bar": 2, "chord": "iv7"},
            {"bar": 3, "chord": "i7"}, {"bar": 4, "chord": "i7"},
            {"bar": 5, "chord": "iv7"}, {"bar": 6, "chord": "iv7"},
            {"bar": 7, "chord": "i7"}, {"bar": 8, "chord": "i7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "iv7"},
            {"bar": 11, "chord": "i7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "jazz-major-blues",
        "name": "Jazz Major Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 120,
        "recommended_scales": ["mixolydian", "major_blues", "dorian"],
        "progression": [
            {"bar": 1, "chord": "Imaj7"}, {"bar": 2, "chord": "I7"},
            {"bar": 3, "chord": "IVmaj7"}, {"bar": 4, "chord": "ivm7"},
            {"bar": 5, "chord": "IVmaj7"}, {"bar": 6, "chord": "bVII7"},
            {"bar": 7, "chord": "iiim7"}, {"bar": 8, "chord": "VI7"},
            {"bar": 9, "chord": "iim7"}, {"bar": 10, "chord": "V7"},
            {"bar": 11, "chord": "Imaj7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    {
        "slug": "jump-blues",
        "name": "Jump Blues",
        "category": "blues",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 140,
        "recommended_scales": ["major_blues", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I7"}, {"bar": 2, "chord": "IV7"},
            {"bar": 3, "chord": "I7"}, {"bar": 4, "chord": "I7"},
            {"bar": 5, "chord": "IV7"}, {"bar": 6, "chord": "IV7"},
            {"bar": 7, "chord": "I7"}, {"bar": 8, "chord": "I7"},
            {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "IV7"},
            {"bar": 11, "chord": "I7"}, {"bar": 12, "chord": "V7"},
        ],
    },
    # ── Funk (1, NEW 카테고리 활성화) ────────────────
    {
        "slug": "funk-i7-vamp",
        "name": "Funk I7 Vamp",
        "category": "funk",
        "bars": 1,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["mixolydian", "minor_pentatonic", "major_blues"],
        "progression": [
            {"bar": 1, "chord": "I7"},
        ],
    },
    # ── Bossa (1, NEW 카테고리 활성화) ───────────────
    {
        "slug": "bossa-i-iv-ii-v",
        "name": "Bossa I–IV–ii–V",
        "category": "bossa",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 130,
        "recommended_scales": ["major", "lydian"],
        "progression": [
            {"bar": 1, "chord": "Imaj7"}, {"bar": 2, "chord": "IVmaj7"},
            {"bar": 3, "chord": "iim7"}, {"bar": 4, "chord": "V7"},
        ],
    },
]


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
