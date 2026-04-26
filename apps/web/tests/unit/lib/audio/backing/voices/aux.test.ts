/**
 * AuxVoice 단위 테스트 — Sprint 2-8 PR-A 신규.
 *
 * shaker(MIDI 60), clave(MIDI 75) 고정 노트로 smplr Soundfont.start()를 트리거하는지 검증.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeSoundfontMock, makeAudioContextMock } from '../voice-mock-helpers';

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { createAuxVoice } from '@/lib/audio/backing/voices/aux';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AuxVoice (smplr)', () => {
  it('trigger(sf, "shaker", time)는 고정 노트 MIDI 60으로 sf.start 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'shaker', 1.5);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ note: 60, time: 1.5 }),
    );
  });

  it('trigger(sf, "clave", time)는 고정 노트 MIDI 75으로 sf.start 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'clave', 2.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ note: 75, time: 2.0 }),
    );
  });

  it('velocity 인자를 0~127으로 변환해서 전달', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'shaker', 0.0, 0.5);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.5 * 127) }),
    );
  });

  it('default velocity 0.6 → 76 (=round(0.6*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'clave', 0.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.6 * 127) }),
    );
  });

  it('velocity 0.7 → 89 (=round(0.7*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'shaker', 0.0, 0.7);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.7 * 127) }),
    );
  });

  it('velocity > 1 클램핑 → 최대 127', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'shaker', 0.0, 2.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: 127 }),
    );
  });

  it('duration은 고정 AUX_NOTE_DURATION_SEC(0.15)를 사용', () => {
    const sf = makeSoundfontMock();
    const voice = createAuxVoice();
    voice.trigger(sf as never, 'clave', 0.0);
    expect(sf.start).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 0.15 }),
    );
  });

  it('dispose는 GainNode disconnect 호출', () => {
    const voice = createAuxVoice();
    voice.dispose();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.disconnect).toHaveBeenCalled();
  });

  it('fadeOut은 gain을 0으로 ramp + dispose 호출 안 함', () => {
    const voice = createAuxVoice();
    voice.fadeOut();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainResult.disconnect).not.toHaveBeenCalled();
  });
});
