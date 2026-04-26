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
