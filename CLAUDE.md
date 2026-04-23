# CLAUDE.md — my-music-app 프로젝트 규율

이 파일은 Claude Code 세션이 시작될 때 자동 로드된다. 이 프로젝트에 고유한 작업 규칙을 담는다. 사용자 전역 규칙(`~/.claude/CLAUDE.md`)과 충돌할 경우 이 파일이 우선한다.

---

## 저장소

- GitHub: [`SingeonKim/gn-music-app`](https://github.com/SingeonKim/gn-music-app) (private 가정)
- 기본 브랜치: `main`
- 통합 브랜치: `develop` (옵션, 규모 커지면 도입)

---

## 커밋 규율

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
| `docker` | Dockerfile, docker-compose* |
| `ci` | `.github/workflows/**` |
| `test` | `tests/**`, vitest·playwright 설정 |
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

병렬 권장 매트릭스는 `.claude/agents/README.md` 참조. 대표 예:
- 새 스케일 추가: `music-theory-guardian` + `test-strategist`
- 지판 UI 변경: `fretboard-renderer` + `aesthetic-reviewer`
- Phase 셋업: `nextjs-architect` + `test-strategist` 병렬 가능

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
