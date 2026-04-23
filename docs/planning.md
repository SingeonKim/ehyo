# My Music App — 기획 문서

> 메트로놈 · 기타 스케일 가이드 · (후순위) 배킹 트랙이 하나의 연습 도구로 묶인 웹 서비스

작성일: 2026-04-23
버전: **0.2**
변경 이력:
- 0.2 — 유저 계정 제거(로컬 저장소로 대체), 중요 노트 3단계 표시 도입, Pretendard 폰트 확정, 백엔드 v1 제거·배킹 Phase로 이관, 로드맵 재정렬
- 0.1 — 초안

---

## 1. 프로젝트 개요

### 1.1 한 줄 설명
기타리스트가 **연습 한 세션**에 필요한 세 가지 도구 — 정확한 메트로놈, 지판 위 스케일 시각화, 스케일에 맞는 배킹 트랙 — 을 한 화면에서 연결해 쓰는 웹 서비스.

### 1.2 해결하려는 문제
현재 기타 연습자는 도구가 분산되어 있다.
- 메트로놈은 앱/웹으로 따로 켜야 하고
- 스케일 지판은 책/이미지로 찾아봐야 하고
- 배킹 트랙은 YouTube에서 검색해야 한다

세 가지가 **같은 key/tempo로 동기화**되면 연습 흐름이 끊기지 않는다. 이 서비스는 그 동기화를 제공한다.

### 1.3 목표
- **M1 (v1 필수)**: 메트로놈 + 스케일 가이드가 동일한 화면에서 조작 가능
- **M2 (후순위 차별화)**: 배킹 트랙이 메트로놈/스케일과 BPM·Key로 동기화 — **Phase 5 이후**
- **M3 (지속 요구)**: "도구"가 아닌 "악기처럼" 느껴지는 UI — AI 생성 냄새가 나지 않는 편집증적 디테일

### 1.4 비목표 (Out of scope)
- 악보/TAB 편집기
- 녹음/DAW 기능
- 유저 간 공유·소셜 기능
- **유저 계정/로그인 기능** — 설정 저장은 전적으로 브라우저 로컬 저장소
- 모바일 네이티브 앱 (웹 반응형만)

---

## 2. 타겟 사용자 & 핵심 시나리오

### 2.1 타겟
- 기타 중급자 (스케일 이름은 알지만 지판 매핑을 항상 기억하지는 못함)
- 즉흥 연주/솔로 연습을 하는 사람
- 프로가 아니라 "꾸준한 취미"로 하는 사람

### 2.2 핵심 시나리오 3개
1. **빠른 템포 연습**: "G 메이저 스케일을 120 BPM으로 8분음표 연습" → 메트로놈 켜고, 지판에 스케일 띄워놓고 연습. 중요 노트(1·4·5)가 한눈에 강조됨.
2. **모드 탐색**: "D 도리안이 어떤 소리지?" → 스케일 설정하고, 특성음 강조(1·b3·5)를 보며 연주 (배킹 트랙은 Phase 5).
3. **블루스 솔로 연습 (Phase 5+)**: "A 마이너 블루스 12마디" → 배킹 트랙 재생, 현재 코드(I/IV/V)에 따라 지판에 추천 노트가 자동 하이라이트.

---

## 3. 기술 스택 & 선택 근거

### 3.1 스택 요약 (v1 / 배킹 Phase 구분)

| 영역 | v1 (필수) | 배킹 Phase 추가 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) | — |
| 언어 | TypeScript 5.x (strict) | — |
| 스타일 | Tailwind CSS v4 + CSS-first `@theme` | — |
| 컴포넌트 | shadcn/ui 기반 커스텀 | — |
| 모션 | Motion (구 Framer Motion) | — |
| 아이콘 | Lucide + 커스텀 SVG | — |
| 상태 | Zustand + Immer | — |
| **영속화** | **localStorage (Zustand `persist` 미들웨어)** | — |
| 오디오 | Web Audio API 직접 (메트로놈 스케줄러) | + **Tone.js 15** (Transport) |
| 오디오 확장 | — | SoundTouchJS (tempo/pitch, Phase 6) |
| 백엔드 | — | FastAPI 0.115 + Python 3.12 |
| DB | — | PostgreSQL 16 |
| ORM/마이그레이션 | — | SQLAlchemy 2.x + Alembic |
| 오브젝트 스토리지 | — | MinIO (로컬) / S3 (운영) |
| 테스트 (FE) | Vitest + Testing Library + Playwright | — |
| 테스트 (BE) | — | pytest + pytest-asyncio + httpx |
| 컨테이너 | Docker Compose (web 단일) | + api, postgres, minio |
| CI | GitHub Actions (lint/unit/e2e in Docker) | + 통합 테스트 |
| 폰트 | **Pretendard Variable (OFL)** + JetBrains Mono | — |

### 3.2 왜 v1에 백엔드가 없는가

v0.1 초안은 FastAPI + Postgres를 기본 스택에 넣었지만, 요구사항을 재검토한 결과 **v1은 순수 클라이언트로 100% 구현 가능**하다.

- 메트로놈: 오디오 스케줄링은 브라우저 `AudioContext` 내부. 서버 왕복 불필요.
- 지판 스케일: 음악 이론 계산(스케일 인터벌 → 지판 좌표)은 순수 함수. 클라이언트에서 즉시 렌더.
- 설정 저장(BPM, 마지막 Root, 스케일, UI 테마): **localStorage + Zustand `persist`** 로 충분. 용량 한도 5MB 중 실제 사용은 수 KB.

백엔드는 다음 시점에 **필요해서** 들어온다:
- 코드 진행 카탈로그를 공통 데이터로 서빙 (Phase 5)
- 사전 녹음 배킹 트랙 오디오 파일 스토리지 + presigned URL (Phase 6)
- 사용량 분석·피드백 수집 (필요 판단 시)

**결론**: v1은 Vercel/Cloudflare Pages 같은 정적 호스팅으로 배포 가능한 단일 Next.js 앱. 개발 속도·테스트 단순화의 이점이 크다.

### 3.3 Tone.js의 도입 시점

메트로놈은 `Tone.js` 없이 순수 Web Audio + lookahead 스케줄러(Chris Wilson 패턴)로 구현한다. 번들 절감 + 타이밍 제어 단순화.

Tone.js는 **배킹 Phase에서 Transport · Part · Sampler**가 필요할 때 도입한다. 이때 단일 `AudioContext`를 메트로놈과 공유(`Tone.setContext(sharedCtx)`)해서 두 엔진이 드리프트 없이 같이 돈다.

---

## 4. 시스템 아키텍처

### 4.1 v1 아키텍처 (FE only)

```
┌──────────────────────────────────────────────────────┐
│                  Browser (Client)                    │
│  ┌────────────────────────────────────────────────┐ │
│  │  Next.js App (App Router, Static Export 가능)  │ │
│  │                                                 │ │
│  │  ┌──────────────┐     ┌──────────────────┐    │ │
│  │  │  Metronome   │     │    Fretboard     │    │ │
│  │  │  Scheduler   │     │  SVG Renderer    │    │ │
│  │  │ (Web Worker) │     │                  │    │ │
│  │  └──────┬───────┘     └─────────┬────────┘    │ │
│  │         │                       │              │ │
│  │         └───────┬───────────────┘              │ │
│  │                 ▼                              │ │
│  │        Zustand Store (persist)                 │ │
│  │                 │                              │ │
│  │                 ▼                              │ │
│  │          localStorage                          │ │
│  │       (my-music-app:v1)                        │ │
│  │                                                 │ │
│  │        Shared AudioContext                     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**레이어 책임**
- **Next.js 페이지**: Server Component로 정적 셸만. 오디오·지판은 Client Component.
- **Zustand 스토어**: 단일 source of truth. `persist` 미들웨어가 `partialize`한 서브셋을 localStorage에 저장.
- **영속화 레이어**: localStorage. 스키마 `version` 필드 + `migrate` 함수로 하위호환.
- **AudioContext**: 앱 전체에서 1개. `lib/audio/context.ts`에서 생성·공유.

### 4.2 배킹 Phase 아키텍처 (FE + BE)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│  Next.js App (SSR/ISR)                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────────┐ │
│  │ Metronome │ │ Fretboard │ │ Backing Track Player  │ │
│  │ Scheduler │ │           │ │ (Tone.js Transport)   │ │
│  └─────┬─────┘ └─────┬─────┘ └───────────┬───────────┘ │
│        └─────────────┴───────────────────┘             │
│              Zustand (persist + fetched data)          │
│                      Shared AudioContext                │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / JSON
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                        │
│  /progression-templates  /backing-tracks  /health       │
└───────────┬──────────────────────┬──────────────────────┘
            ▼                      ▼
     ┌─────────────┐        ┌──────────────────┐
     │ PostgreSQL  │        │ MinIO / S3       │
     └─────────────┘        └──────────────────┘
```

### 4.3 단일 AudioContext 원칙
배킹 Phase에서 Tone.js를 도입해도, AudioContext는 여전히 1개만 존재. `Tone.setContext(sharedCtx)`로 바인딩. 메트로놈의 직접 스케줄러와 Tone의 Transport가 같은 clock을 공유한다.

---

## 5. 디자인 시스템 & UX 방향성

### 5.1 아트 디렉션
**"Analog instrument panel × Editorial magazine"** — 디지털 도구처럼 보이지 않는다. 빈티지 기타 앰프의 노브·LED·실크스크린 레이블 + 에디토리얼 잡지의 타이포그래피 위계.

- **절대 금지**: 보라 그라데이션, Inter/Roboto/Arial, 민트·네온 악센트, 라운디드 카드 남발, Glassmorphism 무의미 사용
- **분위기**: 다크 웜톤 기본(오프블랙 `#0E0B08`), 황동·구리 악센트
- **상징 요소**: 메트로놈의 **SVG 진자 애니메이션**. BPM에 정확히 맞춰 좌우 왕복. 이게 사이트의 아이덴티티.

### 5.2 타이포그래피 (확정)

| 역할 | 폰트 | 라이선스 |
|---|---|---|
| Display (BPM 히어로, H1) | **Pretendard Variable** (Weight 900) | SIL OFL 1.1 — 상업 무료 |
| Body / UI | Pretendard Variable (400~600) | 동일 |
| Mono (수치·도수·코드) | **JetBrains Mono** | Apache 2.0 — 상업 무료 |

**Pretendard 선택 이유**: 한글 + 라틴 모두 높은 수준의 커버리지, 가변 폰트로 하나의 파일에서 100~900 weight, 한국어 사용자에게 익숙하고 중립적이면서도 개성이 있음(기하학적 산세리프). 리가처·OpenType 기능 풍부.

**탐색 옵션** (향후 라이선스 확보 시 검토 가능): GT Sectra, PP Editorial New, Söhne Buch. Display만 세리프로 교체하는 선택지.

### 5.3 컬러 토큰 (Tailwind v4 `@theme` 방식)

```css
/* app/globals.css */
@theme {
  /* 배경 */
  --color-bg-base: #0E0B08;
  --color-bg-elevated: #1A1612;

  /* 잉크 */
  --color-ink-primary: #F4EDE0;
  --color-ink-secondary: #A89B86;

  /* 악센트 */
  --color-accent-brass: #C9A961;
  --color-accent-copper: #B87333;
  --color-accent-signal: #E8554E;   /* Beat 1, 녹음 표시 */

  /* 지판 노트 3단계 */
  --color-scale-root: #E8554E;       /* Root — 가장 강함 */
  --color-scale-important: #E8A14E;  /* 중요 노트 — 중간 강도 */
  --color-scale-tone: #C9A961;       /* 일반 스케일 노트 */

  /* 배킹 Phase 추가 */
  --color-scale-chord: #5EB0E5;      /* 현재 코드 톤 (ring 레이어) */

  /* 폰트 */
  --font-display: "Pretendard Variable", sans-serif;
  --font-body: "Pretendard Variable", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

### 5.4 레이아웃 원칙
- BPM 숫자 등 히어로 수치는 **최소 120px**, 본문 대비 5배 이상 대비
- 비대칭 그리드 허용 (메트로놈-좁음 / 지판-와이드)
- 지판은 가로 방향 기본 (실기타 시야각)
- 호버 피드백은 0~50ms 즉각 반응

### 5.5 모션
- 메트로놈 진자: `cubic-bezier(.45, .05, .55, .95)` — 실제 진자 ease-in-out
- 첫 박: 50ms flash
- 스케일 변경: 노트 스태거 페이드인 (각 노트 20ms)
- 배킹 트랙 코드 변경: 현재 코드 슬라이드 스왑
- `prefers-reduced-motion: reduce` 지원 필수

### 5.6 접근성
- WCAG AA 색 대비
- 키보드: `Space`=재생/정지, `↑↓`=BPM ±1, `Shift+↑↓`=±10, `T`=Tap
- Root/Important 노트에 `aria-label`, Regular은 `role="presentation"`
- 진자 애니메이션은 reduced-motion 시 LED 점등만으로 대체

---

## 6. 기능 명세

### 6.1 메트로놈

#### 상태
```typescript
interface MetronomeState {
  bpm: number;              // 20 ~ 300
  isPlaying: boolean;
  timeSignature: {
    numerator: number;      // 2,3,4,5,6,7,9,12
    denominator: 2 | 4 | 8;
  };
  subdivision: SubdivisionType; // 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing'
  accentBeatOne: boolean;
  soundType: 'click' | 'wood' | 'cowbell' | 'digital' | 'rim'; // 5종
  volume: number;           // 0.0 ~ 1.0
  tapTimestamps: number[];  // 최근 tap (performance.now())
}
```

#### 오디오 스케줄러 (Chris Wilson 패턴)
- `lookahead = 25ms` (콜백 주기)
- `scheduleAheadTime = 0.1s` (iOS는 0.15s)
- Web Worker에서 `setInterval`로 스케줄러 트리거, 메인 스레드에서 `AudioContext.currentTime` 기준 절대 시각 예약
- Subdivision: 한 beat에 subdivision 수만큼 예약, 첫 sub는 100%, 나머지는 70% 볼륨
- Accent Beat 1: 다른 샘플 + 피치 +5 semitones + 더 큰 볼륨

#### Sound Type (5종)
1. Click — 1kHz sine + envelope
2. Wood block — 샘플
3. Cowbell — 샘플
4. Digital beep — 2kHz square
5. Rim shot — 샘플

#### Tap Tempo
- `T` 키 또는 Tap 버튼 입력 시 `performance.now()` 기록
- **최근 4회** 간격 평균으로 BPM 환산: `bpm = 60000 / avgInterval`
- 2초 공백 시 배열 초기화
- 결과는 `Math.round` + 20~300 clamp

#### UI
- 중앙: 거대한 BPM 숫자 (Display 폰트, 120px+)
- 좌측: SVG 진자
- 하단 컨트롤 그룹: Play/Pause, Tap, Time Signature, Subdivision, Sound Type, Volume, Accent toggle
- 비트 LED: 박자 수만큼 원, 현재 박 점등

### 6.2 기타 스케일 가이드

#### 6.2.1 스케일 인터벌 (semitones from root)
```typescript
const SCALES = {
  // Standard
  major:               [0, 2, 4, 5, 7, 9, 11],
  natural_minor:       [0, 2, 3, 5, 7, 8, 10],
  // Pentatonic
  major_pentatonic:    [0, 2, 4, 7, 9],
  minor_pentatonic:    [0, 3, 5, 7, 10],
  major_blues:         [0, 2, 3, 4, 7, 9],
  minor_blues:         [0, 3, 5, 6, 7, 10],
  // Jazz / Modes
  dorian:              [0, 2, 3, 5, 7, 9, 10],
  lydian:              [0, 2, 4, 6, 7, 9, 11],
  melodic_minor:       [0, 2, 3, 5, 7, 9, 11], // 상행 형태
  whole_tone:          [0, 2, 4, 6, 8, 10],
  diminished_hw:       [0, 1, 3, 4, 6, 7, 9, 10],
  diminished_wh:       [0, 2, 3, 5, 6, 8, 9, 11],
  // Other
  phrygian:            [0, 1, 3, 5, 7, 8, 10],
  locrian:             [0, 1, 3, 5, 6, 8, 10],
  harmonic_minor:      [0, 2, 3, 5, 7, 8, 11],
  mixolydian:          [0, 2, 4, 5, 7, 9, 10],
} as const;
```

스케일은 카테고리별로 UI 아코디언에 묶어 표시(Standard / Pentatonic / Jazz / Other).

#### 6.2.2 **중요 노트** (Root 포함 2~4개) — v0.2 신설

각 스케일마다 "그 스케일의 캐릭터를 정의하는 핵심 도수"가 있다. Root 외에 1~3개를 기본 강조.

```typescript
// semitones 값 (SCALES와 동일 기준, Root=0)
const IMPORTANT_DEGREES: Record<ScaleKey, number[]> = {
  // Standard — 토닉·서브도미넌트·도미넌트
  major:            [0, 5, 7],       // 1, 4, 5
  natural_minor:    [0, 3, 7],       // 1, b3, 5

  // Pentatonic — 트라이어드 기준
  major_pentatonic: [0, 4, 7],       // 1, 3, 5
  minor_pentatonic: [0, 3, 7],       // 1, b3, 5
  major_blues:      [0, 4, 7],       // 1, 3, 5
  minor_blues:      [0, 3, 6, 7],    // 1, b3, b5(블루노트), 5

  // Modes — 특성음 중심
  dorian:           [0, 3, 7],       // 1, b3, 5 (옵션: 6도 = 9 추가)
  lydian:           [0, 4, 6],       // 1, 3, #4 — #4가 리디안 특성음
  mixolydian:       [0, 4, 10],      // 1, 3, b7 — b7이 믹솔리디안 특성음
  phrygian:         [0, 1, 3],       // 1, b2, b3 — b2가 프리지안 특성음
  locrian:          [0, 3, 6],       // 1, b3, b5 — b5가 로크리안 특성음

  // Minor variants
  harmonic_minor:   [0, 3, 7],       // 1, b3, 5
  melodic_minor:    [0, 3, 7],       // 1, b3, 5

  // 대칭 스케일 — 루트 중심성이 약하므로 최소 강조
  whole_tone:       [0],             // 루트만 (전부 온음이라 위계 없음)
  diminished_hw:    [0, 3],          // 1, b3
  diminished_wh:    [0, 3],          // 1, b3
};
```

#### 6.2.3 3단계 노트 마커 렌더링

| 단계 | 원 크기 비율 | 컬러 토큰 | 의미 |
|---|---|---|---|
| Root | 1.0 | `var(--color-scale-root)` | 스케일 1도 (fill + 진한 테두리) |
| Important | 0.8 | `var(--color-scale-important)` | IMPORTANT_DEGREES에 속한 도수 (연한 fill + 테두리) |
| Regular | 0.6 | `var(--color-scale-tone)` | 그 외 스케일 음 (outline only) |

`FretboardNote` 컴포넌트가 이 세 단계 중 하나를 prop으로 받아 렌더.

#### 6.2.4 유저 토글 UI
- 스케일 선택 패널 아래 "강조할 도수" 섹션
- 현재 스케일의 모든 도수가 pill 버튼 나열
- 기본값(IMPORTANT_DEGREES)은 활성 상태로 표시
- 클릭으로 추가/제거
- 결과는 localStorage에 스케일별로 저장: `fretboard.importantDegreesByScale`

#### 6.2.5 지판 모델 & 튜닝

표준 튜닝 먼저: 6→1번 줄 pitch class `[4, 9, 2, 7, 11, 4]`. 프렛 22 또는 24.

```typescript
interface FretboardConfig {
  tuning: number[];              // pitch class 배열, 6번줄부터
  frets: 22 | 24;
  handedness: 'right' | 'left';
  fretSpacing: 'uniform' | 'equal-temperament';
}
```

- `uniform` (기본): 모든 프렛 폭 균등 — 초보자 친화
- `equal-temperament`: `scaleLength * (1 - 1/2^(n/12))` 실제 기타 근사

좌/우 손잡이 전환은 SVG `scale(-1, 1)` + 텍스트 역변환.

#### 6.2.6 인터랙션
- Root 선택: 12음 chromatic wheel 또는 드롭다운
- 스케일 선택: 카테고리별 아코디언
- 라벨 모드: `'name' | 'degree' | 'none'` 토글
- 좌/우 손잡이 토글
- (선택) 지판 노트 클릭 시 샘플 재생 — Phase 2 후반

### 6.3 배킹 트랙

> **이 섹션은 Phase 5 이후에 다룹니다.** v1 구현 범위에 포함되지 않습니다. 설계를 미리 문서화하는 이유는, v1의 상태 구조·지판 컴포넌트 경계가 배킹 Phase에 호환되도록 초기부터 맞추기 위함입니다.

#### 6.3.1 구현 전략 비교

| 방식 | 장점 | 단점 | 시점 |
|---|---|---|---|
| A. 사전 녹음 오디오 + SoundTouchJS | 품질 보장 | 파일 용량, 음질 열화 | Phase 6 |
| B. 클라이언트 실시간 생성 (Tone.js 패턴 엔진) | BPM/Key 즉시, 동기화 완벽 | 사운드 프로그램화 | **Phase 5 기본** |
| C. 서버 AI 생성 (MusicGen) | 다양성 | 느림·비용·제어 난이도 | Phase 7 실험 |

**Phase 5는 B.** 코드 진행은 데이터, 악기는 샘플, 재생은 Tone.js Transport. 코드 진행이 데이터화되어 "현재 코드"를 항상 알 수 있고 지판 추천 동기화가 자연스럽다.

#### 6.3.2 코드 진행 템플릿 (예시)
```json
{
  "id": "12-bar-blues-major",
  "name": "12-Bar Blues (Major)",
  "category": "blues",
  "bars": 12,
  "timeSignature": "4/4",
  "defaultBpm": 90,
  "recommendedScales": ["major_blues", "minor_blues", "mixolydian"],
  "progression": [
    {"bar": 1, "chord": "I7"}, {"bar": 2, "chord": "I7"},
    {"bar": 3, "chord": "I7"}, {"bar": 4, "chord": "I7"},
    {"bar": 5, "chord": "IV7"}, {"bar": 6, "chord": "IV7"},
    {"bar": 7, "chord": "I7"}, {"bar": 8, "chord": "I7"},
    {"bar": 9, "chord": "V7"}, {"bar": 10, "chord": "IV7"},
    {"bar": 11, "chord": "I7"}, {"bar": 12, "chord": "V7"}
  ]
}
```

로마 숫자로 저장, 클라이언트에서 Key에 따라 실제 코드로 변환.

**Phase 5 카탈로그 (최소)**: Blues 12-bar Major/Minor/Quick-change, Pop I-V-vi-IV, 50s I-vi-IV-V, Jazz ii-V-I, Minor i-VI-III-VII, Dorian vamp, Lydian vamp, Mixolydian vamp, 펜타 연습용 단일 코드 vamp.

#### 6.3.3 현재 코드 → 지판 하이라이트

1. 선택 스케일 노트는 기본 표시 (`--color-scale-tone`)
2. 현재 코드의 **코드 톤**(1·3·5·7)에는 `--color-scale-chord` ring을 레이어로 추가
3. "Avoid note"는 옵션으로 회색 처리

Tone.js Transport의 `scheduleRepeat`/`Part` 이벤트에서 Zustand 스토어 `currentChord`를 업데이트 → 지판이 리렌더.

#### 6.3.4 메트로놈 관계
배킹 재생 시 메트로놈 자동 음소거(옵션, 기본 on). Transport는 같이 돌아 동기화 유지.

---

## 7. 영속화 & 데이터 모델

### 7.1 v1 영속화 (localStorage)

단일 키 `my-music-app:v1` 아래 JSON 스키마:

```typescript
interface PersistedState {
  version: 1;
  metronome: {
    bpm: number;
    timeSignature: { numerator: number; denominator: 2 | 4 | 8 };
    subdivision: SubdivisionType;
    soundType: SoundType;
    accentBeatOne: boolean;
    volume: number;
    // 런타임 상태(isPlaying, tapTimestamps)는 persist 제외
  };
  fretboard: {
    root: number;           // 0~11 pitch class
    scale: ScaleKey;
    importantDegreesByScale: Partial<Record<ScaleKey, number[]>>;
    labelMode: 'name' | 'degree' | 'none';
    handedness: 'right' | 'left';
    frets: 22 | 24;
    fretSpacing: 'uniform' | 'equal-temperament';
  };
  ui: {
    theme: 'dark' | 'light';
  };
}
```

- `version` 필드로 스키마 진화. `migrate` 함수에서 이전 버전 → 최신으로 변환.
- 총 용량 < 10KB 예상 (5MB 한도 대비 여유).
- 실패 시 기본값 폴백, localStorage 삭제 후 재시작.

### 7.2 배킹 Phase 데이터베이스 (Phase 5+)

```sql
-- 코드 진행 템플릿 (시드 데이터)
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

유저/프리셋 테이블은 **도입 안 함** (v0.2 결정).

### 7.3 배킹 Phase API (Phase 5+)

FastAPI `/api/v1/` 프리픽스:
- `GET /progression-templates` — 카테고리 필터
- `GET /progression-templates/{slug}` — 단건
- `GET /backing-tracks` — 키·모드·BPM 범위 필터 (Phase 6)
- `GET /backing-tracks/{id}/audio-url` — presigned URL
- `GET /health`

Pydantic 스키마를 `openapi-typescript`로 TS 타입 자동 생성.

---

## 8. 디렉토리 구조 (v1)

v1은 **단일 Next.js 앱**. 모노레포 구조(`apps/`, `packages/`)는 배킹 Phase에서 전환.

```
my-music-app/
├─ app/
│  ├─ layout.tsx                   # 폰트, 테마, 전역 클래스
│  ├─ page.tsx                     # 랜딩
│  └─ (practice)/
│     ├─ layout.tsx                # 연습 공통 레이아웃
│     ├─ metronome/page.tsx
│     ├─ fretboard/page.tsx
│     └─ jam/page.tsx              # 통합 뷰 (Phase 4)
├─ components/
│  ├─ metronome/
│  │  ├─ MetronomeClient.tsx
│  │  ├─ Pendulum.tsx
│  │  └─ BeatLED.tsx
│  ├─ fretboard/
│  │  ├─ Fretboard.tsx
│  │  ├─ FretboardString.tsx
│  │  └─ FretboardNote.tsx
│  └─ ui/                          # shadcn/ui 커스텀
├─ lib/
│  ├─ audio/
│  │  ├─ context.ts                # 단일 AudioContext
│  │  ├─ metronome-scheduler.ts
│  │  ├─ scheduler-worker.ts       # Web Worker
│  │  └─ samples/
│  ├─ theory/
│  │  ├─ scales.ts                 # SCALES, IMPORTANT_DEGREES
│  │  ├─ chords.ts                 # 로마 숫자 변환 (Phase 5)
│  │  ├─ notes.ts                  # 피치 클래스 연산
│  │  └─ fretboard.ts              # 지판 좌표 계산
│  └─ store/
│     └─ app-store.ts              # Zustand + persist
├─ tests/
│  ├─ unit/                        # Vitest
│  ├─ component/                   # Testing Library
│  └─ e2e/                         # Playwright
├─ docker/
│  └─ web.Dockerfile
├─ docker-compose.yml              # web 단일 (dev)
├─ docker-compose.test.yml         # web + playwright (CI)
├─ public/
│  └─ fonts/                       # Pretendard Variable
└─ docs/
   └─ planning.md
```

**배킹 Phase 전환 시** `apps/web/` + `apps/api/` 로 모노레포화 (pnpm workspaces). 현 v1 경로는 그대로 `apps/web/`로 이동.

---

## 9. 테스트 전략

### 9.1 v1 테스트

**Vitest (단위)**
- `lib/theory/**` — 커버리지 **100%**. `getScaleNotes('C', 'major')` = 7개, `getScaleNotes('F#', 'lydian')` 이명동음 검증, IMPORTANT_DEGREES 전 스케일 커버.
- `lib/audio/metronome-scheduler.ts` — `AudioContext` mock + `currentTime` 수동 조작, Spy로 예약 시각 배열 검증.
- Zustand 스토어 액션.

**Testing Library (컴포넌트)**
- 메트로놈 UI: BPM 입력, Tap 4회 → 계산 BPM.
- 지판: C major 선택 → 노트 7개 × 6줄 범위 내 정확 마커 수, Root 1개, Important 2개(4·5도), Regular 나머지.

**Playwright (E2E)**
- 3개 핵심 시나리오 자동화 (빠른 템포 / 모드 탐색 / (Phase 5+) 블루스).
- 스크린샷 리그레션 — 폰트 로드 대기 + `prefers-reduced-motion: reduce` 강제.

**오디오 타이밍 검증**
실제 출력 대신 Spy로 `scheduledEvents: Array<{time, type}>` 기록. 120BPM 4/4 10초 → 이벤트 80개, 간격 500ms ±1ms, Accent 20개.

### 9.2 배킹 Phase 테스트 (Phase 5+)

- pytest + pytest-asyncio + httpx AsyncClient
- testcontainers로 실제 Postgres 컨테이너 구동 + Alembic 적용
- MinIO 컨테이너로 presigned URL 발급 검증
- 커버리지 80%+

### 9.3 Docker 기반 통합 테스트

`docker-compose.test.yml`로 FE(+Phase 5부터는 BE) 올리고 Playwright 컨테이너가 E2E 수행. CI에서 `--exit-code-from playwright`.

---

## 10. Docker 환경

### 10.1 v1: docker-compose.yml (개발)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
      target: dev
    environment:
      NODE_ENV: development
    ports: ["3000:3000"]
    volumes:
      - "./:/app"
      - "/app/node_modules"
    command: pnpm dev
```

### 10.2 v1: docker-compose.test.yml (CI)

```yaml
services:
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
      target: runner
    environment:
      NODE_ENV: production
    ports: ["3000:3000"]
  playwright:
    image: mcr.microsoft.com/playwright:v1.50.0-jammy
    depends_on: [web]
    working_dir: /app
    volumes: ["./:/app"]
    command: pnpm exec playwright test
```

### 10.3 배킹 Phase 추가 서비스

Phase 5 진입 시 `docker-compose.yml`에 추가:
- `postgres:16-alpine`
- `minio/minio:latest`
- `api` (FastAPI)

Phase 전환 체크리스트:
- [ ] `docker-compose.yml`에 api/postgres/minio 서비스 추가
- [ ] `alembic init` + 초기 마이그레이션
- [ ] `apps/` 모노레포로 구조 이동
- [ ] Python 의존성(`pyproject.toml`) 추가
- [ ] CI에 backend 테스트 job 추가

---

## 11. CI/CD

GitHub Actions:
1. **lint**: eslint + prettier
2. **typecheck**: tsc --noEmit
3. **unit**: vitest (Docker 안에서)
4. **e2e**: `docker compose -f docker-compose.test.yml up --exit-code-from playwright`
5. **build**: Next.js 프로덕션 빌드 + 이미지 푸시 (main만)
6. **deploy**: Vercel 또는 Cloudflare Pages (v1) / Fly.io·Railway (Phase 5+)

---

## 12. 개발 로드맵 (재정렬)

### Phase 0 — 셋업 (3~5일)
- Next.js 15 + TypeScript + Tailwind v4 스켈레톤
- Pretendard + JetBrains Mono 로딩
- Zustand + persist 초기 설정
- Docker (web 단일) 구동
- CI 파이프라인 기본 (lint + unit + e2e 템플릿)
- 6개 에이전트 팀 활용 시작

### Phase 1 — 메트로놈 MVP (2주)
- [ ] BPM 20~300, 시그니처, Subdivision
- [ ] Sound type 5종
- [ ] Accent Beat 1 토글
- [ ] Volume, Tap tempo (최근 4회 평균)
- [ ] SVG 진자 애니메이션
- [ ] localStorage 저장 (`my-music-app:v1`)
- [ ] 키보드 단축키
- [ ] 오디오 타이밍 Spy 테스트

### Phase 2 — 지판 스케일 가이드 (2~3주)
- [ ] 지판 SVG 렌더러 (좌/우 손잡이, 프렛 22/24, 균등/12평균율)
- [ ] Root 선택 (chromatic wheel)
- [ ] Standard + Pentatonic 스케일 6종
- [ ] 3단계 노트 마커 (Root / Important / Regular)
- [ ] IMPORTANT_DEGREES 적용 + 유저 토글 UI
- [ ] 라벨 모드 (name/degree/none)
- [ ] 이론 계산 unit test 100%

### Phase 3 — 스케일 확장 (1주)
- [ ] 재즈/모드 스케일 10종 추가 (도리안, 리디안, 멜로딕/하모닉 마이너, 홀톤, 디미니쉬드 HW/WH, 프리지안, 로크리안, 믹솔리디안)
- [ ] 카테고리별 아코디언 UI
- [ ] 대칭 스케일 처리 (홀톤·디미니쉬드)

### Phase 4 — 통합 뷰 & 폴리시 (1주)
- [ ] `/jam` 라우트: 메트로놈 + 지판 한 화면
- [ ] 공통 BPM·Key 동기화 (단독 사용도 유지)
- [ ] 스크린샷 리그레션 정식 도입
- [ ] a11y 전면 점검
- [ ] Lighthouse Performance 90+, Accessibility 95+
- [ ] **Phase 4 끝: 인프라 스파이크 (2~3일)** — Phase 5 준비를 위한 Docker/API 골격

### Phase 5 — 배킹 트랙 기본 (3~4주, 백엔드 도입)
- [ ] FastAPI/Postgres/MinIO 컨테이너 추가
- [ ] 모노레포화
- [ ] Tone.js Transport + 패턴 엔진
- [ ] 코드 진행 카탈로그 (10개)
- [ ] 현재 코드 → 지판 하이라이트 (ring 레이어)
- [ ] 악기 믹서

### Phase 6 — 오디오 배킹 트랙 (3주, 선택)
- [ ] 사전 녹음 트랙 MinIO 업로드
- [ ] SoundTouchJS tempo/pitch 변환
- [ ] 카탈로그 UI

### Phase 7 — AI 생성 실험 (시점 미정)
- [ ] MusicGen 등 오픈소스 실험
- [ ] 생성 시간·품질 측정

---

## 13. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 브라우저 오토플레이 정책 | 메트로놈 첫 실행 안 됨 | 유저 제스처 후 `resume()`, 로딩 시 안내 UI |
| iOS Safari latency | 박자 어긋남 | `scheduleAheadTime`을 iOS에서 150ms로 상향 |
| 배킹 B(패턴) 사운드 품질 | "게임 BGM" 느낌 | 고품질 SFZ 샘플, Phase 6 사전 녹음 병행 |
| 음악 이론 데이터 정확성 | 잘못된 스케일은 치명적 | unit test 100% + music-theory-guardian 에이전트 게이트 |
| 지판 SVG 재렌더 성능 | UI 끊김 | 지판 그리드 useMemo, 색상만 클래스 토글 |
| 로컬 저장 스키마 변경 | 기존 유저 설정 손실 | `version` 필드 + `migrate` + 실패 시 기본값 폴백 |
| **Phase 4→5 백엔드 공백** | Phase 5 진입 시 인프라 설계 리스크 | **Phase 4 끝에 인프라 스파이크 2~3일** 선투자 |
| 폰트 로드 CLS | 시각적 흔들림 | `next/font/local` + `font-display: swap` + 용량 subset |

---

## 14. 열린 질문

1. **유저 계정** — **도입하지 않음** (v0.2 확정). 프리셋 공유 요구가 커지면 별도 논의.
2. **로컬스토리지 용량 한도** — 5MB 중 실사용 10KB 미만 예상. 문제 없음.
3. **다른 기기에서 설정 불러오기** — v2 고려. 설정 export/import JSON 파일 또는 QR 코드.
4. **커스텀 코드 진행** — v1 No, Phase 6+에서 고려.
5. **왼손잡이** — v1 포함 (대칭 변환만으로 구현 가능).
6. **오프라인 지원 (PWA)** — v2 고려.
7. **커스텀 튜닝** (Drop D, DADGAD, 7현) — v1 표준 튜닝만, Phase 3+ 확장.

---

## 15. 참고 자료

### 오디오 엔지니어링
- [A tale of two clocks — web.dev](https://web.dev/audio-scheduling/)
- [Chris Wilson metronome reference](https://github.com/cwilso/metronome)
- [A robust metronome using the Web Audio API](https://blog.paul.cx/post/metronome/)
- [Tone.js 공식 사이트](https://tonejs.github.io/)

### 배킹 트랙 / 오디오 처리 (Phase 5+)
- [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS)

### 지판 시각화
- [react-fretboard](https://github.com/devboell/react-fretboard) — 참고용, 실 구현은 자체
- [fretboard-visualiser](https://github.com/ChrisWilcox78/fretboard-visualiser)

### 디자인 레퍼런스
- Teenage Engineering 공식 — 하드웨어 악기 UI
- Ableton Learning Music — 인터랙티브 음악 UX
- Native Instruments Komplete Kontrol — 노브·디스플레이 감각

### 폰트
- [Pretendard (orioncactus/pretendard)](https://github.com/orioncactus/pretendard) — SIL OFL 1.1
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — Apache 2.0
