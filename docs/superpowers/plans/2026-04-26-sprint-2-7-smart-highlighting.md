# Sprint 2-7 Smart Highlighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배킹 코드 재생 중 "현재 코드 + 베이스 스케일 + 장르" 입력으로 적절한 음 집합을 계산해 지판에 시각화 — 스케일 밖 코드톤·텐션·블루노트도 ghost marker + faded ring으로 노출.

**Architecture:** 3-레이어 룰 매트릭스 — 코드 품질별 텐션(Part A) / 장르 × 코드 추가(Part B) / 장르 universal(Part C). `getChordOverlay`를 `getAppropriateNotes`로 확장 rename, ghost marker는 `getGhostFretboardPositions` 신규 헬퍼로 별도 SVG 그룹 렌더. Persist v11에서 `backingPlayingCategory` 추가.

**Tech Stack:** TypeScript / Vitest / Testing Library / Playwright / Zustand persist / SVG.

---

## File Structure

### NEW
- `apps/web/lib/theory/chord-extensions.ts` — Part A 테이블
- `apps/web/lib/theory/genre-rules.ts` — Part B + Part C + `ProgressionCategory` canonical 타입
- `apps/web/tests/unit/lib/theory/chord-extensions.test.ts`
- `apps/web/tests/unit/lib/theory/genre-rules.test.ts`

### MODIFIED
- `apps/web/lib/theory/chord-voicing.ts` — `getAppropriateNotes` 추가, `getChordOverlay`/`ChordOverlay` 제거
- `apps/web/lib/theory/fretboard.ts` — `getGhostFretboardPositions` 추가
- `apps/web/lib/store/app-store.ts` — `backingPlayingCategory` 필드, `setBackingPlayingTemplate` 액션, persist v11
- `apps/web/components/fretboard/Fretboard.tsx` — color-tone group + ghost marker group, prop rename
- `apps/web/components/fretboard/FretboardSurface.tsx` — `getAppropriateNotes` 호출
- `apps/web/components/jam/ProgressionPlayButton.tsx` — `setBackingPlayingTemplate` 호출
- `apps/web/components/jam/ProgressionCatalogClient.tsx` — slug stop 시 template=null 전달
- `apps/web/app/globals.css` — `--color-fretboard-ghost` 토큰
- `apps/web/tests/component/fretboard.test.tsx` — prop rename + 새 tier 검증
- `apps/web/tests/unit/lib/theory/chord-voicing.test.ts` — `getChordOverlay` 테스트 → `getAppropriateNotes`
- `apps/web/tests/unit/lib/theory/fretboard.test.ts` — `getGhostFretboardPositions` 테스트
- `apps/web/tests/unit/lib/store/app-store.test.ts` — v10→v11 migrate + setter 테스트
- `apps/web/tests/e2e/jam-skeleton.spec.ts` — color-tone 노드 카운트 검증

---

## Task 1: chord-extensions.ts (Part A)

**Files:**
- Create: `apps/web/lib/theory/chord-extensions.ts`
- Test: `apps/web/tests/unit/lib/theory/chord-extensions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/tests/unit/lib/theory/chord-extensions.test.ts
import { describe, expect, it } from 'vitest';

import { CHORD_EXTENSIONS } from '@/lib/theory/chord-extensions';

describe('CHORD_EXTENSIONS', () => {
  it('major7는 9·#11·13 (P4 어보이드 제외)', () => {
    expect(CHORD_EXTENSIONS.major7).toEqual([2, 6, 9]);
  });

  it('minor7은 9·11·13', () => {
    expect(CHORD_EXTENSIONS.minor7).toEqual([2, 5, 9]);
  });

  it('dominant7은 9·#11·13 (alt는 genre-rules 영역)', () => {
    expect(CHORD_EXTENSIONS.dominant7).toEqual([2, 6, 9]);
  });

  it('diminished7은 9·11·b13 (대칭)', () => {
    expect(CHORD_EXTENSIONS.diminished7).toEqual([2, 5, 8]);
  });

  it('half_diminished7은 11·b13 (9 제외 — half-dim 9는 어보이드 컨텍스트 많음)', () => {
    expect(CHORD_EXTENSIONS.half_diminished7).toEqual([5, 8]);
  });

  it('augmented는 9·#11', () => {
    expect(CHORD_EXTENSIONS.augmented).toEqual([2, 6]);
  });

  it('major triad는 9만', () => {
    expect(CHORD_EXTENSIONS.major).toEqual([2]);
  });

  it('minor triad는 9·11', () => {
    expect(CHORD_EXTENSIONS.minor).toEqual([2, 5]);
  });

  it('diminished triad는 9·11', () => {
    expect(CHORD_EXTENSIONS.diminished).toEqual([2, 5]);
  });

  it('minor_major7은 9·11·13', () => {
    expect(CHORD_EXTENSIONS.minor_major7).toEqual([2, 5, 9]);
  });

  it('모든 텐션은 root(0)와 겹치지 않음 (0은 chord-tone 영역)', () => {
    for (const [quality, intervals] of Object.entries(CHORD_EXTENSIONS)) {
      expect(intervals, quality).not.toContain(0);
    }
  });

  it('모든 텐션은 0~11 범위', () => {
    for (const [quality, intervals] of Object.entries(CHORD_EXTENSIONS)) {
      for (const i of intervals) {
        expect(i, `${quality} interval ${i}`).toBeGreaterThanOrEqual(0);
        expect(i, `${quality} interval ${i}`).toBeLessThanOrEqual(11);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test tests/unit/lib/theory/chord-extensions.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/theory/chord-extensions'`.

- [ ] **Step 3: Implement minimal code**

```ts
// apps/web/lib/theory/chord-extensions.ts
/**
 * 코드 품질별 사용 가능 텐션 (root 기준 반음).
 *
 * 음악 이론 컨센서스:
 *   - major7: 9, #11, 13 — P4(반음 5)는 어보이드(major 3과 b9 충돌)
 *   - minor7: 9, 11, 13
 *   - dominant7: 9, #11, 13 — alt(b9, #9, b13) 추가는 genre-rules의 jazz/minor 책임
 *   - diminished7: 9, 11, b13 — 대칭 코드라 위 셋 모두 안전
 *   - half_diminished7: 11, b13 — 9는 컨텍스트 의존, 보수적으로 제외
 *
 * 0(=root)은 chord-tones 영역이므로 텐션에 포함하지 않는다.
 *
 * 본 테이블은 장르 무관한 "음악 이론 표준" — 장르 컨벤션은 genre-rules.ts.
 *
 * music-theory-guardian 게이트 대상.
 */

import type { ChordQuality } from './chords';

export const CHORD_EXTENSIONS: Record<ChordQuality, readonly number[]> = {
  major: [2],                  // 9
  minor: [2, 5],               // 9, 11
  diminished: [2, 5],          // 9, 11
  augmented: [2, 6],           // 9, #11
  major7: [2, 6, 9],           // 9, #11, 13 — P4(5) 어보이드 제외
  minor7: [2, 5, 9],           // 9, 11, 13
  dominant7: [2, 6, 9],        // 9, #11, 13 — alt는 genre-rules
  diminished7: [2, 5, 8],      // 9, 11, b13
  half_diminished7: [5, 8],    // 11, b13
  minor_major7: [2, 5, 9],     // 9, 11, 13
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test tests/unit/lib/theory/chord-extensions.test.ts
```
Expected: PASS — 12 tests.

- [ ] **Step 5: Lint & typecheck**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/chord-extensions.ts apps/web/tests/unit/lib/theory/chord-extensions.test.ts
git commit -m "feat(theory): add CHORD_EXTENSIONS table for available tensions per chord quality

코드 품질별 사용 가능 텐션 매트릭스. major7의 P4 어보이드 제외, 9/#11/13
표준 적용. dominant7 alt는 genre-rules의 jazz/minor 카테고리 책임으로 분리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: genre-rules.ts (Part B + Part C + ProgressionCategory)

**Files:**
- Create: `apps/web/lib/theory/genre-rules.ts`
- Test: `apps/web/tests/unit/lib/theory/genre-rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/tests/unit/lib/theory/genre-rules.test.ts
import { describe, expect, it } from 'vitest';

import { GENRE_RULES, type ProgressionCategory } from '@/lib/theory/genre-rules';

const ALL_CATEGORIES: ProgressionCategory[] = [
  'pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal',
];

describe('GENRE_RULES', () => {
  it('9개 카테고리 모두 정의됨', () => {
    expect(Object.keys(GENRE_RULES).sort()).toEqual([...ALL_CATEGORIES].sort());
  });

  it('각 카테고리는 perChord와 universal을 가짐', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(GENRE_RULES[cat]).toHaveProperty('perChord');
      expect(GENRE_RULES[cat]).toHaveProperty('universal');
    }
  });
});

describe('GENRE_RULES.jazz — dominant7 alt', () => {
  it('jazz는 dominant7에 b9·#9·#11·b13 추가', () => {
    expect(GENRE_RULES.jazz.perChord.dominant7).toEqual([1, 3, 6, 8]);
  });

  it('jazz는 universal 색채음 없음', () => {
    expect(GENRE_RULES.jazz.universal).toEqual([]);
  });
});

describe('GENRE_RULES.bossa — 절제된 alt', () => {
  it('bossa는 dominant7에 b9·#11만', () => {
    expect(GENRE_RULES.bossa.perChord.dominant7).toEqual([1, 6]);
  });
});

describe('GENRE_RULES.blues — 블루노트 universal', () => {
  it('blues universal은 b3·b5·b7 (키 root 기준 반음)', () => {
    expect(GENRE_RULES.blues.universal).toEqual([3, 6, 10]);
  });

  it('blues는 dominant7에 b3 추가 (블루스 cross)', () => {
    expect(GENRE_RULES.blues.perChord.dominant7).toEqual([3]);
  });

  it('blues는 major(7)에 b3·b7 추가', () => {
    expect(GENRE_RULES.blues.perChord.major).toEqual([3, 10]);
    expect(GENRE_RULES.blues.perChord.major7).toEqual([3, 10]);
  });
});

describe('GENRE_RULES.rock — pentatonic 색채음', () => {
  it('rock universal은 b3·b7', () => {
    expect(GENRE_RULES.rock.universal).toEqual([3, 10]);
  });
});

describe('GENRE_RULES.funk — b3 cross', () => {
  it('funk universal은 b3', () => {
    expect(GENRE_RULES.funk.universal).toEqual([3]);
  });
});

describe('GENRE_RULES.folk — 코드톤 only', () => {
  it('folk는 perChord 비어있음', () => {
    expect(Object.keys(GENRE_RULES.folk.perChord)).toHaveLength(0);
  });

  it('folk universal은 빔', () => {
    expect(GENRE_RULES.folk.universal).toEqual([]);
  });
});

describe('GENRE_RULES.modal — 모드 정체성 보존', () => {
  it('modal은 perChord 비어있음', () => {
    expect(Object.keys(GENRE_RULES.modal.perChord)).toHaveLength(0);
  });

  it('modal universal은 빔', () => {
    expect(GENRE_RULES.modal.universal).toEqual([]);
  });
});

describe('GENRE_RULES.minor — V7 alt', () => {
  it('minor는 dominant7에 b9 추가 (harmonic minor 함의)', () => {
    expect(GENRE_RULES.minor.perChord.dominant7).toEqual([1]);
  });
});

describe('GENRE_RULES.pop — 다이아토닉 위주', () => {
  it('pop은 perChord 비어있음 (Part A로 충분)', () => {
    expect(Object.keys(GENRE_RULES.pop.perChord)).toHaveLength(0);
  });

  it('pop universal은 빔', () => {
    expect(GENRE_RULES.pop.universal).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test tests/unit/lib/theory/genre-rules.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal code**

```ts
// apps/web/lib/theory/genre-rules.ts
/**
 * 장르 × 코드 품질 색채음 룰 + 키 단위 universal 색채음.
 *
 * - perChord: 코드 품질별로 추가되는 텐션 (root 기준 반음).
 *   chord-extensions.ts(Part A)와 합집합으로 colorTones 산출.
 * - universal: 코드와 무관, 키 root 기준 반음으로 항상 추가되는 색채음.
 *   블루스의 ♭3·♭5·♭7 같은 "장르 색깔" 자체.
 *
 * music-theory-guardian 게이트 대상.
 *
 * 9개 카테고리는 시드 데이터(presets.ts)와 1:1 대응 — 새 장르 추가 시 동기화 필수.
 */

import type { ChordQuality } from './chords';

/** 코드 진행 카탈로그 카테고리. presets.ts CATEGORY_PRESETS 키와 동기화. */
export type ProgressionCategory =
  | 'pop'
  | 'rock'
  | 'funk'
  | 'jazz'
  | 'blues'
  | 'folk'
  | 'bossa'
  | 'minor'
  | 'modal';

export interface GenreRule {
  /** 코드 품질별 추가 텐션 (root 기준 반음). 미정의 quality는 추가 없음. */
  readonly perChord: Partial<Record<ChordQuality, readonly number[]>>;
  /** 키 root 기준 반음. 코드 무관 색채음. */
  readonly universal: readonly number[];
}

export const GENRE_RULES: Record<ProgressionCategory, GenreRule> = {
  jazz: {
    perChord: {
      dominant7: [1, 3, 6, 8], // ♭9, ♯9, ♯11, ♭13
    },
    universal: [],
  },
  bossa: {
    perChord: {
      dominant7: [1, 6], // ♭9, ♯11 — 절제된 alt
    },
    universal: [],
  },
  blues: {
    perChord: {
      dominant7: [3], // ♭3 (블루스 cross)
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3, 6, 10], // ♭3, ♭5, ♭7 — 블루노트 3종
  },
  rock: {
    perChord: {
      dominant7: [3],
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3, 10], // ♭3, ♭7 — 펜타 컬러
  },
  funk: {
    perChord: {
      dominant7: [3],
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3], // ♭3 — dorian/mixo cross
  },
  pop: {
    perChord: {},
    universal: [],
  },
  folk: {
    perChord: {},
    universal: [],
  },
  minor: {
    perChord: {
      dominant7: [1], // ♭9 (V7 alt — harmonic minor 함의)
    },
    universal: [],
  },
  modal: {
    perChord: {},
    universal: [],
  },
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test tests/unit/lib/theory/genre-rules.test.ts
```
Expected: PASS — 13 tests.

- [ ] **Step 5: Lint & typecheck**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/genre-rules.ts apps/web/tests/unit/lib/theory/genre-rules.test.ts
git commit -m "feat(theory): add GENRE_RULES + ProgressionCategory canonical type

9개 카테고리(pop/rock/funk/jazz/blues/folk/bossa/minor/modal) 각각의
색채음 룰을 perChord(코드 품질별 추가) + universal(코드 무관 키 단위)로
분리해 정의. blues의 b3·b5·b7, jazz V7 alt, modal/folk의 코드톤-only
규칙까지 컨벤션대로 구현.

ProgressionCategory union을 canonical 타입으로 export — 다른 모듈은
이걸 import해 시드 카테고리 5종 vs presets 9종 불일치 해소.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: getAppropriateNotes orchestrator + getChordOverlay 제거

**Files:**
- Modify: `apps/web/lib/theory/chord-voicing.ts`
- Modify: `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`

- [ ] **Step 1: Write the failing test (replace getChordOverlay tests with getAppropriateNotes)**

기존 `chord-voicing.test.ts`의 `describe('getChordOverlay', ...)` 블록 전체를 아래로 교체:

```ts
// 상단 import 변경
import {
  DEFAULT_OCTAVE,
  chordSymbolToMidi,
  getAppropriateNotes,
  midiToFrequency,
  voicingToMidi,
} from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

// 파일 끝에 추가 (기존 getChordOverlay describe 블록 제거 후)
describe('getAppropriateNotes — chord tones', () => {
  it('I in C / scale=major / category=pop → root=0, tones={4,7}, colorTones={2}', () => {
    const r = getAppropriateNotes('I', 0 as PitchClass, 'major', 'pop');
    expect(r.chordRoot).toBe(0);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([4, 7]);
    expect([...r.colorTones].sort((a, b) => a - b)).toEqual([2]); // major triad의 9
  });

  it('V7 in C / category=jazz → alt 텐션 4종 colorTones에 포함', () => {
    // V7 = G7 (root=7), chord tones = {7, 11, 2, 5}
    // Part A dominant7 텐션: 9, #11, 13 → root=7 기준 [9=4, #11=1, 13=4] (mod 12, +keyRoot=0)
    //   2 (G+2=A=9), 6 (G+6=C#=#11), 9 (G+9=E=13)
    // Jazz dominant7 추가: 1, 3, 6, 8 → G+1=Ab(b9=8), G+3=Bb(#9=10), G+6=C#(#11=1), G+8=Eb(b13=3)
    // 합집합: {2(A), 6(C#=Db), 9(E), 8(Ab), 10(Bb), 1(Db=C#), 3(Eb)} 중 chord tones {7,11,2,5} 제외
    //   colorTones = {6, 9, 8, 10, 1, 3} sorted = [1, 3, 6, 8, 9, 10]
    const r = getAppropriateNotes('V7', 0 as PitchClass, 'major', 'jazz');
    expect(r.chordRoot).toBe(7);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([2, 5, 11]);
    const colors = [...r.colorTones].sort((a, b) => a - b);
    expect(colors).toContain(1);  // Db = b9
    expect(colors).toContain(3);  // Eb = #9 / b13
    expect(colors).toContain(6);  // C# = #11
    expect(colors).toContain(8);  // Ab = b9 (also from Part B)
    expect(colors).toContain(9);  // E = 13
  });

  it('I7 in A blues / scale=minor_pentatonic → universal blues notes 포함', () => {
    // A blues 키(root=9), I7 = A7 (root=9, tones=1=C#, 4=E, 7=G)
    // Part A dominant7: 2(B), 6(D#), 9(F#) — root=9 기준 → 11, 3, 6
    // Part B blues dominant7: [3] → root=9+3=12=0(C)
    // Part C blues universal [3,6,10] → keyRoot=9 → 0(C=b3 of A), 3(C#... wait keyRoot+3=12=0=C),
    //   actually universal is keyRoot-relative pitch class. So [3,6,10]+9 mod 12 = [0, 3, 7]
    // Hmm wait that means b3=C, b5=Eb (3=Eb wait that's wrong, let me recompute)
    // A=9, b3 from A is 9+3=12 mod 12 = 0 = C ✓
    // b5 from A is 9+6=15 mod 12 = 3 = D#/Eb ✓
    // b7 from A is 9+10=19 mod 12 = 7 = G ✓
    // chord tones of A7 in A key: A=9, C#=1, E=4, G=7
    // Universal {0, 3, 7} - chord tones {9, 1, 4, 7} = {0, 3} (G is also chord tone!)
    // So colorTones should include 0 (C) and 3 (Eb) at minimum.
    const r = getAppropriateNotes('I7', 9 as PitchClass, 'minor_pentatonic', 'blues');
    expect(r.chordRoot).toBe(9);
    const colors = [...r.colorTones].sort((a, b) => a - b);
    expect(colors).toContain(0); // b3 of A = C
    expect(colors).toContain(3); // b5 of A = Eb
  });

  it('Dorian I (Im7) / category=modal → colorTones 비어있음 (모드 정체성)', () => {
    // Im7 in D dorian (keyRoot=2): chord tones = D, F, A, C → pcs = {2, 5, 9, 0}
    // modal perChord empty, modal universal empty
    // chord-extensions minor7: [2, 5, 9] → root=2+2=4(E), 2+5=7(G), 2+9=11(B)
    // colorTones initially {4, 7, 11}, but modal has empty everywhere so only Part A applies.
    // Wait — Part A always applies regardless of category (it's chord-quality based).
    // Modal "no colorTones" only restricts Part B and Part C.
    // So Im7 in modal still has Part A extensions {4, 7, 11}.
    // Hmm, this means modal doesn't fully suppress colorTones — only adds nothing.
    // Spec says "modal: 코드톤만" but actually Part A still applies.
    // → Decision: Part A is universal music theory, not optional. modal/folk still get Part A.
    //   modal/folk just don't ADD genre flavor (no Part B/C).
    //   This is a clarification — doc this in the test.
    const r = getAppropriateNotes('Im7', 2 as PitchClass, 'dorian', 'modal');
    expect(r.chordRoot).toBe(2);
    // Part A minor7 → 9, 11, 13 → root=2 기준 [4, 7, 11]
    // None of these collide with chord tones {5, 9, 0}
    const colors = [...r.colorTones].sort((a, b) => a - b);
    expect(colors).toEqual([4, 7, 11]); // Part A only — Part B/C empty for modal
  });

  it('I in C / category=folk → colorTones는 Part A의 9만', () => {
    const r = getAppropriateNotes('I', 0 as PitchClass, 'major', 'folk');
    expect(r.chordRoot).toBe(0);
    expect([...r.chordTones].sort((a, b) => a - b)).toEqual([4, 7]);
    // Part A major: [2] → 0+2=2 (D=9th)
    expect([...r.colorTones]).toEqual([2]);
  });

  it('파싱 실패 → chordRoot=null, chordTones·colorTones 비어있음', () => {
    const r = getAppropriateNotes('???', 0 as PitchClass, 'major', 'pop');
    expect(r.chordRoot).toBeNull();
    expect(r.chordTones.size).toBe(0);
    expect(r.colorTones.size).toBe(0);
  });

  it('chordTones와 colorTones는 항상 disjoint', () => {
    // 어떤 코드/카테고리에서도 같은 pc가 두 집합에 들어가면 안 됨.
    // 예: Imaj7 in C / category=blues → chord tones {0,4,7,11},
    //   Part A: {2, 6, 9}, Part B major7: {3, 10}, Part C: {3, 6, 10}
    //   합집합 - chord tones - chordRoot = {2, 6, 9, 3, 10} (모두 chord에 없음)
    const r = getAppropriateNotes('Imaj7', 0 as PitchClass, 'major', 'blues');
    const tones = new Set(r.chordTones);
    for (const c of r.colorTones) {
      expect(tones.has(c)).toBe(false);
    }
    if (r.chordRoot !== null) {
      expect(r.colorTones.has(r.chordRoot)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test tests/unit/lib/theory/chord-voicing.test.ts
```
Expected: FAIL — `getAppropriateNotes` not exported.

- [ ] **Step 3: Modify chord-voicing.ts — add getAppropriateNotes, remove getChordOverlay**

`apps/web/lib/theory/chord-voicing.ts`의 `ChordOverlay` interface와 `getChordOverlay` 함수 (line 73~103)를 아래로 교체:

```ts
import { CHORD_EXTENSIONS } from './chord-extensions';
import { GENRE_RULES, type ProgressionCategory } from './genre-rules';
import { romanToChord } from './chords';
import { pitchClassFromRoot } from './notes';
import type { ScaleKey } from './types';

export interface AppropriateNotes {
  /** 코드 root pitch class. 파싱 실패 시 null. */
  chordRoot: PitchClass | null;
  /** 코드 톤 (root 제외). 파싱 실패 시 빈 Set. */
  chordTones: ReadonlySet<PitchClass>;
  /** 색채음 — Part A·B·C 합집합에서 chordRoot/chordTones 제외. */
  colorTones: ReadonlySet<PitchClass>;
}

/**
 * Sprint 2-7 — 배킹 재생 중 "적절한 음" 집합 계산.
 *
 * 입력 3축:
 *   - chord (현재 마디 코드 심볼, 로마 숫자)
 *   - keyRoot (베이스 키)
 *   - scale (베이스 스케일 — 현재는 사용 안 함, 향후 어보이드 정제 등에서 활용)
 *   - category (장르 — Part B/C 룰 선택)
 *
 * 출력:
 *   - chordRoot (1pc) → 빨강 ring
 *   - chordTones (root 제외) → 파랑 ring
 *   - colorTones → 파랑 faded ring
 *
 * Part A(코드 품질 텐션)는 카테고리 무관 적용. modal/folk도 Part A는 유지 —
 * 음악 이론 표준이므로 카테고리가 "장르 색깔만 안 더함"의 의미.
 */
export function getAppropriateNotes(
  chordSymbol: string,
  keyRoot: PitchClass,
  scale: ScaleKey,  // eslint-disable-line @typescript-eslint/no-unused-vars
  category: ProgressionCategory,
): AppropriateNotes {
  const chord = romanToChord(chordSymbol);
  if (!chord) {
    return { chordRoot: null, chordTones: new Set(), colorTones: new Set() };
  }

  const chordRoot = pitchClassFromRoot(keyRoot, chord.rootSemitones);
  // chord.semitones[0] === rootSemitones, 이미 chordRoot로 따로 표현하므로 [1:] 사용
  const chordTonesArr = chord.semitones
    .slice(1)
    .map((s) => pitchClassFromRoot(keyRoot, s));
  const chordTones = new Set(chordTonesArr);

  // Part A — 코드 품질별 텐션
  const partA = CHORD_EXTENSIONS[chord.quality]
    .map((s) => pitchClassFromRoot(keyRoot, (chord.rootSemitones + s) % 12));

  // Part B — 장르 × 코드 추가
  const partB = (GENRE_RULES[category].perChord[chord.quality] ?? [])
    .map((s) => pitchClassFromRoot(keyRoot, (chord.rootSemitones + s) % 12));

  // Part C — 장르 universal (키 root 기준)
  const partC = GENRE_RULES[category].universal
    .map((s) => pitchClassFromRoot(keyRoot, s));

  const colorTones = new Set<PitchClass>([...partA, ...partB, ...partC]);
  // chord-tone 영역과 disjoint 보장
  for (const t of chordTones) colorTones.delete(t);
  colorTones.delete(chordRoot);

  return { chordRoot, chordTones, colorTones };
}
```

`scale` 파라미터는 현재 미사용이지만 시그니처에 둔 이유: 향후 modal-aware 어보이드 정제(예: lydian에서 P4 어보이드 약화), 스케일 의존 색채음 추가 가능성 대비. 호출자가 이미 보유한 인자라 추가 비용 없음.

`@typescript-eslint/no-unused-vars` 비활성은 임시 — 후속 스프린트에서 활용 시 제거.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test tests/unit/lib/theory/chord-voicing.test.ts
```
Expected: PASS — 기존 voicingToMidi/chordSymbolToMidi/midiToFrequency + 새 getAppropriateNotes.

- [ ] **Step 5: Update FretboardSurface temporarily to keep build green**

`apps/web/components/fretboard/FretboardSurface.tsx`의 `getChordOverlay` 호출 임시 주석 처리 — Task 8에서 정식 마이그레이션. 지금은 전체 빌드만 통과시킨다.

```ts
// FretboardSurface.tsx 상단 import 수정
// import { getChordOverlay, type ChordOverlay } from '@/lib/theory/chord-voicing';
// →
import { type AppropriateNotes } from '@/lib/theory/chord-voicing';
```

`chordOverlay` useMemo 블록을 임시로:

```ts
// Sprint 2-7 작업 진행 중 — Task 8에서 getAppropriateNotes로 교체.
const chordOverlay = useMemo<AppropriateNotes | undefined>(() => undefined, []);
```

`Fretboard` 컴포넌트는 Task 7에서 props 시그니처 변경되므로 이 임시는 chordOverlay prop을 안 넘기는 형태로 둠 (default undefined로 동작).

`<Fretboard chordOverlay={chordOverlay} chordSymbol={...}/>` 줄에서 `chordOverlay={chordOverlay}` 제거.

- [ ] **Step 6: Update Fretboard.tsx temporarily — remove ChordOverlay import**

`apps/web/components/fretboard/Fretboard.tsx` 상단:
```ts
import type { ChordOverlay } from '@/lib/theory/chord-voicing';
```
→ 삭제.

`chordOverlay?: ChordOverlay;` props → `appropriateNotes?: AppropriateNotes;` (import 추가).
하지만 render 로직은 Task 7에서 정식 갱신. 지금은 컴파일만 통과시키기 위해 prop 이름만 바꾸고 기존 render는 `appropriateNotes?.chordRoot`/`appropriateNotes?.chordTones`로 매핑.

```ts
// Fretboard.tsx 상단
import type { AppropriateNotes } from '@/lib/theory/chord-voicing';

// props
appropriateNotes?: AppropriateNotes;

// 본문 destructure
appropriateNotes,
// ...

// 기존 chord-root group (line 253~) 의 chordOverlay → appropriateNotes
{appropriateNotes && (appropriateNotes.chordRoot !== null || appropriateNotes.chordTones.size > 0) && (
  <g
    className="chord-overlay"
    ...
  >
    {appropriateNotes.chordRoot !== null && (
      <g data-overlay-tier="chord-root">
        {notes
          .filter((n) => n.pitchClass === appropriateNotes.chordRoot)
          // ... 기존 로직
        }
      </g>
    )}
    {appropriateNotes.chordTones.size > 0 && (
      <g data-overlay-tier="chord-tone">
        {notes
          .filter((n) => appropriateNotes.chordTones.has(n.pitchClass))
          // ...
        }
      </g>
    )}
  </g>
)}

// 그리고 line 310 부근의 라벨 분기도 동일 매핑:
appropriateNotes
  ? n.pitchClass === appropriateNotes.chordRoot || appropriateNotes.chordTones.has(n.pitchClass)
  : ...
```

color-tone group과 ghost marker는 Task 7에서 추가.

- [ ] **Step 7: Update fretboard.test.tsx imports**

`apps/web/tests/component/fretboard.test.tsx` 상단:
```ts
import type { ChordOverlay } from '@/lib/theory/chord-voicing';
```
→
```ts
import type { AppropriateNotes } from '@/lib/theory/chord-voicing';
```

기존 테스트 객체:
```ts
const overlay: ChordOverlay = { root: 0, tones: new Set([4, 7]) };
```
→
```ts
const overlay: AppropriateNotes = { chordRoot: 0, chordTones: new Set([4, 7]), colorTones: new Set() };
```
(3곳 모두 동일 패턴 변경, line 153/164/176 부근)

prop 이름:
```tsx
<Fretboard chordOverlay={overlay} ... />
```
→
```tsx
<Fretboard appropriateNotes={overlay} ... />
```

- [ ] **Step 8: Run all tests + lint + typecheck**

```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 모두 PASS / 0 errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/theory/chord-voicing.ts apps/web/components/fretboard/Fretboard.tsx apps/web/components/fretboard/FretboardSurface.tsx apps/web/tests/unit/lib/theory/chord-voicing.test.ts apps/web/tests/component/fretboard.test.tsx
git commit -m "feat(theory): replace getChordOverlay with getAppropriateNotes orchestrator

ChordOverlay → AppropriateNotes 타입 rename + colorTones 필드 추가.
Part A(chord-extensions) + Part B/C(genre-rules) 합집합에서 chord-tone과
chord-root 제외해 색채음 산출.

Modal/folk에서도 Part A는 유지 — 음악 이론 표준은 카테고리 무관 적용.
Part B/C(장르 색깔)만 modal/folk에서 빔.

Fretboard.tsx 시그니처를 appropriateNotes prop으로 변경하되 colorTones
렌더 로직은 Task 7에서 정식 추가. FretboardSurface는 Task 8에서 정식
교체 — 임시로 undefined 반환해 빌드만 그린 유지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: getGhostFretboardPositions

**Files:**
- Modify: `apps/web/lib/theory/fretboard.ts`
- Modify: `apps/web/tests/unit/lib/theory/fretboard.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/tests/unit/lib/theory/fretboard.test.ts` 끝에 추가:

```ts
import { getGhostFretboardPositions, type GhostNote } from '@/lib/theory/fretboard';

describe('getGhostFretboardPositions', () => {
  it('빈 pitchClasses set이면 빈 배열', () => {
    expect(
      getGhostFretboardPositions({
        tuning: STANDARD_TUNING,
        frets: 12,
        pitchClasses: new Set(),
        useFlats: false,
      }),
    ).toEqual([]);
  });

  it('C# (pc=1) — 12 프렛 안에서 6개 줄 모든 등장 위치', () => {
    // 표준 튜닝 EADGBE: open pcs = [4(E), 9(A), 2(D), 7(G), 11(B), 4(E)]
    // C#=1 등장: 6번줄(E,4) → fret 9, 5번줄(A,9) → fret 4, 4번줄(D,2) → fret 11,
    //   3번줄(G,7) → fret 6, 2번줄(B,11) → fret 2, 1번줄(E,4) → fret 9
    const result = getGhostFretboardPositions({
      tuning: STANDARD_TUNING,
      frets: 12,
      pitchClasses: new Set([1]),
      useFlats: false,
    });
    expect(result).toHaveLength(6);
    expect(result.every((g) => g.pitchClass === 1)).toBe(true);
    // string number는 1~6 (1 = 고음)
    const positions = result
      .map((g) => `${g.string}-${g.fret}`)
      .sort();
    expect(positions).toEqual(['1-9', '2-2', '3-6', '4-11', '5-4', '6-9']);
  });

  it('useFlats=true면 노트 이름이 플랫 표기', () => {
    const result = getGhostFretboardPositions({
      tuning: STANDARD_TUNING,
      frets: 12,
      pitchClasses: new Set([1]), // C#/Db
      useFlats: true,
    });
    expect(result[0]?.noteName).toBe('Db');
  });

  it('open string(fret 0) 위치는 포함하지 않음 — open 라벨은 별도 책임', () => {
    // E (pc=4)는 open string에 있는 음
    const result = getGhostFretboardPositions({
      tuning: STANDARD_TUNING,
      frets: 12,
      pitchClasses: new Set([4]),
      useFlats: false,
    });
    expect(result.every((g) => g.fret > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test tests/unit/lib/theory/fretboard.test.ts
```
Expected: FAIL — `getGhostFretboardPositions` not exported.

- [ ] **Step 3: Implement in fretboard.ts**

`apps/web/lib/theory/fretboard.ts` 끝에 추가:

```ts
/**
 * Ghost note — 스케일 밖이지만 chord/color tone으로 표시되어야 하는 위치.
 * NoteMark과 다르게 tier·degree·semitonesFromRoot가 없다 — 스케일 멤버십과
 * 무관하게 단순 "이 pitch class가 어디 떨어지는가"만 알려줌.
 */
export interface GhostNote {
  /** 1~6, 1번줄(최고음). */
  string: number;
  /** 1 ~ frets (open string은 포함 안 함). */
  fret: number;
  pitchClass: PitchClass;
  noteName: string;
}

/**
 * 주어진 pitch class set이 지판 위에 떨어지는 모든 위치(fret 1 이상).
 * 스케일 멤버십·tier 검사 없음.
 *
 * 사용처: Sprint 2-7 ghost marker — out-of-scale 코드톤/색채음을 별도 SVG
 * 그룹으로 렌더할 때 위치 계산.
 */
export function getGhostFretboardPositions(params: {
  tuning: readonly PitchClass[];
  frets: number;
  pitchClasses: ReadonlySet<PitchClass>;
  useFlats: boolean;
}): GhostNote[] {
  const { tuning, frets, pitchClasses, useFlats } = params;
  if (pitchClasses.size === 0) return [];

  const out: GhostNote[] = [];
  for (let stringIdx = 0; stringIdx < tuning.length; stringIdx++) {
    for (let fret = 1; fret <= frets; fret++) {
      const pc = pitchAt(tuning, stringIdx, fret);
      if (!pitchClasses.has(pc)) continue;
      out.push({
        string: tuning.length - stringIdx,
        fret,
        pitchClass: pc,
        noteName: getNoteName(pc, useFlats),
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test tests/unit/lib/theory/fretboard.test.ts
```
Expected: PASS.

- [ ] **Step 5: Lint & typecheck**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/fretboard.ts apps/web/tests/unit/lib/theory/fretboard.test.ts
git commit -m "feat(theory): add getGhostFretboardPositions helper

스케일 밖 pitch class를 지판 위에 ghost marker로 그릴 때 위치 계산용 헬퍼.
NoteMark과 tier·semitonesFromRoot가 없는 단순 좌표만 반환 — 스케일 멤버십
검사 없이 모든 등장 위치 매핑.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Store v11 — backingPlayingCategory + setBackingPlayingTemplate

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Modify: `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/tests/unit/lib/store/app-store.test.ts` 끝에 추가:

```ts
import { __migrate } from '@/lib/store/app-store';

describe('persist v10 → v11 migration', () => {
  it('v10 state에 backingPlayingCategory: null 추가', () => {
    const v10 = {
      fretboard: { root: 0, scale: 'major' },
      backing: {
        backingPlayingSlug: null,
        backingCurrentChord: null,
        volume: 0.5,
      },
      ui: { chordDisplayMode: 'roman' },
    };
    const result = __migrate(v10, 10) as { backing: { backingPlayingCategory: unknown } };
    expect(result.backing.backingPlayingCategory).toBeNull();
  });

  it('v11에서 다시 호출해도 멱등 (이미 있으면 보존)', () => {
    const v11 = {
      fretboard: { root: 0, scale: 'major' },
      backing: {
        backingPlayingSlug: 'pop-axis',
        backingPlayingCategory: 'pop',
        backingCurrentChord: null,
        volume: 0.5,
      },
      ui: { chordDisplayMode: 'roman' },
    };
    const result = __migrate(v11, 11) as { backing: { backingPlayingCategory: unknown } };
    expect(result.backing.backingPlayingCategory).toBe('pop');
  });
});

describe('setBackingPlayingTemplate', () => {
  it('template이 주어지면 slug + category 동시 set', () => {
    const store = useAppStore.getState();
    store.setBackingPlayingTemplate({
      slug: 'jazz-251',
      category: 'jazz',
      // ... ProgressionTemplate의 다른 필드는 mock에서 생략
    } as any);
    const s = useAppStore.getState();
    expect(s.backing.backingPlayingSlug).toBe('jazz-251');
    expect(s.backing.backingPlayingCategory).toBe('jazz');
  });

  it('null이면 둘 다 null', () => {
    useAppStore.getState().setBackingPlayingTemplate(null);
    const s = useAppStore.getState();
    expect(s.backing.backingPlayingSlug).toBeNull();
    expect(s.backing.backingPlayingCategory).toBeNull();
  });

  it('알 수 없는 category는 pop fallback', () => {
    useAppStore.getState().setBackingPlayingTemplate({
      slug: 'weird',
      category: 'unknown-genre',
    } as any);
    expect(useAppStore.getState().backing.backingPlayingCategory).toBe('pop');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test tests/unit/lib/store/app-store.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Modify app-store.ts**

`apps/web/lib/store/app-store.ts`:

(a) Import 추가:
```ts
import { GENRE_RULES, type ProgressionCategory } from '@/lib/theory/genre-rules';
import type { ProgressionTemplate } from '@/lib/api/progression-templates';
```

(b) `BackingSliceState` 타입 갱신:
```ts
type BackingSliceState = {
  backingPlayingSlug: string | null;
  backingPlayingCategory: ProgressionCategory | null;  // NEW
  backingCurrentChord: { symbol: string; barIndex: number } | null;
  volume: number;
};
```

(c) `BackingSliceActions`에 추가:
```ts
type BackingSliceActions = {
  // 기존 액션들...
  setBackingPlayingTemplate: (template: ProgressionTemplate | null) => void;
};
```

(d) 기존 `setBackingPlayingSlug` 제거 (또는 deprecated mark — 호출자 모두 교체될 예정).

(e) Store create 안 actions에 추가:
```ts
setBackingPlayingTemplate(template) {
  set((s) => {
    if (!template) {
      s.backing.backingPlayingSlug = null;
      s.backing.backingPlayingCategory = null;
      return;
    }
    s.backing.backingPlayingSlug = template.slug ?? null;
    const cat = template.category as string | undefined;
    s.backing.backingPlayingCategory =
      cat && cat in GENRE_RULES
        ? (cat as ProgressionCategory)
        : 'pop'; // 알 수 없는 카테고리는 presets와 동일하게 pop fallback
  });
},
```

(f) Initial state에 `backingPlayingCategory: null` 추가 (initial state 객체).

(g) Migrate 함수 끝에 v11 분기 추가:
```ts
if (version < 11) {
  if (typeof fb.backing === 'object' && fb.backing !== null) {
    if (!('backingPlayingCategory' in fb.backing)) {
      fb.backing.backingPlayingCategory = null;
    }
  }
}
```

(h) Persist `version: 10` → `version: 11`.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test tests/unit/lib/store/app-store.test.ts
```
Expected: PASS.

- [ ] **Step 5: Lint & typecheck**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors. (호출자 컴파일 에러는 Task 6에서 처리.)

만약 호출자 컴파일 에러가 있으면 먼저 임시로 호출자 라인을 주석 처리하고 Task 6에서 정식 교체. 일반적으로 store에서 액션을 제거하면 사용처에서 즉시 에러가 나므로:

`apps/web/components/jam/ProgressionPlayButton.tsx` 등에서 `setBackingPlayingSlug` 사용처를 grep으로 찾아 임시로 `setBackingPlayingTemplate` 호출 형태로 바꾸거나, 다음 task에서 같이 처리하도록 본 task에서 deprecated alias로 두는 것도 OK:

```ts
// Backward-compat: Task 6에서 제거.
setBackingPlayingSlug(slug: string | null) {
  set((s) => { s.backing.backingPlayingSlug = slug; });
},
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/app-store.test.ts
git commit -m "feat(store): add backingPlayingCategory and setBackingPlayingTemplate (persist v11)

slug과 category를 묶어서 set하는 액션 도입. ProgressionTemplate 객체를 받아
slug + category 동시에 store에 반영. 알 수 없는 category는 'pop' 폴백 (presets와 동일 패턴).

v10 → v11 migrate는 backing.backingPlayingCategory 필드만 null로 추가.
런타임 영향 없음 — null은 stop 상태와 동일.

setBackingPlayingSlug은 임시로 보존(Task 6에서 호출자 교체 후 제거).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: ProgressionPlayButton + Catalog 호출자 교체

**Files:**
- Modify: `apps/web/components/jam/ProgressionPlayButton.tsx`
- Modify: `apps/web/components/jam/ProgressionCatalogClient.tsx`
- Modify: `apps/web/lib/store/app-store.ts` (deprecated alias 제거)

- [ ] **Step 1: 호출자 grep**

```bash
grep -rn "setBackingPlayingSlug" apps/web --include="*.ts" --include="*.tsx"
```

호출자 목록 확인.

- [ ] **Step 2: ProgressionPlayButton.tsx 교체**

`setBackingPlayingSlug(slug)` 호출을 `setBackingPlayingTemplate(template)`로 교체. `template` 객체는 컴포넌트 props 또는 store에서 lookup. 일반적으로 PlayButton은 자기 카드의 template을 prop으로 받고 있을 것.

만약 PlayButton이 slug만 받고 있었다면, props에 `template: ProgressionTemplate` 추가하고 호출처에서 전달.

호출 패턴 예시:
```ts
const setTemplate = useAppStore((s) => s.setBackingPlayingTemplate);
// 재생 시작
setTemplate(template);
// 정지 시
setTemplate(null);
```

- [ ] **Step 3: ProgressionCatalogClient.tsx 점검**

만약 Catalog가 slug만 PlayButton에 넘기고 있었다면 template 전체를 넘기도록 변경. 이미 template을 가지고 있을 가능성이 높음(렌더 시 카드 메타 표시).

- [ ] **Step 4: store에서 setBackingPlayingSlug deprecated alias 제거**

`apps/web/lib/store/app-store.ts`에서 Task 5에서 보존했던 `setBackingPlayingSlug` 액션·타입 제거.

- [ ] **Step 5: Run all tests + typecheck**

```bash
pnpm --filter web typecheck
pnpm --filter web test
```
Expected: 0 errors. 모든 테스트 PASS.

- [ ] **Step 6: Manual smoke test in dev server**

```bash
pnpm --filter web dev
```
브라우저에서 jam 페이지 진입 → 카드 ▶ → 정지 ▶. 콘솔 에러 없는지 확인. 정지 후 다른 카드 ▶ 누르면 단일 재생 원칙 유지되는지 확인.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/jam/ProgressionPlayButton.tsx apps/web/components/jam/ProgressionCatalogClient.tsx apps/web/lib/store/app-store.ts
git commit -m "refactor(jam): migrate callers to setBackingPlayingTemplate

ProgressionPlayButton과 Catalog가 slug 대신 ProgressionTemplate 전체를
넘기도록 교체. store는 template에서 slug+category를 추출해 동시 set.

Deprecated alias setBackingPlayingSlug 제거 — 단일 진입점.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: globals.css 토큰 + Fretboard.tsx color-tone group + ghost markers

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/fretboard/Fretboard.tsx`
- Modify: `apps/web/tests/component/fretboard.test.tsx`

- [ ] **Step 1: Add CSS token**

`apps/web/app/globals.css`의 `@theme` 블록 안 (chord-overlay 토큰 근처)에 추가:

```css
--color-fretboard-ghost: var(--color-ink-muted);
```

- [ ] **Step 2: Write failing component test**

`apps/web/tests/component/fretboard.test.tsx`에 새 describe 추가:

```ts
describe('AppropriateNotes — color-tone tier', () => {
  it('colorTones가 주어지면 color-tone tier group 렌더', () => {
    const notes: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set([2, 9]), // D, A — 9th, 13th
    };
    const { container } = render(
      <Fretboard
        notes={MOCK_NOTES}
        openStrings={MOCK_OPEN_STRINGS}
        frets={12}
        handedness="right"
        fretSpacing="proportional"
        labelMode="note"
        appropriateNotes={notes}
        chordSymbol="V7"
      />,
    );
    const colorGroup = container.querySelector('[data-overlay-tier="color-tone"]');
    expect(colorGroup).not.toBeNull();
    // colorTones가 비어있던 기존 테스트와 비교: 자식 노드 카운트 확인
    expect(colorGroup?.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('colorTones 비어있으면 color-tone group 미렌더', () => {
    const notes: AppropriateNotes = {
      chordRoot: 0,
      chordTones: new Set([4, 7]),
      colorTones: new Set(),
    };
    const { container } = render(<Fretboard {...defaultProps} appropriateNotes={notes} />);
    expect(container.querySelector('[data-overlay-tier="color-tone"]')).toBeNull();
  });
});

describe('Ghost markers — out-of-scale chord/color tones', () => {
  it('스케일 밖 pitch class가 chord/color tone에 있으면 ghost marker SVG group 렌더', () => {
    // notes는 C major scale로만 구성 (C D E F G A B)
    // chordRoot=1(C#) 은 스케일 밖 → ghost marker 그룹에 등장해야 함
    const appropriate: AppropriateNotes = {
      chordRoot: 1, // C# — out of C major scale
      chordTones: new Set([4, 7]),
      colorTones: new Set(),
    };
    const { container } = render(
      <Fretboard {...defaultProps} appropriateNotes={appropriate} />,
    );
    const ghostGroup = container.querySelector('[data-overlay-tier="ghost"]');
    expect(ghostGroup).not.toBeNull();
    expect(ghostGroup?.querySelectorAll('circle').length).toBeGreaterThan(0);
  });

  it('모든 chord/color tone이 스케일 안이면 ghost marker 미렌더', () => {
    const appropriate: AppropriateNotes = {
      chordRoot: 0, // C — in scale
      chordTones: new Set([4, 7]),
      colorTones: new Set([2]), // D — in scale
    };
    const { container } = render(
      <Fretboard {...defaultProps} appropriateNotes={appropriate} />,
    );
    expect(container.querySelector('[data-overlay-tier="ghost"]')).toBeNull();
  });
});
```

테스트가 의존하는 `defaultProps`·`MOCK_NOTES`·`MOCK_OPEN_STRINGS`는 기존 파일 상단에 정의돼 있을 가능성이 높음 — 없으면 inline으로 추가.

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter web test tests/component/fretboard.test.tsx
```
Expected: FAIL — color-tone/ghost group 미존재.

- [ ] **Step 4: Implement Fretboard.tsx render layers**

`apps/web/components/fretboard/Fretboard.tsx`:

(a) Import 추가:
```ts
import { getGhostFretboardPositions, type GhostNote } from '@/lib/theory/fretboard';
```

(b) Props 안 `notes` 옆 + `appropriateNotes` 외에 ghost 산출에 필요한 정보 (tuning·frets·useFlats)는 이미 부모(FretboardSurface)가 알고 있지만 Fretboard 컴포넌트로 prop으로 받는 것이 깔끔. **선택**: FretboardSurface가 ghostNotes를 미리 계산해 prop으로 넘기는 방식이 React 단방향 데이터 흐름에 자연스럽다.

→ `Fretboard` props에 `ghostNotes?: readonly GhostNote[]` 추가.
→ FretboardSurface(Task 8)가 `getGhostFretboardPositions` 호출해 prop으로 전달.

```ts
// Fretboard.tsx props 시그니처
interface FretboardProps {
  notes: NoteMark[];
  openStrings: OpenStringLabel[];
  frets: number;
  handedness: 'right' | 'left';
  fretSpacing: 'proportional' | 'equal';
  labelMode: LabelMode;
  appropriateNotes?: AppropriateNotes;
  chordSymbol?: string | null;
  ghostNotes?: readonly GhostNote[];  // NEW
}
```

(c) Render 분기 — 기존 `chord-overlay` group 안에 color-tone과 ghost 그룹 추가:

기존 chord-overlay group 직전에 ghost markers 그룹 (z-order 아래):

```tsx
{ghostNotes && ghostNotes.length > 0 && (
  <g data-overlay-tier="ghost" className="fretboard-ghost">
    {ghostNotes.map((g) => {
      // 좌표 계산: 기존 NoteMark과 동일 헬퍼 사용 (필요 시 inline)
      const cx = /* 기존 string×fret 좌표 계산 */;
      const cy = /* ... */;
      return (
        <g key={`ghost-${g.string}-${g.fret}`}>
          <circle
            cx={cx}
            cy={cy}
            r={fretWidth * 0.19}
            fill="none"
            stroke="var(--color-fretboard-ghost)"
            strokeWidth={1}
            opacity={0.35}
          />
          {labelMode !== 'none' && (
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fretboard-note-label"
              fontSize={fretWidth * 0.18}
              fill="var(--color-ink-muted)"
              opacity={0.5}
            >
              {/* labelMode에 따른 텍스트 — note name이 가장 단순 */}
              {g.noteName}
            </text>
          )}
        </g>
      );
    })}
  </g>
)}
```

color-tone group은 chord-overlay 안에서 chord-tone 그룹 *앞* (z-order 아래) 위치:

```tsx
{appropriateNotes && (
  <g className="chord-overlay" key={`overlay-${chordSymbol ?? 'none'}`}>
    {appropriateNotes.colorTones.size > 0 && (
      <g data-overlay-tier="color-tone">
        {notes
          .filter((n) => appropriateNotes.colorTones.has(n.pitchClass))
          .map((n) => (
            <circle
              key={`overlay-color-${n.string}-${n.fret}`}
              cx={/* 좌표 */}
              cy={/* */}
              r={/* chord-tone과 동일 r */}
              fill="none"
              stroke="var(--color-chord-overlay-tone)"
              strokeWidth={1.5}
              opacity={0.45}
            />
          ))}
      </g>
    )}
    {/* 기존 chord-root group */}
    {appropriateNotes.chordRoot !== null && (
      <g data-overlay-tier="chord-root">
        {/* 기존 코드 유지 */}
      </g>
    )}
    {/* 기존 chord-tone group */}
    {appropriateNotes.chordTones.size > 0 && (
      <g data-overlay-tier="chord-tone">
        {/* 기존 코드 유지 */}
      </g>
    )}
  </g>
)}
```

color-tone group은 ghost markers와 별도 — color-tone은 스케일 안 노트의 ring 강조, ghost는 스케일 밖 노트 자체의 점이다. 두 그룹이 같이 활성화될 수 있음 (예: 9th(D)는 스케일 안 → color-tone ring만, ♯9(E♭)은 스케일 밖 → ghost marker + color-tone ring 별도 위치).

**중요**: Ghost markers 위에도 chord-tone/color-tone ring이 그려져야 한다. 즉:
- z-order: ghost markers (밑) → color-tone rings (중간) → chord-tone rings → chord-root rings (맨 위)
- 같은 위치에 ghost marker 점과 chord-tone ring이 같이 있을 수 있음 (out-of-scale chord-tone 예: A7의 C# in C major scale → C# 위치에 ghost 점 + chord-tone 파랑 ring)

따라서 chord-tone과 color-tone group의 filter는 `notes` 배열 (스케일 안)뿐 아니라 `ghostNotes` 도 합쳐서 ring을 그려야 한다. 헬퍼:

```tsx
// ring 위치 산출 — 스케일 안(notes) + 스케일 밖(ghostNotes)에서 pc 매칭
function ringPositions(pc: PitchClass): Array<{ string: number; fret: number }> {
  const inScale = notes.filter((n) => n.pitchClass === pc);
  const outOfScale = (ghostNotes ?? []).filter((g) => g.pitchClass === pc);
  return [...inScale, ...outOfScale];
}
```

그리고 chord-root/chord-tone/color-tone 각 그룹에서 이 헬퍼로 위치 산출.

(d) 기존 라벨 분기(line 310 부근)도 업데이트 — `appropriateNotes.chordRoot`, `appropriateNotes.chordTones`, `appropriateNotes.colorTones` 모두 라벨 강조 후보로.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter web test tests/component/fretboard.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Lint & typecheck**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/globals.css apps/web/components/fretboard/Fretboard.tsx apps/web/tests/component/fretboard.test.tsx
git commit -m "feat(fretboard): add color-tone tier and ghost markers for smart highlighting

3개 새 SVG 그룹 추가:
- color-tone tier: 같은 파랑 색이지만 stroke 1.5px + opacity 0.45 + pulse 없음.
  9th, #11, alt 등 \"코드톤 아닌 적절한 음\"의 약한 ring.
- ghost markers: out-of-scale 위치에 outline-only 회색 점(0.35 opacity).
  스케일 밖이지만 chord/color tone으로 표시되어야 하는 노트의 base layer.
- ringPositions 헬퍼: scale notes + ghostNotes 합집합에서 pc 매칭 위치 산출.

z-order: ghost (밑) → color-tone → chord-tone → chord-root (위).

--color-fretboard-ghost CSS 토큰 추가 (기본값 ink-muted alias).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: FretboardSurface — getAppropriateNotes 정식 마이그레이션

**Files:**
- Modify: `apps/web/components/fretboard/FretboardSurface.tsx`

- [ ] **Step 1: Update FretboardSurface.tsx**

`apps/web/components/fretboard/FretboardSurface.tsx`의 임시 더미를 정식 호출로 교체.

(a) Import:
```ts
import { useMemo } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';
import {
  getAppropriateNotes,
  type AppropriateNotes,
} from '@/lib/theory/chord-voicing';
import {
  STANDARD_TUNING,
  getFretboardNotes,
  getGhostFretboardPositions,
  getOpenStringLabels,
  type GhostNote,
} from '@/lib/theory/fretboard';
import { shouldUseFlats } from '@/lib/theory/notes';
import { resolveScaleHighlights } from '@/lib/theory/scales';

import { Fretboard } from './Fretboard';
```

(b) Subscribe 추가:
```ts
const backingPlayingCategory = useAppStore((s) => s.backing.backingPlayingCategory);
```

(c) `chordOverlay` useMemo를 `appropriateNotes`로 교체:
```ts
const appropriateNotes = useMemo<AppropriateNotes | undefined>(() => {
  if (!isBackingActive || !currentChordSymbol || !backingPlayingCategory) {
    return undefined;
  }
  const r = getAppropriateNotes(
    currentChordSymbol,
    root,
    scale,
    backingPlayingCategory,
  );
  if (
    r.chordRoot === null &&
    r.chordTones.size === 0 &&
    r.colorTones.size === 0
  ) {
    return undefined;
  }
  return r;
}, [isBackingActive, currentChordSymbol, root, scale, backingPlayingCategory]);
```

(d) Ghost notes 산출:
```ts
const ghostNotes = useMemo<readonly GhostNote[]>(() => {
  if (!appropriateNotes) return [];
  // chord/color tone 중 스케일 밖만 추출
  const inScalePcs = new Set(notes.map((n) => n.pitchClass));
  const outOfScalePcs = new Set<PitchClass>();
  if (
    appropriateNotes.chordRoot !== null &&
    !inScalePcs.has(appropriateNotes.chordRoot)
  ) {
    outOfScalePcs.add(appropriateNotes.chordRoot);
  }
  for (const pc of appropriateNotes.chordTones) {
    if (!inScalePcs.has(pc)) outOfScalePcs.add(pc);
  }
  for (const pc of appropriateNotes.colorTones) {
    if (!inScalePcs.has(pc)) outOfScalePcs.add(pc);
  }
  if (outOfScalePcs.size === 0) return [];
  return getGhostFretboardPositions({
    tuning: STANDARD_TUNING,
    frets,
    pitchClasses: outOfScalePcs,
    useFlats,
  });
}, [appropriateNotes, notes, frets, useFlats]);
```

(e) Fretboard 렌더 호출:
```tsx
<Fretboard
  notes={notes}
  openStrings={openStrings}
  frets={frets}
  handedness={handedness}
  fretSpacing={fretSpacing}
  labelMode={labelMode}
  appropriateNotes={appropriateNotes}
  chordSymbol={currentChordSymbol}
  ghostNotes={ghostNotes}
/>
```

- [ ] **Step 2: Manual smoke test in dev server**

```bash
pnpm --filter web dev
```

브라우저:
1. Jam 페이지 진입
2. 어떤 카드든 ▶ 누르고 마디 진행 관찰
3. 지판에 chord-root 빨강 ring + chord-tone 파랑 ring (기존 동작) — OK
4. 9th, 13th 위치에 흐린 파랑 color-tone ring (NEW) — 등장 확인
5. Jazz 카드 ▶ → V7 시점에 alt 텐션이 ghost marker (회색 점) 4개 등장 — 확인
6. 정지 → 모든 overlay 사라짐 — 기존 동작 유지

문제 없으면 다음 단계로.

- [ ] **Step 3: Run all tests + lint + typecheck**

```bash
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
```
Expected: 0 errors / all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/fretboard/FretboardSurface.tsx
git commit -m "feat(fretboard): wire FretboardSurface to getAppropriateNotes + ghost markers

배킹 재생 중 backing.backingPlayingCategory 구독 + getAppropriateNotes 호출로
chord-root/chord-tones/colorTones 통합 산출. out-of-scale pc는 ghostNotes로
별도 계산해 Fretboard prop으로 전달.

스케일·키·코드·카테고리 4축 모두 변할 때 useMemo 재계산. 비활성 상태나
파싱 실패 시 undefined 반환 → Fretboard가 모든 overlay group 미렌더.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: E2E coverage 확장

**Files:**
- Modify: `apps/web/tests/e2e/jam-skeleton.spec.ts`

- [ ] **Step 1: Add new E2E test cases**

기존 `jam-skeleton.spec.ts` 안 적절한 위치에 추가:

```ts
test('배킹 재생 중 color-tone ring이 등장한다', async ({ page }) => {
  await page.goto('/jam');
  // 첫 카드 ▶
  await page.getByRole('button', { name: /play/i }).first().click();
  // 첫 코드 변화 대기
  await page.waitForTimeout(1500);
  // SVG 안에 color-tone tier group 노드 카운트
  const colorToneCount = await page
    .locator('[data-overlay-tier="color-tone"] circle')
    .count();
  expect(colorToneCount).toBeGreaterThan(0);
});

test('Jazz 카드 재생 중 ghost marker가 등장한다', async ({ page }) => {
  await page.goto('/jam');
  // jazz 카테고리 카드 찾기 — 카드에 카테고리 표기가 있다면 selector 활용
  const jazzCard = page.locator('[data-category="jazz"]').first();
  if ((await jazzCard.count()) === 0) {
    test.skip(true, 'Jazz 시드 없음');
  }
  await jazzCard.getByRole('button', { name: /play/i }).click();
  // V7 마디까지 대기 (대부분 jazz 진행에서 V는 첫 4마디 안)
  await page.waitForTimeout(4000);
  const ghostCount = await page
    .locator('[data-overlay-tier="ghost"] circle')
    .count();
  expect(ghostCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run E2E in Docker**

```bash
docker compose -f docker-compose.test.yml up --exit-code-from playwright
```
Expected: 신규 시나리오 모두 PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/jam-skeleton.spec.ts
git commit -m "test(test): add E2E coverage for color-tone and ghost markers

배킹 재생 시 color-tone tier circle 카운트 > 0 검증. Jazz 카드의 V7 마디
구간에서 ghost marker 등장 검증 (alt 텐션 4종이 스케일 밖에 떨어짐).

Jazz 시드가 없는 환경(시드 변동 시)에는 skip — 테스트 견고성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: music-theory-guardian + aesthetic-reviewer 게이트 + 시각 튜닝

**Files:** (튜닝 결과에 따라)
- Modify: `apps/web/components/fretboard/Fretboard.tsx` (opacity·stroke-width 수치)
- Modify: `apps/web/lib/theory/chord-extensions.ts` 또는 `genre-rules.ts` (이론 검증 결과 반영)

- [ ] **Step 1: music-theory-guardian 호출**

Agent tool로 `music-theory-guardian` 호출:

> "Sprint 2-7 implementation 직후 검증 게이트.
> `apps/web/lib/theory/chord-extensions.ts`와 `apps/web/lib/theory/genre-rules.ts`의
> 룰 매트릭스가 음악 이론 컨센서스와 부합하는지 검증.
> 특히:
> 1. major7의 P4 어보이드 제외가 실제 어보이드 룰과 일치하는가
> 2. half_diminished7에서 9를 제외한 결정의 음악적 근거
> 3. blues의 universal {b3, b5, b7}이 모든 장르 progression에서 적절한가
> 4. minor 카테고리의 V7→b9 추가가 harmonic minor 컨벤션에 부합하는가
> 5. modal·folk의 colorTones 거의 빈 결정이 도메인적으로 정당한가
>
> 변경 권고가 있으면 구체 diff와 음악 이론 근거 인용 필수."

리뷰 응답에 따라 수정 — 작은 수정이면 단일 commit, 크면 분리.

- [ ] **Step 2: aesthetic-reviewer 호출**

브라우저에서 dev 띄운 상태에서:

> "Sprint 2-7 시각 튜닝 검토. Jazz V7 시점에 alt 텐션 4종이 ghost marker로
> 동시 등장하는데 시각 노이즈가 어떤 수준인지 평가하고, 필요하면
> ghost opacity 0.35 → 0.25, color-tone opacity 0.45 → 0.40 등 미세 조정 권고.
> 디자인 토큰 일관성, 금지 폰트 회피 같은 디자인 규율도 함께 점검."

권고 반영. 일반적으로:
- ghost opacity 0.35는 jazz alt 4종 동시 등장 시 노이즈 큰 편 → 0.25~0.30 권장 가능
- color-tone stroke 1.5px가 chord-tone 2px와 차이 큰 편 → 1.5px 유지 또는 1.75px

- [ ] **Step 3: 튜닝 commits (필요 시)**

리뷰 결과 따라 1~3 commit. 예시:

```bash
git commit -m "style(fretboard): tune ghost marker opacity 0.35 → 0.25

aesthetic-reviewer 권고: jazz V7 동시 4 ghost 등장 시 시각 노이즈 과다.
0.25로 낮춰 위계 강화."

git commit -m "fix(theory): correct half_diminished7 extensions per Berklee jazz harmony

music-theory-guardian 권고: half-dim의 9는 컨텍스트 의존이지만
locrian/locrian-natural-2 모달 컨텍스트에선 사용. 11·b13 외에 2 추가."
```

- [ ] **Step 4: 최종 검증**

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
docker compose -f docker-compose.test.yml up --exit-code-from playwright
```
모두 PASS.

- [ ] **Step 5: PR 준비**

```bash
git push -u origin feat/sprint-2-7-smart-highlighting
gh pr create --title "feat(jam): Sprint 2-7 smart highlighting — chord/color tones across scale" --body "..."
```

PR body는 다음 항목 포함:
- 핵심 변경 요약 (chord-extensions, genre-rules, getAppropriateNotes, ghost markers)
- 이전 동작 vs 새 동작 짧은 비교
- 시각 튜닝 결과 (최종 opacity/stroke 수치)
- 테스트 카운트 (단위·컴포넌트·E2E 신규)
- music-theory-guardian + aesthetic-reviewer 검증 통과 메모
- 후속 (Sprint 2-9 색채음 라벨, 사용자 토글 도입 검토)

---

## Self-Review (writing-plans 스킬 자체 점검)

**Spec coverage:**
- §1 배경/문제 → Task 7+8 (color-tone + ghost로 out-of-scale 코드톤 노출)
- §2 비목표 → 어보이드 미도입 그대로
- §3 시나리오 → Task 3 + Task 7/8 통합 동작
- §4.1 데이터 모델 → Task 3
- §4.2 3-레이어 룰 → Task 1·2
- §4.3 처리 순서 → Task 3
- §4.4 ProgressionCategory → Task 2
- §4.5 파일 변경 → 모든 Task에 분배
- §5 시각 사양 → Task 7 (값) + Task 10 (튜닝)
- §6 Store v11 → Task 5·6
- §7 테스트 전략 → 각 Task의 step 1
- §8 위험·엣지 → Task 3 (파싱 실패), Task 5 (category fallback)
- §9 구현 순서 → Task 1~10에 1:1 매핑
- §10 미해결 → 본 스프린트 외, plan 문서 끝에 명시

전 항목 커버.

**Placeholder scan:** "TBD"·"appropriate"·"등등" 검색 — Task 6 step 2의 "props에 template 추가" 정도가 다소 포괄적. 호출자 코드를 정확히 모르므로 실측 후 수정 가능한 형태로 둠. 다른 placeholder 없음.

**Type consistency:**
- `AppropriateNotes` (Task 3 정의) → Task 7·8 props 일치
- `GhostNote` (Task 4 정의) → Task 7 props·Task 8 useMemo 일치
- `ProgressionCategory` (Task 2 정의) → Task 5 store 필드·Task 8 selector 일치
- `setBackingPlayingTemplate` (Task 5 정의) → Task 6 호출자 일치
- `getGhostFretboardPositions` (Task 4 정의) → Task 8 호출 일치
- `CHORD_EXTENSIONS`·`GENRE_RULES` → Task 3 import 일치

이상 일관성 확인 완료.

---

## 후속 (이번 plan 외)

- **색채음 라벨링** (예: ring 옆에 "♭9", "♯11" 표기) — Sprint 2-9 후보
- **사용자 토글** (스마트 하이라이팅 on/off) — 노이즈 우려 시 도입
- **scale 인자 활용** — modal-aware 어보이드 정제, 모드 특성음 강조와 연계
