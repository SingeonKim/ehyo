import { describe, expect, it } from 'vitest';

import { CHORD_EXTENSIONS } from '@/lib/theory/chord-extensions';

describe('CHORD_EXTENSIONS', () => {
  it('major7는 9·#11·13 (P4 어보이드 제외)', () => {
    expect(CHORD_EXTENSIONS.major7).toEqual([2, 6, 9]);
  });

  it('minor7은 9·11·13', () => {
    expect(CHORD_EXTENSIONS.minor7).toEqual([2, 5, 9]);
  });

  it('dominant7은 9·#11·13 (alt는 genre-rules 영역)', () => {
    expect(CHORD_EXTENSIONS.dominant7).toEqual([2, 6, 9]);
  });

  it('diminished7은 9·11·b13 (대칭)', () => {
    expect(CHORD_EXTENSIONS.diminished7).toEqual([2, 5, 8]);
  });

  it('half_diminished7은 11·b13 (9 제외 — half-dim 9는 어보이드 컨텍스트 많음)', () => {
    expect(CHORD_EXTENSIONS.half_diminished7).toEqual([5, 8]);
  });

  it('augmented는 9·#11', () => {
    expect(CHORD_EXTENSIONS.augmented).toEqual([2, 6]);
  });

  it('major triad는 9만', () => {
    expect(CHORD_EXTENSIONS.major).toEqual([2]);
  });

  it('minor triad는 9·11', () => {
    expect(CHORD_EXTENSIONS.minor).toEqual([2, 5]);
  });

  it('diminished triad는 9·11', () => {
    expect(CHORD_EXTENSIONS.diminished).toEqual([2, 5]);
  });

  it('minor_major7은 9·11·13', () => {
    expect(CHORD_EXTENSIONS.minor_major7).toEqual([2, 5, 9]);
  });

  it('모든 텐션은 root(0)와 겹치지 않음 (0은 chord-tone 영역)', () => {
    for (const [quality, intervals] of Object.entries(CHORD_EXTENSIONS)) {
      expect(intervals, quality).not.toContain(0);
    }
  });

  it('모든 텐션은 0~11 범위', () => {
    for (const [quality, intervals] of Object.entries(CHORD_EXTENSIONS)) {
      for (const i of intervals) {
        expect(i, `${quality} interval ${i}`).toBeGreaterThanOrEqual(0);
        expect(i, `${quality} interval ${i}`).toBeLessThanOrEqual(11);
      }
    }
  });
});
