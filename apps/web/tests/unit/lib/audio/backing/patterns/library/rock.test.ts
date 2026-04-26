import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

describe('ROCK_RHYTHM.selectSlot', () => {
  it('4마디: 마지막 → fill_quarter', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl(4), 3)).toBe('fill_quarter');
  });

  it('4마디: 끝에서 두 번째 → pickup_eighth', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl(4), 2)).toBe('pickup_eighth');
  });

  it('4마디: 0·1 → groove', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl(4), 0)).toBe('groove');
    expect(ROCK_RHYTHM.selectSlot(tpl(4), 1)).toBe('groove');
  });

  it('8마디: idx=6 → pickup_eighth, idx=7 → fill_quarter', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl(8), 6)).toBe('pickup_eighth');
    expect(ROCK_RHYTHM.selectSlot(tpl(8), 7)).toBe('fill_quarter');
  });

  it('3마디 이하: 모두 groove', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl(2), 0)).toBe('groove');
    expect(ROCK_RHYTHM.selectSlot(tpl(2), 1)).toBe('groove');
    expect(ROCK_RHYTHM.selectSlot(tpl(1), 0)).toBe('groove');
  });

  it('패턴 dictionary에 모든 슬롯 정의', () => {
    expect(ROCK_RHYTHM.patterns.groove).toBeDefined();
    expect(ROCK_RHYTHM.patterns.pickup_eighth).toBeDefined();
    expect(ROCK_RHYTHM.patterns.fill_quarter).toBeDefined();
  });
});
