/**
 * bossa.ts — clave 3-2 / 2-3 alternate, partido alto guitar, clave aux.
 *
 * 슬롯: clave_3_2, clave_2_3, pickup.
 * idx/2의 짝수/홀수로 2마디 단위 clave 방향이 전환된다.
 * aux에 son clave 5개 노트를 담는다.
 */

import type { CategoryRhythm } from '../types';

// bossa hat: 부드러운 8th, velocity 0.35
const BOSSA_HAT = [
  { time: '0:0:0', velocity: 0.35 },
  { time: '0:0:2', velocity: 0.35 },
  { time: '0:1:0', velocity: 0.35 },
  { time: '0:1:2', velocity: 0.35 },
  { time: '0:2:0', velocity: 0.35 },
  { time: '0:2:2', velocity: 0.35 },
  { time: '0:3:0', velocity: 0.35 },
  { time: '0:3:2', velocity: 0.35 },
];

// 킥: bossa 패턴 — 1박 + 3박-and
const BOSSA_KICK = [{ time: '0:0:0' }, { time: '0:2:2' }];

// 베이스: 1·3박 루트
const BOSSA_BASS = [{ time: '0:0:0' }, { time: '0:2:0' }];

// 기타: partido alto syncopation
const PARTIDO_ALTO_GUITAR = [
  { time: '0:0:0', direction: 'down' as const, velocity: 0.45 },
  { time: '0:0:3', direction: 'up' as const, velocity: 0.45 },
  { time: '0:1:2', direction: 'down' as const, velocity: 0.45 },
  { time: '0:2:0', direction: 'up' as const, velocity: 0.45 },
  { time: '0:3:0', direction: 'down' as const, velocity: 0.45 },
];

export const BOSSA_RHYTHM: CategoryRhythm = {
  patterns: {
    clave_3_2: {
      drums: {
        kick: BOSSA_KICK,
        // bossa는 snare 없음 (rim/brush는 추후)
        snare: [],
        hat: BOSSA_HAT,
      },
      bass: { steps: BOSSA_BASS },
      guitar: PARTIDO_ALTO_GUITAR,
      // son clave 3-2: 1·2·3-and / 4-and·?
      // 실제 3-2 son clave 5개 노트: beat1, beat2(+and), beat3+and, beat1of2nd, beat3of2nd
      // 한 마디로 단순화: 0, 3, 6, 10, 12 (16th 단위) = 0:0:0, 0:0:3, 0:1:2, 0:2:2, 0:3:0
      aux: [
        { time: '0:0:0', velocity: 0.6 },
        { time: '0:0:3', velocity: 0.6 },
        { time: '0:1:2', velocity: 0.6 },
        { time: '0:2:2', velocity: 0.6 },
        { time: '0:3:2', velocity: 0.6 },
      ],
    },

    clave_2_3: {
      drums: {
        kick: BOSSA_KICK,
        snare: [],
        hat: BOSSA_HAT,
      },
      bass: { steps: BOSSA_BASS },
      guitar: PARTIDO_ALTO_GUITAR,
      // son clave 2-3: 0:0:2, 0:1:2, 0:2:0, 0:2:3, 0:3:2 (16th 위치 4, 6, 8, 11, 14)
      aux: [
        { time: '0:0:2', velocity: 0.6 },
        { time: '0:1:2', velocity: 0.6 },
        { time: '0:2:0', velocity: 0.6 },
        { time: '0:2:3', velocity: 0.6 },
        { time: '0:3:2', velocity: 0.6 },
      ],
    },

    pickup: {
      drums: {
        kick: BOSSA_KICK,
        snare: [],
        // 4박-and hat 강조 추가
        hat: [
          ...BOSSA_HAT,
          { time: '0:3:3', velocity: 0.5 },
        ],
      },
      bass: {
        // 4박-and leading note 추가
        steps: [...BOSSA_BASS, { time: '0:3:2' }],
      },
      guitar: PARTIDO_ALTO_GUITAR,
      // clave_3_2 패턴 유지
      aux: [
        { time: '0:0:0', velocity: 0.6 },
        { time: '0:0:3', velocity: 0.6 },
        { time: '0:1:2', velocity: 0.6 },
        { time: '0:2:2', velocity: 0.6 },
        { time: '0:3:2', velocity: 0.6 },
      ],
    },
  },

  /**
   * 마지막 마디 → pickup.
   * 2마디 단위로 clave 방향 전환: Math.floor(idx/2) 짝수 → 3_2, 홀수 → 2_3.
   */
  selectSlot: (tpl, idx, _variant) => {
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return Math.floor(idx / 2) % 2 === 0 ? 'clave_3_2' : 'clave_2_3';
  },
};
