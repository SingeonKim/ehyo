import { describe, expect, it } from 'vitest';
import { JAZZ_RHYTHM } from '@/lib/audio/backing/patterns/library/jazz';
import { resolveSwing } from '@/lib/audio/backing/swing';

const TPL = { bars: 16, default_bpm: 90, progression: Array(16).fill({ chord: 'iim7' }) };

describe('jazz autumn_leaves variant', () => {
  it('selectSlot bar 1-15 → autumn_walk', () => {
    for (let i = 0; i < 15; i++) {
      expect(JAZZ_RHYTHM.selectSlot(TPL, i, 'autumn_leaves')).toBe('autumn_walk');
    }
  });

  it('selectSlot bar 16 (idx 15) → autumn_turnaround', () => {
    expect(JAZZ_RHYTHM.selectSlot(TPL, 15, 'autumn_leaves')).toBe('autumn_turnaround');
  });

  it('autumn_walk slot 정의됨 (drums.kick / snare / hat 배열)', () => {
    const slot = JAZZ_RHYTHM.patterns.autumn_walk;
    expect(slot).toBeDefined();
    expect(slot!.drums.kick).toBeDefined();
    expect(slot!.drums.snare.length).toBeGreaterThan(0);
    expect(slot!.drums.hat.length).toBeGreaterThan(0);
    expect(slot!.bass.steps.length).toBe(4); // 4-to-bar walking
    expect(slot!.guitar.length).toBeGreaterThan(0); // Freddie Green comp
  });

  it('autumn_turnaround slot 정의됨 + bass에 chromatic approach 추가', () => {
    const slot = JAZZ_RHYTHM.patterns.autumn_turnaround;
    expect(slot).toBeDefined();
    // walk보다 1 step 많음 (4-and 자리에 chromatic approach)
    expect(slot!.bass.steps.length).toBeGreaterThan(4);
  });

  it('swing perVariant — autumn_leaves는 0.62, default는 0.66', () => {
    expect(resolveSwing(JAZZ_RHYTHM, 'autumn_leaves')).toBe(0.62);
    expect(resolveSwing(JAZZ_RHYTHM, undefined)).toBe(0.66); // walk default
    expect(resolveSwing(JAZZ_RHYTHM, 'walk')).toBe(0.66); // explicit walk
  });

  it('기존 walk variant 회귀 — selectSlot 변경 없음', () => {
    expect(JAZZ_RHYTHM.selectSlot(TPL, 0, undefined)).toBe('walk');
    expect(JAZZ_RHYTHM.selectSlot(TPL, 15, undefined)).toBe('walk_approach');
  });
});
