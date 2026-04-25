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
import { createGuitarVoice } from '@/lib/audio/backing/voices/guitar';

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

describe('GuitarVoice', () => {
  it('strum("down", ...)는 queueStrumDown 호출', () => {
    const voice = createGuitarVoice();
    voice.strum('down', [60, 64, 67], { patch: { x: 1 }, url: '' }, 0.4, 1.0, 0.7);
    const player = getPlayerInstance();
    expect(player.queueStrumDown).toHaveBeenCalledOnce();
    expect(player.queueStrumUp).not.toHaveBeenCalled();
    const args = player.queueStrumDown.mock.calls[0]!;
    expect(args[3]).toBe(1.0);                // time
    expect(args[4]).toEqual([60, 64, 67]);    // midiNotes 배열
    expect(args[5]).toBe(0.4);               // durationSec
    expect(args[6]).toBe(0.7);               // velocity
  });

  it('strum("up", ...)는 queueStrumUp 호출', () => {
    const voice = createGuitarVoice();
    voice.strum('up', [60, 64], { patch: {}, url: '' }, 0.3, 2.0);
    const player = getPlayerInstance();
    expect(player.queueStrumUp).toHaveBeenCalledOnce();
    expect(player.queueStrumDown).not.toHaveBeenCalled();
  });

  it('default velocity 0.6', () => {
    const voice = createGuitarVoice();
    voice.strum('down', [60], { patch: {}, url: '' }, 0.3, 1.0);
    expect(getPlayerInstance().queueStrumDown.mock.calls[0]?.[6]).toBe(0.6);
  });
});
