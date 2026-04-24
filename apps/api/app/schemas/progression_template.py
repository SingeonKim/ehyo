"""ProgressionTemplate Pydantic 스키마 — API 응답 직렬화 전담.

ConfigDict(from_attributes=True)로 ORM 인스턴스를 바로 dump 가능.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChordProgressionItem(BaseModel):
    """코드 진행의 한 마디. 로마 숫자 표기 ('I7', 'IV7', 'V7', 'ii', 'iv' 등)."""

    bar: int = Field(..., ge=1, description="1-indexed 마디 번호")
    chord: str = Field(..., description="로마 숫자 코드 표기, 예: I7, V7, ii")


class ProgressionTemplateRead(BaseModel):
    """API 응답 모델. ORM 인스턴스를 직접 변환 가능."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    category: str
    bars: int
    time_signature: str
    default_bpm: int
    recommended_scales: list[str]
    progression: list[ChordProgressionItem]
    created_at: datetime
