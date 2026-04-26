/**
 * blues.ts — shuffle 12/8 (long-short 8th). sub :3 위치로 늦춰서 shuffle 느낌.
 *
 * 슬롯: shuffle_a, shuffle_b, iv_pickup (4마디), turnaround (11·12마디).
 * selectSlot은 12bar 구조를 직접 다룬다 — tpl.bars !== 12면 shuffle_a로 단순화.
 */

import type { CategoryRhythm } from '../types';

export const BLUES_RHYTHM: CategoryRhythm = {
  patterns: {
    shuffle_a: {
      drums: {
        // 킥: 1·3박
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 스네어: 2·4박 백비트
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // hat: 8th의 두 번째를 :3로 늦춰 shuffle 느낌
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:3', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:3', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:3', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 단순한 4 다운스트럼 — 블루스 리듬 기타
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    shuffle_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // shuffle_a와 동일하지만 :3 위치를 velocity 0.7로 강조
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:3', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:3', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:3', velocity: 0.7 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    iv_pickup: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:3', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:3', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:3', velocity: 0.55 },
        ],
      },
      bass: {
        // 4박-and에 leading note 추가 — IV 코드 진입 강조
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        // 4박에 ghost snare 추가 느낌을 guitar anticipation으로 표현
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 3박-and ghost + 4박 강조로 turnaround 느낌
        snare: [
          { time: '0:1:0' },
          { time: '0:2:2', velocity: 0.6 },
          { time: '0:3:0' },
        ],
        // hat velocity 0.6으로 약간 강조
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:0:3', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:3', velocity: 0.6 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:2:3', velocity: 0.6 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:3', velocity: 0.6 },
        ],
      },
      bass: {
        // walking turnaround — 4박 모두 step
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      // descending turnaround feel: 1박 내려오고 3박 강조
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },
  },

  /**
   * 12bar blues 구조:
   * - tpl.bars !== 12: shuffle_a 단순화
   * - idx=3 (4마디, 0-based): IV 진입 직전 → iv_pickup
   * - idx=10·11 (11·12마디): turnaround
   * - 나머지: 짝수 → shuffle_a, 홀수 → shuffle_b
   */
  selectSlot: (tpl, idx) => {
    const local = idx % tpl.bars;
    if (tpl.bars !== 12) return 'shuffle_a';
    if (local === 3) return 'iv_pickup';
    if (local === 10 || local === 11) return 'turnaround';
    return local % 2 === 0 ? 'shuffle_a' : 'shuffle_b';
  },
};
