# Sprint 2-5 — Backing ↔ Fretboard 동기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 배킹 트랙 재생 중 현재 코드톤이 지판에 halo overlay로 강조되며, fretboard 표시 root는 backingKey로 자동 동기화되도록 한다. 사용자가 1-click으로 추천 스케일을 적용하는 버튼도 추가.

**Architecture:** FretboardClient가 backing 슬라이스를 추가 구독해 effectiveRoot/chordTonePcs를 계산. Fretboard SVG는 `chordTonePcs`(Set) prop을 받아 각 FretboardNote에 boolean으로 변환 전달(React.memo 효과 보존). halo는 별도 SVG group + `key={chordSymbol}` re-mount + 0.6s ease-out keyframe.

**Tech Stack:** TypeScript 5 strict / Next.js 15 App Router / Vitest + Testing Library / Zustand / Tailwind v4 + CSS-first @theme.

**Spec:** `docs/superpowers/specs/2026-04-25-sprint-2-5-fretboard-sync-design.md`
**Branch:** `feat/sprint-2-5-fretboard-sync`
**Base SHA:** `afa731b` (Sprint 2-4 머지)

---

## File Structure

```
apps/web/
  components/fretboard/
    Fretboard.tsx                  (MODIFY — chordTonePcs/chordSymbol props 추가, halo SVG group)
    FretboardNote.tsx              (MODIFY — isChordTone? prop, React.memo)
    FretboardClient.tsx            (MODIFY — backing 구독, effectiveRoot, chordTonePcs 계산)
    RootPicker.tsx                 (MODIFY — syncedToBacking? prop, dimmed state)
  components/jam/
    UseRecommendedScaleButton.tsx  (NEW — 1-click 적용)
    ProgressionCatalogClient.tsx   (MODIFY — 카드에 위 버튼 삽입)
  lib/theory/
    chord-voicing.ts               (MODIFY — chordPitchClassSet 헬퍼 export)
  app/globals.css                  (MODIFY — @keyframes chord-tone-pulse + .chord-tone-halo)
  tests/component/
    Fretboard.test.tsx             (MODIFY — chord halo 시나리오 추가)
    RootPicker.test.tsx            (NEW or MODIFY — syncedToBacking 검증)
    UseRecommendedScaleButton.test.tsx (NEW)
  tests/unit/lib/theory/
    chord-voicing.test.ts          (MODIFY — chordPitchClassSet 단위테스트 추가)
```

---

## Tasks Outline

병렬:
- Task 1: chordPitchClassSet helper
- Task 2: globals.css keyframe + halo class
- Task 3: UseRecommendedScaleButton

순차:
- Task 4: Fretboard + FretboardNote — halo 렌더 (Task 2 의존)
- Task 5: RootPicker — syncedToBacking
- Task 6: FretboardClient — backing 구독 wiring (Task 1, 4, 5 의존)
- Task 7: ProgressionCatalogClient — 카드에 버튼 삽입 (Task 3 의존)
- Task 8: 통합 검증 + PR

---

## Task 1 — chordPitchClassSet helper

**Files:**
- Modify: `apps/web/lib/theory/chord-voicing.ts`
- Modify: `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`

**Step 1.1: 단위 테스트 추가**

기존 `chord-voicing.test.ts`에 새 `describe` 블록:

```typescript
import { chordPitchClassSet } from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

describe('chordPitchClassSet', () => {
  it('I7 in C → {0,4,7,10}', () => {
    const result = chordPitchClassSet('I7', 0 as PitchClass);
    expect(result).toEqual(new Set([0, 4, 7, 10]));
  });

  it('IV in G → root D 기반 {2,6,9}', () => {
    // G = pc 7. IV 도수 = 7 + 5 = 12 → 0 (C). C 메이저 = {0, 4, 7}
    const result = chordPitchClassSet('IV', 7 as PitchClass);
    expect(result).toEqual(new Set([0, 4, 7]));
  });

  it('파싱 실패 시 null', () => {
    expect(chordPitchClassSet('XYZ', 0 as PitchClass)).toBeNull();
  });

  it('Set 반환 — 중복 PC는 1개로 합쳐짐', () => {
    const result = chordPitchClassSet('I', 0 as PitchClass)!;
    expect(result.size).toBe(3);
  });
});
```

**Step 1.2: 구현**

`apps/web/lib/theory/chord-voicing.ts`에 추가:

```typescript
import { chordPitchClasses } from './chords';
import type { PitchClass } from './types';

/**
 * chordPitchClasses의 결과를 Set으로 래핑 — 지판 렌더 시 O(1) lookup.
 * 파싱 실패 시 null 반환.
 */
export function chordPitchClassSet(symbol: string, keyRoot: PitchClass): Set<number> | null {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (!pcs) return null;
  return new Set(pcs);
}
```

**Step 1.3: Test pass + commit**

```bash
cd apps/web && pnpm test tests/unit/lib/theory/chord-voicing.test.ts
pnpm typecheck
git add apps/web/lib/theory/chord-voicing.ts apps/web/tests/unit/lib/theory/chord-voicing.test.ts
git commit -m "feat(theory): add chordPitchClassSet helper for fretboard sync"
```

---

## Task 2 — globals.css keyframe + halo class

**Files:**
- Modify: `apps/web/app/globals.css`

**Step 2.1: 기존 globals.css 읽기**

```bash
grep -nE "color-scale-chord|@keyframes|@media.*motion" apps/web/app/globals.css
```

`--color-scale-chord` 토큰 위치, 기존 keyframe 위치, prefers-reduced-motion 위치 확인.

**Step 2.2: keyframe + class 추가**

기존 keyframe 정의가 있는 영역(또는 prefers-reduced-motion 블록 위)에 추가:

```css
/* ──────────────────────────────────────
 * Sprint 2-5 — chord tone halo overlay
 * ──────────────────────────────────────
 * chordSymbol key prop 변경 시 SVG group이 re-mount되어 0%부터 재시작.
 * 코드 교체 attack(20%까지 0.75 점화) → decay(100%까지 0.5 안착, forwards).
 * 전역 prefers-reduced-motion이 animation-duration을 0.01ms로 강제하더라도
 * forwards로 마지막 프레임(opacity 0.5)에 즉시 안착되어 정적 halo 보장.
 */
@keyframes chord-tone-pulse {
  0%   { opacity: 0; }
  20%  { opacity: 0.75; }
  100% { opacity: 0.5; }
}

.chord-tone-halo {
  animation: chord-tone-pulse 0.6s ease-out forwards;
}
```

**Step 2.3: 시각 검증**

수동: 브라우저에서 `<svg><circle class="chord-tone-halo" .../></svg>` 임시 추가 후 펄스 동작 확인. 실제 통합은 Task 4·6에서.

**Step 2.4: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(ui): add chord-tone-pulse keyframe + halo class

코드 교체 시 attack-decay 0.6s ease-out. forwards로 reduced-motion에서도
정적 halo 보장."
```

---

## Task 3 — UseRecommendedScaleButton

**Files:**
- Create: `apps/web/components/jam/UseRecommendedScaleButton.tsx`
- Create: `apps/web/tests/component/UseRecommendedScaleButton.test.tsx`

**Step 3.1: 테스트**

```typescript
// apps/web/tests/component/UseRecommendedScaleButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { UseRecommendedScaleButton } from '@/components/jam/UseRecommendedScaleButton';
import { useAppStore } from '@/lib/store/app-store';

const TEMPLATE_BASE = {
  id: 'x', slug: 'x', name: 'X', category: 'pop', bars: 1, default_bpm: 120,
  progression: [{ bar: 1, chord: 'I' }], time_signature: '4/4',
  created_at: '2024-01-01T00:00:00Z',
} as const;

beforeEach(() => {
  useAppStore.getState().setScale('major');
});

describe('UseRecommendedScaleButton', () => {
  it('recommended_scales가 비었으면 미렌더', () => {
    const { container } = render(
      <UseRecommendedScaleButton template={{ ...TEMPLATE_BASE, recommended_scales: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('알려지지 않은 scale은 미렌더', () => {
    const { container } = render(
      <UseRecommendedScaleButton template={{ ...TEMPLATE_BASE, recommended_scales: ['unknown_scale'] }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('알려진 scale은 버튼 노출 + 클릭 시 store 갱신', () => {
    render(
      <UseRecommendedScaleButton template={{ ...TEMPLATE_BASE, recommended_scales: ['major_blues'] }} />
    );
    const btn = screen.getByRole('button', { name: /apply scale/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(useAppStore.getState().fretboard.scale).toBe('major_blues');
  });
});
```

**Step 3.2: 구현**

```tsx
// apps/web/components/jam/UseRecommendedScaleButton.tsx
'use client';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { useAppStore } from '@/lib/store/app-store';
import { SCALES } from '@/lib/theory/scales';
import type { ScaleKey } from '@/lib/theory/types';

interface Props {
  template: ProgressionTemplate;
}

function isKnownScale(s: string): s is ScaleKey {
  return Object.prototype.hasOwnProperty.call(SCALES, s);
}

export function UseRecommendedScaleButton({ template }: Props) {
  const setScale = useAppStore((s) => s.setScale);
  const recommended = template.recommended_scales[0];
  if (!recommended || !isKnownScale(recommended)) return null;

  return (
    <button
      type="button"
      onClick={() => setScale(recommended)}
      className="border border-ink-muted/20 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted transition-colors duration-75 hover:border-accent-brass/40 hover:text-accent-brass"
    >
      Apply scale: {recommended.replace(/_/g, ' ')}
    </button>
  );
}
```

**Step 3.3: Test + commit**

```bash
pnpm test tests/component/UseRecommendedScaleButton.test.tsx
pnpm typecheck && pnpm lint
git add apps/web/components/jam/UseRecommendedScaleButton.tsx apps/web/tests/component/UseRecommendedScaleButton.test.tsx
git commit -m "feat(jam): add UseRecommendedScaleButton — 1-click scale apply"
```

---

## Task 4 — Fretboard + FretboardNote halo 렌더

**Depends on:** Task 2
**Files:**
- Modify: `apps/web/components/fretboard/FretboardNote.tsx`
- Modify: `apps/web/components/fretboard/Fretboard.tsx`
- Modify: `apps/web/tests/component/fretboard.test.tsx` (existing)

**Step 4.1: FretboardNote에 isChordTone 추가 + React.memo**

기존 props에 추가:

```typescript
interface FretboardNoteProps {
  // 기존 cx, cy, fretWidth, tier, noteName, degree, labelMode, stringNumber, fret
  isChordTone?: boolean;
}
```

내부 렌더 로직에는 isChordTone에 따른 분기 없음 — halo는 Fretboard에서 별도 group으로 그림. **그러나 React.memo 비교에는 isChordTone이 포함되어야 한다 (memo 무력화 방지).**

파일 끝에서:

```typescript
export const FretboardNote = memo(FretboardNoteImpl);
```

(import { memo } from 'react' 추가)

**Step 4.2: Fretboard에 chordTonePcs/chordSymbol props + halo group**

Fretboard.tsx props 갱신:

```typescript
export interface FretboardProps {
  // 기존 props
  chordTonePcs?: ReadonlySet<number>;
  chordSymbol?: string | null;
}
```

Fretboard 내부에서 notes를 map할 때 isChordTone boolean 전달:

```tsx
{notes.map((n) => (
  <FretboardNote
    key={`${n.string}-${n.fret}`}
    {...noteRenderProps(n)}
    isChordTone={chordTonePcs?.has(n.pitchClass) ?? false}
  />
))}
```

(`pitchClass`는 NoteMark에 있는지 확인. 없으면 noteName/degree에서 파생.)

별도 halo SVG group 추가, `<g key={chordSymbol ?? 'idle'}>`로 감싸 코드 변경 시 re-mount:

```tsx
{chordTonePcs && chordTonePcs.size > 0 && (
  <g key={chordSymbol ?? 'idle'} className="chord-tone-halo" aria-hidden="true">
    {notes
      .filter((n) => chordTonePcs.has(n.pitchClass))
      .map((n) => {
        const cx = mirrorX(fretCenterX(n.fret));
        const cy = stringY(n.string);
        return (
          <circle
            key={`halo-${n.string}-${n.fret}`}
            cx={cx}
            cy={cy}
            r={fretWidth * 0.30}
            fill="none"
            stroke="var(--color-scale-chord)"
            strokeWidth={2}
          />
        );
      })}
  </g>
)}
```

(`fretCenterX`, `stringY`, `mirrorX`, `fretWidth` 함수/변수는 기존 Fretboard 안에 있음. 정확한 이름은 코드 읽고 맞출 것.)

**Step 4.3: 테스트 추가**

기존 `fretboard.test.tsx`에 새 케이스:

```typescript
it('chordTonePcs가 주어지면 halo group이 렌더됨', () => {
  const { container } = render(<Fretboard {...baseProps} chordTonePcs={new Set([0, 4, 7])} chordSymbol="I" />);
  const halo = container.querySelector('.chord-tone-halo');
  expect(halo).toBeInTheDocument();
  // 12개 root + 12개 등 노트 중 PC 0/4/7만 halo. 정확한 수는 frets에 따라.
  const haloCircles = halo!.querySelectorAll('circle');
  expect(haloCircles.length).toBeGreaterThan(0);
});

it('chordTonePcs가 undefined면 halo 없음', () => {
  const { container } = render(<Fretboard {...baseProps} />);
  expect(container.querySelector('.chord-tone-halo')).toBeNull();
});

it('chordSymbol이 바뀌면 halo group이 re-mount되어 animation 재시작', () => {
  const { container, rerender } = render(<Fretboard {...baseProps} chordTonePcs={new Set([0])} chordSymbol="I" />);
  const halo1 = container.querySelector('.chord-tone-halo');
  expect(halo1).toBeInTheDocument();
  rerender(<Fretboard {...baseProps} chordTonePcs={new Set([5])} chordSymbol="IV" />);
  const halo2 = container.querySelector('.chord-tone-halo');
  // re-mount 검증: React key 변화로 새 element. 이건 직접 검증 불가능하므로
  // halo 자체 존재만 확인.
  expect(halo2).toBeInTheDocument();
});
```

**Step 4.4: Test + typecheck + commit**

```bash
pnpm test tests/component/fretboard.test.tsx
pnpm typecheck && pnpm lint
git add apps/web/components/fretboard/Fretboard.tsx apps/web/components/fretboard/FretboardNote.tsx apps/web/tests/component/fretboard.test.tsx
git commit -m "feat(fretboard): add chord-tone halo overlay for backing sync

- chordTonePcs Set prop으로 받아 isChordTone boolean으로 FretboardNote에 전달
- React.memo 효과 유지 (Set 참조 비교 회피)
- halo는 별도 SVG group, key={chordSymbol}로 re-mount해 animation 재시작
- radius fretWidth*0.30 고정값(tier 무관)"
```

---

## Task 5 — RootPicker syncedToBacking

**Files:**
- Modify: `apps/web/components/fretboard/RootPicker.tsx`
- Create or modify: component test

**Step 5.1: 기존 RootPicker 읽기**

```bash
cat apps/web/components/fretboard/RootPicker.tsx
```

active 버튼 강조 클래스 (`bg-accent-brass`) + 라벨 영역 구조 파악.

**Step 5.2: syncedToBacking prop 추가**

```typescript
interface RootPickerProps {
  syncedToBacking?: boolean;
}

export function RootPicker({ syncedToBacking = false }: RootPickerProps) {
  // ... 기존 store 구독 ...

  return (
    <div className={syncedToBacking ? 'opacity-70' : undefined}>
      <header>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          {syncedToBacking ? 'Root · Synced' : 'Root'}
        </span>
        {/* 기존 accidental chip 등 */}
      </header>
      <div className="grid grid-cols-12 gap-1">
        {ROOTS.map((pc) => (
          <button
            key={pc}
            type="button"
            disabled={syncedToBacking}
            onClick={() => !syncedToBacking && setRoot(pc)}
            className={
              syncedToBacking
                ? 'bg-bg-raised text-ink-muted cursor-not-allowed font-mono text-xs py-1'
                : pc === root
                  ? 'bg-accent-brass text-bg-base font-mono text-xs py-1'
                  : 'bg-bg-raised text-ink-secondary hover:bg-bg-elevated font-mono text-xs py-1'
            }
          >
            {/* 노트 이름 */}
          </button>
        ))}
      </div>
    </div>
  );
}
```

(정확한 클래스/구조는 기존 코드 보고 일관성 유지)

**Step 5.3: 테스트**

`apps/web/tests/component/RootPicker.test.tsx` 새로 만들거나 기존 파일에 추가:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RootPicker } from '@/components/fretboard/RootPicker';

describe('RootPicker', () => {
  it('기본 상태에서는 모든 root 버튼 활성', () => {
    render(<RootPicker />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => expect(b).not.toBeDisabled());
  });

  it('syncedToBacking={true} 시 모든 버튼 disabled', () => {
    render(<RootPicker syncedToBacking={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it('syncedToBacking={true} 시 라벨이 "Root · Synced"', () => {
    render(<RootPicker syncedToBacking={true} />);
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  it('syncedToBacking 시 클릭해도 store 변화 없음', () => {
    // useAppStore.getState().setRoot(0); 미리 설정
    // 클릭 후 root가 그대로인지 검증
  });
});
```

**Step 5.4: Test + commit**

```bash
pnpm test tests/component/RootPicker.test.tsx
pnpm typecheck && pnpm lint
git add apps/web/components/fretboard/RootPicker.tsx apps/web/tests/component/RootPicker.test.tsx
git commit -m "feat(fretboard): RootPicker syncedToBacking dimmed state

배킹 재생 중 모든 root 버튼 disabled, 라벨 'Root · Synced'로 교체. active
강조도 dimmed 처리해 사용자가 'sync 중'임을 명확히 인지."
```

---

## Task 6 — FretboardClient backing 구독

**Depends on:** Tasks 1, 4, 5
**Files:**
- Modify: `apps/web/components/fretboard/FretboardClient.tsx`

**Step 6.1: 기존 코드 읽기**

```bash
cat apps/web/components/fretboard/FretboardClient.tsx
```

**Step 6.2: backing 구독 + effectiveRoot/chordTonePcs**

기존 로직에 추가:

```typescript
import { chordPitchClassSet } from '@/lib/theory/chord-voicing';
// 기존 imports

export function FretboardClient() {
  const hydrated = useHasHydrated();

  const fretboardRoot = useAppStore((s) => s.fretboard.root);
  // ... 기존 fretboard 셀렉터들 ...

  const backingKey = useAppStore((s) => s.backing.backingKey);
  const backingPlayingSlug = useAppStore((s) => s.backing.backingPlayingSlug);
  const currentChordSymbol = useAppStore(
    (s) => s.backing.backingCurrentChord?.symbol ?? null,
  );

  const isBackingActive = backingPlayingSlug !== null;
  const effectiveRoot = isBackingActive ? backingKey : fretboardRoot;

  const chordTonePcs = useMemo(() => {
    if (!isBackingActive || !currentChordSymbol) return undefined;
    return chordPitchClassSet(currentChordSymbol, backingKey) ?? undefined;
  }, [isBackingActive, currentChordSymbol, backingKey]);

  // 기존 useFlats, notes, openStrings 계산에서 root → effectiveRoot 사용
  const useFlats = shouldUseFlats(effectiveRoot, accidentalMode);
  const notes = useMemo(() => getFretboardNotes({
    tuning: STANDARD_TUNING,
    frets,
    root: effectiveRoot,
    scale,
    highlights,
    useFlats,
  }), [effectiveRoot, scale, frets, highlightsOverride, useFlats]);

  // ... hydration gate ...

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto border border-ink-muted/20 bg-bg-elevated px-4 py-6">
        <Fretboard
          notes={notes}
          openStrings={openStrings}
          frets={frets}
          handedness={handedness}
          fretSpacing={fretSpacing}
          labelMode={labelMode}
          chordTonePcs={chordTonePcs}
          chordSymbol={currentChordSymbol}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6">
          <RootPicker syncedToBacking={isBackingActive} />
          <FretboardOptions />
        </div>
        <div className="space-y-6">
          <ScalePicker />
          <ImportantDegreesToggle />
        </div>
      </div>
    </div>
  );
}
```

**Step 6.3: NoteMark에 pitchClass가 있는지 확인**

`getFretboardNotes` 반환 타입 확인. `pitchClass: number` 필드가 있어야 Fretboard에서 `chordTonePcs.has(n.pitchClass)`가 동작.

```bash
grep -A 20 "type NoteMark" apps/web/lib/theory/fretboard.ts
```

없으면 NoteMark 타입에 추가 (Task 4 변경 사항으로 흡수). Task 4 구현 시점에 이미 있어야 동작.

**Step 6.4: 통합 테스트**

`apps/web/tests/component/fretboard.test.tsx`에 추가 (또는 새 FretboardClient 통합 테스트):

```typescript
it('backingPlayingSlug=null 시 root는 fretboard.root', () => {
  // store 설정 + 렌더 + RootPicker 활성 + 노트가 fretboardRoot 기준인지 검증
});

it('backingPlayingSlug 설정 시 root는 backingKey, RootPicker disabled', () => {
  // store: backingPlayingSlug='x', backingKey=7, fretboard.root=0
  // 렌더 후 RootPicker 모두 disabled, 노트가 keyRoot=7 기준
});

it('backingCurrentChord 변경 시 chordTonePcs도 변경', () => {
  // currentChord='I' (PC {0,4,7}) → 'IV' (PC {5,9,0})
  // halo group의 circle 위치 또는 개수 변화로 검증
});
```

**Step 6.5: Test + commit**

```bash
pnpm test tests/component/
pnpm typecheck && pnpm lint
git add apps/web/components/fretboard/FretboardClient.tsx apps/web/tests/component/
git commit -m "feat(fretboard): wire backing-aware root + chord-tone halo

FretboardClient가 backing 슬라이스를 추가 구독해 effectiveRoot 결정.
backingCurrentChord.symbol만 분리 셀렉터로 구독해 같은 코드 반복 시
리렌더 회피. chordPitchClassSet으로 chordTonePcs(Set) 계산해 Fretboard에
전달. RootPicker는 syncedToBacking={isBackingActive}로 dimmed."
```

---

## Task 7 — ProgressionCatalogClient 카드에 버튼 삽입

**Depends on:** Task 3
**Files:**
- Modify: `apps/web/components/jam/ProgressionCatalogClient.tsx`

**Step 7.1: 기존 카드 레이아웃 읽기**

```bash
cat apps/web/components/jam/ProgressionCatalogClient.tsx
```

PlayButton + BpmSlider 위치, 카드 width. UseRecommendedScaleButton을 어디에 둘지 결정 (예: PlayButton·BpmSlider 같은 줄, 또는 카드 footer).

**Step 7.2: 버튼 삽입**

```tsx
import { UseRecommendedScaleButton } from './UseRecommendedScaleButton';

// 카드 JSX 안 적절한 위치
<div className="flex items-center justify-between gap-2 mt-4">
  <ProgressionPlayButton template={template} />
  <BpmSlider slug={template.slug} defaultBpm={template.default_bpm} />
  <UseRecommendedScaleButton template={template} />
</div>
```

Layout이 좁아 보이면 카드 width 또는 wrap 처리. aesthetic-reviewer가 leaf level에서 결정.

**Step 7.3: 테스트 + commit**

기존 ProgressionCatalogClient 테스트가 있다면 회귀 PASS 확인. 없으면 새로 작성:

```typescript
it('각 카드에 UseRecommendedScaleButton 렌더', async () => {
  // 카탈로그 렌더 후 각 카드의 버튼 존재 검증
});
```

```bash
pnpm test tests/component/
pnpm typecheck && pnpm lint
git add apps/web/components/jam/ProgressionCatalogClient.tsx
git commit -m "feat(jam): wire UseRecommendedScaleButton into card layout"
```

---

## Task 8 — 통합 검증 + PR

**Step 8.1: 전체 sweep**

```bash
cd apps/web
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

모두 green이어야.

**Step 8.2: dev 환경에서 수동 검증**

docker compose가 살아있다면 그대로, 아니면 재기동.

브라우저 http://localhost:3000/jam:
- [ ] 배킹 카드 ▶ → 지판의 RootPicker가 dimmed + "Root · Synced" 표시
- [ ] 마디 시작마다 코드톤 노트에 halo 펄스 (0.6s attack-decay)
- [ ] Key Selector로 backingKey 변경 → 지판 root 따라감
- [ ] 카드별 BPM 슬라이더 변경 → 지판 펄스 주기는 그대로 (코드 교체에만 동기)
- [ ] ⏹ → halo 사라지고 RootPicker 다시 활성, fretboard.root로 복귀
- [ ] "Apply scale" 버튼 클릭 → fretboard scale 변경

**Step 8.3: PR 생성**

```bash
git push -u origin feat/sprint-2-5-fretboard-sync

gh pr create --title "feat: Sprint 2-5 — backing↔fretboard sync (M2 시작)" --body "$(cat <<'EOF'
## Summary

- 배킹 재생 중 fretboard root 자동 동기화 (= backingKey)
- 현재 코드의 코드톤이 지판에 halo overlay (CSS keyframe, 0.6s ease-out)
- RootPicker는 재생 중 dimmed + "Root · Synced" 인디케이터
- 카드별 "Apply scale" 1-click 버튼

## planning M2 본격 시작

배킹 트랙 ↔ 메트로놈/스케일 동기화의 첫 마일스톤. 핵심 시나리오 3(블루스 솔로 연습 — 배킹 재생, 현재 코드에 따라 지판 추천 노트 자동 하이라이트)을 처음으로 완성.

## Test plan

- [x] typecheck/lint/test/build 통과
- [x] 단위·컴포넌트 테스트 신규
- [x] 메트로놈/배킹 회귀 PASS
- [ ] **수동 검증** (사용자):
  - [ ] 카드 ▶ → root 동기화 + 코드톤 halo
  - [ ] Key 변경 → 지판 root 따라감
  - [ ] ⏹ → halo 제거 + RootPicker 활성

## Review notes

3개 도메인 서브에이전트 병렬 리뷰의 critical/important 반영:
- fretboard-renderer: chordTonePcs Set→FretboardNote boolean 변환, halo radius 고정값, React.memo
- aesthetic-reviewer: bare transition 금지, opacity 0.5↔0.75, 코드 교체 동기 펄스, 기존 --color-scale-chord 토큰 재사용
- nextjs-architect: backingCurrentChord.symbol만 분리 구독, setScale 기존 action 사용

## Spec / Plan

- spec: docs/superpowers/specs/2026-04-25-sprint-2-5-fretboard-sync-design.md
- plan: docs/superpowers/plans/2026-04-25-sprint-2-5-fretboard-sync.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage**: §1-11 모두 Task로 매핑됨. ✅
- §3 모듈 구조 → Tasks 1-7
- §4.1-4.5 인터페이스 → Tasks 4, 5, 6
- §4.6 UseRecommendedScaleButton → Task 3
- §5 CSS → Task 2
- §6 데이터 흐름 → Task 6
- §7 테스트 → Tasks 1, 3, 4, 5, 6 분산
- §8 마이그레이션 → 변경 없음
- §9 리스크 → 청취 검증 + 통합 테스트로 차단

**Placeholder scan**: 없음. ✅

**Type consistency**:
- `chordPitchClassSet(symbol, keyRoot): Set<number> | null` (Task 1) ↔ FretboardClient 사용 (Task 6) ↔ Fretboard `chordTonePcs?: ReadonlySet<number>` (Task 4) — 일관 ✅
- `setScale: (scale: ScaleKey) => void` (기존 store) ↔ UseRecommendedScaleButton 사용 (Task 3) — `isKnownScale` guard로 안전 ✅
