# Sprint 10 — 카드 도메인 검수 + 신규 카드 + modal 마디수 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신규 카드 5장(folk 2 + rock 2 + modal 1) 추가 + modal 카테고리 3장 마디수 2bar→4bar 통일을 PR-A로 머지 후, PR-B/C/D는 청취 기반 검수 워크플로우로 진행.

**Architecture:** Sprint 9 카드 프로필 시스템(`CARD_PROFILES` × `CategoryRhythm` × `swing.ts` × `profile-merge.ts`) 그대로 재사용. 신규 카드는 *카테고리 라이브러리 variant 신설 + 카드 프로필 등재 + 카탈로그 시드 INSERT*의 3단 결합. modal 마디수 변경은 alembic data migration으로 row UPDATE.

**Tech Stack:** Next.js 15, Vitest, smplr 0.20.0, FastAPI, SQLAlchemy 2.x async, Alembic, pytest.

---

## File Structure

**Create:**
- `apps/api/alembic/versions/<rev>_sprint10_modal_4bar_and_new_cards.py` — modal 3장 UPDATE + 신규 5장 INSERT(idempotent seed가 신규만 처리하니 중복 없도록 INSERT는 seed에 위임, alembic은 modal UPDATE만 처리). 단발 data migration.

**Modify:**
- `apps/web/lib/audio/backing/patterns/library/folk.ts` — `folk_strum`/`ballad_pick` variant 신설 + selectSlot에 variant 분기 추가
- `apps/web/lib/audio/backing/patterns/library/rock.ts` — `rock_mixo`/`rock_12bar` variant 신설 + selectSlot에 variant 분기 추가
- `apps/web/lib/audio/backing/patterns/library/modal.ts` — `phrygian_dark` variant 신설 (기존 3 variant는 패턴 자체 변경 없음, 마디수 변경은 카탈로그 측에서만 처리)
- `apps/web/lib/audio/backing/card-profiles.ts` — 신규 5장 슬러그 등재
- `apps/api/app/scripts/seed.py` — 신규 5장 INSERT용 dict 추가 + modal 3장 bars/progression 변경 (idempotent seed는 신규만 INSERT, modal UPDATE는 alembic이 처리)

**Test (modify or create):**
- `apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts` (modify) — 신규 variant selectSlot 검증
- `apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts` (create) — rock_mixo/rock_12bar selectSlot 검증
- `apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts` (modify) — phrygian_dark 분기 + 4bar 회귀
- `apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts` (modify) — 신규 5장 머지 결과 + 정합성 가드
- `apps/api/tests/test_catalog.py` (modify or create) — 신규 5장 카탈로그 응답 + modal 3장 4bar 응답
- `apps/api/tests/test_alembic_sprint10_migration.py` (create) — alembic upgrade/downgrade 양방향 검증

**Auto-generated (do NOT edit manually):**
- `apps/web/lib/api/generated.ts` — `pnpm --filter @my-music-app/web types:api`로 갱신

---

## PR-A: 신규 5장 + modal 마디수 통일

### Task 1: 기존 카테고리 라이브러리 테스트 파일 확인

**Files:**
- Read: `apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts`
- Read: `apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts`
- Read: `apps/web/tests/unit/lib/audio/backing/patterns/library/blues.test.ts` (참고용, 12bar variant 분기 패턴)

- [ ] **Step 1: 기존 테스트 파일 구조 확인 (read-only)**

목적: 신규 variant 테스트 작성 시 기존 패턴(describe 블록 구성, tpl 헬퍼, expect 형식)을 그대로 따르기 위한 사전 조사.

Run:
```bash
ls apps/web/tests/unit/lib/audio/backing/patterns/
cat apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts | head -30
cat apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts | head -30
```

Expected: rock 디렉토리 테스트 없음(rock.test.ts 신설 필요), folk/modal은 기존 테스트 존재.

- [ ] **Step 2: 커밋 없음 (read-only)**

---

### Task 2: folk.ts에 `folk_strum` variant 신설

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/folk.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts`

`folk_strum`은 `strum_8th`와 패턴은 동일하지만 *variant 키*로 직접 라우팅(짝/홀수 토글 우회). `folk-I-IV-V` 카드가 모든 마디에 일관된 down-up 8분 strum을 갖도록.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts` 끝에 추가:

```ts
import { describe, expect, it } from 'vitest';
import { FOLK_RHYTHM } from '@/lib/audio/backing/patterns/library/folk';

const tpl4 = (default_bpm = 95) => ({
  bars: 4,
  default_bpm,
  progression: Array.from({ length: 4 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('folk selectSlot — folk_strum variant', () => {
  it('모든 idx에서 folk_strum 슬롯 사용 (짝/홀 토글 우회)', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 0, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 1, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 2, 'folk_strum')).toBe('folk_strum');
    expect(FOLK_RHYTHM.selectSlot(tpl4(), 3, 'folk_strum')).toBe('folk_strum');
  });

  it('folk_strum 패턴 정의됨', () => {
    expect(FOLK_RHYTHM.patterns.folk_strum).toBeDefined();
    expect(FOLK_RHYTHM.patterns.folk_strum?.drums.kick.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
```

Expected: FAIL — `selectSlot(_, _, 'folk_strum')`이 'folk_strum' 대신 기존 토글 결과 반환 + `patterns.folk_strum` undefined.

- [ ] **Step 3: folk.ts에 variant 추가**

`apps/web/lib/audio/backing/patterns/library/folk.ts`의 `patterns:` 객체 안 `pickup` 다음에 추가:

```ts
    // folk_strum: strum_8th와 동일한 패턴이지만 variant 키로 직접 라우팅.
    // folk-I-IV-V 카드가 모든 마디에 일관된 down-up 8분 strum을 갖도록.
    folk_strum: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0', velocity: 0.5 }, { time: '0:3:0', velocity: 0.5 }],
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.4 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
```

`selectSlot` 함수 교체:

```ts
  /**
   * variant 'folk_strum'/'ballad_pick' 지정 시 해당 슬롯 직접 라우팅.
   * 미지정 시 기존 짝/홀수 토글 + 마지막 마디 pickup 동작 유지.
   */
  selectSlot: (tpl, idx, variant) => {
    if (variant === 'folk_strum') return 'folk_strum';
    if (variant === 'ballad_pick') return 'ballad_pick';
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return local % 2 === 0 ? 'picking' : 'strum_8th';
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
```

Expected: PASS (folk_strum 신규 테스트 + 기존 picking/strum_8th/pickup 회귀 테스트도).

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/library/folk.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add folk_strum variant for folk-I-IV-V card

기존 picking/strum_8th 토글을 우회하고 모든 마디에 일관된 down-up 8분 strum
을 갖는 variant 신설. ballad_pick은 후속 task에서 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: folk.ts에 `ballad_pick` variant 신설

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/folk.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts`

`ballad_pick`은 half-time finger-pick: kick 1박만, soft snare 3박, sub16 hat은 첫 박만 살짝.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts`에 추가:

```ts
describe('folk selectSlot — ballad_pick variant', () => {
  it('모든 idx에서 ballad_pick 슬롯 사용', () => {
    const tpl8 = {
      bars: 8,
      default_bpm: 70,
      progression: Array.from({ length: 8 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
    };
    for (const i of [0, 3, 7]) {
      expect(FOLK_RHYTHM.selectSlot(tpl8, i, 'ballad_pick')).toBe('ballad_pick');
    }
  });

  it('ballad_pick은 kick 1박만 (half-time)', () => {
    const kick = FOLK_RHYTHM.patterns.ballad_pick?.drums.kick ?? [];
    expect(kick.length).toBe(1);
    expect(kick[0]?.time).toBe('0:0:0');
  });

  it('ballad_pick snare는 3박 backbeat (half-time 백비트)', () => {
    const snare = FOLK_RHYTHM.patterns.ballad_pick?.drums.snare ?? [];
    expect(snare.length).toBe(1);
    expect(snare[0]?.time).toBe('0:2:0');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
```

Expected: FAIL — `patterns.ballad_pick` undefined.

- [ ] **Step 3: ballad_pick 패턴 추가**

`folk.ts`의 `patterns:` 객체 안 `folk_strum` 다음에 추가:

```ts
    // ballad_pick: half-time finger-pick. kick 1박, snare 3박, hat 부드러운 4분주.
    // ballad-I-V-vi-IV 8bar 카드용. 70bpm 기준 호흡 길게.
    ballad_pick: {
      drums: {
        // half-time: kick 1박만
        kick: [{ time: '0:0:0' }],
        // half-time: snare 3박 backbeat (4박이 아닌 3박)
        snare: [{ time: '0:2:0', velocity: 0.45 }],
        // soft 4분 hat
        hat: [
          { time: '0:0:0', velocity: 0.3 },
          { time: '0:1:0', velocity: 0.3 },
          { time: '0:2:0', velocity: 0.3 },
          { time: '0:3:0', velocity: 0.3 },
        ],
      },
      bass: {
        // 1박 루트, 3박 5도(단순화로 둘 다 루트)
        steps: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
        ],
      },
      // finger-pick: 8분 down 4번 (Travis 단순화). velocity 낮게.
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.35 },
      ],
    },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/library/folk.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/folk.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add ballad_pick variant for ballad-I-V-vi-IV card

half-time finger-pick (kick 1박, snare 3박 backbeat, soft 4분 hat). 70bpm
8bar ballad용.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: rock.ts에 `rock_mixo` variant 신설 + 테스트 파일 신설

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/rock.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts`

`rock_mixo`는 8분 down-pick distortion + 4 on the floor 킥 (Mixolydian 록 정체성).

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts` 신규 생성:

```ts
import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const tpl4 = (default_bpm = 110) => ({
  bars: 4,
  default_bpm,
  progression: Array.from({ length: 4 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('rock selectSlot — rock_mixo variant', () => {
  it('모든 idx에서 rock_mixo 슬롯 사용 (groove/pickup/fill 토글 우회)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 0, 'rock_mixo')).toBe('rock_mixo');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 2, 'rock_mixo')).toBe('rock_mixo');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 3, 'rock_mixo')).toBe('rock_mixo');
  });

  it('rock_mixo 패턴: 4 on the floor 킥', () => {
    const kick = ROCK_RHYTHM.patterns.rock_mixo?.drums.kick ?? [];
    expect(kick.length).toBe(4);
    expect(kick.map((k) => k.time)).toEqual(['0:0:0', '0:1:0', '0:2:0', '0:3:0']);
  });

  it('rock_mixo guitar: 8분 down-pick (8 strums all down)', () => {
    const guitar = ROCK_RHYTHM.patterns.rock_mixo?.guitar ?? [];
    expect(guitar.length).toBe(8);
    expect(guitar.every((g) => g.direction === 'down')).toBe(true);
  });
});

describe('rock selectSlot — 기존 회귀 (variant 미지정)', () => {
  it('4마디 이상: 마지막 → fill_quarter, 끝에서 두 번째 → pickup_eighth', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 3)).toBe('fill_quarter');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 2)).toBe('pickup_eighth');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 0)).toBe('groove');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
```

Expected: FAIL — `rock_mixo` 슬롯 undefined + selectSlot이 variant 무시.

- [ ] **Step 3: rock.ts에 rock_mixo 추가**

`apps/web/lib/audio/backing/patterns/library/rock.ts`의 `patterns:` 객체에 추가:

```ts
    // rock_mixo: 8분 down-pick + 4 on the floor 킥. Mixolydian 록 정체성.
    // rock-I-bVII-IV 카드용. distortion guitar 카테고리 default와 결합.
    rock_mixo: {
      drums: {
        // 4 on the floor: 모든 박에 킥
        kick: [
          { time: '0:0:0' },
          { time: '0:1:0' },
          { time: '0:2:0' },
          { time: '0:3:0' },
        ],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
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
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 8분 down-pick 8회 (rock 정체성)
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'down' },
      ],
    },
```

`selectSlot` 함수 교체:

```ts
  /**
   * variant 'rock_mixo'/'rock_12bar' 지정 시 해당 분기 라우팅.
   * 미지정 시 기존 4마디 이상 fill/pickup 동작 유지.
   */
  selectSlot: (tpl, idx, variant) => {
    if (variant === 'rock_mixo') return 'rock_mixo';
    if (variant === 'rock_12bar') {
      const local = idx % tpl.bars;
      if (local === 8) return 'rock_12bar_tension';
      if (local === 10) return 'rock_12bar_resolve';
      if (local === 11) return 'rock_12bar_turnaround';
      return 'rock_12bar_drive';
    }
    const local = idx % tpl.bars;
    if (tpl.bars >= 4 && local === tpl.bars - 1) return 'fill_quarter';
    if (tpl.bars >= 4 && local === tpl.bars - 2) return 'pickup_eighth';
    return 'groove';
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
```

Expected: PASS — rock_mixo + 회귀 둘 다 통과.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/library/rock.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add rock_mixo variant for rock-I-bVII-IV card

8분 down-pick + 4 on the floor 킥. Mixolydian 록 정체성. selectSlot에
rock_12bar 분기 placeholder도 추가 (다음 task에서 패턴 채움).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: rock.ts에 `rock_12bar` variant 4 슬롯 패턴 신설

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/rock.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts`

Chuck Berry 12bar: drive(기본) + tension(idx=8 V7 빌드업) + resolve(idx=10 안정) + turnaround(idx=11 climax). blues `shuffle12bar` 패턴 구조 참고.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts`에 추가:

```ts
const tpl12 = (default_bpm = 130) => ({
  bars: 12,
  default_bpm,
  progression: Array.from({ length: 12 }, (_, i) => ({ bar: i + 1, chord: 'I7' })),
});

describe('rock selectSlot — rock_12bar variant', () => {
  it('idx 0~7,9 → rock_12bar_drive', () => {
    for (const i of [0, 1, 4, 7, 9]) {
      expect(ROCK_RHYTHM.selectSlot(tpl12(), i, 'rock_12bar')).toBe('rock_12bar_drive');
    }
  });

  it('idx 8 → rock_12bar_tension (V7 빌드업)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 8, 'rock_12bar')).toBe('rock_12bar_tension');
  });

  it('idx 10 → rock_12bar_resolve (I7 안정)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 10, 'rock_12bar')).toBe('rock_12bar_resolve');
  });

  it('idx 11 → rock_12bar_turnaround (V7 climax)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 11, 'rock_12bar')).toBe('rock_12bar_turnaround');
  });

  it('rock_12bar 4 슬롯 모두 정의됨', () => {
    expect(ROCK_RHYTHM.patterns.rock_12bar_drive).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_tension).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_resolve).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_turnaround).toBeDefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
```

Expected: FAIL — 4 슬롯 모두 undefined.

- [ ] **Step 3: rock_12bar 4 슬롯 패턴 추가**

`rock.ts`의 `patterns:` 객체에 `rock_mixo` 다음 추가:

```ts
    // rock_12bar_drive: Chuck Berry 8분 driving — 기본 슬롯
    rock_12bar_drive: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
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
      bass: {
        // Chuck Berry boogie shuffle: 8분 1-3-5-6 alternating (단순화: 4분 1박+3박)
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 8분 down-up alternating (속도 빠름 130bpm)
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'up' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // rock_12bar_tension: 9마디 V7 빌드업 — kick 강세 + snare crescendo
    rock_12bar_tension: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.8 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'up' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // rock_12bar_resolve: 11마디 I7 안정 — drive와 비슷하지만 약간 정돈된 느낌
    rock_12bar_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
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
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
      ],
    },

    // rock_12bar_turnaround: 12마디 V7 climax — 4박 fill로 다음 사이클 진입
    rock_12bar_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:1', velocity: 0.75 },
          { time: '0:3:2', velocity: 0.8 },
          { time: '0:3:3', velocity: 0.9 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // turnaround 마디 기타는 1박만 다운 — 드럼 fill 공간 확보
      guitar: [{ time: '0:0:0', direction: 'down' }],
    },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/library/rock.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/rock.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add rock_12bar 4-slot variant for rock-12-bar card

drive (기본) / tension (idx=8 V7 빌드업) / resolve (idx=10 I7) /
turnaround (idx=11 V7 climax). Chuck Berry 130bpm boogie 8분.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: modal.ts에 `phrygian_dark` variant 신설

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/library/modal.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts`

`phrygian_dark`는 half-time + sub16 ghost snare + dark 정서. distortion guitar 가능성(card-profiles에서 instrument override 결정).

- [ ] **Step 1: 실패 테스트 작성**

기존 `apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts` 끝에 추가 (파일 없으면 신설):

```ts
import { describe, expect, it } from 'vitest';
import { MODAL_RHYTHM } from '@/lib/audio/backing/patterns/library/modal';

const tpl4 = (default_bpm = 100) => ({
  bars: 4,
  default_bpm,
  progression: Array.from({ length: 4 }, (_, i) => ({ bar: i + 1, chord: 'i' })),
});

describe('modal selectSlot — phrygian_dark variant', () => {
  it('모든 idx에서 phrygian_dark 슬롯 사용', () => {
    for (const i of [0, 1, 2, 3]) {
      expect(MODAL_RHYTHM.selectSlot(tpl4(), i, 'phrygian_dark')).toBe('phrygian_dark');
    }
  });

  it('phrygian_dark 패턴 정의됨 (half-time)', () => {
    const pattern = MODAL_RHYTHM.patterns.phrygian_dark;
    expect(pattern).toBeDefined();
    // half-time: kick 1박만
    expect(pattern?.drums.kick.length).toBe(1);
    // half-time: snare 3박
    expect(pattern?.drums.snare.length).toBeGreaterThan(0);
    expect(pattern?.drums.snare[0]?.time).toBe('0:2:0');
  });
});

describe('modal selectSlot — 기존 회귀 (4bar)', () => {
  it('variant 미지정 시 짝/홀수 toggle (4bar 진행에서도 동일)', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 0)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 1)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 2)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 3)).toBe('groove_b');
  });

  it('dorian_groove/lydian_dreamy/mixolydian_driving 분기 유지', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 0, 'dorian_groove')).toBe('dorian_groove');
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 0, 'lydian_dreamy')).toBe('lydian_dreamy');
    expect(MODAL_RHYTHM.selectSlot(tpl4(), 0, 'mixolydian_driving')).toBe('mixolydian_driving');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts
```

Expected: FAIL — `phrygian_dark` 패턴 + selectSlot 분기 없음.

- [ ] **Step 3: phrygian_dark 패턴 추가**

`apps/web/lib/audio/backing/patterns/library/modal.ts`의 `patterns:` 객체에 `mixolydian_driving` 다음에 추가:

```ts
    // phrygian_dark: half-time + sub16 ghost snare. Spanish/exotic 정서.
    // phrygian-vamp 카드용. instrumentOverrides에서 distortion guitar 권장.
    phrygian_dark: {
      drums: {
        // half-time kick 1박만
        kick: [{ time: '0:0:0' }],
        // half-time snare 3박 + 4박-and ghost
        snare: [
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.3 },
        ],
        // sub16 ghost hat 일부만 (어두운 분위기 - sparse)
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.3 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:2:2', velocity: 0.3 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.3 },
        ],
      },
      bass: {
        // 1박 루트, 3박 루트 한 옥타브 위(단순화: 둘 다 동일)
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.7 },
        ],
      },
      // half-time strums: 1박, 3박, 4박-and (Spanish flamenco 느낌)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.65 },
        { time: '0:3:2', direction: 'up', velocity: 0.5 },
      ],
    },
```

`selectSlot` 함수 교체:

```ts
  /**
   * variant가 지정되면 해당 슬롯으로 직접 라우팅.
   * 미지정(undefined) 시 기존 짝/홀수 toggle 동작 유지 — 회귀 없음.
   */
  selectSlot: (_tpl, idx, variant) => {
    switch (variant) {
      case 'dorian_groove':
        return 'dorian_groove';
      case 'lydian_dreamy':
        return 'lydian_dreamy';
      case 'mixolydian_driving':
        return 'mixolydian_driving';
      case 'phrygian_dark':
        return 'phrygian_dark';
      default:
        return idx % 2 === 0 ? 'groove_a' : 'groove_b';
    }
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts
```

Expected: PASS — 신규 + 회귀 모두.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/library/modal.ts \
        apps/web/tests/unit/lib/audio/backing/patterns/modal.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add phrygian_dark variant for phrygian-vamp card

half-time + sub16 ghost snare + Spanish/flamenco strum (1박/3박/4박-and).
distortion guitar 권장(다음 task의 card-profiles에서 instrumentOverrides
설정).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: card-profiles.ts에 신규 5장 등재

**Files:**
- Modify: `apps/web/lib/audio/backing/card-profiles.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts`

각 신규 카드의 variant + tone(reverbWet 등) + instrumentOverrides(필요시) 등재.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts`에 추가 (기존 파일 끝에):

```ts
describe('CARD_PROFILES — Sprint 10 신규 5장', () => {
  it('folk-I-IV-V: rhythmVariant=folk_strum, 카테고리 default tone', () => {
    expect(CARD_PROFILES['folk-I-IV-V']).toEqual({
      rhythmVariant: 'folk_strum',
    });
  });

  it('ballad-I-V-vi-IV: rhythmVariant=ballad_pick, reverbWet 0.30', () => {
    const p = CARD_PROFILES['ballad-I-V-vi-IV'];
    expect(p?.rhythmVariant).toBe('ballad_pick');
    expect(p?.toneProfile?.reverbWet).toBe(0.30);
    expect(p?.toneProfile?.velocityScale).toBe(0.85);
  });

  it('rock-I-bVII-IV: rhythmVariant=rock_mixo, reverbWet 0.10', () => {
    const p = CARD_PROFILES['rock-I-bVII-IV'];
    expect(p?.rhythmVariant).toBe('rock_mixo');
    expect(p?.toneProfile?.reverbWet).toBe(0.10);
  });

  it('rock-12-bar: rhythmVariant=rock_12bar, reverbWet 0.12', () => {
    const p = CARD_PROFILES['rock-12-bar'];
    expect(p?.rhythmVariant).toBe('rock_12bar');
    expect(p?.toneProfile?.reverbWet).toBe(0.12);
  });

  it('phrygian-vamp: rhythmVariant=phrygian_dark, reverbWet 0.25, distortion guitar override', () => {
    const p = CARD_PROFILES['phrygian-vamp'];
    expect(p?.rhythmVariant).toBe('phrygian_dark');
    expect(p?.toneProfile?.reverbWet).toBe(0.25);
    expect(p?.instrumentOverrides?.guitar?.instrument).toBe('distortion_guitar');
  });
});

describe('__assertCardProfilesMatch — Sprint 10 22 슬러그 정합성', () => {
  it('22 슬러그 카탈로그와 정합성 매치', () => {
    const catalogSlugs = [
      // Sprint 9 17장
      '12-bar-blues-major', '12-bar-blues-minor', '12-bar-blues-quick-change',
      'pop-I-V-vi-IV', '50s-I-vi-IV-V',
      'jazz-ii-V-I',
      'minor-i-VI-III-VII',
      'dorian-vamp', 'lydian-vamp', 'mixolydian-vamp',
      'slow-minor-blues', 'hard-bop-minor-blues', 'shuffle-minor-blues',
      'jazz-major-blues', 'jump-blues',
      'funk-i7-vamp',
      'bossa-i-iv-ii-v',
      // Sprint 10 신규 5장
      'folk-I-IV-V', 'ballad-I-V-vi-IV',
      'rock-I-bVII-IV', 'rock-12-bar',
      'phrygian-vamp',
    ];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    __assertCardProfilesMatch(catalogSlugs);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

테스트 파일 상단 import에 `vi` 추가 필요시 갱신:

```ts
import { describe, expect, it, vi } from 'vitest';
import { CARD_PROFILES, __assertCardProfilesMatch } from '@/lib/audio/backing/card-profiles';
```

- [ ] **Step 2: 테스트 실패 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
```

Expected: FAIL — 5장 모두 CARD_PROFILES에 없음.

- [ ] **Step 3: card-profiles.ts에 5장 등재**

`apps/web/lib/audio/backing/card-profiles.ts`의 `CARD_PROFILES` 객체 끝(modal 3장 다음)에 추가:

```ts

  // ── Sprint 10 신규 5장 ────────────────────────────────────────────
  // folk acoustic strum staple.
  'folk-I-IV-V': {
    rhythmVariant: 'folk_strum',
  },
  // half-time finger-pick ballad. acoustic_guitar_steel(folk default) 그대로.
  'ballad-I-V-vi-IV': {
    rhythmVariant: 'ballad_pick',
    toneProfile: {
      velocityScale: 0.85,
      reverbWet: 0.30,
    },
  },
  // Mixolydian rock — distortion guitar(rock default) + dry.
  'rock-I-bVII-IV': {
    rhythmVariant: 'rock_mixo',
    toneProfile: {
      reverbWet: 0.10,
    },
  },
  // Chuck Berry 12bar boogie — driving 8분, dry.
  'rock-12-bar': {
    rhythmVariant: 'rock_12bar',
    toneProfile: {
      reverbWet: 0.12,
    },
  },
  // Spanish/exotic phrygian. modal default가 clean이라 distortion 명시 override.
  'phrygian-vamp': {
    rhythmVariant: 'phrygian_dark',
    toneProfile: {
      reverbWet: 0.25,
    },
    instrumentOverrides: {
      guitar: { instrument: 'distortion_guitar', octaveShift: -1 },
    },
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run:
```bash
pnpm test apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/audio/backing/card-profiles.ts \
        apps/web/tests/unit/lib/audio/backing/card-profiles.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): register 5 new cards in CARD_PROFILES

folk-I-IV-V (default), ballad-I-V-vi-IV (reverbWet 0.30 dreamy),
rock-I-bVII-IV (reverbWet 0.10 dry), rock-12-bar (reverbWet 0.12 dry),
phrygian-vamp (distortion guitar override + reverbWet 0.25).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: seed.py에 신규 5장 INSERT용 dict 추가

**Files:**
- Modify: `apps/api/app/scripts/seed.py`

idempotent seed가 신규 5장만 INSERT 처리. modal 3장 UPDATE는 다음 task의 alembic data migration이 단독 처리.

- [ ] **Step 1: seed.py에 5장 dict 추가**

`apps/api/app/scripts/seed.py`의 `SEED_TEMPLATES` 리스트 끝(`bossa-i-iv-ii-v` 다음)에 추가:

```python
    # ── Sprint 10 신규 5장 ────────────────────────────
    # folk acoustic 3-chord staple
    {
        "slug": "folk-I-IV-V",
        "name": "Folk I–IV–V",
        "category": "folk",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 95,
        "recommended_scales": ["major", "major_pentatonic", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I"},
            {"bar": 2, "chord": "IV"},
            {"bar": 3, "chord": "V"},
            {"bar": 4, "chord": "I"},
        ],
    },
    # half-time finger-pick ballad
    {
        "slug": "ballad-I-V-vi-IV",
        "name": "Ballad I–V–vi–IV (8-bar)",
        "category": "folk",
        "bars": 8,
        "time_signature": "4/4",
        "default_bpm": 70,
        "recommended_scales": ["major", "major_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "I"},
            {"bar": 2, "chord": "V"},
            {"bar": 3, "chord": "vi"},
            {"bar": 4, "chord": "IV"},
            {"bar": 5, "chord": "I"},
            {"bar": 6, "chord": "V"},
            {"bar": 7, "chord": "IV"},
            {"bar": 8, "chord": "V"},
        ],
    },
    # Mixolydian rock vamp
    {
        "slug": "rock-I-bVII-IV",
        "name": "Rock I–bVII–IV (Mixolydian)",
        "category": "rock",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 110,
        "recommended_scales": ["mixolydian", "major_pentatonic", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "I"},
            {"bar": 2, "chord": "bVII"},
            {"bar": 3, "chord": "IV"},
            {"bar": 4, "chord": "I"},
        ],
    },
    # Chuck Berry 12-bar boogie
    {
        "slug": "rock-12-bar",
        "name": "Rock 12-Bar (Chuck Berry)",
        "category": "rock",
        "bars": 12,
        "time_signature": "4/4",
        "default_bpm": 130,
        "recommended_scales": ["major_pentatonic", "minor_pentatonic", "mixolydian"],
        "progression": [
            {"bar": 1, "chord": "I7"},
            {"bar": 2, "chord": "I7"},
            {"bar": 3, "chord": "I7"},
            {"bar": 4, "chord": "I7"},
            {"bar": 5, "chord": "IV7"},
            {"bar": 6, "chord": "IV7"},
            {"bar": 7, "chord": "I7"},
            {"bar": 8, "chord": "I7"},
            {"bar": 9, "chord": "V7"},
            {"bar": 10, "chord": "IV7"},
            {"bar": 11, "chord": "I7"},
            {"bar": 12, "chord": "V7"},
        ],
    },
    # Phrygian Spanish vamp
    {
        "slug": "phrygian-vamp",
        "name": "Phrygian Vamp (Spanish)",
        "category": "modal",
        "bars": 4,
        "time_signature": "4/4",
        "default_bpm": 100,
        "recommended_scales": ["phrygian", "phrygian_dominant", "minor_pentatonic"],
        "progression": [
            {"bar": 1, "chord": "i"},
            {"bar": 2, "chord": "bII"},
            {"bar": 3, "chord": "i"},
            {"bar": 4, "chord": "bII"},
        ],
    },
```

- [ ] **Step 2: 시드 로컬 테스트**

Docker compose의 postgres가 떠 있으면:

```bash
docker compose up -d postgres
cd apps/api && uv run alembic upgrade head
cd apps/api && uv run python -m app.scripts.seed
```

Expected: 신규 5장 INSERT 성공, 기존 17장은 skip 메시지.

검증:
```bash
docker compose exec postgres psql -U app -d app -c \
  "SELECT slug, bars, default_bpm FROM progression_templates WHERE slug IN ('folk-I-IV-V', 'ballad-I-V-vi-IV', 'rock-I-bVII-IV', 'rock-12-bar', 'phrygian-vamp');"
```

Expected: 5 rows.

- [ ] **Step 3: 커밋**

```bash
git add apps/api/app/scripts/seed.py
git commit -m "$(cat <<'EOF'
feat(api): seed 5 new progression templates for Sprint 10

folk-I-IV-V (4bar 95bpm), ballad-I-V-vi-IV (8bar 70bpm),
rock-I-bVII-IV (4bar 110bpm Mixolydian), rock-12-bar (12bar 130bpm
Chuck Berry), phrygian-vamp (4bar 100bpm Spanish).

Idempotent — 기존 17장은 skip. modal 3장 마디수 변경은 별도 alembic data
migration이 처리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: alembic data migration 신설 (modal 3장 2bar→4bar UPDATE)

**Files:**
- Create: `apps/api/alembic/versions/<auto_revid>_sprint10_modal_4bar.py`
- Test: `apps/api/tests/test_alembic_sprint10_migration.py`

idempotent seed는 "이미 있으면 skip"이라 modal 3장의 bars/progression 변경을 처리할 수 없음. 별도 data migration revision으로 row UPDATE.

- [ ] **Step 1: 테스트 파일 작성 (먼저)**

`apps/api/tests/test_alembic_sprint10_migration.py` 신규 생성:

```python
"""Sprint 10 modal 4bar migration 양방향 검증.

upgrade 후 dorian-vamp/lydian-vamp/mixolydian-vamp의 bars=4 + progression
길이 4를 확인. downgrade 후 bars=2 + 길이 2 회귀.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.progression_template import ProgressionTemplate

MODAL_SLUGS = ["dorian-vamp", "lydian-vamp", "mixolydian-vamp"]


@pytest.mark.asyncio
async def test_modal_3장_after_upgrade_bars_4(db_session: AsyncSession):
    """upgrade head 후 modal 3장 모두 bars=4."""
    result = await db_session.execute(
        select(ProgressionTemplate).where(ProgressionTemplate.slug.in_(MODAL_SLUGS))
    )
    rows = result.scalars().all()
    assert len(rows) == 3
    for row in rows:
        assert row.bars == 4, f"{row.slug}: bars={row.bars}, expected 4"
        assert len(row.progression) == 4, f"{row.slug}: progression len={len(row.progression)}, expected 4"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run:
```bash
cd apps/api && uv run pytest tests/test_alembic_sprint10_migration.py -v
```

Expected: FAIL — modal 3장 bars=2 (마이그레이션 미적용).

- [ ] **Step 3: alembic revision 생성 + data migration 작성**

```bash
cd apps/api && uv run alembic revision -m "sprint10_modal_4bar_progression"
```

생성된 파일(`apps/api/alembic/versions/<rev>_sprint10_modal_4bar_progression.py`)을 다음 내용으로 교체:

```python
"""sprint10_modal_4bar_progression

modal 3장(dorian-vamp/lydian-vamp/mixolydian-vamp) 마디수를 2 → 4로 늘리고
progression JSON도 4마디 진행으로 갱신. Sprint 10 Card domain audit.

Revision ID: <auto_filled>
Revises: 9e66e712dd72
Create Date: 2026-04-26
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '<auto_filled>'  # alembic이 채움
down_revision: Union[str, Sequence[str], None] = '9e66e712dd72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# upgrade 후 진행
NEW_PROGRESSIONS = {
    'dorian-vamp': [
        {"bar": 1, "chord": "i"},
        {"bar": 2, "chord": "IV"},
        {"bar": 3, "chord": "i"},
        {"bar": 4, "chord": "bVII"},
    ],
    'lydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "II"},
        {"bar": 3, "chord": "I"},
        {"bar": 4, "chord": "II"},
    ],
    'mixolydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "bVII"},
        {"bar": 3, "chord": "I"},
        {"bar": 4, "chord": "bVII"},
    ],
}

# downgrade 시 회귀 진행 (Sprint 9까지의 2bar)
OLD_PROGRESSIONS = {
    'dorian-vamp': [
        {"bar": 1, "chord": "i"},
        {"bar": 2, "chord": "IV"},
    ],
    'lydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "II"},
    ],
    'mixolydian-vamp': [
        {"bar": 1, "chord": "I"},
        {"bar": 2, "chord": "bVII"},
    ],
}


def upgrade() -> None:
    """modal 3장 bars=2 → 4, progression 4마디로 갱신."""
    import json
    for slug, progression in NEW_PROGRESSIONS.items():
        op.execute(
            f"""
            UPDATE progression_templates
            SET bars = 4,
                progression = '{json.dumps(progression)}'::jsonb
            WHERE slug = '{slug}';
            """
        )


def downgrade() -> None:
    """modal 3장 bars=4 → 2 회귀."""
    import json
    for slug, progression in OLD_PROGRESSIONS.items():
        op.execute(
            f"""
            UPDATE progression_templates
            SET bars = 2,
                progression = '{json.dumps(progression)}'::jsonb
            WHERE slug = '{slug}';
            """
        )
```

`<auto_filled>`는 alembic revision 명령이 생성한 hex 값으로 교체 (예: `a1b2c3d4e5f6`).

- [ ] **Step 4: 마이그레이션 실행 + 테스트 통과 확인**

Run:
```bash
cd apps/api && uv run alembic upgrade head
cd apps/api && uv run pytest tests/test_alembic_sprint10_migration.py -v
```

Expected: 마이그레이션 OK, 테스트 PASS.

- [ ] **Step 5: downgrade 검증**

Run:
```bash
cd apps/api && uv run alembic downgrade -1
docker compose exec postgres psql -U app -d app -c \
  "SELECT slug, bars FROM progression_templates WHERE slug IN ('dorian-vamp', 'lydian-vamp', 'mixolydian-vamp');"
```

Expected: 3장 bars=2 회귀.

복원:
```bash
cd apps/api && uv run alembic upgrade head
```

- [ ] **Step 6: 커밋**

```bash
git add apps/api/alembic/versions/*_sprint10_modal_4bar_progression.py \
        apps/api/tests/test_alembic_sprint10_migration.py
git commit -m "$(cat <<'EOF'
feat(db): alembic data migration for modal 3장 2bar → 4bar

dorian-vamp/lydian-vamp/mixolydian-vamp의 bars=2를 4로 늘리고
progression도 4마디로 갱신. dorian만 i-IV-i-bVII로 변주, lydian/mixo
는 단순 반복 유지(신규 rock-I-bVII-IV와 차별화).

Idempotent seed가 처리 못하는 row UPDATE를 alembic이 단발 처리.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 프론트엔드 OpenAPI 타입 갱신

**Files:**
- Auto-generate: `apps/web/lib/api/generated.ts`

신규 카드 카탈로그 응답 schema는 변경 없지만(필드 추가 없음), 안전을 위해 재생성.

- [ ] **Step 1: 타입 생성**

Run:
```bash
docker compose up -d api  # FastAPI 기동
pnpm --filter @my-music-app/web types:api
```

Expected: `apps/web/lib/api/generated.ts` 변경 없거나 minor diff.

- [ ] **Step 2: typecheck 통과 확인**

Run:
```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: 변경사항 있으면 커밋**

```bash
# diff가 있다면:
git add apps/web/lib/api/generated.ts
git commit -m "$(cat <<'EOF'
chore(deps): regenerate OpenAPI types after Sprint 10 catalog seed

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(diff 없으면 커밋 skip.)

---

### Task 11: 통합 검증 + dev 청취

**Files:**
- 없음 (검증 only)

- [ ] **Step 1: 전체 typecheck/lint/test 통과**

Run:
```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: 모두 PASS.

- [ ] **Step 2: API 테스트 통과**

Run:
```bash
cd apps/api && uv run pytest
```

Expected: PASS.

- [ ] **Step 3: dev 서버 청취**

Run:
```bash
docker compose up -d postgres api
pnpm dev
```

브라우저에서 `localhost:3000` (또는 3001) 접속. 카탈로그에서 신규 5장 노출 확인:
- folk-I-IV-V (4bar 95bpm)
- ballad-I-V-vi-IV (8bar 70bpm)
- rock-I-bVII-IV (4bar 110bpm)
- rock-12-bar (12bar 130bpm)
- phrygian-vamp (4bar 100bpm)

각 카드 ▶ → 도메인 적합성 청취 (변주가 자연스러운가? 음원이 깨지지 않는가?). modal 4장(dorian/lydian/mixolydian/phrygian)도 4bar 새 진행 청취.

- [ ] **Step 4: 사용자 OK 확인**

사용자에게 "PR-A 청취 결과 OK?" 확인. 문제 발견 시 해당 task로 돌아가서 수정.

OK 시 PR 생성 + 머지 (사용자가 별도 머지 권한 행사).

---

## PR-B: blues 8장 도메인 재청취 검수 (Listening Audit Workflow)

**대상 카드:** 12-bar-blues-major / 12-bar-blues-minor / 12-bar-blues-quick-change / slow-minor-blues / hard-bop-minor-blues / shuffle-minor-blues / jazz-major-blues / jump-blues

**Workflow (사용자 피드백 기반 사이클):**

- [ ] **Step 1: 청취 가이드 제공**

각 카드를 동일 키(예: A 또는 E)·기본 BPM에서 약 30초 ~ 1분간 청취. 카드 간 비교가 핵심.

- [ ] **Step 2: 사용자 피드백 수집**

사용자가 카드별로 자유 형식 피드백:
- "X 카드 Y 마디가 어색하다"
- "Z 부분 더 비어 있으면 좋겠다"
- "A와 B의 차별화가 약하다"

- [ ] **Step 3: 변경 적용 (피드백별)**

변경 범위 한정:
- `apps/web/lib/audio/backing/patterns/library/blues.ts` — variant·패턴 수정
- `apps/web/lib/audio/backing/card-profiles.ts` — tone·variant 변경

수정 시 단위 테스트(`apps/web/tests/unit/lib/audio/backing/patterns/library/blues.test.ts` 등) 갱신.

- [ ] **Step 4: 재청취 → OK까지 반복**

사용자 OK 시 PR 머지.

**완료 조건:**
- 사용자 청취 OK
- `pnpm typecheck`/`pnpm lint`/`pnpm test` 통과
- 단위 테스트 갱신 (selectSlot 분기, card-profiles 머지 결과)

---

## PR-C: modal 4장 검수 (Listening Audit Workflow)

**대상 카드:** dorian-vamp / lydian-vamp / mixolydian-vamp / phrygian-vamp (모두 4bar 새 진행)

**중점 검토:**
- 4bar로 늘려서 호흡이 충분한가? 너무 단조롭게 들리는 카드는 8bar로 추가 확장 검토(이 PR 범위 내 처리)
- 신규 phrygian-vamp가 다른 modal 3장과 차별화되는가? distortion guitar override가 적절한가?

**Workflow:**

- [ ] **Step 1~4: PR-B와 동일 사이클**

추가 마디수 조정이 필요하면 이 PR에서 alembic data migration 추가 가능.

**완료 조건:** PR-B와 동일.

---

## PR-D: 10장 묶음 검수 (Listening Audit Workflow)

**대상 카드:** pop-I-V-vi-IV / 50s-I-vi-IV-V / jazz-ii-V-I / minor-i-VI-III-VII / funk-i7-vamp / bossa-i-iv-ii-v / folk-I-IV-V / ballad-I-V-vi-IV / rock-I-bVII-IV / rock-12-bar

**중점 검토:**
- 카테고리 정체성 (특히 신규 folk/rock 4장)
- 기존 6장 (Sprint 9에서 "굳" OK한 것들)도 일관된 기준에서 균형 재조정
- folk-I-IV-V vs ballad-I-V-vi-IV vs rock-I-bVII-IV 사이 톤 차별화

**Workflow:**

- [ ] **Step 1~4: PR-B와 동일 사이클** (10장 묶음이라 한 세션에 비교 청취)

**완료 조건:** PR-B와 동일.

---

## 검수 PR 변경 범위 한정 정책

PR-B/C/D 검수 PR은 **해당 카드/카테고리 변경만** 포함:
- `patterns/library/<cat>.ts` — variant·패턴
- `card-profiles.ts` — tone·variant·instrumentOverrides
- 마디수 변경 시 `seed.py` + alembic data migration revision

다른 카테고리 사이드 변경은 별 PR로 (검수 PR 범위 fragmentation 방지).

---

## 카테고리 default tone/instrument 변경 기준

만약 청취 검수 중 *카테고리 default 자체*가 도메인과 안 맞다고 판단되면(예: rock 카테고리 default reverbWet이 너무 wet):

1. `apps/web/lib/audio/backing/presets.ts`의 `CATEGORY_TONE_DEFAULTS` 또는 `CATEGORY_BUNDLES` 수정
2. 같은 카테고리의 다른 카드도 영향 받음 → 그 카드들도 같은 PR에서 청취 OK 받아야 머지

이 경우 PR 범위가 카테고리 전체로 확대됨. 청취 부담 고려해 카드별 override(`instrumentOverrides`/`toneProfile`)로 처리할 수 있으면 그쪽 우선.

---

## 후속 (Sprint 11+)

- 새 카테고리 신설 (reggae, country, gospel)
- jazz 32bar rhythm changes
- smplr Sampler + 외부 CC0 acoustic drum 샘플 (folk/jazz brush 복원)
- voice별 EQ, humanize
- random comping fills (Art Blakey 스타일)
