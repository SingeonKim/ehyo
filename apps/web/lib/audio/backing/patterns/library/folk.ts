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

    // ballad_pick_a: 짝수 마디 — half-time finger-pick 표준.
    // kick 1박, snare 3박 backbeat, soft 4분 hat.
    ballad_pick_a: {
      drums: {
        kick: [{ time: '0:0:0' }],
        snare: [{ time: '0:2:0', velocity: 0.45 }],
        hat: [
          { time: '0:0:0', velocity: 0.3 },
          { time: '0:1:0', velocity: 0.3 },
          { time: '0:2:0', velocity: 0.3 },
          { time: '0:3:0', velocity: 0.3 },
        ],
      },
      bass: {
        steps: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
        ],
      },
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.35 },
      ],
    },

    // ballad_pick_b: 홀수 마디 — 4박-and pickup으로 다음 마디 leading.
    // 짝/홀 alternating으로 8bar 단조 해소.
    ballad_pick_b: {
      drums: {
        kick: [{ time: '0:0:0' }],
        // 4박-and ghost snare 추가 — 다음 마디로 호흡 이끔
        snare: [
          { time: '0:2:0', velocity: 0.45 },
          { time: '0:3:2', velocity: 0.25 },
        ],
        // 4박-and hat ghost — pickup 보강
        hat: [
          { time: '0:0:0', velocity: 0.3 },
          { time: '0:1:0', velocity: 0.3 },
          { time: '0:2:0', velocity: 0.3 },
          { time: '0:3:0', velocity: 0.3 },
          { time: '0:3:2', velocity: 0.25 },
        ],
      },
      bass: {
        // 4박-and pickup note — 다음 마디 root anticipation
        steps: [
          { time: '0:0:0', velocity: 0.7 },
          { time: '0:2:0', velocity: 0.7 },
          { time: '0:3:2', velocity: 0.5 },
        ],
      },
      // 4박-and up strum — pickup feel
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.4 },
        { time: '0:1:0', direction: 'down', velocity: 0.35 },
        { time: '0:2:0', direction: 'down', velocity: 0.4 },
        { time: '0:3:0', direction: 'down', velocity: 0.35 },
        { time: '0:3:2', direction: 'up', velocity: 0.3 },
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

    // ── travis_pick variant — fingerstyle (Dust in the Wind 패밀리) ────
    // 드럼 비움(jazz comp_only 선례), bass alternating thumb 1·3박.
    // 슬래시 코드(I/VII, vim/V, I/III)를 포함한 진행에서 engine의
    // chordBassMidi가 bassSemitones를 받아 descending bass(C→B→A→G→F→E→D→C)
    // 자연 발현 — 이 슬롯은 단순히 1·3박을 예약하고 음 결정은 engine에 위임.
    travis_main: {
      drums: {
        // fingerstyle = no drums
        kick: [],
        snare: [],
        hat: [],
      },
      bass: {
        // Travis 엄지 alternating: 1박 root + 3박 root (or slash bass)
        steps: [
          { time: '0:0:0', velocity: 0.85 },
          { time: '0:2:0', velocity: 0.85 },
        ],
      },
      // finger arpeggio 8분 6 steps — 1·3박 빈 자리(bass thumb)을 제외한 off-beat.
      // 패턴: 1박-and / 2박 / 2박-and / 3박-and / 4박 / 4박-and
      guitar: [
        { time: '0:0:2', direction: 'down', velocity: 0.45 },
        { time: '0:1:0', direction: 'up', velocity: 0.5 },
        { time: '0:1:2', direction: 'down', velocity: 0.45 },
        { time: '0:2:2', direction: 'down', velocity: 0.45 },
        { time: '0:3:0', direction: 'up', velocity: 0.5 },
        { time: '0:3:2', direction: 'down', velocity: 0.45 },
      ],
    },

    // 마지막 마디 — 반복 재생 시 연속성을 위해 1박 sustain + 3박 thumb 유지.
    // travis_main의 1·3박 alternating thumb 패턴을 dynamic을 줄여 약하게 이어감 →
    // bar 8 → bar 1로 매끈하게 loop.
    travis_resolve: {
      drums: {
        kick: [],
        snare: [],
        hat: [],
      },
      bass: {
        // 1박 root + 3박 thumb (alternating 유지, 두 번째는 약하게)
        steps: [
          { time: '0:0:0', velocity: 0.9 },
          { time: '0:2:0', velocity: 0.65 },
        ],
      },
      // 1박 final pluck + 3박-and 부드러운 pickup으로 다음 사이클 진입 예고
      guitar: [
        { time: '0:0:0', direction: 'down', velocity: 0.65 },
        { time: '0:3:2', direction: 'up', velocity: 0.35 },
      ],
    },
  },

  /**
   * variant 'folk_strum'/'ballad_pick'/'travis_pick' 지정 시 해당 슬롯 직접 라우팅.
   * 미지정 시 기존 짝/홀수 토글 + 마지막 마디 pickup 동작 유지.
   */
  selectSlot: (tpl, idx, variant) => {
    // local은 항상 1회만 선언 — 모든 분기에서 재사용
    const local = idx % tpl.bars;
    if (variant === 'travis_pick') {
      // 마지막 마디 → travis_resolve (하강 베이스 라인 종점), 나머지 → travis_main
      return local === tpl.bars - 1 ? 'travis_resolve' : 'travis_main';
    }
    if (variant === 'folk_strum') return 'folk_strum';
    if (variant === 'ballad_pick') {
      // 짝수 마디 → ballad_pick_a (표준), 홀수 → ballad_pick_b (4박-and pickup)
      return local % 2 === 0 ? 'ballad_pick_a' : 'ballad_pick_b';
    }
    if (local === tpl.bars - 1) return 'pickup';
    return local % 2 === 0 ? 'picking' : 'strum_8th';
  },
};
