import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getPlayerInstance,
  installPlayerMock,
  makeAudioContextMock,
  resetPlayerInstance,
} from '../voice-mock-helpers';

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

// webaudiofont-bridge의 getPlayer()가 globalThis.WebAudioFontPlayer 인스턴스를
// 반환하도록, bridge 자체는 실제 구현 그대로 두고 globalThis만 mock으로 교체한다.
// bridge 내부 캐시(_player)를 격리하기 위해 테스트마다 reset 함수도 호출.
vi.mock('@/lib/audio/backing/webaudiofont-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audio/backing/webaudiofont-bridge')>();
  return actual;
});

import { __resetWebAudioFontBridgeForTests } from '@/lib/audio/backing/webaudiofont-bridge';
import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
  installPlayerMock();
  // bridge 싱글턴 player 캐시 초기화 (새 globalThis mock 인식)
  __resetWebAudioFontBridgeForTests();
  // installPlayerMock이 globalThis에 새 mock을 심었으므로 다시 주입
  installPlayerMock();
});

afterEach(() => {
  resetPlayerInstance();
  vi.clearAllMocks();
});

/** 테스트용 LoadedDrumKit 픽스처 — kick/snare/hat 각각 별도 패치 객체. */
const fakeDrumKit = {
  kick:  { patch: { kickPatch: true },  url: 'kick-url'  },
  snare: { patch: { snarePatch: true }, url: 'snare-url' },
  hat:   { patch: { hatPatch: true },   url: 'hat-url'   },
};

describe('DrumVoice', () => {
  it('trigger("kick", kit, time, velocity)는 kit.kick.patch를 MIDI 36으로 호출', () => {
    const voice = createDrumVoice();
    voice.trigger('kick', fakeDrumKit, 1.5, 0.7);

    const player = getPlayerInstance();
    expect(player.queueWaveTable).toHaveBeenCalledOnce();
    const args = player.queueWaveTable.mock.calls[0]!;
    expect(args[2]).toBe(fakeDrumKit.kick.patch); // kick 전용 패치
    expect(args[3]).toBe(1.5);                    // time
    expect(args[4]).toBe(36);                     // MIDI kick
    expect(args[6]).toBe(0.7);                    // velocity
  });

  it('trigger("snare")는 kit.snare.patch + MIDI 38', () => {
    const voice = createDrumVoice();
    voice.trigger('snare', fakeDrumKit, 1.0);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[2]).toBe(fakeDrumKit.snare.patch);
    expect(args[4]).toBe(38);
  });

  it('trigger("hat")는 kit.hat.patch + MIDI 42', () => {
    const voice = createDrumVoice();
    voice.trigger('hat', fakeDrumKit, 1.0);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[2]).toBe(fakeDrumKit.hat.patch);
    expect(args[4]).toBe(42);
  });

  it('default velocity 0.8', () => {
    const voice = createDrumVoice();
    voice.trigger('kick', fakeDrumKit, 1.0);
    expect(getPlayerInstance().queueWaveTable.mock.calls[0]?.[6]).toBe(0.8);
  });

  it('dispose는 GainNode disconnect 호출', () => {
    const voice = createDrumVoice();
    voice.dispose();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.disconnect).toHaveBeenCalled();
  });

  it('fadeOut은 gain을 0으로 ramp + dispose 호출 안 함', () => {
    const voice = createDrumVoice();
    voice.fadeOut();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainResult.disconnect).not.toHaveBeenCalled();
  });
});
