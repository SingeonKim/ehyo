/**
 * DrumVoice tom/crash dynamic lookup 단위 테스트 — Sprint 11 PR-B.
 *
 * smplr DrumMachine은 kit별로 sample 이름이 다르다.
 * resolveTomNote / resolveCrashNote가 kit별 후보 이름을 순서대로 lookup 후
 * WeakMap 캐시에 저장한다.
 *
 * 드럼 sample audit 결과 (docs/superpowers/notes/2026-05-03-drum-sample-audit.md):
 *   LM-2:    tom-h/m/l/ll/hh, crash = 'crash'
 *   TR-808:  mid-tom/tom-hi/tom-low, crash = 'cymbal'
 *   CR-8000: tom-high/tom-low, crash = 'cymball' (double-L 오타)
 */

import { describe, expect, it, vi } from 'vitest';

// getAudioContext를 mock으로 대체
let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
}));

import { makeAudioContextMock } from '../voice-mock-helpers';
import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

mockCtx = makeAudioContextMock();

function mockDrumMachine(sampleNames: string[]) {
  return {
    sampleNames,
    start: vi.fn().mockReturnValue(() => {}),
  } as any;
}

describe('DrumVoice — tom dynamic lookup', () => {
  it("LM-2 actual names — 'tom' resolves to 'tom-m' (mid)", () => {
    const dm = mockDrumMachine(['kick', 'snare-h', 'tom-h', 'tom-m', 'tom-l']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'tom-m' }));
    voice.dispose();
  });

  it("TR-808 actual names — 'tom' resolves to 'mid-tom'", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'mid-tom', 'tom-hi', 'tom-low']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'mid-tom' }));
    voice.dispose();
  });

  it("CR-8000 actual names — 'tom' resolves to 'tom-low' (no mid available)", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'tom-high', 'tom-low']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'tom-low' }));
    voice.dispose();
  });

  it("'tom' falls back to snare when no tom available", () => {
    const dm = mockDrumMachine(['kick', 'snare']);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0, 0.8);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'snare' }));
    voice.dispose();
  });
});

describe('DrumVoice — crash dynamic lookup', () => {
  it("LM-2 — 'crash' resolves to 'crash' literal", () => {
    const dm = mockDrumMachine(['kick', 'snare-h', 'crash', 'ride']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'crash' }));
    voice.dispose();
  });

  it("TR-808 — 'crash' resolves to 'cymbal'", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'cymbal', 'hihat-close']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'cymbal' }));
    voice.dispose();
  });

  it("CR-8000 — 'crash' resolves to 'cymball' (double-L typo)", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'cymball', 'hihat-closed']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'cymball' }));
    voice.dispose();
  });

  it("'crash' falls back to 'clap' when no cymbal available", () => {
    const dm = mockDrumMachine(['kick', 'snare', 'clap']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'clap' }));
    voice.dispose();
  });

  it("'crash' falls back to snare when no cymbal/clap", () => {
    const dm = mockDrumMachine(['kick', 'snare']);
    const voice = createDrumVoice();
    voice.trigger('crash', dm, 0, 0.9);
    expect(dm.start).toHaveBeenCalledWith(expect.objectContaining({ note: 'snare' }));
    voice.dispose();
  });
});

describe('DrumVoice — lookup cache', () => {
  it('lookup is cached via WeakMap (sampleNames read once per kit)', () => {
    const sampleNames = ['kick', 'snare', 'tom-mid'];
    const dm = mockDrumMachine(sampleNames);
    const voice = createDrumVoice();
    voice.trigger('tom', dm, 0);
    voice.trigger('tom', dm, 0.1);
    voice.trigger('tom', dm, 0.2);
    expect(dm.start).toHaveBeenCalledTimes(3);
    const notes = (dm.start.mock.calls as Array<[{ note: string }]>).map((c) => c[0].note);
    expect(new Set(notes)).toEqual(new Set(['tom-mid']));
    voice.dispose();
  });
});
