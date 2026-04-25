# Sprint 2-6 Jam Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec reference:** 작업 전 반드시 `docs/superpowers/specs/2026-04-26-sprint-2-6-jam-skeleton-design.md`를 통독해 용어(Scale Highlight / Chord Overlay), Out-of-Scope 경계, sub-tier 정의를 숙지한다. plan은 spec의 §섹션을 참조 형태로 인용한다.

**Goal:** Jam 페이지를 “지판(sticky) + 배킹 카탈로그” 두 영역으로 재구성하고, chord overlay를 chord-root(빨강 ring) / chord-tone(파랑 ring) 두 layer로 분리한다.

**Architecture:** spec §4(레이아웃) §6(데이터 흐름) §8(SVG 구조) 참조. 핵심 흐름은 *기존과 동일*: 배킹 엔진 onBar → store → FretboardClient selector → Fretboard SVG. 변경점은 ① jam page 본문 스택 ② chord overlay 단일 prop → 분리 객체 ③ display layer에 chord-display 정규화 ④ 마디 strip 전체 노출.

**Tech Stack:** Next.js 15 App Router · Zustand persist · Tailwind v4 `@theme` · Vitest + Testing Library · Playwright(Docker).

**Branch:** `feat/sprint-2-6-jam-skeleton` (이 plan을 실행하는 base 브랜치). Spec은 `docs/sprint-2-6-spec` 별도 브랜치에 있으며 main에 머지 후 위 브랜치를 main에서 분기한다.

**Tasks order (의존성 만족):**

```
T1 chord-display.ts ──┐                            ┌─ T7 ChordDisplayModeToggle ──┐
T2 getChordOverlay  ──┼─ (theory layer) ─────────┐ │                                ├─ T10 jam/page.tsx ─ T11 E2E
T3 store mode + v8  ──┘                          │ ├─ T8 ProgressionCatalogClient ─┘
T4 globals.css       ──────────────────────────  │ │
T5 Fretboard.tsx                  ──────────────┐│ └─ T9 ProgressionPlayButton
T6 FretboardClient                ──────────────┴┘
```

각 Task는 TDD: 테스트 → 실패 확인 → 구현 → 통과 확인 → typecheck/lint → commit.

---

## Task 1: chord-display.ts (theory layer 순수 함수)

**Spec ref:** §5.1.1, Appendix B

**Files:**
- Create: `apps/web/lib/theory/chord-display.ts`
- Test: `apps/web/tests/unit/lib/theory/chord-display.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/tests/unit/lib/theory/chord-display.test.ts
import { describe, it, expect } from 'vitest';

import {
  normalizeRomanCase,
  romanToAbsolute,
  displayChord,
} from '@/lib/theory/chord-display';

describe('normalizeRomanCase', () => {
  it('대문자 도수는 그대로 유지', () => {
    expect(normalizeRomanCase('I')).toBe('I');
    expect(normalizeRomanCase('V7')).toBe('V7');
    expect(normalizeRomanCase('Imaj7')).toBe('Imaj7');
  });

  it('소문자 도수는 대문자 + m suffix', () => {
    expect(normalizeRomanCase('i')).toBe('Im');
    expect(normalizeRomanCase('i7')).toBe('Im7');
    expect(normalizeRomanCase('iim7')).toBe('IIm7');
    expect(normalizeRomanCase('vi')).toBe('VIm');
  });

  it('quality 접미사 정확히 보존', () => {
    expect(normalizeRomanCase('vii°')).toBe('VII°');
    expect(normalizeRomanCase('iiø7')).toBe('IIø7');
    expect(normalizeRomanCase('III+')).toBe('III+');
  });

  it('파싱 실패 시 원본 반환 (UI 무손상)', () => {
    expect(normalizeRomanCase('???')).toBe('???');
    expect(normalizeRomanCase('')).toBe('');
  });
});

describe('romanToAbsolute', () => {
  it('C 키 (0) — 도수가 절대 음으로 변환', () => {
    expect(romanToAbsolute('I', 0)).toBe('C');
    expect(romanToAbsolute('I7', 0)).toBe('C7');
    expect(romanToAbsolute('IV', 0)).toBe('F');
    expect(romanToAbsolute('V7', 0)).toBe('G7');
    expect(romanToAbsolute('vi', 0)).toBe('Am');
  });

  it('D 키 (2) — 도수 적용', () => {
    expect(romanToAbsolute('I', 2)).toBe('D');
    expect(romanToAbsolute('V7', 2)).toBe('A7');
    expect(romanToAbsolute('iim7', 2)).toBe('Em7');
  });

  it('플랫 키 — flat 표기 우선', () => {
    // F 키 (5) — flat 키
    expect(romanToAbsolute('I', 5)).toBe('F');
    expect(romanToAbsolute('IV', 5)).toBe('Bb');
    // Bb 키 (10)
    expect(romanToAbsolute('I', 10)).toBe('Bb');
    expect(romanToAbsolute('IV', 10)).toBe('Eb');
  });

  it('파싱 실패 시 원본', () => {
    expect(romanToAbsolute('???', 0)).toBe('???');
  });
});

describe('displayChord (dispatch)', () => {
  it('mode=roman → normalizeRomanCase', () => {
    expect(displayChord('i7', 0, 'roman')).toBe('Im7');
  });
  it('mode=absolute → romanToAbsolute', () => {
    expect(displayChord('i7', 0, 'absolute')).toBe('Cm7');
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chord-display.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement chord-display.ts**

```typescript
// apps/web/lib/theory/chord-display.ts

/*
 * 코드 심볼 표기 정규화 + 절대 변환.
 *
 * Sprint 2-6 — 카탈로그 카드/재생 버튼이 사용자에게 코드를 보여줄 때 단일 진입점.
 * seed 데이터는 case-sensitive parser(parseRoman)에 의존하므로 표기 변환은
 * 표시 단계에서만. seed/엔진/이론 데이터는 변경하지 않는다.
 */

import type { ChordQuality } from './chords';
import { parseRoman } from './chords';
import { getNoteName, isFlatKey, pitchClassFromRoot } from './notes';
import type { PitchClass } from './types';

export type ChordDisplayMode = 'roman' | 'absolute';

const UPPER_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: '°',
  augmented: '+',
  major7: 'maj7',
  minor7: 'm7',
  dominant7: '7',
  diminished7: '°7',
  half_diminished7: 'ø7',
  minor_major7: 'm(maj7)',
};

export function normalizeRomanCase(symbol: string): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const upper = UPPER_ROMAN[parsed.degree - 1];
  if (!upper) return symbol;
  return upper + QUALITY_SUFFIX[parsed.quality];
}

export function romanToAbsolute(symbol: string, keyRoot: PitchClass): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const rootPc = pitchClassFromRoot(keyRoot, parsed.rootSemitones);
  const noteName = getNoteName(rootPc, isFlatKey(keyRoot));
  return noteName + QUALITY_SUFFIX[parsed.quality];
}

export function displayChord(
  symbol: string,
  keyRoot: PitchClass,
  mode: ChordDisplayMode,
): string {
  return mode === 'absolute'
    ? romanToAbsolute(symbol, keyRoot)
    : normalizeRomanCase(symbol);
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chord-display.test.ts`
Expected: 12+ tests PASS.

- [ ] **Step 5: typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/chord-display.ts apps/web/tests/unit/lib/theory/chord-display.test.ts
git commit -m "feat(theory): add chord-display utilities for case normalization and key absolutization"
```

---

## Task 2: getChordOverlay + chordPitchClassSet 제거

**Spec ref:** §5.1.2

**Files:**
- Modify: `apps/web/lib/theory/chord-voicing.ts`
- Test: `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`

- [ ] **Step 1: Write failing tests for getChordOverlay**

```typescript
// 추가 — 기존 테스트 파일 끝부분에 append:
import { getChordOverlay } from '@/lib/theory/chord-voicing';

describe('getChordOverlay', () => {
  it('I in C → root=0, tones={4,7}', () => {
    const overlay = getChordOverlay('I', 0);
    expect(overlay.root).toBe(0);
    expect([...overlay.tones].sort()).toEqual([4, 7]);
  });

  it('V7 in C → root=7, tones={11,2,5}', () => {
    const overlay = getChordOverlay('V7', 0);
    expect(overlay.root).toBe(7);
    expect([...overlay.tones].sort((a, b) => a - b)).toEqual([2, 5, 11]);
  });

  it('IV in G (key=7) → root=0, tones={4,7}', () => {
    // G 키의 IV = C → root pc=0, tones={E=4, G=7}
    const overlay = getChordOverlay('IV', 7);
    expect(overlay.root).toBe(0);
    expect([...overlay.tones].sort()).toEqual([4, 7]);
  });

  it('파싱 실패 → root=null, tones=empty', () => {
    const overlay = getChordOverlay('???', 0);
    expect(overlay.root).toBeNull();
    expect(overlay.tones.size).toBe(0);
  });
});
```

또한 기존 `chordPitchClassSet` 테스트는 함수가 사라지므로 삭제 (Step 3에서 처리).

- [ ] **Step 2: Run tests, verify new tests FAIL**

Run: `cd apps/web && pnpm test tests/unit/lib/theory/chord-voicing.test.ts`
Expected: 4 new tests FAIL with import error.

- [ ] **Step 3: Implement getChordOverlay + remove chordPitchClassSet**

`apps/web/lib/theory/chord-voicing.ts` 수정:

1) **추가** — 파일 하단에:

```typescript
import type { PitchClass } from './types';
// (이미 import 되어 있음)

export interface ChordOverlay {
  /** 현재 코드의 root pitch class. 파싱 실패 시 null. */
  root: PitchClass | null;
  /** root를 제외한 chord tones (보통 2~3개). 파싱 실패 시 빈 Set. */
  tones: ReadonlySet<PitchClass>;
}

/**
 * Sprint 2-6 — Fretboard halo overlay를 chord-root / chord-tone 두 레이어로 분리.
 * 파싱 실패 시 { root: null, tones: empty Set } — 호출부는 halo 미표시 분기.
 *
 * Sprint 2-7에서 tensions, color 옵셔널 필드 추가 예정.
 */
export function getChordOverlay(
  symbol: string,
  keyRoot: PitchClass,
): ChordOverlay {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (!pcs || pcs.length === 0) {
    return { root: null, tones: new Set() };
  }
  const [root, ...rest] = pcs;
  return {
    root: root as PitchClass,
    tones: new Set(rest),
  };
}
```

2) **제거** — 기존 `chordPitchClassSet` 함수 + 그 테스트.
   - chord-voicing.ts 안의 `export function chordPitchClassSet ...` 블록 삭제.
   - chord-voicing.test.ts 안의 `describe('chordPitchClassSet', ...)` 블록 삭제.

> 호출부(`FretboardClient`)는 Task 6에서 갱신. 지금 이 단계에서 빌드를 깨면 Task 6까지 빌드가 안 되므로 임시로 두 함수 모두 유지하는 옵션도 있다. 하지만 각 task가 독립적으로 통과하도록 — typecheck를 위해 FretboardClient에서 chordPitchClassSet 호출을 임시로 getChordOverlay 기반으로 *직접* 교체하는 1줄 변경을 같이 한다.

`apps/web/components/fretboard/FretboardClient.tsx`에서:
```typescript
// 변경 전
import { chordPitchClassSet } from '@/lib/theory/chord-voicing';
// ... 안에서:
const chordTonePcs = useMemo(() => {
  if (!isBackingActive || !currentChordSymbol) return undefined;
  return chordPitchClassSet(currentChordSymbol, backingKey) ?? undefined;
}, [isBackingActive, currentChordSymbol, backingKey]);
```
```typescript
// 변경 후 (Task 2 끝까지 동작 유지용 임시. Task 6에서 chordOverlay로 정식 교체)
import { getChordOverlay } from '@/lib/theory/chord-voicing';
// ... 안에서:
const chordTonePcs = useMemo(() => {
  if (!isBackingActive || !currentChordSymbol) return undefined;
  const overlay = getChordOverlay(currentChordSymbol, backingKey);
  if (overlay.root === null && overlay.tones.size === 0) return undefined;
  // 기존 단일 set 의미 유지 — root + tones 합집합
  const all = new Set<number>(overlay.tones);
  if (overlay.root !== null) all.add(overlay.root);
  return all;
}, [isBackingActive, currentChordSymbol, backingKey]);
```

이렇게 하면 Fretboard 동작은 변동 없이 유지되며 Task 6에서 prop 인터페이스를 변경해 정식 분리.

- [ ] **Step 4: Run all theory + fretboard tests, verify PASS**

```bash
cd apps/web
pnpm test tests/unit/lib/theory/chord-voicing.test.ts
pnpm test tests/component/fretboard
```
Expected: all PASS.

- [ ] **Step 5: typecheck + lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/chord-voicing.ts \
        apps/web/tests/unit/lib/theory/chord-voicing.test.ts \
        apps/web/components/fretboard/FretboardClient.tsx
git commit -m "feat(theory): add getChordOverlay and remove chordPitchClassSet"
```

---

## Task 3: store에 chordDisplayMode 추가 + persist v7→v8

**Spec ref:** §5.2

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Test: `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// app-store.test.ts에 추가:
import { __migrate } from '@/lib/store/app-store';

describe('chordDisplayMode (Sprint 2-6)', () => {
  it('기본값은 roman', () => {
    const store = useAppStore.getState();
    expect(store.ui.chordDisplayMode).toBe('roman');
  });

  it('setChordDisplayMode로 변경', () => {
    const { setChordDisplayMode } = useAppStore.getState();
    setChordDisplayMode('absolute');
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('absolute');
    setChordDisplayMode('roman');
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('roman');
  });
});

describe('persist migrate v7 → v8', () => {
  it('chordDisplayMode 없는 상태에 기본값 주입', () => {
    const v7State = {
      ui: { theme: 'dark' },
      backing: { backingKey: 0, backingPlayingSlug: null, backingCurrentChord: null, bpmOverrides: {} },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('roman');
  });

  it('잘못된 chordDisplayMode 값은 roman으로 정정', () => {
    const v7State = {
      ui: { theme: 'dark', chordDisplayMode: 'INVALID' },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('roman');
  });

  it('이미 absolute로 설정된 경우 보존', () => {
    const v7State = {
      ui: { theme: 'dark', chordDisplayMode: 'absolute' },
    };
    const migrated = __migrate(v7State, 7) as { ui: { chordDisplayMode: string } };
    expect(migrated.ui.chordDisplayMode).toBe('absolute');
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `cd apps/web && pnpm test tests/unit/lib/store/app-store.test.ts`
Expected: 5 new tests FAIL.

- [ ] **Step 3: Implement store changes**

`apps/web/lib/store/app-store.ts`:

1) `ChordDisplayMode` 타입 import:
```typescript
import type { ChordDisplayMode } from '@/lib/theory/chord-display';
```

2) `UiState` 확장:
```typescript
export interface UiState {
  theme: 'dark' | 'light';
  chordDisplayMode: ChordDisplayMode;
}
```

3) `DEFAULT_UI`:
```typescript
const DEFAULT_UI: UiState = {
  theme: 'dark',
  chordDisplayMode: 'roman',
};
```

4) `AppState`에 액션 추가:
```typescript
setChordDisplayMode: (mode: ChordDisplayMode) => void;
```

5) immer 안에 액션 구현:
```typescript
setChordDisplayMode: (mode) =>
  set((s) => {
    s.ui.chordDisplayMode = mode;
  }),
```

6) `migrate` 함수에 v7 → v8 분기 추가 (기존 v6→v7 블록 다음):
```typescript
// v7 → v8: ui.chordDisplayMode 추가. 잘못된 값(undefined/문자열 외)은 'roman'으로 정정.
if (version < 8) {
  const ui = (s.ui as Record<string, unknown>) ?? {};
  if (ui.chordDisplayMode !== 'absolute' && ui.chordDisplayMode !== 'roman') {
    ui.chordDisplayMode = 'roman';
  }
  s.ui = ui;
}
```

7) persist config의 `version: 7` → `version: 8` 변경.

8) `partialize`의 `ui` 통과는 그대로 (객체 전체 통과).

- [ ] **Step 4: Run tests, verify PASS**

`cd apps/web && pnpm test tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 5: typecheck + lint + 전체 테스트**

```bash
cd apps/web && pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/app-store.test.ts
git commit -m "feat(store): add ui.chordDisplayMode with persist v8 migration"
```

---

## Task 4: globals.css 토큰 + 클래스 rename

**Spec ref:** §7

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add tokens and rename class**

`apps/web/app/globals.css` 변경:

1) `@theme` 블록 안 마지막에 토큰 추가:
```css
  /* ── Layout ───────────────────────────────────── */
  /* (practice)/layout.tsx 헤더 sticky 높이 — py-3(24) + 컨텐츠(28~32) ≈ 56px.
     헤더 디자인 변경 시 이 값도 같이 갱신. */
  --header-height: 56px;

  /* ── Chord overlay (Sprint 2-6) ─────────────────
     scale-root/scale-chord와 색이 동일하지만 의미 분리를 위해 alias.
     Sprint 2-7에서 chord-tension, chord-color 추가 예정. */
  --color-chord-overlay-root: var(--color-scale-root);
  --color-chord-overlay-tone: var(--color-scale-chord);
```

2) 기존 `@keyframes chord-tone-pulse` + `.chord-tone-halo` 블록 교체:
```css
/* ──────────────────────────────────────
 * Sprint 2-6 — chord overlay (chord-root + chord-tone 두 layer)
 * ──────────────────────────────────────
 * key={chordSymbol}로 SVG group이 re-mount되면 keyframe이 0%부터 재시작.
 * attack(20%까지 0.85 점화) → decay(100%까지 0.6 안착, forwards 유지).
 * chord-root 빨간 ring 가독성을 위해 0.75/0.5 → 0.85/0.6으로 상향.
 * prefers-reduced-motion이 duration을 0.01ms로 강제해도 forwards로 0.6 안착.
 */
@keyframes chord-overlay-pulse {
  0%   { opacity: 0; }
  20%  { opacity: 0.85; }
  100% { opacity: 0.6; }
}

.chord-overlay {
  animation: chord-overlay-pulse 0.6s ease-out forwards;
}
```

> 클래스명을 `.chord-tone-halo` → `.chord-overlay`로 rename. Task 5에서 Fretboard.tsx 참조도 같이 갱신.

- [ ] **Step 2: Sanity check — dev 서버 띄워 시각 확인**

```bash
cd apps/web && pnpm dev
```
브라우저로 `/jam` 들어가서 카드 ▶ — 현재는 아직 단일 ring(Task 5 전이라 시각 분리 X). 화면이 깨지지 않으면 OK. (`.chord-tone-halo` 참조가 남아있으면 ring 자체가 안 나타날 수 있음 — 그건 Task 5에서 정리.)

> dev 서버는 `pnpm dev`가 자동 컴파일. 화면 띄운 뒤 콘솔에 빨간 에러 없는지만 확인 후 Ctrl-C.

- [ ] **Step 3: typecheck + lint**

`cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style(ui): add chord-overlay tokens and rename halo class"
```

---

## Task 5: Fretboard.tsx — chordOverlay prop 도입 + SVG layer 분할

**Spec ref:** §5.3, §8

**Files:**
- Modify: `apps/web/components/fretboard/Fretboard.tsx`
- Test: `apps/web/tests/component/fretboard/Fretboard.test.tsx`

- [ ] **Step 1: Update tests for split layers**

기존 테스트에서 `chordTonePcs` 입력으로 SVG halo 검증하는 부분 제거 후 새 케이스 추가:

```typescript
// 신규 케이스 (기존 chord halo 케이스 대체):
import { Fretboard } from '@/components/fretboard/Fretboard';
import type { ChordOverlay } from '@/lib/theory/chord-voicing';

describe('chord overlay layers', () => {
  it('chordOverlay=undefined → overlay group 미존재', () => {
    const { container } = render(
      <svg><Fretboard {...baseProps} /></svg>
    );
    expect(container.querySelector('.chord-overlay')).toBeNull();
  });

  it('chordOverlay 있음 → root + tone group 모두 렌더', () => {
    const overlay: ChordOverlay = { root: 0, tones: new Set([4, 7]) };
    const { container } = render(
      <svg><Fretboard {...baseProps} chordOverlay={overlay} chordSymbol="I" /></svg>
    );
    const overlayGroup = container.querySelector('.chord-overlay');
    expect(overlayGroup).not.toBeNull();
    expect(overlayGroup?.querySelector('[data-overlay-tier="chord-root"]')).not.toBeNull();
    expect(overlayGroup?.querySelector('[data-overlay-tier="chord-tone"]')).not.toBeNull();
  });

  it('chord-root layer는 root pc인 노트 위치에만', () => {
    // baseProps.notes에 pitchClass=0인 노트가 N개 있다면 그 N개만 root layer에 circle.
    // (구체 카운트는 baseProps에 따라 결정 — 테스트 작성 시 baseProps의 notes를 알고 작성)
    const overlay: ChordOverlay = { root: 0, tones: new Set() };
    const { container } = render(
      <svg><Fretboard {...baseProps} chordOverlay={overlay} chordSymbol="I" /></svg>
    );
    const rootCircles = container.querySelectorAll(
      '[data-overlay-tier="chord-root"] circle',
    );
    const expected = baseProps.notes.filter((n) => n.pitchClass === 0).length;
    expect(rootCircles.length).toBe(expected);
  });

  it('aria-hidden=true (장식 레이어)', () => {
    const overlay: ChordOverlay = { root: 0, tones: new Set([4, 7]) };
    const { container } = render(
      <svg><Fretboard {...baseProps} chordOverlay={overlay} chordSymbol="I" /></svg>
    );
    expect(container.querySelector('.chord-overlay')?.getAttribute('aria-hidden')).toBe('true');
  });
});
```

> `baseProps`는 기존 테스트 파일의 helper 변수. notes 배열에 pitchClass 필드가 있는지 확인하고, 없으면 신규 fixture로 작성. `getFretboardNotes(...)` 호출로 만드는 것이 정석.

- [ ] **Step 2: Run tests, verify FAIL**

`cd apps/web && pnpm test tests/component/fretboard/Fretboard.test.tsx`
Expected: 새 케이스 4건 FAIL (prop 미존재).

- [ ] **Step 3: Update Fretboard.tsx**

1) `FretboardProps` 변경:
```typescript
import type { ChordOverlay } from '@/lib/theory/chord-voicing';

export interface FretboardProps {
  // ... 기존 ...
  /**
   * 현재 코드 오버레이 (chord-root + chord-tone 분리).
   * undefined이면 overlay 레이어를 그리지 않는다.
   */
  chordOverlay?: ChordOverlay;
  chordSymbol?: string | null;
}
```

기존 `chordTonePcs` prop과 그 관련 코드 제거.

2) SVG halo group 코드를 §8의 두-layer 구조로 교체:

```tsx
{/* ── 코드 오버레이 — chord-root + chord-tone 두 layer ─── */}
{chordOverlay && (chordOverlay.root !== null || chordOverlay.tones.size > 0) && (
  <g
    key={chordSymbol ?? 'idle-chord'}
    className="chord-overlay"
    aria-hidden="true"
  >
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

3) `FretboardNote`로 전달하는 `isChordTone={...}`은 prop이 변경됐으니 갱신:
```tsx
isChordTone={
  chordOverlay
    ? n.pitchClass === chordOverlay.root || chordOverlay.tones.has(n.pitchClass)
    : false
}
```

- [ ] **Step 4: Run tests, verify PASS**

`cd apps/web && pnpm test tests/component/fretboard/Fretboard.test.tsx`

- [ ] **Step 5: typecheck + lint**

`cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/fretboard/Fretboard.tsx \
        apps/web/tests/component/fretboard/Fretboard.test.tsx
git commit -m "refactor(fretboard): split chord overlay SVG into root and tone layers"
```

---

## Task 6: FretboardClient.tsx — chordOverlay prop 정식 전달

**Spec ref:** §5.3, §6

**Files:**
- Modify: `apps/web/components/fretboard/FretboardClient.tsx`

- [ ] **Step 1: Refactor selector + prop**

`apps/web/components/fretboard/FretboardClient.tsx` 안에서:

```typescript
// import 변경 — getChordOverlay는 이미 Task 2에서 import됨
import { getChordOverlay, type ChordOverlay } from '@/lib/theory/chord-voicing';
```

selector 블록 교체:

```typescript
// 변경 전 (Task 2 임시 코드)
const chordTonePcs = useMemo(() => {
  if (!isBackingActive || !currentChordSymbol) return undefined;
  const overlay = getChordOverlay(currentChordSymbol, backingKey);
  if (overlay.root === null && overlay.tones.size === 0) return undefined;
  const all = new Set<number>(overlay.tones);
  if (overlay.root !== null) all.add(overlay.root);
  return all;
}, [isBackingActive, currentChordSymbol, backingKey]);

// 변경 후
const chordOverlay = useMemo<ChordOverlay | undefined>(() => {
  if (!isBackingActive || !currentChordSymbol) return undefined;
  const overlay = getChordOverlay(currentChordSymbol, backingKey);
  if (overlay.root === null && overlay.tones.size === 0) return undefined;
  return overlay;
}, [isBackingActive, currentChordSymbol, backingKey]);
```

`<Fretboard>` prop:
```tsx
<Fretboard
  // ... 기존 ...
  chordOverlay={chordOverlay}
  chordSymbol={currentChordSymbol}
/>
```

`chordTonePcs` 참조 제거.

- [ ] **Step 2: Run tests**

```bash
cd apps/web && pnpm test tests/component/fretboard
```
Expected: PASS.

- [ ] **Step 3: 시각 확인 (수동)**

```bash
cd apps/web && pnpm dev
```
브라우저 `/jam` → 카드 ▶ → 지판 SVG에 빨간 ring(현재 코드 root) + 파란 ring(나머지 chord tones) 두 색이 분리되어 보이는지 확인. Ctrl-C.

- [ ] **Step 4: typecheck + lint**

`cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/fretboard/FretboardClient.tsx
git commit -m "refactor(fretboard): switch FretboardClient to chordOverlay prop"
```

---

## Task 7: ChordDisplayModeToggle 컴포넌트

**Spec ref:** §5.3

**Files:**
- Create: `apps/web/components/jam/ChordDisplayModeToggle.tsx`
- Test: `apps/web/tests/component/jam/ChordDisplayModeToggle.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/tests/component/jam/ChordDisplayModeToggle.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';

import { ChordDisplayModeToggle } from '@/components/jam/ChordDisplayModeToggle';
import { useAppStore } from '@/lib/store/app-store';

describe('ChordDisplayModeToggle', () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({ ui: { ...s.ui, chordDisplayMode: 'roman' } }));
  });

  it('두 버튼 (Roman / Absolute) 렌더', () => {
    render(<ChordDisplayModeToggle />);
    expect(screen.getByRole('button', { name: /roman/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument();
  });

  it('roman 모드일 때 Roman 버튼이 aria-pressed=true', () => {
    render(<ChordDisplayModeToggle />);
    expect(screen.getByRole('button', { name: /roman/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /absolute/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Absolute 클릭 → store 갱신', async () => {
    const user = userEvent.setup();
    render(<ChordDisplayModeToggle />);
    await user.click(screen.getByRole('button', { name: /absolute/i }));
    expect(useAppStore.getState().ui.chordDisplayMode).toBe('absolute');
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

`cd apps/web && pnpm test tests/component/jam/ChordDisplayModeToggle.test.tsx`

- [ ] **Step 3: Implement component**

```tsx
// apps/web/components/jam/ChordDisplayModeToggle.tsx
'use client';

/*
 * 코드 표기 모드 토글 — Roman(I, IV, V7) ↔ Absolute(C, F, G7).
 * 카탈로그 상단에 1개. store ui.chordDisplayMode 직접 조작.
 */

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import type { ChordDisplayMode } from '@/lib/theory/chord-display';

const OPTIONS: ReadonlyArray<{ mode: ChordDisplayMode; label: string }> = [
  { mode: 'roman', label: 'Roman' },
  { mode: 'absolute', label: 'Absolute' },
];

export function ChordDisplayModeToggle() {
  const current = useAppStore((s) => s.ui.chordDisplayMode);
  const setMode = useAppStore((s) => s.setChordDisplayMode);

  return (
    <div role="group" aria-label="코드 표기 모드" className="flex">
      {OPTIONS.map(({ mode, label }, idx) => {
        const isActive = current === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => setMode(mode)}
            className={clsx(
              'border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-widest transition-colors duration-75',
              idx === 0 ? 'border-r-0' : '',
              isActive
                ? 'border-accent-brass bg-accent-brass/10 text-accent-brass'
                : 'border-ink-muted/25 text-ink-secondary hover:text-ink-primary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify PASS**

`cd apps/web && pnpm test tests/component/jam/ChordDisplayModeToggle.test.tsx`

- [ ] **Step 5: typecheck + lint + aesthetic-reviewer 1회 호출**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

토큰 사용·폰트·금지 색 검증을 위해 (서브에이전트 환경) `aesthetic-reviewer`를 1회 호출해 통과 받는다. 단독 실행 시 수동 점검:
- `transition-colors duration-75` 사용 (bare `transition` 금지)
- 컬러는 토큰만 (`border-accent-brass`, `text-accent-brass` 등)

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/jam/ChordDisplayModeToggle.tsx \
        apps/web/tests/component/jam/ChordDisplayModeToggle.test.tsx
git commit -m "feat(jam): add ChordDisplayModeToggle component"
```

---

## Task 8: ProgressionCatalogClient — 마디 strip 전체 노출 + 현재 마디 강조 + displayChord

**Spec ref:** §5.3, §6

**Files:**
- Modify: `apps/web/components/jam/ProgressionCatalogClient.tsx`
- Test: `apps/web/tests/component/jam/ProgressionCatalogClient.test.tsx` (신규)

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/tests/component/jam/ProgressionCatalogClient.test.tsx
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { ProgressionCatalogClient } from '@/components/jam/ProgressionCatalogClient';
import { useAppStore } from '@/lib/store/app-store';
import type { ProgressionTemplate } from '@/lib/api/progression-templates';

const blues12: ProgressionTemplate = {
  slug: 'test-blues',
  name: '12-Bar Blues (Test)',
  category: 'blues',
  bars: 12,
  time_signature: '4/4',
  default_bpm: 90,
  recommended_scales: ['major_blues'],
  progression: [
    { bar: 1, chord: 'I7' }, { bar: 2, chord: 'I7' }, { bar: 3, chord: 'I7' }, { bar: 4, chord: 'I7' },
    { bar: 5, chord: 'IV7' }, { bar: 6, chord: 'IV7' }, { bar: 7, chord: 'I7' }, { bar: 8, chord: 'I7' },
    { bar: 9, chord: 'V7' }, { bar: 10, chord: 'IV7' }, { bar: 11, chord: 'I7' }, { bar: 12, chord: 'V7' },
  ],
} as ProgressionTemplate;

describe('ProgressionCatalogClient', () => {
  beforeEach(() => {
    useAppStore.setState((s) => ({
      ui: { ...s.ui, chordDisplayMode: 'roman' },
      backing: { ...s.backing, backingKey: 0, backingPlayingSlug: null, backingCurrentChord: null },
    }));
  });

  it('12개 마디 칩 모두 렌더 (slice 없음)', () => {
    render(<ProgressionCatalogClient templates={[blues12]} />);
    // 카드 안에서 chord 칩 카운트
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    const chips = within(card).getAllByText(/^(I7|IV7|V7|Im7|IVm7|Vm7)$/);
    expect(chips).toHaveLength(12);
  });

  it('재생 중 + barIndex=2 → 3번째 칩만 강조 (font-bold 또는 aria-current)', () => {
    useAppStore.setState((s) => ({
      backing: {
        ...s.backing,
        backingPlayingSlug: 'test-blues',
        backingCurrentChord: { symbol: 'I7', barIndex: 2 },
      },
    }));
    render(<ProgressionCatalogClient templates={[blues12]} />);
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    const chips = within(card).getAllByRole('listitem');
    // 칩이 li로 렌더된다고 가정 — 구현에서 일관 유지
    expect(chips[2]).toHaveAttribute('aria-current', 'true');
    chips.forEach((chip, idx) => {
      if (idx !== 2) expect(chip).not.toHaveAttribute('aria-current', 'true');
    });
  });

  it('mode=absolute + key=2(D) → I7 칩 텍스트가 D7', () => {
    useAppStore.setState((s) => ({
      ui: { ...s.ui, chordDisplayMode: 'absolute' },
      backing: { ...s.backing, backingKey: 2 },
    }));
    render(<ProgressionCatalogClient templates={[blues12]} />);
    const card = screen.getByText('12-Bar Blues (Test)').closest('li')!;
    expect(within(card).getAllByText('D7').length).toBeGreaterThan(0);
    expect(within(card).getAllByText('G7').length).toBeGreaterThan(0); // IV7 of D
    expect(within(card).getAllByText('A7').length).toBeGreaterThan(0); // V7 of D
  });

  it('소문자 코드(i7)는 mode=roman에서 Im7로 표시', () => {
    const minor: ProgressionTemplate = {
      ...blues12,
      slug: 'test-minor',
      name: '소문자 테스트',
      progression: [{ bar: 1, chord: 'i7' }, { bar: 2, chord: 'iv7' }],
      bars: 2,
    } as ProgressionTemplate;
    render(<ProgressionCatalogClient templates={[minor]} />);
    const card = screen.getByText('소문자 테스트').closest('li')!;
    expect(within(card).getByText('Im7')).toBeInTheDocument();
    expect(within(card).getByText('IVm7')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

`cd apps/web && pnpm test tests/component/jam/ProgressionCatalogClient.test.tsx`

- [ ] **Step 3: Refactor ProgressionCatalogClient**

`apps/web/components/jam/ProgressionCatalogClient.tsx` 핵심 변경:

```tsx
'use client';

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';
import { displayChord } from '@/lib/theory/chord-display';

import { BpmSlider } from './BpmSlider';
import { ChordDisplayModeToggle } from './ChordDisplayModeToggle';
import { KeySelector } from './KeySelector';
import { ProgressionPlayButton } from './ProgressionPlayButton';
import { UseRecommendedScaleButton } from './UseRecommendedScaleButton';

const CATEGORY_LABELS: Record<string, string> = {
  blues: 'Blues',
  pop: 'Pop',
  jazz: 'Jazz',
  minor: 'Minor',
  modal: 'Modal',
};

const CATEGORY_ACCENT: Record<string, string> = {
  blues: 'text-highlight-blue',
  pop: 'text-highlight-orange',
  jazz: 'text-accent-brass',
  minor: 'text-ink-secondary',
  modal: 'text-highlight-green',
};

export function ProgressionCatalogClient({
  templates,
}: {
  templates: ProgressionTemplate[];
}) {
  const groups = groupByCategory(templates);
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const backingCurrentBarIndex = useAppStore(
    (s) => s.backing.backingCurrentChord?.barIndex ?? null,
  );
  const chordDisplayMode = useAppStore((s) => s.ui.chordDisplayMode);

  return (
    <section aria-label="코드 진행 카탈로그" className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <ChordDisplayModeToggle />
          <KeySelector />
          <span className="font-mono text-[0.65rem] text-ink-muted">
            {templates.length} progressions
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p
              className={clsx(
                'font-mono text-[0.65rem] uppercase tracking-[0.3em]',
                CATEGORY_ACCENT[category] ?? 'text-ink-secondary',
              )}
            >
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {items.map((t) => {
                const isPlayingThisCard = backingPlayingSlug === t.slug;
                const currentBarIdx = isPlayingThisCard ? backingCurrentBarIndex : null;
                return (
                  <li
                    key={t.slug}
                    className="border border-ink-muted/15 bg-bg-elevated px-3 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-sm text-ink-primary">
                        {t.name}
                      </span>
                      <span className="font-mono text-[0.65rem] tabular-nums text-ink-muted">
                        {t.default_bpm} bpm · {t.bars} bars
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <ul className="flex flex-wrap gap-1 font-mono text-[0.65rem] text-ink-muted">
                        {t.progression.map((step, idx) => {
                          const isCurrent = currentBarIdx === idx;
                          return (
                            <li
                              key={idx}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={clsx(
                                'border px-1.5 py-[1px] tabular-nums transition-colors duration-75',
                                isCurrent
                                  ? 'border-accent-brass bg-accent-brass/10 font-bold text-accent-brass'
                                  : 'border-ink-muted/15 text-ink-secondary',
                              )}
                            >
                              {displayChord(step.chord, backingKey, chordDisplayMode)}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex flex-wrap items-center gap-2">
                        <BpmSlider slug={t.slug} defaultBpm={t.default_bpm} />
                        <UseRecommendedScaleButton template={t} />
                        <ProgressionPlayButton template={t} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByCategory(
  templates: ProgressionTemplate[],
): Record<string, ProgressionTemplate[]> {
  const groups: Record<string, ProgressionTemplate[]> = {};
  for (const tpl of templates) {
    const key = tpl.category;
    (groups[key] ??= []).push(tpl);
  }
  return groups;
}
```

핵심 변화:
- `slice(0, 8)` 제거 → 모든 step 노출.
- 외부 div → `<ul>`로 변경, 각 칩을 `<li>`로 감싸 aria-current 활용.
- `displayChord(step.chord, backingKey, chordDisplayMode)`로 모든 칩 변환.
- 카탈로그 헤더에 `<ChordDisplayModeToggle />` 추가.

- [ ] **Step 4: Run tests, verify PASS**

`cd apps/web && pnpm test tests/component/jam/ProgressionCatalogClient.test.tsx`

- [ ] **Step 5: typecheck + lint**

`cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/jam/ProgressionCatalogClient.tsx \
        apps/web/tests/component/jam/ProgressionCatalogClient.test.tsx
git commit -m "feat(jam): expand bar strip and integrate display mode in catalog"
```

---

## Task 9: ProgressionPlayButton — displayChord 적용

**Spec ref:** §5.3

**Files:**
- Modify: `apps/web/components/jam/ProgressionPlayButton.tsx`

- [ ] **Step 1: Update component**

```tsx
// 기존 currentChord 표시 부분
{isPlaying && currentChord && (
  <span className="tabular-nums">
    {currentChord.symbol} · bar {currentChord.barIndex + 1}/{template.bars}
  </span>
)}

// 변경 후 — displayChord 적용
{isPlaying && currentChord && (
  <span className="tabular-nums">
    {displayChord(currentChord.symbol, backingKey, chordDisplayMode)} · bar {currentChord.barIndex + 1}/{template.bars}
  </span>
)}
```

추가 import + selector:
```typescript
import { displayChord } from '@/lib/theory/chord-display';
// ...
const chordDisplayMode = useAppStore((s) => s.ui.chordDisplayMode);
```

- [ ] **Step 2: Run all jam component tests**

```bash
cd apps/web && pnpm test tests/component/jam
```

- [ ] **Step 3: typecheck + lint**

`cd apps/web && pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/jam/ProgressionPlayButton.tsx
git commit -m "refactor(jam): apply displayChord to play button label"
```

---

## Task 10: jam/page.tsx — 메트로놈 제거 + Fretboard sticky wrapper

**Spec ref:** §4

**Files:**
- Modify: `apps/web/app/(practice)/jam/page.tsx`

- [ ] **Step 1: Refactor page**

`apps/web/app/(practice)/jam/page.tsx` 전면 교체:

```tsx
import type { Metadata } from 'next';

import { FretboardClient } from '@/components/fretboard/FretboardClient';
import { ProgressionCatalog } from '@/components/jam/ProgressionCatalog';

/*
 * Jam — Sprint 2-6 재구성.
 *
 * 본문에서 메트로놈을 제거 — 헤더 MetronomeDock만으로 박자 잡기 충분.
 * Fretboard SVG는 lg: 이상에서 sticky로 카탈로그를 스크롤하면서도 지판이
 * 항상 보이도록 한다. 컨트롤 그리드(RootPicker 등)는 sticky 아님.
 *
 * sticky offset: globals.css의 --header-height (현재 56px).
 * 모바일(<lg)에서는 일반 흐름 — fretboard가 화면 절반을 잡으면 카탈로그가
 * 가려지므로 sticky 해제.
 */

export const metadata: Metadata = {
  title: 'Jam',
  description: '지판과 배킹 트랙이 한 화면에. 코드 진행 따라 chord overlay가 매 마디 갱신.',
};

export default function JamPage() {
  return (
    <section className="space-y-12 py-8">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
          Practice / Jam
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-none tracking-tight md:text-6xl">
          <span className="text-accent-brass">Practice</span>, together.
        </h1>
        <p className="mt-4 max-w-xl font-mono text-sm text-ink-secondary">
          지판과 배킹 트랙이 한 자리에. 헤더 Dock으로 다른 페이지에서도 메트로놈 계속.
        </p>
      </header>

      <section aria-label="Fretboard 영역" className="space-y-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Fretboard
        </h2>
        {/* sticky는 FretboardClient 내부의 SVG 컨테이너에서 처리 — page는 단순 마운트만 */}
        <FretboardClient />
      </section>

      <div className="border-t border-ink-muted/15" aria-hidden="true" />

      <ProgressionCatalog />
    </section>
  );
}
```

- [ ] **Step 2: Apply sticky to Fretboard SVG container in FretboardClient**

`apps/web/components/fretboard/FretboardClient.tsx`의 SVG 컨테이너 div 클래스에 sticky 추가:

```tsx
// 변경 전
<div className="overflow-x-auto border border-ink-muted/20 bg-bg-elevated px-4 py-6">

// 변경 후 — sticky는 lg: 이상에서만, top은 헤더 높이만큼
<div className="overflow-x-auto border border-ink-muted/20 bg-bg-elevated px-4 py-6 lg:sticky lg:top-[var(--header-height)] lg:z-[1]">
```

> sticky를 page 단계가 아닌 컴포넌트 안에서 처리하는 이유: `/fretboard` 페이지에서도 같은 컴포넌트를 쓰지만 그 페이지는 단일 섹션이라 sticky가 무의미. 그러나 단일 섹션에서 sticky가 켜져 있어도 동작상 부작용이 없음(부모가 스크롤되지 않으면 sticky가 fixed처럼 보일 일이 없음). 단순화 위해 컴포넌트 안에서 처리.

- [ ] **Step 3: 시각 + 회귀 확인**

```bash
cd apps/web && pnpm dev
```
브라우저 `/jam`:
- 메트로놈 § 섹션이 본문에 없음.
- 헤더 MetronomeDock(상단)는 그대로.
- 카탈로그 카드 ▶ → 빨간 ring(chord root) + 파란 ring(chord tone) 분리, 현재 마디 칩 황동색 강조, 마디 ‘…’ 잘림 없음.
- absolute 토글 → 카드 칩들이 음 이름으로 변환.
- 페이지 스크롤 시 fretboard SVG가 sticky로 헤더 아래 고정 (lg viewport).
- 모바일 viewport(개발자 도구 < 1024px)에서는 sticky 해제.
- `/fretboard` 페이지도 회귀 없는지 한 번 체크 (단일 섹션이지만 깨지지 않음).

- [ ] **Step 4: typecheck + lint + 전체 단위/컴포넌트 테스트**

```bash
cd apps/web && pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(practice\)/jam/page.tsx \
        apps/web/components/fretboard/FretboardClient.tsx
git commit -m "feat(jam): make fretboard sticky and remove metronome section"
```

---

## Task 11: E2E 회귀 + 최종 검증

**Spec ref:** §9.3

**Files:**
- Create: `apps/web/tests/e2e/jam-skeleton.spec.ts`

- [ ] **Step 1: Write E2E**

```typescript
// apps/web/tests/e2e/jam-skeleton.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sprint 2-6 — Jam Skeleton', () => {
  test('jam 본문에 메트로놈 § 섹션 없음', async ({ page }) => {
    await page.goto('/jam');
    // 본문 안 § Metronome 헤더가 없어야 함
    const main = page.locator('main');
    await expect(main.getByText('§ Metronome', { exact: true })).toHaveCount(0);
  });

  test('헤더 MetronomeDock은 존재 (모든 practice 페이지 공통)', async ({ page }) => {
    await page.goto('/jam');
    // Dock의 Play 버튼 — aria-label '메트로놈 재생'
    await expect(page.getByRole('button', { name: /메트로놈 재생/ })).toBeVisible();
  });

  test('Fretboard 컨테이너에 sticky 클래스 (lg viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/jam');
    const fretboardWrapper = page.locator('section[aria-label="Fretboard 영역"] >> .lg\\:sticky');
    await expect(fretboardWrapper).toHaveCount(1);
  });

  test('절대/상대 토글 동작', async ({ page }) => {
    await page.goto('/jam');
    // 기본 roman → I7 칩이 보임 (12-bar blues 카드)
    await expect(page.getByText('I7').first()).toBeVisible();
    // Absolute 클릭
    await page.getByRole('button', { name: /Absolute/i }).click();
    // C7 칩이 보임 (key=C 기본)
    await expect(page.getByText('C7').first()).toBeVisible();
  });

  test('재생 시 현재 마디 강조가 진행', async ({ page }) => {
    await page.goto('/jam');
    // 12-bar blues 카드 ▶ 누름
    const card = page.getByText('12-Bar Blues (Major)').locator('..');
    await card.getByRole('button', { name: /Play/i }).click();
    // 첫 마디가 aria-current로 잡힘 (배킹 로딩 후 1~2초 내)
    await expect(card.locator('li[aria-current="true"]')).toHaveCount(1, { timeout: 5000 });
    // 정지
    await card.getByRole('button', { name: /Stop/i }).click();
  });
});
```

- [ ] **Step 2: Run E2E (Docker)**

```bash
docker compose -f docker-compose.test.yml up --exit-code-from playwright
```
Expected: 5 tests PASS.

- [ ] **Step 3: 전체 검증 — typecheck/lint/단위/컴포넌트**

```bash
cd apps/web && pnpm typecheck && pnpm lint && pnpm test
```
모두 green이어야 함.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/jam-skeleton.spec.ts
git commit -m "test(test): add Sprint 2-6 jam skeleton E2E"
```

---

## 최종 체크리스트 (PR 올리기 전)

- [ ] spec §2.1의 S-1 ~ S-7 모두 코드에 반영
- [ ] spec §2.2의 Out-of-Scope에 들어있는 항목은 **건드리지 않음** (스케일 외 chord tone 표시, 텐션, 색채음, 리듬 패턴 분기, 카탈로그 데이터, 음원 교체)
- [ ] 신규/수정/제거 파일 카운트가 spec Appendix A와 일치
  - 신규 6: chord-display.ts, ChordDisplayModeToggle.tsx, 단위/컴포넌트/E2E 테스트 4개
  - 수정 11: jam/page.tsx, Fretboard.tsx, FretboardClient.tsx, ProgressionCatalogClient.tsx, ProgressionPlayButton.tsx, chord-voicing.ts, app-store.ts, globals.css, Fretboard.test.tsx, chord-voicing.test.ts, app-store.test.ts
  - 제거: chordPitchClassSet 함수, .chord-tone-halo 클래스
- [ ] persist v8 migration 통과 (테스트로 검증)
- [ ] WCAG 가독성 — chord-overlay 0.6 안착, root ring 강조 두께 2.5
- [ ] aesthetic-reviewer 1회 통과 (Roman/Absolute 토글 + sticky 영역 시각)
- [ ] music-theory-guardian 1회 통과 (chord-display 변환 정확성, getChordOverlay root/tones 분리)
- [ ] test-strategist 1회 통과 (E2E 5건 + 단위·컴포넌트 신규 케이스)
- [ ] PR 본문에 spec/plan 링크 + Review notes (위 3 에이전트 결과 요약)

---

## Self-Review (plan 작성 직후)

- **Spec coverage**: spec §2.1의 S-1(메트로놈 제거)→T10, S-2(sticky)→T10, S-3(마디 strip + 강조)→T8, S-4(케이스 통일)→T1+T8, S-5(절대/상대 토글)→T1+T3+T7+T8, S-6(chord overlay 분리)→T2+T5+T6, S-7(rename)→T2+T4+T5. 매핑 누락 없음.
- **Placeholder scan**: TBD/TODO/“fill in details”/“similar to Task X (no code)”/“appropriate error handling” 없음. 모든 step에 실제 코드 또는 정확한 명령. 통과.
- **Type consistency**: `ChordOverlay`, `ChordDisplayMode`, `getChordOverlay`, `displayChord`, `normalizeRomanCase`, `romanToAbsolute` — Task 1·2에서 정의 후 Task 5·6·7·8·9에서 동일 식별자로 사용. parseRoman·QUALITY_INTERVALS 등 재사용 식별자는 기존 chords.ts의 export 그대로 사용. 일치 확인.
- **TDD 규율**: Task 1·2·3·5·7·8·11이 “테스트 → 실패 → 구현 → 통과” 순서. Task 4·6·9·10은 단순 리팩터/wiring이라 테스트는 기존 케이스 회귀로 충분.

---

## 실행 핸드오프

이 plan은 **subagent-driven-development** skill로 실행할 예정. T1~T11을 순서대로 fresh subagent에 dispatch + 각 task에 spec compliance + code quality 두 단계 review.

> 사용자 신호("준비되면 다시 신호 줘")가 도착하기 전까지는 plan 작성에서 멈춤. effort 변경 후 재개 시 별도 합의 절차 없이 T1부터 subagent dispatch 시작.
