import { describe, expect, it } from 'vitest';
import { BLUES_RHYTHM } from '@/lib/audio/backing/patterns/library/blues';

const tpl12 = { bars: 12, default_bpm: 90, progression: Array(12).fill({ chord: 'I7' }) };

describe('blues swing', () => {
  it('has swing default 0.66', () => {
    expect(BLUES_RHYTHM.swing?.default).toBe(0.66);
  });

  it('has variant overrides for hard_bop and jump', () => {
    expect(BLUES_RHYTHM.swing?.perVariant?.hard_bop).toBe(0.62);
    expect(BLUES_RHYTHM.swing?.perVariant?.jump).toBe(0.55);
  });
});

describe('blues selectSlot — shuffle12bar variant (default)', () => {
  it('idx 3 → iv_pickup', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3, 'shuffle12bar')).toBe('iv_pickup');
  });

  it('idx 8 → tension (V7 빌드업)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 8, 'shuffle12bar')).toBe('tension');
  });

  it('idx 9 (IV7 마디) → 일반 alternating (release 슬롯 제거됨)', () => {
    // 사용자 검수 결과: 10마디(idx=9) 다이나믹 원복 — 짝/홀 alternating에 위임
    expect(BLUES_RHYTHM.selectSlot(tpl12, 9, 'shuffle12bar')).toBe('groove_b');
  });

  it('idx 10 → resolve (I7 안정)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'shuffle12bar')).toBe('resolve');
  });

  it('idx 11 → turnaround (V7 climax)', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 11, 'shuffle12bar')).toBe('turnaround');
  });

  it('idx 0/2 even → groove_a', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'shuffle12bar')).toBe('groove_a');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 2, 'shuffle12bar')).toBe('groove_a');
  });

  it('idx 1 odd → groove_b', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 1, 'shuffle12bar')).toBe('groove_b');
  });

  it('undefined variant defaults to shuffle12bar behavior', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3)).toBe('iv_pickup');
  });
});

describe('blues selectSlot — slow variant', () => {
  it('all idx → slow_groove (no turnaround/pickup)', () => {
    for (const i of [0, 3, 10, 11]) {
      expect(BLUES_RHYTHM.selectSlot(tpl12, i, 'slow')).toBe('slow_groove');
    }
  });
});

describe('blues selectSlot — hard_bop variant', () => {
  it('idx 10/11 → hb_turnaround, else hb_walk', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'hard_bop')).toBe('hb_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 11, 'hard_bop')).toBe('hb_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'hard_bop')).toBe('hb_walk');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 5, 'hard_bop')).toBe('hb_walk');
  });
});

describe('blues selectSlot — straight_shuffle variant', () => {
  it('idx 3 → iv_pickup, 10/11 → turnaround, else groove_b16', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 3, 'straight_shuffle')).toBe('iv_pickup');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'straight_shuffle')).toBe('turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'straight_shuffle')).toBe('groove_b16');
  });
});

describe('blues selectSlot — major_swing variant', () => {
  it('idx 10/11 → ms_turnaround, else ms_comp', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'major_swing')).toBe('ms_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'major_swing')).toBe('ms_comp');
  });
});

describe('blues selectSlot — jump variant', () => {
  it('idx 10/11 → jump_turnaround, else jump_drive', () => {
    expect(BLUES_RHYTHM.selectSlot(tpl12, 10, 'jump')).toBe('jump_turnaround');
    expect(BLUES_RHYTHM.selectSlot(tpl12, 0, 'jump')).toBe('jump_drive');
  });
});

describe('blues patterns presence', () => {
  it('has all variant slot patterns defined', () => {
    const required = [
      'groove_a',
      'groove_b',
      'iv_pickup',
      'turnaround',
      'slow_groove',
      'hb_walk',
      'hb_turnaround',
      'groove_b16',
      'ms_comp',
      'ms_turnaround',
      'jump_drive',
      'jump_turnaround',
    ];
    for (const slot of required) {
      expect(BLUES_RHYTHM.patterns[slot]).toBeDefined();
    }
  });

  it('groove_a hat uses triplet8 long-short 8-step (LM-2 retrigger 한계로 ghost 제거)', () => {
    const hat = BLUES_RHYTHM.patterns.groove_a?.drums.hat ?? [];
    expect(hat.length).toBe(8);
    expect(hat.every((s) => s.unit === 'triplet8')).toBe(true);
  });

  it('groove_b16 (straight_shuffle) hat uses triplet8 long-short 8-step', () => {
    const hat = BLUES_RHYTHM.patterns.groove_b16?.drums.hat ?? [];
    expect(hat.length).toBe(8);
    expect(hat.every((s) => s.unit === 'triplet8')).toBe(true);
  });

  it('slow_groove ride uses triplet8 unit', () => {
    const slowDrums = BLUES_RHYTHM.patterns.slow_groove?.drums.hat ?? [];
    expect(slowDrums.some((s) => s.unit === 'triplet8')).toBe(true);
  });

  it('hb_walk ride uses triplet8 (LM-2 retrigger 한계로 long-short만, ghost 제거)', () => {
    const hat = BLUES_RHYTHM.patterns.hb_walk?.drums.hat ?? [];
    expect(hat.length).toBe(8);
    expect(hat.every((s) => s.unit === 'triplet8')).toBe(true);
  });
});
