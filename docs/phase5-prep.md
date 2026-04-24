# Phase 5 진입 준비 — 백엔드 도입 & 모노레포화 체크리스트

Phase 4 말미의 "인프라 스파이크" 결과물. Phase 5 착수 시 시작 지점으로 사용한다.

> Phase 5 범위 (요약): **배킹 트랙 기본 — Tone.js Transport + 코드 진행 카탈로그 + 현재 코드 → 지판 하이라이트**. 이를 위해 FastAPI + Postgres + MinIO 인프라를 도입한다. 상세 스펙은 [`planning.md §6.3`](./planning.md) 참조.

---

## 1. 모노레포 전환

v1은 단일 Next.js 앱. Phase 5에서 API가 생기면 pnpm workspaces로 분리한다.

### 새 디렉터리 레이아웃

```
my-music-app/
├─ apps/
│  ├─ web/                 # 현재 루트의 Next.js 앱이 통째로 이동
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ lib/
│  │  ├─ tests/
│  │  ├─ public/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ next.config.ts
│  │  └─ … (현재 루트 파일들)
│  └─ api/                 # 신규 FastAPI
│     ├─ app/
│     │  ├─ main.py
│     │  ├─ routers/
│     │  ├─ models/        # SQLAlchemy
│     │  ├─ schemas/       # Pydantic
│     │  ├─ services/
│     │  └─ db/
│     ├─ alembic/
│     ├─ tests/
│     ├─ pyproject.toml
│     └─ Dockerfile
├─ packages/
│  └─ theory-core/         # (선택) web·api가 공유할 음악 이론 상수가 있다면
├─ docker/
│  ├─ web.Dockerfile       # 기존 유지, context path만 apps/web으로
│  └─ api.Dockerfile       # 신규
├─ docker-compose.yml      # web + api + postgres + minio
├─ docker-compose.test.yml
├─ pnpm-workspace.yaml     # 신규
├─ pyproject.toml          # (선택) 루트 레벨 uv 통합
└─ README.md
```

### 전환 순서

1. `apps/web/` 디렉터리 생성, 현재 루트의 web 파일 통째로 이동
   - `app/`, `components/`, `lib/`, `tests/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `pnpm-lock.yaml`, `vitest.config.ts`, `playwright.config.ts`
2. 루트에 `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```
3. 루트 `package.json`은 얇게 (scripts만):
   ```json
   {
     "name": "my-music-app",
     "private": true,
     "scripts": {
       "dev": "pnpm --filter web dev",
       "build": "pnpm --filter web build",
       "test": "pnpm --filter web test",
       "api:dev": "cd apps/api && uvicorn app.main:app --reload"
     }
   }
   ```
4. `docker/web.Dockerfile`의 `WORKDIR`/`COPY` 경로를 `apps/web/`로 업데이트
5. `docker-compose.yml`의 web 서비스 `build.context: .` 유지하되 Dockerfile 경로만 조정
6. CI (`.github/workflows/ci.yml`)의 경로 필터 조정

---

## 2. FastAPI 앱 스켈레톤

### `apps/api/pyproject.toml`
```toml
[project]
name = "music-app-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi[standard]>=0.115",
  "sqlalchemy[asyncio]>=2.0",
  "alembic>=1.13",
  "asyncpg>=0.29",
  "pydantic-settings>=2.5",
  "boto3>=1.35",  # MinIO S3 호환 클라이언트
  "python-dotenv>=1.0",
]

[dependency-groups]
dev = [
  "pytest>=8.3",
  "pytest-asyncio>=0.24",
  "httpx>=0.27",
  "testcontainers[postgres]>=4.8",
  "ruff>=0.6",
  "mypy>=1.11",
]
```

### `apps/api/app/main.py` (최소 스켈레톤)
```python
from fastapi import FastAPI

app = FastAPI(title="My Music App API", version="0.1.0")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

### 주요 엔드포인트 (Phase 5에서 구현)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/v1/progression-templates` | 카테고리 필터 |
| GET | `/api/v1/progression-templates/{slug}` | 단건 |
| GET | `/api/v1/backing-tracks` | (Phase 6) 오디오 트랙 메타 |
| GET | `/api/v1/backing-tracks/{id}/audio-url` | presigned URL |
| GET | `/api/v1/health` | 헬스 체크 |

---

## 3. 데이터베이스

### SQLAlchemy + Alembic 초기화
```bash
cd apps/api
uv run alembic init alembic
# alembic/env.py에서 target_metadata = Base.metadata 설정
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
```

### 테이블 (planning.md §7.2 참조)

```sql
CREATE TABLE progression_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  bars INT NOT NULL,
  time_signature TEXT NOT NULL,
  default_bpm INT NOT NULL,
  recommended_scales TEXT[] NOT NULL,
  progression JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Phase 6) 사전 녹음 배킹 트랙
CREATE TABLE audio_backing_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  key TEXT NOT NULL,
  mode TEXT NOT NULL,
  bpm INT NOT NULL,
  duration_sec INT NOT NULL,
  progression_id UUID REFERENCES progression_templates(id),
  s3_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progression_category ON progression_templates(category);
CREATE INDEX idx_audio_key_mode ON audio_backing_tracks(key, mode);
```

**유저/프리셋 테이블은 없다.** 로컬스토리지 유지 결정 (planning.md §1.4).

---

## 4. Docker Compose 업데이트

기존 `docker-compose.yml`에 서비스 3개 추가:

```yaml
services:
  web:
    # 기존 유지
    # build.dockerfile: docker/web.Dockerfile → 경로 변경 없음, 단 context 조정
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://app:app@postgres:5432/music_app
      S3_ENDPOINT_URL: http://minio:9000
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      S3_BUCKET: backing-tracks
    depends_on:
      - postgres
      - minio
    ports:
      - "8000:8000"
    volumes:
      - ./apps/api:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: music_app
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes: [miniodata:/data]

volumes:
  pgdata:
  miniodata:
```

---

## 5. 프론트↔백 타입 동기화

**openapi-typescript**로 FastAPI OpenAPI 스펙 → TS 타입 자동 생성.

```bash
# apps/web/package.json
{
  "scripts": {
    "types:api": "openapi-typescript http://localhost:8000/api/v1/openapi.json -o lib/api/generated.ts"
  }
}
```

API 엔드포인트 추가·수정 시 `pnpm types:api` 실행 → 프론트 타입 자동 갱신.

---

## 6. CI 확장

`.github/workflows/ci.yml`에 pytest job 추가:

```yaml
jobs:
  api-test:
    name: api-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv python install 3.12
      - run: |
          cd apps/api
          uv sync
          uv run pytest
```

E2E는 docker-compose.test.yml을 확장해 api도 기동한다.

---

## 7. 시크릿·환경변수

개발은 `.env.local` + `.env.example` 템플릿.
운영에서는 실제 시크릿 (DB 비밀번호, S3 키) 주입.

| 변수 | 역할 |
|---|---|
| `DATABASE_URL` | Postgres 연결 문자열 |
| `S3_ENDPOINT_URL` | MinIO(local) / AWS S3(prod) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | S3 자격 증명 |
| `S3_BUCKET` | 배킹 트랙 버킷 이름 |
| `CORS_ORIGINS` | 웹에서 허용할 오리진 |

`NEXT_PUBLIC_*` prefix 규율은 프론트 쪽만.

---

## 8. 첫 Sprint 체크리스트 (Phase 5 Day 1~3)

- [ ] `apps/web/` 이동 (한 PR, 단독 커밋)
- [ ] `pnpm-workspace.yaml` + 루트 `package.json` 재작성
- [ ] 로컬 `pnpm dev` 정상 동작 확인
- [ ] `apps/api/` 스켈레톤 + `/api/v1/health` 응답 확인
- [ ] `docker-compose up`으로 4개 서비스(web/api/postgres/minio) 일괄 기동
- [ ] Alembic 초기 마이그레이션 적용
- [ ] `progression_templates` seed 데이터 10개 이상
- [ ] `GET /api/v1/progression-templates` 프론트에서 fetch 성공

---

## 9. 에이전트 호출 포인트

- **nextjs-architect**: 모노레포 구조 전환 시 루트 필드 검증
- **web-audio-engineer**: Tone.js 도입 시 기존 스케줄러와 단일 AudioContext 공유 설계
- **music-theory-guardian**: 코드 진행 카탈로그 JSON 스키마 승인
- **test-strategist**: Docker 기반 통합 테스트 구조 설계
- 신규 필요: **backend-architect** — FastAPI·SQLAlchemy·Alembic 관련 전담. 현재 에이전트 팀에 없음. Phase 5 착수 시 추가 고려.
