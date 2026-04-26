/**
 * Sprint 2-8 PR-A voice 테스트 공용 헬퍼.
 *
 * smplr mock (SoundfontMock / DrumMachineMock / ReverbMock)과 공통 오디오 mock을 제공한다.
 * 이전 WebAudioFont 기반 PlayerMock/installPlayerMock/getPlayerInstance/resetPlayerInstance는
 * Sprint 2-8 마이그레이션 완료(A5)로 제거됨.
 */

import { vi } from 'vitest';

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

/** AudioContext mock. createGain 호출 시 makeGainNodeMock 반환. */
export function makeAudioContextMock(currentTime = 0): AudioContext {
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => makeGainNodeMock()),
  } as unknown as AudioContext;
}

// ── smplr Soundfont / DrumMachine / Reverb mock (Sprint 2-8 PR-A Task A2) ──
// 실제 smplr 0.20.0 API 시그니처에 맞춘 mock. AudioWorkletNode 의존을 피하기 위해
// Reverb는 단순 GainNode mock으로 대체.

export type SoundfontMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  output: {
    addEffect: ReturnType<typeof vi.fn>;
    sendEffect: ReturnType<typeof vi.fn>;
    addInsert: ReturnType<typeof vi.fn>;
    setVolume: ReturnType<typeof vi.fn>;
  };
  load: Promise<void>;
};

export type DrumMachineMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  output: {
    addEffect: ReturnType<typeof vi.fn>;
    setVolume: ReturnType<typeof vi.fn>;
  };
  load: Promise<void>;
};

/** smplr Reverb는 AudioWorklet 기반이지만 테스트에서는 단순 노드로 대체. */
export type ReverbMock = {
  input: AudioNode;
  connect: ReturnType<typeof vi.fn>;
  ready: () => Promise<unknown>;
  isReady: boolean;
};

/**
 * 실제 smplr Smplr.start()는 StopFn을 반환한다 (dist/index.js:1019-1031).
 * voice가 이 StopFn을 모아 hardStop 시 일괄 호출하므로, mock도 호출 가능한 fn을 반환해야
 * voice 단위 테스트와 engine 통합 테스트가 cancelScheduled 경로를 검증할 수 있다.
 */
export function makeSoundfontMock(): SoundfontMock {
  return {
    start: vi.fn(() => vi.fn()),
    stop: vi.fn(),
    output: {
      addEffect: vi.fn(),
      sendEffect: vi.fn(),
      addInsert: vi.fn(),
      setVolume: vi.fn(),
    },
    load: Promise.resolve(),
  };
}

export function makeDrumMachineMock(): DrumMachineMock {
  return {
    start: vi.fn(() => vi.fn()),
    stop: vi.fn(),
    output: {
      addEffect: vi.fn(),
      setVolume: vi.fn(),
    },
    load: Promise.resolve(),
  };
}

export function makeReverbMock(): ReverbMock {
  const input = makeGainNodeMock() as unknown as AudioNode;
  return {
    input,
    connect: vi.fn(),
    ready: () => Promise.resolve(undefined),
    isReady: true,
  };
}

/**
 * smplr 모듈 자체를 vi.mock으로 주입할 때 쓰는 팩토리.
 * 각 테스트에서 vi.mock('smplr', () => smplrMockFactory()) 패턴.
 *
 * 사용 예:
 *   const smplrMock = installSmplrMock();
 *   vi.mock('smplr', () => ({
 *     get Soundfont() { return smplrMock.Soundfont; },
 *     get DrumMachine() { return smplrMock.DrumMachine; },
 *     get Reverb() { return smplrMock.Reverb; },
 *   }));
 */
export type SmplrMock = {
  Soundfont: ReturnType<typeof vi.fn>;
  DrumMachine: ReturnType<typeof vi.fn>;
  Reverb: ReturnType<typeof vi.fn>;
};

export function installSmplrMock(): SmplrMock {
  return {
    Soundfont: vi.fn(() => makeSoundfontMock()),
    DrumMachine: vi.fn(() => makeDrumMachineMock()),
    Reverb: vi.fn(() => makeReverbMock()),
  };
}
