/**
 * funk.ts — 16th hat, kick syncopation, shaker aux.
 *
 * 슬롯: groove_a (open hat), groove_b (closed/tight hat), pickup_one (4박 stab).
 * funk_form_16 variant: funk_a_main / funk_b_iv / funk_bridge_c / funk_stop_resolve.
 * shaker aux는 groove_a/b/pickup_one 모두 포함 (stop-time 슬롯 제외).
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

    // ── funk_form_16 variant (Cissy Strut form, The Meters) ──────────────────
    // A-section(bar 1-4, 7-12) / B-section iv7(bar 5-6) /
    // bridge bIII7-iv7-V7(bar 13-15) / stop-time(bar 16: kick 1박, snare 4박, hat 0)

    /**
     * funk_a_main: A-section (i7). 기존 groove_a 킥·스네어·hat과 동일 그루브 —
     * cissy-strut-funk 전용 슬롯으로 분리해 selectSlot 분기를 명확히 표현.
     */
    funk_a_main: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.8 },
          { time: '0:2:0' },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
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

    /**
     * funk_b_iv: B-section iv7 (bar 5-6). 드럼/베이스는 A-section과 동일 그루브.
     * guitar velocity를 0.75로 살짝 올려 화성 변화(iv7) 액센트.
     * BarPattern 타입상 슬롯 단위 복제 불가피 — harmonic 분기를 위한 명시적 슬롯.
     */
    funk_b_iv: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.8 },
          { time: '0:2:0' },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
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
      // iv7 화성 변화 액센트 — down stroke velocity 0.75로 약간 강조
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.75 },
        { time: '0:0:2', direction: 'up', velocity: 0.7 },
        { time: '0:1:0', direction: 'down', velocity: 0.75 },
        { time: '0:1:2', direction: 'up', velocity: 0.7 },
        { time: '0:2:0', direction: 'down', velocity: 0.75 },
        { time: '0:2:2', direction: 'up', velocity: 0.7 },
        { time: '0:3:0', direction: 'down', velocity: 0.75 },
        { time: '0:3:2', direction: 'up', velocity: 0.7 },
      ],
      aux: SHAKER_AUX,
    },

    /**
     * funk_bridge_c: bridge (bar 13-15, bIII7/iv7/V7).
     * kick에 4박-and(0:3:2) 추가(총 4개) — climax 직전 긴장 buildup.
     * guitar velocity 0.8으로 올려 climax 직전 강조.
     */
    funk_bridge_c: {
      drums: {
        kick: [
          { time: '0:0:0' },
          { time: '0:1:2', velocity: 0.85 },
          { time: '0:2:0' },
          // 4박-and 추가 — bridge tension buildup
          { time: '0:3:2', velocity: 0.7 },
        ],
        snare: [{ time: '0:1:0' }, { time: '0:3:0' }],
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
      // bridge climax 직전 — velocity 올려서 긴장감 표현
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.8 },
        { time: '0:0:2', direction: 'up', velocity: 0.75 },
        { time: '0:1:0', direction: 'down', velocity: 0.8 },
        { time: '0:1:2', direction: 'up', velocity: 0.75 },
        { time: '0:2:0', direction: 'down', velocity: 0.8 },
        { time: '0:2:2', direction: 'up', velocity: 0.75 },
        { time: '0:3:0', direction: 'down', velocity: 0.8 },
        { time: '0:3:2', direction: 'up', velocity: 0.75 },
      ],
      aux: SHAKER_AUX,
    },

    /**
     * funk_stop_resolve: stop-time bar 16.
     * funk의 본질 — 한 박 멈춤. kick 1박, snare 4박, hat/aux 완전 비움.
     * bass도 1박 stab만. guitar는 1박 + 4박 끝맺음.
     */
    funk_stop_resolve: {
      drums: {
        kick: [{ time: '0:0:0', velocity: 0.95 }],
        snare: [{ time: '0:3:0', velocity: 0.9 }],
        // stop-time — hat 완전 비움
        hat: [],
      },
      bass: {
        // 1박 stab만 — stop-time
        steps: [{ time: '0:0:0', velocity: 0.95 }],
      },
      // 1박 강한 stab + 4박 끝맺음
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.85 },
        { time: '0:3:0', direction: 'down', velocity: 0.8 },
      ],
      // shaker도 끔 — stop-time의 정적
      aux: [],
    },
  },

  /**
   * selectSlot — funk_form_16 variant 우선 평가 후 기존 1bar vamp fallback.
   *
   * funk_form_16 분기 (16bar Cissy Strut form):
   *   bar 16 (local=15) → funk_stop_resolve (stop-time)
   *   bar 13-15 (local=12-14) → funk_bridge_c (bIII7/iv7/V7 tension)
   *   bar 5-6 (local=4-5) → funk_b_iv (iv7 B-section)
   *   나머지 (bar 1-4, 7-12) → funk_a_main (i7 A-section)
   *
   * 1bar vamp fallback: pickup_one(4사이클 마지막) / groove_a/b(8마디 블록 alternate)
   * 다중 마디 fallback: 마지막 마디=pickup_one, 짝/홀수=groove_a/b
   */
  selectSlot: (tpl, idx, variant) => {
    const local = idx % tpl.bars;

    // funk_form_16 variant — 기존 1bar vamp 분기보다 먼저 평가해 회귀 안전
    if (variant === 'funk_form_16') {
      if (local === 15) return 'funk_stop_resolve';       // bar 16: stop-time
      if (local >= 12) return 'funk_bridge_c';            // bar 13-15: bridge tension
      if (local === 4 || local === 5) return 'funk_b_iv'; // bar 5-6: iv7 B-section
      return 'funk_a_main';                               // bar 1-4, 7-12: i7 A-section
    }

    // 기존 1bar vamp 분기 — 변경 없음
    if (tpl.bars === 1) {
      if (idx % 4 === 3) return 'pickup_one';
      return idx % 8 < 4 ? 'groove_a' : 'groove_b';
    }

    // 다중 마디 fallback
    if (local === tpl.bars - 1) return 'pickup_one';
    return local % 2 === 0 ? 'groove_a' : 'groove_b';
  },
};
