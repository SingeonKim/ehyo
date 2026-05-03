/**
 * 카드 슬러그 → CardProfile 매핑 (Sprint 9).
 *
 * 17장 모두 명시적으로 등재 — 빈 객체 = "카테고리 default 그대로 사용한다"는
 * 명시적 선언. PR-B에서는 17장 모두 빈 객체. PR-D에서 도메인 리서치 결과
 * 반영.
 *
 * 백엔드 카탈로그 슬러그와 정합성은 __assertCardProfilesMatch가 dev에서
 * console.warn으로 통보. production에서는 dead-code-eliminate.
 */

import type { InstrumentBundle, ToneProfile } from './presets';

export type CardProfile = {
  /** 카테고리가 알아보는 variant 키. 미지정 = 카테고리 default 동작. */
  rhythmVariant?: string;
  /** 카테고리 default tone에서 부분 override. voiceGain은 한 단계 깊은 머지. */
  toneProfile?: Omit<Partial<ToneProfile>, 'voiceGain'> & {
    voiceGain?: Partial<ToneProfile['voiceGain']>;
  };
  /** 카테고리 default bundle에서 부분 instrument 교체(얕은 머지). */
  instrumentOverrides?: Partial<InstrumentBundle>;
};

export const CARD_PROFILES: Readonly<Record<string, CardProfile>> = {
  // ── blues 8장 ────────────────────────────────────────────────────
  // 정통 12bar shuffle. 카테고리 default(0.22)보다 살짝 dry로 punchy하게 —
  // minor blues(0.24 wet)와의 정체성 차별화 (major는 더 밝고 직진).
  '12-bar-blues-major': {
    rhythmVariant: 'shuffle12bar',
    toneProfile: { reverbWet: 0.18 },
  },
  // minor blues — 약간 더 어두운 공간감.
  '12-bar-blues-minor': {
    rhythmVariant: 'shuffle12bar',
    toneProfile: { reverbWet: 0.24 },
  },
  // quick change variant — 진행만 다르고 그루브는 동일.
  '12-bar-blues-quick-change': {
    rhythmVariant: 'shuffle12bar',
  },
  // half-time dreamy. distortion 빼고 clean으로 — instrument override.
  // 음량 정체성(velocityScale/voiceGain)은 절대 볼륨 통일을 위해 제거 — Sprint 10 후속.
  'slow-minor-blues': {
    rhythmVariant: 'slow',
    toneProfile: { reverbWet: 0.30 },
    instrumentOverrides: {
      guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
    },
  },
  // hard bop minor (Art Blakey/Lee Morgan 스타일). medium swing 0.62, jazz guitar
  // archtop, Blue Note recording 느낌으로 reverbWet 0.15 (slightly dry).
  'hard-bop-minor-blues': {
    rhythmVariant: 'hard_bop',
    toneProfile: { reverbWet: 0.15 },
    instrumentOverrides: {
      guitar: { instrument: 'electric_guitar_jazz', octaveShift: -1 },
    },
  },
  // 16th hat 추가된 정통 shuffle.
  'shuffle-minor-blues': {
    rhythmVariant: 'straight_shuffle',
  },
  // smoky comping + walking bass + jazz guitar.
  'jazz-major-blues': {
    rhythmVariant: 'major_swing',
    toneProfile: { reverbWet: 0.25 },
    instrumentOverrides: {
      guitar: { instrument: 'electric_guitar_jazz', octaveShift: -1 },
    },
  },
  // tight driving 8th, dry. swing 0.55.
  'jump-blues': {
    rhythmVariant: 'jump',
    toneProfile: { reverbWet: 0.10 },
  },

  // ── pop 2장 ──────────────────────────────────────────────────────
  // 카테고리 default 그대로.
  'pop-I-V-vi-IV': {},
  // half-time doo-wop feel.
  '50s-I-vi-IV-V': {
    rhythmVariant: '50s_doo_wop',
    toneProfile: { reverbWet: 0.25 },
  },

  // ── jazz / minor / funk / bossa 각 1장 ────────────────────────────
  'jazz-ii-V-I': {
    toneProfile: { reverbWet: 0.22 },
  },
  // 16bar AABA form. perVariant swing 0.62, Blue Note dry.
  // jazz default electric_guitar_jazz 그대로 사용.
  'autumn-leaves': {
    rhythmVariant: 'autumn_leaves',
    toneProfile: { reverbWet: 0.20 },
  },
  // 카테고리 default 그대로.
  'minor-i-VI-III-VII': {},
  'funk-i7-vamp': {
    toneProfile: { reverbWet: 0.12 },
  },
  'bossa-i-iv-ii-v': {
    toneProfile: { reverbWet: 0.25 },
  },

  // ── modal 3장 ────────────────────────────────────────────────────
  'dorian-vamp': {
    rhythmVariant: 'dorian_groove',
  },
  'lydian-vamp': {
    rhythmVariant: 'lydian_dreamy',
    toneProfile: { reverbWet: 0.30 },
  },
  'mixolydian-vamp': {
    rhythmVariant: 'mixolydian_driving',
  },

  // ── Sprint 10 신규 5장 ────────────────────────────────────────────
  // folk acoustic strum staple.
  'folk-I-IV-V': {
    rhythmVariant: 'folk_strum',
  },
  // half-time finger-pick ballad. acoustic_guitar_steel(folk default) 그대로.
  // 음량은 dreamy half-time이라도 절대 볼륨 통일 — velocityScale 제거.
  'ballad-I-V-vi-IV': {
    rhythmVariant: 'ballad_pick',
    toneProfile: { reverbWet: 0.30 },
  },
  // Mixolydian rock — distortion guitar(rock default) + dry.
  'rock-I-bVII-IV': {
    rhythmVariant: 'rock_mixo',
    toneProfile: {
      reverbWet: 0.10,
    },
  },
  // Chuck Berry 12bar boogie — driving 8분, dry.
  'rock-12-bar': {
    rhythmVariant: 'rock_12bar',
    toneProfile: {
      reverbWet: 0.12,
    },
  },
  // Spanish/exotic phrygian. modal default가 clean이라 distortion 명시 override.
  'phrygian-vamp': {
    rhythmVariant: 'phrygian_dark',
    toneProfile: {
      reverbWet: 0.25,
    },
    instrumentOverrides: {
      guitar: { instrument: 'distortion_guitar', octaveShift: -1 },
    },
  },
};

/**
 * dev 정합성 가드 — 백엔드 카탈로그 슬러그 목록과 CARD_PROFILES 키 비교.
 * production에서는 NODE_ENV 가드로 dead-code-eliminate.
 */
export function __assertCardProfilesMatch(catalogSlugs: readonly string[]): void {
  if (process.env.NODE_ENV === 'production') return;
  const profileSlugs = new Set(Object.keys(CARD_PROFILES));
  const missing = catalogSlugs.filter((s) => !profileSlugs.has(s));
  const extra = [...profileSlugs].filter((s) => !catalogSlugs.includes(s));
  if (missing.length || extra.length) {
    console.warn('[CARD_PROFILES] mismatch with backend catalog', { missing, extra });
  }
}
