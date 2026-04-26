import { describe, expect, it, vi } from 'vitest';
import { resolveCardProfile } from '@/lib/audio/backing/profile-merge';

describe('resolveCardProfile', () => {
  it('returns category default for empty profile', () => {
    // pop-I-V-vi-IV는 빈 프로필 → pop CATEGORY_TONE_DEFAULTS 그대로
    const r = resolveCardProfile('pop-I-V-vi-IV', 'pop');
    expect(r.variant).toBeUndefined();
    expect(r.tone.velocityScale).toBe(1.0);
    expect(r.tone.voiceGain).toEqual({ drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 });
    expect(r.tone.reverbWet).toBe(0.18);
    expect(r.bundle.guitar.instrument).toBe('electric_guitar_clean');
  });

  it('returns blues category default for slug not in profiles', () => {
    // 등재 안 된 슬러그 → 빈 프로필 fallback → blues 카테고리 default
    const r = resolveCardProfile('fictional-blues', 'blues');
    expect(r.tone.reverbWet).toBe(0.22);
    expect(r.tone.voiceGain.drums).toBe(0.95);
  });

  it('falls back to pop for unknown category', () => {
    const r = resolveCardProfile('pop-I-V-vi-IV', 'unknown' as 'pop');
    expect(r.tone.velocityScale).toBe(1.0);
  });
});

describe('resolveCardProfile merging', () => {
  it('shallow merges instrumentOverrides (single-level)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: {
        'test-slug': {
          instrumentOverrides: { guitar: { instrument: 'jazz_guitar', octaveShift: -1 } },
        },
      },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    expect(r.bundle.guitar.instrument).toBe('jazz_guitar');
    // bass·drums는 카테고리 default 유지
    expect(r.bundle.bass.instrument).toBe('electric_bass_finger');
    expect(r.bundle.drums.machine).toBe('LM-2');
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });

  it('deep merges voiceGain (one level)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: {
        'test-slug': {
          toneProfile: { voiceGain: { drums: 0.85 } },
        },
      },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    // drums만 override, 나머지는 카테고리 default
    expect(r.tone.voiceGain.drums).toBe(0.85);
    expect(r.tone.voiceGain.bass).toBe(1.0);
    expect(r.tone.voiceGain.guitar).toBe(1.05);
    expect(r.tone.voiceGain.aux).toBe(1.0);
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });

  it('forwards rhythmVariant', async () => {
    vi.resetModules();
    vi.doMock('@/lib/audio/backing/card-profiles', () => ({
      CARD_PROFILES: { 'test-slug': { rhythmVariant: 'hard_bop' } },
      __assertCardProfilesMatch: () => {},
    }));
    const { resolveCardProfile: resolve } = await import('@/lib/audio/backing/profile-merge');
    const r = resolve('test-slug', 'blues');
    expect(r.variant).toBe('hard_bop');
    vi.doUnmock('@/lib/audio/backing/card-profiles');
  });
});
