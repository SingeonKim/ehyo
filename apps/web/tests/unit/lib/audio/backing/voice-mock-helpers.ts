/**
 * Sprint 2-4 voice 테스트 공용 헬퍼.
 *
 * webaudiofont는 script 태그로 로드된 글로벌 클래스이므로 테스트에서는
 * globalThis.WebAudioFontPlayer를 직접 mock으로 주입한다.
 * voice 단위테스트와 engine 통합테스트가 공유.
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

export function installPlayerMock(): PlayerMock {
  _instance = makePlayerMock();
  const Ctor = vi.fn(() => _instance);
  (globalThis as { WebAudioFontPlayer?: unknown }).WebAudioFontPlayer = Ctor as unknown;
  return _instance;
}

export function getPlayerInstance(): PlayerMock {
  if (!_instance) throw new Error('Player not yet installed — call installPlayerMock() first');
  return _instance;
}

export function resetPlayerInstance(): void {
  _instance = null;
  delete (globalThis as { WebAudioFontPlayer?: unknown }).WebAudioFontPlayer;
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

/** AudioContext mock. createGain 호출 시 makeGainNodeMock 반환. */
export function makeAudioContextMock(currentTime = 0): AudioContext {
  return {
    currentTime,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => makeGainNodeMock()),
  } as unknown as AudioContext;
}
