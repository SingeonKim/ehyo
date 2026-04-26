# Sprint 9 — Card Profiles & Groove Authenticity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카탈로그 17장이 카테고리 default 위에 카드별 variant + 톤 + 옵셔널 instrument override를 얹어 각자의 정체성을 갖게 하고, 셔플 long-short feel을 표현 가능하도록 그루브 모델(swing + triplet8 unit)을 도입한다.

**Architecture:** 4-PR 분할 squash merge — (A) 그루브 인프라, (B) 카드 프로필 시스템, (C) variant 패턴 데이터 + swing 활성화, (D) 17장 매핑 + 가드 + E2E. PR-A/B는 사운드 변화 0(인프라만), PR-C에서 첫 사운드 변화, PR-D에서 카드별 정체성 노출. 변경 범위는 프론트 audio 레이어 한정 — DB·API·Zustand 스토어는 손대지 않는다.

**Tech Stack:** TypeScript strict, Next.js 15 App Router, smplr 0.20.0, Vitest, Testing Library, Playwright (Docker).

**Spec:** [`docs/superpowers/specs/2026-04-26-sprint-9-card-profiles-and-groove-design.md`](../specs/2026-04-26-sprint-9-card-profiles-and-groove-design.md)

---

## File Structure

| 변경 종류 | 파일 | PR | 책임 |
|---|---|---|---|
| Modify | `apps/web/lib/audio/backing/patterns/types.ts` | A | BeatStep.unit, parseBeatStep swing/unit 인자, CategoryRhythm.swing |
| Create | `apps/web/lib/audio/backing/swing.ts` | A | resolveSwing 순수 함수 |
| Modify | `apps/web/lib/audio/backing/engine.ts` | A, B | parseBeatStep 호출에 unit/swing 흐름, 카드 시작 시 profile resolve & 적용 |
| Create | `apps/web/lib/audio/backing/card-profiles.ts` | B → D | 17장 슬러그 → CardProfile 매핑 |
| Modify | `apps/web/lib/audio/backing/presets.ts` | B | CATEGORY_TONE_DEFAULTS export |
| Create | `apps/web/lib/audio/backing/profile-merge.ts` | B | resolveCardProfile 순수 함수 |
| Modify | `apps/web/lib/audio/backing/voices/{drums,bass,guitar,aux}.ts` | B | setVoiceGain + trigger velocityScale |
| Modify | `apps/web/lib/audio/backing/patterns/library/blues.ts` | C → D | groove_a 보강, 6 variant, swing 0.66 |
| Modify | `apps/web/lib/audio/backing/patterns/library/jazz.ts` | C | walk ride 8분주화, swing 0.66, triplet8 |
| Modify | `apps/web/lib/audio/backing/patterns/library/pop.ts` | C | 50s_doo_wop variant |
| Modify | `apps/web/lib/audio/backing/patterns/library/modal.ts` | C | 3 variant + selectSlot 분기 |
| Create | `apps/web/tests/unit/lib/audio/backing/parseBeatStep.test.ts` | A | unit/swing 결정론 |
| Create | `apps/web/tests/unit/lib/audio/backing/swing.test.ts` | A | resolveSwing |
| Create | `apps/web/tests/unit/lib/audio/backing/profile-merge.test.ts` | B | resolveCardProfile 머지 |
| Create | `apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts` | B → D | 슬러그 정합성 |
| Modify | `apps/web/tests/unit/lib/audio/backing/engine.test.ts` | A, B | tone 적용 / variant flow |
| Modify | `apps/web/tests/unit/lib/audio/backing/patterns/*.test.ts` | C | variant 회귀 + swing 회귀 |
| Create | `apps/web/tests/e2e/jam-card-profiles.spec.ts` | D | E2E 스모크 |

---

# PR-A — Groove Expression Infrastructure

목표: BeatStep.unit, parseBeatStep swing/unit 인자, CategoryRhythm.swing 도입. **모든 카테고리 swing default = 0.5 유지(도입만, 적용 X)**. 회귀 테스트로 기존 9개 카테고리 default 동작 회귀 0 검증.

브랜치: `feat/sprint-9-pr-a-groove-infra`

---

### Task A1: parseBeatStep에 unit/swing 옵션 추가

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/types.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/parseBeatStep.test.ts`

**컨텍스트:** 현재 `parseBeatStep(notation, bpm, beatsPerBar = 4)`는 16분 sub만 지원한다. swing 0.66이면 8분 off-beat(sub 2)이 0.66박 위치로 밀려야 하고, `unit: 'triplet8'`이면 sub 0/1/2가 0/0.333/0.667박으로 매핑돼야 한다. 기존 호출자(`engine.ts:275`)는 3-arg 시그니처라 4번째 인자가 optional이어야 회귀 없음.

- [ ] **Step 1: Write failing test for swing 0.66 8th off-beat**

```ts
// apps/web/tests/unit/lib/audio/backing/parseBeatStep.test.ts
import { describe, expect, it } from 'vitest';
import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('parseBeatStep', () => {
  describe('default behavior (regression)', () => {
    it('returns 0 for 0:0:0', () => {
      expect(parseBeatStep('0:0:0', 120)).toBe(0);
    });

    it('1박 = 0.5s at 120bpm', () => {
      expect(parseBeatStep('0:1:0', 120)).toBeCloseTo(0.5, 5);
    });

    it('sub 2 (8분 off-beat) = 0.25s at 120bpm — straight', () => {
      // 한 박 = 0.5s, sub 2 = 0.5박 = 0.25s
      expect(parseBeatStep('0:0:2', 120)).toBeCloseTo(0.25, 5);
    });

    it('sub 3 (16th off-beat) = 0.375s at 120bpm — straight', () => {
      // sub 3 = 0.75박 = 0.375s
      expect(parseBeatStep('0:0:3', 120)).toBeCloseTo(0.375, 5);
    });
  });

  describe('swing parameter', () => {
    it('swing 0.5 == straight (regression)', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.5 })).toBeCloseTo(0.25, 5);
    });

    it('swing 0.66 pushes 8th off-beat (sub 2) to 0.66 of beat', () => {
      // 한 박 = 0.5s. sub 2 → 0.66박 = 0.33s
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.66 })).toBeCloseTo(0.33, 5);
    });

    it('swing 0.75 pushes 8th off-beat (sub 2) to 0.75 of beat — hard shuffle', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.75 })).toBeCloseTo(0.375, 5);
    });

    it('swing does NOT affect sub 0 / sub 1 / sub 3', () => {
      expect(parseBeatStep('0:0:0', 120, 4, { swing: 0.66 })).toBeCloseTo(0, 5);
      expect(parseBeatStep('0:0:1', 120, 4, { swing: 0.66 })).toBeCloseTo(0.125, 5);
      expect(parseBeatStep('0:0:3', 120, 4, { swing: 0.66 })).toBeCloseTo(0.375, 5);
    });
  });

  describe('triplet8 unit', () => {
    it('sub 0 = 0', () => {
      expect(parseBeatStep('0:0:0', 120, 4, { unit: 'triplet8' })).toBeCloseTo(0, 5);
    });

    it('sub 1 = 1/3 of beat', () => {
      // 한 박 0.5s × 1/3 ≈ 0.1667s
      expect(parseBeatStep('0:0:1', 120, 4, { unit: 'triplet8' })).toBeCloseTo(0.5 / 3, 5);
    });

    it('sub 2 = 2/3 of beat', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { unit: 'triplet8' })).toBeCloseTo((0.5 * 2) / 3, 5);
    });

    it('triplet8 ignores swing parameter', () => {
      // triplet은 명시적 long-short — swing 적용 금지
      expect(parseBeatStep('0:0:2', 120, 4, { unit: 'triplet8', swing: 0.66 })).toBeCloseTo(
        (0.5 * 2) / 3,
        5,
      );
    });
  });

  describe('dev guards', () => {
    it('throws on invalid bpm', () => {
      expect(() => parseBeatStep('0:0:0', 0)).toThrow(/bpm must be > 0/);
      expect(() => parseBeatStep('0:0:0', -10)).toThrow(/bpm must be > 0/);
    });

    it('throws on invalid notation', () => {
      expect(() => parseBeatStep('a:b:c', 120)).toThrow(/invalid notation/);
    });

    it('throws on swing out of [0.5, 0.75]', () => {
      expect(() => parseBeatStep('0:0:0', 120, 4, { swing: 0.4 })).toThrow(/swing/);
      expect(() => parseBeatStep('0:0:0', 120, 4, { swing: 0.8 })).toThrow(/swing/);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/parseBeatStep.test.ts`
Expected: FAIL — "swing/unit options not supported", default behavior tests pass

- [ ] **Step 3: Update BeatStep type and parseBeatStep signature**

`apps/web/lib/audio/backing/patterns/types.ts` — 기존 BeatStep 타입과 parseBeatStep을 다음과 같이 교체:

```ts
export type BeatStep = {
  /** 'bar:beat:sub' — sub의 의미는 unit에 따름. */
  time: string;
  /**
   * sub 단위 해석:
   *  - 'sub16'(default): sub 0/1/2/3 = 0/0.25/0.5/0.75박 (16분).
   *    swing 인자가 0.5 초과면 sub 2(8분 off-beat)가 swing 비율로 밀린다.
   *  - 'triplet8': sub 0/1/2 = 0/0.333/0.667박 (8분 트리플렛 long-mid-short).
   *    swing 인자는 무시된다 — 트리플렛은 명시적 long-short.
   */
  unit?: 'sub16' | 'triplet8';
  velocity?: number;
};

/**
 * 'bar:beat:sub' 표기를 BPM 기준 초로 환산.
 *
 * opts.unit:
 *  - 'sub16'(default): 16분 sub. swing이 0.5 초과면 sub 2를 swing 비율로 밀기.
 *  - 'triplet8': 8분 트리플렛 sub(0/1/2 → 0/1/3/2/3박). swing 무시.
 *
 * opts.swing: 0.5(straight) ~ 0.75(hard shuffle). default 0.5(회귀 안전).
 */
export function parseBeatStep(
  notation: string,
  bpm: number,
  beatsPerBar = 4,
  opts?: { unit?: 'sub16' | 'triplet8'; swing?: number },
): number {
  const { unit = 'sub16', swing = 0.5 } = opts ?? {};
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;

  if (process.env.NODE_ENV !== 'production') {
    if (!Number.isFinite(bars) || !Number.isFinite(beats) || !Number.isFinite(subs)) {
      throw new Error(`parseBeatStep: invalid notation "${notation}"`);
    }
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new Error(`parseBeatStep: bpm must be > 0, got ${bpm}`);
    }
    if (!Number.isFinite(swing) || swing < 0.5 || swing > 0.75) {
      throw new Error(`parseBeatStep: swing must be in [0.5, 0.75], got ${swing}`);
    }
  }

  const beatSec = 60 / bpm;
  let subFrac: number;

  if (unit === 'triplet8') {
    // sub 0/1/2 → 0, 1/3, 2/3박. swing 무시.
    subFrac = subs / 3;
  } else {
    subFrac = subs / 4;
    // 8분 off-beat(sub 2)에만 swing 적용. sub 0/1/3은 영향 없음.
    if (swing !== 0.5 && subs === 2) {
      subFrac = swing;
    }
  }

  return bars * beatsPerBar * beatSec + beats * beatSec + subFrac * beatSec;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/parseBeatStep.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5: Run full test suite to verify no regression**

Run: `cd apps/web && pnpm test`
Expected: PASS — 624+ tests, no regression in pattern tests

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/types.ts \
        apps/web/tests/unit/lib/audio/backing/parseBeatStep.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add unit/swing options to parseBeatStep (Sprint 9 PR-A)

BeatStep에 optional `unit?: 'sub16' | 'triplet8'`, parseBeatStep 4번째 인자에
optional `{ unit, swing }` 추가. 모든 인자가 optional이라 기존 호출자 회귀 없음.

- swing 0.5(default): 기존 sub16 동작 그대로 — 회귀 0
- swing 0.5 초과: sub 2(8분 off-beat)을 swing 비율로 밀기
- triplet8 unit: sub 0/1/2 → 0/1/3/2/3박. swing 무시(명시적 long-short)
- dev 가드: swing 범위 [0.5, 0.75] 강제

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A2: CategoryRhythm.swing 인터페이스 확장 + selectSlot variant 인자

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/types.ts`
- Modify: `apps/web/lib/audio/backing/patterns/library/{blues,bossa,folk,funk,index,jazz,minor,modal,pop,rock}.ts` (시그니처만)

**컨텍스트:** 현재 `CategoryRhythm.selectSlot: (tpl, barIndexAbs) => string`. variant 인자를 추가해 카드 프로필이 선택지를 줄 수 있게 한다. 모든 9개 카테고리는 일단 variant를 무시하도록 시그니처만 변경(데이터 변경은 PR-C). swing은 미지정으로 두어 default = 0.5 동작.

- [ ] **Step 1: Update CategoryRhythm interface in types.ts**

`apps/web/lib/audio/backing/patterns/types.ts`의 `CategoryRhythm` 인터페이스를 다음으로 교체:

```ts
/**
 * 카테고리별 리듬 정의 — Sprint 9에서 swing/variant 확장.
 *
 * patterns: 슬롯 이름 → BarPattern.
 * swing?: 글로벌 그루브 캐릭터. 미지정 = 0.5(straight).
 *   variant별 override가 default와 다른 경우만 perVariant에 등록.
 * selectSlot: (tpl, barIndexAbs, variant?) → 슬롯 이름.
 *   variant는 카드 프로필이 흘려준 값. 카테고리는 무시하거나 풀 분기에 사용.
 *   결정론 — 같은 인자는 항상 같은 슬롯.
 */
export interface CategoryRhythm {
  patterns: Readonly<Record<string, BarPattern>>;
  swing?: { default: number; perVariant?: Record<string, number> };
  selectSlot: (
    tpl: { bars: number; default_bpm: number; progression: ReadonlyArray<{ chord: string }> },
    barIndexAbs: number,
    variant?: string,
  ) => string;
}
```

- [ ] **Step 2: Update all 9 category files' selectSlot signatures**

각 카테고리 파일에서 `selectSlot: (tpl, idx) => ...`를 `selectSlot: (tpl, idx, _variant?) => ...`로 변경(언더스코어 prefix로 미사용 표시). 데이터/로직은 그대로.

대상 파일:
- `apps/web/lib/audio/backing/patterns/library/blues.ts` (line 144)
- `apps/web/lib/audio/backing/patterns/library/bossa.ts`
- `apps/web/lib/audio/backing/patterns/library/folk.ts`
- `apps/web/lib/audio/backing/patterns/library/funk.ts`
- `apps/web/lib/audio/backing/patterns/library/jazz.ts`
- `apps/web/lib/audio/backing/patterns/library/minor.ts`
- `apps/web/lib/audio/backing/patterns/library/modal.ts`
- `apps/web/lib/audio/backing/patterns/library/pop.ts`
- `apps/web/lib/audio/backing/patterns/library/rock.ts`

각 파일의 selectSlot 시그니처를 다음 형태로 통일:

```ts
selectSlot: (tpl, idx, _variant) => {
  // 기존 로직 유지 (variant는 PR-C에서 활용)
  ...
}
```

- [ ] **Step 3: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS — 시그니처만 변경, 호출자(engine.ts:279)는 2-arg 호출이라 호환

- [ ] **Step 4: Run full test suite**

Run: `cd apps/web && pnpm test`
Expected: PASS — 624+ tests, 회귀 0 (variant는 무시되고 swing 미지정 = 0.5)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/
git commit -m "$(cat <<'EOF'
feat(audio): extend CategoryRhythm with swing & variant (Sprint 9 PR-A)

CategoryRhythm에 optional `swing?: { default; perVariant? }`, selectSlot에
optional 3번째 인자 `variant?: string` 추가. 9개 카테고리 모두 variant를
무시하는 시그니처로 통일. 데이터/로직 변경 없음 — 회귀 0.

PR-C에서 blues/jazz가 swing default를 채우고, blues/pop/modal이 variant를
활용한 슬롯 분기를 도입.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A3: resolveSwing 순수 함수

**Files:**
- Create: `apps/web/lib/audio/backing/swing.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/swing.test.ts`

**컨텍스트:** 카테고리 + variant → swing ratio 매핑하는 순수 함수. 엔진이 매 마디 호출하므로 결정론·O(1)이어야 한다.

- [ ] **Step 1: Write failing test**

```ts
// apps/web/tests/unit/lib/audio/backing/swing.test.ts
import { describe, expect, it } from 'vitest';
import { resolveSwing } from '@/lib/audio/backing/swing';
import type { CategoryRhythm } from '@/lib/audio/backing/patterns/types';

const stub = (swing?: CategoryRhythm['swing']): CategoryRhythm => ({
  patterns: {},
  swing,
  selectSlot: () => 'x',
});

describe('resolveSwing', () => {
  it('returns 0.5 when category rhythm has no swing config', () => {
    expect(resolveSwing(stub(undefined), undefined)).toBe(0.5);
    expect(resolveSwing(stub(undefined), 'any')).toBe(0.5);
  });

  it('returns category default when variant unspecified', () => {
    expect(resolveSwing(stub({ default: 0.66 }), undefined)).toBe(0.66);
  });

  it('returns category default when variant not in perVariant map', () => {
    expect(resolveSwing(stub({ default: 0.66 }), 'unknown')).toBe(0.66);
    expect(resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62 } }), 'unknown')).toBe(
      0.66,
    );
  });

  it('returns variant override when matched', () => {
    expect(
      resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62, jump: 0.55 } }), 'hard_bop'),
    ).toBe(0.62);
    expect(
      resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62, jump: 0.55 } }), 'jump'),
    ).toBe(0.55);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/swing.test.ts`
Expected: FAIL — "Cannot find module '@/lib/audio/backing/swing'"

- [ ] **Step 3: Implement resolveSwing**

```ts
// apps/web/lib/audio/backing/swing.ts
/**
 * 카테고리 rhythm + variant → swing ratio.
 *
 * 결정론·O(1). 미정의 케이스는 모두 0.5(straight)로 폴백 — 호출자가 swing 없는
 * 카테고리에 대해 별도 분기를 안 해도 되도록.
 */

import type { CategoryRhythm } from './patterns/types';

export function resolveSwing(rhythm: CategoryRhythm, variant: string | undefined): number {
  const sw = rhythm.swing;
  if (!sw) return 0.5;
  if (variant && sw.perVariant && sw.perVariant[variant] !== undefined) {
    return sw.perVariant[variant];
  }
  return sw.default;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/swing.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/swing.ts \
        apps/web/tests/unit/lib/audio/backing/swing.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add resolveSwing pure function (Sprint 9 PR-A)

(rhythm, variant) → swing ratio 결정론 매핑. swing 미정의 카테고리는 0.5
폴백 — 호출자 분기 없음.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task A4: engine.ts에 unit/swing 흐름 통합

**Files:**
- Modify: `apps/web/lib/audio/backing/engine.ts:275-298` (chord trigger 블록)
- Modify: `apps/web/tests/unit/lib/audio/backing/engine.test.ts` (회귀 케이스)

**컨텍스트:** 현재 `t = (notation) => eventTime + parseBeatStep(notation, bpm)` (engine.ts:275)는 unit/swing을 안 넘긴다. parseBeatStep 호출에 step.unit과 카테고리 swing(`resolveSwing`)을 흘려보내야 한다. PR-A에서는 9개 카테고리 모두 swing 미정의 → 0.5 → 결과 회귀 0.

- [ ] **Step 1: Write regression test in engine.test.ts**

기존 engine.test.ts에 다음 describe 블록 추가(파일 맨 아래, 마지막 closing brace 직전):

```ts
// apps/web/tests/unit/lib/audio/backing/engine.test.ts (append)
describe('Sprint 9 PR-A: unit/swing flow regression', () => {
  it('plays existing categories without timing regression (swing default = 0.5)', async () => {
    // 기존 회귀 케이스. blues 카드 시작 → drums kick이 0:0:0(=0초) + 0:2:0(=1초 at 120bpm)에 trigger.
    // PR-A에서 swing default 미정의 → straight → 기존 시간 동일.
    const { mock, engine } = await setupEngineWithSpies({ category: 'blues', bpm: 120 });

    await engine.start(mock.template, 0);
    await flushScheduler(mock, 1); // 1마디 진행

    const kickTimes = mock.drumStarts.filter((s) => s.note === 'kick').map((s) => s.time);
    expect(kickTimes[0]).toBeCloseTo(mock.eventTimeBar0, 4);
    // 0:2:0 = 1.0s (120bpm)
    expect(kickTimes[1]).toBeCloseTo(mock.eventTimeBar0 + 1.0, 4);
  });
});
```

(`setupEngineWithSpies`/`flushScheduler`는 기존 engine.test.ts 헬퍼 — 없다면 첫 PR에서 helper에 맞춰 작성. 기존 engine.test.ts의 패턴을 그대로 따른다.)

- [ ] **Step 2: Run test to verify the new test passes (current behavior is correct)**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/engine.test.ts -t "PR-A"`
Expected: PASS — PR-A 회귀 케이스가 *현재 코드* 그대로 통과(현재도 swing 적용 안 함). 이 테스트는 ”다음 step에서 코드를 변경해도 회귀가 없어야 한다"의 가드.

- [ ] **Step 3: Update engine.ts to pass unit/swing to parseBeatStep**

`apps/web/lib/audio/backing/engine.ts` 다음 부분 수정.

import 추가 (line 47 부근, 기존 import 그룹에):

```ts
import { resolveSwing } from './swing';
```

기존 chord trigger 블록(line 270-308)에서 `t` 헬퍼와 voice trigger 호출들을 다음으로 교체:

```ts
        // 카테고리별 CATEGORY_RHYTHMS로 디스패치 — 알 수 없는 카테고리는 pop fallback.
        const rhythm = CATEGORY_RHYTHMS[tpl.category as string] ?? CATEGORY_RHYTHMS['pop']!;
        // PR-B에서 카드 variant가 흘러들어오기 전까지는 undefined.
        const variant: string | undefined = undefined;
        const slotName = rhythm.selectSlot(tpl, idx, variant);
        const pattern = rhythm.patterns[slotName];
        if (!pattern) return;

        // PR-A: parseBeatStep에 unit/swing 흘려보내기. swing 미정의 카테고리는 0.5(straight).
        const swing = resolveSwing(rhythm, variant);
        const t = (step: { time: string; unit?: 'sub16' | 'triplet8' }) =>
          eventTime + parseBeatStep(step.time, bpm, 4, { unit: step.unit, swing });

        // drums: smplr DrumMachine은 sample group name ('kick'/'snare'/'hat')으로 트리거
        for (const s of pattern.drums.kick)  voices.drums.trigger('kick',  loaded.drums, t(s), s.velocity);
        for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity);
        for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity);

        const bassMidi = midi[0]! - 24;
        for (const s of pattern.bass.steps) voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity);

        const guitarMidi = midi.map((n) => n - 12);
        for (const s of pattern.guitar)
          voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity);

        if (pattern.aux && voices.aux && loaded.aux) {
          const auxKind = getBundle(tpl.category ?? 'pop').aux?.kind;
          if (auxKind) {
            for (const s of pattern.aux) voices.aux.trigger(loaded.aux, auxKind, t(s), s.velocity);
          }
        }
```

핵심: `t`가 step 전체를 받아 unit을 함께 전달.

- [ ] **Step 4: Run engine regression test**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/engine.test.ts`
Expected: PASS — 기존 케이스 + PR-A 회귀 케이스 모두 통과

- [ ] **Step 5: Run full suite**

Run: `cd apps/web && pnpm test && pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/audio/backing/engine.ts \
        apps/web/tests/unit/lib/audio/backing/engine.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): wire unit/swing into engine trigger pipeline (Sprint 9 PR-A)

resolveSwing(rhythm, variant) → parseBeatStep({ unit: step.unit, swing })
흐름 도입. 9개 카테고리 모두 swing 미정의(=0.5) → 결과 회귀 0.

PR-B에서 variant가 카드 프로필로부터 흘러들어오고, PR-C에서 blues/jazz가
swing default를 채워 첫 사운드 변화가 발생한다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### PR-A 머지 게이트

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` 624+ + 신규 17개 통과
- [ ] `web-audio-engineer` 에이전트 리뷰 통과 (parseBeatStep 시그니처, swing 모델 검증)
- [ ] `test-strategist` 에이전트 리뷰 통과 (회귀 가드 충분성)
- [ ] PR 제목: `feat(audio): groove expression infrastructure (Sprint 9 PR-A)`

---

# PR-B — Card Profile System

목표: ToneProfile, CARD_PROFILES(빈 객체 17장), CATEGORY_TONE_DEFAULTS, profile-merge, voice setVoiceGain, 엔진 카드 시작 시 profile 적용. **모든 카드 빈 프로필 → 카테고리 default 그대로 → 사운드 변화 0(인프라만)**.

브랜치: `feat/sprint-9-pr-b-card-profiles`

---

### Task B1: ToneProfile 타입 + CATEGORY_TONE_DEFAULTS

**Files:**
- Modify: `apps/web/lib/audio/backing/presets.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/presets.test.ts` (없으면 create)

**컨텍스트:** 카테고리별 default tone(velocityScale/voiceGain/reverbWet)을 9개 카테고리에 대해 정의. 이 단계는 데이터만 추가 — 사용은 B5에서.

- [ ] **Step 1: Add ToneProfile type and CATEGORY_TONE_DEFAULTS to presets.ts**

`apps/web/lib/audio/backing/presets.ts` 끝(line 99 이후)에 다음 추가:

```ts
/**
 * Sprint 9 — 카테고리별 default tone profile.
 *
 * voice trigger 시 velocity에 velocityScale 곱, voice gain에 voiceGain 적용,
 * fxChain.wetGain에 reverbWet setValueAtTime. 카드별 부분 override는 CardProfile.
 */
export type ToneProfile = {
  velocityScale: number;
  voiceGain: { drums: number; bass: number; guitar: number; aux: number };
  reverbWet: number;
};

export const CATEGORY_TONE_DEFAULTS: Readonly<Record<keyof typeof CATEGORY_BUNDLES, ToneProfile>> =
  {
    pop: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    rock: {
      velocityScale: 1.1,
      voiceGain: { drums: 1.05, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.14,
    },
    funk: {
      velocityScale: 1.05,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.12,
    },
    jazz: {
      velocityScale: 0.95,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.22,
    },
    blues: {
      velocityScale: 1.0,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.05, aux: 1.0 },
      reverbWet: 0.22,
    },
    folk: {
      velocityScale: 0.95,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    bossa: {
      velocityScale: 0.9,
      voiceGain: { drums: 0.9, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.20,
    },
    minor: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    modal: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
  };

/** 알려지지 않은 카테고리는 pop default. */
export function getCategoryToneDefault(category: string): ToneProfile {
  return (
    (CATEGORY_TONE_DEFAULTS as Record<string, ToneProfile>)[category] ?? CATEGORY_TONE_DEFAULTS.pop
  );
}
```

- [ ] **Step 2: Add unit test**

```ts
// apps/web/tests/unit/lib/audio/backing/presets.test.ts (없으면 create, 있으면 append)
import { describe, expect, it } from 'vitest';
import { CATEGORY_TONE_DEFAULTS, getCategoryToneDefault } from '@/lib/audio/backing/presets';

describe('CATEGORY_TONE_DEFAULTS', () => {
  it('has tone profile for all 9 categories', () => {
    const cats = ['pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal'];
    for (const c of cats) {
      expect(CATEGORY_TONE_DEFAULTS[c as keyof typeof CATEGORY_TONE_DEFAULTS]).toBeDefined();
    }
  });

  it('all profiles have full voiceGain (drums/bass/guitar/aux)', () => {
    for (const profile of Object.values(CATEGORY_TONE_DEFAULTS)) {
      expect(profile.voiceGain).toMatchObject({
        drums: expect.any(Number),
        bass: expect.any(Number),
        guitar: expect.any(Number),
        aux: expect.any(Number),
      });
      expect(profile.velocityScale).toBeGreaterThan(0);
      expect(profile.reverbWet).toBeGreaterThanOrEqual(0);
      expect(profile.reverbWet).toBeLessThanOrEqual(1);
    }
  });

  it('getCategoryToneDefault falls back to pop for unknown category', () => {
    expect(getCategoryToneDefault('unknown')).toBe(CATEGORY_TONE_DEFAULTS.pop);
  });
});
```

- [ ] **Step 3: Run tests + typecheck**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/presets.test.ts && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/audio/backing/presets.ts apps/web/tests/unit/lib/audio/backing/presets.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add ToneProfile and CATEGORY_TONE_DEFAULTS (Sprint 9 PR-B)

9개 카테고리에 대해 default tone profile(velocityScale, voiceGain 4종, reverbWet)
정의. 데이터만 추가 — 사용은 B5(engine 통합)에서.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: card-profiles.ts 빈 골격 + 17장 등재

**Files:**
- Create: `apps/web/lib/audio/backing/card-profiles.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts`

**컨텍스트:** 17장 슬러그 모두 빈 객체로 등재. 빈 객체 = "카테고리 default 그대로". `__assertCardProfilesMatch`는 dev에서 백엔드 카탈로그와 비교.

- [ ] **Step 1: Write failing test**

```ts
// apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
import { describe, expect, it } from 'vitest';
import {
  CARD_PROFILES,
  __assertCardProfilesMatch,
} from '@/lib/audio/backing/card-profiles';

const CATALOG_17_SLUGS = [
  '12-bar-blues-major',
  '12-bar-blues-minor',
  '12-bar-blues-quick-change',
  'pop-I-V-vi-IV',
  '50s-I-vi-IV-V',
  'jazz-ii-V-I',
  'minor-i-VI-III-VII',
  'dorian-vamp',
  'lydian-vamp',
  'mixolydian-vamp',
  'slow-minor-blues',
  'hard-bop-minor-blues',
  'shuffle-minor-blues',
  'jazz-major-blues',
  'jump-blues',
  'funk-i7-vamp',
  'bossa-i-iv-ii-v',
];

describe('CARD_PROFILES', () => {
  it('has entries for all 17 catalog slugs', () => {
    for (const slug of CATALOG_17_SLUGS) {
      expect(CARD_PROFILES[slug]).toBeDefined();
    }
  });

  it('has no extra slugs beyond catalog', () => {
    for (const slug of Object.keys(CARD_PROFILES)) {
      expect(CATALOG_17_SLUGS).toContain(slug);
    }
  });
});

describe('__assertCardProfilesMatch', () => {
  it('warns on missing slug (dev only)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    __assertCardProfilesMatch([...CATALOG_17_SLUGS, 'extra-from-backend']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('CARD_PROFILES'),
      expect.objectContaining({ missing: ['extra-from-backend'] }),
    );
    warn.mockRestore();
  });

  it('does not warn when sets match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    __assertCardProfilesMatch(CATALOG_17_SLUGS);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

vi import 추가:
```ts
import { describe, expect, it, vi } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/card-profiles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement card-profiles.ts**

```ts
// apps/web/lib/audio/backing/card-profiles.ts
/**
 * 카드 슬러그 → CardProfile 매핑 (Sprint 9).
 *
 * 17장 모두 명시적으로 등재 — 빈 객체 = "카테고리 default 그대로 사용한다"는
 * 명시적 선언. PR-B에서는 17장 모두 빈 객체. PR-D에서 도메인 리서치 결과
 * 반영.
 *
 * 백엔드 카탈로그 슬러그와 정합성은 __assertCardProfilesMatch가 dev에서
 * console.warn으로 통보. production에서는 dead-code-eliminate.
 */

import type { InstrumentBundle } from './presets';
import type { ToneProfile } from './presets';

export type CardProfile = {
  /** 카테고리가 알아보는 variant 키. 미지정 = 카테고리 default 동작. */
  rhythmVariant?: string;
  /** 카테고리 default tone에서 부분 override. voiceGain은 한 단계 깊은 머지. */
  toneProfile?: Partial<ToneProfile> & {
    voiceGain?: Partial<ToneProfile['voiceGain']>;
  };
  /** 카테고리 default bundle에서 부분 instrument 교체(얕은 머지). */
  instrumentOverrides?: Partial<InstrumentBundle>;
};

export const CARD_PROFILES: Readonly<Record<string, CardProfile>> = {
  // blues — 8장
  '12-bar-blues-major': {},
  '12-bar-blues-minor': {},
  '12-bar-blues-quick-change': {},
  'slow-minor-blues': {},
  'hard-bop-minor-blues': {},
  'shuffle-minor-blues': {},
  'jazz-major-blues': {},
  'jump-blues': {},
  // pop — 2장
  'pop-I-V-vi-IV': {},
  '50s-I-vi-IV-V': {},
  // jazz / minor / funk / bossa — 각 1장
  'jazz-ii-V-I': {},
  'minor-i-VI-III-VII': {},
  'funk-i7-vamp': {},
  'bossa-i-iv-ii-v': {},
  // modal — 3장
  'dorian-vamp': {},
  'lydian-vamp': {},
  'mixolydian-vamp': {},
};

/**
 * dev 정합성 가드 — 백엔드 카탈로그 슬러그 목록과 CARD_PROFILES 키 비교.
 * production에서는 NODE_ENV 가드로 dead-code-eliminate.
 */
export function __assertCardProfilesMatch(catalogSlugs: readonly string[]): void {
  if (process.env.NODE_ENV === 'production') return;
  const profileSlugs = new Set(Object.keys(CARD_PROFILES));
  const missing = catalogSlugs.filter((s) => !profileSlugs.has(s));
  const extra = [...profileSlugs].filter((s) => !catalogSlugs.includes(s));
  if (missing.length || extra.length) {
    console.warn('[CARD_PROFILES] mismatch with backend catalog', { missing, extra });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/card-profiles.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add CARD_PROFILES skeleton with 17 empty entries (Sprint 9 PR-B)

17장 모두 빈 객체 등재 — 카테고리 default 그대로 사용한다는 명시 선언.
__assertCardProfilesMatch dev 가드로 백엔드 카탈로그와 정합성 확인.

PR-D에서 17장 실제 프로필 값(variant + toneProfile + instrumentOverrides)
채워짐.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B3: profile-merge.ts (resolveCardProfile)

**Files:**
- Create: `apps/web/lib/audio/backing/profile-merge.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/profile-merge.test.ts`

**컨텍스트:** (slug, category) → { variant, tone, bundle } 순수 함수. 카테고리 default + 카드 부분 override 머지. voiceGain만 한 단계 깊은 머지.

- [ ] **Step 1: Write failing test**

```ts
// apps/web/tests/unit/lib/audio/backing/profile-merge.test.ts
import { describe, expect, it } from 'vitest';
import { resolveCardProfile } from '@/lib/audio/backing/profile-merge';

describe('resolveCardProfile', () => {
  it('returns category default for empty profile', () => {
    // pop-I-V-vi-IV는 빈 프로필 → pop CATEGORY_TONE_DEFAULTS 그대로
    const r = resolveCardProfile('pop-I-V-vi-IV', 'pop');
    expect(r.variant).toBeUndefined();
    expect(r.tone.velocityScale).toBe(1.0);
    expect(r.tone.voiceGain).toEqual({ drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 });
    expect(r.tone.reverbWet).toBe(0.18);
    expect(r.bundle.guitar.instrument).toBe('electric_guitar_clean');
  });

  it('returns blues category default for slug not in profiles', () => {
    // 등재 안 된 슬러그 → 빈 프로필 fallback → blues 카테고리 default
    const r = resolveCardProfile('fictional-blues', 'blues');
    expect(r.tone.reverbWet).toBe(0.22);
    expect(r.tone.voiceGain.drums).toBe(0.95);
  });

  it('falls back to pop for unknown category', () => {
    const r = resolveCardProfile('pop-I-V-vi-IV', 'unknown' as 'pop');
    expect(r.tone.velocityScale).toBe(1.0);
  });
});

describe('resolveCardProfile merging', () => {
  // 머지 검증을 위해 profile을 직접 주입할 수 있는 path가 필요.
  // 현재는 CARD_PROFILES가 정적이므로, profile-merge 내부 헬퍼를 export해 검증.
  // 또는 mock으로 CARD_PROFILES를 일시 교체. 여기서는 mock 패턴.
  it('shallow merges instrumentOverrides (single-level)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: {
        'test-slug': {
          instrumentOverrides: { guitar: { instrument: 'jazz_guitar', octaveShift: -1 } },
        },
      },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    expect(r.bundle.guitar.instrument).toBe('jazz_guitar');
    // bass·drums는 카테고리 default 유지
    expect(r.bundle.bass.instrument).toBe('electric_bass_finger');
    expect(r.bundle.drums.machine).toBe('LM-2');
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });

  it('deep merges voiceGain (one level)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: {
        'test-slug': {
          toneProfile: { voiceGain: { drums: 0.85 } },
        },
      },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    // drums만 override, 나머지는 카테고리 default
    expect(r.tone.voiceGain.drums).toBe(0.85);
    expect(r.tone.voiceGain.bass).toBe(1.0);
    expect(r.tone.voiceGain.guitar).toBe(1.05);
    expect(r.tone.voiceGain.aux).toBe(1.0);
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });

  it('forwards rhythmVariant', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: { 'test-slug': { rhythmVariant: 'hard_bop' } },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    expect(r.variant).toBe('hard_bop');
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });
});
```

vi import:
```ts
import { describe, expect, it, vi } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/profile-merge.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement profile-merge.ts**

```ts
// apps/web/lib/audio/backing/profile-merge.ts
/**
 * 카드 슬러그 + 카테고리 → 머지된 프로필 (Sprint 9).
 *
 * 카테고리 default 위에 카드별 부분 override를 얹는다.
 *  - tone: 얕은 머지. voiceGain은 한 단계 깊은 머지.
 *  - bundle: 얕은 머지(필드 단위 instrument 교체).
 *  - variant: 그대로 forward.
 *
 * 결정론·O(1). slug 미등재 시 빈 프로필 fallback → 카테고리 default 그대로.
 */

import { CARD_PROFILES } from './card-profiles';
import {
  CATEGORY_BUNDLES,
  CATEGORY_TONE_DEFAULTS,
  getBundle,
  getCategoryToneDefault,
  type InstrumentBundle,
  type ToneProfile,
} from './presets';

export interface ResolvedCardProfile {
  variant: string | undefined;
  tone: ToneProfile;
  bundle: InstrumentBundle;
}

export function resolveCardProfile(
  slug: string,
  category: keyof typeof CATEGORY_BUNDLES | string,
): ResolvedCardProfile {
  const profile = CARD_PROFILES[slug] ?? {};
  const categoryTone = getCategoryToneDefault(category);
  const categoryBundle = getBundle(category);

  return {
    variant: profile.rhythmVariant,
    tone: {
      velocityScale: profile.toneProfile?.velocityScale ?? categoryTone.velocityScale,
      voiceGain: {
        drums: profile.toneProfile?.voiceGain?.drums ?? categoryTone.voiceGain.drums,
        bass: profile.toneProfile?.voiceGain?.bass ?? categoryTone.voiceGain.bass,
        guitar: profile.toneProfile?.voiceGain?.guitar ?? categoryTone.voiceGain.guitar,
        aux: profile.toneProfile?.voiceGain?.aux ?? categoryTone.voiceGain.aux,
      },
      reverbWet: profile.toneProfile?.reverbWet ?? categoryTone.reverbWet,
    },
    bundle: { ...categoryBundle, ...(profile.instrumentOverrides ?? {}) },
  };
}
```

- [ ] **Step 4: Run test**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/profile-merge.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/profile-merge.ts \
        apps/web/tests/unit/lib/audio/backing/profile-merge.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add resolveCardProfile pure function (Sprint 9 PR-B)

(slug, category) → { variant, tone, bundle } 결정론 머지.
- tone: 얕은 머지 + voiceGain 한 단계 깊은 머지
- bundle: 얕은 instrument 필드 교체
- 미등재 슬러그 → 빈 프로필 fallback → 카테고리 default 그대로

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B4: voice 4종 setVoiceGain + velocityScale 인자

**Files:**
- Modify: `apps/web/lib/audio/backing/voices/drums.ts`
- Modify: `apps/web/lib/audio/backing/voices/bass.ts`
- Modify: `apps/web/lib/audio/backing/voices/guitar.ts`
- Modify: `apps/web/lib/audio/backing/voices/aux.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/voices/*.test.ts` (있는 것만, 신규 생성 X)

**컨텍스트:** 각 voice 인터페이스에 `setVoiceGain(scale)`, `trigger(..., velocityScale)` 추가. trigger는 기존 velocity * velocityScale을 0~127로 변환. 기존 호출자(engine.ts B5에서 업데이트)는 velocityScale=1.0 default라 회귀 0.

- [ ] **Step 1: Update DrumVoice interface and impl (drums.ts)**

`apps/web/lib/audio/backing/voices/drums.ts`의 `DrumVoice` 인터페이스에 `setVoiceGain` 추가:

```ts
export interface DrumVoice {
  trigger(
    step: 'kick' | 'snare' | 'hat',
    drumMachine: DrumMachine,
    time: number,
    velocity?: number,
    velocityScale?: number,
  ): void;
  setVoiceGain(scale: number): void;
  fadeOut(): void;
  cancelScheduled(): void;
  dispose(): void;
}
```

`createDrumVoice` 반환 객체에서 `trigger` 시그니처와 `setVoiceGain` 추가:

```ts
    trigger(step, drumMachine, time, velocity = 0.8, velocityScale = 1) {
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const stop = drumMachine.start({
        note: step,
        time,
        velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
    },
    setVoiceGain(scale: number) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0, scale), t);
    },
```

- [ ] **Step 2: Repeat for bass.ts, guitar.ts, aux.ts**

각 파일에 동일 패턴 적용. 핵심:
- `trigger(..., velocityScale = 1)` 추가
- `setVoiceGain(scale)` 메서드 추가 (drums.ts와 동일 구현)
- velocity 곱셈은 `velocity * velocityScale` clamp [0,1]

bass.ts trigger:
```ts
    trigger(midi, soundfont, durationSec, time, velocity = 0.8, velocityScale = 1) {
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const stop = soundfont.start({
        note: midi,
        time,
        duration: durationSec,
        velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
    },
```

guitar.ts strum:
```ts
    strum(direction, midiNotes, soundfont, durationSec, time, velocity = 0.6, velocityScale = 1) {
      const sorted = [...midiNotes].sort((a, b) => a - b);
      const order = direction === 'down' ? sorted : sorted.reverse();
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const v = Math.max(0, Math.min(127, Math.round(scaled * 127)));
      order.forEach((note, i) => {
        const stop = soundfont.start({
          note,
          time: time + i * STRUM_STAGGER_SEC,
          duration: durationSec,
          velocity: v,
        }) as unknown as StopFn;
        pendingStops.push(stop);
      });
    },
```

aux.ts trigger:
```ts
    trigger(soundfont, kind, time, velocity = 0.7, velocityScale = 1) {
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const note = kind === 'shaker' ? 60 : 75;
      const stop = soundfont.start({
        note,
        time,
        velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
    },
```

각 voice 인터페이스에 `setVoiceGain(scale: number): void;` 추가.

- [ ] **Step 3: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS — 호출자 회귀 없음 (velocityScale optional)

- [ ] **Step 4: Run existing voice tests + full suite**

Run: `cd apps/web && pnpm test`
Expected: PASS — 기존 voice 테스트 통과 (velocityScale 미지정 = 1.0 = 회귀 0)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/voices/
git commit -m "$(cat <<'EOF'
feat(audio): add setVoiceGain and velocityScale to all voices (Sprint 9 PR-B)

DrumVoice/BassVoice/GuitarVoice/AuxVoice 모두에:
- trigger(..., velocityScale = 1) — velocity × velocityScale clamp [0,1] → 0~127
- setVoiceGain(scale) — voice 내부 GainNode setValueAtTime

velocityScale default 1.0 + setVoiceGain 미호출 = 기존 동작 그대로.
PR-B Task B5에서 engine이 카드 시작 시 setVoiceGain을 호출하고 trigger에
tone.velocityScale을 흘려보낸다.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task B5: engine.ts에 카드 프로필 적용

**Files:**
- Modify: `apps/web/lib/audio/backing/engine.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/engine.test.ts`

**컨텍스트:** 카드 시작 시 `resolveCardProfile(slug, category)` → variant 흘려보내고, voice setVoiceGain + fxChain.wetGain.setValueAtTime + voice trigger에 velocityScale 인자 추가. 빈 프로필 17장 → 카테고리 default → 사운드 회귀 0.

- [ ] **Step 1: Write integration test**

기존 engine.test.ts 끝에 추가:

```ts
describe('Sprint 9 PR-B: card profile application', () => {
  it('forwards variant to selectSlot from CARD_PROFILES', async () => {
    // CARD_PROFILES의 blues 카드 중 variant가 빈(undefined) 것은 그대로 selectSlot에 undefined 전달
    const { mock, engine } = await setupEngineWithSpies({ category: 'blues' });
    await engine.start({ ...mock.template, slug: '12-bar-blues-major' }, 0);
    await flushScheduler(mock, 1);
    expect(mock.selectSlotCalls.at(-1)?.variant).toBeUndefined();
  });

  it('sets fxChain.wetGain to category default reverbWet on card start', async () => {
    const { mock, engine } = await setupEngineWithSpies({ category: 'blues' });
    await engine.start({ ...mock.template, slug: '12-bar-blues-major' }, 0);
    expect(mock.wetGainSetValues.at(-1)).toBeCloseTo(0.22, 4); // blues default
  });

  it('calls setVoiceGain on each voice with category default scales', async () => {
    const { mock, engine } = await setupEngineWithSpies({ category: 'blues' });
    await engine.start({ ...mock.template, slug: '12-bar-blues-major' }, 0);
    expect(mock.voiceGainCalls.drums.at(-1)).toBeCloseTo(0.95, 4);
    expect(mock.voiceGainCalls.guitar.at(-1)).toBeCloseTo(1.05, 4);
  });

  it('passes velocityScale to drum/bass/guitar trigger calls', async () => {
    const { mock, engine } = await setupEngineWithSpies({ category: 'blues' });
    await engine.start({ ...mock.template, slug: '12-bar-blues-major' }, 0);
    await flushScheduler(mock, 1);
    // blues default velocityScale = 1.0
    for (const call of mock.drumStarts) {
      expect(call.velocityScale).toBe(1.0);
    }
  });
});
```

(`mock.selectSlotCalls`, `mock.wetGainSetValues`, `mock.voiceGainCalls`, `mock.drumStarts.velocityScale`은 기존 spy 헬퍼에 필드 추가. 헬퍼가 없으면 첫 PR에서 도입 — 기존 engine.test.ts 패턴 그대로 따라가기.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/engine.test.ts -t "PR-B"`
Expected: FAIL

- [ ] **Step 3: Update engine.ts**

`apps/web/lib/audio/backing/engine.ts`의 import 추가:

```ts
import { resolveCardProfile } from './profile-merge';
```

`start` 함수에서 `getBundle` 호출 부분(line 223)을 `resolveCardProfile`로 교체:

```ts
    // PR-B: 카드 슬러그로 profile resolve. 미등재 = 빈 프로필 → 카테고리 default 그대로.
    const profile = resolveCardProfile(template.slug, template.category ?? 'pop');
    const bundle = profile.bundle;
    let loaded: LoadedBundle;
    try {
      loaded = await loadBundle(ctx, bundle);
    } catch (e) {
      setState({
        status: 'error',
        message: `Failed to load instruments: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }
```

`ensureVoices` 호출 후 (line 246 부근), tone 적용 블록 추가:

```ts
    const voices = await ensureVoices();

    // PR-B: 카드 시작 시 tone 적용. setValueAtTime은 즉시 반영(ramp 없음 — 카드 전환은 hardStop 직후라 OK).
    const ctxNow = ctx.currentTime;
    if (fxChain) fxChain.wetGain.gain.setValueAtTime(profile.tone.reverbWet, ctxNow);
    voices.drums.setVoiceGain(profile.tone.voiceGain.drums);
    voices.bass.setVoiceGain(profile.tone.voiceGain.bass);
    voices.guitar.setVoiceGain(profile.tone.voiceGain.guitar);
    voices.aux.setVoiceGain(profile.tone.voiceGain.aux);
```

기존 chord trigger 블록(A4에서 수정한 부분)에서 `variant`를 `profile.variant`로 변경, voice trigger에 `velocityScale` 인자 추가:

```ts
        const rhythm = CATEGORY_RHYTHMS[tpl.category as string] ?? CATEGORY_RHYTHMS['pop']!;
        // PR-B: profile.variant를 selectSlot에 forward
        const variant = profile.variant;
        const slotName = rhythm.selectSlot(tpl, idx, variant);
        const pattern = rhythm.patterns[slotName];
        if (!pattern) return;

        const swing = resolveSwing(rhythm, variant);
        const t = (step: { time: string; unit?: 'sub16' | 'triplet8' }) =>
          eventTime + parseBeatStep(step.time, bpm, 4, { unit: step.unit, swing });

        const vs = profile.tone.velocityScale;

        for (const s of pattern.drums.kick)  voices.drums.trigger('kick',  loaded.drums, t(s), s.velocity, vs);
        for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity, vs);
        for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity, vs);

        const bassMidi = midi[0]! - 24;
        for (const s of pattern.bass.steps)
          voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity, vs);

        const guitarMidi = midi.map((n) => n - 12);
        for (const s of pattern.guitar)
          voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity, vs);

        if (pattern.aux && voices.aux && loaded.aux) {
          const auxKind = bundle.aux?.kind;  // profile.bundle 사용 (override 반영)
          if (auxKind) {
            for (const s of pattern.aux) voices.aux.trigger(loaded.aux, auxKind, t(s), s.velocity, vs);
          }
        }
```

`profile`을 closure로 잡으려면 scheduler.start 콜백 바깥에서 변수 캡처. 위 코드는 이미 그렇게 작성됨.

- [ ] **Step 4: Run engine tests**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/engine.test.ts`
Expected: PASS — 기존 + PR-A 회귀 + PR-B 신규 모두 통과

- [ ] **Step 5: Run full suite + typecheck**

Run: `cd apps/web && pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/audio/backing/engine.ts \
        apps/web/tests/unit/lib/audio/backing/engine.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): apply card profile in engine (Sprint 9 PR-B)

카드 시작 시 resolveCardProfile(slug, category) →
- bundle: loadBundle에 instrument override 반영
- tone.reverbWet: fxChain.wetGain.setValueAtTime
- tone.voiceGain: 4 voice 모두 setVoiceGain
- tone.velocityScale: voice trigger에 인자로 흘림
- variant: selectSlot/resolveSwing에 forward

CARD_PROFILES 17장이 모두 빈 객체 → 카테고리 default 그대로 → 사운드 회귀 0.
PR-D에서 17장 실제 값 채워짐.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### PR-B 머지 게이트

- [ ] `pnpm typecheck` / `pnpm lint` clean
- [ ] `pnpm test` 통과
- [ ] `web-audio-engineer` 리뷰 (voice setVoiceGain 라이프사이클, fxChain wetGain 즉시 반영 결정)
- [ ] `test-strategist` 리뷰
- [ ] dev/jam 페이지에서 17장 카드 클릭해 사운드 변화 0 수동 검증 (인프라만)
- [ ] PR 제목: `feat(audio): card profile system (Sprint 9 PR-B)`

---

# PR-C — Variant Pattern Data + Swing Activation

목표: 신규 variant 10개 + 카테고리 default 보강 2건 + swing default 활성화(blues=0.66, jazz=0.66). **첫 사운드 변화 — blues/jazz가 정통 swing으로 들리기 시작. 다른 카테고리 영향 0**.

브랜치: `feat/sprint-9-pr-c-variants-and-swing`

각 카테고리별 task로 분할.

---

### Task C1: blues 카테고리 — 6 variant + groove_a 보강 + swing 0.66

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/blues.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/patterns/blues.test.ts` (없으면 create)

**컨텍스트:** 기존 슬롯 `shuffle_a/shuffle_b/iv_pickup/turnaround` 4개를 `shuffle12bar` 시리즈로 재명명·재구성하고, `slow / hard_bop / straight_shuffle / major_swing / jump` variant를 위한 슬롯 추가. swing 0.66 카테고리 default + variant override 등록.

기존 `shuffle_a` hat은 `0:0:0` + `0:0:3`으로 16분 sub 3을 침. PR-C에서는 `0:0:2`(8분 off-beat)로 바꾸고 swing 0.66을 적용해 long-short feel을 자연스럽게 표현.

- [ ] **Step 1: Write failing tests for new variants**

```ts
// apps/web/tests/unit/lib/audio/backing/patterns/blues.test.ts
import { describe, expect, it } from 'vitest';
import { BLUES_RHYTHM } from '@/lib/audio/backing/patterns/library/blues';

const tpl12 = { bars: 12, default_bpm: 90, progression: Array(12).fill({ chord: 'I7' }) };

describe('blues swing', () => {
  it('has swing default 0.66', () => {
    expect(BLUES_RHYTHM.swing?.default).toBe(0.66);
  });

  it('has variant overrides for hard_bop and jump', () => {
    expect(BLUES_RHYTHM.swing?.perVariant?.hard_bop).toBe(0.62);
    expect(BLUES_RHYTHM.swing?.perVariant?.jump).toBe(0.55);
  });
});

describe('blues selectSlot — shuffle12bar variant (default)', () => {
  it('idx 3 → iv_pickup', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3, 'shuffle12bar')).toBe('iv_pickup');
  });

  it('idx 10/11 → turnaround', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'shuffle12bar')).toBe('turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 11, 'shuffle12bar')).toBe('turnaround');
  });

  it('idx 0/2 even → groove_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'shuffle12bar')).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 2, 'shuffle12bar')).toBe('groove_a');
  });

  it('idx 1 odd → groove_b', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 1, 'shuffle12bar')).toBe('groove_b');
  });

  it('undefined variant defaults to shuffle12bar behavior', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3)).toBe('iv_pickup');
  });
});

describe('blues selectSlot — slow variant', () => {
  it('all idx → slow_groove (no turnaround/pickup)', () => {
    for (const i of [0, 3, 10, 11]) {
      expect(BLUES_RHYTHM.selectSlot(tpl12, i, 'slow')).toBe('slow_groove');
    }
  });
});

describe('blues selectSlot — hard_bop variant', () => {
  it('idx 10/11 → hb_turnaround, else hb_walk', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'hard_bop')).toBe('hb_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 11, 'hard_bop')).toBe('hb_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'hard_bop')).toBe('hb_walk');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 5, 'hard_bop')).toBe('hb_walk');
  });
});

describe('blues selectSlot — straight_shuffle variant', () => {
  it('idx 3 → iv_pickup, 10/11 → turnaround, else groove_b16', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3, 'straight_shuffle')).toBe('iv_pickup');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'straight_shuffle')).toBe('turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'straight_shuffle')).toBe('groove_b16');
  });
});

describe('blues selectSlot — major_swing variant', () => {
  it('idx 10/11 → ms_turnaround, else ms_comp', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'major_swing')).toBe('ms_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'major_swing')).toBe('ms_comp');
  });
});

describe('blues selectSlot — jump variant', () => {
  it('idx 10/11 → jump_turnaround, else jump_drive', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'jump')).toBe('jump_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'jump')).toBe('jump_drive');
  });
});

describe('blues patterns presence', () => {
  it('has all variant slot patterns defined', () => {
    const required = [
      'groove_a',
      'groove_b',
      'iv_pickup',
      'turnaround',
      'slow_groove',
      'hb_walk',
      'hb_turnaround',
      'groove_b16',
      'ms_comp',
      'ms_turnaround',
      'jump_drive',
      'jump_turnaround',
    ];
    for (const slot of required) {
      expect(BLUES_RHYTHM.patterns[slot]).toBeDefined();
    }
  });

  it('groove_a hat uses sub16 with off-beat at sub 2 (swing 0.66 friendly)', () => {
    const hat = BLUES_RHYTHM.patterns.groove_a?.drums.hat ?? [];
    // 8 hits per bar (sub 0 + sub 2 × 4박)
    expect(hat.length).toBe(8);
    // off-beat은 sub 2 (swing 적용 대상)
    expect(hat.some((s) => s.time.endsWith(':2'))).toBe(true);
  });

  it('slow_groove ride uses triplet8 unit', () => {
    const slowDrums = BLUES_RHYTHM.patterns.slow_groove?.drums.hat ?? [];
    expect(slowDrums.some((s) => s.unit === 'triplet8')).toBe(true);
  });

  it('hb_walk ride uses triplet8 with middle ghost (velocity ~0.4)', () => {
    const hat = BLUES_RHYTHM.patterns.hb_walk?.drums.hat ?? [];
    expect(hat.some((s) => s.unit === 'triplet8')).toBe(true);
    expect(hat.some((s) => s.unit === 'triplet8' && (s.velocity ?? 0) <= 0.5)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/blues.test.ts`
Expected: FAIL — many missing patterns/swing

- [ ] **Step 3: Rewrite blues.ts**

`apps/web/lib/audio/backing/patterns/library/blues.ts`을 다음으로 완전 교체:

```ts
/**
 * Blues — Sprint 9 PR-C에서 카드별 variant + swing 0.66 도입.
 *
 * variant 풀:
 *  - shuffle12bar(default): 정통 12bar shuffle. groove_a/b + iv_pickup + turnaround.
 *    hat은 sub 0 + sub 2(8분 off-beat). swing 0.66 자동 적용 → long-short feel.
 *  - slow: ½ time feel. ride triplet8 명시. drums sparse.
 *  - hard_bop: ride triplet8 모든 음(가운데 ghost), walking bass.
 *  - straight_shuffle: groove_b16(16th hat 추가).
 *  - major_swing: walking bass + comping (jazz-influenced).
 *  - jump: driving 8th, hat sub 0+2 strong.
 */

import type { CategoryRhythm } from '../types';

export const BLUES_RHYTHM: CategoryRhythm = {
  swing: {
    default: 0.66,
    perVariant: {
      hard_bop: 0.62,
      jump: 0.55,
    },
  },
  patterns: {
    // ── shuffle12bar variant ─────────────────────────────────────────
    groove_a: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // sub 0 + sub 2(8분 off-beat). swing 0.66 적용 시 sub 2가 0.66박 위치로 밀려 long-short feel.
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    groove_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // off-beat을 0.7로 강조
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    iv_pickup: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:2:2', velocity: 0.6 },
          { time: '0:3:0' },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:0:2', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.6 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:2:2', velocity: 0.6 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // ── slow variant ─────────────────────────────────────────────────
    slow_groove: {
      drums: {
        // ½ time feel: kick 1박, snare 3박만
        kick: [{ time: '0:0:0' }],
        snare: [{ time: '0:2:0' }],
        // ride triplet8 — 각 박의 long, short만 (가운데 음 생략 = slow drag feel)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // sparse legato strums
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.45 },
        { time: '0:2:0', direction: 'down', velocity: 0.45 },
      ],
    },

    // ── hard_bop variant ─────────────────────────────────────────────
    hb_walk: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // ride triplet8 — long(0.8) - middle ghost(0.4) - short(0.7)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.7 },
        ],
      },
      // walking bass: 4박 모두
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.8 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.8 },
          { time: '0:3:0', velocity: 0.7 },
        ],
      },
      // comp: 2 & 4박에 short stab
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    hb_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.5 }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.85 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ── straight_shuffle variant ─────────────────────────────────────
    groove_b16: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 16th hat — sub 0/1/2/3 모두 (swing 0.66 적용 시 sub 2만 밀림)
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:1', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:0:3', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:1', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:1:3', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:1', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:1', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.55 },
          { time: '0:3:3', velocity: 0.4 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.6 },
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ── major_swing variant ──────────────────────────────────────────
    ms_comp: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // jazz ride pattern: long-short-long with off-beat
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      // walking bass
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.8 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.8 },
          { time: '0:3:0', velocity: 0.7 },
        ],
      },
      // comping: 2 & 4박
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    ms_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:2:2', velocity: 0.6 }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ── jump variant ─────────────────────────────────────────────────
    jump_drive: {
      drums: {
        // driving 8th kick (1, &, 3, &)
        kick: [{ time: '0:0:0' }, { time: '0:0:2', velocity: 0.7 }, { time: '0:2:0' }, { time: '0:2:2', velocity: 0.7 }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // hat sub 0+2 strong
        hat: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:1:0' }, { time: '0:2:0' }, { time: '0:3:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
      ],
    },

    jump_turnaround: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:2:0' },
          { time: '0:3:2', velocity: 0.8 },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.8 },
      ],
    },
  },

  /**
   * variant 라우팅:
   *  - undefined / 'shuffle12bar' → 기존 4-슬롯 분기
   *  - 'slow' → 모든 idx → slow_groove
   *  - 'hard_bop' → 10/11 → hb_turnaround, else hb_walk
   *  - 'straight_shuffle' → idx 3 iv_pickup, 10/11 turnaround, else groove_b16
   *  - 'major_swing' → 10/11 ms_turnaround, else ms_comp
   *  - 'jump' → 10/11 jump_turnaround, else jump_drive
   *
   * tpl.bars !== 12면 variant 무시하고 groove_a 단순화.
   */
  selectSlot: (tpl, idx, variant) => {
    const local = idx % tpl.bars;
    if (tpl.bars !== 12) return 'groove_a';

    switch (variant) {
      case 'slow':
        return 'slow_groove';
      case 'hard_bop':
        return local === 10 || local === 11 ? 'hb_turnaround' : 'hb_walk';
      case 'straight_shuffle':
        if (local === 3) return 'iv_pickup';
        if (local === 10 || local === 11) return 'turnaround';
        return 'groove_b16';
      case 'major_swing':
        return local === 10 || local === 11 ? 'ms_turnaround' : 'ms_comp';
      case 'jump':
        return local === 10 || local === 11 ? 'jump_turnaround' : 'jump_drive';
      default: // undefined or 'shuffle12bar'
        if (local === 3) return 'iv_pickup';
        if (local === 10 || local === 11) return 'turnaround';
        return local % 2 === 0 ? 'groove_a' : 'groove_b';
    }
  },
};
```

- [ ] **Step 4: Run blues tests**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/blues.test.ts`
Expected: PASS — all variant tests + pattern presence tests pass

- [ ] **Step 5: Run full suite — verify no regression in other categories**

Run: `cd apps/web && pnpm test`
Expected: PASS — blues 변경이 다른 카테고리에 영향 없음

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/library/blues.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/blues.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): blues swing 0.66 + 5 variants (Sprint 9 PR-C)

기존 shuffle_a/b → groove_a/b 재명명. hat off-beat을 sub 3 → sub 2로 이동
하여 swing 0.66 적용 시 정통 long-short shuffle feel 표현.

신규 variant:
- slow_groove (slow): ½ time + triplet8 ride
- hb_walk/hb_turnaround (hard_bop): triplet8 모든 음 + middle ghost
- groove_b16 (straight_shuffle): 16th hat 추가
- ms_comp/ms_turnaround (major_swing): walking bass + comping
- jump_drive/jump_turnaround (jump): driving 8th + dry

swing perVariant: hard_bop 0.62, jump 0.55 (default 0.66).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C2: jazz 카테고리 — walk ride 8분주화 + swing 0.66 + triplet8

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/jazz.ts`
- Modify/Create: `apps/web/tests/unit/lib/audio/backing/patterns/jazz.test.ts`

**컨텍스트:** jazz `walk` 슬롯의 ride를 4분주에서 8분 sub 0+2(triplet8)으로 보강. swing default 0.66 활성화.

- [ ] **Step 1: Read current jazz.ts**

Run: `cat apps/web/lib/audio/backing/patterns/library/jazz.ts`

핵심: 기존 `walk` 슬롯의 hat이 4분주(`0:0:0`, `0:1:0`, `0:2:0`, `0:3:0`)인지 확인. 이를 triplet8 패턴으로 보강.

- [ ] **Step 2: Update jazz.ts to add swing and triplet8 ride**

`apps/web/lib/audio/backing/patterns/library/jazz.ts`에 `swing: { default: 0.66 }` 필드를 `JAZZ_RHYTHM` 객체 최상단에 추가하고, 모든 패턴 슬롯의 hat을 triplet8 unit + 8분주(sub 0+2)로 변경. 예시 패턴(기존 walk를 보강):

```ts
walk: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    // ride triplet8: long-(skip)-short per beat — 정통 jazz ride
    hat: [
      { time: '0:0:0', unit: 'triplet8', velocity: 0.6 },
      { time: '0:0:2', unit: 'triplet8', velocity: 0.5 },
      { time: '0:1:0', unit: 'triplet8', velocity: 0.6 },
      { time: '0:1:2', unit: 'triplet8', velocity: 0.5 },
      { time: '0:2:0', unit: 'triplet8', velocity: 0.6 },
      { time: '0:2:2', unit: 'triplet8', velocity: 0.5 },
      { time: '0:3:0', unit: 'triplet8', velocity: 0.6 },
      { time: '0:3:2', unit: 'triplet8', velocity: 0.5 },
    ],
  },
  // walking bass + comp 유지(기존 패턴)
  ...
},
```

기존 다른 슬롯(예: `walk_approach`)이 있다면 동일 패턴으로 hat ride만 보강. bass·guitar는 변경 없음.

- [ ] **Step 3: Add jazz tests**

```ts
// apps/web/tests/unit/lib/audio/backing/patterns/jazz.test.ts
import { describe, expect, it } from 'vitest';
import { JAZZ_RHYTHM } from '@/lib/audio/backing/patterns/library/jazz';

describe('jazz swing', () => {
  it('has swing default 0.66', () => {
    expect(JAZZ_RHYTHM.swing?.default).toBe(0.66);
  });
});

describe('jazz patterns — ride uses triplet8', () => {
  it('walk slot uses triplet8 ride', () => {
    const hat = JAZZ_RHYTHM.patterns.walk?.drums.hat ?? [];
    expect(hat.length).toBeGreaterThan(0);
    expect(hat.every((s) => s.unit === 'triplet8')).toBe(true);
  });
});
```

- [ ] **Step 4: Run jazz tests + full**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/jazz.test.ts && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/library/jazz.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/jazz.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): jazz swing 0.66 + triplet8 ride (Sprint 9 PR-C)

walk 슬롯 hat을 4분주에서 triplet8 long-short(sub 0+2)으로 보강.
정통 jazz ride pattern과 정합. swing default 0.66 활성화.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C3: pop 50s_doo_wop variant

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/pop.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/patterns/pop.test.ts`

**컨텍스트:** pop은 swing 0.5(straight) 유지. variant `50s_doo_wop` 슬롯 추가 — half-time feel(snare on 3 only, kick 1+3), guitar 4분주 뮤트.

- [ ] **Step 1: Read pop.ts to understand existing structure**

Run: `cat apps/web/lib/audio/backing/patterns/library/pop.ts`

- [ ] **Step 2: Add 50s_doo_wop slot and variant routing in selectSlot**

`apps/web/lib/audio/backing/patterns/library/pop.ts`의 `patterns` 객체에 슬롯 추가:

```ts
doo_wop: {
  drums: {
    // half-time feel: kick 1+3, snare 3 only
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:2:0' }],
    hat: [
      { time: '0:0:0', velocity: 0.45 },
      { time: '0:1:0', velocity: 0.45 },
      { time: '0:2:0', velocity: 0.45 },
      { time: '0:3:0', velocity: 0.45 },
    ],
  },
  bass: {
    steps: [
      { time: '0:0:0', velocity: 0.7 },
      { time: '0:2:0', velocity: 0.7 },
    ],
  },
  // 4분주 뮤트 컴핑
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.4 },
    { time: '0:1:0', direction: 'down', velocity: 0.4 },
    { time: '0:2:0', direction: 'down', velocity: 0.4 },
    { time: '0:3:0', direction: 'down', velocity: 0.4 },
  ],
},
```

**먼저 현재 `selectSlot` 본체를 Read한 뒤**, 그 본체를 `default` 케이스로 옮기고 variant 분기를 앞에 추가:

```ts
// 변경 전:
//   selectSlot: (tpl, idx, _variant) => {
//     <existing default body>
//   }
// 변경 후:
selectSlot: (tpl, idx, variant) => {
  if (variant === '50s_doo_wop') return 'doo_wop';
  // 기존 default body를 여기로 그대로 옮긴다
  <existing default body>
},
```

- [ ] **Step 3: Add tests**

```ts
// apps/web/tests/unit/lib/audio/backing/patterns/pop.test.ts (append)
import { describe, expect, it } from 'vitest';
import { POP_RHYTHM } from '@/lib/audio/backing/patterns/library/pop';

const tpl4 = { bars: 4, default_bpm: 90, progression: Array(4).fill({ chord: 'I' }) };

describe('pop variant — 50s_doo_wop', () => {
  it('routes to doo_wop slot', () => {
    expect(POP_RHYTHM.selectSlot(tpl4, 0, '50s_doo_wop')).toBe('doo_wop');
  });

  it('doo_wop pattern has half-time feel (snare on 3 only)', () => {
    const snare = POP_RHYTHM.patterns.doo_wop?.drums.snare ?? [];
    expect(snare.length).toBe(1);
    expect(snare[0]?.time).toBe('0:2:0');
  });

  it('undefined variant uses original default behavior (no regression)', () => {
    // 기존 default 슬롯 이름 — 기존 테스트가 있다면 그 이름. 없으면 'default'/'groove' 등.
    const slot = POP_RHYTHM.selectSlot(tpl4, 0);
    expect(slot).not.toBe('doo_wop');
  });
});

describe('pop swing — straight (0.5 default, regression)', () => {
  it('swing is undefined or default 0.5', () => {
    if (POP_RHYTHM.swing) {
      expect(POP_RHYTHM.swing.default).toBe(0.5);
    }
  });
});
```

- [ ] **Step 4: Run tests + full**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/pop.test.ts && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/library/pop.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/pop.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): pop 50s_doo_wop variant (Sprint 9 PR-C)

doo_wop 슬롯 추가 — half-time feel(snare on 3 only, kick 1+3), 4분주 뮤트
컴핑. variant '50s_doo_wop'로 라우팅. swing은 default 0.5 유지(straight).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task C4: modal 3 variant

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/modal.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts`

**컨텍스트:** modal에 `dorian_groove`, `lydian_dreamy`, `mixolydian_driving` 3 variant 추가. swing 0.5 유지.

- [ ] **Step 1: Read modal.ts**

Run: `cat apps/web/lib/audio/backing/patterns/library/modal.ts`

- [ ] **Step 2: Add 3 variant slots and selectSlot routing**

`apps/web/lib/audio/backing/patterns/library/modal.ts`의 `patterns` 객체에 추가:

```ts
dorian_groove: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    // 16th hat — funk-influenced
    hat: [
      { time: '0:0:0', velocity: 0.5 },
      { time: '0:0:1', velocity: 0.4 },
      { time: '0:0:2', velocity: 0.5 },
      { time: '0:0:3', velocity: 0.4 },
      { time: '0:1:0', velocity: 0.5 },
      { time: '0:1:1', velocity: 0.4 },
      { time: '0:1:2', velocity: 0.5 },
      { time: '0:1:3', velocity: 0.4 },
      { time: '0:2:0', velocity: 0.5 },
      { time: '0:2:1', velocity: 0.4 },
      { time: '0:2:2', velocity: 0.5 },
      { time: '0:2:3', velocity: 0.4 },
      { time: '0:3:0', velocity: 0.5 },
      { time: '0:3:1', velocity: 0.4 },
      { time: '0:3:2', velocity: 0.5 },
      { time: '0:3:3', velocity: 0.4 },
    ],
  },
  bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.65 },
    { time: '0:1:0', direction: 'down', velocity: 0.6 },
    { time: '0:2:0', direction: 'down', velocity: 0.65 },
    { time: '0:3:0', direction: 'down', velocity: 0.6 },
  ],
},

lydian_dreamy: {
  drums: {
    kick: [{ time: '0:0:0' }],
    snare: [{ time: '0:2:0' }],
    // ride bell sparse
    hat: [
      { time: '0:0:0', velocity: 0.4 },
      { time: '0:1:0', velocity: 0.4 },
      { time: '0:2:0', velocity: 0.4 },
      { time: '0:3:0', velocity: 0.4 },
    ],
  },
  bass: { steps: [{ time: '0:0:0' }] },
  guitar: [
    // soft strums: 1박과 3박만
    { time: '0:0:0', direction: 'down', velocity: 0.4 },
    { time: '0:2:0', direction: 'down', velocity: 0.4 },
  ],
},

mixolydian_driving: {
  drums: {
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    // straight 8th hat — driving
    hat: [
      { time: '0:0:0', velocity: 0.6 },
      { time: '0:0:2', velocity: 0.6 },
      { time: '0:1:0', velocity: 0.6 },
      { time: '0:1:2', velocity: 0.6 },
      { time: '0:2:0', velocity: 0.6 },
      { time: '0:2:2', velocity: 0.6 },
      { time: '0:3:0', velocity: 0.6 },
      { time: '0:3:2', velocity: 0.6 },
    ],
  },
  bass: { steps: [{ time: '0:0:0' }, { time: '0:1:0' }, { time: '0:2:0' }, { time: '0:3:0' }] },
  guitar: [
    { time: '0:0:0', direction: 'down', velocity: 0.65 },
    { time: '0:1:0', direction: 'down', velocity: 0.65 },
    { time: '0:2:0', direction: 'down', velocity: 0.65 },
    { time: '0:3:0', direction: 'down', velocity: 0.65 },
  ],
},
```

**먼저 현재 `selectSlot` 본체를 Read한 뒤**, 그 본체를 `default` 케이스로 옮긴다:

```ts
selectSlot: (tpl, idx, variant) => {
  switch (variant) {
    case 'dorian_groove':
      return 'dorian_groove';
    case 'lydian_dreamy':
      return 'lydian_dreamy';
    case 'mixolydian_driving':
      return 'mixolydian_driving';
    default:
      // 기존 default body를 여기로 그대로 옮긴다 (Read한 코드 인용)
      <existing default body>
  }
},
```

- [ ] **Step 3: Add tests**

```ts
// apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts (append)
import { describe, expect, it } from 'vitest';
import { MODAL_RHYTHM } from '@/lib/audio/backing/patterns/library/modal';

const tpl4 = { bars: 4, default_bpm: 90, progression: Array(4).fill({ chord: 'i' }) };

describe('modal variants', () => {
  it('routes dorian_groove → dorian_groove slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'dorian_groove')).toBe('dorian_groove');
  });

  it('routes lydian_dreamy → lydian_dreamy slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'lydian_dreamy')).toBe('lydian_dreamy');
  });

  it('routes mixolydian_driving → mixolydian_driving slot', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4, 0, 'mixolydian_driving')).toBe('mixolydian_driving');
  });

  it('all 3 variant slot patterns are defined', () => {
    expect(MODAL_RHYTHM.patterns.dorian_groove).toBeDefined();
    expect(MODAL_RHYTHM.patterns.lydian_dreamy).toBeDefined();
    expect(MODAL_RHYTHM.patterns.mixolydian_driving).toBeDefined();
  });

  it('undefined variant falls back to original default (no regression)', () => {
    const slot = MODAL_RHYTHM.selectSlot(tpl4, 0);
    expect(['dorian_groove', 'lydian_dreamy', 'mixolydian_driving']).not.toContain(slot);
  });
});
```

- [ ] **Step 4: Run tests + full**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/patterns/modal.test.ts && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/patterns/library/modal.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): modal 3 variants — dorian/lydian/mixolydian (Sprint 9 PR-C)

- dorian_groove: 16th hat funk-influenced
- lydian_dreamy: ride bell + soft strums (sparse)
- mixolydian_driving: straight 8th + heavier guitar

swing은 default 0.5 유지(straight). 미지정 variant는 기존 default로 회귀 0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### PR-C 머지 게이트

- [ ] `pnpm typecheck` / `pnpm lint` clean
- [ ] `pnpm test` 모든 테스트 통과 (신규 패턴 테스트 + 기존 회귀)
- [ ] `web-audio-engineer` 리뷰 (variant 디스패치 결정론, triplet8 적용 정확성)
- [ ] **`music-theory-guardian` 리뷰** (variant별 패턴 음악적 정확성 — 셔플 12/8, hard bop ride, half-time doo-wop 등)
- [ ] `test-strategist` 리뷰 (회귀 가드)
- [ ] dev 페이지에서 blues 카드 5장 + jazz 카드 1장 청취 — swing 0.66 적용 확인
- [ ] PR 제목: `feat(audio): variant patterns + swing activation (Sprint 9 PR-C)`

---

# PR-D — Card Mapping + Playwright Smoke

목표: CARD_PROFILES 17장에 실제 variant + tone delta + instrument override 채우기, dev 슬러그 정합성 가드 활성화, Playwright E2E 스모크. **카드별 정체성이 사용자에게 처음 들리는 시점**.

브랜치: `feat/sprint-9-pr-d-card-mapping-and-e2e`

---

### Task D1: CARD_PROFILES 17장 실제 값 채우기

**Files:**
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Modify: `apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts`

**컨텍스트:** spec Section 6.2~6.5 표를 그대로 코드로. 빈 객체 17장을 실제 프로필로 교체.

- [ ] **Step 1: Update CARD_PROFILES with 17 actual entries**

`apps/web/lib/audio/backing/card-profiles.ts`의 `CARD_PROFILES`을 다음으로 교체(타입과 `__assertCardProfilesMatch`는 그대로):

```ts
export const CARD_PROFILES: Readonly<Record<string, CardProfile>> = {
  // ── blues 8장 ────────────────────────────────────────────────────
  // 정통 12bar shuffle. 카테고리 default가 곧 정체성.
  '12-bar-blues-major': {
    rhythmVariant: 'shuffle12bar',
  },
  // minor blues — 약간 더 어두운 공간감.
  '12-bar-blues-minor': {
    rhythmVariant: 'shuffle12bar',
    toneProfile: { reverbWet: 0.24 },
  },
  // quick change variant — 진행만 다르고 그루브는 동일.
  '12-bar-blues-quick-change': {
    rhythmVariant: 'shuffle12bar',
  },
  // half-time dreamy. distortion 빼고 clean으로 — instrument override.
  'slow-minor-blues': {
    rhythmVariant: 'slow',
    toneProfile: {
      velocityScale: 0.85,
      voiceGain: { drums: 0.85 },
      reverbWet: 0.30,
    },
    instrumentOverrides: {
      guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
    },
  },
  // hard bop minor. medium swing 0.62.
  'hard-bop-minor-blues': {
    rhythmVariant: 'hard_bop',
    toneProfile: {
      voiceGain: { drums: 0.95 },
      reverbWet: 0.20,
    },
  },
  // 16th hat 추가된 정통 shuffle.
  'shuffle-minor-blues': {
    rhythmVariant: 'straight_shuffle',
    toneProfile: { velocityScale: 1.05 },
  },
  // smoky comping + walking bass + jazz guitar.
  'jazz-major-blues': {
    rhythmVariant: 'major_swing',
    toneProfile: {
      velocityScale: 0.95,
      reverbWet: 0.25,
    },
    instrumentOverrides: {
      guitar: { instrument: 'electric_guitar_jazz', octaveShift: -1 },
    },
  },
  // tight driving 8th, dry. swing 0.55.
  'jump-blues': {
    rhythmVariant: 'jump',
    toneProfile: {
      velocityScale: 1.15,
      voiceGain: { drums: 1.1 },
      reverbWet: 0.10,
    },
  },

  // ── pop 2장 ──────────────────────────────────────────────────────
  // 카테고리 default 그대로.
  'pop-I-V-vi-IV': {},
  // half-time doo-wop feel.
  '50s-I-vi-IV-V': {
    rhythmVariant: '50s_doo_wop',
    toneProfile: {
      velocityScale: 0.9,
      reverbWet: 0.25,
    },
  },

  // ── jazz / minor / funk / bossa 각 1장 ────────────────────────────
  'jazz-ii-V-I': {
    toneProfile: {
      velocityScale: 0.95,
      reverbWet: 0.22,
    },
  },
  'minor-i-VI-III-VII': {},
  'funk-i7-vamp': {
    toneProfile: {
      velocityScale: 1.1,
      voiceGain: { drums: 1.05, guitar: 1.1 },
      reverbWet: 0.12,
    },
  },
  'bossa-i-iv-ii-v': {
    toneProfile: {
      velocityScale: 0.85,
      voiceGain: { drums: 0.85 },
      reverbWet: 0.25,
    },
  },

  // ── modal 3장 ────────────────────────────────────────────────────
  'dorian-vamp': {
    rhythmVariant: 'dorian_groove',
    toneProfile: { voiceGain: { drums: 1.05, guitar: 1.1 } },
  },
  'lydian-vamp': {
    rhythmVariant: 'lydian_dreamy',
    toneProfile: {
      velocityScale: 0.9,
      reverbWet: 0.30,
    },
  },
  'mixolydian-vamp': {
    rhythmVariant: 'mixolydian_driving',
    toneProfile: {
      velocityScale: 1.05,
      voiceGain: { drums: 1.05 },
    },
  },
};
```

- [ ] **Step 2: Add value-level tests**

`apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts`에 추가:

```ts
describe('CARD_PROFILES — actual values (PR-D)', () => {
  it('slow-minor-blues uses slow variant + clean guitar override', () => {
    const p = CARD_PROFILES['slow-minor-blues']!;
    expect(p.rhythmVariant).toBe('slow');
    expect(p.instrumentOverrides?.guitar?.instrument).toBe('electric_guitar_clean');
    expect(p.toneProfile?.reverbWet).toBe(0.30);
  });

  it('jazz-major-blues uses major_swing variant + jazz guitar', () => {
    const p = CARD_PROFILES['jazz-major-blues']!;
    expect(p.rhythmVariant).toBe('major_swing');
    expect(p.instrumentOverrides?.guitar?.instrument).toBe('electric_guitar_jazz');
  });

  it('jump-blues uses jump variant + dry reverb', () => {
    const p = CARD_PROFILES['jump-blues']!;
    expect(p.rhythmVariant).toBe('jump');
    expect(p.toneProfile?.reverbWet).toBe(0.10);
  });

  it('50s-I-vi-IV-V uses 50s_doo_wop variant', () => {
    const p = CARD_PROFILES['50s-I-vi-IV-V']!;
    expect(p.rhythmVariant).toBe('50s_doo_wop');
  });

  it('all 3 modal cards have variant', () => {
    expect(CARD_PROFILES['dorian-vamp']!.rhythmVariant).toBe('dorian_groove');
    expect(CARD_PROFILES['lydian-vamp']!.rhythmVariant).toBe('lydian_dreamy');
    expect(CARD_PROFILES['mixolydian-vamp']!.rhythmVariant).toBe('mixolydian_driving');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd apps/web && pnpm test tests/unit/lib/audio/backing/card-profiles.test.ts`
Expected: PASS — 모든 새 케이스 통과

- [ ] **Step 4: Run full suite + typecheck + lint**

Run: `cd apps/web && pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): fill 17 card profiles with variant/tone/instrument (Sprint 9 PR-D)

spec Section 6.2-6.5 표 반영. blues 8장(slow/hard_bop/straight_shuffle/
major_swing/jump variant + 2장 instrument override), pop 2장(default + doo_wop),
jazz/minor/funk/bossa 4장(tone delta), modal 3장(variant + tone delta).

instrument override는 slow-minor-blues(clean guitar), jazz-major-blues(jazz
guitar) 2장만 — Soundfont 캐시 부담 미미.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task D2: dev 슬러그 정합성 가드 활성화

**Files:**
- Modify: `apps/web/lib/api/progression-templates.ts` (또는 카탈로그 데이터 로드 지점)

**컨텍스트:** 백엔드 카탈로그 슬러그를 받는 시점에 `__assertCardProfilesMatch`를 호출. dev에서 신규 카드 추가 시 누락 알람.

- [ ] **Step 1: Find where catalog is loaded into the app**

Run: `grep -rn "progression_templates\|getProgressionTemplates\|generated.ts" apps/web/lib/api apps/web/app apps/web/components | head -20`

가장 적합한 위치는 카탈로그가 처음 사용되는 hook 또는 데이터 fetch 지점.

- [ ] **Step 2: Wire __assertCardProfilesMatch at catalog load**

카탈로그 로드 진입점에서 1회 호출. 예시 위치(`apps/web/lib/api/progression-templates.ts`의 `getProgressionTemplates` 또는 동등한 함수):

```ts
import { __assertCardProfilesMatch } from '@/lib/audio/backing/card-profiles';

// 함수 내부에서 카탈로그 배열을 얻은 직후
if (process.env.NODE_ENV !== 'production') {
  __assertCardProfilesMatch(templates.map((t) => t.slug));
}
```

호출 위치는 클라이언트 또는 서버 컴포넌트 어디든 가능 — `__assertCardProfilesMatch`가 production에서 dead-code-eliminate되므로 안전.

- [ ] **Step 3: Run dev server + verify warning works**

Run: `cd apps/web && pnpm dev`

브라우저에서 /jam 진입 → DevTools Console에 `[CARD_PROFILES] mismatch` 경고 *없음*을 확인 (현재 17장 등재되었으므로 아무 경고 없어야 함).

테스트로 일부러 한 슬러그를 CARD_PROFILES에서 빼본 뒤 경고가 뜨는지 확인 → 다시 복구.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/api/progression-templates.ts
git commit -m "$(cat <<'EOF'
chore(audio): wire CARD_PROFILES dev guard at catalog load (Sprint 9 PR-D)

__assertCardProfilesMatch를 카탈로그 로드 시점에 호출. dev에서 백엔드 신규
카드 추가 후 CARD_PROFILES 누락 시 console.warn으로 통보.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task D3: Playwright 스모크 — jam-card-profiles.spec.ts

**Files:**
- Create: `apps/web/tests/e2e/jam-card-profiles.spec.ts`

**컨텍스트:** /jam 페이지에서 blues 카드 5장 순차 토글 + 정지 + instrument override 카드 진입 시 오디오 에러 없는지. Sprint 2-8의 trailing 음 회귀 재방어.

- [ ] **Step 1: Write E2E spec**

```ts
// apps/web/tests/e2e/jam-card-profiles.spec.ts
import { expect, test } from '@playwright/test';

const BLUES_CARDS = [
  '12-bar-blues-major',
  'slow-minor-blues',
  'hard-bop-minor-blues',
  'jump-blues',
  'jazz-major-blues',
];

test.describe('Sprint 9 — jam card profiles', () => {
  test('plays 5 blues cards sequentially without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/jam');

    // 모든 카드가 렌더될 때까지 대기
    await page.waitForSelector('[data-testid^="progression-card-"]', { timeout: 10000 });

    for (const slug of BLUES_CARDS) {
      const card = page.locator(`[data-testid="progression-card-${slug}"]`);
      await expect(card).toBeVisible();

      // 재생 버튼
      const playBtn = card.locator('[aria-label*="재생"], [aria-label*="Play"]').first();
      await playBtn.click();

      // 1초 재생
      await page.waitForTimeout(1000);

      // 정지 버튼 (재생 중이면 버튼이 정지로 토글됨)
      const stopBtn = card.locator('[aria-label*="정지"], [aria-label*="Stop"]').first();
      await stopBtn.click();

      // trailing 음 회귀 가드 — 정지 직후 200ms 안에 또 다른 카드 클릭해도 에러 0
      await page.waitForTimeout(200);
    }

    expect(errors).toEqual([]);
  });

  test('instrument override cards (slow-minor-blues, jazz-major-blues) load without errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/jam');
    await page.waitForSelector('[data-testid^="progression-card-"]');

    for (const slug of ['slow-minor-blues', 'jazz-major-blues']) {
      const card = page.locator(`[data-testid="progression-card-${slug}"]`);
      const playBtn = card.locator('[aria-label*="재생"], [aria-label*="Play"]').first();
      await playBtn.click();
      // instrument 로딩 시간 고려
      await page.waitForTimeout(2000);
      const stopBtn = card.locator('[aria-label*="정지"], [aria-label*="Stop"]').first();
      await stopBtn.click();
      await page.waitForTimeout(300);
    }

    expect(errors).toEqual([]);
  });
});
```

(`data-testid` 셀렉터가 실제 컴포넌트와 일치하는지 확인. 일치하지 않으면 ProgressionCard 컴포넌트의 testid 부착 패턴을 따라 셀렉터 조정.)

- [ ] **Step 2: Run E2E in Docker**

Run: `docker compose -f docker-compose.test.yml up --exit-code-from playwright`
Expected: PASS — 두 테스트 모두 통과, console errors 0

(WSL 로컬 chromium 실행이 안 되면 Docker 경로가 정답.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/e2e/jam-card-profiles.spec.ts
git commit -m "$(cat <<'EOF'
test(test): add Sprint 9 jam card profiles E2E smoke (Sprint 9 PR-D)

5 blues 카드 순차 재생/정지 + instrument override 2장 로드 검증. trailing 음
회귀(Sprint 2-8) 재방어 + smplr Soundfont 인스턴스 캐시 누락 검증.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### PR-D 머지 게이트

- [ ] `pnpm typecheck` / `pnpm lint` clean
- [ ] `pnpm test` + Docker E2E 통과
- [ ] **사용자 청취 검수** — blues 8장 + 다른 카테고리 9장 모두 직접 들어보고 카드별 정체성·도메인 정확성 확인
- [ ] `web-audio-engineer` 최종 리뷰
- [ ] `aesthetic-reviewer` (UI 변경 없으므로 N/A — UI 검토 필요시만)
- [ ] PR 제목: `feat(audio): card mapping + E2E (Sprint 9 PR-D)`

---

# Sprint 9 완료 게이트

PR-A → B → C → D 모두 머지 후:

- [ ] CLAUDE.md sync 커밋 — Sprint 9 완료 반영(swing/triplet8 도입, 카드 프로필 시스템 도입, blues swing 0.66 활성화)
- [ ] Task #65 `completed`로 마크
- [ ] Sprint 10 후보 정리 (jazz brush, voice EQ, humanize, 카드 추가)
