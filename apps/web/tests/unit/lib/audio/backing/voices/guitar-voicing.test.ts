/**
 * GuitarVoice voicingMode 단위 테스트 — Sprint 11 PR-B.
 *
 * voicingMode='power': root + perfect 5th(7 반음)만 트리거.
 * 5th 부재 시 root only 폴백.
 * voicingMode='full' (default): 기존 동작과 동일, 모든 pitch 트리거.
 */

import { describe, expect, it, vi } from 'vitest';

// getAudioContext를 mock으로 대체 — 실제 AudioContext 생성 없이 테스트
let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { makeAudioContextMock } from '../voice-mock-helpers';
import { createGuitarVoice } from '@/lib/audio/backing/voices/guitar';

// 테스트마다 fresh mock 사용
mockCtx = makeAudioContextMock();

function mockSoundfont() {
  return {
    start: vi.fn().mockReturnValue(() => {}),
  } as any;
}

describe('GuitarVoice — voicingMode', () => {
  it("voicingMode='full' (default) plays all chord pitches", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // C major triad MIDI: C E G = 60 64 67
    voice.strum('down', [60, 64, 67], sf, 0.5, 0, 0.6);
    expect(sf.start).toHaveBeenCalledTimes(3);
    voice.dispose();
  });

  it("voicingMode='power' plays only root + perfect 5th", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // root 60, 3rd 64, 5th 67 — power chord = root + 5th = 60, 67
    voice.strum('down', [60, 64, 67], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(2);
    const notes = (sf.start.mock.calls as Array<[{ note: number }]>).map((c) => c[0].note).sort((a, b) => a - b);
    expect(notes).toEqual([60, 67]);
    voice.dispose();
  });

  it("voicingMode='power' with non-triad voicing still extracts root + p5", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // Imaj7 voicing: 60, 64, 67, 71 — power should still pick 60 + 67
    voice.strum('down', [60, 64, 67, 71], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(2);
    const notes = (sf.start.mock.calls as Array<[{ note: number }]>).map((c) => c[0].note).sort((a, b) => a - b);
    expect(notes).toEqual([60, 67]);
    voice.dispose();
  });

  it("voicingMode='power' fallback when no perfect 5th present", () => {
    const voice = createGuitarVoice();
    const sf = mockSoundfont();
    // diminished triad: C Eb Gb = 60 63 66 — no perfect 5th. power → root only
    voice.strum('down', [60, 63, 66], sf, 0.5, 0, 0.6, 1, 'power');
    expect(sf.start).toHaveBeenCalledTimes(1);
    const note = (sf.start.mock.calls as Array<[{ note: number }]>)[0]![0].note;
    expect(note).toBe(60);
    voice.dispose();
  });
});
