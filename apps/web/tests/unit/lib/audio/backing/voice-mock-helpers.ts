/**
 * 멀티트랙 backing 엔진 테스트 공용 헬퍼.
 *
 * voice 단위테스트와 엔진 통합테스트가 공유하는 mock factory. tone-bridge mock에
 * 필요한 모든 synth constructor와 결정론적 Tone.Time을 한 번에 제공한다.
 *
 * 사용법:
 *   ```ts
 *   import { createToneBridgeMock } from '../voice-mock-helpers';
 *   vi.mock('@/lib/audio/tone-bridge', () => createToneBridgeMock());
 *   ```
 *
 * mock 인스턴스에 접근하려면 `await import('@/lib/audio/tone-bridge')` 후
 * `__mockInternals`로 spy 객체들을 가져온다.
 */

import { vi } from 'vitest';

export type SynthMock = {
  toDestination: ReturnType<typeof vi.fn>;
  triggerAttackRelease: ReturnType<typeof vi.fn>;
  triggerRelease: ReturnType<typeof vi.fn>;
  releaseAll: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

export const makeSynthMock = (): SynthMock => {
  const mock = {
    toDestination: vi.fn(),
    triggerAttackRelease: vi.fn(),
    triggerRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn(),
  };
  // toDestination은 자기 자신을 리턴해야 체이닝이 됨.
  mock.toDestination.mockReturnValue(mock);
  return mock;
};

/**
 * Tone.Time(notation).toSeconds() 결정론적 테이블.
 * BPM과 무관하게 한 박 = 0.25 단위 (4/4 마디 = 1.0).
 * 8분 = 0.125, 4분 = 0.25, 1m = 1.0.
 *
 * 임의 단위지만 step 간 상대 비율이 정확하므로 어설션에 충분.
 */
const TIME_TABLE: Record<string, number> = {
  '0:0:0': 0,
  '0:0:2': 0.125,
  '0:1:0': 0.25,
  '0:1:2': 0.375,
  '0:2:0': 0.5,
  '0:2:2': 0.625,
  '0:3:0': 0.75,
  '0:3:2': 0.875,
  '1m': 1,
  '4n': 0.25,
  '8n': 0.125,
  '16n': 0.0625,
  '32n': 0.03125,
};

export type ToneBridgeMockInternals = {
  scheduledCallbacks: Array<(time: number) => void>;
  transport: {
    bpm: { value: number };
    timeSignature: [number, number];
    scheduleRepeat: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  // voice 내부에서 new해서 만드는 synth 인스턴스 — 단위/통합 테스트에서 spy.
  membraneSynth: SynthMock;
  noiseSynth: SynthMock;
  metalSynth: SynthMock;
  monoSynth: SynthMock;
  polySynth: SynthMock;
  // ctor spy — voice가 new MembraneSynth 등을 호출했는지 확인용.
  MembraneSynth: ReturnType<typeof vi.fn>;
  NoiseSynth: ReturnType<typeof vi.fn>;
  MetalSynth: ReturnType<typeof vi.fn>;
  MonoSynth: ReturnType<typeof vi.fn>;
  PolySynth: ReturnType<typeof vi.fn>;
};

export function createToneBridgeMock() {
  const scheduledCallbacks: Array<(time: number) => void> = [];

  const transport = {
    bpm: { value: 0 },
    timeSignature: [4, 4] as [number, number],
    scheduleRepeat: vi.fn((cb: (time: number) => void) => {
      scheduledCallbacks.push(cb);
      return scheduledCallbacks.length;
    }),
    clear: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  };

  const membraneSynth = makeSynthMock();
  const noiseSynth = makeSynthMock();
  const metalSynth = makeSynthMock();
  const monoSynth = makeSynthMock();
  const polySynth = makeSynthMock();

  const MembraneSynth = vi.fn(() => membraneSynth);
  const NoiseSynth = vi.fn(() => noiseSynth);
  const MetalSynth = vi.fn(() => metalSynth);
  const MonoSynth = vi.fn(() => monoSynth);
  const PolySynth = vi.fn(() => polySynth);

  const Time = vi.fn((notation: string) => ({
    toSeconds: vi.fn(() => TIME_TABLE[notation] ?? 0),
  }));

  const toneMock = {
    Transport: transport,
    MembraneSynth,
    NoiseSynth,
    MetalSynth,
    MonoSynth,
    PolySynth,
    Time,
    setContext: vi.fn(),
    now: vi.fn(() => 0),
  };

  const internals: ToneBridgeMockInternals = {
    scheduledCallbacks,
    transport,
    membraneSynth,
    noiseSynth,
    metalSynth,
    monoSynth,
    polySynth,
    MembraneSynth,
    NoiseSynth,
    MetalSynth,
    MonoSynth,
    PolySynth,
  };

  return {
    getTone: () => toneMock,
    bindToneToSharedContext: vi.fn(),
    isToneBound: () => true,
    __resetToneBridgeForTests: vi.fn(),
    __mockInternals: internals,
    __toneMock: toneMock,
  };
}

/** beforeEach에서 mock spy를 일괄 리셋. */
export function resetToneBridgeMock(internals: ToneBridgeMockInternals): void {
  internals.scheduledCallbacks.length = 0;
  internals.transport.bpm.value = 0;
  internals.transport.scheduleRepeat.mockClear();
  internals.transport.clear.mockClear();
  internals.transport.start.mockClear();
  internals.transport.stop.mockClear();
  internals.transport.cancel.mockClear();

  for (const synth of [
    internals.membraneSynth,
    internals.noiseSynth,
    internals.metalSynth,
    internals.monoSynth,
    internals.polySynth,
  ]) {
    synth.toDestination.mockClear();
    synth.toDestination.mockReturnValue(synth);
    synth.triggerAttackRelease.mockClear();
    synth.triggerRelease.mockClear();
    synth.releaseAll.mockClear();
    synth.dispose.mockClear();
  }

  internals.MembraneSynth.mockClear();
  internals.NoiseSynth.mockClear();
  internals.MetalSynth.mockClear();
  internals.MonoSynth.mockClear();
  internals.PolySynth.mockClear();
}
