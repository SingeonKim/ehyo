/**
 * 단일 범용 4/4 백비트 패턴.
 *
 * Sprint 2-3 PoC: 카테고리(pop/rock/jazz/blues)와 무관하게 이 패턴 하나만 사용.
 * Sprint 2-4에서 카테고리별 패턴이 추가될 때 이 파일은 변경 없이 새 파일로 분기 예정.
 */

import type { TrackPattern } from './types';

const HAT_STEPS = [
  '0:0:0',
  '0:0:2',
  '0:1:0',
  '0:1:2',
  '0:2:0',
  '0:2:2',
  '0:3:0',
  '0:3:2',
] as const;

export const BACKBEAT_PATTERN: TrackPattern = {
  drums: {
    // 1박, 3박
    kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
    // 2박, 4박
    snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
    // 8분 8개, 약하게
    hat: HAT_STEPS.map((time) => ({ time, velocity: 0.5 })),
  },
  bass: {
    // 1박, 3박 루트
    steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
  },
  keys: {
    // 1박에 마디 전체 울림
    steps: [{ time: '0:0:0', duration: '1m' }],
  },
};
