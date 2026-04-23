import { describe, it, expect } from 'vitest';

import {
  INLAY_POSITIONS,
  STANDARD_TUNING,
  getFretboardNotes,
  pitchAt,
  type NoteMark,
} from '@/lib/theory/fretboard';
import { IMPORTANT_DEGREES, SCALES } from '@/lib/theory/scales';
import type { PitchClass } from '@/lib/theory/types';

describe('STANDARD_TUNING', () => {
  it('6개 줄, 6번줄부터 EADGBE', () => {
    expect(STANDARD_TUNING).toHaveLength(6);
    // 6번줄 low E, 5번줄 A, ..., 1번줄 high E
    expect(STANDARD_TUNING).toEqual([4, 9, 2, 7, 11, 4]);
  });
});

describe('pitchAt', () => {
  it('오픈 스트링은 튜닝 값 그대로', () => {
    expect(pitchAt(STANDARD_TUNING, 0, 0)).toBe(4); // 6번줄 low E
    expect(pitchAt(STANDARD_TUNING, 5, 0)).toBe(4); // 1번줄 high E
  });

  it('6번줄 3프렛 = G (pitch 7)', () => {
    expect(pitchAt(STANDARD_TUNING, 0, 3)).toBe(7);
  });

  it('5번줄 5프렛 = D (pitch 2) — 5프렛 4번줄 오픈과 동음', () => {
    expect(pitchAt(STANDARD_TUNING, 1, 5)).toBe(2);
    expect(pitchAt(STANDARD_TUNING, 2, 0)).toBe(2);
  });

  it('12프렛에서 한 옥타브 = 오픈 피치 클래스와 동일', () => {
    for (let s = 0; s < STANDARD_TUNING.length; s++) {
      expect(pitchAt(STANDARD_TUNING, s, 12)).toBe(STANDARD_TUNING[s]);
    }
  });

  it('24프렛은 두 옥타브 위 = 오픈과 동일 피치 클래스', () => {
    expect(pitchAt(STANDARD_TUNING, 0, 24)).toBe(STANDARD_TUNING[0]);
  });

  it('잘못된 string index는 예외', () => {
    expect(() => pitchAt(STANDARD_TUNING, -1, 0)).toThrow();
    expect(() => pitchAt(STANDARD_TUNING, 99, 0)).toThrow();
  });
});

describe('getFretboardNotes — 일반 동작', () => {
  const baseParams = {
    tuning: STANDARD_TUNING,
    frets: 22,
    root: 0 as PitchClass,
    scale: 'major' as const,
    importantDegrees: IMPORTANT_DEGREES.major,
  };

  it('결과의 모든 마크가 스케일에 속하는 피치 클래스', () => {
    const marks = getFretboardNotes(baseParams);
    const scaleSet = new Set(SCALES.major);
    marks.forEach((m) => {
      expect(scaleSet.has(m.semitonesFromRoot)).toBe(true);
    });
  });

  it('string 번호는 1~6', () => {
    const marks = getFretboardNotes(baseParams);
    marks.forEach((m) => {
      expect(m.string).toBeGreaterThanOrEqual(1);
      expect(m.string).toBeLessThanOrEqual(6);
    });
  });

  it('fret은 0 ~ frets 범위', () => {
    const marks = getFretboardNotes({ ...baseParams, frets: 22 });
    marks.forEach((m) => {
      expect(m.fret).toBeGreaterThanOrEqual(0);
      expect(m.fret).toBeLessThanOrEqual(22);
    });
  });

  it('C major, 오픈 스트링만 봤을 때 스케일 노트 수 = 5 (E, A, D, G, B, E 중 5개 고유 + E 중복)', () => {
    // 오픈: [E, A, D, G, B, E] — C major는 전부 포함 (E=4, A=9, D=2, G=7, B=11 모두 major 스케일에 속함)
    const marks = getFretboardNotes(baseParams).filter((m) => m.fret === 0);
    expect(marks).toHaveLength(6);
  });
});

describe('getFretboardNotes — tier 결정', () => {
  it('Root 노트는 tier=root', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const rootMarks = marks.filter((m) => m.semitonesFromRoot === 0);
    expect(rootMarks.length).toBeGreaterThan(0);
    rootMarks.forEach((m) => {
      expect(m.tier).toBe('root');
      expect(m.pitchClass).toBe(0); // C
    });
  });

  it('C major에서 F(4도, semi 5)와 G(5도, semi 7)는 important', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major, // [0, 5, 7]
    });
    const fourths = marks.filter((m) => m.semitonesFromRoot === 5);
    const fifths = marks.filter((m) => m.semitonesFromRoot === 7);
    fourths.forEach((m) => expect(m.tier).toBe('important'));
    fifths.forEach((m) => expect(m.tier).toBe('important'));
  });

  it('중요하지 않은 스케일 음은 regular', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    // 2도(D, semi 2), 3도(E, semi 4), 6도(A, semi 9), 7도(B, semi 11)
    const regulars = marks.filter((m) => [2, 4, 9, 11].includes(m.semitonesFromRoot));
    expect(regulars.length).toBeGreaterThan(0);
    regulars.forEach((m) => expect(m.tier).toBe('regular'));
  });

  it('유저 override가 있으면 그것을 따른다', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: [0, 4], // 유저가 Root와 3도만 중요로 설정
    });
    const thirds = marks.filter((m) => m.semitonesFromRoot === 4);
    const fifths = marks.filter((m) => m.semitonesFromRoot === 7);
    thirds.forEach((m) => expect(m.tier).toBe('important'));
    fifths.forEach((m) => expect(m.tier).toBe('regular'));
  });

  it('빈 importantDegrees는 Root만 Root로, 나머지는 regular', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: [],
    });
    marks.forEach((m) => {
      if (m.semitonesFromRoot === 0) {
        expect(m.tier).toBe('root');
      } else {
        expect(m.tier).toBe('regular');
      }
    });
  });
});

describe('getFretboardNotes — 노트 이름 표기', () => {
  it('C Root는 샾 표기 (F#, C# 등)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major', // F#는 없지만 확인용으로 chromatic에 있으면 샾
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    // C major는 샾이 F# 없이 구성되므로 모든 이름이 자연음
    const names = new Set(marks.map((m) => m.noteName));
    expect(names.has('F#')).toBe(false);
    expect(names.has('Gb')).toBe(false);
  });

  it('Bb Root (PC 10)는 플랫 표기', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 10 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const names = new Set(marks.map((m) => m.noteName));
    // Bb major는 Bb C D Eb F G A — Bb, Eb 플랫 표기 확인
    expect(names.has('Bb')).toBe(true);
    expect(names.has('Eb')).toBe(true);
    expect(names.has('A#')).toBe(false);
    expect(names.has('D#')).toBe(false);
  });

  it('degree 문자열이 올바르게 할당', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 5,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const cMark = marks.find((m) => m.semitonesFromRoot === 0);
    const fMark = marks.find((m) => m.semitonesFromRoot === 5);
    expect(cMark?.degree).toBe('1');
    expect(fMark?.degree).toBe('4');
  });
});

describe('getFretboardNotes — 엣지 케이스', () => {
  it('frets=0 이면 오픈 스트링만', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 0,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    marks.forEach((m) => expect(m.fret).toBe(0));
  });

  it('Whole Tone scale (6음) Root=C → 지판 노트 수가 Major(7음)보다 적다', () => {
    const common = { tuning: STANDARD_TUNING, frets: 22, root: 0 as PitchClass } as const;
    const major = getFretboardNotes({
      ...common,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const whole = getFretboardNotes({
      ...common,
      scale: 'whole_tone',
      importantDegrees: IMPORTANT_DEGREES.whole_tone,
    });
    expect(whole.length).toBeLessThan(major.length);
  });

  it('Diminished HW (8음) Root=C → 지판 노트 수가 Major보다 많다', () => {
    const common = { tuning: STANDARD_TUNING, frets: 22, root: 0 as PitchClass } as const;
    const major = getFretboardNotes({
      ...common,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const dim = getFretboardNotes({
      ...common,
      scale: 'diminished_hw',
      importantDegrees: IMPORTANT_DEGREES.diminished_hw,
    });
    expect(dim.length).toBeGreaterThan(major.length);
  });

  it('string 번호 1은 1번줄(최고음 E)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 0,
      root: 0 as PitchClass,
      scale: 'major',
      importantDegrees: IMPORTANT_DEGREES.major,
    });
    const firstString = marks.find((m): m is NoteMark => m.string === 1);
    expect(firstString?.pitchClass).toBe(4); // high E
  });
});

describe('INLAY_POSITIONS', () => {
  it('3·5·7·9프렛 단일 점', () => {
    const positions = INLAY_POSITIONS.filter((p) => [3, 5, 7, 9].includes(p.fret));
    expect(positions).toHaveLength(4);
    positions.forEach((p) => expect(p.double).toBe(false));
  });

  it('12, 24프렛은 더블 점', () => {
    const twelve = INLAY_POSITIONS.find((p) => p.fret === 12);
    const twentyFour = INLAY_POSITIONS.find((p) => p.fret === 24);
    expect(twelve?.double).toBe(true);
    expect(twentyFour?.double).toBe(true);
  });

  it('총 10개 프렛(3,5,7,9,12,15,17,19,21,24)', () => {
    expect(INLAY_POSITIONS.map((p) => p.fret)).toEqual([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
  });
});
