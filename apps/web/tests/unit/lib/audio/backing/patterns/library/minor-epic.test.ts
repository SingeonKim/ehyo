import { describe, expect, it } from 'vitest';
import { MINOR_RHYTHM } from '@/lib/audio/backing/patterns/library/minor';

const TPL = { bars: 16, default_bpm: 70, progression: Array(16).fill({ chord: 'i' }) };

describe('minor epic_minor_halftime variant', () => {
  it('selectSlot 매핑 — main 1-12·14-15, climax 13, resolve 16', () => {
    // 1-12 → epic_main
    for (let i = 0; i < 12; i++) {
      expect(MINOR_RHYTHM.selectSlot(TPL, i, 'epic_minor_halftime')).toBe('epic_main');
    }
    // bar 13(idx 12) → epic_climax
    expect(MINOR_RHYTHM.selectSlot(TPL, 12, 'epic_minor_halftime')).toBe('epic_climax');
    // bar 14, 15 → epic_main
    expect(MINOR_RHYTHM.selectSlot(TPL, 13, 'epic_minor_halftime')).toBe('epic_main');
    expect(MINOR_RHYTHM.selectSlot(TPL, 14, 'epic_minor_halftime')).toBe('epic_main');
    // bar 16 → epic_resolve
    expect(MINOR_RHYTHM.selectSlot(TPL, 15, 'epic_minor_halftime')).toBe('epic_resolve');
  });

  it('half-time pattern — kick 1·3박만, snare 3박만', () => {
    const slot = MINOR_RHYTHM.patterns.epic_main;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick.map((s) => s.time)).toEqual(['0:0:0', '0:2:0']);
    expect(slot!.drums.snare.map((s) => s.time)).toEqual(['0:2:0']);
  });

  it('epic_climax는 tom 4 entries velocity crescendo (0.5→0.8)', () => {
    const slot = MINOR_RHYTHM.patterns.epic_climax;
    expect(slot).toBeDefined();
    const toms = slot!.drums.tom!;
    expect(toms).toHaveLength(4);
    expect(toms.map((s) => s.time)).toEqual(['0:0:2', '0:1:2', '0:2:2', '0:3:2']);
    expect(toms.map((s) => s.velocity)).toEqual([0.5, 0.6, 0.7, 0.8]);
  });

  it('epic_resolve는 1박에 strong crash + tom roll', () => {
    const slot = MINOR_RHYTHM.patterns.epic_resolve;
    expect(slot).toBeDefined();
    expect(slot!.drums.crash).toEqual([{ time: '0:0:0', velocity: 0.9 }]);
    // tom roll 3 entries로 마무리
    expect(slot!.drums.tom).toHaveLength(3);
  });

  it('기존 minor variant 회귀 — variant 미지정 시 기본 슬롯', () => {
    expect(() => MINOR_RHYTHM.selectSlot(TPL, 0, undefined)).not.toThrow();
    expect(() => MINOR_RHYTHM.selectSlot(TPL, 15, undefined)).not.toThrow();
  });
});
