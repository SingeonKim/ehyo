import { describe, expect, it } from 'vitest';
import { parseBeatStep } from '@/lib/audio/backing/patterns/types';

describe('parseBeatStep', () => {
  describe('default behavior (regression)', () => {
    it('returns 0 for 0:0:0', () => {
      expect(parseBeatStep('0:0:0', 120)).toBe(0);
    });

    it('1박 = 0.5s at 120bpm', () => {
      expect(parseBeatStep('0:1:0', 120)).toBeCloseTo(0.5, 5);
    });

    it('sub 2 (8분 off-beat) = 0.25s at 120bpm — straight', () => {
      expect(parseBeatStep('0:0:2', 120)).toBeCloseTo(0.25, 5);
    });

    it('sub 3 (16th off-beat) = 0.375s at 120bpm — straight', () => {
      expect(parseBeatStep('0:0:3', 120)).toBeCloseTo(0.375, 5);
    });
  });

  describe('swing parameter', () => {
    it('swing 0.5 == straight (regression)', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.5 })).toBeCloseTo(0.25, 5);
    });

    it('swing 0.66 pushes 8th off-beat (sub 2) to 0.66 of beat', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.66 })).toBeCloseTo(0.33, 5);
    });

    it('swing 0.75 pushes 8th off-beat (sub 2) to 0.75 of beat — hard shuffle', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { swing: 0.75 })).toBeCloseTo(0.375, 5);
    });

    it('swing does NOT affect sub 0 / sub 1 / sub 3', () => {
      expect(parseBeatStep('0:0:0', 120, 4, { swing: 0.66 })).toBeCloseTo(0, 5);
      expect(parseBeatStep('0:0:1', 120, 4, { swing: 0.66 })).toBeCloseTo(0.125, 5);
      expect(parseBeatStep('0:0:3', 120, 4, { swing: 0.66 })).toBeCloseTo(0.375, 5);
    });
  });

  describe('triplet8 unit', () => {
    it('sub 0 = 0', () => {
      expect(parseBeatStep('0:0:0', 120, 4, { unit: 'triplet8' })).toBeCloseTo(0, 5);
    });

    it('sub 1 = 1/3 of beat', () => {
      expect(parseBeatStep('0:0:1', 120, 4, { unit: 'triplet8' })).toBeCloseTo(0.5 / 3, 5);
    });

    it('sub 2 = 2/3 of beat', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { unit: 'triplet8' })).toBeCloseTo((0.5 * 2) / 3, 5);
    });

    it('triplet8 ignores swing parameter', () => {
      expect(parseBeatStep('0:0:2', 120, 4, { unit: 'triplet8', swing: 0.66 })).toBeCloseTo(
        (0.5 * 2) / 3,
        5,
      );
    });
  });

  describe('dev guards', () => {
    it('throws on invalid bpm', () => {
      expect(() => parseBeatStep('0:0:0', 0)).toThrow(/bpm must be > 0/);
      expect(() => parseBeatStep('0:0:0', -10)).toThrow(/bpm must be > 0/);
    });

    it('throws on invalid notation', () => {
      expect(() => parseBeatStep('a:b:c', 120)).toThrow(/invalid notation/);
    });

    it('throws on swing out of [0.5, 0.75]', () => {
      expect(() => parseBeatStep('0:0:0', 120, 4, { swing: 0.4 })).toThrow(/swing/);
      expect(() => parseBeatStep('0:0:0', 120, 4, { swing: 0.8 })).toThrow(/swing/);
    });
  });
});
