import { describe, expect, it } from 'vitest';

import { CATEGORY_BUNDLES, CATEGORY_TONE_DEFAULTS, getCategoryToneDefault, getBundle } from '@/lib/audio/backing/presets';

describe('CATEGORY_BUNDLES (Sprint 2-8)', () => {
  const expected = ['pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal'];

  for (const cat of expected) {
    it(`${cat} 번들 존재 + drums/bass/guitar 정의`, () => {
      const b = (CATEGORY_BUNDLES as Record<string, unknown>)[cat] as
        | undefined
        | { drums: { machine: string }; bass: { instrument: string }; guitar: { instrument: string } };
      expect(b, cat).toBeDefined();
      expect(b!.drums.machine, `${cat} drums.machine`).toBeDefined();
      expect(b!.bass.instrument, `${cat} bass.instrument`).toBeDefined();
      expect(b!.guitar.instrument, `${cat} guitar.instrument`).toBeDefined();
    });
  }

  it('jazz는 TR-808 (brush 대체) + jazz guitar + acoustic bass', () => {
    expect(CATEGORY_BUNDLES.jazz.drums.machine).toBe('TR-808');
    expect(CATEGORY_BUNDLES.jazz.guitar.instrument).toBe('electric_guitar_jazz');
    expect(CATEGORY_BUNDLES.jazz.bass.instrument).toBe('acoustic_bass');
  });

  it('funk는 TR-808 + shaker aux', () => {
    expect(CATEGORY_BUNDLES.funk.drums.machine).toBe('TR-808');
    expect(CATEGORY_BUNDLES.funk.aux).toBeDefined();
    expect(CATEGORY_BUNDLES.funk.aux!.kind).toBe('shaker');
  });

  it('bossa는 LM-2 + clave aux + acoustic_guitar_nylon', () => {
    expect(CATEGORY_BUNDLES.bossa.drums.machine).toBe('LM-2');
    expect(CATEGORY_BUNDLES.bossa.aux).toBeDefined();
    expect(CATEGORY_BUNDLES.bossa.aux!.kind).toBe('clave');
    expect(CATEGORY_BUNDLES.bossa.guitar.instrument).toBe('acoustic_guitar_nylon');
  });

  it('rock은 Roland CR-8000', () => {
    expect(CATEGORY_BUNDLES.rock.drums.machine).toBe('Roland CR-8000');
  });

  it('나머지(pop/blues/folk/minor/modal)는 LM-2 baseline', () => {
    for (const cat of ['pop', 'blues', 'folk', 'minor', 'modal'] as const) {
      expect(CATEGORY_BUNDLES[cat].drums.machine, cat).toBe('LM-2');
    }
  });

  it('알 수 없는 카테고리는 pop fallback', () => {
    expect(getBundle('made-up-cat')).toBe(CATEGORY_BUNDLES.pop);
  });

  it('octaveShift bass=-2, guitar=-1 (모든 카테고리)', () => {
    for (const [cat, bundle] of Object.entries(CATEGORY_BUNDLES)) {
      expect(bundle.bass.octaveShift, `${cat} bass`).toBe(-2);
      expect(bundle.guitar.octaveShift, `${cat} guitar`).toBe(-1);
    }
  });
});

describe('CATEGORY_TONE_DEFAULTS', () => {
  it('has tone profile for all 9 categories', () => {
    const cats = ['pop', 'rock', 'funk', 'jazz', 'blues', 'folk', 'bossa', 'minor', 'modal'];
    for (const c of cats) {
      expect(CATEGORY_TONE_DEFAULTS[c as keyof typeof CATEGORY_TONE_DEFAULTS]).toBeDefined();
    }
  });

  it('all profiles have full voiceGain (drums/bass/guitar/aux)', () => {
    for (const profile of Object.values(CATEGORY_TONE_DEFAULTS)) {
      expect(profile.voiceGain).toMatchObject({
        drums: expect.any(Number),
        bass: expect.any(Number),
        guitar: expect.any(Number),
        aux: expect.any(Number),
      });
      expect(profile.velocityScale).toBeGreaterThan(0);
      expect(profile.reverbWet).toBeGreaterThanOrEqual(0);
      expect(profile.reverbWet).toBeLessThanOrEqual(1);
    }
  });

  it('getCategoryToneDefault falls back to pop for unknown category', () => {
    expect(getCategoryToneDefault('unknown')).toBe(CATEGORY_TONE_DEFAULTS.pop);
  });
});
