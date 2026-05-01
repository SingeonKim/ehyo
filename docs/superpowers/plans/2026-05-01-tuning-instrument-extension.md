# Tuning · Instrument · Fret 확장 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6현 기타 단일 페르소나에서 6현 + 7현 + 4현 베이스 3페르소나로 지판·연습 흐름을 확장한다. 음악 이론·카탈로그 데이터·코드 보이싱은 0줄 변경.

**Architecture:** `lib/theory/tunings.ts` 신규 모듈에 7 preset 정의 → store에 `fretboard.tuning: TuningPresetId` + `backing.voiceMutes` 추가 → `Fretboard.tsx`의 `STRING_COUNT = 6` 하드코딩을 props로 가변화 → UI 컨트롤 4종(Instrument/Tuning/FretCount/VoiceMute) 추가 → backing engine voice trigger에 mute 게이트 추가. persist v11 → v12 마이그레이션.

**Tech Stack:** Next.js 15 App Router, Zustand persist + immer, Tailwind v4, Vitest + Testing Library + Playwright, smplr (Soundfont/DrumMachine).

**Spec:** `docs/superpowers/specs/2026-05-01-tuning-instrument-extension-design.md`

---

## File Structure

### 신규 파일

| 파일 | 책임 |
|---|---|
| `apps/web/lib/theory/tunings.ts` | 7 preset 정의, `TuningPreset` 타입, `presetsByInstrument`, `DEFAULT_PRESET_BY_INSTRUMENT` |
| `apps/web/components/fretboard/InstrumentSelector.tsx` | Segmented control: Guitar 6 / Guitar 7 / Bass 4 |
| `apps/web/components/fretboard/TuningPresetSelector.tsx` | 선택된 instrument의 tuning preset dropdown |
| `apps/web/components/fretboard/FretCountToggle.tsx` | 22 ↔ 24 토글 |
| `apps/web/components/jam/VoiceMutePanel.tsx` | drums/bass/guitar/aux 4 칩 mute 토글 |
| `apps/web/tests/unit/lib/theory/tunings.test.ts` | preset 데이터·헬퍼 단위 테스트 |
| `apps/web/tests/component/instrument-selector.test.tsx` | 컴포넌트 동작 |
| `apps/web/tests/component/voice-mute-panel.test.tsx` | 컴포넌트 동작 |
| `apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts` | voice mute → trigger 스킵 |
| `apps/web/tests/e2e/tuning-instrument.spec.ts` | E2E smoke (instrument 전환·readout·24fret) |

### 수정 파일

| 파일 | 변경 |
|---|---|
| `apps/web/lib/theory/fretboard.ts` | `STANDARD_TUNING`을 `tunings.ts`에서 re-export |
| `apps/web/lib/store/app-store.ts` | `fretboard.tuning` + `backing.voiceMutes` 필드, actions, v11→v12 migrate |
| `apps/web/lib/store/hooks.ts` | `useTuning`, `useInstrument` 셀렉터 |
| `apps/web/components/fretboard/Fretboard.tsx` | `STRING_COUNT = 6` 제거, `stringCount` props 가변화 |
| `apps/web/components/fretboard/FretboardSurface.tsx` | `STANDARD_TUNING` 직접 import → `useTuning()` 셀렉터 |
| `apps/web/components/fretboard/FretboardControls.tsx` | "Instrument & Tuning" 패널 추가 |
| `apps/web/components/jam/ProgressionCatalogClient.tsx` | 헤더에 `VoiceMutePanel` 추가 |
| `apps/web/lib/audio/backing/engine.ts` | voice trigger 분기에 mute 게이트, `setVoiceMute` 메서드 export |
| `apps/web/tests/component/fretboard.test.tsx` | `stringCount` 가변 케이스 |
| `apps/web/tests/unit/lib/theory/fretboard.test.ts` | 7현/4현 tuning 케이스 |
| `apps/web/tests/unit/lib/store/app-store.test.ts` | v12 migrate 케이스 |
| `CLAUDE.md` | "주요 설계 결정"에 *튜닝 가변·voice mute* 추가 |
| `docs/planning.md` §6.2.5 | 다중 instrument 명시 |

---

## Task 순서 & 의존성

```
1. tunings.ts (데이터)            ← 베이스. 다른 모든 task의 전제
2. STANDARD_TUNING re-export       ← 기존 회귀 0건 검증
3. store: fretboard.tuning + actions
4. store: backing.voiceMutes + actions
5. persist v11 → v12 migrate
6. Fretboard.tsx stringCount 가변화 ← SVG 수술
7. FretboardSurface.tsx tuning 셀렉터
8. InstrumentSelector
9. TuningPresetSelector
10. FretCountToggle
11. FretboardControls 패널 통합
12. engine.ts voice mute 게이트
13. VoiceMutePanel
14. ProgressionCatalogClient 통합
15. E2E smoke
16. 문서 업데이트
```

각 task = 독립 commit. TDD: 테스트 먼저 → 실패 확인 → 최소 구현 → 통과 확인 → 커밋.

---

## Task 1: `tunings.ts` — 7 preset 데이터 + 헬퍼

**Files:**
- Create: `apps/web/lib/theory/tunings.ts`
- Create: `apps/web/tests/unit/lib/theory/tunings.test.ts`

- [ ] **Step 1.1: Write failing test**

```ts
// apps/web/tests/unit/lib/theory/tunings.test.ts
import { describe, it, expect } from 'vitest';
import {
  TUNING_PRESETS,
  presetsByInstrument,
  DEFAULT_PRESET_BY_INSTRUMENT,
  type InstrumentKind,
  type TuningPresetId,
} from '@/lib/theory/tunings';

describe('TUNING_PRESETS', () => {
  it('has 7 presets', () => {
    expect(Object.keys(TUNING_PRESETS)).toHaveLength(7);
  });

  it('guitar-6 standard is EADGBE (PC 4-9-2-7-11-4)', () => {
    const p = TUNING_PRESETS['guitar-6-standard'];
    expect(p.instrument).toBe('guitar-6');
    expect(p.tuning).toEqual([4, 9, 2, 7, 11, 4]);
    expect(p.tuning).toHaveLength(6);
    expect(p.displayString).toBe('EADGBE');
  });

  it('guitar-6 drop d lowers 6th string E→D', () => {
    const p = TUNING_PRESETS['guitar-6-drop-d'];
    expect(p.tuning[0]).toBe(2); // D
    expect(p.tuning.slice(1)).toEqual([9, 2, 7, 11, 4]);
    expect(p.displayString).toBe('DADGBE');
  });

  it('guitar-6 dadgad', () => {
    const p = TUNING_PRESETS['guitar-6-dadgad'];
    expect(p.tuning).toEqual([2, 9, 2, 7, 9, 2]);
    expect(p.displayString).toBe('DADGAD');
  });

  it('guitar-6 eb-half steps every string down a semitone', () => {
    const p = TUNING_PRESETS['guitar-6-eb-half'];
    expect(p.tuning).toEqual([3, 8, 1, 6, 10, 3]);
    expect(p.displayString).toBe('E♭A♭D♭G♭B♭E♭');
  });

  it('guitar-7 standard is BEADGBE (low B added)', () => {
    const p = TUNING_PRESETS['guitar-7-standard'];
    expect(p.instrument).toBe('guitar-7');
    expect(p.tuning).toEqual([11, 4, 9, 2, 7, 11, 4]);
    expect(p.tuning).toHaveLength(7);
    expect(p.displayString).toBe('BEADGBE');
  });

  it('bass-4 standard is EADG (4 strings)', () => {
    const p = TUNING_PRESETS['bass-4-standard'];
    expect(p.instrument).toBe('bass-4');
    expect(p.tuning).toEqual([4, 9, 2, 7]);
    expect(p.tuning).toHaveLength(4);
    expect(p.displayString).toBe('EADG');
  });

  it('bass-4 drop d lowers 4th string E→D', () => {
    const p = TUNING_PRESETS['bass-4-drop-d'];
    expect(p.tuning).toEqual([2, 9, 2, 7]);
    expect(p.displayString).toBe('DADG');
  });

  it('every preset id matches its key', () => {
    for (const [id, preset] of Object.entries(TUNING_PRESETS)) {
      expect(preset.id).toBe(id);
    }
  });
});

describe('presetsByInstrument', () => {
  it('returns 4 presets for guitar-6', () => {
    const list = presetsByInstrument('guitar-6');
    expect(list).toHaveLength(4);
    expect(list[0]?.id).toBe('guitar-6-standard'); // standard always first
  });

  it('returns 1 preset for guitar-7', () => {
    const list = presetsByInstrument('guitar-7');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('guitar-7-standard');
  });

  it('returns 2 presets for bass-4 with standard first', () => {
    const list = presetsByInstrument('bass-4');
    expect(list).toHaveLength(2);
    expect(list[0]?.id).toBe('bass-4-standard');
    expect(list[1]?.id).toBe('bass-4-drop-d');
  });
});

describe('DEFAULT_PRESET_BY_INSTRUMENT', () => {
  it.each<[InstrumentKind, TuningPresetId]>([
    ['guitar-6', 'guitar-6-standard'],
    ['guitar-7', 'guitar-7-standard'],
    ['bass-4', 'bass-4-standard'],
  ])('default for %s is %s', (kind, expected) => {
    expect(DEFAULT_PRESET_BY_INSTRUMENT[kind]).toBe(expected);
  });
});
```

- [ ] **Step 1.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/unit/lib/theory/tunings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement**

```ts
// apps/web/lib/theory/tunings.ts
import type { PitchClass } from './types';

/*
 * 튜닝 프리셋 카탈로그 — 7개 정의.
 *
 * 인덱스 규약 (planning.md §6.2.5 / fretboard.ts와 동일):
 *   index 0 = 최저음 (low E, low B 등)
 *   index length-1 = 최고음
 *
 * displayString은 readout 표시용. 이명동음 표기는 표기 컨벤션 따라 수동 작성.
 */

export type InstrumentKind = 'guitar-6' | 'guitar-7' | 'bass-4';

export type TuningPresetId =
  | 'guitar-6-standard'
  | 'guitar-6-drop-d'
  | 'guitar-6-dadgad'
  | 'guitar-6-eb-half'
  | 'guitar-7-standard'
  | 'bass-4-standard'
  | 'bass-4-drop-d';

export interface TuningPreset {
  id: TuningPresetId;
  instrument: InstrumentKind;
  /** UI 라벨 (Tuning dropdown 표시용). */
  label: string;
  /** index 0 = 최저음. length = 줄 개수. */
  tuning: readonly PitchClass[];
  /** readout 문자열 — 'EADGBE' / 'BEADGBE' / 'EADG' 등. */
  displayString: string;
}

export const TUNING_PRESETS: Record<TuningPresetId, TuningPreset> = {
  'guitar-6-standard': {
    id: 'guitar-6-standard',
    instrument: 'guitar-6',
    label: 'Standard',
    tuning: [4, 9, 2, 7, 11, 4],
    displayString: 'EADGBE',
  },
  'guitar-6-drop-d': {
    id: 'guitar-6-drop-d',
    instrument: 'guitar-6',
    label: 'Drop D',
    tuning: [2, 9, 2, 7, 11, 4],
    displayString: 'DADGBE',
  },
  'guitar-6-dadgad': {
    id: 'guitar-6-dadgad',
    instrument: 'guitar-6',
    label: 'DADGAD',
    tuning: [2, 9, 2, 7, 9, 2],
    displayString: 'DADGAD',
  },
  'guitar-6-eb-half': {
    id: 'guitar-6-eb-half',
    instrument: 'guitar-6',
    label: 'E♭ Half-step',
    // 모든 줄이 한 반음 내림. 4-1=3 (E♭), 9-1=8 (A♭) 등.
    tuning: [3, 8, 1, 6, 10, 3],
    displayString: 'E♭A♭D♭G♭B♭E♭',
  },
  'guitar-7-standard': {
    id: 'guitar-7-standard',
    instrument: 'guitar-7',
    label: 'Standard',
    // 6현 standard 앞에 low B(11) 추가.
    tuning: [11, 4, 9, 2, 7, 11, 4],
    displayString: 'BEADGBE',
  },
  'bass-4-standard': {
    id: 'bass-4-standard',
    instrument: 'bass-4',
    label: 'Standard',
    // 6현 standard의 6번~3번 줄과 동일 (EADG).
    tuning: [4, 9, 2, 7],
    displayString: 'EADG',
  },
  'bass-4-drop-d': {
    id: 'bass-4-drop-d',
    instrument: 'bass-4',
    label: 'Drop D',
    tuning: [2, 9, 2, 7],
    displayString: 'DADG',
  },
};

/**
 * Dropdown 표시용 — 같은 instrument의 preset만 추림.
 * 결과 첫 원소는 항상 standard (DEFAULT_PRESET_BY_INSTRUMENT와 일치).
 * 명시적 array literal 순서로 정의 — Record 순회 순서에 의존하지 않음.
 */
export function presetsByInstrument(kind: InstrumentKind): TuningPreset[] {
  switch (kind) {
    case 'guitar-6':
      return [
        TUNING_PRESETS['guitar-6-standard'],
        TUNING_PRESETS['guitar-6-drop-d'],
        TUNING_PRESETS['guitar-6-dadgad'],
        TUNING_PRESETS['guitar-6-eb-half'],
      ];
    case 'guitar-7':
      return [TUNING_PRESETS['guitar-7-standard']];
    case 'bass-4':
      return [
        TUNING_PRESETS['bass-4-standard'],
        TUNING_PRESETS['bass-4-drop-d'],
      ];
  }
}

/** 각 instrument의 default preset id. setInstrument 자동 전환 시 사용. */
export const DEFAULT_PRESET_BY_INSTRUMENT: Record<InstrumentKind, TuningPresetId> = {
  'guitar-6': 'guitar-6-standard',
  'guitar-7': 'guitar-7-standard',
  'bass-4': 'bass-4-standard',
};

/** 6현 표준 튜닝 — 별칭. fretboard.ts에서 re-export해 기존 import 유지. */
export const STANDARD_TUNING: readonly PitchClass[] = TUNING_PRESETS['guitar-6-standard'].tuning;
```

- [ ] **Step 1.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/unit/lib/theory/tunings.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 1.5: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (PitchClass type satisfies all literal numbers).

- [ ] **Step 1.6: Commit**

```bash
git add apps/web/lib/theory/tunings.ts apps/web/tests/unit/lib/theory/tunings.test.ts
git commit -m "feat(theory): add tuning preset catalog (7 presets across 3 instruments)

6현 4종(Standard/Drop D/DADGAD/E♭ Half-step) + 7현 1종(Standard) +
4현 베이스 2종(Standard/Drop D). instrument-tuning 두 단계 UI의
데이터 소스로 기능. STANDARD_TUNING 별칭은 fretboard.ts re-export로
기존 import 유지."
```

---

## Task 2: `STANDARD_TUNING` 별칭 re-export — 기존 import 회귀 0건 보장

**Files:**
- Modify: `apps/web/lib/theory/fretboard.ts:18`

- [ ] **Step 2.1: 기존 import 카운트 측정**

Run: `grep -rn "STANDARD_TUNING" apps/web/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | wc -l`
Expected: 30+ (앞으로 이 숫자가 줄지 않아야 회귀 0).

- [ ] **Step 2.2: `fretboard.ts`에서 `STANDARD_TUNING` 정의를 re-export로 교체**

```ts
// apps/web/lib/theory/fretboard.ts
// 기존 line 17-18:
- /** 표준 튜닝: 6번줄부터 EADGBE. */
- export const STANDARD_TUNING: readonly PitchClass[] = [4, 9, 2, 7, 11, 4] as const;

// 변경:
+ /**
+  * 표준 튜닝: 6번줄부터 EADGBE.
+  * tunings.ts의 'guitar-6-standard' preset과 동일. 별칭 re-export로
+  * 기존 import(테스트 30+개) 호환을 유지한다. 신규 코드는 store 셀렉터
+  * useTuning()을 통해 동적 tuning을 받기를 권장.
+  */
+ export { STANDARD_TUNING } from './tunings';
```

- [ ] **Step 2.3: Run unit + component tests, verify 0 failures**

Run: `pnpm test apps/web/tests/unit/lib/theory/fretboard.test.ts apps/web/tests/component/fretboard.test.tsx`
Expected: All existing tests still PASS — re-export가 동일 array를 노출하므로 동작 동일.

- [ ] **Step 2.4: 전체 회귀 게이트**

Run: `pnpm test`
Expected: PASS (기존 30+ STANDARD_TUNING import가 모두 정상).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/lib/theory/fretboard.ts
git commit -m "refactor(theory): re-export STANDARD_TUNING from tunings.ts

단일 진실 소스를 tunings.ts로 옮기고 fretboard.ts는 별칭 re-export.
기존 STANDARD_TUNING import 30+개의 동작은 동일."
```

---

## Task 3: store에 `fretboard.tuning` 필드 + actions

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Modify: `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 3.1: 실패 테스트 작성**

```ts
// apps/web/tests/unit/lib/store/app-store.test.ts 끝에 추가
describe('Tuning / Instrument actions', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.fretboard.tuning = 'guitar-6-standard';
    });
  });

  it('default tuning is guitar-6-standard', () => {
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-standard');
  });

  it('setTuning updates store without touching root', () => {
    useAppStore.getState().setRoot(7); // G
    useAppStore.getState().setTuning('guitar-6-drop-d');
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-drop-d');
    expect(useAppStore.getState().fretboard.root).toBe(7); // root preserved
  });

  it('setInstrument keeps tuning if already in that instrument', () => {
    useAppStore.getState().setTuning('guitar-6-drop-d');
    useAppStore.getState().setInstrument('guitar-6');
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-drop-d');
  });

  it('setInstrument switches to default preset for new instrument', () => {
    useAppStore.getState().setTuning('guitar-6-drop-d');
    useAppStore.getState().setInstrument('bass-4');
    expect(useAppStore.getState().fretboard.tuning).toBe('bass-4-standard');

    useAppStore.getState().setInstrument('guitar-7');
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-7-standard');
  });

  it('setFretCount updates frets', () => {
    useAppStore.getState().setFretCount(24);
    expect(useAppStore.getState().fretboard.frets).toBe(24);
    useAppStore.getState().setFretCount(22);
    expect(useAppStore.getState().fretboard.frets).toBe(22);
  });
});
```

- [ ] **Step 3.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "Tuning / Instrument"`
Expected: FAIL — `setTuning`, `setInstrument`, `setFretCount` undefined.

- [ ] **Step 3.3: Store 타입 + actions 추가**

`apps/web/lib/store/app-store.ts` 변경:

```ts
// import 추가 (파일 상단 import 블록):
import {
  TUNING_PRESETS,
  DEFAULT_PRESET_BY_INSTRUMENT,
  type InstrumentKind,
  type TuningPresetId,
} from '@/lib/theory/tunings';
```

```ts
// FretboardState 인터페이스 (line 56)에 tuning 추가:
export interface FretboardState {
  root: PitchClass;
  scale: ScaleKey;
  highlightsByScale: Partial<Record<ScaleKey, Record<number, ImportantColor>>>;
  labelMode: LabelMode;
  handedness: Handedness;
  frets: 22 | 24;
  fretSpacing: FretSpacing;
  accidentalMode: AccidentalMode;
  /** 신규: 선택된 튜닝 프리셋 id. instrument 정보도 이 id에서 파생. */
  tuning: TuningPresetId;
}
```

```ts
// AppState 인터페이스에 actions 추가 (지판 액션 섹션, cycleNoteHighlight 다음 라인):
  setTuning: (id: TuningPresetId) => void;
  setInstrument: (kind: InstrumentKind) => void;
  setFretCount: (frets: 22 | 24) => void;
```

```ts
// DEFAULT_FRETBOARD에 tuning 추가:
const DEFAULT_FRETBOARD: FretboardState = {
  root: 0,
  scale: 'major',
  highlightsByScale: {},
  labelMode: 'name',
  handedness: 'right',
  frets: 22,
  fretSpacing: 'uniform',
  accidentalMode: 'auto',
  tuning: 'guitar-6-standard',
};
```

```ts
// immer((set) => ({...})) 내부 actions 추가 (다른 setRoot/setScale 근처):
  setTuning: (id) => set((s) => {
    s.fretboard.tuning = id;
  }),

  setInstrument: (kind) => set((s) => {
    // 현재 tuning이 새 instrument에 속하면 유지, 아니면 default로 전환.
    // 같은 instrument 안에서의 변형 보존이 사용자 의도에 가까움.
    const currentInstrument = TUNING_PRESETS[s.fretboard.tuning].instrument;
    if (currentInstrument !== kind) {
      s.fretboard.tuning = DEFAULT_PRESET_BY_INSTRUMENT[kind];
    }
  }),

  setFretCount: (frets) => set((s) => {
    s.fretboard.frets = frets;
  }),
```

- [ ] **Step 3.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "Tuning / Instrument"`
Expected: PASS (5 tests).

- [ ] **Step 3.5: 회귀 게이트**

Run: `pnpm typecheck && pnpm test`
Expected: PASS — TuningPresetId가 모든 호출에서 type-safe.

- [ ] **Step 3.6: Commit**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/app-store.test.ts
git commit -m "feat(store): add fretboard.tuning + setTuning/setInstrument/setFretCount

setInstrument는 현재 tuning이 새 instrument에 속하면 유지, 아니면
DEFAULT_PRESET_BY_INSTRUMENT로 자동 전환. root는 setTuning과 무관."
```

---

## Task 4: store에 `backing.voiceMutes` 필드 + action

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Modify: `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 4.1: 실패 테스트 작성**

```ts
// app-store.test.ts에 추가
describe('Voice mute actions', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.backing.voiceMutes = { drums: false, bass: false, guitar: false, aux: false };
    });
  });

  it('default voiceMutes are all false', () => {
    expect(useAppStore.getState().backing.voiceMutes).toEqual({
      drums: false, bass: false, guitar: false, aux: false,
    });
  });

  it('toggleVoiceMute flips drums only', () => {
    useAppStore.getState().toggleVoiceMute('drums');
    expect(useAppStore.getState().backing.voiceMutes).toEqual({
      drums: true, bass: false, guitar: false, aux: false,
    });
  });

  it('toggleVoiceMute is independent per voice', () => {
    useAppStore.getState().toggleVoiceMute('bass');
    useAppStore.getState().toggleVoiceMute('aux');
    expect(useAppStore.getState().backing.voiceMutes).toEqual({
      drums: false, bass: true, guitar: false, aux: true,
    });
  });

  it('toggleVoiceMute twice returns to false', () => {
    useAppStore.getState().toggleVoiceMute('guitar');
    useAppStore.getState().toggleVoiceMute('guitar');
    expect(useAppStore.getState().backing.voiceMutes.guitar).toBe(false);
  });
});
```

- [ ] **Step 4.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "Voice mute"`
Expected: FAIL — `voiceMutes` undefined, `toggleVoiceMute` not a function.

- [ ] **Step 4.3: Store 변경**

```ts
// VoiceKind 타입을 파일 상단 또는 backing 섹션에 정의:
export type VoiceKind = 'drums' | 'bass' | 'guitar' | 'aux';

// BackingSliceState 인터페이스 (line 87)에 추가:
export interface BackingSliceState {
  // 기존 필드 유지
  /** 신규. 영속. voice별 mute 상태. 카드 재생 중 토글하면 다음 비트부터 반영. */
  voiceMutes: Record<VoiceKind, boolean>;
  // 기존 backingSelectedSlug, backingSelectedBarIndex 등 유지
}

// AppState에 action 추가 (배킹 액션 섹션):
  toggleVoiceMute: (voice: VoiceKind) => void;

// DEFAULT_BACKING에 추가:
const DEFAULT_BACKING: BackingSliceState = {
  // 기존 필드
  voiceMutes: { drums: false, bass: false, guitar: false, aux: false },
  // 기존 backingSelectedSlug 등
};

// immer actions에 추가:
  toggleVoiceMute: (voice) => set((s) => {
    s.backing.voiceMutes[voice] = !s.backing.voiceMutes[voice];
  }),
```

- [ ] **Step 4.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "Voice mute"`
Expected: PASS (4 tests).

- [ ] **Step 4.5: 회귀 게이트**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4.6: Commit**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/app-store.test.ts
git commit -m "feat(store): add backing.voiceMutes + toggleVoiceMute action

drums/bass/guitar/aux 4개 voice별 boolean. 카드 재생 중 토글하면
다음 비트부터 반영(엔진이 trigger 시점마다 셀렉터 재평가)."
```

---

## Task 5: persist v11 → v12 migrate

**Files:**
- Modify: `apps/web/lib/store/app-store.ts` (migrate 함수, version 번호)
- Modify: `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 5.1: Migrate 테스트 작성**

```ts
// app-store.test.ts 끝에 추가
import { __migrate } from '@/lib/store/app-store';

describe('persist v11 → v12 migrate', () => {
  it('adds fretboard.tuning when missing', () => {
    const oldState = {
      fretboard: { root: 0, scale: 'major', frets: 22 },
      backing: { volume: 0.5, backingPlayingCategory: null },
    };
    const migrated = __migrate(oldState, 11) as Record<string, unknown>;
    const fb = migrated.fretboard as Record<string, unknown>;
    expect(fb.tuning).toBe('guitar-6-standard');
  });

  it('adds backing.voiceMutes when missing', () => {
    const oldState = {
      fretboard: { root: 0, scale: 'major' },
      backing: { volume: 0.5 },
    };
    const migrated = __migrate(oldState, 11) as Record<string, unknown>;
    const backing = migrated.backing as Record<string, unknown>;
    expect(backing.voiceMutes).toEqual({
      drums: false, bass: false, guitar: false, aux: false,
    });
  });

  it('preserves user-set tuning when migrating from older versions', () => {
    const oldState = {
      fretboard: { root: 7, scale: 'minor', tuning: 'bass-4-drop-d' },
      backing: {},
    };
    const migrated = __migrate(oldState, 11) as Record<string, unknown>;
    const fb = migrated.fretboard as Record<string, unknown>;
    expect(fb.tuning).toBe('bass-4-drop-d'); // already valid, untouched
  });

  it('preserves user-set voiceMutes', () => {
    const oldState = {
      fretboard: {},
      backing: { voiceMutes: { drums: true, bass: false, guitar: false, aux: false } },
    };
    const migrated = __migrate(oldState, 11) as Record<string, unknown>;
    const backing = migrated.backing as Record<string, unknown>;
    expect((backing.voiceMutes as Record<string, boolean>).drums).toBe(true);
  });

  it('does not corrupt other fields', () => {
    const oldState = {
      fretboard: { root: 5, scale: 'dorian', frets: 24, accidentalMode: 'sharp' },
      backing: { volume: 0.7, bpmOverrides: { 'card-x': 100 } },
      ui: { chordDisplayMode: 'absolute' },
    };
    const migrated = __migrate(oldState, 11) as Record<string, unknown>;
    const fb = migrated.fretboard as Record<string, unknown>;
    const backing = migrated.backing as Record<string, unknown>;
    expect(fb.root).toBe(5);
    expect(fb.scale).toBe('dorian');
    expect(fb.frets).toBe(24);
    expect(backing.volume).toBe(0.7);
    expect((backing.bpmOverrides as Record<string, number>)['card-x']).toBe(100);
  });
});
```

- [ ] **Step 5.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "v11"`
Expected: FAIL — `fretboard.tuning` not added.

- [ ] **Step 5.3: Migrate 함수 + version bump**

`app-store.ts`의 migrate 함수 끝에 추가 (line 320 `return persistedState` 직전):

```ts
  // v11 → v12: fretboard.tuning 신규 + backing.voiceMutes 신규.
  //   tuning은 6현 standard로 시작 — 기존 6현 사용자에게 가장 자연스러운 default.
  //   voiceMutes는 4 voice 모두 false — 기존 동작과 동일(아무것도 음소거 안 됨).
  if (version < 12) {
    const fb = (s.fretboard as Record<string, unknown>) ?? {};
    if (typeof fb.tuning !== 'string') {
      fb.tuning = 'guitar-6-standard';
    }
    s.fretboard = fb;

    const backing = (s.backing as Record<string, unknown>) ?? {};
    if (
      !backing.voiceMutes ||
      typeof backing.voiceMutes !== 'object' ||
      Array.isArray(backing.voiceMutes)
    ) {
      backing.voiceMutes = { drums: false, bass: false, guitar: false, aux: false };
    }
    s.backing = backing;
  }
```

`persist` config의 version을 11 → 12로 변경 (line 555):

```ts
- version: 11,
+ version: 12,
```

- [ ] **Step 5.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/unit/lib/store/app-store.test.ts -t "v11"`
Expected: PASS (5 tests).

- [ ] **Step 5.5: 전체 회귀 게이트**

Run: `pnpm test apps/web/tests/unit/lib/store/`
Expected: 모든 기존 migrate 테스트 + v11→v12 모두 PASS.

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/app-store.test.ts
git commit -m "feat(store): persist v11 → v12 migrate (tuning + voiceMutes)

기존 사용자: tuning이 'guitar-6-standard'로 채워지고 voiceMutes는
4개 모두 false. 사용자가 이미 입력한 값이 있으면 그대로 보존."
```

---

## Task 6: `Fretboard.tsx` — `STRING_COUNT` 제거 + props 가변화

**Files:**
- Modify: `apps/web/components/fretboard/Fretboard.tsx`
- Modify: `apps/web/tests/component/fretboard.test.tsx`

- [ ] **Step 6.1: stringCount 가변 컴포넌트 테스트 추가**

기존 `fretboard.test.tsx`에 case 추가:

```ts
import { render } from '@testing-library/react';
import { Fretboard } from '@/components/fretboard/Fretboard';
import { TUNING_PRESETS } from '@/lib/theory/tunings';
// 기존 helpers 그대로 사용. 이미 helper에 tuning 인자 받는 형태라면 OK,
// 아니면 helper에 tuning 인자를 추가해 호출자가 stringCount를 넘기도록 변경.

describe('Fretboard with variable stringCount', () => {
  it('renders 6 strings for guitar-6 tuning', () => {
    const { container } = renderWithTuning(TUNING_PRESETS['guitar-6-standard'].tuning);
    const stringLines = container.querySelectorAll('[data-testid^="string-"]');
    expect(stringLines).toHaveLength(6);
  });

  it('renders 7 strings for guitar-7 tuning (low B at bottom)', () => {
    const { container } = renderWithTuning(TUNING_PRESETS['guitar-7-standard'].tuning);
    const stringLines = container.querySelectorAll('[data-testid^="string-"]');
    expect(stringLines).toHaveLength(7);
  });

  it('renders 4 strings for bass-4 tuning', () => {
    const { container } = renderWithTuning(TUNING_PRESETS['bass-4-standard'].tuning);
    const stringLines = container.querySelectorAll('[data-testid^="string-"]');
    expect(stringLines).toHaveLength(4);
  });

  it('SVG height scales with stringCount (4 < 6 < 7)', () => {
    const get = (tuning: readonly number[]) => {
      const { container } = renderWithTuning(tuning);
      const svg = container.querySelector('svg')!;
      return parseFloat(svg.getAttribute('height') || svg.getAttribute('viewBox')!.split(' ')[3]!);
    };
    const h4 = get(TUNING_PRESETS['bass-4-standard'].tuning);
    const h6 = get(TUNING_PRESETS['guitar-6-standard'].tuning);
    const h7 = get(TUNING_PRESETS['guitar-7-standard'].tuning);
    expect(h4).toBeLessThan(h6);
    expect(h6).toBeLessThan(h7);
  });
});

// renderWithTuning helper:
function renderWithTuning(tuning: readonly number[]) {
  const notes = getFretboardNotes({
    tuning, frets: 22, root: 0, scale: 'major',
    highlights: resolveScaleHighlights('major'), useFlats: false,
  });
  const openStrings = getOpenStringLabels(tuning, false);
  return render(
    <Fretboard
      notes={notes}
      openStrings={openStrings}
      stringCount={tuning.length}
      frets={22}
      handedness="right"
      fretSpacing="uniform"
      labelMode="name"
      ghostNotes={[]}
    />,
  );
}
```

기존 string line 렌더 위치에 `data-testid={\`string-${num}\`}` 부착이 필요 — 다음 step에서 추가.

- [ ] **Step 6.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/component/fretboard.test.tsx -t "variable stringCount"`
Expected: FAIL — `stringCount` prop missing, `data-testid` 누락.

- [ ] **Step 6.3: `Fretboard.tsx` 수술**

```tsx
// apps/web/components/fretboard/Fretboard.tsx
// 기존 line 52:
- const STRING_COUNT = 6;

// FretboardProps 인터페이스 (line 20 부근)에 추가:
+ stringCount: number;

// 컴포넌트 함수 시그니처에서 stringCount destructure:
- export function Fretboard({ notes, openStrings, frets, handedness, ... }: FretboardProps) {
+ export function Fretboard({ notes, openStrings, stringCount, frets, handedness, ... }: FretboardProps) {

// stringY 함수 가변화 (line ~116):
- const stringY = (num: number) => (STRING_COUNT - num) * STRING_SPACING_PX + nutPadding;
+ const stringY = (num: number) => (stringCount - num) * STRING_SPACING_PX + nutPadding;

// SVG height 계산 (현재 STRING_COUNT * STRING_SPACING_PX + 패딩 형태인 곳):
- const svgHeight = STRING_COUNT * STRING_SPACING_PX + verticalPadding * 2;
+ const svgHeight = stringCount * STRING_SPACING_PX + verticalPadding * 2;

// string line 렌더 루프 (line ~226 근처):
- {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map((num) => (
+ {Array.from({ length: stringCount }, (_, i) => i + 1).map((num) => (
    <line
      key={`string-${num}`}
+     data-testid={`string-${num}`}
      x1={...}
      ...
    />
  ))}
```

`STRING_COUNT` 잔존물 검증:

Run: `grep -n "STRING_COUNT" apps/web/components/fretboard/Fretboard.tsx`
Expected: 0 hits (모두 stringCount로 대체됨).

- [ ] **Step 6.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/component/fretboard.test.tsx`
Expected: PASS — 새 case 4개 + 기존 case 모두 통과.

- [ ] **Step 6.5: 회귀 게이트**

Run: `pnpm typecheck`
Expected: FAIL — `FretboardSurface.tsx`가 stringCount prop을 아직 안 넘김. (다음 task에서 수정)

이건 의도된 실패. Task 7에서 surface 수정 후 재검증.

- [ ] **Step 6.6: Commit (의도된 typecheck 실패 상태이지만 unit + component 테스트는 통과)**

```bash
git add apps/web/components/fretboard/Fretboard.tsx apps/web/tests/component/fretboard.test.tsx
git commit -m "refactor(fretboard): make stringCount a prop, remove STRING_COUNT=6 hardcode

SVG height와 stringY 매핑이 stringCount로 가변화. data-testid 추가로
component test에서 줄 개수 검증 가능. FretboardSurface.tsx 호출부는
다음 커밋에서 stringCount 전달."
```

---

## Task 7: `FretboardSurface.tsx` — `useTuning()` 셀렉터 + stringCount 전달

**Files:**
- Modify: `apps/web/lib/store/hooks.ts`
- Modify: `apps/web/components/fretboard/FretboardSurface.tsx`

- [ ] **Step 7.1: 셀렉터 hook 작성**

```ts
// apps/web/lib/store/hooks.ts 끝에 추가
import { TUNING_PRESETS, type InstrumentKind } from '@/lib/theory/tunings';
import type { PitchClass } from '@/lib/theory/types';

/**
 * 현재 선택된 튜닝의 PitchClass 배열을 반환.
 * store는 TuningPresetId만 보관하고, 컴포넌트는 array를 받아
 * 데이터 형태 변경에 영향받지 않도록 격리.
 */
export function useTuning(): readonly PitchClass[] {
  const id = useAppStore((s) => s.fretboard.tuning);
  return TUNING_PRESETS[id].tuning;
}

/** 현재 instrument kind. UI 분기(InstrumentSelector active state)에 사용. */
export function useInstrument(): InstrumentKind {
  const id = useAppStore((s) => s.fretboard.tuning);
  return TUNING_PRESETS[id].instrument;
}
```

- [ ] **Step 7.2: `FretboardSurface.tsx` 수술**

```tsx
// 기존 import 변경:
- import { STANDARD_TUNING, getFretboardNotes, ... } from '@/lib/theory/fretboard';
+ import { getFretboardNotes, ... } from '@/lib/theory/fretboard';
+ import { useTuning } from '@/lib/store/hooks';

// 컴포넌트 본문 (line ~50):
+ const tuning = useTuning();

// notes useMemo 변경 (line 90):
const notes = useMemo(() => {
  const highlights = resolveScaleHighlights(scale, highlightsOverride);
  return getFretboardNotes({
-   tuning: STANDARD_TUNING,
+   tuning,
    frets,
    root,
    scale,
    highlights,
    useFlats,
  });
- }, [root, scale, frets, highlightsOverride, useFlats]);
+ }, [tuning, root, scale, frets, highlightsOverride, useFlats]);

// ghostNotes useMemo도 동일하게 STANDARD_TUNING → tuning + deps에 tuning 추가

// openStrings useMemo:
const openStrings = useMemo(
- () => getOpenStringLabels(STANDARD_TUNING, useFlats),
+ () => getOpenStringLabels(tuning, useFlats),
- [useFlats],
+ [tuning, useFlats],
);

// <Fretboard> 호출에 stringCount prop 추가:
<Fretboard
  notes={notes}
  openStrings={openStrings}
+ stringCount={tuning.length}
  frets={frets}
  ...
/>
```

- [ ] **Step 7.3: typecheck 회귀 게이트**

Run: `pnpm typecheck`
Expected: PASS — Task 6의 의도된 실패가 해결됨.

- [ ] **Step 7.4: 전체 테스트**

Run: `pnpm test`
Expected: PASS — 기존 STANDARD_TUNING 기반 테스트는 별칭으로 유지되어 동작 동일.

- [ ] **Step 7.5: 수동 smoke (dev 서버)**

Run: `pnpm dev`

브라우저 `http://localhost:3000/fretboard`:
- [ ] 6현 지판이 정상 렌더되는지 확인 (회귀 0)
- [ ] DevTools Console에서 `localStorage.removeItem('my-music-app:v1'); location.reload();` → 첫 마운트 정상

DevTools Console에서 store 검증:
```js
// store action 직접 호출
useAppStore.getState().setTuning('guitar-7-standard'); // 아직 UI는 없지만 store는 작동해야 함
// 즉시 지판이 7줄로 변하는지 확인
```

- [ ] **Step 7.6: Commit**

```bash
git add apps/web/lib/store/hooks.ts apps/web/components/fretboard/FretboardSurface.tsx
git commit -m "feat(fretboard): wire useTuning selector + stringCount to Surface

store의 fretboard.tuning을 셀렉터로 변환해 PitchClass[]를 직접 받음.
Fretboard.tsx에 stringCount={tuning.length}을 전달해 4/6/7현 자동 렌더.
DevTools에서 useAppStore.getState().setTuning() 호출 시 즉시 반영."
```

---

## Task 8: `InstrumentSelector` 컴포넌트

**Files:**
- Create: `apps/web/components/fretboard/InstrumentSelector.tsx`
- Create: `apps/web/tests/component/instrument-selector.test.tsx`

- [ ] **Step 8.1: 실패 컴포넌트 테스트 작성**

```tsx
// apps/web/tests/component/instrument-selector.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstrumentSelector } from '@/components/fretboard/InstrumentSelector';
import { useAppStore } from '@/lib/store/app-store';

describe('InstrumentSelector', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.fretboard.tuning = 'guitar-6-standard';
    });
  });

  it('renders 3 segmented options', () => {
    render(<InstrumentSelector />);
    expect(screen.getByRole('button', { name: /guitar 6/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guitar 7/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bass 4/i })).toBeInTheDocument();
  });

  it('marks current instrument as aria-pressed', () => {
    render(<InstrumentSelector />);
    expect(screen.getByRole('button', { name: /guitar 6/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /guitar 7/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching to guitar-7 sets tuning to guitar-7-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /guitar 7/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-7-standard');
  });

  it('switching to bass-4 sets tuning to bass-4-standard', () => {
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /bass 4/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('bass-4-standard');
  });

  it('clicking same instrument keeps tuning preset (no reset)', () => {
    useAppStore.getState().setTuning('guitar-6-drop-d');
    render(<InstrumentSelector />);
    fireEvent.click(screen.getByRole('button', { name: /guitar 6/i }));
    expect(useAppStore.getState().fretboard.tuning).toBe('guitar-6-drop-d');
  });
});
```

- [ ] **Step 8.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/component/instrument-selector.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 8.3: Implement**

```tsx
// apps/web/components/fretboard/InstrumentSelector.tsx
'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';
import { useInstrument } from '@/lib/store/hooks';
import type { InstrumentKind } from '@/lib/theory/tunings';

/*
 * Instrument segmented control — Guitar 6 / Guitar 7 / Bass 4.
 * 클릭 시 setInstrument를 호출. 같은 instrument 안에서의 tuning 변형은
 * 보존(스토어 액션이 분기 처리).
 *
 * 디자인 토큰: 활성 칸은 bg-bg-elevated + text-accent-brass, 비활성은 text-ink-muted.
 * Hex 하드코딩 금지 — aesthetic-reviewer 게이트.
 */

const OPTIONS: { kind: InstrumentKind; label: string }[] = [
  { kind: 'guitar-6', label: 'Guitar 6' },
  { kind: 'guitar-7', label: 'Guitar 7' },
  { kind: 'bass-4', label: 'Bass 4' },
];

export function InstrumentSelector() {
  const current = useInstrument();
  const setInstrument = useAppStore((s) => s.setInstrument);

  return (
    <div role="group" aria-label="Instrument" className="inline-flex border border-ink-muted/30">
      {OPTIONS.map(({ kind, label }) => {
        const active = kind === current;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            onClick={() => setInstrument(kind)}
            className={clsx(
              'px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors',
              active
                ? 'bg-bg-elevated text-accent-brass'
                : 'bg-transparent text-ink-muted hover:text-ink-primary',
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

- [ ] **Step 8.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/component/instrument-selector.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 8.5: Commit**

```bash
git add apps/web/components/fretboard/InstrumentSelector.tsx apps/web/tests/component/instrument-selector.test.tsx
git commit -m "feat(fretboard): InstrumentSelector segmented control

Guitar 6 / Guitar 7 / Bass 4 — aria-pressed로 활성 표시, 같은
instrument 클릭 시 tuning preset 유지(setInstrument의 분기 처리)."
```

---

## Task 9: `TuningPresetSelector` 컴포넌트

**Files:**
- Create: `apps/web/components/fretboard/TuningPresetSelector.tsx`

- [ ] **Step 9.1: Implement (작은 컴포넌트라 component test 1건만)**

```tsx
// apps/web/components/fretboard/TuningPresetSelector.tsx
'use client';

import { useAppStore } from '@/lib/store/app-store';
import { useInstrument } from '@/lib/store/hooks';
import {
  TUNING_PRESETS,
  presetsByInstrument,
  type TuningPresetId,
} from '@/lib/theory/tunings';

/*
 * 현재 instrument에 속한 tuning preset만 노출하는 dropdown + 우측 readout.
 * Native <select>로 키보드 네비 자동 보장.
 */
export function TuningPresetSelector() {
  const instrument = useInstrument();
  const tuningId = useAppStore((s) => s.fretboard.tuning);
  const setTuning = useAppStore((s) => s.setTuning);

  const presets = presetsByInstrument(instrument);
  const currentPreset = TUNING_PRESETS[tuningId];

  return (
    <div className="flex items-center gap-3">
      <label className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
        Tuning
      </label>
      <select
        value={tuningId}
        onChange={(e) => setTuning(e.target.value as TuningPresetId)}
        aria-label="Tuning preset"
        className="border border-ink-muted/30 bg-bg-elevated px-2 py-1 font-mono text-xs text-ink-primary"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <span className="font-mono text-[0.7rem] tracking-[0.1em] text-ink-muted">
        {currentPreset.displayString}
      </span>
    </div>
  );
}
```

- [ ] **Step 9.2: 수동 smoke**

Run: `pnpm dev` → instrument를 Guitar 7로 바꿨을 때 dropdown 항목이 1개 (Standard)로 좁아지는지 DevTools에서 확인 (UI는 task 11에서 패널 통합 후 확인).

지금은 typecheck만:

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```bash
git add apps/web/components/fretboard/TuningPresetSelector.tsx
git commit -m "feat(fretboard): TuningPresetSelector dropdown with readout

Native <select> + 우측에 displayString readout. instrument 전환 시
presetsByInstrument로 항목이 자동 재계산되어 항상 valid 한 set만 노출."
```

---

## Task 10: `FretCountToggle` 컴포넌트

**Files:**
- Create: `apps/web/components/fretboard/FretCountToggle.tsx`

- [ ] **Step 10.1: Implement**

```tsx
// apps/web/components/fretboard/FretCountToggle.tsx
'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';

const OPTIONS = [22, 24] as const;

export function FretCountToggle() {
  const frets = useAppStore((s) => s.fretboard.frets);
  const setFretCount = useAppStore((s) => s.setFretCount);

  return (
    <div role="group" aria-label="Fret count" className="flex items-center gap-3">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted">
        Frets
      </span>
      <div className="inline-flex border border-ink-muted/30">
        {OPTIONS.map((n) => {
          const active = n === frets;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => setFretCount(n)}
              className={clsx(
                'px-3 py-1 font-mono text-xs',
                active
                  ? 'bg-bg-elevated text-accent-brass'
                  : 'bg-transparent text-ink-muted hover:text-ink-primary',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 10.2: 수동 smoke + typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 10.3: Commit**

```bash
git add apps/web/components/fretboard/FretCountToggle.tsx
git commit -m "feat(fretboard): FretCountToggle (22 ↔ 24)

store에는 이미 frets: 22 | 24 필드가 있고 INLAY_POSITIONS도 24 정의 완료.
이 토글은 UI만 추가."
```

---

## Task 11: `FretboardControls.tsx` — "Instrument & Tuning" 패널 통합

**Files:**
- Modify: `apps/web/components/fretboard/FretboardControls.tsx`

- [ ] **Step 11.1: 패널 추가**

`FretboardControls.tsx` 최상단(다른 컨트롤 위) 또는 적절한 자리에 새 섹션 삽입:

```tsx
// import 추가
import { InstrumentSelector } from './InstrumentSelector';
import { TuningPresetSelector } from './TuningPresetSelector';
import { FretCountToggle } from './FretCountToggle';

// 컴포넌트 JSX 안 (최상단 섹션):
<section aria-label="Instrument and tuning" className="space-y-3 border-b border-ink-muted/10 pb-4">
  <h3 className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-ink-muted">
    § Instrument &amp; Tuning
  </h3>
  <InstrumentSelector />
  <TuningPresetSelector />
  <FretCountToggle />
</section>
```

기존 RootPicker / ScalePicker / 기타 컨트롤은 이 섹션 아래에 그대로 유지.

- [ ] **Step 11.2: 수동 검증 (가장 중요한 step)**

Run: `pnpm dev`

브라우저 `http://localhost:3000/fretboard`:
- [ ] 패널 최상단에 Instrument & Tuning 섹션 노출
- [ ] Guitar 7 클릭 → 지판이 7줄로 변환, low B 줄 추가됨, Tuning dropdown은 'Standard' 1개만
- [ ] Bass 4 클릭 → 지판이 4줄로, Tuning dropdown은 'Standard'/'Drop D' 2개
- [ ] Bass 4에서 Drop D 선택 → readout이 'DADG'로, 6번줄(최저음)이 D로 변경
- [ ] Frets 24 클릭 → 24프렛까지 노트가 그려짐, 인레이 24에 double dot
- [ ] handedness 'left' 토글 → 7현/4현에서도 좌우 반전 정상

- [ ] **Step 11.3: aesthetic-reviewer agent 호출**

Agent({
  description: "Instrument panel design review",
  subagent_type: "aesthetic-reviewer",
  prompt: "Review the new 'Instrument & Tuning' panel in FretboardControls.tsx. Files: components/fretboard/InstrumentSelector.tsx, TuningPresetSelector.tsx, FretCountToggle.tsx. Check for: forbidden fonts (Inter/Roboto/system-ui), purple gradients, rounded card overuse, hex colors instead of design tokens, icon vs label inconsistency. The aesthetic should match the analog instrument panel × editorial magazine direction. Report under 200 words with concrete fix suggestions."
})

리뷰에서 지적된 항목 수정 후 재검증.

- [ ] **Step 11.4: 전체 회귀**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 11.5: Commit**

```bash
git add apps/web/components/fretboard/FretboardControls.tsx
git commit -m "feat(fretboard): integrate Instrument & Tuning panel into controls

InstrumentSelector + TuningPresetSelector + FretCountToggle을
패널 최상단에 묶음. instrument는 지판의 가장 근본적 의사결정이라
RootPicker/ScalePicker 등 다른 컨트롤보다 위에 배치.
aesthetic-reviewer 1차 통과."
```

---

## Task 12: backing engine voice mute 게이트

**Files:**
- Modify: `apps/web/lib/audio/backing/engine.ts`
- Create: `apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts`

- [ ] **Step 12.1: 실패 테스트 작성**

```ts
// apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBackingEngine } from '@/lib/audio/backing/engine';
import { createSchedulerSpy } from '@/tests/audio-helpers'; // 기존 helper

// 이 테스트의 핵심: drums voiceMute=true 시 drums.trigger가 호출되지 않음.
// 다른 voice는 정상 호출.

describe('engine voice mute', () => {
  it('drums mute=true skips drum triggers (other voices proceed)', async () => {
    const spy = createSchedulerSpy();
    const engine = createBackingEngine({ schedulerOverride: spy });

    engine.setVoiceMute('drums', true);
    await engine.start({ template: TEST_TEMPLATE_BLUES, keyRoot: 0 });
    await spy.advance({ bars: 1 });
    engine.stop();

    expect(spy.triggers.drums).toHaveLength(0);
    expect(spy.triggers.bass.length).toBeGreaterThan(0);
    expect(spy.triggers.guitar.length).toBeGreaterThan(0);
  });

  it('mute toggle during playback affects next bar only', async () => {
    const spy = createSchedulerSpy();
    const engine = createBackingEngine({ schedulerOverride: spy });

    await engine.start({ template: TEST_TEMPLATE_BLUES, keyRoot: 0 });
    await spy.advance({ bars: 1 });

    const drumsBar1 = spy.triggers.drums.length;
    engine.setVoiceMute('drums', true);
    await spy.advance({ bars: 1 });

    // bar 2: drums trigger 추가 0건
    expect(spy.triggers.drums.length).toBe(drumsBar1);
    engine.stop();
  });

  it('unmuting restores triggers from next bar', async () => {
    const spy = createSchedulerSpy();
    const engine = createBackingEngine({ schedulerOverride: spy });

    engine.setVoiceMute('drums', true);
    await engine.start({ template: TEST_TEMPLATE_BLUES, keyRoot: 0 });
    await spy.advance({ bars: 1 });

    expect(spy.triggers.drums).toHaveLength(0);

    engine.setVoiceMute('drums', false);
    await spy.advance({ bars: 1 });

    expect(spy.triggers.drums.length).toBeGreaterThan(0);
    engine.stop();
  });
});
```

> **참고**: `createSchedulerSpy()`와 `TEST_TEMPLATE_BLUES`는 기존 `tests/audio-helpers.ts` / 다른 audio 테스트의 패턴을 참고. 형태가 다르면 그 형태로 맞추기 (이 plan은 패턴 가이드 — 정확한 helper API는 audio-helpers.ts를 직접 읽어 따라 쓸 것).

- [ ] **Step 12.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts`
Expected: FAIL — `engine.setVoiceMute` undefined.

- [ ] **Step 12.3: Engine에 voiceMutes 상태 + setter + trigger 게이트 추가**

`apps/web/lib/audio/backing/engine.ts`:

```ts
// VoiceKind 타입을 import 또는 선언
export type VoiceKind = 'drums' | 'bass' | 'guitar' | 'aux';

// 엔진 클로저 안에 상태 추가 (currentBpm 등 다른 currentX와 함께):
let voiceMutes: Record<VoiceKind, boolean> = {
  drums: false, bass: false, guitar: false, aux: false,
};

// 엔진 메서드 export에 추가:
return {
  start, stop, setBpm, setKey, setVolume,
  // 신규:
  setVoiceMute(voice: VoiceKind, muted: boolean) {
    voiceMutes[voice] = muted;
  },
  // ...
};

// scheduler 콜백 안 voice trigger 분기에 게이트 추가 (line 311 근처):
- for (const s of pattern.drums.kick)  voices.drums.trigger('kick', loaded.drums, t(s), s.velocity, vs);
- for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity, vs);
- for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity, vs);
+ if (!voiceMutes.drums) {
+   for (const s of pattern.drums.kick)  voices.drums.trigger('kick',  loaded.drums, t(s), s.velocity, vs);
+   for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity, vs);
+   for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity, vs);
+ }

// bass:
- const bassMidi = midi[0]! - 24;
- for (const s of pattern.bass.steps) voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity, vs);
+ if (!voiceMutes.bass) {
+   const bassMidi = midi[0]! - 24;
+   for (const s of pattern.bass.steps) voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity, vs);
+ }

// guitar:
- const guitarMidi = midi.map((n) => n - 12);
- for (const s of pattern.guitar)
-   voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity, vs);
+ if (!voiceMutes.guitar) {
+   const guitarMidi = midi.map((n) => n - 12);
+   for (const s of pattern.guitar)
+     voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity, vs);
+ }

// aux:
- if (pattern.aux && voices.aux && loaded.aux) { ... }
+ if (!voiceMutes.aux && pattern.aux && voices.aux && loaded.aux) { ... }
```

- [ ] **Step 12.4: Store ↔ engine 브리지 추가**

기존 `setBpm`/`setKey`/`setVolume` 브리지 패턴이 있는 위치(보통 `lib/audio/backing/store-bridge.ts` 또는 `engine.ts`의 subscribe 영역)를 찾아 voiceMutes 구독 추가:

```ts
// useAppStore.subscribe로 voiceMutes 변경 감지 → engine.setVoiceMute 호출
useAppStore.subscribe(
  (state) => state.backing.voiceMutes,
  (mutes) => {
    engine.setVoiceMute('drums', mutes.drums);
    engine.setVoiceMute('bass', mutes.bass);
    engine.setVoiceMute('guitar', mutes.guitar);
    engine.setVoiceMute('aux', mutes.aux);
  },
  { equalityFn: shallow },
);
```

> **참고**: 정확한 브리지 위치는 기존 setBpm/setVolume이 store ↔ engine을 잇는 코드를 찾아 그 옆에 추가. 코드는 그 패턴을 그대로 모방.

- [ ] **Step 12.5: Run test, verify pass**

Run: `pnpm test apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 12.6: web-audio-engineer agent 검증**

Agent({
  description: "Voice mute timing review",
  subagent_type: "web-audio-engineer",
  prompt: "Review the voice mute implementation in apps/web/lib/audio/backing/engine.ts. The change adds 4 if-gate before each voice trigger loop (drums/bass/guitar/aux) using a `voiceMutes` record. setVoiceMute(voice, muted) updates this record. Verify: (1) toggle during playback applies on next bar (not mid-bar interrupting scheduled audio); (2) StopFn lifecycle untouched; (3) no race between scheduler callback and setVoiceMute; (4) muted voice's existing scheduled audio plays out (we accept it - mute=true only stops *future* triggers). Report under 150 words."
})

지적사항 반영 후 재검증.

- [ ] **Step 12.7: Commit**

```bash
git add apps/web/lib/audio/backing/engine.ts apps/web/tests/unit/lib/audio/engine.voice-mute.test.ts
# store-bridge 변경된 파일도 함께
git commit -m "feat(audio): add per-voice mute gate in backing engine

drums/bass/guitar/aux 4개 voice별 mute 게이트. trigger 시점에
voiceMutes 레코드를 봐서 호출 자체를 스킵(velocity 0이 아니라
호출 미발생). setVoiceMute(voice, muted) API + store 브리지.
재생 중 토글하면 다음 비트부터 반영."
```

---

## Task 13: `VoiceMutePanel` 컴포넌트

**Files:**
- Create: `apps/web/components/jam/VoiceMutePanel.tsx`
- Create: `apps/web/tests/component/voice-mute-panel.test.tsx`

- [ ] **Step 13.1: 실패 테스트 작성**

```tsx
// apps/web/tests/component/voice-mute-panel.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceMutePanel } from '@/components/jam/VoiceMutePanel';
import { useAppStore } from '@/lib/store/app-store';

describe('VoiceMutePanel', () => {
  beforeEach(() => {
    useAppStore.setState((s) => {
      s.backing.voiceMutes = { drums: false, bass: false, guitar: false, aux: false };
    });
  });

  it('renders 4 toggle chips', () => {
    render(<VoiceMutePanel />);
    expect(screen.getByRole('button', { name: /drums/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bass/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guitar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aux/i })).toBeInTheDocument();
  });

  it('clicking drums toggles voiceMutes.drums', () => {
    render(<VoiceMutePanel />);
    fireEvent.click(screen.getByRole('button', { name: /drums/i }));
    expect(useAppStore.getState().backing.voiceMutes.drums).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /drums/i }));
    expect(useAppStore.getState().backing.voiceMutes.drums).toBe(false);
  });

  it('muted chip has aria-pressed=true', () => {
    useAppStore.setState((s) => {
      s.backing.voiceMutes.bass = true;
    });
    render(<VoiceMutePanel />);
    expect(screen.getByRole('button', { name: /bass/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /drums/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 13.2: Run test, verify failure**

Run: `pnpm test apps/web/tests/component/voice-mute-panel.test.tsx`
Expected: FAIL.

- [ ] **Step 13.3: Implement**

```tsx
// apps/web/components/jam/VoiceMutePanel.tsx
'use client';

import { clsx } from 'clsx';

import { useAppStore } from '@/lib/store/app-store';

const VOICES = [
  { kind: 'drums', label: 'DR' },
  { kind: 'bass', label: 'BS' },
  { kind: 'guitar', label: 'GT' },
  { kind: 'aux', label: 'AUX' },
] as const;

export function VoiceMutePanel() {
  const voiceMutes = useAppStore((s) => s.backing.voiceMutes);
  const toggleVoiceMute = useAppStore((s) => s.toggleVoiceMute);

  return (
    <div role="group" aria-label="Voice mute" className="flex items-center gap-2">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-ink-muted">
        Mute
      </span>
      {VOICES.map(({ kind, label }) => {
        const muted = voiceMutes[kind];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={muted}
            aria-label={`Mute ${kind}`}
            onClick={() => toggleVoiceMute(kind)}
            className={clsx(
              'border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] transition-colors',
              muted
                ? 'border-ink-muted/30 text-ink-muted line-through'
                : 'border-ink-muted/20 text-ink-primary hover:text-accent-brass',
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

- [ ] **Step 13.4: Run test, verify pass**

Run: `pnpm test apps/web/tests/component/voice-mute-panel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 13.5: Commit**

```bash
git add apps/web/components/jam/VoiceMutePanel.tsx apps/web/tests/component/voice-mute-panel.test.tsx
git commit -m "feat(jam): VoiceMutePanel — 4 chips for per-voice mute

DR/BS/GT/AUX 4 토글. mute된 칩은 line-through + ink-muted 색.
aria-pressed로 스크린리더 상태 명시."
```

---

## Task 14: `ProgressionCatalogClient.tsx` — VoiceMutePanel 통합

**Files:**
- Modify: `apps/web/components/jam/ProgressionCatalogClient.tsx`

- [ ] **Step 14.1: 헤더에 추가**

```tsx
// import 추가
import { VoiceMutePanel } from './VoiceMutePanel';

// 헤더 div 안에 BackingVolumeSlider 다음에 삽입 (line ~71):
<div className="flex flex-wrap items-center gap-4">
  <ChordDisplayModeToggle />
  <KeySelector />
  <BackingVolumeSlider />
+ <VoiceMutePanel />
  <span className="font-mono text-[0.65rem] text-ink-muted">
    {templates.length} progressions
  </span>
</div>
```

- [ ] **Step 14.2: 수동 검증 (E2E 기능 흐름)**

Run: `pnpm dev`

브라우저 `http://localhost:3000/jam`:
- [ ] 카탈로그 헤더에 Mute: DR BS GT AUX 4 칩 노출
- [ ] 카드 1장 재생 → 4 voice 모두 들림
- [ ] DR 칩 클릭 → 다음 마디부터 드럼 사라짐 (line-through 적용)
- [ ] DR 다시 클릭 → 다음 마디부터 드럼 살아남
- [ ] Bass 4 instrument 전환 → 지판 4줄, BS 칩 누르면 backing의 베이스 voice 사라짐 (베이스 사용자 시나리오)

- [ ] **Step 14.3: aesthetic-reviewer 검증**

Agent({
  description: "Catalog header layout review",
  subagent_type: "aesthetic-reviewer",
  prompt: "Review the catalog header in apps/web/components/jam/ProgressionCatalogClient.tsx after adding VoiceMutePanel. The row now contains: ChordDisplayModeToggle, KeySelector, BackingVolumeSlider, VoiceMutePanel, count text. Verify: (1) flex-wrap looks acceptable on narrow widths, (2) typography rhythm consistent (mono caps), (3) no purple gradients or rounded card overuse, (4) tokens only — no hex hardcoded. Report under 150 words."
})

지적사항 반영.

- [ ] **Step 14.4: 회귀 게이트**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 14.5: Commit**

```bash
git add apps/web/components/jam/ProgressionCatalogClient.tsx
git commit -m "feat(jam): integrate VoiceMutePanel into catalog header

DR/BS/GT/AUX 4 토글이 ChordDisplayModeToggle/KeySelector/
BackingVolumeSlider 옆에 한 줄로 노출. 베이스 사용자가 자기 voice
충돌을 즉시 해소할 수 있도록 항상 보이는 위치."
```

---

## Task 15: E2E smoke

**Files:**
- Create: `apps/web/tests/e2e/tuning-instrument.spec.ts`

- [ ] **Step 15.1: E2E spec 작성**

```ts
// apps/web/tests/e2e/tuning-instrument.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tuning / Instrument extension', () => {
  test('switching to Guitar 7 increases SVG height', async ({ page }) => {
    await page.goto('/fretboard');
    await page.evaluate(() => localStorage.removeItem('my-music-app:v1'));
    await page.reload();

    const svg = page.locator('svg[aria-label*="Fretboard"]').first();
    const before = (await svg.boundingBox())!.height;

    await page.getByRole('button', { name: /guitar 7/i }).click();
    const after = (await svg.boundingBox())!.height;

    expect(after).toBeGreaterThan(before);
  });

  test('Bass 4 → Drop D shows DADG readout', async ({ page }) => {
    await page.goto('/fretboard');
    await page.getByRole('button', { name: /bass 4/i }).click();
    await page.locator('select[aria-label="Tuning preset"]').selectOption({ label: 'Drop D' });
    await expect(page.getByText('DADG')).toBeVisible();
  });

  test('24-fret toggle reveals fret 24 marker', async ({ page }) => {
    await page.goto('/fretboard');
    // 22프렛에선 fret 24 inlay double dot이 없어야 함, 24프렛 토글 후 노출
    await page.getByRole('button', { name: '24', exact: true }).click();
    // double dot at fret 24 — implementation-specific selector. 우선은 viewBox 너비 변화로 검증.
    const svg = page.locator('svg[aria-label*="Fretboard"]').first();
    const box24 = (await svg.boundingBox())!.width;

    await page.getByRole('button', { name: '22', exact: true }).click();
    const box22 = (await svg.boundingBox())!.width;

    expect(box24).toBeGreaterThan(box22);
  });

  test('voice mute removes drums from next bar', async ({ page }) => {
    await page.goto('/jam');
    // 재생 시작 — 첫 카드 ▶ 버튼
    await page.getByRole('button', { name: /play/i }).first().click();
    await page.waitForTimeout(2000); // 1~2 bars

    const drumsButton = page.getByRole('button', { name: /Mute drums/i });
    await drumsButton.click();
    await expect(drumsButton).toHaveAttribute('aria-pressed', 'true');

    // 청취 검증은 E2E 범위 밖 — UI 상태만 확인
  });
});
```

- [ ] **Step 15.2: Docker로 E2E 실행**

Run: `docker compose -f docker-compose.test.yml up --exit-code-from playwright`
Expected: 4 tests PASS.

- [ ] **Step 15.3: Commit**

```bash
git add apps/web/tests/e2e/tuning-instrument.spec.ts
git commit -m "test(e2e): smoke for instrument switch + tuning + 24fret + voice mute

4 case: SVG height grows on guitar-7, Bass 4 Drop D readout,
24fret toggle widens SVG, voice mute aria-pressed update."
```

---

## Task 16: 문서 업데이트

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/planning.md`

- [ ] **Step 16.1: `CLAUDE.md` "주요 설계 결정" 섹션에 추가**

기존 "**fretboard.root는 키의 단일 소스**" 항목 다음에 새 bullet 추가:

```markdown
- **Tuning preset · 멀티 instrument 지원**: 6현 기타 + 7현 기타 + 4현 베이스 3페르소나. `lib/theory/tunings.ts`에 7 preset 정의 (Guitar 6: Standard/Drop D/DADGAD/E♭ Half-step, Guitar 7: Standard, Bass 4: Standard/Drop D). store는 `fretboard.tuning: TuningPresetId`만 보관하고 `useTuning()` 셀렉터가 `PitchClass[]`로 변환. `Fretboard.tsx`의 `STRING_COUNT`는 props로 가변화되어 4/6/7현 자동 렌더(SVG height = stringCount × 32px). 음악 이론·카탈로그·코드 보이싱 도메인은 instrument-agnostic이라 변경 없음. 새 instrument 추가 시 `TUNING_PRESETS` + `presetsByInstrument` + `DEFAULT_PRESET_BY_INSTRUMENT` 세 곳만 수정.

- **Voice mute (drums/bass/guitar/aux)**: `backing.voiceMutes` store + `toggleVoiceMute` action + engine voice trigger 게이트. 카드 재생 중 토글하면 *다음 비트부터* 반영(트리거 미발생, scheduled audio는 그대로 재생). 베이스/7현 사용자가 자기 악기 voice를 빼고 backing 위에 자기 연주를 얹는 시나리오의 핵심. 모든 instrument에 동일 노출.
```

기존 영속화 스키마 줄 (`현재 v10`)을 `현재 v12`로 정정:

```diff
- 사례: v9에서 `backing.backingKey` → `fretboard.root` 흡수(키 단일 소스화), v10에서 `backing.volume` 필드 추가. `__migrate` export로 유닛 테스트에서 직접 검증 가능.
+ 사례: v9에서 `backing.backingKey` → `fretboard.root` 흡수, v10 `backing.volume`, v11 `backing.backingPlayingCategory`, v12 `fretboard.tuning` + `backing.voiceMutes`. `__migrate` export로 유닛 테스트에서 직접 검증 가능.
```

(다른 곳에 v10 표기가 있으면 v12로 일괄 정정)

- [ ] **Step 16.2: `docs/planning.md` §6.2.5 업데이트**

§6.2.5 "지판 모델 & 튜닝" 섹션을 멀티 instrument 명시로 보강. 정확한 라인은 파일 확인 후 결정 — 다음 표를 추가:

```markdown
| Instrument | 줄 개수 | Tuning 프리셋 |
|---|---|---|
| Guitar 6 | 6 | Standard, Drop D, DADGAD, E♭ Half-step |
| Guitar 7 | 7 | Standard (BEADGBE) |
| Bass 4 | 4 | Standard (EADG), Drop D (DADG) |

Store에는 `fretboard.tuning: TuningPresetId`만 저장. 컴포넌트는 `useTuning()`이 반환하는 `readonly PitchClass[]`를 받아 SVG가 4/6/7줄로 자동 렌더.
```

기존 "표준 튜닝 EADGBE 6현" 가정 부분도 멀티 instrument 가정으로 보강.

- [ ] **Step 16.3: 최종 회귀 게이트**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: 모두 PASS. `build` 통과로 production stand-alone build 호환 검증.

- [ ] **Step 16.4: Final agent reviews — 병렬 호출**

Agent (parallel single message):
```
- fretboard-renderer: SVG layout + stringCount + tuning 계산이 4/6/7현에서 정합한지 최종 검증
- nextjs-architect: persist v11→v12 migrate, 새 store 액션, useTuning 셀렉터 검토
- test-strategist: 테스트 카테고리 누락(unit/component/audio/e2e) + 커버리지 점검
```

- [ ] **Step 16.5: Commit (최종)**

```bash
git add CLAUDE.md docs/planning.md
git commit -m "docs: update CLAUDE.md and planning.md for multi-instrument support

CLAUDE.md '주요 설계 결정'에 tuning preset 시스템과 voice mute 추가.
planning.md §6.2.5에 instrument × tuning preset 표 신설."
```

---

## Self-Review

### Spec coverage check

| Spec section | Plan task |
|---|---|
| §1 데이터 모델 — `tunings.ts`, `STANDARD_TUNING` 별칭, store 추가, migrate | Task 1, 2, 3, 4, 5 |
| §2 SVG 레이아웃 변경 — `STRING_COUNT` 제거, `stringCount` props | Task 6 |
| §3 UI 컴포넌트 — InstrumentSelector / TuningPresetSelector / FretCountToggle / VoiceMutePanel | Task 8, 9, 10, 11, 13, 14 |
| §4 카탈로그·backing 정합성 (변경 0줄) | 의도적으로 task 없음 — 기존 코드 미변경 |
| §5 Voice mute 적용 지점 — engine.ts trigger 게이트 | Task 12 |
| §6 테스트 전략 — unit/component/audio/E2E | Task 1.1, 3.1, 4.1, 5.1, 6.1, 8.1, 12.1, 13.1, 15.1 |
| §7 위험·대응 — `STANDARD_TUNING` 회귀 / 7현 SVG / mute timing | Task 2 (회귀 측정), Task 11 (수동 smoke), Task 12 (audio engineer 게이트) |
| §8 후속 마일스톤 | 의도적으로 미구현 |
| §9 정합성 게이트 | Task 16.3, 16.4 |

모든 spec 섹션 커버됨.

### Placeholder scan

- "TBD" / "TODO" / "implement later" — 0건
- 모든 step에 명시적 코드 또는 명령어 또는 다음 task 포인터 포함

### Type consistency

- `TuningPresetId`, `InstrumentKind`, `VoiceKind` — Task 1, 3, 4에서 정의되고 후속 task에서 일관 사용
- `useTuning()` 반환 타입 `readonly PitchClass[]` — Task 7 정의, Task 11 사용
- `setVoiceMute`, `toggleVoiceMute` — Task 4 (store) / Task 12 (engine) 시그니처 일치 (`(voice, muted)` vs `(voice)` — engine은 직접 set, store는 toggle)

---

## 실행 옵션

Plan complete and saved to `docs/superpowers/plans/2026-05-01-tuning-instrument-extension.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Each task ends with a commit, so progress is always recoverable.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
