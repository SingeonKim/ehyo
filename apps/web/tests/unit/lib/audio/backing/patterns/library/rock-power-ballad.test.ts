import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const TPL = { bars: 16, default_bpm: 75, progression: Array(16).fill({ chord: 'I' }) };

describe('rock power_ballad variant', () => {
  it('selectSlot 매핑', () => {
    // 1-4 intro, 5-12 main, 13-15 climax, 16 resolve
    for (let i = 0; i <= 3; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_intro');
    for (let i = 4; i <= 11; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_main');
    for (let i = 12; i <= 14; i++) expect(ROCK_RHYTHM.selectSlot(TPL, i, 'power_ballad')).toBe('pb_climax');
    expect(ROCK_RHYTHM.selectSlot(TPL, 15, 'power_ballad')).toBe('pb_resolve');
  });

  it('pb_intro — sparse: kick 1·3, snare 3, hat 0', () => {
    const slot = ROCK_RHYTHM.patterns.pb_intro;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toHaveLength(2);
    expect(slot!.drums.snare).toHaveLength(1);
    expect(slot!.drums.hat).toHaveLength(0);
  });

  it('pb_climax — hat 8분 8 hits + tom fills', () => {
    const slot = ROCK_RHYTHM.patterns.pb_climax;
    expect(slot!.drums.hat.length).toBeGreaterThanOrEqual(8);
    expect(slot!.drums.tom).toBeDefined();
    expect(slot!.drums.tom!.length).toBeGreaterThan(0);
  });

  it('pb_resolve — 1박 crash + sustain', () => {
    const slot = ROCK_RHYTHM.patterns.pb_resolve;
    expect(slot!.drums.crash).toEqual([{ time: '0:0:0', velocity: 0.9 }]);
  });
});
