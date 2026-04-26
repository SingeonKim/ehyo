/**
 * funk.ts — 16th hat, kick syncopation, shaker aux.
 *
 * 슬롯: groove_a (open hat), groove_b (closed/tight hat), pickup_one (4박 stab).
 * shaker aux는 groove_a/b/pickup_one 모두 포함.
 */

import type { CategoryRhythm } from '../types';

// 16분음 16개 전체 시각 — hat·shaker 공통
const ALL_16TH: string[] = [
  '0:0:0', '0:0:1', '0:0:2', '0:0:3',
  '0:1:0', '0:1:1', '0:1:2', '0:1:3',
  '0:2:0', '0:2:1', '0:2:2', '0:2:3',
  '0:3:0', '0:3:1', '0:3:2', '0:3:3',
];

/**
 * groove_a hat: 1·3박(beat 0·2) 첫 서브는 0.6, 나머지 0.4.
 * "open" 느낌 — 모든 16th 다 열려 있음.
 */
const GROOVE_A_HAT = ALL_16TH.map((time) => {
  const beat = parseInt(time.split(':')[1]!, 10);
  const sub = parseInt(time.split(':')[2]!, 10);
  // 각 박의 첫 sub(:0)를 강조
  const velocity = sub === 0 && (beat === 0 || beat === 2) ? 0.6 : 0.4;
  return { time, velocity };
});

/**
 * groove_b hat: groove_a에서 odd sub(:1, :3)을 velocity 0.3으로 낮춤.
 * 좀 더 tight하고 차분한 느낌.
 */
const GROOVE_B_HAT = ALL_16TH.map((time) => {
  const sub = parseInt(time.split(':')[2]!, 10);
  const beat = parseInt(time.split(':')[1]!, 10);
  const isOddSub = sub % 2 === 1;
  const isDownbeatFirst = sub === 0 && (beat === 0 || beat === 2);
  const velocity = isDownbeatFirst ? 0.6 : isOddSub ? 0.3 : 0.4;
  return { time, velocity };
});

// shaker: 16th 전부, velocity 0.3
const SHAKER_AUX = ALL_16TH.map((time) => ({ time, velocity: 0.3 }));

export const FUNK_RHYTHM: CategoryRhythm = {
  patterns: {
    groove_a: {
      drums: {
        // 킥: 1박 + 2박-and syncopation(16th 앞당김) + 3박
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.8 },
          { time: '0:2:0' },
        ],
        // 스네어: 2박·4박 백비트
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: GROOVE_A_HAT,
      },
      bass: {
        // 펑크 베이스: 16th 시너코페이션
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:0:3', velocity: 0.85 },
          { time: '0:1:2', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:2:3', velocity: 0.85 },
          { time: '0:3:2', velocity: 0.85 },
        ],
      },
      // 기타: 16th muted stab — up/down alternate
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:0:2', direction: 'up', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:2', direction: 'up', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:2', direction: 'up', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:2', direction: 'up', velocity: 0.7 },
      ],
      // shaker aux
      aux: SHAKER_AUX,
    },

    groove_b: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.8 },
          { time: '0:2:0' },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // odd sub를 낮춰서 더 tight한 느낌
        hat: GROOVE_B_HAT,
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:0:3', velocity: 0.85 },
          { time: '0:1:2', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:2:3', velocity: 0.85 },
          { time: '0:3:2', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:0:2', direction: 'up', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:2', direction: 'up', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:2', direction: 'up', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:2', direction: 'up', velocity: 0.7 },
      ],
      aux: SHAKER_AUX,
    },

    pickup_one: {
      drums: {
        // groove_a 기반 + 4박 후반 스네어 ghost 추가
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.8 },
          { time: '0:2:0' },
          { time: '0:3:2' },
        ],
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0' },
          { time: '0:3:1', velocity: 0.4 },
          { time: '0:3:3', velocity: 0.5 },
        ],
        hat: GROOVE_A_HAT,
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:0:3', velocity: 0.85 },
          { time: '0:1:2', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:2:3', velocity: 0.85 },
          { time: '0:3:2', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:0:2', direction: 'up', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:2', direction: 'up', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:2', direction: 'up', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:2', direction: 'up', velocity: 0.7 },
      ],
      aux: SHAKER_AUX,
    },
  },

  /**
   * 1마디 vamp 특별 처리: 4사이클 마지막 = pickup, 8마디 블록 내 a/b alternate.
   * 다중 마디: 마지막 마디 = pickup_one, 나머지 짝/홀수 alternate.
   */
  selectSlot: (tpl, idx) => {
    if (tpl.bars === 1) {
      if (idx % 4 === 3) return 'pickup_one';
      return idx % 8 < 4 ? 'groove_a' : 'groove_b';
    }
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup_one';
    return local % 2 === 0 ? 'groove_a' : 'groove_b';
  },
};
