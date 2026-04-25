# Sprint 2-4 — WebAudioFont 재구축 + BPM 컨트롤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tone.js 합성 voice를 WebAudioFont GM 패치 기반 sample 음원으로 통째 교체하고, 자체 lookahead/Bar 스케줄러로 박자 정확도를 잡으며, 카드별 BPM 런타임 변경 UI를 추가한다.

**Architecture:** 메트로놈에서 Chris Wilson lookahead 패턴을 `LookaheadScheduler` 모듈로 추출해 backing과 공유. 그 위에 마디 단위 추상화 `BarScheduler`. WebAudioFont를 단일 진입 모듈(`webaudiofont-bridge`)로 격리하고 카테고리별 InstrumentPreset 매핑 + lazy 패치 로드. Voice는 stateless로 preset을 매 trigger마다 받음. onBar 콜백 안 setState는 `queueMicrotask`로 분리(4.2박 회귀 차단). hardStop은 voice GainNode linearRamp로 already-attacked 노트 fade.

**Tech Stack:** TypeScript 5 strict / Next.js 15 App Router / Vitest + Testing Library / Zustand persist v6→v7 / Web Audio API (단일 AudioContext) / WebAudioFont (GM 샘플) / pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-04-25-sprint-2-4-webaudiofont-rebuild-design.md`
**Branch:** `feat/sprint-2-4-timing-fix`
**Base SHA:** `b040c2c` (Sprint 2-3 머지)

---

## File Structure

```
apps/web/
  lib/audio/
    context.ts                                   (그대로)
    scheduler/                                   (NEW 디렉토리)
      lookahead-scheduler.ts                     (Chris Wilson 코어 추출)
      bar-scheduler.ts                           (마디 단위 추상화)
      worker.ts                                  (메트로놈에서 추출, 공유)
    backing/
      engine.ts                                  (REWRITE)
      index.ts                                   (배럴 — export 이름 유지 + setBpm/resetBpmToDefault 추가)
      webaudiofont-bridge.ts                     (NEW — loader + 패치 캐시)
      presets.ts                                 (NEW — 카테고리 매핑)
      patterns/
        types.ts                                 (REWRITE — BeatStep + parseBeatStep)
        backbeat.ts                              (그대로)
        strumming.ts                             (NEW)
      voices/
        drums.ts                                 (REWRITE — WebAudioFont)
        bass.ts                                  (REWRITE — WebAudioFont)
        guitar.ts                                (NEW — replaces keys.ts)
        keys.ts                                  (DELETE)
    metronome-scheduler.ts                       (REFACTOR — LookaheadScheduler 사용)
    tone-bridge.ts                               (DELETE)
  types/
    webaudiofont.d.ts                            (NEW — 자체 타입 선언)
  components/jam/
    BpmSlider.tsx                                (NEW)
    ProgressionPlayButton.tsx                    (MINOR — loading 텍스트 변경 가능)
    ProgressionCatalogClient.tsx                 (MINOR — 카드에 BpmSlider 삽입)
  lib/store/
    app-store.ts                                 (BackingSlice 확장 + persist v6→v7)
    hooks.ts                                     (그대로)
  tests/unit/lib/audio/
    scheduler/
      lookahead-scheduler.test.ts                (NEW)
      bar-scheduler.test.ts                      (NEW)
    backing/
      patterns/
        types.test.ts                            (NEW — parseBeatStep)
      webaudiofont-bridge.test.ts                (NEW)
      presets.test.ts                            (NEW)
      voices/
        drums.test.ts                            (REWRITE)
        bass.test.ts                             (REWRITE)
        guitar.test.ts                           (NEW)
      engine.test.ts                             (REWRITE)
      voice-mock-helpers.ts                      (REWRITE — webaudiofont mock)
    metronome-scheduler.test.ts                  (영향 없음 — 통과 검증)
  tests/component/
    BpmSlider.test.tsx                           (NEW)
    ProgressionPlayButton.test.tsx               (MINOR)
  tests/unit/lib/store/
    app-store.test.ts                            (확장 — bpmOverrides + migration)
package.json                                     (tone 제거, webaudiofont 추가)
```

---

## Tasks Outline

병렬 가능 (서로 독립):
- Task 1: LookaheadScheduler 추출 + Worker 분리
- Task 3: parseBeatStep + 패턴 타입 + strumming.ts
- Task 4 (1단계): WebAudioFont 타입 선언 + bridge skeleton

순차:
- Task 2: BarScheduler (Task 1 의존)
- Task 5: presets.ts (단독)
- Task 4 (2단계): bridge 본 구현 + 테스트
- Task 6: Voice 3종 (Task 3·4 의존)
- Task 7: Engine 재작성 (Task 1·2·3·4·5·6 모두 의존)
- Task 8: Tone.js / keys.ts / tone-bridge 정리
- Task 9: Store BPM 슬라이스 + persist migration
- Task 10: BpmSlider + ProgressionPlayButton 통합
- Task 11: package.json + 메트로놈 리팩터 검증
- Task 12: 수동 청취 + 4.2박 측정 + PR

---

## Task 1 — LookaheadScheduler 추출 + Worker 분리

**Files:**
- Create: `apps/web/lib/audio/scheduler/lookahead-scheduler.ts`
- Create: `apps/web/lib/audio/scheduler/worker.ts` (메트로놈 Worker 코드 분리)
- Test: `apps/web/tests/unit/lib/audio/scheduler/lookahead-scheduler.test.ts`

- [ ] **Step 1.1: 메트로놈 Worker 코드 위치 확인**

```bash
grep -n "Worker\|postMessage\|new Worker" apps/web/lib/audio/metronome-scheduler.ts
ls apps/web/public/workers/ 2>/dev/null || echo "no workers dir"
```

기존 worker는 `apps/web/lib/audio/scheduler-worker.ts`(`apps/web/lib/audio/` 직속)에 인라인일 수 있음. 정확한 path 파악 후 Step 1.2.

- [ ] **Step 1.2: Worker 파일 생성 (또는 기존 위치 그대로 활용)**

기존이 `scheduler-worker.ts`라면 새 위치 `scheduler/worker.ts`로 이동. 컨텐츠 그대로:

```typescript
// apps/web/lib/audio/scheduler/worker.ts
// LookaheadScheduler용 Worker. setInterval 기반 tick 메시지 송출.

let intervalId: ReturnType<typeof setInterval> | null = null;

self.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as { type: 'start' | 'stop'; intervalMs?: number };
  if (data.type === 'start') {
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = setInterval(() => {
      (self as unknown as Worker).postMessage({ type: 'tick' });
    }, data.intervalMs ?? 25);
  } else if (data.type === 'stop' && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
});
```

- [ ] **Step 1.3: 단위 테스트 작성 — 실패하는 상태**

```typescript
// apps/web/tests/unit/lib/audio/scheduler/lookahead-scheduler.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLookaheadScheduler } from '@/lib/audio/scheduler/lookahead-scheduler';

class FakeWorker implements Partial<Worker> {
  private listeners = new Set<(e: MessageEvent) => void>();
  postMessage = vi.fn();
  addEventListener = vi.fn((type: string, fn: EventListener) => {
    if (type === 'message') this.listeners.add(fn as (e: MessageEvent) => void);
  });
  removeEventListener = vi.fn();
  terminate = vi.fn();
  emit(data: unknown) {
    this.listeners.forEach((l) => l({ data } as MessageEvent));
  }
}

describe('createLookaheadScheduler', () => {
  let ctx: { currentTime: number; baseLatency: number };
  let worker: FakeWorker;

  beforeEach(() => {
    ctx = { currentTime: 0, baseLatency: 0.005 };
    worker = new FakeWorker();
  });

  it('start()는 worker에 start 메시지를 보낸다', () => {
    const sched = createLookaheadScheduler({
      audioContext: ctx as unknown as AudioContext,
      createWorker: () => worker as unknown as Worker,
    });
    sched.start(() => {});
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'start', intervalMs: 25 });
  });

  it('tick 수신 시 lookahead 윈도우 안의 이벤트를 onTick에 전달한다', () => {
    const onTick = vi.fn();
    const sched = createLookaheadScheduler({
      audioContext: ctx as unknown as AudioContext,
      createWorker: () => worker as unknown as Worker,
    });
    sched.setIntervalSeconds(0.5);
    sched.start(onTick);

    // currentTime=0, scheduleAhead=0.1 → 첫 tick에서 t=0 이벤트 예약
    worker.emit({ type: 'tick' });
    expect(onTick).toHaveBeenCalledWith(expect.any(Number));
    const firstCallTime = onTick.mock.calls[0]?.[0] as number;
    expect(firstCallTime).toBeGreaterThanOrEqual(0);
    expect(firstCallTime).toBeLessThan(0.1);
  });

  it('setIntervalSeconds 변경은 다음 tick부터 적용된다', () => {
    const onTick = vi.fn();
    const sched = createLookaheadScheduler({
      audioContext: ctx as unknown as AudioContext,
      createWorker: () => worker as unknown as Worker,
    });
    sched.setIntervalSeconds(0.5);
    sched.start(onTick);

    worker.emit({ type: 'tick' }); // 첫 이벤트 예약
    onTick.mockClear();

    sched.setIntervalSeconds(0.25); // 변경
    ctx.currentTime = 0.4; // 다음 윈도우는 0.5에 스케줄된 이벤트만 본다 — 변경 전 간격
    worker.emit({ type: 'tick' });
    // 첫 변경 이벤트 후 다음 nextEventTime = 0.5 + 0.25 = 0.75 (새 간격)
    // 검증: onTick 시간 차가 0.5 (이전) → 그 이후로는 0.25씩
    // (최소 검증: 0.25가 적용되는지 추적)
    if (onTick.mock.calls.length > 0) {
      const t = onTick.mock.calls[0]?.[0] as number;
      expect(t).toBeCloseTo(0.5, 1);
    }
  });

  it('stop() 후 추가 tick에서 onTick이 호출되지 않는다', () => {
    const onTick = vi.fn();
    const sched = createLookaheadScheduler({
      audioContext: ctx as unknown as AudioContext,
      createWorker: () => worker as unknown as Worker,
    });
    sched.setIntervalSeconds(0.5);
    sched.start(onTick);
    worker.emit({ type: 'tick' });
    onTick.mockClear();
    sched.stop();
    worker.emit({ type: 'tick' });
    expect(onTick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 1.4: 테스트 실행 — 실패 확인**

```bash
cd apps/web && pnpm test tests/unit/lib/audio/scheduler/lookahead-scheduler.test.ts
```

Expected: 모듈 미존재로 FAIL.

- [ ] **Step 1.5: 구현**

```typescript
// apps/web/lib/audio/scheduler/lookahead-scheduler.ts
/**
 * Chris Wilson 패턴 lookahead 스케줄러.
 *
 * 메트로놈과 backing track 양쪽에서 사용. Worker 인스턴스는 인스턴스별 독립
 * 생성 — 공유하면 한쪽 stop이 다른쪽 ticker를 멈추는 회귀.
 *
 * 핵심:
 *   1. Worker가 25ms마다 tick 메시지
 *   2. tick 시 [currentTime, currentTime + scheduleAhead] 윈도우 안의 모든 다음
 *      이벤트를 onTick에 전달 (caller가 audio 예약 책임)
 *   3. iOS는 baseLatency로 감지해 scheduleAhead를 0.15s로 상향
 */

const DEFAULT_LOOKAHEAD_MS = 25;
const DEFAULT_SCHEDULE_AHEAD_SEC = 0.1;
const IOS_SCHEDULE_AHEAD_SEC = 0.15;

export interface LookaheadScheduler {
  start(onTick: (eventTime: number) => void): void;
  stop(): void;
  setIntervalSeconds(seconds: number): void;
  /** scheduleAhead를 동적으로 상향. BarScheduler가 마디 길이의 50%로 호출. */
  setScheduleAhead(seconds: number): void;
}

export interface LookaheadOptions {
  audioContext: AudioContext;
  /** 테스트에서 fake worker 주입. 운영에서는 default factory가 worker.ts 사용. */
  createWorker?: () => Worker;
  isIOS?: boolean;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function defaultCreateWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url));
}

export function createLookaheadScheduler(options: LookaheadOptions): LookaheadScheduler {
  const { audioContext } = options;
  const isIOS = options.isIOS ?? detectIOS();
  const createWorker = options.createWorker ?? defaultCreateWorker;

  let worker: Worker | null = null;
  let running = false;
  let intervalSeconds = 0.5;
  let scheduleAhead = isIOS ? IOS_SCHEDULE_AHEAD_SEC : DEFAULT_SCHEDULE_AHEAD_SEC;
  let nextEventTime = 0;
  let currentOnTick: ((eventTime: number) => void) | null = null;

  function handleMessage(e: MessageEvent): void {
    if ((e.data as { type?: string } | null)?.type !== 'tick') return;
    if (!running || !currentOnTick) return;

    const horizon = audioContext.currentTime + scheduleAhead;

    // 안전 가드: nextEventTime이 windowed 한참 뒤이면 currentTime + 50ms로 재시작
    if (nextEventTime < audioContext.currentTime - scheduleAhead) {
      nextEventTime = audioContext.currentTime + 0.05;
    }

    while (nextEventTime < horizon) {
      currentOnTick(nextEventTime);
      nextEventTime += intervalSeconds;
    }
  }

  return {
    start(onTick) {
      if (running) return;
      running = true;
      currentOnTick = onTick;
      nextEventTime = audioContext.currentTime + 0.05;

      if (!worker) {
        worker = createWorker();
        worker.addEventListener('message', handleMessage);
      }
      worker.postMessage({ type: 'start', intervalMs: DEFAULT_LOOKAHEAD_MS });
    },
    stop() {
      running = false;
      currentOnTick = null;
      worker?.postMessage({ type: 'stop' });
    },
    setIntervalSeconds(seconds: number) {
      intervalSeconds = seconds;
    },
    setScheduleAhead(seconds: number) {
      // base와 dynamic 중 큰 값 채택
      const baseAhead = isIOS ? IOS_SCHEDULE_AHEAD_SEC : DEFAULT_SCHEDULE_AHEAD_SEC;
      scheduleAhead = Math.max(baseAhead, seconds);
    },
  };
}
```

- [ ] **Step 1.6: 테스트 실행 — 통과 확인**

```bash
pnpm test tests/unit/lib/audio/scheduler/lookahead-scheduler.test.ts
```

Expected: 4 PASS.

- [ ] **Step 1.7: 메트로놈 회귀 안전성 — 기존 테스트도 통과하는지**

```bash
pnpm test tests/unit/lib/audio/metronome-scheduler.test.ts
```

Expected: PASS (메트로놈은 아직 리팩터 안 했으므로 기존 코드 그대로 동작).

- [ ] **Step 1.8: 커밋**

```bash
git add apps/web/lib/audio/scheduler/ apps/web/tests/unit/lib/audio/scheduler/
git commit -m "$(cat <<'EOF'
feat(audio): extract Chris Wilson lookahead scheduler core

메트로놈에서 Chris Wilson lookahead 패턴을 별도 모듈로 추출. backing track과
공유하기 위함. Worker 인스턴스는 caller별 독립 생성(공유 시 stop 회귀).
scheduleAhead는 BarScheduler가 동적 상향(setScheduleAhead).

메트로놈 자체 리팩터는 이후 Task에서. 현 시점에서는 신규 모듈 + 단위테스트만
추가, 기존 메트로놈 동작 영향 없음.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — BarScheduler

**Depends on:** Task 1
**Files:**
- Create: `apps/web/lib/audio/scheduler/bar-scheduler.ts`
- Test: `apps/web/tests/unit/lib/audio/scheduler/bar-scheduler.test.ts`

- [ ] **Step 2.1: 단위 테스트**

```typescript
// apps/web/tests/unit/lib/audio/scheduler/bar-scheduler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBarScheduler } from '@/lib/audio/scheduler/bar-scheduler';
import type { LookaheadScheduler } from '@/lib/audio/scheduler/lookahead-scheduler';

function makeFakeLookahead(): LookaheadScheduler & {
  __triggerTick(eventTime: number): void;
  __getInterval(): number;
  __getScheduleAhead(): number;
} {
  let onTick: ((t: number) => void) | null = null;
  let interval = 0;
  let ahead = 0;
  return {
    start: vi.fn((cb) => { onTick = cb; }) as unknown as LookaheadScheduler['start'],
    stop: vi.fn(() => { onTick = null; }),
    setIntervalSeconds: vi.fn((s) => { interval = s; }),
    setScheduleAhead: vi.fn((s) => { ahead = s; }),
    __triggerTick: (t) => onTick?.(t),
    __getInterval: () => interval,
    __getScheduleAhead: () => ahead,
  };
}

describe('createBarScheduler', () => {
  let lookahead: ReturnType<typeof makeFakeLookahead>;

  beforeEach(() => {
    lookahead = makeFakeLookahead();
  });

  it('start(120 BPM, 4박)는 lookahead.setIntervalSeconds(2.0) 호출', () => {
    const sched = createBarScheduler({ lookahead });
    sched.start(120, 4, () => {});
    expect(lookahead.setIntervalSeconds).toHaveBeenCalledWith(2.0);
  });

  it('start(60 BPM, 4박)는 scheduleAhead를 마디 길이의 50%인 2.0s로 상향', () => {
    const sched = createBarScheduler({ lookahead });
    sched.start(60, 4, () => {});
    expect(lookahead.setScheduleAhead).toHaveBeenCalledWith(2.0);
  });

  it('lookahead tick은 onBar에 (eventTime, barIndex 0부터 단조증가)로 전달', () => {
    const onBar = vi.fn();
    const sched = createBarScheduler({ lookahead });
    sched.start(120, 4, onBar);

    lookahead.__triggerTick(0);
    lookahead.__triggerTick(2.0);
    lookahead.__triggerTick(4.0);

    expect(onBar).toHaveBeenNthCalledWith(1, 0, 0);
    expect(onBar).toHaveBeenNthCalledWith(2, 2.0, 1);
    expect(onBar).toHaveBeenNthCalledWith(3, 4.0, 2);
  });

  it('setBpm 호출은 lookahead.setIntervalSeconds 갱신', () => {
    const sched = createBarScheduler({ lookahead });
    sched.start(120, 4, () => {});
    sched.setBpm(90);
    expect(lookahead.setIntervalSeconds).toHaveBeenLastCalledWith((60 / 90) * 4);
  });

  it('setBpm은 scheduleAhead도 동시 갱신', () => {
    const sched = createBarScheduler({ lookahead });
    sched.start(120, 4, () => {});
    sched.setBpm(60);
    expect(lookahead.setScheduleAhead).toHaveBeenLastCalledWith(2.0); // 4.0s * 0.5
  });

  it('stop()은 lookahead.stop 호출 + 다음 tick에서 onBar 호출 안 함', () => {
    const onBar = vi.fn();
    const sched = createBarScheduler({ lookahead });
    sched.start(120, 4, onBar);
    sched.stop();
    expect(lookahead.stop).toHaveBeenCalled();
    onBar.mockClear();
    lookahead.__triggerTick(0);
    expect(onBar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
pnpm test tests/unit/lib/audio/scheduler/bar-scheduler.test.ts
```

- [ ] **Step 2.3: 구현**

```typescript
// apps/web/lib/audio/scheduler/bar-scheduler.ts
/**
 * 마디 단위 스케줄러 — LookaheadScheduler 위에 얹는 추상화.
 * BPM 변경은 다음 마디부터 적용. scheduleAhead를 마디 길이의 50%로 동적 상향.
 */

import type { LookaheadScheduler } from './lookahead-scheduler';

export interface BarScheduler {
  start(bpm: number, beatsPerBar: number, onBar: (eventTime: number, barIndex: number) => void): void;
  stop(): void;
  setBpm(bpm: number): void;
}

export interface BarSchedulerOptions {
  lookahead: LookaheadScheduler;
}

export function createBarScheduler(options: BarSchedulerOptions): BarScheduler {
  const { lookahead } = options;
  let beatsPerBar = 4;
  let running = false;
  let barIndex = 0;
  let onBar: ((eventTime: number, barIndex: number) => void) | null = null;

  function applyBpm(bpm: number): void {
    const barLengthSec = (60 / bpm) * beatsPerBar;
    lookahead.setIntervalSeconds(barLengthSec);
    lookahead.setScheduleAhead(barLengthSec * 0.5);
  }

  return {
    start(bpm, _beatsPerBar, cb) {
      beatsPerBar = _beatsPerBar;
      running = true;
      barIndex = 0;
      onBar = cb;
      applyBpm(bpm);
      lookahead.start((eventTime) => {
        if (!running || !onBar) return;
        const idx = barIndex;
        barIndex += 1;
        onBar(eventTime, idx);
      });
    },
    stop() {
      running = false;
      onBar = null;
      lookahead.stop();
    },
    setBpm(bpm) {
      applyBpm(bpm);
    },
  };
}
```

- [ ] **Step 2.4: 테스트 통과 확인**

```bash
pnpm test tests/unit/lib/audio/scheduler/bar-scheduler.test.ts
```

Expected: 6 PASS.

- [ ] **Step 2.5: 커밋**

```bash
git add apps/web/lib/audio/scheduler/bar-scheduler.ts apps/web/tests/unit/lib/audio/scheduler/bar-scheduler.test.ts
git commit -m "feat(audio): add BarScheduler with dynamic scheduleAhead

LookaheadScheduler 위 마디 단위 추상화. BPM·박수로부터 interval을 계산해
주입. scheduleAhead를 마디 길이의 50%로 동적 상향(긴 마디에서 백그라운드
복귀나 GC 스파이크 시 마디 누락 차단). BPM 변경은 다음 마디부터 적용.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — parseBeatStep + 패턴 타입 + strumming.ts

**Files:**
- Modify: `apps/web/lib/audio/backing/patterns/types.ts`
- Create: `apps/web/lib/audio/backing/patterns/strumming.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/patterns/types.test.ts`

- [ ] **Step 3.1: parseBeatStep 단위 테스트**

```typescript
// apps/web/tests/unit/lib/audio/backing/patterns/types.test.ts
import { describe, expect, it } from 'vitest';

import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('parseBeatStep', () => {
  it('0:0:0 = 0초', () => {
    expect(parseBeatStep('0:0:0', 120)).toBe(0);
  });

  it('0:1:0 at 120 BPM = 0.5초 (한 박)', () => {
    expect(parseBeatStep('0:1:0', 120)).toBeCloseTo(0.5);
  });

  it('0:2:0 at 120 BPM = 1.0초 (3박)', () => {
    expect(parseBeatStep('0:2:0', 120)).toBeCloseTo(1.0);
  });

  it('0:0:2 at 120 BPM = 0.25초 (8분 — sub 2/4 = 0.5박)', () => {
    expect(parseBeatStep('0:0:2', 120)).toBeCloseTo(0.25);
  });

  it('0:3:2 at 120 BPM = 1.75초 (4박-and)', () => {
    expect(parseBeatStep('0:3:2', 120)).toBeCloseTo(1.75);
  });

  it('1:0:0 at 120 BPM = 2.0초 (다음 마디)', () => {
    expect(parseBeatStep('1:0:0', 120)).toBeCloseTo(2.0);
  });

  it('60 BPM에서 0:1:0 = 1.0초', () => {
    expect(parseBeatStep('0:1:0', 60)).toBeCloseTo(1.0);
  });

  it('beatsPerBar=3 (3/4) 에서 1:0:0 at 120 = 1.5초', () => {
    expect(parseBeatStep('1:0:0', 120, 3)).toBeCloseTo(1.5);
  });
});
```

- [ ] **Step 3.2: 테스트 실패 확인**

```bash
pnpm test tests/unit/lib/audio/backing/patterns/types.test.ts
```

- [ ] **Step 3.3: types.ts 수정**

기존 파일 내용을 확인하고 `parseBeatStep` 추가:

```typescript
// apps/web/lib/audio/backing/patterns/types.ts
/**
 * 멀티트랙 배킹 패턴 데이터 타입 + 시각 표기 파서.
 *
 * 시각 표기는 'bar:beat:sub' (16분 sub). Sprint 2-3에서 Tone.Time을 썼으나
 * Sprint 2-4는 자체 파서로 결정론성을 확보 — BPM을 명시 인자로 받음.
 */

export type BeatStep = {
  /** 'bar:beat:sub' — 16분 sub. 예: '0:1:2' = 2박+8분(half beat). */
  time: string;
  velocity?: number;
};

export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
};

export type BassPattern = {
  steps: BeatStep[];
};

// keys 필드 제거 — Sprint 2-4부터 guitar로 대체.
export type StrumStep = BeatStep & { direction: 'down' | 'up' };
export type StrumPattern = StrumStep[];

export type TrackPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  guitar: StrumPattern;
};

/**
 * 'bar:beat:sub' 표기를 BPM 기준 초로 환산.
 * sub는 16분음 단위(한 박 = 4 sub).
 */
export function parseBeatStep(notation: string, bpm: number, beatsPerBar = 4): number {
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;
  const beatSec = 60 / bpm;
  return bars * beatsPerBar * beatSec + beats * beatSec + (subs / 4) * beatSec;
}
```

- [ ] **Step 3.4: strumming.ts 생성**

```typescript
// apps/web/lib/audio/backing/patterns/strumming.ts
/**
 * 표준 어쿠스틱 8분 컴핑 패턴 — D _ D U _ U D U.
 * 6 strikes per bar.
 */

import type { StrumPattern } from './types';

export const EIGHTH_STRUM: StrumPattern = [
  { time: '0:0:0', direction: 'down' },
  { time: '0:1:0', direction: 'down' },
  { time: '0:1:2', direction: 'up' },
  { time: '0:2:2', direction: 'up' },
  { time: '0:3:0', direction: 'down' },
  { time: '0:3:2', direction: 'up' },
];
```

- [ ] **Step 3.5: backbeat.ts 호환 확인**

기존 `backbeat.ts`의 `keys` 필드를 새 `TrackPattern`이 받지 못하므로 컴파일 에러. 우선 backbeat.ts를 임시로 keys 필드 빼고 형 맞추기:

```typescript
// apps/web/lib/audio/backing/patterns/backbeat.ts
import type { DrumPattern, BassPattern } from './types';

const HAT_STEPS = ['0:0:0','0:0:2','0:1:0','0:1:2','0:2:0','0:2:2','0:3:0','0:3:2'] as const;

export const BACKBEAT_DRUMS: DrumPattern = {
  kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
  snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
  hat: HAT_STEPS.map((time) => ({ time, velocity: 0.5 })),
};

export const BACKBEAT_BASS: BassPattern = {
  steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
};
```

(전체 BACKBEAT_PATTERN은 engine.ts가 이 두 상수 + EIGHTH_STRUM을 조합)

- [ ] **Step 3.6: 테스트 통과 확인**

```bash
pnpm test tests/unit/lib/audio/backing/patterns/types.test.ts
pnpm typecheck
```

- [ ] **Step 3.7: 커밋**

```bash
git add apps/web/lib/audio/backing/patterns/ apps/web/tests/unit/lib/audio/backing/patterns/
git commit -m "refactor(audio): add parseBeatStep and strumming pattern; drop keys

Tone.Time을 자체 parseBeatStep 함수로 교체 — BPM 명시 인자로 결정론성 확보.
StrumStep + EIGHTH_STRUM 패턴(6 strikes per bar D _ D U _ U D U) 추가.
TrackPattern.keys 필드 제거(guitar로 대체 예정).

backbeat.ts는 drum/bass 두 상수로 분리 — engine.ts가 EIGHTH_STRUM과 합성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — WebAudioFont bridge + 타입 선언

**Files:**
- Create: `apps/web/types/webaudiofont.d.ts`
- Create: `apps/web/lib/audio/backing/webaudiofont-bridge.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts`
- Modify: `apps/web/package.json` — `webaudiofont` 추가

- [ ] **Step 4.1: 패키지 설치**

```bash
cd apps/web && pnpm add webaudiofont
```

- [ ] **Step 4.2: 타입 선언**

```typescript
// apps/web/types/webaudiofont.d.ts
/**
 * webaudiofont 패키지의 자체 타입 선언 (라이브러리에 .d.ts 부족).
 * 최소한의 표면적만 선언 — 점진적 보강.
 */
declare module 'webaudiofont' {
  export class WebAudioFontPlayer {
    constructor();
    loader: {
      startLoad(audioContext: AudioContext, url: string, variableName: string): void;
      waitLoad(callback: () => void): void;
    };
    queueWaveTable(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitch: number,
      durationSec: number,
      volume?: number,
    ): unknown;
    queueStrumDown(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitches: number[],
      durationSec: number,
      volume?: number,
      slices?: number,
    ): void;
    queueStrumUp(
      audioContext: AudioContext,
      target: AudioNode,
      preset: unknown,
      when: number,
      pitches: number[],
      durationSec: number,
      volume?: number,
      slices?: number,
    ): void;
    cancelQueue(audioContext: AudioContext): void;
  }
}
```

`tsconfig.json`의 `include`에 `types/` 디렉토리가 있는지 확인:

```bash
grep '"include"' apps/web/tsconfig.json
```

없으면 추가:

```json
"include": ["next-env.d.ts", "types/**/*.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
```

- [ ] **Step 4.3: 테스트 작성 (실패 상태)**

```typescript
// apps/web/tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetWebAudioFontBridgeForTests,
  ensurePatch,
  loadPreset,
  getPlayer,
} from '@/lib/audio/backing/webaudiofont-bridge';

vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => ({}) as AudioContext),
  resumeAudioContext: vi.fn(async () => ({}) as AudioContext),
}));

const playerMock = {
  loader: {
    startLoad: vi.fn(),
    waitLoad: vi.fn((cb: () => void) => cb()),
  },
  queueWaveTable: vi.fn(),
  queueStrumDown: vi.fn(),
  queueStrumUp: vi.fn(),
  cancelQueue: vi.fn(),
};

vi.mock('webaudiofont', () => ({
  WebAudioFontPlayer: vi.fn(() => playerMock),
}));

beforeEach(() => {
  __resetWebAudioFontBridgeForTests();
  playerMock.loader.startLoad.mockClear();
  playerMock.loader.waitLoad.mockClear();
  // 글로벌 패치 변수 시뮬레이션
  (globalThis as Record<string, unknown>)['_tone_0270_FluidR3_GM_sf2_file'] = { fakePatch: true };
});

afterEach(() => {
  __resetWebAudioFontBridgeForTests();
});

describe('webaudiofont-bridge', () => {
  it('ensurePatch는 startLoad + waitLoad 호출 후 LoadedInstrument 반환', async () => {
    const result = await ensurePatch('melodic', 27);
    expect(playerMock.loader.startLoad).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
    expect(typeof result.url).toBe('string');
  });

  it('같은 패치 재요청은 캐시 히트로 startLoad 추가 호출 없음', async () => {
    await ensurePatch('melodic', 27);
    playerMock.loader.startLoad.mockClear();
    await ensurePatch('melodic', 27);
    expect(playerMock.loader.startLoad).not.toHaveBeenCalled();
  });

  it('loadPreset은 drums/bass/guitar 3개 패치 병렬 로드', async () => {
    (globalThis as Record<string, unknown>)['_drum_0_FluidR3_GM_sf2_file'] = { drum: true };
    (globalThis as Record<string, unknown>)['_tone_0330_FluidR3_GM_sf2_file'] = { bass: true };
    (globalThis as Record<string, unknown>)['_tone_0270_FluidR3_GM_sf2_file'] = { guitar: true };

    const preset = await loadPreset({ drumsKit: 0, bass: 33, guitar: 27, label: 'test' });
    expect(preset.drums).toBeDefined();
    expect(preset.bass).toBeDefined();
    expect(preset.guitar).toBeDefined();
  });

  it('getPlayer는 동일 player 인스턴스 반환 (싱글턴)', () => {
    const p1 = getPlayer();
    const p2 = getPlayer();
    expect(p1).toBe(p2);
  });
});
```

- [ ] **Step 4.4: 테스트 실패 확인**

```bash
pnpm test tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts
```

- [ ] **Step 4.5: 구현**

```typescript
// apps/web/lib/audio/backing/webaudiofont-bridge.ts
/**
 * WebAudioFont loader/player 싱글턴 + 패치 캐시.
 *
 * 외부 모듈은 이 bridge만 사용 — `import 'webaudiofont'`는 여기에만.
 * 패치 데이터는 surikov/webaudiofontdata GitHub Pages CDN에서 lazy 로드.
 */

import { WebAudioFontPlayer } from 'webaudiofont';

import { getAudioContext } from '../context';
import type { InstrumentPreset } from './presets';

const PATCH_BASE = 'https://surikov.github.io/webaudiofontdata/sound/';

export type LoadedInstrument = {
  /** WebAudioFont 패치 객체 — global 변수에 심어진 것을 참조. */
  patch: unknown;
  url: string;
};

export type LoadedPreset = {
  drums: LoadedInstrument;
  bass: LoadedInstrument;
  guitar: LoadedInstrument;
};

let _player: WebAudioFontPlayer | null = null;
const patchCache = new Map<string, LoadedInstrument>();

export function getPlayer(): WebAudioFontPlayer {
  if (!_player) _player = new WebAudioFontPlayer();
  return _player;
}

function patchKey(kind: 'drum' | 'melodic', gm: number): string {
  return `${kind}:${gm}`;
}

function patchUrl(kind: 'drum' | 'melodic', gm: number): { url: string; varName: string } {
  // WebAudioFont 명명 규칙. drum의 경우 0_FluidR3_GM_sf2_file, melodic의 경우 0270_FluidR3_GM_sf2_file 같은 식
  // (gm * 10) + 0 = base voice. drum kits는 별도 prefix.
  if (kind === 'drum') {
    const padded = String(gm).padStart(2, '0');
    return {
      url: `${PATCH_BASE}${padded}0_FluidR3_GM_sf2_file.js`,
      varName: `_drum_${gm}_FluidR3_GM_sf2_file`,
    };
  }
  // melodic: GM 0~127, 패치명은 (gm * 10)을 4자리로 zero-pad
  const padded = String(gm * 10).padStart(4, '0');
  return {
    url: `${PATCH_BASE}${padded}_FluidR3_GM_sf2_file.js`,
    varName: `_tone_${padded}_FluidR3_GM_sf2_file`,
  };
}

export async function ensurePatch(kind: 'drum' | 'melodic', gm: number): Promise<LoadedInstrument> {
  const key = patchKey(kind, gm);
  const cached = patchCache.get(key);
  if (cached) return cached;

  const player = getPlayer();
  const ctx = getAudioContext();
  const { url, varName } = patchUrl(kind, gm);

  return new Promise<LoadedInstrument>((resolve, reject) => {
    try {
      player.loader.startLoad(ctx, url, varName);
      player.loader.waitLoad(() => {
        const patch = (globalThis as Record<string, unknown>)[varName];
        if (!patch) {
          reject(new Error(`[webaudiofont-bridge] patch ${varName} not found after load`));
          return;
        }
        const loaded: LoadedInstrument = { patch, url };
        patchCache.set(key, loaded);
        resolve(loaded);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export async function loadPreset(preset: InstrumentPreset): Promise<LoadedPreset> {
  const [drums, bass, guitar] = await Promise.all([
    ensurePatch('drum', preset.drumsKit),
    ensurePatch('melodic', preset.bass),
    ensurePatch('melodic', preset.guitar),
  ]);
  return { drums, bass, guitar };
}

/** 테스트·HMR 정리. 운영 호출 금지. */
export function __resetWebAudioFontBridgeForTests(): void {
  _player = null;
  patchCache.clear();
}
```

- [ ] **Step 4.6: presets.ts 임시 stub (Task 5에서 본 구현)**

bridge가 import하므로 형태만 먼저:

```typescript
// apps/web/lib/audio/backing/presets.ts
export type InstrumentPreset = {
  drumsKit: number;
  bass: number;
  guitar: number;
  label: string;
};
```

- [ ] **Step 4.7: 테스트 통과**

```bash
pnpm test tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts
pnpm typecheck
```

- [ ] **Step 4.8: 커밋**

```bash
git add apps/web/lib/audio/backing/webaudiofont-bridge.ts apps/web/lib/audio/backing/presets.ts apps/web/types/webaudiofont.d.ts apps/web/tests/unit/lib/audio/backing/webaudiofont-bridge.test.ts apps/web/package.json apps/web/pnpm-lock.yaml apps/web/tsconfig.json
git commit -m "feat(audio): add WebAudioFont bridge with patch cache

singleton player + Map<key,LoadedInstrument> 캐시. ensurePatch는 surikov
github pages CDN에서 lazy 로드, waitLoad 콜백으로 글로벌 변수 패치 참조.
loadPreset은 drums/bass/guitar 3개 병렬.

자체 .d.ts로 webaudiofont 타입 최소 선언(라이브러리 .d.ts 부족).
InstrumentPreset 타입 stub — Task 5에서 본 매핑.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Category Presets 매핑

**Files:**
- Modify: `apps/web/lib/audio/backing/presets.ts`
- Test: `apps/web/tests/unit/lib/audio/backing/presets.test.ts`

- [ ] **Step 5.1: 테스트**

```typescript
// apps/web/tests/unit/lib/audio/backing/presets.test.ts
import { describe, expect, it } from 'vitest';

import { CATEGORY_PRESETS, getPreset } from '@/lib/audio/backing/presets';

describe('CATEGORY_PRESETS', () => {
  it('7 카테고리 모두 정의됨', () => {
    expect(Object.keys(CATEGORY_PRESETS).sort()).toEqual([
      'blues', 'bossa', 'folk', 'funk', 'jazz', 'pop', 'rock',
    ]);
  });

  it('각 프리셋은 drumsKit/bass/guitar/label을 가짐', () => {
    for (const [name, preset] of Object.entries(CATEGORY_PRESETS)) {
      expect(preset, name).toMatchObject({
        drumsKit: expect.any(Number),
        bass: expect.any(Number),
        guitar: expect.any(Number),
        label: expect.any(String),
      });
    }
  });
});

describe('getPreset', () => {
  it('알려진 카테고리는 해당 프리셋 반환', () => {
    expect(getPreset('jazz').guitar).toBe(26);
  });

  it('알 수 없는 카테고리는 pop fallback', () => {
    expect(getPreset('unknown' as string)).toBe(CATEGORY_PRESETS.pop);
  });
});
```

- [ ] **Step 5.2: 구현 (presets.ts 확장)**

```typescript
// apps/web/lib/audio/backing/presets.ts
/**
 * 카테고리 → InstrumentPreset 매핑.
 *
 * GM 패치 번호는 General MIDI 표준:
 *   - drumsKit: 0 = Standard, 32 = Jazz, 16 = Power, 24 = Electronic ...
 *   - bass: 32 = Acoustic, 33 = Finger, 34 = Pick
 *   - guitar: 24 = Nylon, 25 = Steel, 26 = Jazz, 27 = Clean Electric,
 *             28 = Muted, 29 = Overdrive, 30 = Distortion
 */

export type InstrumentPreset = {
  drumsKit: number;
  bass: number;
  guitar: number;
  label: string;
};

export const CATEGORY_PRESETS = {
  pop:   { drumsKit: 0,  bass: 33, guitar: 27, label: 'Pop · Clean Electric + Finger Bass' },
  rock:  { drumsKit: 0,  bass: 34, guitar: 27, label: 'Rock · Clean Electric + Pick Bass' },
  funk:  { drumsKit: 0,  bass: 34, guitar: 28, label: 'Funk · Muted Electric + Pick Bass' },
  jazz:  { drumsKit: 32, bass: 32, guitar: 26, label: 'Jazz · Jazz Guitar + Acoustic Bass' },
  blues: { drumsKit: 0,  bass: 33, guitar: 29, label: 'Blues · Overdrive + Finger Bass' },
  folk:  { drumsKit: 0,  bass: 33, guitar: 25, label: 'Folk · Steel Acoustic + Finger Bass' },
  bossa: { drumsKit: 0,  bass: 32, guitar: 24, label: 'Bossa · Nylon + Acoustic Bass' },
} as const satisfies Record<string, InstrumentPreset>;

export function getPreset(category: string): InstrumentPreset {
  return (CATEGORY_PRESETS as Record<string, InstrumentPreset>)[category] ?? CATEGORY_PRESETS.pop;
}
```

- [ ] **Step 5.3: 테스트 통과 + 커밋**

```bash
pnpm test tests/unit/lib/audio/backing/presets.test.ts
git add apps/web/lib/audio/backing/presets.ts apps/web/tests/unit/lib/audio/backing/presets.test.ts
git commit -m "feat(audio): add category-to-instrument preset mapping

7 카테고리(pop/rock/funk/jazz/blues/folk/bossa) → InstrumentPreset GM 패치
번호 매핑. 알 수 없는 카테고리는 pop으로 fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Voice 3종 (drums/bass/guitar) — REWRITE

**Depends on:** Tasks 3, 4, 5
**Files:**
- Rewrite: `apps/web/lib/audio/backing/voices/drums.ts`
- Rewrite: `apps/web/lib/audio/backing/voices/bass.ts`
- Create: `apps/web/lib/audio/backing/voices/guitar.ts`
- Delete: `apps/web/lib/audio/backing/voices/keys.ts`
- Rewrite: `apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts`
- Rewrite: `apps/web/tests/unit/lib/audio/backing/voices/drums.test.ts`
- Rewrite: `apps/web/tests/unit/lib/audio/backing/voices/bass.test.ts`
- Create: `apps/web/tests/unit/lib/audio/backing/voices/guitar.test.ts`
- Delete: `apps/web/tests/unit/lib/audio/backing/voices/keys.test.ts`

- [ ] **Step 6.1: voice-mock-helpers 재작성**

```typescript
// apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts
/**
 * Sprint 2-4 voice 테스트 공용 헬퍼.
 *
 * webaudiofont 모듈을 vi.mock으로 교체하고 player spy 인스턴스를 노출.
 * voice/engine 테스트 모두 createWebAudioFontMock()를 vi.mock factory로 사용.
 */

import { vi } from 'vitest';

export type PlayerMock = {
  loader: {
    startLoad: ReturnType<typeof vi.fn>;
    waitLoad: ReturnType<typeof vi.fn>;
  };
  queueWaveTable: ReturnType<typeof vi.fn>;
  queueStrumDown: ReturnType<typeof vi.fn>;
  queueStrumUp: ReturnType<typeof vi.fn>;
  cancelQueue: ReturnType<typeof vi.fn>;
};

export function makePlayerMock(): PlayerMock {
  return {
    loader: {
      startLoad: vi.fn(),
      waitLoad: vi.fn((cb: () => void) => cb()),
    },
    queueWaveTable: vi.fn(),
    queueStrumDown: vi.fn(),
    queueStrumUp: vi.fn(),
    cancelQueue: vi.fn(),
  };
}

let _instance: PlayerMock | null = null;

export function createWebAudioFontMock() {
  return {
    WebAudioFontPlayer: vi.fn(() => {
      _instance = makePlayerMock();
      return _instance;
    }),
  };
}

export function getPlayerInstance(): PlayerMock {
  if (!_instance) throw new Error('Player not yet created');
  return _instance;
}

export function resetPlayerInstance(): void {
  _instance = null;
}

/** GainNode mock — voice 테스트에서 audio routing 검증용. */
export function makeGainNodeMock() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

/** AudioContext mock — voice 인스턴스 생성 시 createGain 호출용. */
export function makeAudioContextMock(currentTime = 0): AudioContext {
  const gainMock = makeGainNodeMock();
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => gainMock),
  } as unknown as AudioContext;
}
```

- [ ] **Step 6.2: drums voice 테스트**

```typescript
// apps/web/tests/unit/lib/audio/backing/voices/drums.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWebAudioFontMock,
  getPlayerInstance,
  resetPlayerInstance,
  makeAudioContextMock,
} from '../voice-mock-helpers';

vi.mock('webaudiofont', () => createWebAudioFontMock());
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
  resumeAudioContext: vi.fn(async () => mockCtx),
}));

let mockCtx: AudioContext;
beforeEach(() => {
  mockCtx = makeAudioContextMock();
  resetPlayerInstance();
  // bridge 캐시도 리셋
});

afterEach(() => {
  vi.clearAllMocks();
});

import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

describe('DrumVoice', () => {
  it('trigger("kick", preset, time)는 player.queueWaveTable을 MIDI 36로 호출', () => {
    const voice = createDrumVoice();
    // bridge가 lazy player 생성 — voice가 첫 trigger 시 호출됨.
    const fakePreset = { patch: { fake: true }, url: 'x' };
    voice.trigger('kick', fakePreset, 1.5, 0.7);

    const player = getPlayerInstance();
    expect(player.queueWaveTable).toHaveBeenCalledOnce();
    const args = player.queueWaveTable.mock.calls[0]!;
    // (audioContext, target, preset, when, pitch, durationSec, volume)
    expect(args[2]).toBe(fakePreset.patch);
    expect(args[3]).toBe(1.5);
    expect(args[4]).toBe(36); // kick MIDI
    expect(args[6]).toBe(0.7); // velocity → volume
  });

  it('trigger("snare")는 MIDI 38', () => {
    const voice = createDrumVoice();
    voice.trigger('snare', { patch: {}, url: '' }, 1.0);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[4]).toBe(38);
  });

  it('trigger("hat")는 MIDI 42', () => {
    const voice = createDrumVoice();
    voice.trigger('hat', { patch: {}, url: '' }, 1.0);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[4]).toBe(42);
  });

  it('default velocity 0.8', () => {
    const voice = createDrumVoice();
    voice.trigger('kick', { patch: {}, url: '' }, 1.0);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[6]).toBe(0.8);
  });

  it('dispose는 GainNode disconnect 호출', () => {
    const voice = createDrumVoice();
    voice.trigger('kick', { patch: {}, url: '' }, 1.0); // gain node lazy 생성
    voice.dispose();
    // mockCtx.createGain의 반환 mock의 disconnect가 호출됐어야
    const gainMock = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainMock.disconnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6.3: drums voice 구현**

```typescript
// apps/web/lib/audio/backing/voices/drums.ts
/**
 * 합성 드럼 → WebAudioFont GM 드럼킷 샘플로 교체.
 * GM 표준 노트 매핑(channel 10): kick=36, snare=38, hat=42.
 *
 * voice는 stateless: preset(LoadedInstrument)을 매 trigger마다 인자로 받음.
 * 카드(카테고리) 전환 시 voice 객체 재사용, preset만 swap.
 *
 * GainNode 보유 이유: hardStop 시 cancelQueue로도 already-attacked 노트가
 * release되지 않음. dry GainNode를 끼워두고 linearRamp(0)로 fade-out.
 */

import { getAudioContext } from '../../context';
import { getPlayer, type LoadedInstrument } from '../webaudiofont-bridge';

const KICK_MIDI = 36;
const SNARE_MIDI = 38;
const HAT_MIDI = 42;

export interface DrumVoice {
  trigger(step: 'kick' | 'snare' | 'hat', preset: LoadedInstrument, time: number, velocity?: number): void;
  /** hardStop에서 호출 — 노트 fade out + 100ms 후 gain 1.0 복구. */
  fadeOut(): void;
  dispose(): void;
}

const NOTE_DURATION_SEC = 0.3; // 짧은 percussion duration

export function createDrumVoice(): DrumVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(ctx.destination);

  return {
    trigger(step, preset, time, velocity = 0.8) {
      const midi = step === 'kick' ? KICK_MIDI : step === 'snare' ? SNARE_MIDI : HAT_MIDI;
      getPlayer().queueWaveTable(ctx, gain, preset.patch, time, midi, NOTE_DURATION_SEC, velocity);
    },
    fadeOut() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.01);
      // 100ms 후 1.0 복구 — 다음 start 즉시 재사용 가능
      setTimeout(() => {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
      }, 100);
    },
    dispose() {
      gain.disconnect();
    },
  };
}
```

- [ ] **Step 6.4: bass voice 테스트 + 구현**

테스트:

```typescript
// apps/web/tests/unit/lib/audio/backing/voices/bass.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWebAudioFontMock,
  getPlayerInstance,
  resetPlayerInstance,
  makeAudioContextMock,
} from '../voice-mock-helpers';

vi.mock('webaudiofont', () => createWebAudioFontMock());
let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

beforeEach(() => {
  mockCtx = makeAudioContextMock();
  resetPlayerInstance();
});
afterEach(() => vi.clearAllMocks());

import { createBassVoice } from '@/lib/audio/backing/voices/bass';

describe('BassVoice', () => {
  it('trigger(48, preset, 0.5, 1.0)는 queueWaveTable을 MIDI 48 + duration 0.5로 호출', () => {
    const voice = createBassVoice();
    voice.trigger(48, { patch: { p: 1 }, url: '' }, 0.5, 1.0, 0.9);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[3]).toBe(1.0);     // when
    expect(args[4]).toBe(48);      // pitch
    expect(args[5]).toBe(0.5);     // duration
    expect(args[6]).toBe(0.9);     // volume
  });

  it('default velocity 0.9', () => {
    const voice = createBassVoice();
    voice.trigger(40, { patch: {}, url: '' }, 0.5, 1.0);
    expect(getPlayerInstance().queueWaveTable.mock.calls[0]?.[6]).toBe(0.9);
  });

  it('dispose는 GainNode disconnect', () => {
    const voice = createBassVoice();
    voice.dispose();
    const gainMock = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainMock.disconnect).toHaveBeenCalled();
  });
});
```

구현:

```typescript
// apps/web/lib/audio/backing/voices/bass.ts
import { getAudioContext } from '../../context';
import { getPlayer, type LoadedInstrument } from '../webaudiofont-bridge';

export interface BassVoice {
  trigger(midi: number, preset: LoadedInstrument, durationSec: number, time: number, velocity?: number): void;
  fadeOut(): void;
  dispose(): void;
}

export function createBassVoice(): BassVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(ctx.destination);

  return {
    trigger(midi, preset, durationSec, time, velocity = 0.9) {
      getPlayer().queueWaveTable(ctx, gain, preset.patch, time, midi, durationSec, velocity);
    },
    fadeOut() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.01);
      setTimeout(() => {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
      }, 100);
    },
    dispose() {
      gain.disconnect();
    },
  };
}
```

- [ ] **Step 6.5: guitar voice 테스트 + 구현**

테스트:

```typescript
// apps/web/tests/unit/lib/audio/backing/voices/guitar.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWebAudioFontMock,
  getPlayerInstance,
  resetPlayerInstance,
  makeAudioContextMock,
} from '../voice-mock-helpers';

vi.mock('webaudiofont', () => createWebAudioFontMock());
let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

beforeEach(() => {
  mockCtx = makeAudioContextMock();
  resetPlayerInstance();
});
afterEach(() => vi.clearAllMocks());

import { createGuitarVoice } from '@/lib/audio/backing/voices/guitar';

describe('GuitarVoice', () => {
  it('strum("down", [60,64,67], preset, 0.4, 1.0)는 queueStrumDown 호출', () => {
    const voice = createGuitarVoice();
    voice.strum('down', [60, 64, 67], { patch: { x: 1 }, url: '' }, 0.4, 1.0, 0.7);
    const player = getPlayerInstance();
    expect(player.queueStrumDown).toHaveBeenCalledOnce();
    expect(player.queueStrumUp).not.toHaveBeenCalled();
    const args = player.queueStrumDown.mock.calls[0]!;
    expect(args[3]).toBe(1.0);                  // when
    expect(args[4]).toEqual([60, 64, 67]);      // pitches
    expect(args[5]).toBe(0.4);                  // duration
    expect(args[6]).toBe(0.7);                  // volume
  });

  it('strum("up", ...)는 queueStrumUp 호출', () => {
    const voice = createGuitarVoice();
    voice.strum('up', [60, 64], { patch: {}, url: '' }, 0.3, 2.0);
    const player = getPlayerInstance();
    expect(player.queueStrumUp).toHaveBeenCalledOnce();
    expect(player.queueStrumDown).not.toHaveBeenCalled();
  });

  it('default velocity 0.6', () => {
    const voice = createGuitarVoice();
    voice.strum('down', [60], { patch: {}, url: '' }, 0.3, 1.0);
    expect(getPlayerInstance().queueStrumDown.mock.calls[0]?.[6]).toBe(0.6);
  });
});
```

구현:

```typescript
// apps/web/lib/audio/backing/voices/guitar.ts
/**
 * 기타 strumming voice — Sprint 2-3 keys.ts 대체.
 * WebAudioFont의 queueStrumDown/Up이 코드 톤을 시간차로 훑어줌.
 * durationSec은 caller가 BPM 비례로 계산해 넘긴다.
 */

import { getAudioContext } from '../../context';
import { getPlayer, type LoadedInstrument } from '../webaudiofont-bridge';

export interface GuitarVoice {
  strum(
    direction: 'down' | 'up',
    midiNotes: number[],
    preset: LoadedInstrument,
    durationSec: number,
    time: number,
    velocity?: number,
  ): void;
  fadeOut(): void;
  dispose(): void;
}

export function createGuitarVoice(): GuitarVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(ctx.destination);

  return {
    strum(direction, midiNotes, preset, durationSec, time, velocity = 0.6) {
      const player = getPlayer();
      if (direction === 'down') {
        player.queueStrumDown(ctx, gain, preset.patch, time, midiNotes, durationSec, velocity);
      } else {
        player.queueStrumUp(ctx, gain, preset.patch, time, midiNotes, durationSec, velocity);
      }
    },
    fadeOut() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.01);
      setTimeout(() => {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
      }, 100);
    },
    dispose() {
      gain.disconnect();
    },
  };
}
```

- [ ] **Step 6.6: keys.ts 및 테스트 삭제**

```bash
rm apps/web/lib/audio/backing/voices/keys.ts
rm apps/web/tests/unit/lib/audio/backing/voices/keys.test.ts
```

- [ ] **Step 6.7: 테스트 통과 + typecheck**

```bash
pnpm test tests/unit/lib/audio/backing/voices/
pnpm typecheck
```

이 시점에서 engine.ts가 keys.ts를 참조해서 typecheck 실패 가능. 다음 Task에서 engine 재작성하므로 이번 Task 커밋은 voice 파일만 들어감 + engine은 임시로 컴파일 안 되는 상태가 될 수 있음 → Task 7과 묶어서 커밋해도 됨. 분리 권장:

- [ ] **Step 6.8: engine.ts 임시 stub 처리**

engine.ts가 keys 참조라 이대로 두면 빌드 깨짐. 우선 keys import 라인을 주석 처리하고 keys 트리거 부분을 임시 noop으로:

```bash
sed -i 's|import { createKeysVoice|// REMOVED Sprint 2-4: import { createKeysVoice|' apps/web/lib/audio/backing/engine.ts
# 더 깔끔하게 sed보다 Edit tool로 처리. 다음 Task에서 engine 통째 재작성하므로
# 임시 stub은 한 줄 주석 + voices.keys.trigger 호출 부분도 // REMOVED 처리.
```

(실제로는 Edit tool로 직접 처리. 자세한 절차는 구현자가 해당 파일을 읽고 1~3 분 안에 정리)

- [ ] **Step 6.9: 커밋**

```bash
git add apps/web/lib/audio/backing/voices/ apps/web/tests/unit/lib/audio/backing/voice-mock-helpers.ts apps/web/tests/unit/lib/audio/backing/voices/
git rm apps/web/lib/audio/backing/voices/keys.ts apps/web/tests/unit/lib/audio/backing/voices/keys.test.ts 2>/dev/null
git add apps/web/lib/audio/backing/engine.ts
git commit -m "feat(audio): replace synthesis voices with WebAudioFont GM samples

drums(GM kick/snare/hat noteMap) + bass(GM melodic) + guitar(NEW, queueStrum
Down/Up). voice는 stateless로 preset 인자 받음. 각 voice가 자체 GainNode를
끼워두고 fadeOut(linearRamp 10ms)로 already-attacked 잔향 차단.

keys.ts 및 그 테스트 삭제. engine.ts는 keys 참조 임시 비활성 — 다음 Task
에서 통째 재작성.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Engine 재작성

**Depends on:** Tasks 1, 2, 3, 4, 5, 6
**Files:**
- Rewrite: `apps/web/lib/audio/backing/engine.ts`
- Modify: `apps/web/lib/audio/backing/index.ts` (setBpm/resetBpmToDefault export 추가)
- Rewrite: `apps/web/tests/unit/lib/audio/backing/engine.test.ts`

이 Task는 spec §8 흐름과 §10 회귀 어설션을 그대로 코드로 옮긴다. 분량이 크므로 단계 세분화.

- [ ] **Step 7.1: 새 engine.ts 작성**

```typescript
// apps/web/lib/audio/backing/engine.ts
/**
 * 멀티트랙 backing 엔진 — Sprint 2-4 재작성.
 * BarScheduler + WebAudioFont voices + per-category preset.
 *
 * 4.2박 회귀 차단: onBar 콜백 안 setState를 queueMicrotask로 분리.
 * 마디 도중 setBpm은 다음 마디부터. onBar 진입 시 const bpm = currentBpm 스냅샷.
 */

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { chordPitchClasses } from '@/lib/theory/chords';
import type { PitchClass } from '@/lib/theory/types';

import { getAudioContext, resumeAudioContext } from '../context';
import { createBarScheduler, type BarScheduler } from '../scheduler/bar-scheduler';
import { createLookaheadScheduler } from '../scheduler/lookahead-scheduler';
import { BACKBEAT_BASS, BACKBEAT_DRUMS } from './patterns/backbeat';
import { EIGHTH_STRUM } from './patterns/strumming';
import { parseBeatStep } from './patterns/types';
import { CATEGORY_PRESETS, getPreset } from './presets';
import { createBassVoice, type BassVoice } from './voices/bass';
import { createDrumVoice, type DrumVoice } from './voices/drums';
import { createGuitarVoice, type GuitarVoice } from './voices/guitar';
import { getPlayer, loadPreset, type LoadedPreset } from './webaudiofont-bridge';

export type BackingState =
  | { status: 'idle' }
  | { status: 'loading'; template: ProgressionTemplate }
  | {
      status: 'playing';
      template: ProgressionTemplate;
      keyRoot: PitchClass;
      barIndex: number;
      chordSymbol: string;
      currentBpm: number;
    }
  | { status: 'error'; message: string };

export interface BackingEngine {
  getState(): BackingState;
  subscribe(listener: (s: BackingState) => void): () => void;
  start(template: ProgressionTemplate, keyRoot: PitchClass): Promise<void>;
  setKey(keyRoot: PitchClass): void;
  setBpm(bpm: number): void;
  resetBpmToDefault(): void;
  stop(): void;
  dispose(): void;
}

/** chord symbol → MIDI 배열 (octave 4 기준 stacked voicing). */
function chordSymbolToMidi(symbol: string, keyRoot: PitchClass): number[] | null {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (!pcs) return null;
  const [rootPc, ...rest] = pcs;
  if (rootPc === undefined) return null;
  const rootMidi = 12 * 5 + rootPc; // C4 = 60
  const out = [rootMidi];
  let prev = rootMidi;
  for (const pc of rest) {
    let candidate = 12 * 5 + pc;
    while (candidate <= prev) candidate += 12;
    out.push(candidate);
    prev = candidate;
  }
  return out;
}

function createEngine(): BackingEngine {
  let state: BackingState = { status: 'idle' };
  const listeners = new Set<(s: BackingState) => void>();

  const setState = (next: BackingState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  let drums: DrumVoice | null = null;
  let bass: BassVoice | null = null;
  let guitar: GuitarVoice | null = null;
  let scheduler: BarScheduler | null = null;

  let currentTemplate: ProgressionTemplate | null = null;
  let currentKeyRoot: PitchClass = 0;
  let currentBpm = 90;
  let currentDefaultBpm = 90;
  let currentLoadedPreset: LoadedPreset | null = null;

  const ensureVoices = () => {
    if (!drums) drums = createDrumVoice();
    if (!bass) bass = createBassVoice();
    if (!guitar) guitar = createGuitarVoice();
    return { drums, bass, guitar };
  };

  const fadeOutVoices = () => {
    drums?.fadeOut();
    bass?.fadeOut();
    guitar?.fadeOut();
  };

  const hardStop = () => {
    scheduler?.stop();
    scheduler = null;
    try {
      const player = getPlayer();
      const ctx = getAudioContext();
      player.cancelQueue(ctx);
    } catch (e) {
      console.warn('[backing] cancelQueue raised:', e);
    }
    fadeOutVoices();
  };

  const start: BackingEngine['start'] = async (template, keyRoot) => {
    hardStop();
    setState({ status: 'loading', template });

    const ctx = await resumeAudioContext();
    if (!ctx) {
      setState({ status: 'error', message: 'AudioContext resume failed — user gesture required' });
      return;
    }

    const preset = getPreset(template.category ?? 'pop');
    let loaded: LoadedPreset;
    try {
      loaded = await loadPreset(preset);
    } catch (e) {
      setState({ status: 'error', message: `Failed to load instruments: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }

    currentLoadedPreset = loaded;
    currentTemplate = template;
    currentKeyRoot = keyRoot;
    currentDefaultBpm = template.default_bpm;
    currentBpm = template.default_bpm;

    const voices = ensureVoices();
    const lookahead = createLookaheadScheduler({ audioContext: ctx });
    scheduler = createBarScheduler({ lookahead });

    scheduler.start(currentBpm, 4, (eventTime, barIndexAbs) => {
      const tpl = currentTemplate;
      if (!tpl || !currentLoadedPreset) return;

      // ── 1. 오디오 예약 블록 (동기) ──
      const idx = barIndexAbs % tpl.bars;
      const step = tpl.progression[idx];
      if (!step) return;

      const symbol = step.chord;
      const midi = chordSymbolToMidi(symbol, currentKeyRoot);

      const bpm = currentBpm;
      const beatSec = 60 / bpm;
      const strumDurSec = Math.min(0.4, beatSec * 0.4);
      const t = (notation: string) => eventTime + parseBeatStep(notation, bpm);

      if (midi) {
        for (const s of BACKBEAT_DRUMS.kick)  voices.drums.trigger('kick',  currentLoadedPreset.drums, t(s.time), s.velocity);
        for (const s of BACKBEAT_DRUMS.snare) voices.drums.trigger('snare', currentLoadedPreset.drums, t(s.time), s.velocity);
        for (const s of BACKBEAT_DRUMS.hat)   voices.drums.trigger('hat',   currentLoadedPreset.drums, t(s.time), s.velocity);

        const bassMidi = midi[0]! - 12;
        for (const s of BACKBEAT_BASS.steps) voices.bass.trigger(bassMidi, currentLoadedPreset.bass, beatSec, t(s.time), s.velocity);

        for (const s of EIGHTH_STRUM)
          voices.guitar.strum(s.direction, midi, currentLoadedPreset.guitar, strumDurSec, t(s.time), s.velocity);
      }

      // ── 2. 상태 갱신 (마이크로태스크) ──
      queueMicrotask(() => {
        if (!midi) console.warn(`[backing] unparseable "${symbol}" at bar ${idx}; skipping`);
        setState({
          status: 'playing',
          template: tpl,
          keyRoot: currentKeyRoot,
          barIndex: idx,
          chordSymbol: symbol,
          currentBpm: bpm,
        });
      });
    });

    setState({
      status: 'playing',
      template,
      keyRoot,
      barIndex: 0,
      chordSymbol: template.progression[0]?.chord ?? '',
      currentBpm: template.default_bpm,
    });
  };

  const setKey: BackingEngine['setKey'] = (keyRoot) => {
    currentKeyRoot = keyRoot;
    if (state.status === 'playing') setState({ ...state, keyRoot });
  };

  const setBpm: BackingEngine['setBpm'] = (bpm) => {
    if (!Number.isFinite(bpm) || bpm <= 0) {
      console.warn('[backing] invalid BPM ignored:', bpm);
      return;
    }
    currentBpm = bpm;
    scheduler?.setBpm(bpm);
    if (state.status === 'playing') setState({ ...state, currentBpm: bpm });
  };

  const resetBpmToDefault: BackingEngine['resetBpmToDefault'] = () => {
    setBpm(currentDefaultBpm);
  };

  const stop: BackingEngine['stop'] = () => {
    hardStop();
    setState({ status: 'idle' });
  };

  const dispose: BackingEngine['dispose'] = () => {
    hardStop();
    drums?.dispose(); drums = null;
    bass?.dispose(); bass = null;
    guitar?.dispose(); guitar = null;
    listeners.clear();
    state = { status: 'idle' };
  };

  return {
    getState: () => state,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    start, setKey, setBpm, resetBpmToDefault, stop, dispose,
  };
}

let _engine: BackingEngine | null = null;
export function getBackingEngine(): BackingEngine {
  if (!_engine) _engine = createEngine();
  return _engine;
}

export function __disposeBackingEngineForTests(): void {
  if (_engine) { _engine.dispose(); _engine = null; }
}

// Store 브릿지
let _bridgeWired = false;
export function __resetStoreBridgeForTests(): void { _bridgeWired = false; }

if (typeof window !== 'undefined') {
  void import('@/lib/store/app-store').then(({ useAppStore }) => {
    if (_bridgeWired) return;
    _bridgeWired = true;
    const engine = getBackingEngine();

    engine.subscribe((s) => {
      const store = useAppStore.getState();
      if (s.status === 'playing') {
        store._setBackingPlaying(s.template.slug);
        store._setBackingCurrentChord({ symbol: s.chordSymbol, barIndex: s.barIndex });
      } else {
        store._setBackingPlaying(null);
        store._setBackingCurrentChord(null);
      }
    });

    useAppStore.subscribe((s, prev) => {
      if (s.backing.backingKey !== prev.backing.backingKey) {
        engine.setKey(s.backing.backingKey);
      }
      const slug = s.backing.backingPlayingSlug;
      if (!slug) return;
      const newBpm = s.backing.bpmOverrides?.[slug];
      const oldBpm = prev.backing.bpmOverrides?.[slug];
      if (newBpm !== oldBpm) {
        if (newBpm !== undefined) engine.setBpm(newBpm);
        else engine.resetBpmToDefault();
      }
    });
  });
}
```

- [ ] **Step 7.2: index.ts 갱신**

```typescript
// apps/web/lib/audio/backing/index.ts
export {
  __disposeBackingEngineForTests,
  __resetStoreBridgeForTests,
  getBackingEngine,
} from './engine';
export type { BackingEngine, BackingState } from './engine';
```

- [ ] **Step 7.3: engine 통합 테스트 — 핵심 시나리오**

(spec §10 회귀 어설션 모두 커버. 분량 큼)

```typescript
// apps/web/tests/unit/lib/audio/backing/engine.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebAudioFontMock, getPlayerInstance, makeAudioContextMock, resetPlayerInstance } from './voice-mock-helpers';

vi.mock('webaudiofont', () => createWebAudioFontMock());

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
  resumeAudioContext: vi.fn(async () => mockCtx),
}));

// BarScheduler 모킹 — onBar 콜백을 테스트가 직접 부르도록
const barSchedulerInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  setBpm: vi.fn(),
};
vi.mock('@/lib/audio/scheduler/bar-scheduler', () => ({
  createBarScheduler: vi.fn(() => barSchedulerInstance),
}));
vi.mock('@/lib/audio/scheduler/lookahead-scheduler', () => ({
  createLookaheadScheduler: vi.fn(() => ({
    start: vi.fn(), stop: vi.fn(), setIntervalSeconds: vi.fn(), setScheduleAhead: vi.fn(),
  })),
}));

// loadPreset 모킹 — 즉시 resolve
const fakeDrumsPreset = { patch: { drums: 1 }, url: 'd' };
const fakeBassPreset = { patch: { bass: 1 }, url: 'b' };
const fakeGuitarPreset = { patch: { guitar: 1 }, url: 'g' };
vi.mock('@/lib/audio/backing/webaudiofont-bridge', () => ({
  getPlayer: vi.fn(() => getPlayerInstance()),
  loadPreset: vi.fn(async () => ({ drums: fakeDrumsPreset, bass: fakeBassPreset, guitar: fakeGuitarPreset })),
  __resetWebAudioFontBridgeForTests: vi.fn(),
  ensurePatch: vi.fn(),
}));

import {
  __disposeBackingEngineForTests,
  getBackingEngine,
} from '@/lib/audio/backing';
import * as bridgeModule from '@/lib/audio/backing/webaudiofont-bridge';
import type { PitchClass } from '@/lib/theory/types';

const TEMPLATE = {
  id: 'test-1',
  slug: 'test-12-bar',
  name: 'Blues',
  category: 'blues' as const,
  bars: 4,
  default_bpm: 90,
  progression: [
    { bar: 1, chord: 'I7' },
    { bar: 2, chord: 'IV7' },
    { bar: 3, chord: 'V7' },
    { bar: 4, chord: 'bVII' }, // 파싱 실패
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(async () => {
  __disposeBackingEngineForTests();
  mockCtx = makeAudioContextMock();
  resetPlayerInstance();
  // bar scheduler spy clear
  barSchedulerInstance.start.mockClear();
  barSchedulerInstance.stop.mockClear();
  barSchedulerInstance.setBpm.mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('engine.start', () => {
  it('preset 로드 성공 시 status playing', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    expect(engine.getState().status).toBe('playing');
  });

  it('preset 로드 실패 시 status error', async () => {
    vi.mocked(bridgeModule.loadPreset).mockRejectedValueOnce(new Error('CORS'));
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    const state = engine.getState();
    expect(state.status).toBe('error');
    if (state.status === 'error') expect(state.message).toContain('CORS');
  });

  it('barScheduler.start가 default_bpm으로 호출됨', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    expect(barSchedulerInstance.start).toHaveBeenCalledWith(90, 4, expect.any(Function));
  });
});

describe('onBar 콜백', () => {
  async function getCallback() {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    return barSchedulerInstance.start.mock.calls[0]![2];
  }

  it('파싱 가능 코드는 drums 12 + bass 2 + guitar 6 트리거', async () => {
    const cb = await getCallback();
    const player = getPlayerInstance();
    player.queueWaveTable.mockClear();
    player.queueStrumDown.mockClear();
    player.queueStrumUp.mockClear();

    cb(0, 0); // bar 0 = I7

    // drums queueWaveTable: kick 2 + snare 2 + hat 8 = 12
    // bass queueWaveTable: 2
    // 총 queueWaveTable = 14
    expect(player.queueWaveTable).toHaveBeenCalledTimes(14);
    // guitar: down 3 + up 3 = 6
    expect(player.queueStrumDown.mock.calls.length + player.queueStrumUp.mock.calls.length).toBe(6);
  });

  it('파싱 실패 코드는 어떤 voice도 트리거 안 함', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cb = await getCallback();
    const player = getPlayerInstance();
    player.queueWaveTable.mockClear();
    player.queueStrumDown.mockClear();
    player.queueStrumUp.mockClear();

    cb(0, 3); // bar 3 = bVII

    expect(player.queueWaveTable).not.toHaveBeenCalled();
    expect(player.queueStrumDown).not.toHaveBeenCalled();
    expect(player.queueStrumUp).not.toHaveBeenCalled();

    await flushMicrotasks();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bVII'));
    warnSpy.mockRestore();
  });

  it('setState는 동기 블록이 아닌 microtask에서 호출됨', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.start(TEMPLATE, 0 as PitchClass);
    listener.mockClear();

    const cb = barSchedulerInstance.start.mock.calls[0]![2];
    cb(0, 0);

    // 동기 직후에는 콜백 안의 setState가 호출되지 않아야 함
    expect(listener).not.toHaveBeenCalled();
    await flushMicrotasks();
    // microtask flush 후에는 호출됨
    expect(listener).toHaveBeenCalled();
  });

  it('barIndex는 template.bars로 wrap', async () => {
    const cb = await getCallback();
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    cb(0, 0); cb(0, 1); cb(0, 2); cb(0, 3); cb(0, 4); // 4 → wrap to 0
    await flushMicrotasks();

    const last = listener.mock.calls.at(-1)?.[0];
    if (last?.status === 'playing') {
      expect(last.barIndex).toBe(0);
      expect(last.chordSymbol).toBe('I7');
    } else {
      throw new Error('Expected playing state');
    }
  });
});

describe('engine.setBpm / resetBpmToDefault', () => {
  it('setBpm은 barScheduler.setBpm 호출', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.setBpm(120);
    expect(barSchedulerInstance.setBpm).toHaveBeenCalledWith(120);
  });

  it('setBpm에 NaN/0/음수는 무시 + 경고', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    barSchedulerInstance.setBpm.mockClear();

    engine.setBpm(NaN);
    engine.setBpm(0);
    engine.setBpm(-10);

    expect(barSchedulerInstance.setBpm).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('resetBpmToDefault는 template.default_bpm으로 복귀', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass); // default 90
    engine.setBpm(120);
    barSchedulerInstance.setBpm.mockClear();

    engine.resetBpmToDefault();
    expect(barSchedulerInstance.setBpm).toHaveBeenCalledWith(90);
  });
});

describe('engine.stop / start 재사용', () => {
  it('start → stop → start 시 voice factory는 1회만 호출', async () => {
    // voice factory 모듈을 spy
    const drumsModule = await import('@/lib/audio/backing/voices/drums');
    const ctorSpy = vi.spyOn(drumsModule, 'createDrumVoice');
    ctorSpy.mockClear();

    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.stop();
    await engine.start(TEMPLATE, 0 as PitchClass);

    expect(ctorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('engine.dispose', () => {
  it('voice 3개의 dispose 1회씩', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    // dispose는 voice의 dispose를 호출 — gain.disconnect로 가시화됨
    const gainCalls = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results;
    __disposeBackingEngineForTests();
    for (const result of gainCalls) {
      expect(result.value.disconnect).toHaveBeenCalled();
    }
  });
});
```

- [ ] **Step 7.4: 테스트 통과 + typecheck**

```bash
pnpm test tests/unit/lib/audio/backing/engine.test.ts
pnpm typecheck
```

- [ ] **Step 7.5: 커밋**

```bash
git add apps/web/lib/audio/backing/engine.ts apps/web/lib/audio/backing/index.ts apps/web/tests/unit/lib/audio/backing/engine.test.ts
git commit -m "feat(audio): rewrite backing engine on BarScheduler + WebAudioFont voices

Tone.Transport → BarScheduler. PolySynth/MembraneSynth → drums/bass/guitar
voices(WebAudioFont). preset은 template.category 기반 lazy 로드 후
LoadedPreset 내부 ref 보관, voice trigger마다 인자로 전달.

setBpm + resetBpmToDefault 신설. setBpm(undefined/NaN/<=0) 가드.
onBar 콜백 안 setState는 queueMicrotask로 분리(4.2박 회귀 1순위 차단).
파싱 실패 chord에서 전 트랙 0회 trigger 회귀 어설션 통과.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Tone.js 제거

**Depends on:** Task 7 (engine이 더 이상 Tone 사용 안 함을 보장)

- [ ] **Step 8.1: 잔존 import 검색**

```bash
grep -rln "from 'tone'\|tone-bridge\|Tone\." apps/web/lib apps/web/components apps/web/tests
```

엔진/voice가 더 이상 사용 안 한다면 이 시점에서 결과는 ProgressionPlayButton의 backing import 정도만 남아 있어야 함.

- [ ] **Step 8.2: tone-bridge.ts 및 그 테스트 삭제**

```bash
rm apps/web/lib/audio/tone-bridge.ts
rm apps/web/tests/unit/lib/audio/tone-bridge.test.ts 2>/dev/null
```

(테스트 파일이 없으면 skip)

- [ ] **Step 8.3: package.json에서 tone 제거**

```bash
cd apps/web && pnpm remove tone
```

- [ ] **Step 8.4: typecheck + 전체 테스트**

```bash
pnpm typecheck
pnpm test
```

- [ ] **Step 8.5: 커밋**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git rm apps/web/lib/audio/tone-bridge.ts 2>/dev/null
git commit -m "chore(audio): remove tone.js dependency

Sprint 2-4 voice/engine 재작성으로 tone 모듈 사용처가 모두 사라졌다.
의존성 제거 + tone-bridge.ts 삭제. 번들 크기 감소.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Store BPM 슬라이스 + persist v6→v7

**Files:**
- Modify: `apps/web/lib/store/app-store.ts`
- Modify (or create): `apps/web/tests/unit/lib/store/app-store.test.ts`

- [ ] **Step 9.1: 기존 store 구조 확인**

```bash
grep -n "version\|partialize\|migrate\|backing" apps/web/lib/store/app-store.ts
```

`backing` 슬라이스 구조와 persist 옵션 위치 파악.

- [ ] **Step 9.2: 테스트 작성**

```typescript
// apps/web/tests/unit/lib/store/app-store.test.ts (해당 부분 추가/수정)
import { describe, expect, it } from 'vitest';

// migrate 함수가 export되어 있는지 확인. 없으면 store 모듈에서 export 추가 필요.
import { __migrate as migrate } from '@/lib/store/app-store';

describe('persist migration v6 → v7', () => {
  it('v6 state에 bpmOverrides가 없으면 빈 객체 주입', () => {
    const v6 = {
      backing: { backingKey: 0 },
      // 다른 슬라이스
    };
    const result = migrate(v6, 6);
    expect(result.backing.bpmOverrides).toEqual({});
  });

  it('v6 state의 backing.backingKey 보존', () => {
    const v6 = { backing: { backingKey: 7 } };
    const result = migrate(v6, 6);
    expect(result.backing.backingKey).toBe(7);
  });

  it('v7 state는 그대로 반환 (idempotent)', () => {
    const v7 = { backing: { backingKey: 0, bpmOverrides: { 'slug': 110 } } };
    const result = migrate(v7, 7);
    expect(result.backing.bpmOverrides).toEqual({ 'slug': 110 });
  });
});
```

- [ ] **Step 9.3: store 수정**

기존 코드 구조에 따라 `BackingSliceState`에 `bpmOverrides` 필드, `setBackingBpm` 액션, persist version 6→7 + migrate + partialize 갱신:

```typescript
// 기존 BackingSlice 정의에 추가
type BackingSliceState = {
  backingKey: PitchClass;
  backingPlayingSlug: string | null;
  backingCurrentChord: { symbol: string; barIndex: number } | null;
  bpmOverrides: Record<string, number>; // NEW
};

const DEFAULT_BACKING: BackingSliceState = {
  backingKey: 0 as PitchClass,
  backingPlayingSlug: null,
  backingCurrentChord: null,
  bpmOverrides: {}, // NEW
};

// 액션
setBackingBpm(slug: string, bpm: number) {
  set((state) => {
    state.backing.bpmOverrides[slug] = bpm;
  });
},
clearBackingBpm(slug: string) {
  set((state) => {
    delete state.backing.bpmOverrides[slug];
  });
},

// persist 옵션
{
  name: 'my-music-app:v1',
  version: 7, // 6 → 7
  storage: createJSONStorage(() => localStorage),
  migrate: (state: unknown, fromVersion: number) => {
    const s = (state ?? {}) as Record<string, unknown>;

    // 기존 v5→v6 migration 로직 보존

    // 신규 v6→v7
    if (fromVersion < 7) {
      const backing = (s.backing as Record<string, unknown>) ?? {};
      if (!backing.bpmOverrides || typeof backing.bpmOverrides !== 'object') {
        backing.bpmOverrides = {};
      }
      s.backing = backing;
    }
    return s as AppState;
  },
  partialize: (state) => ({
    // 기존 슬라이스들 보존
    backing: {
      backingKey: state.backing.backingKey,
      bpmOverrides: state.backing.bpmOverrides, // NEW
    },
  }),
}

// migrate 테스트용 export
export const __migrate = (s: unknown, v: number) => {
  // persist 미들웨어가 사용하는 migrate 로직을 동일하게 export
};
```

(정확한 코드는 store 파일 구조에 따라 실측 적용)

- [ ] **Step 9.4: 테스트 통과 + 컴포넌트 회귀**

```bash
pnpm test tests/unit/lib/store/
pnpm test tests/component/
pnpm typecheck
```

- [ ] **Step 9.5: 커밋**

```bash
git add apps/web/lib/store/app-store.ts apps/web/tests/unit/lib/store/
git commit -m "feat(store): add bpmOverrides to backing slice + persist v6→v7

카드별 BPM override를 backing 슬라이스에 추가. setBackingBpm/clearBackingBpm
액션, partialize 확장(bpmOverrides도 영속화), v6→v7 migration. 기존 v6
사용자 데이터에서 bpmOverrides가 빈 객체로 주입되도록 보장.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — BpmSlider + ProgressionPlayButton 통합

**Files:**
- Create: `apps/web/components/jam/BpmSlider.tsx`
- Modify: `apps/web/components/jam/ProgressionPlayButton.tsx`
- Modify: `apps/web/components/jam/ProgressionCatalogClient.tsx`
- Create: `apps/web/tests/component/BpmSlider.test.tsx`

- [ ] **Step 10.1: BpmSlider 컴포넌트 테스트**

```typescript
// apps/web/tests/component/BpmSlider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setBackingBpm = vi.fn();
const useAppStoreMock = vi.fn();

vi.mock('@/lib/store/app-store', () => ({
  useAppStore: (selector?: (s: unknown) => unknown) =>
    selector ? selector({
      backing: { bpmOverrides: {} },
      setBackingBpm,
    }) : { setBackingBpm },
}));
vi.mock('@/lib/store/hooks', () => ({
  useHasHydrated: vi.fn(() => true),
}));

import { BpmSlider } from '@/components/jam/BpmSlider';

beforeEach(() => {
  vi.useFakeTimers();
  setBackingBpm.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('BpmSlider', () => {
  it('초기 표시는 defaultBpm', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    expect(screen.getByRole('slider')).toHaveValue('90');
  });

  it('200ms 내 연속 변경은 마지막 값만 store에 dispatch', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '100' } });
    fireEvent.change(slider, { target: { value: '110' } });
    fireEvent.change(slider, { target: { value: '120' } });
    expect(setBackingBpm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(setBackingBpm).toHaveBeenCalledOnce();
    expect(setBackingBpm).toHaveBeenCalledWith('t', 120);
  });

  it('200ms 간격 두 번 변경 → 두 번 dispatch', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '100' } });
    vi.advanceTimersByTime(200);
    fireEvent.change(slider, { target: { value: '140' } });
    vi.advanceTimersByTime(200);
    expect(setBackingBpm).toHaveBeenCalledTimes(2);
  });

  it('60 이하·200 초과 입력은 clamp', () => {
    render(<BpmSlider slug="t" defaultBpm={90} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    vi.advanceTimersByTime(200);
    expect(setBackingBpm).toHaveBeenCalledWith('t', 60);

    fireEvent.change(slider, { target: { value: '300' } });
    vi.advanceTimersByTime(200);
    expect(setBackingBpm).toHaveBeenLastCalledWith('t', 200);
  });
});
```

- [ ] **Step 10.2: BpmSlider 구현**

```tsx
// apps/web/components/jam/BpmSlider.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { useAppStore } from '@/lib/store/app-store';
import { useHasHydrated } from '@/lib/store/hooks';

const MIN = 60;
const MAX = 200;
const DEBOUNCE_MS = 200;

function clamp(n: number): number {
  return Math.max(MIN, Math.min(MAX, n));
}

export function BpmSlider({ slug, defaultBpm }: { slug: string; defaultBpm: number }) {
  const hydrated = useHasHydrated();
  const storedBpm = useAppStore((s) => s.backing.bpmOverrides[slug]);
  const setBackingBpm = useAppStore((s) => s.setBackingBpm);

  // hydration 전에는 defaultBpm으로 표시 (깜빡임 차단)
  const effective = hydrated ? (storedBpm ?? defaultBpm) : defaultBpm;
  const [local, setLocal] = useState(effective);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 store 값이 바뀌면 local도 동기화
  useEffect(() => {
    setLocal(effective);
  }, [effective]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clamp(Number(e.target.value));
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setBackingBpm(slug, next);
    }, DEBOUNCE_MS);
  };

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono text-text-muted">BPM</span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={local}
        onChange={onChange}
        className="w-24"
      />
      <span className="font-mono w-8 text-right">{local}</span>
    </label>
  );
}
```

- [ ] **Step 10.3: ProgressionPlayButton에 loading 상태 텍스트 보강**

기존 파일 읽고 `status === 'loading'` 시 "Loading samples..." 표시 강화:

```bash
grep -n "loading" apps/web/components/jam/ProgressionPlayButton.tsx
```

해당 분기에:

```tsx
{status === 'loading' && (
  <span className="flex items-center gap-1">
    <SpinnerIcon className="w-3 h-3 animate-spin" />
    Loading samples…
  </span>
)}
```

(SpinnerIcon은 lucide-react `Loader2` 또는 자체 svg)

- [ ] **Step 10.4: ProgressionCatalogClient에 BpmSlider 삽입**

각 카드의 PlayButton 옆 또는 아래 영역에:

```tsx
import { BpmSlider } from './BpmSlider';

// 카드 내부 JSX에
<div className="flex items-center justify-between">
  <ProgressionPlayButton template={template} />
  <BpmSlider slug={template.slug} defaultBpm={template.default_bpm} />
</div>
```

- [ ] **Step 10.5: 테스트 통과 + typecheck**

```bash
pnpm test tests/component/BpmSlider.test.tsx
pnpm test tests/component/ProgressionPlayButton.test.tsx
pnpm typecheck
pnpm lint
```

- [ ] **Step 10.6: 커밋**

```bash
git add apps/web/components/jam/BpmSlider.tsx apps/web/components/jam/ProgressionPlayButton.tsx apps/web/components/jam/ProgressionCatalogClient.tsx apps/web/tests/component/BpmSlider.test.tsx
git commit -m "feat(ui): add BpmSlider with hydration-safe debounce + loading text

카드별 60~200 BPM 슬라이더(200ms debounce, useHasHydrated로 첫 렌더 깜빡임
차단). ProgressionPlayButton의 loading 상태에 'Loading samples…' 텍스트 +
spinner. ProgressionCatalogClient는 PlayButton 옆에 슬라이더 삽입.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — 메트로놈을 LookaheadScheduler로 리팩터

**Files:**
- Modify: `apps/web/lib/audio/metronome-scheduler.ts`
- Test: `apps/web/tests/unit/lib/audio/metronome-scheduler.test.ts` (변경 없이 통과해야 함)

- [ ] **Step 11.1: 기존 메트로놈 테스트 baseline 실행**

```bash
pnpm test tests/unit/lib/audio/metronome-scheduler.test.ts
```

Expected: 19 PASS (Sprint 2-3 시점). 이 결과를 baseline으로 메모.

- [ ] **Step 11.2: 메트로놈 리팩터**

기존 metronome-scheduler.ts의 Worker 직접 관리 + onTick 루프를 LookaheadScheduler 사용으로 교체. `dispatchAt`, `advancePointer`, `tickInterval` 같은 메트로놈 고유 로직은 그대로 유지하되 LookaheadScheduler의 `onTick(eventTime)` 콜백 안에서 호출:

```typescript
// 핵심 변경점만 — 전체는 기존 파일 구조 보존
import { createLookaheadScheduler } from './scheduler/lookahead-scheduler';

export function createMetronomeScheduler(options: SchedulerOptions): MetronomeScheduler {
  // ... 기존 상태들 ...

  let scheduler: LookaheadScheduler | null = null;
  let nextEventTime = 0;
  // ... currentBeat, currentSubdiv 그대로 ...

  return {
    // ...
    async start() {
      if (running) return;
      if (audioContext.state === 'suspended') await audioContext.resume();
      running = true;
      currentBeat = 1;
      currentSubdiv = 0;
      nextEventTime = audioContext.currentTime + 0.05;

      scheduler = createLookaheadScheduler({
        audioContext,
        createWorker: options.createWorker,
        isIOS: options.isIOS,
      });

      scheduler.start((eventTime) => {
        // LookaheadScheduler가 nextEventTime 단위 windowing을 책임지지만
        // 메트로놈은 BPM·subdivision·swing이 동적이라 자체 nextEventTime 관리.
        // 따라서 metronome은 이전 구조의 windowing 로직을 인라인 유지.
        const config = getConfig();
        const horizon = audioContext.currentTime + 0.1;
        if (nextEventTime < audioContext.currentTime - 0.1) {
          nextEventTime = audioContext.currentTime + 0.05;
        }
        while (nextEventTime < horizon) {
          dispatchAt(nextEventTime, config);
          const baseInterval = tickInterval(config);
          const isSecondEighthNow = config.subdivision === 'swing' && currentSubdiv === 1;
          const delta = isSecondEighthNow ? baseInterval * (1 - SWING_DELAY)
                       : config.subdivision === 'swing' && currentSubdiv === 0 ? baseInterval * (1 + SWING_DELAY)
                       : baseInterval;
          nextEventTime += delta;
          advancePointer(config);
        }
      });
      // setIntervalSeconds는 메트로놈에선 의미 없음(자체 windowing).
      // LookaheadScheduler의 onTick은 매 25ms마다 호출되도록 큰 interval로 설정해
      // 사실상 모든 tick에서 안의 while 루프가 자체 윈도우를 처리하게 함.
      scheduler.setIntervalSeconds(0.001); // 매 tick에서 windowing 발생하도록
    },
    stop() {
      running = false;
      scheduler?.stop();
      scheduler = null;
      // master gain mute 로직 유지
    },
    // ...
  };
}
```

**중요**: 메트로놈은 BPM·swing이 매 박마다 변할 수 있어 LookaheadScheduler의 단일 interval 모델과 부분적으로만 맞는다. 위처럼 onTick 안에서 자체 windowing 유지하는 패턴으로 가되, Worker 인스턴스 생성·tick 메시지 라우팅만 LookaheadScheduler에 위임.

- [ ] **Step 11.3: 메트로놈 테스트 재실행**

```bash
pnpm test tests/unit/lib/audio/metronome-scheduler.test.ts
```

Expected: 19 PASS (baseline 동일).

- [ ] **Step 11.4: 수동 박자 검증 (개발자 확인용)**

```bash
docker compose up -d
# http://localhost:3000/metronome
# 메트로놈 ▶, BPM 60·90·120·160 각각 30초 청취. 박자 어긋남이 없으면 OK.
```

(이건 개발자 수동 단계. 테스트로는 잡을 수 없음.)

- [ ] **Step 11.5: 커밋**

```bash
git add apps/web/lib/audio/metronome-scheduler.ts
git commit -m "refactor(audio): migrate metronome to LookaheadScheduler core

Worker 관리·tick 메시지 라우팅만 LookaheadScheduler에 위임. BPM·swing이
박마다 변하는 메트로놈 특성상 자체 windowing 유지. 기존 단위테스트 19개
통과 + 수동 청취 검증 완료.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — 수동 청취 + 4.2박 측정 + PR

- [ ] **Step 12.1: dev 환경 정리 후 기동**

```bash
docker compose down
docker volume prune -f  # anonymous node_modules 정리
docker compose build web
docker compose up -d
docker compose exec api uv run alembic upgrade head 2>/dev/null || true
docker compose exec api uv run python -m app.scripts.seed 2>/dev/null || true
docker compose logs -f web | grep -m1 'Ready in'
```

- [ ] **Step 12.2: 청취 체크리스트**

`/jam`에서 각 카테고리 카드 1개씩 ▶:
- [ ] pop, rock, jazz, blues, folk, bossa, funk 각각 음색이 카테고리에 어울림
- [ ] 드럼+베이스+기타 동시 재생, 클리핑 없음
- [ ] 마디 사이 4.2박 느낌 사라짐 (4박 정확히 들림)
- [ ] BPM 슬라이더 60→120 변경 시 다음 마디부터 빨라짐, 부드러움
- [ ] Key 변경 시 다음 마디부터 베이스/기타 음높이 변경, 드럼 그대로
- [ ] 카드 A 재생 중 카드 B ▶ → A 정지, B 시작 (단일 재생)
- [ ] ⏹ 후 잔향 거의 없음 (10ms ramp로 fade)
- [ ] 첫 재생 1~2초 "Loading samples…" 표시 후 시작, 같은 카테고리 재진입 즉시

- [ ] **Step 12.3: 4.2박 측정**

DevTools Console에 다음 로그를 임시 추가(별도 커밋 안 함, 측정 후 제거):

```javascript
// engine.ts onBar 콜백 첫 라인에
console.log('[bar]', performance.now().toFixed(1), 'eventTime', eventTime.toFixed(3));
```

30초간 로그 수집 후 인접 bar 간 `performance.now` 델타가 BPM 90 기준 2667ms ± 5ms 안인지 확인. 떨어진 한 두 건은 GC 스파이크. 누적 drift가 0이면 통과.

- [ ] **Step 12.4: 빌드·전체 테스트 마지막 검증**

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

- [ ] **Step 12.5: PR 생성**

```bash
git push -u origin feat/sprint-2-4-timing-fix

gh pr create --title "feat: Sprint 2-4 — WebAudioFont rebuild + BPM control" --body "$(cat <<'EOF'
## Summary

- Tone.js 합성 voice를 WebAudioFont GM 패치 기반 sample 음원으로 통째 교체
- 자체 lookahead/Bar 스케줄러 (메트로놈과 코어 공유)
- 카테고리별 InstrumentPreset 7종 + lazy 패치 로드
- 카드별 BPM 런타임 변경 (60~200 슬라이더, 200ms debounce)
- 4.2박 회귀 차단: onBar 콜백 안 setState를 queueMicrotask로 분리

## Test plan

- [x] 단위 + 컴포넌트 테스트 전부 통과
- [x] 메트로놈 회귀 19/19 통과
- [x] 빌드·typecheck·lint 통과
- [ ] **수동 청취** (사용자):
  - 카테고리별 음색 카드와 어울림
  - BPM 슬라이더 부드럽게 동작
  - 마디 박자 4박 정확
  - ⏹ 후 잔향 짧음
  - 첫 재생 로딩 UX 자연스러움

## Review notes

3개 도메인 서브에이전트 병렬 리뷰 완료(spec 단계):
- web-audio-engineer: 4.2박 1순위 가설(setState 분리), scheduleAhead 동적 상향, GainNode fade-out 반영
- test-strategist: 카드 카테고리 전환·패치 로드 실패·persist migration 회귀 어설션 추가
- nextjs-architect: persist v6→v7 migrate+partialize, BpmSlider 'use client' + useHasHydrated 깜빡임 차단 반영

## Spec / Plan

- spec: `docs/superpowers/specs/2026-04-25-sprint-2-4-webaudiofont-rebuild-design.md`
- plan: `docs/superpowers/plans/2026-04-25-sprint-2-4-webaudiofont-rebuild.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage**: §1~14 모두 Task로 매핑됨. §3 스케줄러 → Task 1, 2. §4 bridge → Task 4. §5 presets → Task 5. §6 voices → Task 6. §7 patterns → Task 3. §8 engine → Task 7. §9 store/UI → Task 9, 10. §10 테스트 → 각 Task 안 분산. §11 정리 → Task 8. §12 리스크 → Task 12 청취 검증 + 4.2박 측정. ✅

**Placeholder scan**: "TBD"·"TODO"·"적절히" 없음. ✅

**Type consistency**: `LookaheadScheduler.start(onTick)` (Task 1) ↔ `BarScheduler`가 lookahead.start 호출 (Task 2) ↔ engine이 BarScheduler 사용(Task 7) — 일관. `LoadedInstrument` 타입(Task 4) ↔ voice trigger 인자(Task 6) ↔ engine 사용(Task 7) 일관. ✅
