import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createToneBridgeMock, resetToneBridgeMock } from './voice-mock-helpers';

vi.mock('@/lib/audio/tone-bridge', () => createToneBridgeMock());

vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => ({}) as AudioContext),
  resumeAudioContext: vi.fn(async () => ({}) as AudioContext),
  hasAudioContext: vi.fn(() => true),
  closeAudioContext: vi.fn(),
}));

// Voice factory 3개를 spy로 교체. 통합테스트는 voice 내부 구현에 의존하지 않는다.
const drumVoiceSpy = {
  trigger: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
};
const bassVoiceSpy = {
  trigger: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
};
const keysVoiceSpy = {
  trigger: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('@/lib/audio/backing/voices/drums', () => ({
  createDrumVoice: vi.fn(() => drumVoiceSpy),
}));
vi.mock('@/lib/audio/backing/voices/bass', () => ({
  createBassVoice: vi.fn(() => bassVoiceSpy),
}));
vi.mock('@/lib/audio/backing/voices/keys', () => ({
  createKeysVoice: vi.fn(() => keysVoiceSpy),
}));

import {
  __disposeBackingEngineForTests,
  getBackingEngine,
} from '@/lib/audio/backing';
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
    { bar: 4, chord: 'bVII' }, // 파싱 실패 — 회귀 어설션 핵심
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
  created_at: '2024-01-01T00:00:00Z',
};

async function getInternals() {
  const mod = await import('@/lib/audio/tone-bridge');
  return (mod as unknown as { __mockInternals: ReturnType<typeof createToneBridgeMock>['__mockInternals'] }).__mockInternals;
}

beforeEach(async () => {
  __disposeBackingEngineForTests();
  const internals = await getInternals();
  resetToneBridgeMock(internals);

  drumVoiceSpy.trigger.mockClear();
  drumVoiceSpy.stop.mockClear();
  drumVoiceSpy.dispose.mockClear();
  bassVoiceSpy.trigger.mockClear();
  bassVoiceSpy.stop.mockClear();
  bassVoiceSpy.dispose.mockClear();
  keysVoiceSpy.trigger.mockClear();
  keysVoiceSpy.stop.mockClear();
  keysVoiceSpy.dispose.mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
});

describe('engine.start', () => {
  it('sets Transport.bpm from template.default_bpm', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    expect(internals.transport.bpm.value).toBe(90);
  });

  it('registers a scheduleRepeat callback and starts Transport', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    expect(internals.transport.scheduleRepeat).toHaveBeenCalledOnce();
    expect(internals.transport.start).toHaveBeenCalledOnce();
  });

  it('transitions state to playing', async () => {
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

    const internals = await getInternals();
    internals.transport.stop.mockClear();
    internals.transport.cancel.mockClear();

    await engine.start(TEMPLATE, 5 as PitchClass);

    expect(internals.transport.stop).toHaveBeenCalled();
    expect(internals.transport.cancel).toHaveBeenCalled();
  });
});

describe('scheduled callback — multi-track triggers', () => {
  it('triggers drums 12, bass 2, keys 1 times per parseable bar', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    const cb = internals.scheduledCallbacks[0]!;
    cb(0); // bar 0 — I7

    // drums: kick 2 + snare 2 + hat 8 = 12
    expect(drumVoiceSpy.trigger).toHaveBeenCalledTimes(12);
    expect(bassVoiceSpy.trigger).toHaveBeenCalledTimes(2);
    expect(keysVoiceSpy.trigger).toHaveBeenCalledTimes(1);
  });

  it('passes time + relative offset to each voice trigger', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    const cb = internals.scheduledCallbacks[0]!;
    cb(10);

    // kick step 1 = '0:0:0' (0), step 2 = '0:2:0' (0.5)
    const kickCalls = drumVoiceSpy.trigger.mock.calls.filter(
      (c) => c[0] === 'kick',
    );
    expect(kickCalls).toHaveLength(2);
    expect(kickCalls[0]?.[1]).toBe(10); // base + 0
    expect(kickCalls[1]?.[1]).toBe(10.5); // base + half measure
  });

  it('parsing failure (bVII) triggers NO voice', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    const cb = internals.scheduledCallbacks[0]!;

    // bar 0..2 (parseable), then bar 3 (bVII parsing failure)
    cb(0);
    cb(1);
    cb(2);

    drumVoiceSpy.trigger.mockClear();
    bassVoiceSpy.trigger.mockClear();
    keysVoiceSpy.trigger.mockClear();

    cb(3); // bVII tick

    expect(drumVoiceSpy.trigger).not.toHaveBeenCalled();
    expect(bassVoiceSpy.trigger).not.toHaveBeenCalled();
    expect(keysVoiceSpy.trigger).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bVII'));
    warnSpy.mockRestore();
  });

  it('wraps barIndex back to 0 after template.bars ticks', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    const cb = internals.scheduledCallbacks[0]!;

    for (let i = 0; i < 5; i++) cb(i);

    const lastPlayingState = listener.mock.calls
      .map((c) => c[0])
      .filter((s) => s.status === 'playing')
      .at(-1);
    expect(lastPlayingState?.barIndex).toBe(0);
    expect(lastPlayingState?.chordSymbol).toBe('I7');
    warnSpy.mockRestore();
  });

  it('setKey reflects in next callback for bass/keys; drums unaffected', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    const internals = await getInternals();
    const cb = internals.scheduledCallbacks[0]!;

    cb(0); // bar 0 = I7 in C → bass midi = 48 (C3), keys midi[0] = 60 (C4)
    expect(bassVoiceSpy.trigger.mock.calls[0]?.[0]).toBe(48);
    expect(keysVoiceSpy.trigger.mock.calls[0]?.[0]?.[0]).toBe(60);
    const drumCallsPerBar = drumVoiceSpy.trigger.mock.calls.length;

    drumVoiceSpy.trigger.mockClear();
    bassVoiceSpy.trigger.mockClear();
    keysVoiceSpy.trigger.mockClear();

    engine.setKey(7 as PitchClass); // G로 전조

    // bar 1 = IV7. keyRoot=0 기준이면 root=F(5), keyRoot=7 기준이면 root=C(0).
    cb(1);

    expect(drumVoiceSpy.trigger).toHaveBeenCalledTimes(drumCallsPerBar);
    // IV7 in G = root C(0) → midi[0] = 60, bass = 48
    expect(bassVoiceSpy.trigger.mock.calls[0]?.[0]).toBe(48);
    expect(keysVoiceSpy.trigger.mock.calls[0]?.[0]?.[0]).toBe(60);
  });
});

describe('engine.stop / start sequence', () => {
  it('stop calls voice.stop() on all three voices, not dispose', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.stop();

    expect(drumVoiceSpy.stop).toHaveBeenCalled();
    expect(bassVoiceSpy.stop).toHaveBeenCalled();
    expect(keysVoiceSpy.stop).toHaveBeenCalled();
    expect(drumVoiceSpy.dispose).not.toHaveBeenCalled();
    expect(bassVoiceSpy.dispose).not.toHaveBeenCalled();
    expect(keysVoiceSpy.dispose).not.toHaveBeenCalled();
  });

  it('start → stop → start reuses voices (dispose 0, voice ctor 1)', async () => {
    const drumsModule = await import('@/lib/audio/backing/voices/drums');
    const bassModule = await import('@/lib/audio/backing/voices/bass');
    const keysModule = await import('@/lib/audio/backing/voices/keys');
    const drumCtor = vi.mocked(drumsModule.createDrumVoice);
    const bassCtor = vi.mocked(bassModule.createBassVoice);
    const keysCtor = vi.mocked(keysModule.createKeysVoice);

    drumCtor.mockClear();
    bassCtor.mockClear();
    keysCtor.mockClear();

    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);
    engine.stop();
    await engine.start(TEMPLATE, 0 as PitchClass);

    expect(drumCtor).toHaveBeenCalledOnce();
    expect(bassCtor).toHaveBeenCalledOnce();
    expect(keysCtor).toHaveBeenCalledOnce();
    expect(drumVoiceSpy.dispose).not.toHaveBeenCalled();
    expect(bassVoiceSpy.dispose).not.toHaveBeenCalled();
    expect(keysVoiceSpy.dispose).not.toHaveBeenCalled();
  });

  it('stop when already idle is a no-op', () => {
    const engine = getBackingEngine();
    expect(() => engine.stop()).not.toThrow();
    expect(engine.getState().status).toBe('idle');
  });
});

describe('engine.dispose', () => {
  it('disposes all three voices exactly once', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE, 0 as PitchClass);

    __disposeBackingEngineForTests();

    expect(drumVoiceSpy.dispose).toHaveBeenCalledOnce();
    expect(bassVoiceSpy.dispose).toHaveBeenCalledOnce();
    expect(keysVoiceSpy.dispose).toHaveBeenCalledOnce();
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
