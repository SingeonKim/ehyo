"""ProgressionTemplate ORM 모델.

planning.md §7.2 스키마 기반. 배킹 트랙 코드 진행 카탈로그.
- slug는 API의 primary lookup key (`/api/v1/progression-templates/{slug}`).
- progression은 JSONB — [{"bar": int, "chord": str}, ...] 로마 숫자 표기.
- recommended_scales는 TEXT[] — 프론트 ScaleKey enum과 1:1.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProgressionTemplate(Base):
    __tablename__ = "progression_templates"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    bars: Mapped[int] = mapped_column(Integer, nullable=False)
    time_signature: Mapped[str] = mapped_column(Text, nullable=False)
    default_bpm: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_scales: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
    )
    progression: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ProgressionTemplate slug={self.slug!r} category={self.category!r}>"
