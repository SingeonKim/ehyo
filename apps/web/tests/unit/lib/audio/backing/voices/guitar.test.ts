/**
 * GuitarVoice 단위 테스트 — Sprint 2-8 PR-A smplr 마이그레이션.
 *
 * webaudiofont 기반 queueStrumDown/Up 검증 → smplr Soundfont.start() 시간차 호출 검증으로 교체.
 *
 * strum 구현: smplr은 queueStrumDown/Up 헬퍼가 없으므로 12ms 간격으로 각 음을 직접 트리거.
 * down = 저음 먼저(오름차순), up = 고음 먼저(내림차순).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeSoundfontMock, makeAudioContextMock } from '../voice-mock-helpers';

const STRUM_STAGGER_SEC = 0.012; // guitar.ts와 동일한 상수

let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { createGuitarVoice } from '@/lib/audio/backing/voices/guitar';

beforeEach(() => {
  mockCtx = makeAudioContextMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('GuitarVoice (smplr)', () => {
  it('strum("down", 3음)은 sf.start를 오름차순 음 순서로 3회 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    // 정렬 확인을 위해 순서를 섞어서 입력
    voice.strum('down', [67, 60, 64], sf as never, 0.4, 1.0, 0.7);

    expect(sf.start).toHaveBeenCalledTimes(3);
    // down: 저음(60) → 중간(64) → 고음(67) 순서, 12ms 간격
    const calls = (sf.start as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toMatchObject({ note: 60, time: 1.0 });
    expect(calls[1]![0]).toMatchObject({ note: 64, time: 1.0 + STRUM_STAGGER_SEC });
    expect(calls[2]![0]).toMatchObject({ note: 67, time: 1.0 + STRUM_STAGGER_SEC * 2 });
  });

  it('strum("up", 3음)은 sf.start를 내림차순 음 순서로 3회 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    voice.strum('up', [60, 64, 67], sf as never, 0.4, 2.0, 0.7);

    expect(sf.start).toHaveBeenCalledTimes(3);
    // up: 고음(67) → 중간(64) → 저음(60) 순서, 12ms 간격
    const calls = (sf.start as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toMatchObject({ note: 67, time: 2.0 });
    expect(calls[1]![0]).toMatchObject({ note: 64, time: 2.0 + STRUM_STAGGER_SEC });
    expect(calls[2]![0]).toMatchObject({ note: 60, time: 2.0 + STRUM_STAGGER_SEC * 2 });
  });

  it('strum은 각 음에 동일한 velocity와 duration을 적용', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    voice.strum('down', [60, 64, 67], sf as never, 0.4, 0.0, 0.6);

    const calls = (sf.start as ReturnType<typeof vi.fn>).mock.calls;
    const expectedVelocity = Math.round(0.6 * 127);
    for (const call of calls) {
      expect(call[0]).toMatchObject({ duration: 0.4, velocity: expectedVelocity });
    }
  });

  it('default velocity 0.6 → 76 (=round(0.6*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    voice.strum('down', [60], sf as never, 0.3, 1.0);
    const calls = (sf.start as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toMatchObject({ velocity: Math.round(0.6 * 127) });
  });

  it('velocity 0.7 → 89 (=round(0.7*127))', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    voice.strum('down', [60], sf as never, 0.3, 1.0, 0.7);
    expect((sf.start as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toMatchObject({
      velocity: Math.round(0.7 * 127),
    });
  });

  it('6음 down strum은 sf.start 6회 호출', () => {
    const sf = makeSoundfontMock();
    const voice = createGuitarVoice();
    voice.strum('down', [40, 45, 52, 55, 59, 64], sf as never, 0.4, 0.0, 0.6);
    expect(sf.start).toHaveBeenCalledTimes(6);
  });

  it('dispose는 GainNode disconnect 호출', () => {
    const voice = createGuitarVoice();
    voice.dispose();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.disconnect).toHaveBeenCalled();
  });

  it('fadeOut은 gain을 0으로 ramp + dispose 호출 안 함', () => {
    const voice = createGuitarVoice();
    voice.fadeOut();
    const gainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(gainResult.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(gainResult.disconnect).not.toHaveBeenCalled();
  });
});
