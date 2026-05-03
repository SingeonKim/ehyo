import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const TPL = { bars: 8, default_bpm: 170, progression: Array(8).fill({ chord: 'I' }) };

describe('rock punk_8th variant', () => {
  it('selectSlot — main 1-7, climax 8', () => {
    for (let i = 0; i < 7; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'punk_8th')).toBe('punk_main');
    expect(ROCK_RHYTHM.selectSlot(TPL, 7, 'punk_8th')).toBe('punk_climax');
  });

  it('punk_main — hat 8분 8 hits, kick 4박 다, snare 2+4', () => {
    const slot = ROCK_RHYTHM.patterns.punk_main;
    expect(slot).toBeDefined();
    expect(slot!.drums.hat.length).toBe(8);
    expect(slot!.drums.kick).toHaveLength(4);
    expect(slot!.drums.snare).toHaveLength(2);
  });

  it("punk_main — guitar 8 down-only with voicingMode='power'", () => {
    const slot = ROCK_RHYTHM.patterns.punk_main;
    expect(slot!.guitar).toHaveLength(8);
    for (const step of slot!.guitar) {
      expect(step.direction).toBe('down');
      expect(step.voicingMode).toBe('power');
    }
  });

  it('punk_climax — 1박 crash', () => {
    const slot = ROCK_RHYTHM.patterns.punk_climax;
    expect(slot!.drums.crash).toBeDefined();
    expect(slot!.drums.crash![0]!.time).toBe('0:0:0');
  });

  it("punk_climax guitar도 voicingMode='power'", () => {
    const slot = ROCK_RHYTHM.patterns.punk_climax;
    for (const step of slot!.guitar) {
      expect(step.voicingMode).toBe('power');
    }
  });
});
