/**
 * BassVoice 단위 테스트 — Sprint 2-8 PR-A smplr 마이그레이션.
 *
 * webaudiofont 기반 queueWaveTable 검증 → smplr Soundfont.start() 검증으로 교체.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeSoundfontMock, makeAudioContextMock } from '../voice-mock-helpers';

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { createBassVoice } from '@/lib/audio/backing/voices/bass';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BassVoice (smplr)', () => {
  it('trigger(midi, sf, durationSec, time, velocity)는 sf.start를 정확한 인자로 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createBassVoice();
    voice.trigger(48, sf as never, 0.5, 1.0, 0.9);
    expect(sf.start).toHaveBeenCalledWith({
      note: 48,
      time: 1.0,
      duration: 0.5,
      velocity: Math.round(0.9 * 127),
    });
  });

  it('default velocity 0.9 → 114 (=round(0.9*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createBassVoice();
    voice.trigger(40, sf as never, 0.5, 1.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.9 * 127) }),
    );
  });

  it('velocity 0.5 → 64 (=round(0.5*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createBassVoice();
    voice.trigger(36, sf as never, 0.5, 0.0, 0.5);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.5 * 127) }),
    );
  });

  it('velocity 0.7 → 89 (=round(0.7*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createBassVoice();
    voice.trigger(36, sf as never, 0.5, 0.0, 0.7);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.7 * 127) }),
    );
  });

  it('velocity > 1 클램핑 → 최대 127', () => {
    const sf = makeSoundfontMock();
    const voice = createBassVoice();
    voice.trigger(36, sf as never, 0.5, 0.0, 2.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: 127 }),
    );
  });

  it('dispose는 GainNode disconnect 호출', () => {
    const voice = createBassVoice();
    voice.dispose();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.disconnect).toHaveBeenCalled();
  });

  it('fadeOut은 gain을 0으로 ramp + dispose 호출 안 함', () => {
    const voice = createBassVoice();
    voice.fadeOut();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainResult.disconnect).not.toHaveBeenCalled();
  });
});
