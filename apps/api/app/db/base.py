"""SQLAlchemy 2.x DeclarativeBase.

모든 모델은 이 Base를 상속. Alembic autogenerate가 metadata를 참조.
"""
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """프로젝트 전역 ORM 베이스."""
