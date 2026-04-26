/**
 * rock.ts — straight 8th, ghost snare on 2-and.
 *
 * 슬롯: groove (메인), pickup_eighth (끝에서 두 번째), fill_quarter (마지막 마디).
 * 4마디 이상일 때만 pickup/fill 발동 — 짧은 루프는 groove만.
 */

import type { CategoryRhythm } from '../types';

export const ROCK_RHYTHM: CategoryRhythm = {
  patterns: {
    groove: {
      drums: {
        // 킥: 1박·3박
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 스네어: 2박 백비트 + 2박-and ghost(velocity 0.3)
        snare: [
          { time: '0:1:0' },
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:0' },
        ],
        // 하이햇: 8분 직선, velocity 0.55
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
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // 강한 다운스트럼 위주 — 록 파워코드 느낌
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    pickup_eighth: {
      drums: {
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }, { time: '0:3:2' }],
        // 4박-and에 스네어 추가해서 다음 마디 fill로 넘어가는 긴장감
        snare: [
          { time: '0:1:0' },
          { time: '0:1:2', velocity: 0.3 },
          { time: '0:3:0' },
          { time: '0:3:2', velocity: 0.6 },
        ],
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
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      guitar: [
        { time: '0:0:0', direction: 'down' },
        { time: '0:0:2', direction: 'down' },
        { time: '0:1:0', direction: 'down' },
        { time: '0:2:0', direction: 'down' },
        { time: '0:3:0', direction: 'down' },
        { time: '0:3:2', direction: 'up' },
      ],
    },

    fill_quarter: {
      drums: {
        // 4박은 fill로 채움 — kick은 1·3박만
        kick: [{ time: '0:0:0' }, { time: '0:2:0' }],
        // 4박에 연속 스네어 fill (velocity 점점 크게)
        snare: [
          { time: '0:1:0' },
          { time: '0:3:0', velocity: 0.7 },
          { time: '0:3:1', velocity: 0.75 },
          { time: '0:3:2', velocity: 0.8 },
          { time: '0:3:3', velocity: 0.9 },
        ],
        // 4박은 hat 비움 — fill이 돋보이도록
        hat: [
          { time: '0:0:0', velocity: 0.55 },
          { time: '0:0:2', velocity: 0.55 },
          { time: '0:1:0', velocity: 0.55 },
          { time: '0:1:2', velocity: 0.55 },
          { time: '0:2:0', velocity: 0.55 },
          { time: '0:2:2', velocity: 0.55 },
          { time: '0:2:3', velocity: 0.55 },
        ],
      },
      bass: {
        steps: [{ time: '0:0:0' }, { time: '0:2:0' }],
      },
      // fill 마디는 기타 1박 다운만 — 드럼 fill 공간 확보
      guitar: [{ time: '0:0:0', direction: 'down' }],
    },
  },

  /**
   * 4마디 이상: 마지막 → fill_quarter, 끝에서 두 번째 → pickup_eighth.
   * 4마디 미만(1~3마디 루프): groove만.
   */
  selectSlot: (tpl, idx, _variant) => {
    const local = idx % tpl.bars;
    if (tpl.bars >= 4 && local === tpl.bars - 1) return 'fill_quarter';
    if (tpl.bars >= 4 && local === tpl.bars - 2) return 'pickup_eighth';
    return 'groove';
  },
};
