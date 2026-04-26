import { describe, expect, it } from 'vitest';
import { FOLK_RHYTHM } from '@/lib/audio/backing/patterns/library/folk';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('FOLK_RHYTHM.selectSlot', () => {
  it('마지막 마디 → pickup', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 3)).toBe('pickup');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 7)).toBe('pickup');
  });

  it('짝수 마디(마지막 제외) → picking', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 0)).toBe('picking');
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 2)).toBe('picking');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 0)).toBe('picking');
  });

  it('홀수 마디(마지막 제외) → strum_8th', () => {
    expect(FOLK_RHYTHM.selectSlot(tpl(4), 1)).toBe('strum_8th');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 1)).toBe('strum_8th');
    expect(FOLK_RHYTHM.selectSlot(tpl(8), 3)).toBe('strum_8th');
  });

  it('picking 슬롯은 드럼 없음', () => {
    // noUncheckedIndexedAccess 대응 — optional chaining 사용
    expect(FOLK_RHYTHM.patterns['picking']?.drums.kick).toHaveLength(0);
    expect(FOLK_RHYTHM.patterns['picking']?.drums.snare).toHaveLength(0);
    expect(FOLK_RHYTHM.patterns['picking']?.drums.hat).toHaveLength(0);
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(FOLK_RHYTHM.patterns.picking).toBeDefined();
    expect(FOLK_RHYTHM.patterns.strum_8th).toBeDefined();
    expect(FOLK_RHYTHM.patterns.pickup).toBeDefined();
  });
});
