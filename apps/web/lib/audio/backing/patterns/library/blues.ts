/**
 * Blues — Sprint 9 PR-C에서 카드별 variant + swing 0.66 도입.
 *
 * variant 풀:
 *  - shuffle12bar(default): 정통 12bar shuffle. groove_a/b + iv_pickup + turnaround.
 *    hat은 sub 0 + sub 2(8분 off-beat). swing 0.66 자동 적용 → long-short feel.
 *  - slow: ½ time feel. ride triplet8 명시. drums sparse.
 *  - hard_bop: ride triplet8 모든 음(가운데 ghost), walking bass.
 *  - straight_shuffle: groove_b16(16th hat 추가).
 *  - major_swing: walking bass + comping (jazz-influenced).
 *  - jump: driving 8th, hat sub 0+2 strong.
 */

import type { CategoryRhythm } from '../types';

export const BLUES_RHYTHM: CategoryRhythm = {
  swing: {
    default: 0.66,
    perVariant: {
      hard_bop: 0.62,
      jump: 0.55,
    },
  },
  patterns: {
    // ── shuffle12bar variant ─────────────────────────────────────────
    // hat은 12/8 정통 셔플 — 각 박마다 triplet8 long/mid(ghost)/short 3음.
    // sub16 + swing보다 sub 1(가운데 ghost)이 명시되어 12/8 feel 더 풍부.
    groove_a: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 12/8 셔플 — triplet8 long(0.55) + mid ghost(0.32) + short(0.45)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 8분 down/up 셔플 컴핑 — sub 2가 swing 0.66으로 밀려 long-short feel.
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:0:2', direction: 'up', velocity: 0.45 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:2', direction: 'up', velocity: 0.45 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:2', direction: 'up', velocity: 0.45 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:2', direction: 'up', velocity: 0.45 },
      ],
    },

    groove_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 12/8 셔플 — short(트리플렛 3번째 음)을 0.6으로 강조한 groove_b 변주
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.6 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 8분 down/up — off-beat sub 2 강조로 groove_b 특성
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:0:2', direction: 'up', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:2', direction: 'up', velocity: 0.5 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:2', direction: 'up', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:2', direction: 'up', velocity: 0.5 },
      ],
    },

    iv_pickup: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 12/8 셔플 — groove_a와 동일 (IV 진입 직전이라도 hat 그루브 유지)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: {
        // 4박-and에 leading note 추가 — IV 코드 진입 강조
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
      },
      // 8분 down/up — IV 진입 직전이라도 셔플 그루브 유지
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:0:2', direction: 'up', velocity: 0.45 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:2', direction: 'up', velocity: 0.45 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:2', direction: 'up', velocity: 0.45 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:2', direction: 'up', velocity: 0.45 },
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
        // 12/8 셔플 — long 0.6, mid ghost 0.35, short 0.5 (turnaround climax dynamic)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.5 },
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

    // ── shuffle12bar 9~12마디 4-way 변주 ─────────────────────────────
    // bar 9 (V7): 긴장 빌드업 — kick driving 8th, hat strong, fill snare
    tension: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:0:2', velocity: 0.65 },
          { time: '0:2:0' },
          { time: '0:2:2', velocity: 0.65 },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.55 }],
        // 12/8 셔플 — tension dynamics (long 0.65, mid 0.4, short 0.55)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.55 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 8분 down/up — strong + 4박 끝 fill anticipation
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.65 },
        { time: '0:0:2', direction: 'up', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:1:2', direction: 'up', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:2', direction: 'up', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:2', direction: 'up', velocity: 0.6 },
      ],
    },

    // bar 11 (I7): 안정 — 가라앉음, 4분주 단순화 (turnaround 직전 평이)
    resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 12/8 셔플 — resolve dynamics (groove_a와 거의 동일, 안정 평이)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 4분주 down — 안정 (8th 컴핑 줄여서 가라앉음 표현, turnaround 빌드업 대비)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.5 },
        { time: '0:2:0', direction: 'down', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.5 },
      ],
    },

    // ── slow variant ─────────────────────────────────────────────────
    slow_groove: {
      drums: {
        // ½ time feel: kick 1박, snare 3박만
        kick: [{ time: '0:0:0' }],
        snare: [{ time: '0:2:0' }],
        // ride triplet8 — 12/8 정통 slow blues: 각 박마다 long-mid-short 3음 모두
      hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.42 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.42 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.42 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.42 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 4분주 down strum — slow blues comping (½ time feel 유지하면서 sustain)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.4 },
        { time: '0:2:0', direction: 'down', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.4 },
      ],
    },

    // ── hard_bop variant ─────────────────────────────────────────────
    hb_walk: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // ride triplet8 — long(0.8) - middle ghost(0.4) - short(0.7)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.4 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.7 },
        ],
      },
      // walking bass: 4박 모두
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.8 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.8 },
          { time: '0:3:0', velocity: 0.7 },
        ],
      },
      // Freddie Green 4분주 컴핑 — 1+3박 light(stab off-beat 느낌), 2+4박 strong
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    hb_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.5 }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.8 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.85 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      // Freddie Green 4분주 — turnaround라 전반적으로 더 강하게
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.45 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:0', direction: 'down', velocity: 0.45 },
        { time: '0:3:0', direction: 'down', velocity: 0.65 },
      ],
    },

    // ── straight_shuffle variant ─────────────────────────────────────
    // shuffle_minor_blues 카드용 — Sprint 9 PR-D 후속에서 hat을 triplet8 12-step
    // (각 박마다 long-mid-short 3음 모두)으로 변경. 정통 12/8 셔플 표현.
    groove_b16: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 12/8 셔플 ride — long(0.55) + mid ghost(0.35) + short(0.5)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.5 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 8분 down/up — straight_shuffle도 셔플 그루브 유지 (16th hat은 hat에만)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.6 },
        { time: '0:0:2', direction: 'up', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:1:2', direction: 'up', velocity: 0.5 },
        { time: '0:2:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:2', direction: 'up', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:2', direction: 'up', velocity: 0.5 },
      ],
    },

    // ── major_swing variant ──────────────────────────────────────────
    ms_comp: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.8 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.8 },
          { time: '0:3:0', velocity: 0.7 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    ms_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:2:2', velocity: 0.6 }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.6 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.6 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.6 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.6 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ── jump variant ─────────────────────────────────────────────────
    jump_drive: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:0:2', velocity: 0.7 }, { time: '0:2:0' }, { time: '0:2:2', velocity: 0.7 }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:1:0' }, { time: '0:2:0' }, { time: '0:3:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.7 },
      ],
    },

    jump_turnaround: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:2:0' },
          { time: '0:3:2', velocity: 0.8 },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.8 },
      ],
    },

    // ── hard_bop 9/11마디 변주 ────────────────────────────────────────
    // bar 9 V7 빌드업: hb_walk + driving 4박 + comp accent
    hb_tension: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:1:0', velocity: 0.5 }, { time: '0:2:0' }, { time: '0:3:0', velocity: 0.5 }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.55 }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.75 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.75 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.75 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.85 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.75 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.8 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.8 },
        ],
      },
      // comp 4박 모두 (Freddie Green dense)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:0', direction: 'down', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.65 },
      ],
    },

    // bar 11 I7 안정: hb_walk dynamic 살짝 낮춤 (turnaround 빌드업 직전 평이)
    hb_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.7 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.35 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.7 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.35 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.7 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.35 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.35 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.6 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.75 },
          { time: '0:1:0', velocity: 0.65 },
          { time: '0:2:0', velocity: 0.75 },
          { time: '0:3:0', velocity: 0.65 },
        ],
      },
      // comp sparse — 2박만
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.5 },
      ],
    },

    // ── straight_shuffle 8·11·12마디 변주 ─────────────────────────────
    // bar 9 V7 빌드업: kick driving 8th + bass walking + guitar strong
    b16_tension: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:0:2', velocity: 0.65 },
          { time: '0:2:0' },
          { time: '0:2:2', velocity: 0.65 },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.55 }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.6 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.6 },
        ],
      },
      // walking bass 4박 (straight_shuffle 캐릭터 강화)
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.75 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.75 },
        ],
      },
      // 8분 down/up strong
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:0:2', direction: 'up', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.7 },
        { time: '0:1:2', direction: 'up', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:2', direction: 'up', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.75 },
        { time: '0:3:2', direction: 'up', velocity: 0.6 },
      ],
    },

    // bar 11 I7 안정
    b16_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.5 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 4분주 단순화 (안정 — 다음 turnaround 대비)
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    // bar 12 V7 turnaround climax (straight_shuffle 자체 — 12-Bar turnaround와 분리)
    b16_turnaround: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:2:2', velocity: 0.6 }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:0:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:1:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.65 },
          { time: '0:2:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.7 },
          { time: '0:3:1', unit: 'triplet8', velocity: 0.55 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.65 },
        ],
      },
      // walking turnaround (4박)
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.85 },
        ],
      },
      // 8분 down/up 강조 + 마지막 박 strong
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.65 },
        { time: '0:0:2', direction: 'up', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:1:2', direction: 'up', velocity: 0.5 },
        { time: '0:2:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:2', direction: 'up', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.75 },
        { time: '0:3:2', direction: 'up', velocity: 0.6 },
      ],
    },

    // ── major_swing 4·8·9·11마디 변주 ────────────────────────────────
    // bar 4(idx=3) / bar 8(idx=7) fill — ms_comp + 0:2:2 ghost snare
    ms_fill: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 4박째 직전 ghost snare (ms_turnaround와 동일 fill 패턴)
        snare: [{ time: '0:1:0' }, { time: '0:2:2', velocity: 0.55 }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.8 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.8 },
          { time: '0:3:0', velocity: 0.7 },
        ],
      },
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    // bar 9 V7 빌드업
    ms_tension: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:1:0', velocity: 0.55 }, { time: '0:2:0' }, { time: '0:3:0', velocity: 0.55 }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }, { time: '0:3:2', velocity: 0.6 }],
        hat: [
          { time: '0:0:0', velocity: 0.65 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.65 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.65 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.65 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:1:0', velocity: 0.8 },
          { time: '0:2:0', velocity: 0.85 },
          { time: '0:3:0', velocity: 0.8 },
        ],
      },
      // comp 4박 dense
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.5 },
        { time: '0:1:0', direction: 'down', velocity: 0.65 },
        { time: '0:2:0', direction: 'down', velocity: 0.5 },
        { time: '0:3:0', direction: 'down', velocity: 0.65 },
      ],
    },

    // bar 11 I7 안정
    ms_resolve: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.5 },
          { time: '0:0:2', velocity: 0.45 },
          { time: '0:1:0', velocity: 0.5 },
          { time: '0:1:2', velocity: 0.45 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:2:2', velocity: 0.45 },
          { time: '0:3:0', velocity: 0.5 },
          { time: '0:3:2', velocity: 0.45 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.75 },
          { time: '0:1:0', velocity: 0.65 },
          { time: '0:2:0', velocity: 0.75 },
          { time: '0:3:0', velocity: 0.65 },
        ],
      },
      // comp sparse
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.5 },
      ],
    },
  },

  /**
   * variant 라우팅 (12bar 구조 기준):
   *  - 'shuffle12bar'(default): 9·11·12마디만 변주 (긴장-안정-턴어라운드).
   *    10마디(IV7)는 사용자 검수 결과 다이나믹 원복 — 일반 짝/홀 alternating에 위임.
   *      idx 3 iv_pickup, 8 tension, 10 resolve, 11 turnaround,
   *      else 짝수 groove_a / 홀수 groove_b
   *  - 'slow' → 모든 idx → slow_groove
   *  - 'hard_bop' → 10/11 → hb_turnaround, else hb_walk
   *  - 'straight_shuffle' → idx 3 iv_pickup, 10/11 turnaround, else groove_b16
   *  - 'major_swing' → 10/11 ms_turnaround, else ms_comp
   *  - 'jump' → 10/11 jump_turnaround, else jump_drive
   *
   * tpl.bars !== 12면 variant 무시하고 groove_a 단순화.
   */
  selectSlot: (tpl, idx, variant) => {
    const local = idx % tpl.bars;
    if (tpl.bars !== 12) return 'groove_a';

    switch (variant) {
      case 'slow':
        return 'slow_groove';
      case 'hard_bop':
        // 9마디 V7 빌드업 / 11마디 I7 안정 / 12마디 V7 turnaround climax
        if (local === 8) return 'hb_tension';
        if (local === 10) return 'hb_resolve';
        if (local === 11) return 'hb_turnaround';
        return 'hb_walk';
      case 'straight_shuffle':
        // 4마디 IV pickup / 9마디 빌드업 / 11마디 안정 / 12마디 자체 turnaround
        if (local === 3) return 'iv_pickup';
        if (local === 8) return 'b16_tension';
        if (local === 10) return 'b16_resolve';
        if (local === 11) return 'b16_turnaround';
        return 'groove_b16';
      case 'major_swing':
        // 4·8마디 ghost snare fill / 9마디 빌드업 / 11마디 안정 / 12마디 turnaround
        if (local === 3 || local === 7) return 'ms_fill';
        if (local === 8) return 'ms_tension';
        if (local === 10) return 'ms_resolve';
        if (local === 11) return 'ms_turnaround';
        return 'ms_comp';
      case 'jump':
        return local === 10 || local === 11 ? 'jump_turnaround' : 'jump_drive';
      default:
        // shuffle12bar: 9·11·12마디 빌드업 (10마디는 alternating에 위임)
        if (local === 3) return 'iv_pickup';
        if (local === 8) return 'tension';
        if (local === 10) return 'resolve';
        if (local === 11) return 'turnaround';
        return local % 2 === 0 ? 'groove_a' : 'groove_b';
    }
  },
};
