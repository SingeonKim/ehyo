import { describe, expect, it } from 'vitest';
import { JAZZ_RHYTHM } from '@/lib/audio/backing/patterns/library/jazz';

const tpl = (bars: number, default_bpm = 120) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'Imaj7' })),
});

describe('JAZZ_RHYTHM.selectSlot', () => {
  it('마지막 마디 → walk_approach', () => {
    expect(JAZZ_RHYTHM.selectSlot(tpl(4), 3)).toBe('walk_approach');
    expect(JAZZ_RHYTHM.selectSlot(tpl(8), 7)).toBe('walk_approach');
  });

  it('마지막 이외 → walk', () => {
    expect(JAZZ_RHYTHM.selectSlot(tpl(4), 0)).toBe('walk');
    expect(JAZZ_RHYTHM.selectSlot(tpl(4), 1)).toBe('walk');
    expect(JAZZ_RHYTHM.selectSlot(tpl(4), 2)).toBe('walk');
  });

  it('2마디: idx=0 → walk, idx=1 → walk_approach', () => {
    expect(JAZZ_RHYTHM.selectSlot(tpl(2), 0)).toBe('walk');
    expect(JAZZ_RHYTHM.selectSlot(tpl(2), 1)).toBe('walk_approach');
  });

  it('kick이 비어 있음 (재즈 단순화)', () => {
    // noUncheckedIndexedAccess 대응 — optional chaining 사용
    expect(JAZZ_RHYTHM.patterns['walk']?.drums.kick).toHaveLength(0);
    expect(JAZZ_RHYTHM.patterns['walk_approach']?.drums.kick).toHaveLength(0);
  });

  it('bass가 walking quarter (4 steps)', () => {
    expect(JAZZ_RHYTHM.patterns['walk']?.bass.steps).toHaveLength(4);
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(JAZZ_RHYTHM.patterns.walk).toBeDefined();
    expect(JAZZ_RHYTHM.patterns.walk_approach).toBeDefined();
    expect(JAZZ_RHYTHM.patterns.comp_only).toBeDefined();
  });
});
