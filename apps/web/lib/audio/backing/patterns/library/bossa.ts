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

    // ── bossa_chromatic variant — major key + descending chromatic ────
    // Ipanema 패밀리. 기존 bossa 드럼/베이스 패턴 재사용, guitar는 마디당
    // 4× stab(1·2·3·4박)으로 quick chord change 표현.
    bossa_chromatic_main: {
      drums: {
        // bossa nova 표준 — kick 1·3박
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // snare cross-stick 2·4박, 약하게
        snare: [
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
        ],
        // hat 8분
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.35 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.35 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.35 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.35 },
        ],
      },
      bass: {
        // bossa 베이스: 1·3박 root
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
        ],
      },
      // 마디당 4× stab — 1·2·3·4박. quick chord change 표현(매 마디 다른 코드).
      guitar: [
        { time: '0:0:0', direction: 'down' as const, velocity: 0.55 },
        { time: '0:1:0', direction: 'down' as const, velocity: 0.5 },
        { time: '0:2:0', direction: 'down' as const, velocity: 0.55 },
        { time: '0:3:0', direction: 'down' as const, velocity: 0.5 },
      ],
    },

    // bar 8 — 마지막 stab(0:3:0)을 살짝 강하게(0.6) 다음 사이클 진입 액센트.
    // drums/bass/hat은 main과 동일 (의도적 중복 — bossa groove 베이스 유지).
    bossa_chromatic_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
        ],
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.35 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.35 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.35 },
          { time: '0:3:0', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.35 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' as const, velocity: 0.55 },
        { time: '0:1:0', direction: 'down' as const, velocity: 0.5 },
        { time: '0:2:0', direction: 'down' as const, velocity: 0.55 },
        // 마지막 stab 살짝 강하게 (다음 사이클 진입 액센트)
        { time: '0:3:0', direction: 'down' as const, velocity: 0.6 },
      ],
    },
  },

  /**
   * bossa_chromatic variant: bar 1~7 → main, bar 8(마지막) → resolve.
   * 기존 default: 마지막 마디 → pickup, 2마디 단위 clave 방향 전환.
   */
  selectSlot: (tpl, idx, variant) => {
    const local = idx % tpl.bars;
    if (variant === 'bossa_chromatic') {
      // bar 8(idx 7, local=bars-1)은 resolve, 나머지는 main
      return local === tpl.bars - 1 ? 'bossa_chromatic_resolve' : 'bossa_chromatic_main';
    }
    // 기존 bossa 분기 — clave 방향 교체 + 마지막 pickup
    if (local === tpl.bars - 1) return 'pickup';
    return Math.floor(idx / 2) % 2 === 0 ? 'clave_3_2' : 'clave_2_3';
  },
};
