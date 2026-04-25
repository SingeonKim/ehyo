import { describe, expect, it } from 'vitest';

import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('parseBeatStep', () => {
  it('0:0:0 = 0초', () => {
    expect(parseBeatStep('0:0:0', 120)).toBe(0);
  });

  it('0:1:0 at 120 BPM = 0.5초 (한 박)', () => {
    expect(parseBeatStep('0:1:0', 120)).toBeCloseTo(0.5);
  });

  it('0:2:0 at 120 BPM = 1.0초 (3박)', () => {
    expect(parseBeatStep('0:2:0', 120)).toBeCloseTo(1.0);
  });

  it('0:0:2 at 120 BPM = 0.25초 (8분 — sub 2/4 = 0.5박)', () => {
    expect(parseBeatStep('0:0:2', 120)).toBeCloseTo(0.25);
  });

  it('0:3:2 at 120 BPM = 1.75초 (4박-and)', () => {
    expect(parseBeatStep('0:3:2', 120)).toBeCloseTo(1.75);
  });

  it('1:0:0 at 120 BPM = 2.0초 (다음 마디)', () => {
    expect(parseBeatStep('1:0:0', 120)).toBeCloseTo(2.0);
  });

  it('60 BPM에서 0:1:0 = 1.0초', () => {
    expect(parseBeatStep('0:1:0', 60)).toBeCloseTo(1.0);
  });

  it('beatsPerBar=3 (3/4) 에서 1:0:0 at 120 = 1.5초', () => {
    expect(parseBeatStep('1:0:0', 120, 3)).toBeCloseTo(1.5);
  });
});
