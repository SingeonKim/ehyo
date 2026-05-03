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

    // ── epic_minor_halftime variant ─────────────────────────────────
    // cinematic dread — half-time feel, tom 강조, bar 13 buildup, bar 16 crash 해결.
    // 기본 마디 (bar 1-12, 14-15): kick 1·3박만, snare 3박만, hat 4분만.
    epic_main: {
      drums: {
        // half-time: kick 1·3박만 (4-on-the-floor 대신 대공간감 표현)
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // snare 3박만 (2/4 backbeat 제거 — cinematic 장엄함)
        snare: [{ time: '0:2:0' }],
        // hat 4분만 (8분 비움 — 넓은 공간감 확보)
        hat: [
          { time: '0:0:0', velocity: 0.4 },
          { time: '0:1:0', velocity: 0.4 },
          { time: '0:2:0', velocity: 0.4 },
          { time: '0:3:0', velocity: 0.4 },
        ],
      },
      bass: {
        // sustained low — 1박만 타격 후 홀드 (cinematic 중후함)
        steps: [{ time: '0:0:0', velocity: 0.9 }],
      },
      // sustained power-chord-arpeggio: 1·3박 down strum
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.6 },
        { time: '0:2:0', direction: 'down', velocity: 0.5 },
      ],
    },

    // bar 13(iv) 도착 강조 — tom velocity crescendo buildup.
    epic_climax: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        snare: [{ time: '0:2:0' }],
        hat: [
          { time: '0:0:0', velocity: 0.5 },
          { time: '0:1:0', velocity: 0.5 },
          { time: '0:2:0', velocity: 0.5 },
          { time: '0:3:0', velocity: 0.5 },
        ],
        // tom buildup — 각 박 후반(8분 위치)에 velocity crescendo 0.5→0.8
        tom: [
          { time: '0:0:2', velocity: 0.5 },
          { time: '0:1:2', velocity: 0.6 },
          { time: '0:2:2', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.8 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0', velocity: 0.95 }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.6 },
      ],
    },

    // bar 16(i) 귀환 — crash + tom roll로 장엄한 끝맺음.
    epic_resolve: {
      drums: {
        kick: [{ time: '0:0:0', velocity: 0.95 }],
        snare: [],
        hat: [],
        // 1박에 crash로 해결감 표현 (LM-2: 'crash' 확인됨)
        crash: [{ time: '0:0:0', velocity: 0.9 }],
        // tom roll 마무리
        tom: [
          { time: '0:0:2', velocity: 0.6 },
          { time: '0:1:0', velocity: 0.7 },
          { time: '0:1:2', velocity: 0.8 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0', velocity: 0.95 }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.85 },
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
   *
   * epic_minor_halftime: bar 13(idx 12) = climax, bar 16(idx 15) = resolve, 나머지 = main.
   */
  selectSlot: (tpl, idx, variant) => {
    // epic_minor_halftime — 16bar cinematic half-time 전용 분기
    if (variant === 'epic_minor_halftime') {
      const local = idx % tpl.bars;
      if (local === 12) return 'epic_climax';   // bar 13: iv 도착 강조
      if (local === 15) return 'epic_resolve';  // bar 16: i 귀환 crash 해결
      return 'epic_main';
    }
    // 기존 minor 분기 — BPM과 마지막 마디 기준
    const local = idx % tpl.bars;
    if (local === tpl.bars - 1) return 'pickup';
    return tpl.default_bpm <= 90 ? 'groove_16th_sparse' : 'groove_8th';
  },
};
