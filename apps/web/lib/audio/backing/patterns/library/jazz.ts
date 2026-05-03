/**
 * jazz.ts — swing 8th ride, walking bass, Freddie Green comp on 2·4.
 *
 * 슬롯: walk (일반), walk_approach (마지막 마디), comp_only (intro/break 예비 슬롯).
 * 16분 sub :2를 8th-and 위치로 사용해 ride 패턴 표현.
 * 정확한 swing timing은 voice 레이어에서 처리할 예정.
 */

import type { CategoryRhythm } from '../types';

export const JAZZ_RHYTHM: CategoryRhythm = {
  // 정통 jazz swing: long-short 비율 0.66 (2:1 트리플렛 감각)
  // autumn_leaves는 0.62 — 보다 평탄한 medium swing (ballad tempo 90bpm 배려)
  swing: { default: 0.66, perVariant: { autumn_leaves: 0.62 } },

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
        // ride 패턴: "ding-dig-a-ding" — triplet8 sub 0(long)+2(short)로 정통 jazz ride
        // unit:'triplet8'은 swing 인자를 무시하고 3등분 long-short로 고정
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.5 },
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
        // walk와 동일한 triplet8 ride — approach 마디도 같은 groov 유지
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.5 },
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

    // autumn_leaves variant — 16bar AABA form. Freddie Green 2박만(4박 drop)으로
    // walk보다 sparse. brush snare velocity 0.25로 더 부드럽게.
    autumn_walk: {
      drums: {
        // 재즈 킥은 비움
        kick: [],
        // brush snare — walk(0.3)보다 더 소프트하게
        snare: [
          { time: '0:1:2', velocity: 0.25 },
          { time: '0:3:2', velocity: 0.25 },
        ],
        // walk와 동일 triplet8 ride — 일관된 groove 유지
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: {
        // 4-to-the-bar walking quarters
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      // Freddie Green 2박만 — 4박 drop으로 walk(2·4박)보다 더 sparse
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
      ],
    },

    // autumn_turnaround — drums/guitar는 autumn_walk와 의도적 중복.
    // 차별점은 bass에 0:3:2 chromatic approach(velocity 0.7) 1 step 추가뿐.
    // BarPattern 타입상 슬롯 단위 데이터 복제가 불가피하다.
    autumn_turnaround: {
      drums: {
        kick: [],
        snare: [
          { time: '0:1:2', velocity: 0.25 },
          { time: '0:3:2', velocity: 0.25 },
        ],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: {
        // 4박-and에 chromatic approach 추가 — bar 16 vim7 → bar 1 iim7 매끄러운 진입
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
      ],
    },
  },

  /**
   * autumn_leaves variant: bar 16(마지막) → autumn_turnaround, 나머지 → autumn_walk.
   * 기본: 마지막 마디 → walk_approach (chromatic approach로 반복 진입), 나머지 → walk.
   */
  selectSlot: (tpl, idx, variant) => {
    if (variant === 'autumn_leaves') {
      return idx % tpl.bars === tpl.bars - 1 ? 'autumn_turnaround' : 'autumn_walk';
    }
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'walk_approach';
    return 'walk';
  },
};
