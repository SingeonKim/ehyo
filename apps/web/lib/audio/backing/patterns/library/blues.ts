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
    groove_a: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // sub 0 + sub 2(8분 off-beat). swing 0.66 적용 시 sub 2가 0.66박 위치로 밀려 long-short feel.
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // 단순한 4 다운스트럼 — 블루스 리듬 기타
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.55 },
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:2:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
      ],
    },

    groove_b: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // off-beat을 0.7로 강조
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.7 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.7 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
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
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:2', velocity: 0.55 },
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

    // ── slow variant ─────────────────────────────────────────────────
    slow_groove: {
      drums: {
        // ½ time feel: kick 1박, snare 3박만
        kick: [{ time: '0:0:0' }],
        snare: [{ time: '0:2:0' }],
        // ride triplet8 — 각 박의 long, short만 (가운데 음 생략 = slow drag feel)
        hat: [
          { time: '0:0:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:0:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:1:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:2:2', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:0', unit: 'triplet8', velocity: 0.45 },
          { time: '0:3:2', unit: 'triplet8', velocity: 0.45 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      // sparse legato strums
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.45 },
        { time: '0:2:0', direction: 'down', velocity: 0.45 },
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
      // comp: 2 & 4박에 short stab
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.55 },
        { time: '0:3:0', direction: 'down', velocity: 0.55 },
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
      guitar: [
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // ── straight_shuffle variant ─────────────────────────────────────
    groove_b16: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
        // 16th hat — sub 0/1/2/3 모두 (swing 0.66 적용 시 sub 2만 밀림)
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:1', velocity: 0.4 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:0:3', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:1', velocity: 0.4 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:1:3', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:1', velocity: 0.4 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.55 },
          { time: '0:3:1', velocity: 0.4 },
          { time: '0:3:2', velocity: 0.55 },
          { time: '0:3:3', velocity: 0.4 },
        ],
      },
      bass: { steps: [{ time: '0:0:0' }, { time: '0:2:0' }] },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.6 },
        { time: '0:1:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:0', direction: 'down', velocity: 0.6 },
        { time: '0:3:0', direction: 'down', velocity: 0.6 },
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
  },

  /**
   * variant 라우팅:
   *  - undefined / 'shuffle12bar' → 기존 4-슬롯 분기
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
        return local === 10 || local === 11 ? 'hb_turnaround' : 'hb_walk';
      case 'straight_shuffle':
        if (local === 3) return 'iv_pickup';
        if (local === 10 || local === 11) return 'turnaround';
        return 'groove_b16';
      case 'major_swing':
        return local === 10 || local === 11 ? 'ms_turnaround' : 'ms_comp';
      case 'jump':
        return local === 10 || local === 11 ? 'jump_turnaround' : 'jump_drive';
      default:
        if (local === 3) return 'iv_pickup';
        if (local === 10 || local === 11) return 'turnaround';
        return local % 2 === 0 ? 'groove_a' : 'groove_b';
    }
  },
};
