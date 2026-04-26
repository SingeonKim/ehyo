/**
 * 카드 슬러그 + 카테고리 → 머지된 프로필 (Sprint 9).
 *
 * 카테고리 default 위에 카드별 부분 override를 얹는다.
 *  - tone: 얕은 머지. voiceGain은 한 단계 깊은 머지.
 *  - bundle: 얕은 머지(필드 단위 instrument 교체).
 *  - variant: 그대로 forward.
 *
 * 결정론·O(1). slug 미등재 시 빈 프로필 fallback → 카테고리 default 그대로.
 */

import { CARD_PROFILES } from './card-profiles';
import {
  getBundle,
  getCategoryToneDefault,
  type CATEGORY_BUNDLES,
  type InstrumentBundle,
  type ToneProfile,
} from './presets';

export interface ResolvedCardProfile {
  variant: string | undefined;
  tone: ToneProfile;
  bundle: InstrumentBundle;
}

export function resolveCardProfile(
  slug: string,
  category: keyof typeof CATEGORY_BUNDLES | string,
): ResolvedCardProfile {
  const profile = CARD_PROFILES[slug] ?? {};
  const categoryTone = getCategoryToneDefault(category);
  const categoryBundle = getBundle(category);

  return {
    variant: profile.rhythmVariant,
    tone: {
      velocityScale: profile.toneProfile?.velocityScale ?? categoryTone.velocityScale,
      voiceGain: {
        drums: profile.toneProfile?.voiceGain?.drums ?? categoryTone.voiceGain.drums,
        bass: profile.toneProfile?.voiceGain?.bass ?? categoryTone.voiceGain.bass,
        guitar: profile.toneProfile?.voiceGain?.guitar ?? categoryTone.voiceGain.guitar,
        aux: profile.toneProfile?.voiceGain?.aux ?? categoryTone.voiceGain.aux,
      },
      reverbWet: profile.toneProfile?.reverbWet ?? categoryTone.reverbWet,
    },
    bundle: { ...categoryBundle, ...(profile.instrumentOverrides ?? {}) },
  };
}
