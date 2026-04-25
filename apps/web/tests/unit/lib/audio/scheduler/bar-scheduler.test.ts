import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBarScheduler } from '@/lib/audio/scheduler/bar-scheduler';
import type { LookaheadScheduler } from '@/lib/audio/scheduler/lookahead-scheduler';

// LookaheadScheduler의 가짜 구현.
// 실제 Worker 없이 tick을 수동으로 트리거할 수 있도록 __triggerTick을 노출한다.
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
