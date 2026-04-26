import { describe, expect, it } from 'vitest';
import { BLUES_RHYTHM } from '@/lib/audio/backing/patterns/library/blues';

const tpl12 = (default_bpm = 100) => ({
  bars: 12,
  default_bpm,
  progression: Array.from({ length: 12 }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('BLUES_RHYTHM.selectSlot', () => {
  it('12bar: idx=3 (4마디, 0-based) → iv_pickup', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 3)).toBe('iv_pickup');
    // 두 번째 반복: idx=15 → local=3 → iv_pickup
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 15)).toBe('iv_pickup');
  });

  it('12bar: idx=10 → turnaround', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 10)).toBe('turnaround');
  });

  it('12bar: idx=11 → turnaround', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 11)).toBe('turnaround');
  });

  it('12bar: 짝수 마디 (iv_pickup/turnaround 아님) → shuffle_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 0)).toBe('shuffle_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 2)).toBe('shuffle_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 4)).toBe('shuffle_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 8)).toBe('shuffle_a');
  });

  it('12bar: 홀수 마디 (iv_pickup/turnaround 아님) → shuffle_b', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 1)).toBe('shuffle_b');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 5)).toBe('shuffle_b');
    expect(BLUES_RHYTHM.selectSlot(tpl12(), 9)).toBe('shuffle_b');
  });

  it('non-12bar: 항상 shuffle_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl(4), 0)).toBe('shuffle_a');
    expect(BLUES_RHYTHM.selectSlot(tpl(4), 3)).toBe('shuffle_a');
    expect(BLUES_RHYTHM.selectSlot(tpl(8), 7)).toBe('shuffle_a');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(BLUES_RHYTHM.patterns.shuffle_a).toBeDefined();
    expect(BLUES_RHYTHM.patterns.shuffle_b).toBeDefined();
    expect(BLUES_RHYTHM.patterns.iv_pickup).toBeDefined();
    expect(BLUES_RHYTHM.patterns.turnaround).toBeDefined();
  });
});
