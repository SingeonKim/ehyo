/**
 * modal.ts — vamp toggle (짝/홀수 alternate) + 3 variant 슬롯.
 *
 * 슬롯: groove_a, groove_b (기본 toggle), dorian_groove, lydian_dreamy, mixolydian_driving.
 * variant가 지정되면 해당 슬롯으로 직접 라우팅. 미지정 시 기존 toggle 동작 유지.
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

    // 16th hat funk-influenced dorian groove
    dorian_groove: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.5 },
          { time: '0:0:1', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:0:3', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.5 },
          { time: '0:1:1', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:1:3', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:2:1', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:2:3', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.5 },
          { time: '0:3:1', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.5 },
          { time: '0:3:3', velocity: 0.4 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.65 },
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:0', direction: 'down', velocity: 0.65 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ride bell sparse — lyrical lydian feel. hat은 4분주로 sparse하게
    lydian_dreamy: {
      drums: {
        kick: [{ time: '0:0:0' }],
        snare: [{ time: '0:2:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }] },
      guitar: [
        // soft strums: 1박과 3박만
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
      ],
    },

    // straight 8th hat + 4분주 bass + heavier guitar — mixolydian driving feel
    mixolydian_driving: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:0:2', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.6 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:2:2', velocity: 0.6 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.6 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0' },
          { time: '0:1:0' },
          { time: '0:2:0' },
          { time: '0:3:0' },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.65 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:0', direction: 'down', velocity: 0.65 },
        { time: '0:3:0', direction: 'down', velocity: 0.65 },
      ],
    },
  },

  /**
   * variant가 지정되면 해당 슬롯으로 직접 라우팅.
   * 미지정(undefined) 시 기존 짝/홀수 toggle 동작 유지 — 회귀 없음.
   */
  selectSlot: (_tpl, idx, variant) => {
    switch (variant) {
      case 'dorian_groove':
        return 'dorian_groove';
      case 'lydian_dreamy':
        return 'lydian_dreamy';
      case 'mixolydian_driving':
        return 'mixolydian_driving';
      default:
        // 기존 vamp toggle: 짝수 → groove_a, 홀수 → groove_b
        return idx % 2 === 0 ? 'groove_a' : 'groove_b';
    }
  },
};
