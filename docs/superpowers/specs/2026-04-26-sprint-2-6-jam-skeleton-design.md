# Sprint 2-6 — Jam Page Skeleton 설계

> **상태**: Draft (사용자 review 대기)
> **작성일**: 2026-04-26
> **다음 단계**: writing-plans skill로 Task-단위 implementation plan 작성

---

## 1. Goal (1줄)

Jam 페이지를 “메트로놈 + 지판 + 카탈로그 3섹션 vertical stack”에서 “지판(sticky) + 카탈로그(현재 마디 가시화)”로 재구성하고, 코드 오버레이의 chord-root를 chord-tone과 시각적으로 분리한다.

## 2. Scope

### 2.1 In-Scope

| ID | 항목 | 출처(사용자 요구) |
|----|------|--------|
| S-1 | Jam 페이지 본문에서 `<MetronomeClient />` 섹션 제거. `MetronomeDock`(헤더)는 그대로. | ① 구성 변경 |
| S-2 | Fretboard SVG 영역 sticky (`lg:` 이상). 컨트롤 그리드는 sticky 아님. | ④ 편의성 |
| S-3 | 카탈로그 카드 마디 strip을 전체 노출(`slice(0,8)+…` 제거). 현재 재생 중인 마디 시각 강조. | ⑤-1, ⑤-2, ⑤-3 |
| S-4 | 카드 코드 표시 케이스 통일 (소문자 `i7` → 대문자 `Im7` 등 — display layer에서만). | ⑤-5 |
| S-5 | 절대/상대 코드 표기 토글 — 카탈로그 상단 1개 토글 (전역 UI state). 예: `I7` ↔ `C7` (key=C). | ⑤-4 |
| S-6 | Chord Overlay sub-tier 도입: chord-root(빨강 ring) / chord-tone(다른 색 ring) 분리. SVG layer 둘로 분할. | ② 디테일 변경 (빨강 ring 분리만) |
| S-7 | 용어/토큰 재명명: `chord-tone-halo` → `chord-overlay`, `chordTonePcs` prop → `chordOverlay` 객체. | (코드 일관성) |

### 2.2 Out-of-Scope (다음 Sprint로 의도적 분리)

| 보류 항목 | 다음 Sprint |
|---|---|
| 스케일 외 chord tone 마커 표시 (`getFretboardNotes` 모델 확장) | 2-7 |
| 텐션(9, 11, 13) · 코드 quality별 색채음 매트릭스 | 2-7 |
| 장르별 RhythmRecipe (swing/shuffle/bossa/funk) | 2-8 |
| Voice 4번째 슬롯(piano/keys) 추가 | 2-8 |
| 카탈로그 50%+ 확장 + 블루스 세분류(시카고/텍사스/슬로우) | 2-9 |
| 음원 사운드폰트 교체 / 큐레이트 샘플 | 2-8 이후 (사용자 표현: “나중엔 결국 진행할거야”) |

> **이유**: Sprint 2-6은 UI 골격 + chord overlay tier 분리까지로 한정해 PR이 review-able한 크기로 유지됨. 음악 이론·오디오 도메인 깊이가 필요한 변경은 별도 Sprint에서 음악 이론 가디언/오디오 엔지니어 게이트를 거친다.

## 3. Terminology (코드/CSS/문서 통일)

| 한국어 | 영문 토큰 | 정의 | 갱신 시점 |
|---|---|---|---|
| **스케일 하이라이트** | `scale-highlight` | 사용자 root × scale로 결정되는 지판의 정적 노트 마커. tier: `root`/`orange`/`green`/`blue`/`regular`. | 사용자가 root/scale 변경 시 |
| **코드 오버레이** | `chord-overlay` | 배킹 재생 중 현재 마디의 코드를 지판 위에 ring 레이어로 표시. | 매 bar (배킹 엔진 onBar) |

**Chord Overlay sub-tier** (Sprint 2-6 도입 분):

| sub-tier | 시각 | 데이터 |
|---|---|---|
| `chord-root` | 빨강 ring (`var(--color-chord-overlay-root)` = 기존 `--color-scale-root`와 동일 hex) | 현재 코드의 root pitch class (1개) |
| `chord-tone` | 파랑(또는 시안) ring (`var(--color-chord-overlay-tone)` = 기존 `--color-scale-chord`와 동일 hex) | 현재 코드의 root 외 chord tones (2~3개) |

**Sprint 2-7에서 추가될 sub-tier**: `chord-tension`(9·11·13, dashed ring), `chord-color`(장르별 색채음, warm 토큰).

## 4. 페이지 레이아웃

### 4.1 변경 전 (현재)

```
[ Practice Layout Header (sticky, MetronomeDock 포함) ]
[ <main> ]
   [ § Metronome ]      ← 풀 컨트롤
   ──────────────
   [ § Fretboard ]      ← 풀 컨트롤
   ──────────────
   [ ProgressionCatalog ]
```

### 4.2 변경 후 (Sprint 2-6)

```
[ Practice Layout Header (sticky, MetronomeDock 그대로) ]
[ <main> ]
   [ Hero (h1 + subtitle) ]   ← 짧게 정리
   [ lg grid: 1fr ]
     [ § Fretboard SVG (lg:sticky, top=--header-height) ]
     [ § Fretboard Controls (RootPicker · ScalePicker · 등) ]
     [ § Backing Catalog (스크롤되는 메인 영역) ]
```

`MetronomeClient` 섹션 자체가 사라지고, fretboard SVG만 sticky. 헤더(`MetronomeDock` 포함)는 layout에서 이미 sticky이므로 변경 없음.

### 4.3 Sticky 구현

- `globals.css`에 CSS variable 추가: `--header-height: 56px;` (`(practice)/layout.tsx`의 `py-3` + 내부 컨텐츠 28px 기준).
- jam page 안에서 fretboard SVG 컨테이너:
  ```tsx
  <div className="lg:sticky lg:top-[var(--header-height)] z-[1] bg-bg-base">
    <Fretboard ... />
  </div>
  ```
- 모바일(`<lg`)에서는 sticky 해제 — 작은 화면에서 fretboard가 차지하는 비중이 너무 커 카탈로그가 가려짐.
- z-index 충돌 회피: 헤더 `z-10`, fretboard sticky `z-[1]`. RootPicker dropdown 등이 fretboard 위에 떠야 한다면 그건 컨트롤 영역(non-sticky)에 두므로 충돌 없음.

## 5. 데이터·함수 변경

### 5.1 신규 / 수정 함수

#### 5.1.1 `lib/theory/chord-display.ts` (신규)

배킹 카드의 코드 표기 정규화·절대 변환 전담. seed 데이터는 case-sensitive parser에 의존하므로 **표시 단계에서만** 변환한다.

```typescript
import type { PitchClass } from './types';

export type ChordDisplayMode = 'roman' | 'absolute';

/**
 * 로마 숫자 코드 표기를 “대문자 도수 + quality suffix” 형태로 정규화.
 * - i7 → Im7, iim7 → IIm7, V7 → V7, vii° → VII°
 * - 파싱 실패 시 원본 그대로 반환 (UI는 절대 깨지지 않게).
 */
export function normalizeRomanCase(symbol: string): string;

/**
 * 로마 숫자 → 키 적용 절대 코드 표기.
 * - 'I7' + key=0(C) → 'C7'
 * - 'V7' + key=2(D) → 'A7'
 * - 'iim7' + key=2(D) → 'Em7'
 * 파싱 실패 시 원본 그대로 반환.
 */
export function romanToAbsolute(symbol: string, keyRoot: PitchClass): string;

/**
 * 카드/UI에서 호출하는 단일 진입점.
 * mode='roman'이면 normalizeRomanCase, 'absolute'면 romanToAbsolute.
 */
export function displayChord(
  symbol: string,
  keyRoot: PitchClass,
  mode: ChordDisplayMode,
): string;
```

`parseRoman`(`lib/theory/chords.ts`)을 재사용해 quality 추출. quality → suffix 매핑은 양 함수에서 동일:

```
major          → ''
minor          → 'm'
diminished     → '°'
augmented      → '+'
major7         → 'maj7'
minor7         → 'm7'
dominant7      → '7'
diminished7    → '°7'
half_diminished7 → 'ø7'
minor_major7   → 'm(maj7)'
```

음 이름은 `getNoteName(rootPc, isFlatKey(keyRoot))` 사용 — 키 조표에 맞는 sharp/flat.

#### 5.1.2 `lib/theory/chord-voicing.ts` (수정)

기존 `chordPitchClassSet`을 **유지하면서**, 새로 chord-root 분리용 함수 추가:

```typescript
export interface ChordOverlay {
  /** 현재 코드의 root pitch class. 파싱 실패 시 null. */
  root: PitchClass | null;
  /** root를 제외한 chord tones (보통 2~3개). 파싱 실패 시 빈 Set. */
  tones: ReadonlySet<PitchClass>;
}

/**
 * Sprint 2-6 — Fretboard halo overlay를 chord-root / chord-tone 두 레이어로 분리.
 * - 첫 pitch class를 root로 해석 (parseRoman의 rootSemitones + keyRoot)
 * - 나머지 pitch class들을 tones Set에 담음
 * - 파싱 실패 시 { root: null, tones: empty Set } — UI는 그냥 halo 미표시.
 *
 * Sprint 2-7에서 tensions, color 필드가 추가될 자리. 호환성 유지 위해
 * 인터페이스 확장은 옵셔널 필드로만 한다.
 */
export function getChordOverlay(
  symbol: string,
  keyRoot: PitchClass,
): ChordOverlay;
```

`chordPitchClassSet`은 **deprecate 표시 후 제거** — 호출부는 `FretboardClient` 단 1곳이며 이 sprint에서 같이 갱신.

### 5.2 Store 변경

`AppState`의 `ui` 슬라이스 확장:

```typescript
// 기존
export interface UiState {
  theme: 'dark' | 'light';
}

// 변경
export interface UiState {
  theme: 'dark' | 'light';
  /**
   * 배킹 카탈로그의 코드 표기 모드.
   * 'roman': 도수 표기 (I, IV, V7) — 키와 무관한 보편 형태
   * 'absolute': 키 적용 표기 (C, F, G7) — 실제 음 이름
   * 사용자가 토글로 전환, persist에 포함.
   */
  chordDisplayMode: ChordDisplayMode;
}
```

신규 액션:

```typescript
setChordDisplayMode: (mode: ChordDisplayMode) => void;
```

#### 5.2.1 Persist migration (v7 → v8)

```typescript
if (version < 8) {
  const ui = (s.ui as Record<string, unknown>) ?? {};
  if (ui.chordDisplayMode !== 'absolute' && ui.chordDisplayMode !== 'roman') {
    ui.chordDisplayMode = 'roman'; // 기본값
  }
  s.ui = ui;
}
```

`partialize`에서 `ui` 그대로 통과하므로 추가 변경 없음.

### 5.3 컴포넌트 변경

| 파일 | 변경 |
|---|---|
| `apps/web/app/(practice)/jam/page.tsx` | `<MetronomeClient />` 섹션 제거. Hero 텍스트 다듬기. Fretboard sticky 컨테이너로 감쌈. import 정리. |
| `apps/web/components/fretboard/Fretboard.tsx` | prop `chordTonePcs?` → `chordOverlay?: ChordOverlay`로 교체. SVG halo group 둘로 분할 (root layer + tones layer). |
| `apps/web/components/fretboard/FretboardClient.tsx` | `chordPitchClassSet` 호출 → `getChordOverlay`로 교체. prop 패스 갱신. |
| `apps/web/components/fretboard/FretboardNote.tsx` | `isChordTone` prop 유지(memo trigger 용). 별도 변경 없음. |
| `apps/web/components/jam/ProgressionCatalogClient.tsx` | <ul>(1) `slice(0,8)+…` 제거 → `flex-wrap`<br>(2) 현재 마디 칩 강조<br>(3) 절대/상대 토글 컴포넌트 카탈로그 헤더에 추가<br>(4) `displayChord(step.chord, key, mode)` 호출로 모든 칩 표시</ul> |
| `apps/web/components/jam/ChordDisplayModeToggle.tsx` (신규) | 'I' / 'A' 두 버튼 toggle group. clientside, store 액션 직접 호출. |
| `apps/web/components/jam/ProgressionPlayButton.tsx` | 재생 중 보조 텍스트(`I7 · bar 3/12`)도 `displayChord` 적용. |
| `apps/web/app/globals.css` | `--header-height` 변수 + `--color-chord-overlay-root` / `--color-chord-overlay-tone` 토큰 alias. `.chord-tone-halo` 클래스 → `.chord-overlay`로 rename (애니메이션 동일). |

## 6. 데이터 흐름 (Chord Overlay 갱신)

```
배킹 엔진 (engine.ts)
   └ onBar 콜백 (eventTime + setTimeout 동기화)
        └ setState({ status: 'playing', chordSymbol, ... })
              └ subscribe → useAppStore._setBackingCurrentChord({ symbol, barIndex })
                    └ FretboardClient의 selector (.symbol만)
                          └ useMemo(getChordOverlay(symbol, backingKey))
                                └ <Fretboard chordOverlay={overlay} chordSymbol={symbol} />
                                      └ SVG group key={chordSymbol} → re-mount → CSS animation 0%부터
                                            ├ <g> chord-root layer (red ring on root pc positions)
                                            └ <g> chord-tone layer (blue ring on tone pc positions)
```

기존 흐름과 동일, 다만 마지막 SVG layer가 두 개로 분할.

ProgressionCatalogClient의 “현재 마디 강조”도 **같은 store 셀렉터**(`backingPlayingSlug`, `backingCurrentChord.barIndex`)를 구독해 카드별로 분기:

```tsx
// 카드 안에서:
const isPlayingThisCard = backingPlayingSlug === t.slug;
const currentBarIndex = isPlayingThisCard ? backingCurrentChord?.barIndex ?? null : null;

// 칩 렌더:
{t.progression.map((step, idx) => {
  const isCurrent = currentBarIndex === idx;
  return (
    <span
      key={idx}
      className={clsx(
        'border px-1.5 py-[1px] tabular-nums transition-colors duration-75',
        isCurrent
          ? 'border-accent-brass bg-accent-brass/10 text-accent-brass font-bold'
          : 'border-ink-muted/15 text-ink-secondary',
      )}
    >
      {displayChord(step.chord, backingKey, chordDisplayMode)}
    </span>
  );
})}
```

## 7. CSS / 디자인 토큰 변경

### 7.1 globals.css 추가/수정

```css
@theme {
  /* 기존 ... */

  /* ── Layout ───────────────────────────────────── */
  /* (practice)/layout.tsx 헤더의 실측 높이.
     py-3(12+12=24) + 컨텐츠 max-height(28~32 — Dock 버튼) ≈ 52~56px.
     Sprint 2-6에서 56으로 고정. 헤더 디자인 변경 시 같이 갱신. */
  --header-height: 56px;

  /* ── Chord overlay tokens (Sprint 2-6) ─────────
     Sprint 2-7에서 chord-tension, chord-color 추가 예정. */
  --color-chord-overlay-root: var(--color-scale-root);
  --color-chord-overlay-tone: var(--color-scale-chord);
}
```

### 7.2 클래스 rename

```css
/* 기존 */
.chord-tone-halo { animation: chord-tone-pulse 0.6s ease-out forwards; }

/* 변경 */
.chord-overlay { animation: chord-overlay-pulse 0.6s ease-out forwards; }
@keyframes chord-overlay-pulse {
  0%   { opacity: 0; }
  20%  { opacity: 0.85; }   /* root layer 가독성 위해 0.75 → 0.85 */
  100% { opacity: 0.6; }    /* 0.5 → 0.6 (root ring이 너무 흐려지지 않도록) */
}
```

> 불투명도를 살짝 올린 이유: chord-root ring이 빨간색이라 0.5에서는 어두운 배경에서 가독성이 떨어짐. WCAG 비-필수 장식 0.5 하한 규율은 chord-tone(파랑) layer 한정으로 0.6.

## 8. SVG 레이어 구조 (Fretboard)

```tsx
{chordOverlay && (chordOverlay.root !== null || chordOverlay.tones.size > 0) && (
  <g key={chordSymbol ?? 'idle-chord'} className="chord-overlay" aria-hidden="true">
    {/* Layer 1: chord-root — 빨강 ring */}
    {chordOverlay.root !== null && (
      <g data-overlay-tier="chord-root">
        {notes
          .filter((n) => n.pitchClass === chordOverlay.root)
          .map((n) => (
            <circle
              key={`overlay-root-${n.string}-${n.fret}`}
              cx={mirrorX(fretCenterX(n.fret))}
              cy={stringY(n.string)}
              r={UNIFORM_FRET_WIDTH * HALO_RADIUS_RATIO}
              fill="none"
              stroke="var(--color-chord-overlay-root)"
              strokeWidth={2.5}
            />
          ))}
      </g>
    )}
    {/* Layer 2: chord-tone — 다른 색 ring */}
    {chordOverlay.tones.size > 0 && (
      <g data-overlay-tier="chord-tone">
        {notes
          .filter((n) => chordOverlay.tones.has(n.pitchClass))
          .map((n) => (
            <circle
              key={`overlay-tone-${n.string}-${n.fret}`}
              cx={mirrorX(fretCenterX(n.fret))}
              cy={stringY(n.string)}
              r={UNIFORM_FRET_WIDTH * HALO_RADIUS_RATIO}
              fill="none"
              stroke="var(--color-chord-overlay-tone)"
              strokeWidth={2}
            />
          ))}
      </g>
    )}
  </g>
)}
```

- 같은 fret이 chord-root + 스케일 root (둘 다 빨강) 인 경우: scale 마커가 빨강 fill, overlay가 빨강 ring → 자연스러운 “겹침 강조”. 의도됨.
- chord root는 stroke 0.5 더 두껍게(2.5 vs 2.0) — 시각적 우선순위.

## 9. 테스트 전략

### 9.1 단위 (Vitest)

| 파일 | 케이스 |
|---|---|
| `tests/unit/lib/theory/chord-display.test.ts` (신규) | normalizeRomanCase: i7→Im7, V7→V7, vii°→VII°, iim7→IIm7, 파싱 실패→원본 / romanToAbsolute: I@C→C, V7@D→A7, iim7@D→Em7, isFlatKey 처리 / displayChord dispatch |
| `tests/unit/lib/theory/chord-voicing.test.ts` (수정) | getChordOverlay: I@C → root=0, tones={4,7} / V7@C → root=7, tones={11,2,5} / 파싱실패 → root=null, tones=empty |
| `tests/unit/lib/store/app-store.test.ts` (수정) | setChordDisplayMode 액션 / persist v7→v8 migrate 기본값 'roman' / 잘못된 값 → 'roman'으로 정정 |

### 9.2 컴포넌트 (Testing Library)

| 파일 | 케이스 |
|---|---|
| `tests/component/jam/ChordDisplayModeToggle.test.tsx` (신규) | 'I'/'A' 토글 클릭 → store 액션 dispatch, aria-pressed 반영 |
| `tests/component/jam/ProgressionCatalogClient.test.tsx` (신규) | (1) 12-bar blues 카드에 모든 12 step 칩 렌더 (slice 없음) (2) 재생 중 barIndex=2일 때 3번째 칩만 강조 클래스 (3) mode='absolute' + key=2(D) → 칩 텍스트 `'D7'` (4) mode='roman' + i7 입력 → 칩 텍스트 `'Im7'` |
| `tests/component/fretboard/Fretboard.test.tsx` (수정) | chordOverlay prop 입력 시 SVG에 chord-root group 1개 + chord-tone group 1개 모두 존재 / chordOverlay=undefined면 그룹 자체 미존재 / aria-hidden=true |

### 9.3 E2E (Playwright)

| 파일 | 케이스 |
|---|---|
| `tests/e2e/jam-skeleton.spec.ts` (신규) | (1) /jam에 메트로놈 영역 없음 (2) MetronomeDock(헤더)는 존재 (3) Fretboard 컨테이너에 sticky 클래스 적용 (lg viewport) (4) 12-bar blues 카드 ▶ → 첫 마디 강조, 다음 마디로 이동 시 강조 이동 (5) 절대/상대 토글 클릭 → 칩 텍스트 변경 |

> 9.3은 docker-compose.test.yml로 실행. 로컬 Playwright는 libnspr4 의존성 이슈로 미사용.

### 9.4 회귀 방지

기존 `tests/component/fretboard/Fretboard.test.tsx`의 `chordTonePcs` prop 테스트는 prop rename으로 깨짐. 새 prop으로 동등 테스트 추가 후 기존 케이스 삭제.

## 10. 리스크 / 트레이드오프

| 리스크 | 완화 |
|---|---|
| Fretboard sticky가 모바일에서 화면을 가림 | `lg:` breakpoint에서만 sticky. 모바일은 일반 흐름. |
| chord-overlay rename으로 기존 테스트가 한꺼번에 빨강 | grep으로 `chordTonePcs`/`chord-tone-halo` 호출 위치 모두 식별 후 일괄 갱신 (FretboardClient + Fretboard + 테스트 2~3건). |
| `--header-height` 하드코딩 56px가 디자인 변경 시 어긋남 | 헤더 컴포넌트에 주석으로 “이 높이 바꾸면 globals.css의 --header-height도 갱신” 명시. |
| 절대/상대 토글의 표기가 사용자 키 변경 시 카드별 모두 재렌더 | chordDisplayMode + backingKey 둘 다 store top-level이라 toggle 또는 key 변경 시 전체 재렌더. 카탈로그 카드 11개 × 진행 평균 6마디 → 60~70 칩 재렌더, 측정 시 16ms 안. 별도 최적화 없이 진행. |
| chord overlay sub-tier 분리 후 색맹 사용자에게 두 ring 구분이 어려움 | 추후 stroke-dasharray·stroke-width 차별화 검토. Sprint 2-6은 hex 차이 + 두께 차이로 시작. |
| 사용자 인지 “root가 파란색”이 stroke 두께 부족 때문일 가능성 | chord-root strokeWidth 2.5 (2.0 → 2.5), 불투명도 0.6으로 올림. 그래도 부족하면 2-7에서 ring 안쪽 inner-fill 시도. |

## 11. 후속 Sprint와의 연결

- **Sprint 2-7 (Smart Highlighting Domain)**: `getChordOverlay`의 반환 인터페이스에 옵셔널 필드(`tensions`, `color`) 추가. SVG layer 2개 추가. `getFretboardNotes`가 “스케일 외 chord-compat PC”도 포함하도록 모델 확장. 이때 음악 이론 가디언 게이트 필수.
- **Sprint 2-8 (Rhythm Recipes)**: `engine.ts`의 패턴 import 하드코딩 제거 → `getRhythmRecipe(category)` dispatch. 신규 패턴 파일 4종 + voice 4번째 슬롯(keys).
- **Sprint 2-9 (Catalog Expansion)**: seed 데이터 확장. 카테고리 세분류(`blues_chicago`, `blues_texas`, `blues_slow`, `funk`, `bossa`)는 백엔드 enum + 프론트 라벨 둘 다 갱신.

이 spec의 Out-of-Scope 표(2.2)와 1:1 매칭.

## 12. 의도적으로 다루지 않는 것

- **메트로놈 자체 변경**: dock/풀 페이지 모두 그대로. jam 본문 배치만 변경.
- **배킹 엔진의 BPM/timing 로직**: Sprint 2-5에서 안정화됨. 변경 없음.
- **BackgroundColor / 폰트 / 디자인 토큰 추가**: chord overlay 토큰 alias만 추가, 새 hex 정의 없음.
- **카탈로그 데이터**: seed 변경 없음. 표기 정규화는 display layer.
- **Music theory 데이터**: SCALES, IMPORTANT_DEGREES, chords parser 모두 변경 없음. chord-display는 신규 파일이지만 기존 parseRoman을 reader로만 사용.

---

## Appendix A — Sprint 2-6 변경 파일 요약

### 신규
- `apps/web/lib/theory/chord-display.ts`
- `apps/web/components/jam/ChordDisplayModeToggle.tsx`
- `tests/unit/lib/theory/chord-display.test.ts`
- `tests/component/jam/ChordDisplayModeToggle.test.tsx`
- `tests/component/jam/ProgressionCatalogClient.test.tsx`
- `tests/e2e/jam-skeleton.spec.ts`

### 수정
- `apps/web/app/(practice)/jam/page.tsx`
- `apps/web/components/fretboard/Fretboard.tsx`
- `apps/web/components/fretboard/FretboardClient.tsx`
- `apps/web/components/jam/ProgressionCatalogClient.tsx`
- `apps/web/components/jam/ProgressionPlayButton.tsx`
- `apps/web/lib/theory/chord-voicing.ts`
- `apps/web/lib/store/app-store.ts`
- `apps/web/app/globals.css`
- `tests/component/fretboard/Fretboard.test.tsx`
- `tests/unit/lib/theory/chord-voicing.test.ts`
- `tests/unit/lib/store/app-store.test.ts`

### 제거
- `chordPitchClassSet` (chord-voicing.ts) — 호출부 1곳이라 이 sprint에서 깨끗이.
- `.chord-tone-halo` 클래스 (globals.css) — `.chord-overlay`로 rename.

총 신규 6 + 수정 11 = 17 파일 영향. 기능 한 단위인 PR 크기로 충분히 review-able.

## Appendix B — 변환 함수 예시 (chord-display.ts)

```typescript
// normalizeRomanCase('i7') → 'Im7'
// normalizeRomanCase('iim7') → 'IIm7'
// normalizeRomanCase('V7') → 'V7'
// normalizeRomanCase('vii°') → 'VII°'
// normalizeRomanCase('Imaj7') → 'Imaj7'

// romanToAbsolute('I7', 0) → 'C7'
// romanToAbsolute('V7', 2) → 'A7'   (D 키의 V = A)
// romanToAbsolute('iim7', 2) → 'Em7' (D 키의 ii = E minor)
// romanToAbsolute('vi', 0) → 'Am'   (C 키의 vi = A minor)
// romanToAbsolute('IV', 7) → 'C'    (G 키의 IV = C)
```

플랫 키(5=F, 10=Bb, 3=Eb, 8=Ab, 1=Db) 처리는 `isFlatKey` 결과로 sharp/flat 자동 선택. C7 vs Bb7 같은 키-의존 표기는 `getNoteName(rootPc, isFlatKey(keyRoot))`이 담당.
