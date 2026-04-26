import { describe, expect, it } from 'vitest';
import { POP_RHYTHM } from '@/lib/audio/backing/patterns/library/pop';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('POP_RHYTHM.selectSlot', () => {
  it('마지막 마디 → turnaround', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 3)).toBe('turnaround');
    expect(POP_RHYTHM.selectSlot(tpl(8), 7)).toBe('turnaround');
    expect(POP_RHYTHM.selectSlot(tpl(2), 1)).toBe('turnaround');
  });

  it('짝수 마디(마지막 제외) → groove_a', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove_a');
    expect(POP_RHYTHM.selectSlot(tpl(4), 2)).toBe('groove_a');
    expect(POP_RHYTHM.selectSlot(tpl(8), 0)).toBe('groove_a');
    expect(POP_RHYTHM.selectSlot(tpl(8), 4)).toBe('groove_a');
  });

  it('홀수 마디(마지막 제외) → groove_b', () => {
    expect(POP_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove_b');
    expect(POP_RHYTHM.selectSlot(tpl(8), 1)).toBe('groove_b');
    expect(POP_RHYTHM.selectSlot(tpl(8), 5)).toBe('groove_b');
  });

  it('barIndexAbs가 tpl.bars 이상이어도 올바른 슬롯 반환 (abs index)', () => {
    // 두 번째 반복 — idx=4면 local=0 → groove_a
    expect(POP_RHYTHM.selectSlot(tpl(4), 4)).toBe('groove_a');
    // idx=7이면 local=3 → turnaround
    expect(POP_RHYTHM.selectSlot(tpl(4), 7)).toBe('turnaround');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(POP_RHYTHM.patterns.groove_a).toBeDefined();
    expect(POP_RHYTHM.patterns.groove_b).toBeDefined();
    expect(POP_RHYTHM.patterns.turnaround).toBeDefined();
  });
});
