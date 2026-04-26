import { describe, expect, it } from 'vitest';
import { resolveSwing } from '@/lib/audio/backing/swing';
import type { CategoryRhythm } from '@/lib/audio/backing/patterns/types';

const stub = (swing?: CategoryRhythm['swing']): CategoryRhythm => ({
  patterns: {},
  swing,
  selectSlot: () => 'x',
});

describe('resolveSwing', () => {
  it('returns 0.5 when category rhythm has no swing config', () => {
    expect(resolveSwing(stub(undefined), undefined)).toBe(0.5);
    expect(resolveSwing(stub(undefined), 'any')).toBe(0.5);
  });

  it('returns category default when variant unspecified', () => {
    expect(resolveSwing(stub({ default: 0.66 }), undefined)).toBe(0.66);
  });

  it('returns category default when variant not in perVariant map', () => {
    expect(resolveSwing(stub({ default: 0.66 }), 'unknown')).toBe(0.66);
    expect(resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62 } }), 'unknown')).toBe(
      0.66,
    );
  });

  it('returns variant override when matched', () => {
    expect(
      resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62, jump: 0.55 } }), 'hard_bop'),
    ).toBe(0.62);
    expect(
      resolveSwing(stub({ default: 0.66, perVariant: { hard_bop: 0.62, jump: 0.55 } }), 'jump'),
    ).toBe(0.55);
  });
});
