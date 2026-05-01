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

# Docker — 백엔드 스택 (postgres + api + minio)
docker compose up -d         # 백그라운드 기동 (postgres:5432, api:8000, minio:9000/9001)
docker compose ps            # healthy 상태 확인
docker compose -f docker-compose.test.yml up --exit-code-from playwright
                             # 프로덕션 빌드 + E2E 결정론적 실행

# API (apps/api) — FastAPI · SQLAlchemy async · Alembic
cd apps/api && uv run python -m app.scripts.seed   # 카탈로그 시드 (idempotent)
cd apps/api && uv run pytest                       # API 단위·통합 테스트
cd apps/api && uv run alembic upgrade head         # 마이그레이션 적용
cd apps/api && uv run alembic revision --autogenerate -m "msg"
                                                   # 새 마이그레이션 생성
pnpm --filter @my-music-app/web types:api          # API OpenAPI → 프론트 타입 갱신
                                                   # apps/web/lib/api/generated.ts 갱신, 직접 편집 금지
```

**Playwright 로컬 실행 주의**: WSL 환경에서 시스템 chromium 라이브러리(`libnspr4` 등) 없으면 실패. `docker-compose.test.yml`이 확실한 경로. Windows에 Chrome 64-bit 설치(`C:\Program Files\Google\Chrome\...`)되어 있으면 MCP 브라우저 도구로 수동 스모크 가능.

---

## 아키텍처 개요

### 한 줄 요약

기타 연습자용 **메트로놈 + 지판 스케일 가이드 + 배킹 트랙** 웹앱. **모노레포 구성**: `apps/web`(Next.js 15) + `apps/api`(FastAPI · PostgreSQL · MinIO). 백엔드는 *코드 진행 카탈로그* 데이터 소스 역할 — 사용자 인증/프리셋 공유는 아직 미구현. 배킹 트랙은 클라이언트 측 [smplr](https://github.com/danigb/smplr) 라이브러리(Soundfont/DrumMachine/Reverb)로 합성. Sprint 10까지 머지: 카탈로그 22장(folk/rock 카테고리 신규 진입, modal 4bar 통일, phrygian 추가) + 카드별 variant·instrument 정체성 + 모든 카드 절대 볼륨 통일 + master volume slider 정상화(smplr instance destination → fxChain.input).

**브랜드 vs 내부 식별자**: 사용자 노출 앱 이름은 **"에휴.. (Ehyo..)"** — 메인 타이틀, 브라우저 탭 title, 헤더 홈 링크 모두 이 표기. *내부 식별자*(npm 워크스페이스 `@my-music-app/web`, 디렉토리 `apps/web`, 패키지 imports)는 그대로 유지 — 빌드/임포트 경로 안정성 우선. 새로 사용자 노출 카피를 추가할 때 "My Music App" 표기 금지.

### 핵심 설계 결정 (파일만 봐서는 안 보이는 것)

- **단일 AudioContext 원칙**: 앱 전체에서 `AudioContext` 인스턴스는 **오직 1개**. `lib/audio/context.ts`의 싱글턴에서만 생성. 메트로놈과 (Phase 5+) Tone.js Transport가 같은 clock을 공유해야 드리프트 없이 동기화된다. 다른 곳에서 `new AudioContext()` 금지.

- **백엔드 책임 = 카탈로그 한정**: `apps/api`(FastAPI · SQLAlchemy 2.x async · Alembic)는 코드 진행 카탈로그(`progression_templates`) 정적 데이터만 제공. *사용자 상태*(BPM, 키, 볼륨, 진행 슬러그 선택 등)는 모두 Zustand `persist` → `localStorage`. 키 `my-music-app:v1`, 스키마 `version` 필드 + `migrate` 함수로 상위 호환. 사용자 인증/프리셋 공유는 아직 도입 안 함 — 그 시점에 `users`/프리셋 테이블 추가.

- **음악 이론 레이어는 순수 함수**: `lib/theory/*`는 커버리지 **100%** 목표. `SCALES`, `IMPORTANT_DEGREES`는 음악 이론 컨센서스와 부합해야 하며 수정은 `music-theory-guardian` 에이전트 게이트 필수.

- **지판은 3단계 노트 마커**: Root(semitones=0) / Important(`IMPORTANT_DEGREES`에 포함된 도수) / Regular(나머지 스케일 음). 크기 비율 고정 0.32 / 0.26 / 0.19 (fretWidth 기준). 색은 CSS 변수 토큰만, hex 하드코딩 금지.

- **디자인 토큰은 `app/globals.css`의 Tailwind v4 `@theme`**: 컴포넌트에서 `bg-bg-base`, `text-accent-brass` 같은 토큰 클래스만 사용. 폰트는 Pretendard Variable(CDN, Phase 1에서 `next/font/local`로 이관 예정) + JetBrains Mono. Inter/Roboto/system-ui 등 금지 폰트는 `aesthetic-reviewer`가 거른다.

- **Server vs Client 경계**: 브라우저 API(AudioContext, localStorage, window) 접근 컴포넌트는 `'use client'` 필수. 페이지는 기본 Server Component로 두고 인터랙티브 서브트리만 Client로 분리(`FretboardClient` 패턴). `useHasHydrated()` 훅(`lib/store/hooks.ts`)으로 첫 렌더의 DOM mismatch 방지.

- **fretboard.root는 키의 단일 소스**: 지판 root와 배킹 트랙 키가 항상 동일하다. Sprint 2-6에서 `backing.backingKey`를 v9 마이그레이션으로 제거하고 `fretboard.root` 하나로 통합. 엔진 브리지·`KeySelector`·`RootPicker` 모두 같은 필드를 구독·갱신해 "지판 키 ≠ 배킹 키" 상태가 구조적으로 불가능하도록 막았다.

- **Tuning preset · 멀티 instrument 지원**: 6현 기타 + 7현 기타 + 4현 베이스 3페르소나. `lib/theory/tunings.ts`에 7 preset 정의 (Guitar 6: Standard/Drop D/DADGAD/E♭ Half-step, Guitar 7: Standard, Bass 4: Standard/Drop D). store는 `fretboard.tuning: TuningPresetId`만 보관하고 `useTuning()` 셀렉터가 `PitchClass[]`로 변환. `Fretboard.tsx`의 `STRING_COUNT`는 props로 가변화되어 4/6/7현 자동 렌더(SVG height = stringCount × 32px). 음악 이론·카탈로그·코드 보이싱 도메인은 instrument-agnostic이라 변경 없음. 새 instrument 추가 시 `TUNING_PRESETS` + `presetsByInstrument` + `DEFAULT_PRESET_BY_INSTRUMENT` 세 곳만 수정.

- **Voice mute (drums/bass/guitar/aux)**: `backing.voiceMutes` store + `toggleVoiceMute` action + engine voice trigger 게이트. 카드 재생 중 토글하면 *다음 마디부터* 반영(트리거 미발생, scheduled audio는 그대로 재생). 베이스/7현 사용자가 자기 악기 voice를 빼고 backing 위에 자기 연주를 얹는 시나리오의 핵심. 모든 instrument에 동일 노출. store→engine 브리지는 `engine.ts` 내부 `useAppStore.subscribe`.

- **reactStrictMode: false**: Next 기본 on인 StrictMode의 이중 mount가 AudioContext 싱글턴과 충돌해 2개 생성되는 것을 막기 위해 의도적으로 꺼둠. Phase 1에서 guard 검증 후 재검토 예정(`next.config.ts` 주석 참조).

- **그루브 표현 = swing ratio + triplet8 unit (Sprint 9 PR-A)**: `parseBeatStep(time, bpm, beatsPerBar, { unit, swing })` 4번째 옵션 인자로 `unit?: 'sub16' | 'triplet8'`과 `swing?: 0.5~0.75` 받는다. swing은 8분 off-beat(sub 2)를 swing 비율 위치로 밀어 long-short shuffle feel 표현. swing 미지정 = 0.5(straight) = 회귀 0이 핵심 안전장치. `triplet8` unit은 sub 0/1/2를 0/1/3/2/3박으로 매핑해 명시적 트리플렛(블루스 12/8 ride 등). `CategoryRhythm.swing`(`{ default; perVariant? }`)을 카테고리 라이브러리가 선언, `resolveSwing(rhythm, variant)`이 카드 시작 시 1회 lookup. blues/jazz default 0.66, hard_bop 0.62, jump 0.55. 그 외 카테고리는 미지정 = straight.

- **카드 프로필 시스템 (Sprint 9 PR-B/D + Sprint 10)**: 카탈로그 22장 모두 `lib/audio/backing/card-profiles.ts`의 `CARD_PROFILES`에 등재. 카드별 부분 override: `rhythmVariant`(카테고리 selectSlot 분기 키) + `toneProfile`(velocityScale / voiceGain × 4 voice / reverbWet) + `instrumentOverrides`(부분 instrument 교체). `profile-merge.ts`의 `resolveCardProfile(slug, category)`이 카테고리 default 위에 카드 override 머지(voiceGain만 한 단계 깊은 머지, 그 외 얕은 머지). 미등재 슬러그 → 빈 프로필 fallback. dev에서 `__assertCardProfilesMatch(catalogSlugs)`가 백엔드 카탈로그와 정합성 검증. instrument override는 SoundFont 캐시 부담 고려해 4장만 사용(slow-minor-blues clean / hard-bop-minor-blues + jazz-major-blues jazz archtop / phrygian-vamp distortion).

- **절대 볼륨 통일 (Sprint 10 후속)**: 카드 간 음량 차(예: jump-blues vs slow-minor-blues)로 카드 전환 시 일관성이 깨졌던 문제. 모든 카테고리의 `CATEGORY_TONE_DEFAULTS`를 동일 base(`velocityScale: 1.0`, `voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.05, aux: 1.0 }`)로 통일하고, 카드 프로필의 `velocityScale`/`voiceGain` override는 모두 제거. 카드 정체성은 `reverbWet`(카테고리·카드별 차등) + `instrumentOverrides` + 패턴 자체(swing/triplet8/마디 변주)로만 표현. 새 카드 추가 시 *velocityScale/voiceGain override 금지* — 정체성은 톤·instrument·패턴으로.

- **master volume slider 라우팅 (Sprint 10 후속)**: smplr `Soundfont`/`DrumMachine` 생성자 `options.destination`이 default `ctx.destination` 직행이라 voice 추상화의 GainNode를 우회한다. `lib/audio/backing/smplr-bridge.ts`의 `getSoundfont`/`getDrumMachine`/`loadBundle`이 `destination?: AudioNode` 인자를 받아 instance 생성 시 `.output`을 그쪽에 묶는다. `engine.start`는 `loadBundle` 전에 `ensureVoices()`를 호출해 `fxChain.input`을 확보 → `loadBundle(ctx, bundle, fxChain.input)`. 토폴로지: **smplr instance → fxChain.input → compressor → dry/wet+reverb → masterGain → ctx.destination**. masterGain이 fxChain *이후* final stage라 `setVolume`이 dry/reverb 양쪽에 비례로 적용 (volume slider가 진정한 master). cache 키는 instrument 이름이라 첫 호출의 destination이 영구 — engine 라이프타임 동안 `fxChain.input`이 동일 노드라 cache hit도 안전.

- **drum hat sample 동적 lookup (Sprint 9 PR-D hotfix)**: smplr DrumMachine의 sample 이름이 kit별로 다르다. LM-2의 hi-hat은 `hat`이 아닌 `hhclosed`/`hhclosed-short`/`hhopen` 등 — `'hat'` literal로 호출하면 매칭되는 sample 없어 *완전 무음*이 발생(Sprint 2-8 smplr 마이그레이션 직후부터 잠재). `voices/drums.ts`의 `resolveHatNote(dm)`이 `drumMachine.sampleNames`에서 `hhclosed-short` 우선으로 동적 lookup. 결과는 WeakMap으로 캐시. 같은 voice 안에서 hat은 voice 레벨 `HAT_VELOCITY_SCALE = 0.7` 자동 attenuation 적용 — closed hi-hat sample이 kick/snare 대비 도드라지는 경향 균형. 새 drum kit 추가 시 lookup 우선순위 보강 필요.

### 디렉토리 책임

- `app/` — Next.js App Router. `(practice)` 라우트 그룹이 메트로놈·지판·jam 뷰를 공유 레이아웃으로 묶음. 헤더의 `MetronomeDock`은 layout 상주(다른 페이지에서도 메트로놈 유지). 페이지는 정적 쉘만, 실제 UI는 components/ 클라이언트 컴포넌트. 사용자 노출 라벨은 *Practice*(jam 페이지의 표시명, 탑바 네비, 홈 CTA) — 라우트 디렉토리/URL은 `/jam` 유지(북마크 호환). 브라우저 탭 title은 `app/layout.tsx`의 metadata가 단일 소스(`title.template = '%s · 에휴..'`).
- `components/home/` — 랜딩 페이지(`/`) 전용. `RandomTaunt`(자극 멘트 fade in/out 사이클)가 핵심. 패턴: SSR은 `TAUNTS[0]`을 `opacity-0`으로 렌더 → mount 시 `setIndex(랜덤) + setVisible(true)`을 같은 렌더에서 트리거해 첫 등장 자체를 페이드 사이클의 일부로 만든다(이렇게 안 하면 hydration 직후 instant index swap이 보여 "새로고침 시 2번 바뀜"으로 인지). 진짜 랜덤은 `useRef<number[]>` 히스토리에 최근 N개(N=10) 인덱스를 저장하고 그 외에서만 균등 픽 — 직전 1개만 회피하면 `Math.random()` 충돌 시 `+1` 폴백이 결정론적 순차 진행을 만들어 사용자에게 "리스트 순서대로 가는 중"으로 보였던 회귀 차단.
- `components/fretboard/` — SVG 지판 렌더러 + 컨트롤. 각 컨트롤은 Zustand 스토어를 직접 구독하는 자체 컨테이너 패턴 (prop drilling 없음). `FretboardSurface`(SVG)와 `FretboardControls`(설정 UI)가 분리돼 jam 페이지에서는 Surface만 sticky.
- `components/metronome/` — 메트로놈 UI(MetronomeDock, BpmInput 등).
- `components/jam/` — Practice 통합 뷰 컴포넌트(폴더 이름은 `jam` 유지 — 사용자 노출 라벨만 Practice로 변경). 코드 진행 카탈로그(`ProgressionCatalog`), 키·BPM·볼륨 슬라이더, Roman/Absolute 표기 토글, 재생 버튼.
- `lib/audio/` — AudioContext 싱글턴 + Chris Wilson lookahead 스케줄러(25ms / 100ms, iOS 150ms). `lib/audio/backing/`은 smplr 통합:
  - `engine.ts` — BarScheduler·voice·masterGain·Master FX 체인을 묶는 본체. 단일 재생 원칙(다른 카드 ▶ 누르면 자동 teardown). 카드 시작 시 `resolveCardProfile(slug, category)` → variant + tone + bundle 한 번에 lookup, voice 트리거 매번 `parseBeatStep(step.time, bpm, 4, { unit, swing })`로 시간 계산. **`ensureVoices`를 `loadBundle` 전에 호출해 `fxChain.input` 확보 → `loadBundle(ctx, bundle, fxChain.input)`**.
  - `smplr-bridge.ts` — `Soundfont`/`DrumMachine`/`Reverb` 인스턴스 캐시 + `loadBundle(ctx, bundle, destination?)`. 같은 instrument는 단일 인스턴스 공유. instance 생성 시 `destination`을 받아 `.output`을 fxChain.input에 묶는다 (volume slider 정상화 핵심).
  - `presets.ts` — `CATEGORY_BUNDLES`(9 카테고리 instrument 매핑) + `CATEGORY_TONE_DEFAULTS`(9 카테고리 동일 base + 카테고리별 reverbWet만 차등). rock 카테고리 default guitar는 `distortion_guitar`(Sprint 10). smplr DrumMachine은 5개 kit만 지원 (jazz brush 부재 → TR-808 폴백).
  - `fx-chain.ts` — Master FX: `input → compressor(-18dB/3:1) → split(dry 0.82 / wet 0.18 → reverb) → outputDestination`. `createMasterFxChain(ctx, outputDestination?)`이 outputDestination 인자를 받아 dry/reverb 출력을 그쪽으로 보냄(default ctx.destination). engine은 outputDestination=masterGain을 전달해 final stage 라우팅. `wetGain`은 카드 시작 시 `profile.tone.reverbWet`으로 setValueAtTime.
  - `card-profiles.ts` — 22장 슬러그 → `CardProfile` 매핑(rhythmVariant + toneProfile + instrumentOverrides). 카드별 toneProfile은 `reverbWet` + `instrumentOverrides`만 사용(velocityScale/voiceGain override 금지 — 절대 볼륨 통일). dev 정합성 가드(`__assertCardProfilesMatch`).
  - `profile-merge.ts` — `resolveCardProfile(slug, category)` 순수 함수. 카테고리 default + 카드별 부분 override 결정론 머지.
  - `swing.ts` — `resolveSwing(rhythm, variant)` 순수 함수. swing 미정의 카테고리 → 0.5(straight) 폴백.
  - `patterns/types.ts` — `BeatStep.unit?: 'sub16' | 'triplet8'`, `parseBeatStep(notation, bpm, beatsPerBar, { unit, swing })`, `CategoryRhythm.swing?: { default; perVariant? }`.
  - `patterns/library/<category>.ts` × 9 — 카테고리별 `BarPattern` + `selectSlot(tpl, idx, variant?) → 슬롯`. 마디 인덱스 + variant 기준 결정론적 분기. 예: blues 12bar `shuffle12bar` variant에서 idx=3 → `iv_pickup`, idx=8 → `tension`(V7 빌드업), 10 → `resolve`(I7 안정), 11 → `turnaround`(V7 climax). Sprint 10 신규 variant: folk(`folk_strum`/`ballad_pick_a`/`ballad_pick_b` 짝/홀), rock(`rock_mixo`/`rock_12bar` 4 슬롯), modal(`phrygian_dark`).
  - `voices/{drums,bass,guitar,aux}.ts` — smplr `start({note, time, duration, velocity})`를 voice 추상화로 wrap. **velocity 변환**: 패턴 0~1 × `velocityScale`(profile) × (hat 한정 0.7) → 0~127. drums의 hat은 kit별 sample 이름 차이로 `resolveHatNote()` 동적 lookup. `setVoiceGain(scale)`으로 카드별 voice gain 적용(uniform 정책 적용 후엔 모든 voice가 카테고리 default = drums 0.95 / bass 1.0 / guitar 1.05 / aux 1.0). `start()`가 반환하는 StopFn을 voice가 모아 `cancelScheduled()`에서 일괄 호출 (smplr `Smplr.stop()`이 스케줄러 큐를 비우지 않는 한계 보완 — `dist/index.js:1041-1052` 참조).
- `lib/theory/` — 음악 이론 데이터·함수. `notes.ts`(피치 클래스·도수), `scales.ts`(16 스케일 + `SCALE_HIGHLIGHTS` 색상 매트릭스), `fretboard.ts`(튜닝 × 프렛 → 노트 마크), `chords.ts`(로마 숫자 파싱), `chord-voicing.ts`(MIDI 변환 + `ChordOverlay`), `chord-display.ts`(Roman ↔ Absolute 표기 변환).
- `lib/store/` — Zustand 단일 스토어 + persist 미들웨어 + `useHasHydrated` 훅.
- `lib/api/progression-templates.ts` — 코드 진행 카탈로그 데이터 소스. `generated.ts`는 시드에서 자동 생성, 직접 편집 금지.
- `tests/unit/` — Vitest, 순수 함수 타겟 100%. `tests/component/` — Testing Library. `tests/e2e/` — Playwright (Docker에서 실행). `tests/audio-helpers.ts` — `createSchedulerSpy()` 패턴으로 오디오 타이밍 검증 (실제 출력 대신 예약된 시각 배열 spy).

### 스케일·도수 표기 규율

- 피치 클래스 0~11 (C=0, …, B=11). 인터벌 배열은 오름차순·0으로 시작·중복 없음.
- **샾 우선**, `isFlatKey(root)`가 true인 Root(F, Bb, Eb, Ab, Db)에서만 플랫 표기. Gb/F#은 동일 피치 클래스라 기타 컨벤션상 F#로 통일.
- 도수 표기는 12슬롯 고정 문자열 `'1','b2','2','b3','3','4','b5','5','b6','6','b7','7'`. 리디안의 #4는 이론상 '#4'지만 앱에선 'b5'로 통일(단순화, `lib/theory/notes.ts` 주석 참조).

### 에이전트 팀 (`.claude/agents/`)

7개 도메인 전문가. 호출 매트릭스는 `.claude/agents/README.md`.

| 에이전트 | 주 담당 |
|---|---|
| `music-theory-guardian` | `lib/theory/**`, `SCALES`, `SCALE_HIGHLIGHTS`, 코드 파싱 규칙 변경의 최종 검증 |
| `web-audio-engineer` | `lib/audio/**`, AudioContext·BarScheduler·smplr 통합·Master FX 체인·StopFn 라이프사이클 |
| `fretboard-renderer` | `components/fretboard/**`, 지판 SVG·노트 좌표·overlay 레이어 |
| `aesthetic-reviewer` | 디자인 규율(금지 폰트·보라 그라데이션 차단), 토큰 일관성 |
| `test-strategist` | Vitest/Playwright 전략, 오디오 타이밍 spy, CI |
| `nextjs-architect` | App Router·Zustand persist·Tailwind v4·빌드 |
| `backend-architect` | `apps/api/**` FastAPI · SQLAlchemy 2.x async · Alembic. 카탈로그(`progression_templates`) 모델·라우터·Pydantic 스키마·시드 관리. |

규칙: 범위 겹치지 않고 순차 의존성 없을 때 **병렬** 호출 (단일 메시지에 여러 Agent tool 호출). 새 스케일 추가는 `music-theory-guardian` + `test-strategist`, 지판 UI 변경은 `fretboard-renderer` + `aesthetic-reviewer`가 대표 조합.

### Phase 로드맵

현재 Phase 4 진행 중(Sprint 9까지 머지). 상세는 `docs/planning.md` §12.

- Phase 0: 셋업 ✅
- Phase 1: 메트로놈 MVP ✅
- Phase 2: 지판 스케일 가이드 ✅
- Phase 3: 스케일 확장 (16종 정의 + UI) ✅
- Phase 4: `/jam` 통합 뷰 ✅
  - Sprint 2-2~2-5: WebAudioFont 기반 배킹 트랙
  - Sprint 2-6: sticky 지판 + 배킹 카탈로그 통합
  - Sprint 2-7: smart highlighting (chord-tension + 색채음 매트릭스)
  - Sprint 2-8: smplr 백엔드 교체 + Master FX + 9 카테고리 도메인 RhythmPattern + 카탈로그 +7 (10→17)
  - Sprint 9: 그루브 표현(swing/triplet8) + 카드 프로필 시스템 + 17장 카드별 variant·tone·instrument override + hat sample lookup 버그 수정.
  - Sprint 10: 카탈로그 17→22(folk/rock 카테고리 신규 진입 — folk-I-IV-V/ballad-I-V-vi-IV/rock-I-bVII-IV/rock-12-bar/phrygian-vamp) + modal 3장 마디수 2→4bar 통일(alembic data migration) + 12-bar-major reverbWet 미세 조정 + rock category default distortion + ballad 짝/홀 변주(ballad_pick_a/b).
  - Sprint 10 후속: 모든 카드 절대 볼륨 통일(velocityScale/voiceGain override 제거, 정체성은 reverbWet+instrument+패턴) + master volume slider 정상화(smplr instance destination을 fxChain.input으로 라우팅, masterGain final stage).
  - 브랜딩/UI 정리: 사용자 노출 앱명을 "에휴.. (Ehyo..)"로 통일(랜딩 hero, layout metadata, practice 헤더 홈 링크). 랜딩 서브타이틀을 `RandomTaunt` 랜덤 자극 멘트 페이드 사이클로 교체. 메트로놈 히어로 레이아웃 단순화 — `Pendulum` 제거, BeatLED `size='lg'` 변형 추가, 그리드를 `[BPM 1fr | LED auto | Play auto]`로 재구성. Tap Tempo NaN 버그 수정(MouseEvent → tap action 직결).
- Phase 5+: 사용자 인증/프리셋 공유 도입 시점에 user 테이블 + JWT 추가 검토. Sprint 11 후보: random comping fills(Art Blakey 스타일 snare/kick 불규칙 fills), piano voice(jazz comping), 트리플렛 ride cymbal sample, jazz brush 복원(`Sampler` + 외부 CC0 샘플), voice별 EQ, humanize, 신규 카드.

---

## 저장소

- GitHub: [`SingeonKim/ehyo`](https://github.com/SingeonKim/ehyo) (public, MIT — 2026-05-02 공개 + main branch protection 적용. loose mode: admin은 우회 가능)
- 기본 브랜치: `main` — required status checks: `lint`, `typecheck`, `unit`, `build`, `api-test` (strict, branch up-to-date)
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
제거·변환. 현재 v12. 최근 사례: v9에서 `backing.backingKey` → `fretboard.root`
흡수(키 단일 소스화), v10에서 `backing.volume` 필드 추가, v11에서
`backing.backingPlayingCategory` 추가, v12에서 `fretboard.tuning`(TuningPresetId)
+ `backing.voiceMutes`(drums/bass/guitar/aux 4-tuple) 추가. `__migrate` export로
유닛 테스트에서 직접 검증 가능.

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

### Jazz brush 사운드 (Sprint 2-8 후속)
Sprint 2-8에서 surikov WebAudioFont → smplr 라이브러리로 backing 백엔드를
교체했지만, smplr 0.20.0 DrumMachine은 5개 kit (TR-808/Casio-RZ1/LM-2/MFB-512/
Roland CR-8000)만 지원하고 *jazz brush와 acoustic kit이 모두 부재*.

현재 jazz 카테고리는 TR-808 폴백 (`lib/audio/backing/presets.ts`의 CATEGORY_BUNDLES).
진짜 jazz brush는 후속 Sprint에서 smplr Sampler 클래스 + 외부 CC0 brush 샘플
(Freesound.org 등) 또는 FluidR3_GM Soundfont의 GM drum channel(MIDI ch10) 활용으로
복원 예정. 분석 메모: docs/superpowers/notes/2026-04-26-smplr-spike.md 참조.

### Tap Tempo 누르면 BPM이 NaN
원인 — `<button onClick={tap}>`처럼 store action을 핸들러에 직결하면 브라우저가 click
이벤트 핸들러 첫 인자로 `MouseEvent`를 넘긴다. `tap(now?: number)`처럼 optional 첫 인자를
받는 액션과 직결되면 MouseEvent가 `now`로 들어가 `now - lastTap` 계산이 NaN → BPM = NaN.
키보드 핸들러(`tap()` 무인자)는 영향 없어서 청취 검수에서 놓치기 쉽다.

해결 두 겹 — UI는 `onClick={() => tap()}`로 무인자 호출 강제. 스토어 액션 진입부에서도
`Number.isFinite(now)` 가드 + `performance.now()` 폴백. *optional 첫 인자를 받는 모든
액션*을 `<button>`/`<a>` 등 DOM 핸들러에 직결할 때 같은 패턴 주의 — 클릭 메서드 시그니처
변경 없이 즉시 실패한다.

### Drum hat이 무음 — sample 이름이 'hat'이 아님 (Sprint 9 PR-D hotfix)
smplr DrumMachine은 kit별 sample 이름이 다르다. LM-2는 `kick`/`snare-h`/
`hhclosed`/... 인데 `'hat'`이라는 이름은 등록 안 됨 (`hhclosed`는 등록되지만
`hat` alias는 없음). voice가 `'hat'` literal로 호출하면 *완전 무음*. Sprint 2-8
smplr 마이그레이션 시점부터 잠재했고 Sprint 9 PR-D 청취 검수에서 발견.

해결 — `voices/drums.ts`의 `resolveHatNote(dm)`이 `drumMachine.sampleNames`에서
`hhclosed-short` 우선으로 동적 lookup, WeakMap 캐시. **새 drum kit 추가 시
sample 이름 확인하고 lookup 우선순위 보강 필요**. kit의 sample 이름 확인:
`curl https://smpldsnds.github.io/drum-machines/<KIT_NAME>/dm.json`.

`'snare'`, `'kick'`은 base group alias로 자동 매핑되어 동작했지만 `'hat'`은
LM-2 sample 목록에 base name 'hat'이 없어 alias 매핑 실패. snare도 fuzzy
matching이 깨질 가능성이 있어 추후 동일 패턴으로 lookup 일반화 검토.

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
