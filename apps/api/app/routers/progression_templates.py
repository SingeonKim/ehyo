"""/api/v1/progression-templates 엔드포인트.

- GET /                  카테고리 옵션 필터로 목록 반환
- GET /{slug}            단건, 없으면 404
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.progression_template import ProgressionTemplate
from app.schemas.progression_template import ProgressionTemplateRead

router = APIRouter()


@router.get("", response_model=list[ProgressionTemplateRead])
async def list_progression_templates(
    session: Annotated[AsyncSession, Depends(get_session)],
    category: Annotated[
        str | None,
        Query(description="카테고리 필터 (blues, pop, jazz, minor, modal)"),
    ] = None,
) -> list[ProgressionTemplate]:
    """카탈로그 목록. category 주면 해당 그룹만."""
    stmt = select(ProgressionTemplate).order_by(ProgressionTemplate.created_at)
    if category is not None:
        stmt = stmt.where(ProgressionTemplate.category == category)
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{slug}", response_model=ProgressionTemplateRead)
async def get_progression_template(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProgressionTemplate:
    """slug로 단건 조회. 없으면 404."""
    stmt = select(ProgressionTemplate).where(ProgressionTemplate.slug == slug)
    result = await session.execute(stmt)
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Progression template not found: {slug}",
        )
    return template
