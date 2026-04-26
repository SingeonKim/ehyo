import { describe, expect, it } from 'vitest';
import { FUNK_RHYTHM } from '@/lib/audio/backing/patterns/library/funk';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('FUNK_RHYTHM.selectSlot', () => {
  it('1bar vamp: idx=3 → pickup_one', () => {
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 3)).toBe('pickup_one');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 7)).toBe('pickup_one');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 11)).toBe('pickup_one');
  });

  it('1bar vamp: 4사이클 블록 0~3 → groove_a, 4~7 → groove_b', () => {
    // idx % 4 !== 3일 때: 0~3 블록(idx 0,1,2 / 4,5,6) = groove_a, 나머지(idx 4~7 아닌…)
    // idx % 8 < 4 → groove_a
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 0)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 1)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 2)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 4)).toBe('groove_b');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 5)).toBe('groove_b');
    expect(FUNK_RHYTHM.selectSlot(tpl(1), 6)).toBe('groove_b');
  });

  it('4마디: 마지막 → pickup_one', () => {
    expect(FUNK_RHYTHM.selectSlot(tpl(4), 3)).toBe('pickup_one');
  });

  it('4마디: 짝수 → groove_a, 홀수 → groove_b', () => {
    expect(FUNK_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl(4), 2)).toBe('groove_a');
    expect(FUNK_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove_b');
  });

  it('aux(shaker)가 모든 슬롯에 존재', () => {
    // noUncheckedIndexedAccess 대응 — optional chaining 사용
    expect(FUNK_RHYTHM.patterns['groove_a']?.aux).toBeDefined();
    expect(FUNK_RHYTHM.patterns['groove_b']?.aux).toBeDefined();
    expect(FUNK_RHYTHM.patterns['pickup_one']?.aux).toBeDefined();
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(FUNK_RHYTHM.patterns.groove_a).toBeDefined();
    expect(FUNK_RHYTHM.patterns.groove_b).toBeDefined();
    expect(FUNK_RHYTHM.patterns.pickup_one).toBeDefined();
  });
});
