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

vi.mock('@/lib/audio/backing/webaudiofont-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audio/backing/webaudiofont-bridge')>();
  return actual;
});

import { __resetWebAudioFontBridgeForTests } from '@/lib/audio/backing/webaudiofont-bridge';
import { createBassVoice } from '@/lib/audio/backing/voices/bass';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
  installPlayerMock();
  __resetWebAudioFontBridgeForTests();
  installPlayerMock();
});

afterEach(() => {
  resetPlayerInstance();
  vi.clearAllMocks();
});

describe('BassVoice', () => {
  it('trigger(48, preset, 0.5, 1.0, 0.9)는 queueWaveTable을 인자대로 호출', () => {
    const voice = createBassVoice();
    voice.trigger(48, { patch: { p: 1 }, url: '' }, 0.5, 1.0, 0.9);
    const args = getPlayerInstance().queueWaveTable.mock.calls[0]!;
    expect(args[3]).toBe(1.0);  // time
    expect(args[4]).toBe(48);   // midi
    expect(args[5]).toBe(0.5);  // durationSec
    expect(args[6]).toBe(0.9);  // velocity
  });

  it('default velocity 0.9', () => {
    const voice = createBassVoice();
    voice.trigger(40, { patch: {}, url: '' }, 0.5, 1.0);
    expect(getPlayerInstance().queueWaveTable.mock.calls[0]?.[6]).toBe(0.9);
  });

  it('dispose는 GainNode disconnect', () => {
    const voice = createBassVoice();
    voice.dispose();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.disconnect).toHaveBeenCalled();
  });
});
