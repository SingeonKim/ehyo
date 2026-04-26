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

    // folk_strum: strum_8th와 동일한 패턴이지만 variant 키로 직접 라우팅.
    // folk-I-IV-V 카드가 모든 마디에 일관된 down-up 8분 strum을 갖도록.
    folk_strum: {
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

    // ballad_pick: half-time finger-pick. kick 1박, snare 3박 backbeat, soft 4분 hat.
    // ballad-I-V-vi-IV 8bar 카드용. 70bpm 기준 호흡 길게.
    ballad_pick: {
      drums: {
        // half-time: kick 1박만
        kick: [{ time: '0:0:0' }],
        // half-time: snare 3박 backbeat (4박이 아닌 3박)
        snare: [{ time: '0:2:0', velocity: 0.45 }],
        // soft 4분 hat
        hat: [
          { time: '0:0:0', velocity: 0.3 },
          { time: '0:1:0', velocity: 0.3 },
          { time: '0:2:0', velocity: 0.3 },
          { time: '0:3:0', velocity: 0.3 },
        ],
      },
      bass: {
        // 1박 루트, 3박 루트(단순화)
        steps: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
        ],
      },
      // finger-pick: 8분 down 4번 (Travis 단순화). velocity 낮게.
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.35 },
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
   * variant 'folk_strum'/'ballad_pick' 지정 시 해당 슬롯 직접 라우팅.
   * 미지정 시 기존 짝/홀수 토글 + 마지막 마디 pickup 동작 유지.
   */
  selectSlot: (tpl, idx, variant) => {
    if (variant === 'folk_strum') return 'folk_strum';
    if (variant === 'ballad_pick') return 'ballad_pick';
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return local % 2 === 0 ? 'picking' : 'strum_8th';
  },
};
