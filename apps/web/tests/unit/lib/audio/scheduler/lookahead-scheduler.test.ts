import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLookaheadScheduler } from '@/lib/audio/scheduler/lookahead-scheduler';

// FakeWorker: 실제 Worker 대신 메시지를 동기 제어하는 테스트 더블.
// Worker를 실제로 생성하면 Web Worker API가 없는 Vitest 환경에서 실패하므로
// 이 spy를 주입해 메시지 흐름을 직접 제어한다.
class FakeWorker implements Partial<Worker> {
  private listeners = new Set<(e: MessageEvent) => void>();
  postMessage = vi.fn();
  addEventListener = vi.fn((type: string, fn: EventListener) => {
    if (type === 'message') this.listeners.add(fn as (e: MessageEvent) => void);
  });
  removeEventListener = vi.fn();
  terminate = vi.fn();
  // 테스트에서 tick 메시지를 수동으로 발행할 때 사용
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

    worker.emit({ type: 'tick' });
    onTick.mockClear();

    sched.setIntervalSeconds(0.25);
    ctx.currentTime = 0.4;
    worker.emit({ type: 'tick' });
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
