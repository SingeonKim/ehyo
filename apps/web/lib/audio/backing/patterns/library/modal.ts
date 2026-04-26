/**
 * modal.ts — vamp toggle (짝/홀수 alternate).
 *
 * 슬롯: groove_a, groove_b. pop groove_a/b와 동일한 패턴 — modal vamp는
 * 단순 toggle로 충분하다 (코드 진행 없이 한 코드 위에서 groove).
 */

import type { CategoryRhythm } from '../types';

export const MODAL_RHYTHM: CategoryRhythm = {
  patterns: {
    // pop groove_a와 동일
    groove_a: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.5 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.5 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.5 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    // pop groove_b와 동일 — hat 4박 강조 + bass ghost
    groove_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.5 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.5 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2', velocity: 0.6 }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
  },

  /** 단순 짝/홀수 toggle — turnaround 없음. */
  selectSlot: (_tpl, idx) => (idx % 2 === 0 ? 'groove_a' : 'groove_b'),
};
