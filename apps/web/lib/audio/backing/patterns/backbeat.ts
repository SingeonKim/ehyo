/**
 * 단일 범용 4/4 백비트 패턴 — drums + bass.
 * Sprint 2-4부터 keys는 빠지고 guitar(EIGHTH_STRUM)로 대체.
 * Engine은 BACKBEAT_DRUMS + BACKBEAT_BASS + EIGHTH_STRUM을 합성해 사용.
 */

import type { BassPattern, DrumPattern } from './types';

const HAT_STEPS = [
  '0:0:0', '0:0:2', '0:1:0', '0:1:2',
  '0:2:0', '0:2:2', '0:3:0', '0:3:2',
] as const;

export const BACKBEAT_DRUMS: DrumPattern = {
  // 1박, 3박
  kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
  // 2박, 4박
  snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
  // 8분 8개, 약하게
  hat: HAT_STEPS.map((time) => ({ time, velocity: 0.5 })),
};

export const BACKBEAT_BASS: BassPattern = {
  // 1박, 3박 루트
  steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
};
