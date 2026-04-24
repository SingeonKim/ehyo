"""환경변수 기반 설정.

pydantic-settings로 .env 파일과 환경변수를 자동 로드. 모든 시크릿은
절대 하드코딩하지 않고 이 Settings를 통해서만 접근한다.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """앱 전역 설정. 인스턴스는 get_settings() 캐시를 통해 공유."""

    # Phase 5 초기에는 DB·S3가 아직 없으므로 기본값을 두어 로컬 기동 허용.
    # Phase 5 Day 3에 DB 사용 시작할 때 Settings.database_url을 필수화.
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/music_app"

    # S3 / MinIO — Phase 6에서 실제 사용
    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "backing-tracks"

    # CORS — 프론트 localhost:3000이 기본
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """lru_cache로 싱글턴 생성. 테스트에서는 cache_clear()로 리셋 가능."""
    return Settings()
