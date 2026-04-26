import { describe, expect, it, vi } from 'vitest';
import {
  CARD_PROFILES,
  __assertCardProfilesMatch,
} from '@/lib/audio/backing/card-profiles';

const CATALOG_17_SLUGS = [
  '12-bar-blues-major',
  '12-bar-blues-minor',
  '12-bar-blues-quick-change',
  'pop-I-V-vi-IV',
  '50s-I-vi-IV-V',
  'jazz-ii-V-I',
  'minor-i-VI-III-VII',
  'dorian-vamp',
  'lydian-vamp',
  'mixolydian-vamp',
  'slow-minor-blues',
  'hard-bop-minor-blues',
  'shuffle-minor-blues',
  'jazz-major-blues',
  'jump-blues',
  'funk-i7-vamp',
  'bossa-i-iv-ii-v',
];

describe('CARD_PROFILES', () => {
  it('has entries for all 17 catalog slugs', () => {
    for (const slug of CATALOG_17_SLUGS) {
      expect(CARD_PROFILES[slug]).toBeDefined();
    }
  });

  it('has no extra slugs beyond catalog', () => {
    for (const slug of Object.keys(CARD_PROFILES)) {
      expect(CATALOG_17_SLUGS).toContain(slug);
    }
  });
});

describe('__assertCardProfilesMatch', () => {
  it('warns on missing slug (dev only)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    __assertCardProfilesMatch([...CATALOG_17_SLUGS, 'extra-from-backend']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('CARD_PROFILES'),
      expect.objectContaining({ missing: ['extra-from-backend'] }),
    );
    warn.mockRestore();
  });

  it('does not warn when sets match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    __assertCardProfilesMatch(CATALOG_17_SLUGS);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('CARD_PROFILES — actual values (PR-D)', () => {
  it('slow-minor-blues uses slow variant + clean guitar override', () => {
    const p = CARD_PROFILES['slow-minor-blues']!;
    expect(p.rhythmVariant).toBe('slow');
    expect(p.instrumentOverrides?.guitar?.instrument).toBe('electric_guitar_clean');
    expect(p.toneProfile?.reverbWet).toBe(0.30);
  });

  it('jazz-major-blues uses major_swing variant + jazz guitar', () => {
    const p = CARD_PROFILES['jazz-major-blues']!;
    expect(p.rhythmVariant).toBe('major_swing');
    expect(p.instrumentOverrides?.guitar?.instrument).toBe('electric_guitar_jazz');
  });

  it('jump-blues uses jump variant + dry reverb', () => {
    const p = CARD_PROFILES['jump-blues']!;
    expect(p.rhythmVariant).toBe('jump');
    expect(p.toneProfile?.reverbWet).toBe(0.10);
  });

  it('50s-I-vi-IV-V uses 50s_doo_wop variant', () => {
    const p = CARD_PROFILES['50s-I-vi-IV-V']!;
    expect(p.rhythmVariant).toBe('50s_doo_wop');
  });

  it('all 3 modal cards have variant', () => {
    expect(CARD_PROFILES['dorian-vamp']!.rhythmVariant).toBe('dorian_groove');
    expect(CARD_PROFILES['lydian-vamp']!.rhythmVariant).toBe('lydian_dreamy');
    expect(CARD_PROFILES['mixolydian-vamp']!.rhythmVariant).toBe('mixolydian_driving');
  });

  it('hard-bop-minor-blues uses hard_bop variant + jazz guitar override', () => {
    const p = CARD_PROFILES['hard-bop-minor-blues']!;
    expect(p.rhythmVariant).toBe('hard_bop');
    // 도메인 검수 후 0.20 → 0.15 (Blue Note recording style — slightly dry).
    expect(p.toneProfile?.reverbWet).toBe(0.15);
    // distortion guitar는 hard bop과 어긋나 jazz guitar로 override (slow/major_swing와 동일 사양).
    expect(p.instrumentOverrides?.guitar?.instrument).toBe('electric_guitar_jazz');
  });
});
