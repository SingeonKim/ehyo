/**
 * DrumVoice 단위 테스트 — Sprint 2-8 PR-A smplr 마이그레이션.
 *
 * webaudiofont 기반 queueWaveTable 검증 → smplr DrumMachine.start() 검증으로 교체.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeDrumMachineMock, makeAudioContextMock } from '../voice-mock-helpers';

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('DrumVoice (smplr)', () => {
  it('trigger("kick", dm, time, vel)는 dm.start({note: "kick", time, velocity: vel*127})', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('kick', dm as never, 1.5, 0.7);
    expect(dm.start).toHaveBeenCalledWith({
      note: 'kick',
      time: 1.5,
      velocity: Math.round(0.7 * 127),
    });
  });

  it('trigger("snare", ...)는 dm.start({note: "snare", ...})', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('snare', dm as never, 2.0, 0.5);
    expect(dm.start).toHaveBeenCalledWith({
      note: 'snare',
      time: 2.0,
      velocity: Math.round(0.5 * 127),
    });
  });

  it('trigger("hat", ...)는 sample 동적 lookup("hhclosed") + voice 레벨 -30% attenuation', () => {
    // 실제 LM-2 sample 이름은 'hhclosed'. hat은 closed hi-hat 도드라짐 완화 위해
    // voice 레벨에서 0.7 배율 (HAT_VELOCITY_SCALE) 자동 적용.
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('hat', dm as never, 3.0, 0.6);
    expect(dm.start).toHaveBeenCalledWith({
      note: 'hhclosed',
      time: 3.0,
      velocity: Math.round(0.6 * 0.7 * 127),
    });
  });

  it('default velocity 0.8 → 102 (=round(0.8*127))', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('snare', dm as never, 1.0);
    expect(dm.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.8 * 127) }),
    );
  });

  it('velocity 0.5 → 64 (=round(0.5*127))', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('kick', dm as never, 0.0, 0.5);
    expect(dm.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: Math.round(0.5 * 127) }),
    );
  });

  it('velocity > 1 클램핑 → 최대 127', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('kick', dm as never, 0.0, 2.0);
    expect(dm.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: 127 }),
    );
  });

  it('velocity < 0 클램핑 → 최소 0', () => {
    const dm = makeDrumMachineMock();
    const voice = createDrumVoice();
    voice.trigger('kick', dm as never, 0.0, -0.5);
    expect(dm.start).toHaveBeenCalledWith(
      expect.objectContaining({ velocity: 0 }),
    );
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
