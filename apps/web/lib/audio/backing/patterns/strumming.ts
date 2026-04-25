/**
 * 표준 어쿠스틱 8분 컴핑 패턴 — D _ D U _ U D U.
 * 6 strikes per bar.
 *
 * 시각 좌석:
 *   0:0:0(D)  0:0:2(_)  0:1:0(D)  0:1:2(U)  0:2:0(_)  0:2:2(U)  0:3:0(D)  0:3:2(U)
 * 1박 다운 + 2박 다운/업 + 3박 업 + 4박 다운/업 = "쿵 짝짝 짝 짝짝"
 */

import type { StrumPattern } from './types';

export const EIGHTH_STRUM: StrumPattern = [
  { time: '0:0:0', direction: 'down' },
  { time: '0:1:0', direction: 'down' },
  { time: '0:1:2', direction: 'up' },
  { time: '0:2:2', direction: 'up' },
  { time: '0:3:0', direction: 'down' },
  { time: '0:3:2', direction: 'up' },
];
