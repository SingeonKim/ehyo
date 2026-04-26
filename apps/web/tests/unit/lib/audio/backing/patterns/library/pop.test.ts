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

const tpl4 = { bars: 4, default_bpm: 90, progression: Array(4).fill({ chord: 'I' }) };

describe('pop variant — 50s_doo_wop', () => {
  it('routes to doo_wop slot', () => {
    expect(POP_RHYTHM.selectSlot(tpl4, 0, '50s_doo_wop')).toBe('doo_wop');
  });

  it('doo_wop pattern has half-time feel (snare on 3 only)', () => {
    const snare = POP_RHYTHM.patterns.doo_wop?.drums.snare ?? [];
    expect(snare.length).toBe(1);
    expect(snare[0]?.time).toBe('0:2:0');
  });

  it('undefined variant uses original default behavior (no regression)', () => {
    const slot = POP_RHYTHM.selectSlot(tpl4, 0);
    expect(slot).not.toBe('doo_wop');
  });
});

describe('pop swing — straight (default 0.5, regression)', () => {
  it('swing is undefined or default 0.5', () => {
    if (POP_RHYTHM.swing) {
      expect(POP_RHYTHM.swing.default).toBe(0.5);
    }
    // 미정의이면 OK (resolveSwing에서 0.5 반환)
  });
});
