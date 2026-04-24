# Sprint 2-2 Backing Track PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/jam` 카탈로그의 각 progression 카드에 ▶/⏹ 버튼을 붙여, 선택된 Key 기준으로 Tone.js Transport가 BPM·마디 단위로 블록 코드를 루프 재생한다.

**Architecture:** 순수 함수 레이어(`chord-voicing.ts`) → Tone 바인딩 싱글턴(`tone-bridge.ts`) → Engine 상태 머신(`backing-track.ts`) → Zustand backing 슬라이스 → Client UI(`ProgressionPlayButton`, `KeySelector`). 모든 레이어는 상위 레이어만 의존. Tone.js 전체가 `tone-bridge`만을 통해 드나들어 테스트에서 한 방 모킹.

**Tech Stack:** Next.js 15 App Router · TypeScript (strict) · Tone.js 15.x · Zustand (immer + persist) · Tailwind v4 · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-24-sprint-2-2-backing-track-poc-design.md`

---

## File Structure

| Path | Role |
|---|---|
| `apps/web/lib/theory/chord-voicing.ts` (new) | pitch class → MIDI voicing, MIDI → Hz. 순수. Tone 무의존 |
| `apps/web/tests/unit/lib/theory/chord-voicing.test.ts` (new) | chord-voicing 단위 테스트 |
| `apps/web/lib/audio/tone-bridge.ts` (new) | Tone 모듈 import · 공유 AudioContext 바인딩. 유일한 `import 'tone'` 지점 |
| `apps/web/lib/audio/backing-track.ts` (new) | Engine state machine: start/stop/subscribe + Transport scheduleRepeat 드라이버 |
| `apps/web/tests/unit/lib/audio/backing-track.test.ts` (new) | Engine 단위 테스트 (Tone 전체 모킹) |
| `apps/web/lib/store/app-store.ts` (modify) | 4번째 슬라이스 `backing` 추가. persist v5→v6 migrate + merge 확장 |
| `apps/web/components/jam/KeySelector.tsx` (new, Client) | 12 키 드롭다운 |
| `apps/web/components/jam/ProgressionPlayButton.tsx` (new, Client) | ▶/⏹ + 현재 코드 표시 |
| `apps/web/components/jam/ProgressionCatalogClient.tsx` (new, Client) | Key selector + 카드 그리드 렌더. catalog 그룹화 로직 이관 |
| `apps/web/components/jam/ProgressionCatalog.tsx` (modify) | Server 페치만 유지, client에 위임 |
| `apps/web/tests/component/ProgressionPlayButton.test.tsx` (new) | 버튼 클릭·라벨 전환 스모크 |
| `apps/web/package.json` (modify) | `tone@^15` 추가 |

---

## Task 1: Add Tone.js dependency

**Files:**
- Modify: `apps/web/package.json` (dependencies 섹션)

- [ ] **Step 1: Check current tone install status**

Run: `pnpm --filter @my-music-app/web list tone 2>&1 || true`
Expected: empty output (tone not installed)

- [ ] **Step 2: Install tone**

Run from repo root:
```bash
pnpm --filter @my-music-app/web add tone@^15
```

Expected: `tone` added to `apps/web/package.json` dependencies, `pnpm-lock.yaml` updated.

- [ ] **Step 3: Verify install**

Run: `pnpm --filter @my-music-app/web list tone`
Expected: tone 버전 15.x 표시

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(deps): add tone 15.x for backing track engine

Sprint 2-2 PoC의 Tone.Transport + Tone.PolySynth 사용 목적. 추후 모듈에서는
lib/audio/tone-bridge.ts 경유로만 import해서 번들 경계 명확히 유지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `chord-voicing.ts` — 순수 함수 (TDD)

**Files:**
- Create: `apps/web/lib/theory/chord-voicing.ts`
- Test: `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`

- [ ] **Step 1: Write failing test file**

Create `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OCTAVE,
  chordSymbolToMidi,
  midiToFrequency,
  voicingToMidi,
} from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

describe('voicingToMidi', () => {
  it('C major [0,4,7] at octave 4 → [60,64,67]', () => {
    expect(voicingToMidi([0, 4, 7], 4)).toEqual([60, 64, 67]);
  });

  it('A minor [9,0,4] stacks above root (A4=69)', () => {
    // A4=69, C는 다음 옥타브 C5=72, E는 E5=76
    expect(voicingToMidi([9, 0, 4], 4)).toEqual([69, 72, 76]);
  });

  it('B diminished [11,2,5] wraps D and F above B4=71', () => {
    expect(voicingToMidi([11, 2, 5], 4)).toEqual([71, 74, 77]);
  });

  it('uses DEFAULT_OCTAVE when octave omitted', () => {
    expect(voicingToMidi([0, 4, 7])).toEqual(
      voicingToMidi([0, 4, 7], DEFAULT_OCTAVE),
    );
  });

  it('empty voicing returns empty array', () => {
    expect(voicingToMidi([])).toEqual([]);
  });
});

describe('chordSymbolToMidi', () => {
  it('I in C → [60,64,67]', () => {
    expect(chordSymbolToMidi('I', 0 as PitchClass, 4)).toEqual([60, 64, 67]);
  });

  it('V7 in C → [67,71,74,77] (G4, B4, D5, F5)', () => {
    expect(chordSymbolToMidi('V7', 0 as PitchClass, 4)).toEqual([
      67, 71, 74, 77,
    ]);
  });

  it('vi in C → [69,72,76] (A4, C5, E5)', () => {
    expect(chordSymbolToMidi('vi', 0 as PitchClass, 4)).toEqual([69, 72, 76]);
  });

  it('I transposed to key A (root=9) → [69,73,76]', () => {
    // A major triad: A=69, C#=73, E=76
    expect(chordSymbolToMidi('I', 9 as PitchClass, 4)).toEqual([69, 73, 76]);
  });

  it('returns null for unparseable symbol', () => {
    expect(chordSymbolToMidi('bVII', 0 as PitchClass, 4)).toBeNull();
    expect(chordSymbolToMidi('garbage', 0 as PitchClass, 4)).toBeNull();
  });
});

describe('midiToFrequency', () => {
  it('A4 (MIDI 69) === 440 Hz', () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it('C4 (MIDI 60) ≈ 261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it('A5 (MIDI 81) === 880 Hz', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 5);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm --filter @my-music-app/web test tests/unit/lib/theory/chord-voicing.test.ts`
Expected: FAIL with module not found (`Cannot find module '@/lib/theory/chord-voicing'`)

- [ ] **Step 3: Implement chord-voicing.ts**

Create `apps/web/lib/theory/chord-voicing.ts`:

```typescript
/**
 * 코드 보이싱 → MIDI 변환 순수 함수.
 *
 * 배킹 엔진이 `chordPitchClasses(symbol, keyRoot)`로 얻은 pitch class 배열을
 * 실제 연주할 MIDI 번호로 펼칠 때 사용.
 *
 * MIDI 규약: C4=60, A4=69 (modern standard, MIDI = 12*(octave+1) + pc)
 *
 * Voicing 규칙 (PoC):
 *   - 첫 pc를 root로 해석, `rootOctave` 옥타브에 배치.
 *   - 이후 pc는 항상 직전 음보다 위에 배치 (stacked voicing).
 *     → 코드 톤이 root 아래로 내려가지 않아 "코드" 느낌이 또렷.
 *   - 옥타브 wrap은 12의 배수를 더해 해결.
 *
 * Tone 무의존 — 순수 함수. Vitest 100% 커버리지 타겟.
 */

import { chordPitchClasses } from './chords';
import type { PitchClass } from './types';

/** MIDI 노트 번호 변환 기준 옥타브. C4=60이 되는 옥타브. */
export const DEFAULT_OCTAVE = 4;

/**
 * pitch class 배열 → MIDI 번호 배열.
 * 첫 원소가 root, 나머지는 root 위로 stacked.
 */
export function voicingToMidi(
  pitchClasses: readonly PitchClass[],
  rootOctave: number = DEFAULT_OCTAVE,
): number[] {
  if (pitchClasses.length === 0) return [];

  const rootPc = pitchClasses[0]!;
  const rootMidi = 12 * (rootOctave + 1) + rootPc;

  const result: number[] = [rootMidi];
  let prev = rootMidi;

  for (let i = 1; i < pitchClasses.length; i++) {
    const pc = pitchClasses[i]!;
    // 동일 옥타브의 후보부터 시작 — prev보다 크지 않으면 옥타브를 올림
    let candidate = 12 * (rootOctave + 1) + pc;
    while (candidate <= prev) candidate += 12;
    result.push(candidate);
    prev = candidate;
  }

  return result;
}

/**
 * 로마 숫자 심볼 → MIDI. 파싱 실패 시 null.
 * Engine이 "파싱 실패 바는 소리 스킵" 분기를 할 수 있게 null을 유지.
 */
export function chordSymbolToMidi(
  symbol: string,
  keyRoot: PitchClass,
  rootOctave: number = DEFAULT_OCTAVE,
): number[] | null {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (pcs === null) return null;
  return voicingToMidi(pcs, rootOctave);
}

/**
 * MIDI 노트 번호 → 주파수(Hz).
 * Tone.Frequency를 쓰지 않는 이유: 테스트에서 Tone 전체 모킹 시
 * 이 함수가 여전히 독립적으로 동작해야 하므로.
 */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm --filter @my-music-app/web test tests/unit/lib/theory/chord-voicing.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Run typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: both clean

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/theory/chord-voicing.ts apps/web/tests/unit/lib/theory/chord-voicing.test.ts
git commit -m "$(cat <<'EOF'
feat(theory): add chord-voicing pure helpers

Backing engine이 chordPitchClasses 결과를 실제 MIDI 번호·주파수로 펼칠 때
사용할 순수 함수 3개. Tone 무의존 → Tone 모킹 테스트에서도 독립 동작.

voicingToMidi는 stacked voicing: 첫 pc를 root로, 이후 pc는 직전 음보다 위로
옥타브 올려 배치. 파싱 실패(chordPitchClasses null)는 chordSymbolToMidi가
null로 전달해 엔진이 바 스킵 분기 가능.

MIDI 규약은 C4=60, A4=69 (modern standard).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `tone-bridge.ts` — Tone 바인딩 싱글턴

**Files:**
- Create: `apps/web/lib/audio/tone-bridge.ts`

테스트 대상이 아니라 TDD 생략. Task 4의 엔진 테스트에서 이 모듈을 모킹.

- [ ] **Step 1: Create tone-bridge.ts**

Create `apps/web/lib/audio/tone-bridge.ts`:

```typescript
/**
 * Tone.js ↔ 공유 AudioContext 브릿지.
 *
 * 왜 이 파일만 Tone을 직접 import하는가:
 *   1. 단일 import 지점 — 번들 사이즈·트리 셰이킹 감시가 쉬움.
 *   2. 테스트에서 `vi.mock('@/lib/audio/tone-bridge')` 한 방으로 교체.
 *   3. Tone.setContext 호출이 한 곳에서만 일어나 "AudioContext 1개 원칙"을 강제.
 *
 * 공유 원칙:
 *   Tone.Transport와 메트로놈 스케줄러는 반드시 동일 AudioContext를 써야 한다
 *   (planning.md §3.3, §4.2). 이 모듈이 `bindToneToSharedContext`로 1회 바인딩.
 */

import * as Tone from 'tone';

import { getAudioContext } from './context';

let _bound = false;

/**
 * Tone을 공유 AudioContext에 바인딩한다. 최초 1회만 실제 setContext 수행.
 * 유저 제스처 이후에 호출해야 AudioContext가 running 상태로 결합된다.
 */
export function bindToneToSharedContext(): void {
  if (_bound) return;
  Tone.setContext(getAudioContext());
  _bound = true;
}

/** 바인딩 상태 조회 — 테스트·디버깅용. */
export function isToneBound(): boolean {
  return _bound;
}

/**
 * Tone 네임스페이스 getter.
 * 직접 import 대신 이 함수로 얻어와야 테스트에서 모킹이 가능하다.
 */
export function getTone(): typeof Tone {
  return Tone;
}

/** 테스트·HMR 정리용. 운영 중 호출하지 않는다. */
export function __resetToneBridgeForTests(): void {
  _bound = false;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @my-music-app/web typecheck`
Expected: clean

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @my-music-app/web lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/audio/tone-bridge.ts
git commit -m "$(cat <<'EOF'
feat(audio): add tone-bridge for shared AudioContext binding

앱 전체에서 Tone을 직접 import하는 유일한 지점. 나머지 모듈은 getTone()
경유 → vi.mock으로 한 방 교체 가능. Tone.setContext(getAudioContext())를
1회만 수행해 메트로놈과 Transport가 동일 클록을 공유하도록 강제.

bindToneToSharedContext는 유저 제스처 이후(backing-track.start 내부)에만
호출. AudioContext 1개 원칙 유지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `backing-track.ts` — Engine 상태 머신 (TDD)

**Files:**
- Create: `apps/web/lib/audio/backing-track.ts`
- Test: `apps/web/tests/unit/lib/audio/backing-track.test.ts`

- [ ] **Step 1: Write failing test file**

Create `apps/web/tests/unit/lib/audio/backing-track.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// tone-bridge를 전체 모킹 — 실제 Tone 로드 안 함
vi.mock('@/lib/audio/tone-bridge', () => {
  const scheduledCallbacks: Array<(time: number) => void> = [];
  const transportMock = {
    bpm: { value: 0 },
    timeSignature: [4, 4] as [number, number],
    scheduleRepeat: vi.fn((cb: (time: number) => void) => {
      scheduledCallbacks.push(cb);
      return scheduledCallbacks.length; // fake id
    }),
    clear: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  };
  const polySynthInstance = {
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn(),
  };
  const PolySynthCtor = vi.fn(() => polySynthInstance);
  const toneMock = {
    Transport: transportMock,
    PolySynth: PolySynthCtor,
    setContext: vi.fn(),
  };

  return {
    getTone: () => toneMock,
    bindToneToSharedContext: vi.fn(),
    isToneBound: () => true,
    __resetToneBridgeForTests: vi.fn(),
    // 테스트가 접근할 수 있도록 export
    __scheduledCallbacks: scheduledCallbacks,
    __toneMock: toneMock,
    __polySynthInstance: polySynthInstance,
  };
});

// context.ts의 resumeAudioContext는 실제 호출 불가 (jsdom) — 모킹
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => ({}) as AudioContext),
  resumeAudioContext: vi.fn(async () => ({}) as AudioContext),
  hasAudioContext: vi.fn(() => true),
  closeAudioContext: vi.fn(),
}));

import {
  __disposeBackingEngineForTests,
  getBackingEngine,
} from '@/lib/audio/backing-track';
import type { PitchClass } from '@/lib/theory/types';

// 테스트 픽스처: 시드의 12-bar blues major 축약판
const TEMPLATE = {
  slug: 'test-12-bar',
  name: '12-Bar Blues (Major)',
  category: 'blues' as const,
  bars: 4,
  default_bpm: 90,
  progression: [
    { bar: 1, chord: 'I7' },
    { bar: 2, chord: 'IV7' },
    { bar: 3, chord: 'V7' },
    { bar: 4, chord: 'bVII' }, // 파싱 실패 케이스
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
};

// tone-bridge 모킹 내부 상태 가져오기
async function getMockInternals() {
  const mod = await import('@/lib/audio/tone-bridge');
  return mod as unknown as {
    __scheduledCallbacks: Array<(time: number) => void>;
    __toneMock: {
      Transport: {
        bpm: { value: number };
        scheduleRepeat: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
      };
      PolySynth: ReturnType<typeof vi.fn>;
    };
    __polySynthInstance: {
      toDestination: ReturnType<typeof vi.fn>;
      triggerAttackRelease: ReturnType<typeof vi.fn>;
      releaseAll: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    };
  };
}

beforeEach(async () => {
  __disposeBackingEngineForTests();
  const { __scheduledCallbacks, __toneMock, __polySynthInstance } =
    await getMockInternals();
  __scheduledCallbacks.length = 0;
  __toneMock.Transport.bpm.value = 0;
  __toneMock.Transport.scheduleRepeat.mockClear();
  __toneMock.Transport.clear.mockClear();
  __toneMock.Transport.start.mockClear();
  __toneMock.Transport.stop.mockClear();
  __toneMock.Transport.cancel.mockClear();
  __polySynthInstance.triggerAttackRelease.mockClear();
  __polySynthInstance.releaseAll.mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
});

describe('getBackingEngine().start', () => {
  it('sets Transport.bpm from template.default_bpm', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __toneMock } = await getMockInternals();
    expect(__toneMock.Transport.bpm.value).toBe(90);
  });

  it('registers a scheduleRepeat callback and starts Transport', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __toneMock } = await getMockInternals();
    expect(__toneMock.Transport.scheduleRepeat).toHaveBeenCalledOnce();
    expect(__toneMock.Transport.start).toHaveBeenCalledOnce();
  });

  it('transitions state to playing with initial barIndex 0', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    await engine.start(TEMPLATE, 0 as PitchClass);

    // 마지막 전이가 playing 상태
    const lastCall = listener.mock.calls.at(-1)?.[0];
    expect(lastCall?.status).toBe('playing');
  });

  it('calling start twice stops the previous session first', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __toneMock } = await getMockInternals();
    __toneMock.Transport.stop.mockClear();
    __toneMock.Transport.cancel.mockClear();

    await engine.start(TEMPLATE, 5 as PitchClass);

    expect(__toneMock.Transport.stop).toHaveBeenCalled();
    expect(__toneMock.Transport.cancel).toHaveBeenCalled();
  });
});

describe('scheduled callback behavior', () => {
  it('each tick calls triggerAttackRelease for parseable chords', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __scheduledCallbacks, __polySynthInstance } =
      await getMockInternals();
    const cb = __scheduledCallbacks[0]!;

    // 4 bars 호출
    cb(0);
    cb(2);
    cb(4);
    cb(6); // bVII 바 — 스킵

    // I7, IV7, V7만 울림 (3번). bVII는 파싱 실패로 스킵.
    expect(__polySynthInstance.triggerAttackRelease).toHaveBeenCalledTimes(3);
  });

  it('wraps barIndex back to 0 after template.bars ticks', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __scheduledCallbacks } = await getMockInternals();
    const cb = __scheduledCallbacks[0]!;

    // bars(4) + 1회 호출 → 마지막 상태의 barIndex는 0
    for (let i = 0; i < 5; i++) cb(i);

    const lastPlayingState = listener.mock.calls
      .map((c) => c[0])
      .filter((s) => s.status === 'playing')
      .at(-1);
    expect(lastPlayingState?.barIndex).toBe(0);
    expect(lastPlayingState?.chordSymbol).toBe('I7');
  });

  it('unparseable chord logs warn but does not halt engine', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __scheduledCallbacks } = await getMockInternals();
    const cb = __scheduledCallbacks[0]!;

    cb(0); // I7
    cb(2); // IV7
    cb(4); // V7
    cb(6); // bVII — warn 발생

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('bVII'),
    );
    expect(engine.getState().status).toBe('playing'); // 여전히 재생 중
    warnSpy.mockRestore();
  });
});

describe('getBackingEngine().stop', () => {
  it('resets Transport and state to idle', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.stop();

    const { __toneMock, __polySynthInstance } = await getMockInternals();
    expect(__toneMock.Transport.stop).toHaveBeenCalled();
    expect(__toneMock.Transport.cancel).toHaveBeenCalled();
    expect(__polySynthInstance.releaseAll).toHaveBeenCalled();
    expect(engine.getState().status).toBe('idle');
  });

  it('stop when already idle is a no-op', () => {
    const engine = getBackingEngine();
    expect(() => engine.stop()).not.toThrow();
    expect(engine.getState().status).toBe('idle');
  });
});

describe('subscribe', () => {
  it('invokes listener on state transitions', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.stop();

    // 최소 2번 호출 (playing → idle)
    expect(listener).toHaveBeenCalled();
    const statuses = listener.mock.calls.map((c) => c[0].status);
    expect(statuses).toContain('playing');
    expect(statuses).toContain('idle');

    unsubscribe();
    listener.mockClear();
    await engine.start(TEMPLATE, 0 as PitchClass);
    expect(listener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm --filter @my-music-app/web test tests/unit/lib/audio/backing-track.test.ts`
Expected: FAIL — `Cannot find module '@/lib/audio/backing-track'`

- [ ] **Step 3: Implement backing-track.ts**

Create `apps/web/lib/audio/backing-track.ts`:

```typescript
/**
 * 배킹 트랙 재생 엔진 (Sprint 2-2 PoC).
 *
 * 역할:
 *   ProgressionTemplate + keyRoot를 받아 Tone.Transport에 마디(1m) 단위 콜백을
 *   등록, 매 tick마다 현재 코드를 Tone.PolySynth로 블록 코드 재생. barIndex가
 *   template.bars를 넘으면 0으로 wrap — 무한 루프.
 *
 * 단일 재생 원칙:
 *   start() 호출 시 내부에서 먼저 stop() 수행. 다른 카드 ▶ 눌러도 이전 세션
 *   자동 teardown.
 *
 * AudioContext 수명:
 *   stop()이 컨텍스트를 suspend하지 않는다 — 메트로놈과 공유 중일 수 있음.
 *
 * 테스트:
 *   tone-bridge 전체를 vi.mock으로 교체 → Transport/PolySynth가 spy 객체로
 *   대체됨. 실제 오디오 출력은 수동 검증 (docs 참조).
 */

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { chordSymbolToMidi, midiToFrequency } from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

import { resumeAudioContext } from './context';
import { bindToneToSharedContext, getTone } from './tone-bridge';

export type BackingState =
  | { status: 'idle' }
  | { status: 'loading'; template: ProgressionTemplate }
  | {
      status: 'playing';
      template: ProgressionTemplate;
      keyRoot: PitchClass;
      barIndex: number;
      chordSymbol: string;
    }
  | { status: 'error'; message: string };

export interface BackingEngine {
  getState(): BackingState;
  subscribe(listener: (s: BackingState) => void): () => void;
  start(template: ProgressionTemplate, keyRoot: PitchClass): Promise<void>;
  stop(): void;
  dispose(): void;
}

type PolySynthLike = {
  toDestination(): PolySynthLike;
  triggerAttackRelease(
    notes: number[],
    duration: string,
    time?: number,
  ): void;
  releaseAll(): void;
  dispose(): void;
};

// ──────────────────────────────────────────────
// 내부 구현
// ──────────────────────────────────────────────

function createEngine(): BackingEngine {
  let state: BackingState = { status: 'idle' };
  const listeners = new Set<(s: BackingState) => void>();

  let polySynth: PolySynthLike | null = null;
  let scheduleId: number | null = null;
  let barIndex = 0;

  const setState = (next: BackingState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  const ensurePolySynth = (): PolySynthLike => {
    if (polySynth) return polySynth;
    const Tone = getTone();
    // 타입: Tone.PolySynth 생성자는 매개변수 다양. 여기선 기본 synth 풀만.
    const instance = new Tone.PolySynth().toDestination() as unknown as PolySynthLike;
    polySynth = instance;
    return instance;
  };

  const clearSchedule = () => {
    const Tone = getTone();
    if (scheduleId !== null) {
      Tone.Transport.clear(scheduleId);
      scheduleId = null;
    }
  };

  const hardStop = () => {
    const Tone = getTone();
    clearSchedule();
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch {
      // Transport 미초기화 등 드문 케이스 — 무시
    }
    if (polySynth) polySynth.releaseAll();
    barIndex = 0;
  };

  const start: BackingEngine['start'] = async (template, keyRoot) => {
    // 단일 재생 원칙 — 이전 세션 teardown
    hardStop();

    setState({ status: 'loading', template });

    const ctx = await resumeAudioContext();
    if (!ctx) {
      setState({
        status: 'error',
        message: 'AudioContext resume failed — user gesture required',
      });
      return;
    }

    bindToneToSharedContext();

    const Tone = getTone();
    Tone.Transport.bpm.value = template.default_bpm;
    Tone.Transport.timeSignature = [4, 4];

    const synth = ensurePolySynth();
    barIndex = 0;

    const callback = (time: number) => {
      const idx = barIndex % template.bars;
      const step = template.progression[idx];
      if (!step) {
        barIndex += 1;
        return;
      }
      const symbol = step.chord;
      const midi = chordSymbolToMidi(symbol, keyRoot);
      if (midi) {
        synth.triggerAttackRelease(
          midi.map(midiToFrequency),
          '1m',
          time,
        );
      } else {
        console.warn(
          `[backing-track] unparseable chord symbol "${symbol}" at bar ${idx}; skipping`,
        );
      }
      setState({
        status: 'playing',
        template,
        keyRoot,
        barIndex: idx,
        chordSymbol: symbol,
      });
      barIndex += 1;
    };

    scheduleId = Tone.Transport.scheduleRepeat(callback, '1m');
    Tone.Transport.start();

    setState({
      status: 'playing',
      template,
      keyRoot,
      barIndex: 0,
      chordSymbol: template.progression[0]?.chord ?? '',
    });
  };

  const stop: BackingEngine['stop'] = () => {
    hardStop();
    setState({ status: 'idle' });
  };

  const dispose: BackingEngine['dispose'] = () => {
    hardStop();
    if (polySynth) {
      polySynth.dispose();
      polySynth = null;
    }
    listeners.clear();
    state = { status: 'idle' };
  };

  return {
    getState: () => state,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    start,
    stop,
    dispose,
  };
}

// ──────────────────────────────────────────────
// 싱글턴
// ──────────────────────────────────────────────

let _engine: BackingEngine | null = null;

export function getBackingEngine(): BackingEngine {
  if (!_engine) _engine = createEngine();
  return _engine;
}

/** 테스트·HMR 전용. 운영 경로에서 호출하지 않는다. */
export function __disposeBackingEngineForTests(): void {
  if (_engine) {
    _engine.dispose();
    _engine = null;
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm --filter @my-music-app/web test tests/unit/lib/audio/backing-track.test.ts`
Expected: PASS (10 tests). 만약 `bVII 바 — warn 발생` 테스트가 실패하면: template.progression에서 bVII가 3번째(idx 3)이고 barIndex가 0부터 시작해 3번째 cb 호출 시 idx=3(bVII) 하는지 확인.

- [ ] **Step 5: Run full test suite to check nothing regressed**

Run: `pnpm --filter @my-music-app/web test`
Expected: all prior tests still pass + new tests pass.

- [ ] **Step 6: typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/audio/backing-track.ts apps/web/tests/unit/lib/audio/backing-track.test.ts
git commit -m "$(cat <<'EOF'
feat(audio): add backing-track engine state machine

Tone.Transport.scheduleRepeat('1m')로 마디 단위 블록 코드 재생 엔진.
단일 재생 원칙(start는 내부에서 hardStop 선행), 파싱 실패 코드는 해당 바만
스킵(console.warn), AudioContext suspend 금지(메트로놈과 공유).

테스트는 tone-bridge 전체 모킹으로 Transport/PolySynth spy 검증. 실제 오디오
출력은 수동 검증(PR 설명 체크리스트 참조).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Zustand backing 슬라이스 + persist v5→v6 migrate + 브릿지

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Modify: `apps/web/lib/audio/backing-track.ts` (store 브릿지 subscribe 추가)

- [ ] **Step 1: Modify app-store.ts — 타입 추가**

Edit `apps/web/lib/store/app-store.ts`:

섹션 "UI" 다음 ("루트 state + 액션" 바로 위)에 **추가**:

```typescript
// ─── 배킹 트랙 ─────────────────────────────────────────────
export interface BackingSliceState {
  /** 영속. 사용자가 선택한 재생 Key (0=C ~ 11=B). */
  backingKey: PitchClass;
  /** 런타임. 재생 중인 template.slug 또는 null. */
  backingPlayingSlug: string | null;
  /** 런타임. 엔진이 퍼블리시하는 현재 코드. */
  backingCurrentChord: { symbol: string; barIndex: number } | null;
}
```

`AppState` 인터페이스에 다음 필드·액션 **추가**:

```typescript
  backing: BackingSliceState;

  // 배킹 액션
  setBackingKey: (k: PitchClass) => void;
  /** engine subscriber 전용 — UI에서 호출 금지. */
  _setBackingPlaying: (slug: string | null) => void;
  /** engine subscriber 전용 — UI에서 호출 금지. */
  _setBackingCurrentChord: (
    c: { symbol: string; barIndex: number } | null,
  ) => void;
```

"기본값" 섹션에 **추가** (DEFAULT_UI 아래):

```typescript
const DEFAULT_BACKING: BackingSliceState = {
  backingKey: 0, // C
  backingPlayingSlug: null,
  backingCurrentChord: null,
};
```

스토어 생성 블록(`immer((set) => ({...}))`)에서 `ui: DEFAULT_UI,` 다음에 **추가**:

```typescript
      backing: DEFAULT_BACKING,
```

액션 구현 — 파일 내 `resetHighlights` 액션 뒤에 **추가** (`})), { name: 'my-music-app:v1' ...`의 closing 직전):

```typescript
      setBackingKey: (k) =>
        set((s) => {
          s.backing.backingKey = k;
        }),

      _setBackingPlaying: (slug) =>
        set((s) => {
          s.backing.backingPlayingSlug = slug;
        }),

      _setBackingCurrentChord: (c) =>
        set((s) => {
          s.backing.backingCurrentChord = c;
        }),
```

- [ ] **Step 2: Modify app-store.ts — persist v5→v6 migrate**

`version: 5`를 `version: 6`으로 바꾸고, `migrate` 함수의 `if (version < 5) { ... s.metronome = met; }` 블록 **바로 다음**에 다음을 **추가**:

```typescript
        // v5 → v6: backing 슬라이스 추가. 기존 유저 데이터에는 backing 키가
        // 없으므로 기본값 주입. 런타임 필드는 rehydrate 직후 엔진이 null로
        // 재설정하므로 여기서는 backingKey만 챙긴다.
        if (version < 6) {
          const backing = (s.backing as Record<string, unknown>) ?? {};
          if (typeof backing.backingKey !== 'number') {
            backing.backingKey = 0;
          }
          backing.backingPlayingSlug = null;
          backing.backingCurrentChord = null;
          s.backing = backing;
        }
```

- [ ] **Step 3: Modify app-store.ts — partialize & merge**

`partialize` 블록 끝 `ui: state.ui,` 뒤에 **추가**:

```typescript
        backing: {
          // 영속 필드만 — playingSlug / currentChord는 런타임
          backingKey: state.backing.backingKey,
        },
```

`merge` 블록에서 기존 `ui: { ...currentState.ui, ...(p.ui ?? {}) },` 뒤에 **추가**:

```typescript
          backing: { ...currentState.backing, ...(p.backing ?? {}) },
```

- [ ] **Step 4: Add store bridge in backing-track.ts**

Edit `apps/web/lib/audio/backing-track.ts` — 파일 **최하단** (싱글턴 블록 뒤)에 다음 추가:

```typescript
// ──────────────────────────────────────────────
// Store 브릿지 — 엔진 상태를 Zustand로 전파.
// 컴포넌트는 store만 구독, 엔진은 직접 건드리지 않는 원칙.
//
// 주의: import가 순환하지 않도록 store를 lazy require. SSR·테스트
//      파일에서 store가 hydrate되기 전에 구독이 걸리는 상황을 막기 위해
//      한 번만 wiring.
// ──────────────────────────────────────────────

let _bridgeWired = false;

/** 테스트에서 브릿지를 재장착할 때만 사용. */
export function __resetStoreBridgeForTests(): void {
  _bridgeWired = false;
}

if (typeof window !== 'undefined') {
  // SSR 시 실행되지 않도록 가드. 클라이언트에서 모듈 최초 로드 시 1회 wiring.
  // 지연 import로 store가 순환 의존에 들어가지 않도록 한다.
  void import('@/lib/store/app-store').then(({ useAppStore }) => {
    if (_bridgeWired) return;
    _bridgeWired = true;
    const engine = getBackingEngine();
    engine.subscribe((s) => {
      const store = useAppStore.getState();
      if (s.status === 'playing') {
        store._setBackingPlaying(s.template.slug);
        store._setBackingCurrentChord({
          symbol: s.chordSymbol,
          barIndex: s.barIndex,
        });
      } else {
        store._setBackingPlaying(null);
        store._setBackingCurrentChord(null);
      }
    });
  });
}
```

- [ ] **Step 5: Run full test suite**

Run: `pnpm --filter @my-music-app/web test`
Expected: all pass. 기존 backing-track 테스트가 영향 없는지 특히 확인 (store 브릿지는 `typeof window !== 'undefined'` 가드로 jsdom 환경에서는 탑승하지만 `useAppStore`가 정상 hydrate되지 않으면 setState 호출이 safe).

만약 store 브릿지 wiring으로 인해 기존 엔진 테스트가 깨지면: `beforeEach`에 `__resetStoreBridgeForTests()` 추가 + `vi.mock('@/lib/store/app-store', () => ({ useAppStore: { getState: () => ({ _setBackingPlaying: vi.fn(), _setBackingCurrentChord: vi.fn() }) } }))` 삽입.

- [ ] **Step 6: typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: clean

- [ ] **Step 7: Commit store + bridge together**

```bash
git add apps/web/lib/store/app-store.ts apps/web/lib/audio/backing-track.ts
git commit -m "$(cat <<'EOF'
feat(store): add backing slice with v5→v6 migration and engine bridge

backing 슬라이스(backingKey 영속 + playingSlug/currentChord 런타임)와
engine → store 브릿지를 같이 추가. 브릿지는 엔진 모듈 최하단에서 1회만
wiring되며, window 가드로 SSR 안전.

persist v5→v6 migrate는 backingKey 기본값 주입. partialize/merge는 기존
패턴(deep merge per-slice) 그대로 확장.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: KeySelector 컴포넌트

**Files:**
- Create: `apps/web/components/jam/KeySelector.tsx`

이 컴포넌트는 표시 테스트보다 통합 스모크에 녹이는 게 가성비 — `ProgressionPlayButton.test` 또는 이후 `ProgressionCatalogClient` 스모크에서 같이 확인.

- [ ] **Step 1: Create KeySelector.tsx**

Create `apps/web/components/jam/KeySelector.tsx`:

```typescript
'use client';

/*
 * 배킹 트랙 재생 Key 셀렉터.
 *
 * 12 키 드롭다운. 표기는 `isFlatKey(pc)` 기준으로 flat/sharp 분리 —
 * music-theory-guardian 규율(F, Bb, Eb, Ab, Db는 flat, 나머지는 sharp).
 */

import { isFlatKey } from '@/lib/theory/notes';
import { useAppStore } from '@/lib/store/app-store';
import type { PitchClass } from '@/lib/theory/types';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const KEY_PCS: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function keyLabel(pc: PitchClass): string {
  return isFlatKey(pc) ? FLAT_NAMES[pc]! : SHARP_NAMES[pc]!;
}

export function KeySelector() {
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const setBackingKey = useAppStore((s) => s.setBackingKey);

  return (
    <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
      <span>Key</span>
      <select
        value={backingKey}
        onChange={(e) => setBackingKey(Number(e.target.value) as PitchClass)}
        className="border border-ink-muted/25 bg-bg-elevated px-2 py-1 font-mono text-sm text-ink-primary"
        aria-label="Backing track key"
      >
        {KEY_PCS.map((pc) => (
          <option key={pc} value={pc}>
            {keyLabel(pc)}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/jam/KeySelector.tsx
git commit -m "$(cat <<'EOF'
feat(jam): add KeySelector client component

12 키 드롭다운. isFlatKey(pc) 기준 flat/sharp 표기 분기 — F, Bb, Eb, Ab, Db는
flat 표기. Zustand backing.backingKey를 직접 구독·업데이트.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: ProgressionPlayButton 컴포넌트 + 테스트 (TDD)

**Files:**
- Create: `apps/web/components/jam/ProgressionPlayButton.tsx`
- Test: `apps/web/tests/component/ProgressionPlayButton.test.tsx`

- [ ] **Step 1: Write failing component test**

Create `apps/web/tests/component/ProgressionPlayButton.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// backing-track 엔진 모킹 — start/stop spy만 필요
const startSpy = vi.fn(async () => {});
const stopSpy = vi.fn();
vi.mock('@/lib/audio/backing-track', () => ({
  getBackingEngine: () => ({
    getState: () => ({ status: 'idle' }),
    subscribe: () => () => {},
    start: startSpy,
    stop: stopSpy,
    dispose: vi.fn(),
  }),
  __disposeBackingEngineForTests: vi.fn(),
  __resetStoreBridgeForTests: vi.fn(),
}));

import { ProgressionPlayButton } from '@/components/jam/ProgressionPlayButton';
import { useAppStore } from '@/lib/store/app-store';

const TEMPLATE = {
  slug: 'blues-12-bar-major',
  name: '12-Bar Blues (Major)',
  category: 'blues' as const,
  bars: 12,
  default_bpm: 90,
  progression: [{ bar: 1, chord: 'I7' }],
  time_signature: '4/4',
  recommended_scales: [],
};

beforeEach(() => {
  startSpy.mockClear();
  stopSpy.mockClear();
  // 스토어 초기화
  useAppStore.setState((s) => ({
    ...s,
    backing: {
      backingKey: 0,
      backingPlayingSlug: null,
      backingCurrentChord: null,
    },
  }));
});

afterEach(() => {
  // 다음 테스트를 위해 스토어 초기화
  useAppStore.setState((s) => ({
    ...s,
    backing: {
      backingKey: 0,
      backingPlayingSlug: null,
      backingCurrentChord: null,
    },
  }));
});

describe('ProgressionPlayButton', () => {
  it('shows Play label when idle', () => {
    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls engine.start with template and current backingKey on click', async () => {
    const user = userEvent.setup();
    useAppStore.setState((s) => ({
      ...s,
      backing: { ...s.backing, backingKey: 5 }, // F
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    await user.click(screen.getByRole('button', { name: /play/i }));

    expect(startSpy).toHaveBeenCalledWith(TEMPLATE, 5);
  });

  it('switches to Stop label when this template is playing', () => {
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: TEMPLATE.slug,
        backingCurrentChord: { symbol: 'I7', barIndex: 0 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByText(/I7/)).toBeInTheDocument();
    expect(screen.getByText(/bar 1\/12/)).toBeInTheDocument();
  });

  it('stays in Play label when a different template is playing', () => {
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: 'some-other-slug',
        backingCurrentChord: { symbol: 'V7', barIndex: 3 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('calls engine.stop when clicked while playing', async () => {
    const user = userEvent.setup();
    useAppStore.setState((s) => ({
      ...s,
      backing: {
        ...s.backing,
        backingPlayingSlug: TEMPLATE.slug,
        backingCurrentChord: { symbol: 'I7', barIndex: 0 },
      },
    }));

    render(<ProgressionPlayButton template={TEMPLATE} />);
    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(stopSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm --filter @my-music-app/web test tests/component/ProgressionPlayButton.test.tsx`
Expected: FAIL — `Cannot find module '@/components/jam/ProgressionPlayButton'`

- [ ] **Step 3: Implement ProgressionPlayButton.tsx**

Create `apps/web/components/jam/ProgressionPlayButton.tsx`:

```typescript
'use client';

/*
 * 카드 내 ▶/⏹ 버튼 + 재생 중일 때 현재 코드·바 인덱스 표시.
 *
 * 단일 재생 원칙은 engine.start 내부에서 보장 — UI는 "재생 중이면 Stop, 아니면
 * Play" 로컬 토글만 신경 쓰면 된다.
 */

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { getBackingEngine } from '@/lib/audio/backing-track';
import { useAppStore } from '@/lib/store/app-store';

export function ProgressionPlayButton({
  template,
}: {
  template: ProgressionTemplate;
}) {
  const isPlaying = useAppStore(
    (s) => s.backing.backingPlayingSlug === template.slug,
  );
  const backingKey = useAppStore((s) => s.backing.backingKey);
  const currentChord = useAppStore((s) => s.backing.backingCurrentChord);

  const onClick = async () => {
    const engine = getBackingEngine();
    if (isPlaying) {
      engine.stop();
    } else {
      await engine.start(template, backingKey);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPlaying ? 'Stop' : 'Play'}
      className={clsx(
        'flex items-center gap-2 border px-2 py-1 font-mono text-xs',
        isPlaying
          ? 'border-accent-brass/60 bg-accent-brass/10 text-accent-brass'
          : 'border-ink-muted/25 bg-bg-elevated text-ink-secondary hover:text-ink-primary',
      )}
    >
      <span aria-hidden="true">{isPlaying ? '⏹' : '▶'}</span>
      {isPlaying && currentChord && (
        <span className="tabular-nums">
          {currentChord.symbol} · bar {currentChord.barIndex + 1}/{template.bars}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm --filter @my-music-app/web test tests/component/ProgressionPlayButton.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/jam/ProgressionPlayButton.tsx apps/web/tests/component/ProgressionPlayButton.test.tsx
git commit -m "$(cat <<'EOF'
feat(jam): add ProgressionPlayButton with store-driven state

▶/⏹ 토글은 backing.backingPlayingSlug === template.slug 조건으로 결정.
재생 중인 카드에만 현재 코드/바 인덱스 표시. 단일 재생 원칙은 engine.start
내부에서 보장하므로 UI는 로컬 토글만.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: ProgressionCatalog refactor — Server fetch + Client subtree

**Files:**
- Create: `apps/web/components/jam/ProgressionCatalogClient.tsx`
- Modify: `apps/web/components/jam/ProgressionCatalog.tsx`

- [ ] **Step 1: Create ProgressionCatalogClient.tsx**

Create `apps/web/components/jam/ProgressionCatalogClient.tsx`:

```typescript
'use client';

/*
 * 배킹 트랙 카탈로그 Client subtree.
 *
 * Server 컴포넌트(ProgressionCatalog)가 fetch한 templates를 props로 받아
 * 카테고리별 그룹화 → 카드 그리드 렌더링. 각 카드에 Play 버튼.
 * Key selector는 카탈로그 상단에 둠.
 */

import { clsx } from 'clsx';

import type { ProgressionTemplate } from '@/lib/api/progression-templates';

import { KeySelector } from './KeySelector';
import { ProgressionPlayButton } from './ProgressionPlayButton';

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

  return (
    <section aria-label="코드 진행 카탈로그" className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="flex items-center gap-4">
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
              {items.map((t) => (
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
                    <div className="flex flex-wrap gap-1 font-mono text-[0.65rem] text-ink-muted">
                      {t.progression.slice(0, 8).map((step, idx) => (
                        <span
                          key={idx}
                          className="border border-ink-muted/15 px-1.5 py-[1px] text-ink-secondary"
                        >
                          {step.chord}
                        </span>
                      ))}
                      {t.progression.length > 8 && (
                        <span className="px-1.5 py-[1px] text-ink-muted">…</span>
                      )}
                    </div>
                    <ProgressionPlayButton template={t} />
                  </div>
                </li>
              ))}
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

- [ ] **Step 2: Refactor ProgressionCatalog.tsx**

Replace `apps/web/components/jam/ProgressionCatalog.tsx` contents with:

```typescript
import {
  listProgressionTemplates,
  type ProgressionTemplate,
} from '@/lib/api/progression-templates';

import { ProgressionCatalogClient } from './ProgressionCatalogClient';

/*
 * 배킹 트랙 카탈로그 — Server Component.
 *
 * API 페치만 담당, 실제 상호작용 UI는 ProgressionCatalogClient에 위임.
 * API 실패(컨테이너 다운 등) 시 페이지 자체는 렌더되도록 try/catch로 격리.
 */

export async function ProgressionCatalog() {
  let templates: ProgressionTemplate[] = [];
  let errorMessage: string | null = null;

  try {
    templates = await listProgressionTemplates();
  } catch (e) {
    errorMessage =
      e instanceof Error ? e.message : 'Backing track catalog unavailable';
  }

  if (errorMessage) {
    return (
      <section aria-label="코드 진행 카탈로그" className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-muted">
          § Backing Catalog
        </h2>
        <div className="border border-ink-muted/20 bg-bg-elevated p-4">
          <p className="font-mono text-xs text-ink-muted">
            Catalog offline.{' '}
            <span className="text-ink-secondary">{errorMessage}</span>
          </p>
          <p className="mt-2 font-mono text-[0.65rem] text-ink-muted">
            API base:{' '}
            {process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'}
          </p>
        </div>
      </section>
    );
  }

  return <ProgressionCatalogClient templates={templates} />;
}
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm --filter @my-music-app/web test`
Expected: all pass.

- [ ] **Step 4: typecheck & lint**

Run:
```bash
pnpm --filter @my-music-app/web typecheck
pnpm --filter @my-music-app/web lint
```
Expected: clean

- [ ] **Step 5: Dev server 수동 검증**

Run: `pnpm --filter @my-music-app/web dev`
(별도 터미널에서 `docker compose up -d api db`로 백엔드가 올라가 있어야 함.)

브라우저에서 `http://localhost:3000/jam` 접속:
- [ ] Backing Catalog 섹션에 Key 셀렉터가 보이고, 각 카드에 ▶가 보임
- [ ] ▶ 클릭 → 소리가 나고 라벨이 ⏹로 전환되며 `I7 · bar 1/12` 같은 현재 코드 표시
- [ ] 다른 카드 ▶ → 이전 카드 자동 중단, 새 카드 시작
- [ ] Key를 `F`로 바꾸고 ▶ → 다른 키로 transpose 되어 재생
- [ ] 메트로놈 ▶과 같이 재생해도 둘 다 소리 남 (AudioContext 1개)
- [ ] ⏹ → 재생 중단

브라우저 콘솔에 에러 없는지 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/jam/ProgressionCatalog.tsx apps/web/components/jam/ProgressionCatalogClient.tsx
git commit -m "$(cat <<'EOF'
feat(jam): wire Play button + Key selector into catalog

Server 컴포넌트 ProgressionCatalog는 API 페치·에러 배너만 유지, 실제 UI는
ProgressionCatalogClient에 위임. 카드마다 ▶/⏹, 상단에 Key 셀렉터.

카테고리 그룹화 로직은 client로 이관 — 서버 렌더가 불필요한 DOM을 줄이고
Zustand 구독 컴포넌트(ProgressionPlayButton)와 같은 client tree 안에 둠.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 최종 검증 & 에이전트 리뷰 & PR

**Files:** (읽기 전용)

- [ ] **Step 1: Full validation sweep**

Run from `apps/web`:
```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: 세 가지 모두 clean. 테스트 수는 기존 + chord-voicing(~11) + backing-track(~10) + ProgressionPlayButton(~5) ≈ 총 325건 수준.

- [ ] **Step 2: Agent review — web-audio-engineer**

Use Agent tool with `subagent_type: web-audio-engineer`:

Prompt: "Sprint 2-2 PoC의 Tone.js 통합 설계를 리뷰해주세요. 대상: `apps/web/lib/audio/tone-bridge.ts`, `apps/web/lib/audio/backing-track.ts`. 검토 포인트: (1) `bindToneToSharedContext`의 `Tone.setContext(getAudioContext())` 호출 타이밍이 유저 제스처 후로 보장되는지, (2) `Transport.stop() + cancel()` 순서가 scheduleId 유출을 막는지, (3) PolySynth를 싱글턴으로 재사용하는데 `releaseAll` 후 다음 start에서 튀지 않는지, (4) iOS Safari 오토플레이 정책에서 `resumeAudioContext` 실패 경로가 맞는지. 200단어 이내 리포트."

리포트 내용을 PR 설명에 붙일 것.

- [ ] **Step 3: Agent review — aesthetic-reviewer**

Use Agent tool with `subagent_type: aesthetic-reviewer`:

Prompt: "Sprint 2-2 신규/수정 UI 컴포넌트 디자인 토큰 규율 리뷰: `apps/web/components/jam/KeySelector.tsx`, `ProgressionPlayButton.tsx`, `ProgressionCatalogClient.tsx`. 금지 항목: Inter/Roboto/system-ui 폰트, 보라 그라데이션, hex 하드코딩, 라운디드 카드. 허용: `bg-bg-elevated`, `border-ink-muted/*`, `text-accent-brass`, `text-highlight-*`, `font-mono`, `font-display`. 200단어 이내 리포트."

- [ ] **Step 4: Agent review — test-strategist**

Use Agent tool with `subagent_type: test-strategist`:

Prompt: "Sprint 2-2 테스트 커버리지 리뷰: `apps/web/tests/unit/lib/theory/chord-voicing.test.ts`, `apps/web/tests/unit/lib/audio/backing-track.test.ts`, `apps/web/tests/component/ProgressionPlayButton.test.tsx`. 검토: (1) chord-voicing 엣지 케이스(빈 배열, 옥타브 경계) 커버, (2) backing-track이 Tone 전체 모킹했는데 실제 타이밍 검증은 수동으로 미루는 게 적절한지, (3) 컴포넌트 스모크가 Zustand setState로 직접 상태 주입하는 패턴이 기존 테스트와 일관성 있는지. 200단어 이내 리포트."

- [ ] **Step 5: Push branch & create PR**

```bash
git push -u origin feat/phase-5-sprint-2-2-backing-track-poc
```

```bash
gh pr create --title "feat: Phase 5 Sprint 2-2 — Tone.js backing track PoC" --body "$(cat <<'EOF'
## Summary

Phase 5 Sprint 2-2 — Tone.Transport를 공유 AudioContext 위에서 돌려 progression
템플릿을 BPM·마디 단위 블록 코드로 루프 재생하는 PoC. `/jam` 카탈로그 카드에
▶/⏹ + Key 셀렉터.

스펙: [`docs/superpowers/specs/2026-04-24-sprint-2-2-backing-track-poc-design.md`](./docs/superpowers/specs/2026-04-24-sprint-2-2-backing-track-poc-design.md)

## What's in

- **`lib/theory/chord-voicing.ts`** — 순수 함수 3개 (voicingToMidi, chordSymbolToMidi, midiToFrequency). Tone 무의존.
- **`lib/audio/tone-bridge.ts`** — Tone의 유일한 import 지점. `Tone.setContext(getAudioContext())` 1회 바인딩.
- **`lib/audio/backing-track.ts`** — Engine 상태 머신(idle/loading/playing/error). 단일 재생 원칙, 파싱 실패 바 스킵.
- **`lib/store/app-store.ts`** — 4번째 슬라이스 `backing` 추가, persist v5→v6 migrate.
- **`components/jam/KeySelector.tsx`** — 12 키 드롭다운.
- **`components/jam/ProgressionPlayButton.tsx`** — ▶/⏹ + 현재 코드/바 표시.
- **`components/jam/ProgressionCatalogClient.tsx`** — 기존 catalog를 client subtree로 분리.

## Review notes

- **web-audio-engineer**: [PASTE 리포트]
- **aesthetic-reviewer**: [PASTE 리포트]
- **test-strategist**: [PASTE 리포트]

## Test plan

- [x] `pnpm typecheck` clean
- [x] `pnpm lint` clean
- [x] `pnpm test` — 신규 테스트 26건(chord-voicing 11 + backing-track 10 + ProgressionPlayButton 5) 포함 전체 통과
- [ ] 수동 브라우저 검증 (Chrome):
  - [ ] /jam 접속 → Backing Catalog 카드 ▶로 소리 재생
  - [ ] 다른 카드 ▶ → 이전 자동 중단
  - [ ] Key 변경 후 ▶ → transpose 정상
  - [ ] 메트로놈과 동시 재생 시 AudioContext 1개 유지
  - [ ] ⏹로 중단

## Out of scope (다음 스프린트)

- **2-3**: 드럼/베이스/키 멀티트랙 패턴 엔진, 리듬 프리셋
- **2-4**: `/jam` 지판에 현재 코드 톤 ring 하이라이트
- **Phase 6**: Tone.Sampler, 필터·리버브, 번들 크기 측정

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR URL을 사용자에게 보고.

---

## Notes for the Implementer

1. **세션 중 AudioContext 1개 원칙이 최우선**: `context.ts` 싱글턴 외에서 `new AudioContext()` 금지. `Tone.setContext(getAudioContext())`는 `tone-bridge.bindToneToSharedContext` 1곳에서만.

2. **테스트 파일의 모킹 순서**: `vi.mock(...)`은 호이스트된다. `import` 문보다 먼저 쓰여야 하지만 vitest가 위치를 끌어올려준다. 단 모킹 내부에서 `import`된 모듈을 참조하면 순환이 생기므로 팩토리 내부에서 새 객체를 만든다.

3. **Store 브릿지는 jsdom 환경에서 실행됨**: `typeof window !== 'undefined'` 가드는 jsdom에서도 true. 테스트 실패 시 `__resetStoreBridgeForTests` 호출 + store 모킹을 고려.

4. **PolySynth 싱글턴 재사용**: start마다 새로 만들면 GC 누적. `ensurePolySynth`로 재사용 + `dispose`는 engine.dispose에서만.

5. **`chord-voicing.ts`의 stacked voicing이 "too high-pitched"일 수 있음**: PoC에선 rootOctave=4 고정. 2-3에서 보이싱 전략(drop 2, spread voicing) 확장 시 이 함수가 기초.

6. **커밋 scope 규율**: Task 1은 `chore(deps)`, 2는 `feat(theory)`, 3·4는 `feat(audio)`, 5는 `feat(store)` (scope 2개 병합이지만 engine 브릿지는 audio 영역이라 logically same unit), 6·7·8은 `feat(jam)`. Conventional Commits 규율 유지.

7. **문제 시 에스컬레이션**: (a) backing-track 테스트에서 Tone 모킹이 hoist 순서 문제로 안 되면 `vi.hoisted` 사용. (b) PolySynth 타입이 너무 엄격하면 `as unknown as PolySynthLike` 캐스팅. (c) persist migrate에서 기존 유저 localStorage가 v5로 저장돼 있으면 첫 rehydrate에 v6 migrate가 실행되는지 DevTools에서 확인.
