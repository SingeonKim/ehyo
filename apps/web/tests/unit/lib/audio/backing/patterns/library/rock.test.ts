import { describe, expect, it } from 'vitest';
import { ROCK_RHYTHM } from '@/lib/audio/backing/patterns/library/rock';

const tpl = (bars: number, default_bpm = 100) => ({
  bars,
  default_bpm,
  progression: Array.from({ length: bars }, (_, i) => ({ bar: i + 1, chord: 'I' })),
});

const tpl4 = (default_bpm = 110) => tpl(4, default_bpm);

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

describe('rock selectSlot — rock_mixo variant', () => {
  it('모든 idx에서 rock_mixo 슬롯 사용 (groove/pickup/fill 토글 우회)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 0, 'rock_mixo')).toBe('rock_mixo');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 2, 'rock_mixo')).toBe('rock_mixo');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 3, 'rock_mixo')).toBe('rock_mixo');
  });

  it('rock_mixo 패턴: 4 on the floor 킥', () => {
    const kick = ROCK_RHYTHM.patterns.rock_mixo?.drums.kick ?? [];
    expect(kick.length).toBe(4);
    expect(kick.map((k) => k.time)).toEqual(['0:0:0', '0:1:0', '0:2:0', '0:3:0']);
  });

  it('rock_mixo guitar: 8분 down-pick (8 strums all down)', () => {
    const guitar = ROCK_RHYTHM.patterns.rock_mixo?.guitar ?? [];
    expect(guitar.length).toBe(8);
    expect(guitar.every((g) => g.direction === 'down')).toBe(true);
  });
});

describe('rock selectSlot — 기존 회귀 (variant 미지정)', () => {
  it('4마디 이상: 마지막 → fill_quarter, 끝에서 두 번째 → pickup_eighth', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 3)).toBe('fill_quarter');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 2)).toBe('pickup_eighth');
    expect(ROCK_RHYTHM.selectSlot(tpl4(), 0)).toBe('groove');
  });
});

const tpl12 = (default_bpm = 130) => ({
  bars: 12,
  default_bpm,
  progression: Array.from({ length: 12 }, (_, i) => ({ bar: i + 1, chord: 'I7' })),
});

describe('rock selectSlot — rock_12bar variant', () => {
  it('idx 0~7,9 → rock_12bar_drive', () => {
    for (const i of [0, 1, 4, 7, 9]) {
      expect(ROCK_RHYTHM.selectSlot(tpl12(), i, 'rock_12bar')).toBe('rock_12bar_drive');
    }
  });

  it('idx 8 → rock_12bar_tension (V7 빌드업)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 8, 'rock_12bar')).toBe('rock_12bar_tension');
  });

  it('idx 10 → rock_12bar_resolve (I7 안정)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 10, 'rock_12bar')).toBe('rock_12bar_resolve');
  });

  it('idx 11 → rock_12bar_turnaround (V7 climax)', () => {
    expect(ROCK_RHYTHM.selectSlot(tpl12(), 11, 'rock_12bar')).toBe('rock_12bar_turnaround');
  });

  it('rock_12bar 4 슬롯 모두 정의됨', () => {
    expect(ROCK_RHYTHM.patterns.rock_12bar_drive).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_tension).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_resolve).toBeDefined();
    expect(ROCK_RHYTHM.patterns.rock_12bar_turnaround).toBeDefined();
  });
});
