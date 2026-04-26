/**
 * rock.ts — straight 8th, ghost snare on 2-and.
 *
 * 슬롯: groove (메인), pickup_eighth (끝에서 두 번째), fill_quarter (마지막 마디).
 * 4마디 이상일 때만 pickup/fill 발동 — 짧은 루프는 groove만.
 */

import type { CategoryRhythm } from '../types';

export const ROCK_RHYTHM: CategoryRhythm = {
  patterns: {
    groove: {
      drums: {
        // 킥: 1박·3박
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 스네어: 2박 백비트 + 2박-and ghost(velocity 0.3)
        snare: [
          { time: '0:1:0' },
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:0' },
        ],
        // 하이햇: 8분 직선, velocity 0.55
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 강한 다운스트럼 위주 — 록 파워코드 느낌
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    pickup_eighth: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
        // 4박-and에 스네어 추가해서 다음 마디 fill로 넘어가는 긴장감
        snare: [
          { time: '0:1:0' },
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:0' },
          { time: '0:3:2', velocity: 0.6 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    fill_quarter: {
      drums: {
        // 4박은 fill로 채움 — kick은 1·3박만
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 4박에 연속 스네어 fill (velocity 점점 크게)
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:1', velocity: 0.75 },
          { time: '0:3:2', velocity: 0.8 },
          { time: '0:3:3', velocity: 0.9 },
        ],
        // 4박은 hat 비움 — fill이 돋보이도록
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // fill 마디는 기타 1박 다운만 — 드럼 fill 공간 확보
      guitar: [{ time: '0:0:0', direction: 'down' }],
    },

    // rock_mixo: 8분 down-pick + 4 on the floor 킥. Mixolydian 록 정체성.
    // rock-I-bVII-IV 카드용. distortion guitar 카테고리 default와 결합.
    rock_mixo: {
      drums: {
        // 4 on the floor: 모든 박에 킥
        kick: [
          { time: '0:0:0' },
          { time: '0:1:0' },
          { time: '0:2:0' },
          { time: '0:3:0' },
        ],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 8분 down-pick 8회 (rock 정체성)
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'down' },
      ],
    },

    // rock_12bar_drive: Chuck Berry 8분 driving — 기본 슬롯
    rock_12bar_drive: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        // Chuck Berry boogie shuffle: 8분 1-3-5-6 alternating (단순화: 4분 1박+3박)
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 8분 down-up alternating (속도 빠름 130bpm)
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'up' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // rock_12bar_tension: 9마디 V7 빌드업 — kick 강세 + snare crescendo
    rock_12bar_tension: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.8 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'up' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // rock_12bar_resolve: 11마디 I7 안정 — drive보다 정돈된 느낌(기타 4분주)
    rock_12bar_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
      ],
    },

    // rock_12bar_turnaround: 12마디 V7 climax — 4박 fill로 다음 사이클 진입
    rock_12bar_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:1', velocity: 0.75 },
          { time: '0:3:2', velocity: 0.8 },
          { time: '0:3:3', velocity: 0.9 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // turnaround 마디 기타는 1박만 다운 — 드럼 fill 공간 확보
      guitar: [{ time: '0:0:0', direction: 'down' }],
    },
  },

  /**
   * variant 'rock_mixo'/'rock_12bar' 지정 시 해당 분기 라우팅.
   * 미지정 시 기존 4마디 이상 fill/pickup 동작 유지.
   */
  selectSlot: (tpl, idx, variant) => {
    if (variant === 'rock_mixo') return 'rock_mixo';
    if (variant === 'rock_12bar') {
      const local = idx % tpl.bars;
      if (local === 8) return 'rock_12bar_tension';
      if (local === 10) return 'rock_12bar_resolve';
      if (local === 11) return 'rock_12bar_turnaround';
      return 'rock_12bar_drive';
    }
    const local = idx % tpl.bars;
    if (tpl.bars >= 4 && local === tpl.bars - 1) return 'fill_quarter';
    if (tpl.bars >= 4 && local === tpl.bars - 2) return 'pickup_eighth';
    return 'groove';
  },
};
