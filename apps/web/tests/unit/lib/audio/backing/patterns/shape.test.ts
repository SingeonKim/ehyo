/**
 * shape.test.ts — 모든 BarPattern의 time이 한 마디(0~4초 @ BPM60) 안에 있는지 검증.
 *
 * parseBeatStep(time, 60)으로 초 환산 후 [0, 4) 범위 체크.
 * 패턴 데이터 오타(예: '0:4:0', '1:0:0')를 즉시 발견하기 위한 guard.
 */

import { describe, expect, it } from 'vitest';
import { CATEGORY_RHYTHMS } from '@/lib/audio/backing/patterns/library';
import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('BarPattern shape — 모든 step이 한 마디(0:0:0~0:3:3) 안', () => {
  for (const [category, rhythm] of Object.entries(CATEGORY_RHYTHMS)) {
    for (const [slot, pattern] of Object.entries(rhythm.patterns)) {
      it(`${category}/${slot}`, () => {
        const allTimes: string[] = [
          ...pattern.drums.kick.map((s) => s.time),
          ...pattern.drums.snare.map((s) => s.time),
          ...pattern.drums.hat.map((s) => s.time),
          ...pattern.bass.steps.map((s) => s.time),
          ...pattern.guitar.map((s) => s.time),
          ...(pattern.aux?.map((s) => s.time) ?? []),
        ];

        for (const time of allTimes) {
          // BPM 60 기준 한 마디 = 4박 × 1초 = 4초
          const sec = parseBeatStep(time, 60);
          expect(sec, `${category}/${slot} time=${time}`).toBeGreaterThanOrEqual(0);
          expect(sec, `${category}/${slot} time=${time}`).toBeLessThan(4);
        }
      });
    }
  }
});
