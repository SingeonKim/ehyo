/**
 * minor.ts — backbeat with BPM-conditional density.
 *
 * 슬롯: groove_8th (빠른 템포, BPM > 90), groove_16th_sparse (느린 ballad, BPM ≤ 90), pickup.
 * tpl.default_bpm으로 density를 결정 — 결정론 유지.
 */

import type { CategoryRhythm } from '../types';

export const MINOR_RHYTHM: CategoryRhythm = {
  patterns: {
    // pop groove_a와 동일 — 빠른 마이너 백비트
    groove_8th: {
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

    // 느린 ballad용 — sparse 16th hat, 강한 스네어
    groove_16th_sparse: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0', velocity: 0.7 }, { time: '0:3:0', velocity: 0.7 }],
        // sparse 16th: 각 박의 정박(:0), 8th-and(:2), 그리고 :3로 긴장감 추가
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.4 },
          { time: '0:0:3', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.4 },
          { time: '0:2:3', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.4 },
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

    pickup: {
      drums: {
        // groove_8th + 4박 후반 스네어·킥 추가
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:3' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2' }],
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
  },

  /**
   * 마지막 마디 → pickup.
   * BPM 90 이하 → sparse 16th, 91 이상 → 8th.
   */
  selectSlot: (tpl, idx) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return tpl.default_bpm <= 90 ? 'groove_16th_sparse' : 'groove_8th';
  },
};
