# 에휴.. (Ehyo..)

기타 연습자를 위한 웹 기반 **메트로놈 + 지판 스케일 가이드 + 배킹 트랙**.

> 연습 자극 멘트까지

브라우저 하나에서 박자 잡고, 지판에서 스케일 보면서, 코드 진행 위에 잼 칠 수 있는 단일 도구를 목표로 합니다. 모든 오디오는 클라이언트 측에서 합성 — 서버는 코드 진행 카탈로그만 제공합니다.

[![CI](https://github.com/SingeonKim/ehyo/actions/workflows/ci.yml/badge.svg)](https://github.com/SingeonKim/ehyo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi)](https://fastapi.tiangolo.com)

![에휴.. 랜딩](docs/introduction/01_main.png)

---

## 핵심 기능

### 메트로놈

정확한 박자. Subdivision(1/4·1/8·트리플렛·1/16·Swing) · Sound · Volume · Tap Tempo를 한 화면에서.

![Metronome](docs/introduction/02_metronome.png)

### 지판 스케일 가이드 — 16종 × 12 키

같은 키에서 스케일만 바꿔도 노트 분포·강조 음이 어떻게 달라지는지 한눈에 보입니다.

음계·도수 선택, 좌·우 선택, Guitar 6/7현 + Bass 4현 및 튜닝 선택

스케일에 따른 Root / Important / Regular 3단계 마커, 커스텀 가능

### 활용 예시

**Major** — 표준 7음:

![Major](docs/introduction/03_fretboard_major.png)

**Minor Blues** (Label = Degree 모드. 노트 이름 대신 도수 `1·b3·4·b5·5·b7`로 표기 — 키 옮겨가며 패턴을 외울 때 유용):

![Minor Blues](docs/introduction/04_fretboard_minor_blues_degree.png)


### 노트 강조 색을 직접 조정

스케일별로 어떤 도수를 강조할지(orange / green / blue / off) 도수 pill을 클릭해 사이클합니다. 변경은 스케일 단위로 저장되며 Reset으로 기본값 복원. Root(1도)는 항상 red 고정.

| 기본 — Minor Blues 4·5도 orange, b5도 blue | 커스텀 — 4도와 b7도를 green으로 |
|---|---|
| ![Highlight default](docs/introduction/08_highlight_colors_default.png) | ![Highlight custom](docs/introduction/10_highlight_colors_custom.png) |
| ![Fretboard default highlight](docs/introduction/07_fretboard_minor_blues_default.png) | ![Fretboard custom highlight](docs/introduction/09_fretboard_minor_blues_custom.png) |

### Practice 통합 뷰 + 코드 오버레이

sticky 지판 + 22장 코드 진행 카탈로그(blues / jazz / hard_bop / jump / minor / modal / folk / rock 등).

Roman ↔ Absolute 표기 토글, 4-voice mute(drums/bass/guitar/aux), 키·BPM·볼륨 컨트롤

![Catalog](docs/introduction/06_practice_blues_pop_jazz.png)

### 재생 중 Chord Overlay

재생 중에는 *현재 코드의 톤*이 지판 위에 chord overlay로 그려집니다. 같은 12-bar minor blues 안에서도 마디마다 chord-root와 chord-tone이 따라가서, 손가락이 어디로 가야 할지 즉시 보입니다.

- **Red** — chord root
- **Sky blue** — chord tone (3rd · 5th · 7th)
- **Off-white** — color tone / tension (9th · 11th · 13th)

**Im7 (bar 1)** — i7 코드, root는 그대로:

| 카드 (bar 1 강조) | 지판 — Im7 톤 |
|---|---|
| ![Im7 card](docs/introduction/12_practice_im7_card.png) | ![Im7 fretboard](docs/introduction/11_practice_im7_fretboard.png) |

**V7 (bar 9)** — V7로 진입, root가 5도 위로:

| 카드 (bar 9 강조) | 지판 — V7 톤 |
|---|---|
| ![V7 card](docs/introduction/14_practice_v7_card.png) | ![V7 fretboard](docs/introduction/13_practice_v7_fretboard.png) |

배킹 트랙은 [smplr](https://github.com/danigb/smplr) 기반 SoundFont · DrumMachine · Reverb 합성 — 브라우저에서 직접 생성합니다. 카드별로 instrument · velocity · swing 정체성을 차등화해 같은 12-bar라도 jazz / shuffle / jump가 다른 질감을 가집니다.

---

## 기술 스택

| 레이어 | 스택 |
|---|---|
| 프론트엔드 | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Zustand (persist) |
| 오디오 | Web Audio API, smplr (Soundfont · DrumMachine · Reverb) |
| 백엔드 | FastAPI, SQLAlchemy 2.x (async), Alembic, Pydantic v2 |
| 인프라 | PostgreSQL, MinIO (S3 호환), Docker Compose, Railway |
| 테스트 | Vitest, Testing Library, Playwright, pytest |

런타임은 Node 20+, 패키지 매니저는 **pnpm 9**. 모노레포 워크스페이스(`apps/web`, `apps/api`)로 구성.

---

## 빠른 시작

### 프론트엔드만

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

코드 진행 카탈로그는 빌드 시점에 `lib/api/generated.ts`로 번들되어 있어, 프론트만 띄워도 모든 기능이 동작합니다.

### 백엔드 포함 (카탈로그 편집 시)

```bash
docker compose up -d           # postgres:5432, api:8000, minio:9000/9001
docker compose ps              # healthy 상태 확인

cd apps/api
uv run alembic upgrade head    # 마이그레이션 적용
uv run python -m app.scripts.seed   # 카탈로그 시드 (idempotent)

# OpenAPI → 프론트 타입 갱신
pnpm --filter @my-music-app/web types:api
```

`lib/api/generated.ts`는 자동 생성 파일 — 직접 편집하지 마세요.

---

## 검증

커밋 전 다음을 통과해야 합니다 (CI에서도 동일하게 실행).

```bash
pnpm typecheck                 # tsc --noEmit, strict + noUncheckedIndexedAccess
pnpm lint                      # ESLint (next/core-web-vitals + next/typescript)
pnpm test                      # Vitest 단위 + 컴포넌트
pnpm test:coverage             # v8 커버리지 (lib/** 타겟)
```

E2E와 백엔드 테스트:

```bash
# Playwright — Docker 권장 (WSL 시스템 chromium 의존 회피)
docker compose -f docker-compose.test.yml --profile e2e up --exit-code-from playwright

# 백엔드
cd apps/api && uv run pytest
```

README/마케팅 스크린샷 자동 캡처:

```bash
pnpm screenshots               # docs/introduction/auto/ 14장 생성 (Docker 경로)
```

---

## 디렉토리 구조

```
apps/
  web/                    Next.js 프론트엔드 (@my-music-app/web)
    app/                  App Router. (practice) 라우트 그룹이 메트로놈·지판·jam 뷰 공유
    components/
      home/               랜딩 페이지 (RandomTaunt 페이드 사이클)
      metronome/          MetronomeDock, BpmInput, BeatLED
      fretboard/          SVG 지판 + 컨트롤
      jam/                Practice 통합 뷰 (코드 진행 카탈로그 등)
    lib/
      audio/              AudioContext 싱글턴 + Chris Wilson 스케줄러
        backing/          smplr 통합 (engine, voices, presets, fx-chain, card-profiles)
      theory/             음악 이론 순수 함수 (scales, notes, chords, fretboard)
      store/              Zustand + persist (localStorage 키: my-music-app:v1)
      api/                백엔드 카탈로그 클라이언트
    scripts/
      capture-screenshots.mjs  README/마케팅용 14장 자동 캡처 (Playwright)
  api/                    FastAPI 백엔드
    app/
      models/             SQLAlchemy 모델 (progression_templates 등)
      routers/            FastAPI 라우터
      schemas/            Pydantic v2 스키마
      scripts/seed.py     카탈로그 시드
    alembic/              마이그레이션
tests/
  unit/                   Vitest 순수 함수 (커버리지 100% 목표)
  component/              Testing Library
  e2e/                    Playwright (Docker 환경)
docs/
  planning.md             상세 기획·로드맵
  introduction/           README 노출용 정적 자산 (capture script 출력의 검수본)
.claude/agents/           도메인 에이전트 7명 (CLAUDE.md 참조)
```

---

## 핵심 설계 결정

코드만 봐서는 안 보이는 것들 — 변경 전 반드시 인지.

- **단일 AudioContext 원칙**: 앱 전체에서 인스턴스 1개. `lib/audio/context.ts` 싱글턴에서만 생성. 다른 곳에서 `new AudioContext()` 금지.
- **백엔드 책임 = 카탈로그 한정**: 사용자 상태(BPM, 키, 볼륨 등)는 모두 Zustand `persist` → `localStorage`. 인증·프리셋 공유는 Phase 5+.
- **음악 이론 레이어는 순수 함수**: `lib/theory/*` 커버리지 100% 목표. 수정은 `music-theory-guardian` 에이전트 게이트 필수.
- **fretboard.root는 키의 단일 소스**: 지판 root와 배킹 트랙 키가 항상 동일. v9 마이그레이션에서 `backing.backingKey`를 흡수했습니다.
- **reactStrictMode: false**: AudioContext 싱글턴 보호를 위해 의도적으로 꺼둠.
- **절대 볼륨 통일**: 카드 프로필의 `velocityScale`/`voiceGain` override 금지. 카드 정체성은 `reverbWet` + `instrumentOverrides` + 패턴(swing/triplet8/마디 변주)으로만 표현.
- **master volume slider 라우팅**: smplr instance → `fxChain.input` → compressor → dry/wet+reverb → masterGain → ctx.destination. masterGain이 final stage라 slider가 진정한 master.

상세는 [`CLAUDE.md`](./CLAUDE.md) 및 [`docs/planning.md`](./docs/planning.md) 참조.

---

## Phase 로드맵

- [x] **Phase 0** — 셋업
- [x] **Phase 1** — 메트로놈 MVP
- [x] **Phase 2** — 지판 스케일 가이드
- [x] **Phase 3** — 스케일 확장 (16종)
- [x] **Phase 4** — `/jam` (Practice) 통합 뷰
  - WebAudioFont → smplr 백엔드 마이그레이션, Master FX 체인, 9 카테고리 도메인 RhythmPattern
  - swing/triplet8 그루브 + 카드 프로필 시스템
  - 22장 카드별 instrument · tone · 패턴 정체성 차등화
- [ ] **Phase 5+** — 사용자 인증·프리셋 공유 (user 테이블 + JWT)

---

## 트러블슈팅

자주 마주치는 함정:

- **`.next` 캐시 오염** → `rm -rf .next && pnpm dev`
- **localStorage 스키마 변경 후 화면 깨짐** → `localStorage.removeItem('my-music-app:v1')` 후 새로고침
- **Playwright `libnspr4` 에러** → Docker 경로 사용 (`docker compose -f docker-compose.test.yml --profile e2e up`)
- **WSL Fast Refresh 미반응** → 이미 `WATCHPACK_POLLING=true` 적용됨, 안 되면 dev 재시작

세부 사례·해결책은 [`CLAUDE.md` 트러블슈팅 섹션](./CLAUDE.md#트러블슈팅-실제-겪은-것만)에 정리되어 있습니다.

---

## 기여

이 프로젝트는 개인 학습용으로 시작되어 외부 PR을 적극적으로 받지는 않습니다. 다만 다음은 환영합니다:

- **버그 리포트** — 특히 음악 이론 데이터 오류(스케일·도수·코드 진행) 또는 오디오 타이밍 이슈
- **Fork** — MIT 라이선스 안에서 자유롭게 변형하셔도 좋습니다
- **아이디어 공유** — 새로운 스케일·코드 진행·연습 패턴 제안

도메인 책임 구조와 커밋 규율은 [`CLAUDE.md`](./CLAUDE.md)에 자세히 적혀 있습니다.

> **Note for contributors** — 사용자 노출 앱 이름은 **에휴.. (Ehyo..)** 이지만 내부 식별자(npm 워크스페이스 `@my-music-app/web`, 디렉토리 `apps/web`, 패키지 imports)는 그대로 유지합니다. 빌드·임포트 경로 안정성을 위해 `My Music App` 내부 표기를 사용자 노출 카피로 옮기지 마세요.

---

## 라이선스

[MIT](./LICENSE) © 2026 Singeon Kim

배킹 트랙 합성에 사용된 [smplr](https://github.com/danigb/smplr) 및 SoundFont 샘플은 각자의 라이선스를 따릅니다.
