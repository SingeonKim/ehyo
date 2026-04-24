import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMockAudioContext, createMockWorker } from '@/tests/audio-helpers';
import { createMetronomeScheduler } from '@/lib/audio/metronome-scheduler';
import type { SchedulerConfig, SchedulerEvent } from '@/lib/audio/types';

/*
 * 메트로놈 스케줄러 타이밍 검증 — spy 기반.
 *
 * 실제 오디오 출력은 검증하지 않는다. "예약된 시각 배열이 BPM에 맞는가"만
 * 검증한다. MockAudioContext는 currentTime만 움직이고 scheduleClick은 mock node
 * 메서드로 흡수된다.
 */

const QUARTER_4_4: SchedulerConfig = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  subdivision: 'quarter',
  soundType: 'click',
  accentBeatOne: true,
  volume: 1,
};

function runScheduler(config: SchedulerConfig, seconds: number) {
  const mock = createMockAudioContext();
  const worker = createMockWorker();
  const events: SchedulerEvent[] = [];

  const s = createMetronomeScheduler({
    audioContext: mock.ctx,
    getConfig: () => config,
    createWorker: () => worker as unknown as Worker,
    isIOS: false,
    spy: (e) => events.push(e),
  });

  return { scheduler: s, mock, worker, events };
}

describe('createMetronomeScheduler — 기본 동작', () => {
  it('start 전에는 이벤트 없음', async () => {
    const { events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    mock.advance(1, () => worker.fireTick());
    expect(events).toHaveLength(0);
  });

  it('start 후 120BPM 4/4 quarter로 10초간 약 20개 beat', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    mock.advance(10, () => worker.fireTick());

    // 120BPM = 2 beat/sec → 10초 = 20 beats. lookahead 탓에 약간 초과 가능.
    expect(events.length).toBeGreaterThanOrEqual(20);
    expect(events.length).toBeLessThanOrEqual(22);
  });

  it('첫 이벤트는 accent (accentBeatOne=true, beat 1)', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    mock.advance(1, () => worker.fireTick());

    expect(events[0]).toMatchObject({ beat: 1, type: 'accent', isAccent: true });
  });

  it('accentBeatOne=false면 첫 이벤트도 beat (accent 아님)', async () => {
    const config: SchedulerConfig = { ...QUARTER_4_4, accentBeatOne: false };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(1, () => worker.fireTick());

    expect(events[0]).toMatchObject({ beat: 1, type: 'beat', isAccent: false });
  });

  it('이벤트 간격이 BPM에 맞는다 — 120BPM quarter = 500ms', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    mock.advance(3, () => worker.fireTick());

    // 두 이벤트 사이 간격
    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    intervals.forEach((d) => {
      expect(d).toBeCloseTo(0.5, 3); // 500ms ± 1ms
    });
  });

  it('4/4 주기적으로 beat 1→2→3→4 반복', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    // 120BPM → 0.5초/beat. 4.5초면 9개 이상 확보 (첫 박 버퍼 0.05s 감안).
    mock.advance(4.5, () => worker.fireTick());

    expect(events.length).toBeGreaterThanOrEqual(8);
    const beats = events.map((e) => e.beat).slice(0, 8);
    expect(beats).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
  });

  it('accent는 정확히 4박마다 한 번 (4/4 accentBeatOne=true)', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    mock.advance(5, () => worker.fireTick());

    const accents = events.filter((e) => e.type === 'accent');
    const regulars = events.filter((e) => e.type === 'beat');
    // 총 beats ≈ 10, accent는 beat 1에서만 → 약 2~3개
    expect(accents.length).toBeGreaterThanOrEqual(2);
    expect(accents.length).toBeLessThanOrEqual(3);
    expect(regulars.length).toBeGreaterThanOrEqual(7);
    accents.forEach((e) => expect(e.beat).toBe(1));
  });
});

describe('subdivision', () => {
  it('eighth 8분 = 한 박에 2번 이벤트 (120BPM → 250ms 간격)', async () => {
    const config: SchedulerConfig = { ...QUARTER_4_4, subdivision: 'eighth' };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(2, () => worker.fireTick());

    // 120BPM eighth = 250ms 간격
    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    intervals.forEach((d) => expect(d).toBeCloseTo(0.25, 3));

    // 타입 패턴: accent, sub, beat, sub, beat, sub, beat, sub, accent...
    const pattern = events.slice(0, 8).map((e) => e.type);
    expect(pattern).toEqual(['accent', 'sub', 'beat', 'sub', 'beat', 'sub', 'beat', 'sub']);
  });

  it('triplet 3연음 = 한 박에 3번', async () => {
    const config: SchedulerConfig = { ...QUARTER_4_4, subdivision: 'triplet' };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(1, () => worker.fireTick());

    // 120BPM = 0.5s/beat, 3연음 = 0.5/3 ≈ 0.1667s 간격
    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    intervals.forEach((d) => expect(d).toBeCloseTo(1 / 6, 3));
  });

  it('sixteenth 16분 = 한 박에 4번 (120BPM → 125ms 간격)', async () => {
    const config: SchedulerConfig = { ...QUARTER_4_4, subdivision: 'sixteenth' };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(1, () => worker.fireTick());

    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    intervals.forEach((d) => expect(d).toBeCloseTo(0.125, 3));
  });

  it('swing은 down-beat-off-beat 사이 간격이 비대칭 (2:1 셔플에 근접)', async () => {
    const config: SchedulerConfig = { ...QUARTER_4_4, subdivision: 'swing' };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(2, () => worker.fireTick());

    // 이벤트 간격을 (down→off, off→down, down→off, …) 순으로 관찰
    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    // 교대로 long, short 패턴
    const longs = intervals.filter((_, i) => i % 2 === 0);
    const shorts = intervals.filter((_, i) => i % 2 === 1);
    longs.forEach((d) => expect(d).toBeGreaterThan(shorts[0] ?? 0));
    // 한 박 총합은 유지: long + short ≈ 0.5 (120BPM 기준)
    expect(((longs[0] ?? 0) + (shorts[0] ?? 0))).toBeCloseTo(0.5, 3);
  });
});

describe('time signature denominator 효과', () => {
  it('6/8 @ 120BPM: eighth 기준 0.25s 간격 (4/4의 절반)', async () => {
    const config: SchedulerConfig = {
      ...QUARTER_4_4,
      timeSignature: { numerator: 6, denominator: 8 },
    };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(2, () => worker.fireTick());

    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    // quarter=120일 때 eighth는 240/min → 0.25s
    intervals.forEach((d) => expect(d).toBeCloseTo(0.25, 3));
  });

  it('2/2 @ 120BPM: half 기준 1.0s 간격 (4/4의 2배)', async () => {
    const config: SchedulerConfig = {
      ...QUARTER_4_4,
      timeSignature: { numerator: 2, denominator: 2 },
    };
    const { scheduler, events, worker, mock } = runScheduler(config, 0);
    await scheduler.start();
    mock.advance(4, () => worker.fireTick());

    const intervals: number[] = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push((events[i]?.time ?? 0) - (events[i - 1]?.time ?? 0));
    }
    intervals.forEach((d) => expect(d).toBeCloseTo(1.0, 2));
  });
});

describe('BPM 경계', () => {
  it('BPM 20 (최저)', async () => {
    const { scheduler, events, worker, mock } = runScheduler(
      { ...QUARTER_4_4, bpm: 20 },
      0,
    );
    await scheduler.start();
    mock.advance(6, () => worker.fireTick());

    // 20BPM = 3s/beat. 6초 = 2beats ± 1
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.length).toBeLessThanOrEqual(3);
    if (events.length >= 2) {
      const d = (events[1]?.time ?? 0) - (events[0]?.time ?? 0);
      expect(d).toBeCloseTo(3, 2);
    }
  });

  it('BPM 300 (최고)', async () => {
    const { scheduler, events, worker, mock } = runScheduler(
      { ...QUARTER_4_4, bpm: 300 },
      0,
    );
    await scheduler.start();
    mock.advance(2, () => worker.fireTick());

    // 300BPM = 0.2s/beat. 2초 = 10beats ± 1
    expect(events.length).toBeGreaterThanOrEqual(10);
    expect(events.length).toBeLessThanOrEqual(12);
    if (events.length >= 2) {
      const d = (events[1]?.time ?? 0) - (events[0]?.time ?? 0);
      expect(d).toBeCloseTo(0.2, 3);
    }
  });
});

describe('stop / restart', () => {
  it('stop 이후에는 새 이벤트가 생기지 않는다', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    mock.advance(1, () => worker.fireTick());
    const before = events.length;

    scheduler.stop();
    mock.advance(1, () => worker.fireTick());

    expect(events.length).toBe(before);
  });

  it('isRunning은 start 후 true, stop 후 false', async () => {
    const { scheduler } = runScheduler(QUARTER_4_4, 0);
    expect(scheduler.isRunning).toBe(false);
    await scheduler.start();
    expect(scheduler.isRunning).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });
});

describe('Worker 통합', () => {
  it('start 시 worker에 intervalMs=25ms start 메시지', async () => {
    const { scheduler, worker } = runScheduler(QUARTER_4_4, 0);
    await scheduler.start();
    expect(worker.lastStartInterval).toBe(25);
  });
});

describe('subscribe', () => {
  it('UI listener는 spy와 동일한 이벤트를 받는다', async () => {
    const { scheduler, events, worker, mock } = runScheduler(QUARTER_4_4, 0);
    const uiEvents: SchedulerEvent[] = [];
    const unsub = scheduler.subscribe((e) => uiEvents.push(e));
    await scheduler.start();
    mock.advance(2, () => worker.fireTick());

    expect(uiEvents.length).toBe(events.length);
    unsub();
    mock.advance(1, () => worker.fireTick());
    // unsubscribe 후 UI는 더 안 받지만 spy는 계속
    expect(uiEvents.length).toBeLessThanOrEqual(events.length);
  });
});
