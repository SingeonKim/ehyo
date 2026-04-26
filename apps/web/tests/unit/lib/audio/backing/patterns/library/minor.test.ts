import { describe, expect, it } from 'vitest';
import { MINOR_RHYTHM } from '@/lib/audio/backing/patterns/library/minor';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'Im' })),
});

describe('MINOR_RHYTHM.selectSlot', () => {
  it('마지막 마디 → pickup', () => {
    expect(MINOR_RHYTHM.selectSlot(tpl(4), 3)).toBe('pickup');
    expect(MINOR_RHYTHM.selectSlot(tpl(8), 7)).toBe('pickup');
  });

  it('BPM ≤ 90 → groove_16th_sparse', () => {
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 70), 0)).toBe('groove_16th_sparse');
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 90), 0)).toBe('groove_16th_sparse');
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 80), 1)).toBe('groove_16th_sparse');
  });

  it('BPM > 90 → groove_8th', () => {
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 110), 0)).toBe('groove_8th');
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 91), 0)).toBe('groove_8th');
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 120), 2)).toBe('groove_8th');
  });

  it('마지막 마디는 BPM과 무관하게 pickup', () => {
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 70), 3)).toBe('pickup');
    expect(MINOR_RHYTHM.selectSlot(tpl(4, 110), 3)).toBe('pickup');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(MINOR_RHYTHM.patterns.groove_8th).toBeDefined();
    expect(MINOR_RHYTHM.patterns.groove_16th_sparse).toBeDefined();
    expect(MINOR_RHYTHM.patterns.pickup).toBeDefined();
  });
});
