# syntax=docker/dockerfile:1.7
#
# FastAPI api 컨테이너.
#
# 구조:
#   context: 루트. apps/api/ 하위만 사용.
#   uv로 의존성 설치·실행. slim 베이스 + frozen sync로 재현성 확보.
# ─────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base
WORKDIR /app

# uv 설치 (Astral 공식 이미지 COPY 방식 — wget/curl·스크립트 불필요)
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /uvx /usr/local/bin/

# 프로젝트 메타데이터 먼저 복사 — 의존성 변경 없으면 이후 단계 캐시
COPY apps/api/pyproject.toml apps/api/.python-version ./apps/api/
WORKDIR /app/apps/api

# --frozen은 uv.lock 존재 시만 권장. 현재는 lock 없음 → 그대로 resolve.
RUN uv sync --no-dev

# ─── dev target (로컬 docker compose up) ────────────────
FROM base AS dev
ENV PYTHONUNBUFFERED=1
# 소스는 compose volume으로 bind-mount되어 덮어씀. 여기서는 기동 명령만 설정.
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ─── runner (production) ────────────────────────────────
FROM base AS runner
COPY apps/api/app ./app
COPY apps/api/alembic* ./
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
