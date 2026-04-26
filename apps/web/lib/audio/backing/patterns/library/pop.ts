/**
 * pop.ts — straight 8th backbeat 리듬 카테고리.
 *
 * 슬롯: groove_a (짝수 마디), groove_b (홀수 마디), turnaround (마지막 마디).
 * groove_a/b는 hat 강조·bass ghost 여부만 다르다.
 */

import type { CategoryRhythm } from '../types';

export const POP_RHYTHM: CategoryRhythm = {
  patterns: {
    groove_a: {
      drums: {
        // 킥: 1박·3박 정박
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 스네어: 2박·4박 백비트
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 하이햇: 8분 직선 (D _ D U _ U D U 느낌), 모두 velocity 0.5
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
        // 베이스: 1박·3박 루트
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 기타: D _ D U _ U D U 스트럼 패턴
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:1:2', direction: 'up' },
        { time: '0:2:2', direction: 'up' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    groove_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // groove_a와 같지만 4박 hat을 velocity 0.7로 강조
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
        // 4박-and에 ghost note 추가 — 다음 마디로 이어주는 느낌
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

    turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 3박-and에 ghost snare 추가해서 다음 섹션 진입 긴장감
        snare: [{ time: '0:1:0' }, { time: '0:2:3', velocity: 0.4 }, { time: '0:3:0' }],
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
        // 4박-and에 leading tone 추가
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
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
   * 마지막 마디 → turnaround, 나머지 짝/홀수 alternate.
   * barIndexAbs 기준이므로 tpl.bars로 나머지를 구해 로컬 인덱스 계산.
   */
  selectSlot: (tpl, idx, _variant) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'turnaround';
    return local % 2 === 0 ? 'groove_a' : 'groove_b';
  },
};
