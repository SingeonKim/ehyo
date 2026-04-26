/**
 * folk.ts — Travis picking + 8th strum alternate.
 *
 * 슬롯: picking (Travis alternating bass), strum_8th, pickup (마지막 마디).
 * picking은 어쿠스틱 솔로 느낌 — 드럼 없음.
 */

import type { CategoryRhythm } from '../types';

export const FOLK_RHYTHM: CategoryRhythm = {
  patterns: {
    picking: {
      drums: {
        // Travis picking은 드럼 없음 — 어쿠스틱 솔로 편성
        kick: [],
        snare: [],
        hat: [],
      },
      bass: {
        // Travis alternating bass: 1박 루트, 3박 5도 (단순화: 둘 다 루트)
        steps: [
          { time: '0:0:0', velocity: 0.75 },
          { time: '0:2:0', velocity: 0.75 },
        ],
      },
      // 가벼운 핑거피킹 패턴
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.4 },
        { time: '0:2:0', direction: 'up', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.4 },
      ],
    },

    strum_8th: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0', velocity: 0.5 }, { time: '0:3:0', velocity: 0.5 }],
        // 부드러운 8th 하이햇
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.4 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // pop groove_a와 동일한 strum 패턴
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    pickup: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0', velocity: 0.5 }, { time: '0:3:0', velocity: 0.5 }],
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.4 },
        ],
      },
      bass: {
        // strum_8th + 4박-and leading note
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
      },
      // strum_8th + 4박-and up 추가
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

  /**
   * 마지막 마디 → pickup. 짝수 → picking, 홀수 → strum_8th.
   */
  selectSlot: (tpl, idx, _variant) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return local % 2 === 0 ? 'picking' : 'strum_8th';
  },
};
