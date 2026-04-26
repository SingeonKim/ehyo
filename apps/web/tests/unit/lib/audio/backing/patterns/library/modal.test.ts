import { describe, expect, it } from 'vitest';
import { MODAL_RHYTHM } from '@/lib/audio/backing/patterns/library/modal';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('MODAL_RHYTHM.selectSlot', () => {
  it('짝수 idx → groove_a', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 2)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 4)).toBe('groove_a');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 6)).toBe('groove_a');
  });

  it('홀수 idx → groove_b', () => {
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(4), 3)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 5)).toBe('groove_b');
    expect(MODAL_RHYTHM.selectSlot(tpl(8), 7)).toBe('groove_b');
  });

  it('tpl.bars와 무관하게 절대 idx 기준 (vamp toggle)', () => {
    // modal은 로컬 인덱스가 아닌 절대 idx로 toggle
    expect(MODAL_RHYTHM.selectSlot(tpl(1), 100)).toBe('groove_a'); // 100 % 2 === 0
    expect(MODAL_RHYTHM.selectSlot(tpl(1), 101)).toBe('groove_b');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(MODAL_RHYTHM.patterns.groove_a).toBeDefined();
    expect(MODAL_RHYTHM.patterns.groove_b).toBeDefined();
  });
});
