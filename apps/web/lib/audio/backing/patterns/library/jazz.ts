/**
 * jazz.ts — swing 8th ride, walking bass, Freddie Green comp on 2·4.
 *
 * 슬롯: walk (일반), walk_approach (마지막 마디), comp_only (intro/break 예비 슬롯).
 * 16분 sub :2를 8th-and 위치로 사용해 ride 패턴 표현.
 * 정확한 swing timing은 voice 레이어에서 처리할 예정.
 */

import type { CategoryRhythm } from '../types';

export const JAZZ_RHYTHM: CategoryRhythm = {
  patterns: {
    walk: {
      drums: {
        // 재즈에서 킥은 비움 (단순화 — ghost kick 추가는 추후)
        kick: [],
        // 스네어: brush rim hit 느낌, 2·4박 and 위치, 아주 약하게
        snare: [
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:2', velocity: 0.3 },
        ],
        // ride 패턴: "ding-da-DING-da-DING" — 3박자 계열 느낌
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.6 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        // walking quarters: 4박 모두 루트 (voice가 보이싱 담당)
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      // Freddie Green comp: 2·4박만 — 짧고 점잖은 voicing
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.4 },
      ],
    },

    walk_approach: {
      drums: {
        kick: [],
        snare: [
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:2', velocity: 0.3 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.6 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        // walk와 동일하지만 4박-and에 leading tone 추가 (chromatic approach 흉내)
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.4 },
      ],
    },

    comp_only: {
      drums: {
        // intro/break용 — 드럼 전부 비움
        kick: [],
        snare: [],
        hat: [],
      },
      bass: {
        // 1박 루트만
        steps: [{ time: '0:0:0', velocity: 0.85 }],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.4 },
      ],
    },
  },

  /**
   * 마지막 마디 → walk_approach (chromatic approach로 반복 진입).
   * 나머지 → walk.
   */
  selectSlot: (tpl, idx, _variant) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'walk_approach';
    return 'walk';
  },
};
