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
  toneProfile?: Partial<ToneProfile> & {
    voiceGain?: Partial<ToneProfile['voiceGain']>;
  };
  /** 카테고리 default bundle에서 부분 instrument 교체(얕은 머지). */
  instrumentOverrides?: Partial<InstrumentBundle>;
};

export const CARD_PROFILES: Readonly<Record<string, CardProfile>> = {
  // blues — 8장
  '12-bar-blues-major': {},
  '12-bar-blues-minor': {},
  '12-bar-blues-quick-change': {},
  'slow-minor-blues': {},
  'hard-bop-minor-blues': {},
  'shuffle-minor-blues': {},
  'jazz-major-blues': {},
  'jump-blues': {},
  // pop — 2장
  'pop-I-V-vi-IV': {},
  '50s-I-vi-IV-V': {},
  // jazz / minor / funk / bossa — 각 1장
  'jazz-ii-V-I': {},
  'minor-i-VI-III-VII': {},
  'funk-i7-vamp': {},
  'bossa-i-iv-ii-v': {},
  // modal — 3장
  'dorian-vamp': {},
  'lydian-vamp': {},
  'mixolydian-vamp': {},
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
