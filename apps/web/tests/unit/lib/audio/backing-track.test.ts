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

const TEMPLATE = {
  id: 'test-id-001',
  slug: 'test-12-bar',
  name: '12-Bar Blues (Major)',
  category: 'blues' as const,
  bars: 4,
  default_bpm: 90,
  progression: [
    { bar: 1, chord: 'I7' },
    { bar: 2, chord: 'IV7' },
    { bar: 3, chord: 'V7' },
    { bar: 4, chord: 'bVII' },
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
  created_at: '2024-01-01T00:00:00Z',
};

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

    cb(0);
    cb(2);
    cb(4);
    cb(6);

    expect(__polySynthInstance.triggerAttackRelease).toHaveBeenCalledTimes(3);
  });

  it('wraps barIndex back to 0 after template.bars ticks', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.start(TEMPLATE, 0 as PitchClass);

    const { __scheduledCallbacks } = await getMockInternals();
    const cb = __scheduledCallbacks[0]!;

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

    cb(0);
    cb(2);
    cb(4);
    cb(6);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('bVII'),
    );
    expect(engine.getState().status).toBe('playing');
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
