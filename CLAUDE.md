# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 파일은 세션 시작 시 자동 로드된다. 사용자 전역 규칙(`~/.claude/CLAUDE.md`)과 충돌할 경우 이 파일이 우선한다.

---

## 자주 쓰는 커맨드

패키지 매니저는 **pnpm 9**. 노드는 **20+**.

```bash
# 개발
pnpm install                 # 의존성 설치 (lockfile frozen)
pnpm dev                     # Next.js dev 서버 (localhost:3000)

# 검증 (커밋 전 필수)
pnpm typecheck               # tsc --noEmit, strict + noUncheckedIndexedAccess
pnpm lint                    # ESLint (next/core-web-vitals + next/typescript)
pnpm test                    # Vitest 단위 + 컴포넌트 (한 번 실행)
pnpm test:watch              # 워치 모드
pnpm test:coverage           # v8 커버리지 (lib/** 타겟)
pnpm test:e2e                # Playwright (로컬은 dev server 자동 기동)

# 단일 테스트 실행
pnpm test tests/unit/lib/theory/scales.test.ts
pnpm test -t "C major"       # 이름 필터

# 빌드
pnpm build                   # Next.js standalone (output: 'standalone')
pnpm start                   # 프로덕션 서버
pnpm format                  # prettier --write .

# Docker
docker compose up            # dev 서버 컨테이너 (핫 리로드)
docker compose -f docker-compose.test.yml up --exit-code-from playwright
                             # 프로덕션 빌드 + E2E 결정론적 실행
```

**Playwright 로컬 실행 주의**: WSL 환경에서 시스템 chromium 라이브러리(`libnspr4` 등) 없으면 실패. `docker-compose.test.yml`이 확실한 경로. Windows에 Chrome 64-bit 설치(`C:\Program Files\Google\Chrome\...`)되어 있으면 MCP 브라우저 도구로 수동 스모크 가능.

---

## 아키텍처 개요

### 한 줄 요약

기타 연습자용 **메트로놈 + 지판 스케일 가이드** 웹앱. v1은 **순수 클라이언트 Next.js 앱**(백엔드 없음). 배킹 트랙이 들어오는 Phase 5에서 FastAPI + Postgres + MinIO를 도입하며 그 시점에 모노레포로 전환.

### 핵심 설계 결정 (파일만 봐서는 안 보이는 것)

- **단일 AudioContext 원칙**: 앱 전체에서 `AudioContext` 인스턴스는 **오직 1개**. `lib/audio/context.ts`의 싱글턴에서만 생성. 메트로놈과 (Phase 5+) Tone.js Transport가 같은 clock을 공유해야 드리프트 없이 동기화된다. 다른 곳에서 `new AudioContext()` 금지.

- **v1 백엔드 없음**: 설정 영속화는 Zustand `persist` → `localStorage`. 키 `my-music-app:v1`, 스키마 `version` 필드 + `migrate` 함수로 상위 호환. `users`/프리셋 테이블 같은 건 Phase 5에 들어온다.

- **음악 이론 레이어는 순수 함수**: `lib/theory/*`는 커버리지 **100%** 목표. `SCALES`, `IMPORTANT_DEGREES`는 음악 이론 컨센서스와 부합해야 하며 수정은 `music-theory-guardian` 에이전트 게이트 필수.

- **지판은 3단계 노트 마커**: Root(semitones=0) / Important(`IMPORTANT_DEGREES`에 포함된 도수) / Regular(나머지 스케일 음). 크기 비율 고정 0.32 / 0.26 / 0.19 (fretWidth 기준). 색은 CSS 변수 토큰만, hex 하드코딩 금지.

- **디자인 토큰은 `app/globals.css`의 Tailwind v4 `@theme`**: 컴포넌트에서 `bg-bg-base`, `text-accent-brass` 같은 토큰 클래스만 사용. 폰트는 Pretendard Variable(CDN, Phase 1에서 `next/font/local`로 이관 예정) + JetBrains Mono. Inter/Roboto/system-ui 등 금지 폰트는 `aesthetic-reviewer`가 거른다.

- **Server vs Client 경계**: 브라우저 API(AudioContext, localStorage, window) 접근 컴포넌트는 `'use client'` 필수. 페이지는 기본 Server Component로 두고 인터랙티브 서브트리만 Client로 분리(`FretboardClient` 패턴). `useHasHydrated()` 훅(`lib/store/hooks.ts`)으로 첫 렌더의 DOM mismatch 방지.

- **reactStrictMode: false**: Next 기본 on인 StrictMode의 이중 mount가 AudioContext 싱글턴과 충돌해 2개 생성되는 것을 막기 위해 의도적으로 꺼둠. Phase 1에서 guard 검증 후 재검토 예정(`next.config.ts` 주석 참조).

### 디렉토리 책임

- `app/` — Next.js App Router. `(practice)` 라우트 그룹이 메트로놈·지판·jam 뷰를 공유 레이아웃으로 묶음. 페이지는 정적 쉘만, 실제 UI는 components/ 클라이언트 컴포넌트.
- `components/fretboard/` — SVG 지판 렌더러 + 컨트롤. 각 컨트롤은 Zustand 스토어를 직접 구독하는 자체 컨테이너 패턴 (prop drilling 없음).
- `components/metronome/` — Phase 1에서 구현 예정.
- `lib/audio/` — AudioContext 관리, Phase 1+ 메트로놈 스케줄러(Chris Wilson lookahead 패턴, 25ms lookahead / 100ms scheduleAhead, iOS 150ms).
- `lib/theory/` — 음악 이론 데이터·함수. `notes.ts`(피치 클래스·도수), `scales.ts`(16 스케일 + `IMPORTANT_DEGREES`), `fretboard.ts`(튜닝 × 프렛 → 노트 마크).
- `lib/store/` — Zustand 단일 스토어 + persist 미들웨어 + `useHasHydrated` 훅.
- `tests/unit/` — Vitest, 순수 함수 타겟 100%. `tests/component/` — Testing Library. `tests/e2e/` — Playwright (Docker에서 실행). `tests/audio-helpers.ts` — `createSchedulerSpy()` 패턴으로 오디오 타이밍 검증 (실제 출력 대신 예약된 시각 배열 spy).

### 스케일·도수 표기 규율

- 피치 클래스 0~11 (C=0, …, B=11). 인터벌 배열은 오름차순·0으로 시작·중복 없음.
- **샾 우선**, `isFlatKey(root)`가 true인 Root(F, Bb, Eb, Ab, Db)에서만 플랫 표기. Gb/F#은 동일 피치 클래스라 기타 컨벤션상 F#로 통일.
- 도수 표기는 12슬롯 고정 문자열 `'1','b2','2','b3','3','4','b5','5','b6','6','b7','7'`. 리디안의 #4는 이론상 '#4'지만 앱에선 'b5'로 통일(단순화, `lib/theory/notes.ts` 주석 참조).

### 에이전트 팀 (`.claude/agents/`)

6개 도메인 전문가. 호출 매트릭스는 `.claude/agents/README.md`.

| 에이전트 | 주 담당 |
|---|---|
| `music-theory-guardian` | `lib/theory/**`, `SCALES`, `IMPORTANT_DEGREES` 변경의 최종 검증 |
| `web-audio-engineer` | `lib/audio/**`, AudioContext·Tone.js 타이밍 |
| `fretboard-renderer` | `components/fretboard/**`, 지판 SVG·노트 좌표 |
| `aesthetic-reviewer` | 디자인 규율(금지 폰트·보라 그라데이션 차단), 토큰 일관성 |
| `test-strategist` | Vitest/Playwright 전략, 오디오 타이밍 spy, CI |
| `nextjs-architect` | App Router·Zustand persist·Tailwind v4·빌드 |

규칙: 범위 겹치지 않고 순차 의존성 없을 때 **병렬** 호출 (단일 메시지에 여러 Agent tool 호출). 새 스케일 추가는 `music-theory-guardian` + `test-strategist`, 지판 UI 변경은 `fretboard-renderer` + `aesthetic-reviewer`가 대표 조합.

### Phase 로드맵

현재 Phase 2 완료 상태. 상세는 `docs/planning.md` §12.

- Phase 0: 셋업 ✅
- Phase 1: 메트로놈 MVP
- Phase 2: 지판 스케일 가이드 ✅
- Phase 3: 스케일 확장 (이미 16종 전부 정의됨 — 실질 완료)
- Phase 4: `/jam` 통합 뷰
- Phase 5+: 배킹 트랙 (여기서 FastAPI/Postgres/MinIO 도입, 모노레포 전환, Tone.js 합류)

---

## 저장소

- GitHub: [`SingeonKim/gn-music-app`](https://github.com/SingeonKim/gn-music-app) (private 가정)
- 기본 브랜치: `main`
- 통합 브랜치: `develop` (옵션, 규모 커지면 도입)

---

## 커밋 규율

### 자동 커밋 정책

이 프로젝트에서는 Claude가 **작업 단위가 끝날 때마다 자동으로 커밋**한다. 사용자에게 별도 확인을 받지 않는다. 사용자 전역 규칙("Only create commits when requested")을 이 프로젝트에서는 덮어쓴다.

자동 커밋의 전제:
- 커밋 전 체크리스트(하단)를 통과해야 한다
- 작업이 **논리적으로 완결된 단위**일 때만 커밋. "중간에 끊긴" 상태는 커밋하지 않는다
- 여러 스코프가 얽히면 쪼개서 여러 커밋으로
- Push는 **자동 금지**. Push는 사용자가 명시적으로 요청해야 한다

이 정책은 commit만 해당. destructive 작업(reset --hard, force push, branch -D 등)은 여전히 사용자 승인 필요.

### 메시지 형식 — Conventional Commits

```
<type>(<scope>): <subject>

<body — 한국어 or 영어, "왜" 중심>

<footer>
```

- **언어**: 제목은 **영어**, 본문은 한국어/영어 자유 (사용자 전역 규칙 준수).
- **제목 길이**: 50자 이내 권장, 최대 72자.
- **본문**: "what"이 아닌 "**why**" 중심. 코드 변경 요약은 diff가 말해준다.
- **푸터**: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` 포함.

### `<type>`

| type | 사용처 |
|---|---|
| `feat` | 새 기능 (사용자 관점) |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `perf` | 성능 개선 |
| `style` | 포매팅, 토큰 정리, 디자인 조정 (기능 변화 없음) |
| `test` | 테스트 추가·수정 |
| `docs` | 문서 |
| `chore` | 빌드, 의존성, 설정 |
| `ci` | CI 파이프라인 |
| `build` | Docker, 빌드 도구 |
| `a11y` | 접근성 개선 |

### `<scope>` — 프로젝트 고정 스코프

도메인 경계를 명확히 하기 위해 스코프는 다음 중에서만 선택한다.

| scope | 범위 |
|---|---|
| `metronome` | `components/metronome/**`, 메트로놈 UI |
| `fretboard` | `components/fretboard/**`, 지판 UI |
| `audio` | `lib/audio/**`, AudioContext, 스케줄러, Tone.js |
| `theory` | `lib/theory/**`, 스케일·도수·코드 |
| `store` | `lib/store/**`, Zustand, 영속화 스키마 |
| `ui` | 공통 컴포넌트, 토큰, globals.css, 폰트 |
| `api` | `apps/api/**` (Phase 5+), FastAPI 라우터·서비스·Pydantic |
| `db` | DB 스키마, SQLAlchemy 모델, Alembic 마이그레이션 |
| `docker` | Dockerfile, docker-compose* |
| `ci` | `.github/workflows/**` |
| `test` | `tests/**`, vitest·playwright·pytest 설정 |
| `docs` | `docs/**`, README, CLAUDE.md |
| `agents` | `.claude/agents/**` |
| `deps` | 의존성 업데이트 |
| `infra` | 그 외 인프라성 변경 |

여러 스코프가 걸리면 커밋을 **쪼갠다**. 한 커밋은 한 스코프가 원칙.

### 예시

```
feat(metronome): add lookahead scheduler with 25ms callback

Chris Wilson 패턴 적용. setInterval은 메인 스레드 드리프트 때문에 쓰지 않고,
Web Worker에서 25ms 간격으로 메인 스레드에 스케줄링 틱을 보낸다. 실제 오디오
예약은 AudioContext.currentTime 기준 절대 시각을 쓴다.

iOS Safari는 scheduleAheadTime을 150ms로 상향 (기본 100ms). baseLatency로 감지.

Refs: docs/planning.md §6.1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
fix(theory): correct harmonic minor 7th interval (b7 → 7)

하모닉 마이너의 7음은 자연 7도(interval 11)이다. 이전에 10으로 잘못 기입됨.
관련 unit test 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
style(ui): remove system-ui fallback from font stacks

system-ui는 Windows에서 Segoe UI로 폴백되어 aesthetic-reviewer 금지 목록에
해당. -apple-system → sans-serif 순서로 폴백 체인을 단순화.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## 브랜치 규율

### 네이밍

| 패턴 | 용도 |
|---|---|
| `feat/<scope>-<short>` | 새 기능 — 예: `feat/metronome-tap` |
| `fix/<scope>-<short>` | 버그 수정 |
| `refactor/<scope>-<short>` | 리팩터 |
| `chore/<short>` | 빌드/설정/작은 정리 |
| `docs/<short>` | 문서 |
| `phase/<N>-<short>` | Phase 전체 작업의 통합 브랜치 — 예: `phase/1-metronome-mvp` |

- 모든 문자 소문자, 단어 구분 `-`
- 짧게: `feat/metronome-scheduler` ✅ / `feat/metronome-implementation-lookahead-scheduler-with-worker` ❌
- `main`에 직접 커밋 금지. 항상 PR 경유.

### PR 규칙

- 제목은 브랜치의 대표 커밋 메시지와 일치 (Conventional Commits 형식).
- 본문 최소 구성: `## Summary` (1~3 bullet) · `## Test plan` (체크리스트).
- 관련 에이전트 리뷰 요약을 `## Review notes`에 인용 (예: "aesthetic-reviewer: 통과 / test-strategist: 2건 제안 반영").
- Phase 단위 대형 PR은 drafted PR로 열어두고 인크리멘탈 커밋.
- 머지 전략: **Squash merge** 기본. 단 Phase 전체 브랜치는 **Merge commit** 유지 (히스토리 보존).

---

## 복잡 작업 처리 — 워킹트리와 멀티 에이전트

### 기준

| 상황 | 처리 방식 |
|---|---|
| 단일 파일 수정, 1~2줄 변경 | 현재 디렉토리에서 직접 작업 + 즉시 커밋 |
| 여러 파일 한 기능 (2~10파일) | 피처 브랜치에서 인크리멘탈 커밋 |
| **독립적으로 진행 가능한 2개 이상의 축**이 동시에 있을 때 | **Git worktree로 분리** + 각 워크트리에 멀티 에이전트 배정 |
| Phase 규모 (수십 파일, 여러 도메인) | `phase/N-*` 브랜치 + 필요 시 내부 피처 브랜치 + 에이전트 병렬 |

### Worktree 사용 규칙

```bash
# 기준: 한 세션에서 동시에 Web Audio 스케줄러와 메트로놈 UI를 짜야 할 때
git worktree add ../my-music-app-audio feat/audio-scheduler
git worktree add ../my-music-app-ui feat/metronome-ui
```

- Worktree 이름: `../my-music-app-<scope>` 일관성
- 각 worktree는 **독립 브랜치** — 한 worktree가 다른 worktree 브랜치를 체크아웃 금지
- 작업 끝나면 `git worktree remove` — 남기지 말 것
- 공용 상태(스토어 타입, 토큰 등)가 두 worktree에서 필요하면 먼저 별도 작은 PR로 main에 머지한 뒤 각 worktree가 rebase

### 멀티 에이전트 사용 규칙

에이전트 병렬 호출 (`.claude/agents/`) — 다음 조건 모두 충족 시만:
1. 작업 범위가 **파일 수준에서 겹치지 않음** (예: web-audio-engineer는 `lib/audio/**`, fretboard-renderer는 `components/fretboard/**`)
2. 한 에이전트의 결과물이 다른 에이전트의 **입력 전제가 아님** (순차 의존성 없음)
3. 예상 작업 시간이 개별 3분 이상 (에이전트 오버헤드 > 병렬 이득이 되는 선)

병렬 권장 매트릭스는 `.claude/agents/README.md` 참조.

### 머지 규율
- Worktree 각자 자기 브랜치에 커밋 → PR → main 머지
- 에이전트가 작업한 파일도 **반드시 사람(사용자)이 PR에서 한 번 훑는다**. 에이전트 커밋을 바로 main에 푸시하지 않는다.

---

## 커밋 전 체크

사람이든 에이전트든 커밋 직전에 다음을 만족해야 한다.

- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] 수정된 영역에 해당하는 테스트 갱신 (`test-strategist` 게이트)
- [ ] 해당 도메인 담당 에이전트 1회 이상 리뷰 (자동 또는 수동)
- [ ] 커밋 메시지가 Conventional Commits 준수
- [ ] 비밀·API 키 포함 없음 (`.env*` 변경 시 특히 주의)

`--no-verify` / `--no-gpg-sign` 플래그 **사용 금지**. 훅이 실패하면 원인 수정 후 재커밋.

---

## 트러블슈팅 (실제 겪은 것만)

### `ENOENT: ... .next/server/pages/_document.js` (Runtime Error)
`pnpm build` 뒤에 `pnpm dev`를 띄우면 dev 컴파일러가 prod 빌드 잔해와 섞여
Pages Router 경로를 찾아 실패한다 (App Router 프로젝트인데).

```bash
pkill -f "next dev"
rm -rf .next
pnpm dev
```

재발 방지: **build와 dev를 같은 체크아웃에서 섞지 말 것.** 빌드 검증이 필요하면
별도 디렉토리/워크트리에서 하거나, 빌드 직후 `.next` 정리.

### 포트 3000이 이미 사용 중 → 3001 폴백
Next.js가 자동으로 3001로 올린다. 이전 세션의 zombie process가 3000을 붙잡고
있는 경우가 많다.

```bash
# WSL에서 3000 점유자 찾기
ss -tlnp | grep :3000
# Windows 쪽에서 점유 시 (파워셸)
# netstat -ano | findstr :3000
```

정리 못 하면 3001로 계속 써도 무방 — 브라우저 URL만 맞추면 됨.

### Fast Refresh가 계속 full reload
`.next` 캐시 오염이거나, 'use client' 경계를 넘어 Server Component에서 Client 훅을
쓰고 있을 때. 캐시 문제면 위 절차, 경계 문제면 dynamic import.

### localStorage 스키마 변경 시 유저 화면이 깨짐
`lib/store/app-store.ts`의 persist `version`을 올리고 `migrate`에서 구 필드를
제거·변환. v1 → v2 예시는 현재 코드 참조.

### 브라우저 변경이 반영 안 됨
1. **Dev 서버 로그에 "Compiling" 이벤트가 있는지 확인.** WSL + `/mnt/c/`에서
   inotify 파일 워칭이 꺠지는 경우가 흔함. 로그에 GET만 있고 컴파일이 없으면
   서버가 디스크 변경을 못 본 상태 → 재시작 필요.
2. package.json dev 스크립트에 `WATCHPACK_POLLING=true` 걸려 있는지 확인
   (이 프로젝트는 기본 적용). 없으면 `WATCHPACK_POLLING=true pnpm dev`.
3. 브라우저가 엉뚱한 포트(3001 vs 3000)를 보고 있는지 확인
4. Ctrl+Shift+R 하드 리프레시
5. `.next` 클린 + 재시작
6. localStorage 스키마 버전 문제라면 DevTools Console에서
   `localStorage.removeItem('my-music-app:v1'); location.reload()`

### Playwright 로컬 실행이 libnspr4 에러
WSL에 시스템 chromium 의존 라이브러리 없음. `docker compose -f
docker-compose.test.yml up` 으로 돌리거나, `sudo apt install libnspr4 libnss3
libasound2t64` (sudo 권한 필요).

### Chrome DevTools / Playwright MCP가 chrome 못 찾음
Windows에 Google Chrome 64-bit(`C:\Program Files\Google\Chrome\...`) 설치가 제일
깔끔. x86(32-bit) 설치본만 있으면 `AppData/Local/Google/Chrome/Application/`에
심링크로 우회 가능하지만 CDP 연결이 불안정.

---

## 예외·주의

- **amend 금지**: 이미 푸시된 커밋은 amend 대신 새 커밋. 푸시 전 로컬 커밋은 amend 허용.
- **force push**: `main`에 절대 금지. 본인 피처 브랜치에서만 허용하되 PR이 리뷰 중이면 `--force-with-lease`.
- **대형 바이너리**: 폰트 파일 등은 `public/fonts/` 에만. 샘플 오디오가 생기면(Phase 1) 용량이 클 경우 Git LFS 검토.
- **package.json 변경**은 단독 커밋으로. `pnpm-lock.yaml`과 함께.

---

## 참고

- 기획 문서: [`docs/planning.md`](./docs/planning.md)
- 에이전트 팀: [`.claude/agents/README.md`](./.claude/agents/README.md)
- 사용자 전역 규칙: `~/.claude/CLAUDE.md`
