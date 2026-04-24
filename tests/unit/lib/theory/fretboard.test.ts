import { describe, it, expect } from 'vitest';

import {
  INLAY_POSITIONS,
  STANDARD_TUNING,
  getFretboardNotes,
  getOpenStringLabels,
  pitchAt,
  type NoteMark,
} from '@/lib/theory/fretboard';
import { SCALES, SCALE_HIGHLIGHTS } from '@/lib/theory/scales';
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
    highlights: SCALE_HIGHLIGHTS.major,
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

  it('fret은 1 ~ frets 범위 (오픈 스트링 제외)', () => {
    const marks = getFretboardNotes({ ...baseParams, frets: 22 });
    marks.forEach((m) => {
      expect(m.fret).toBeGreaterThanOrEqual(1);
      expect(m.fret).toBeLessThanOrEqual(22);
    });
  });

  it('오픈 스트링은 getFretboardNotes 결과에 포함되지 않는다', () => {
    // 오픈 스트링은 getOpenStringLabels가 별도로 관리한다.
    const marks = getFretboardNotes(baseParams);
    expect(marks.some((m) => m.fret === 0)).toBe(false);
  });
});

describe('getFretboardNotes — tier 결정', () => {
  it('Root 노트는 tier=root', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    const rootMarks = marks.filter((m) => m.semitonesFromRoot === 0);
    expect(rootMarks.length).toBeGreaterThan(0);
    rootMarks.forEach((m) => {
      expect(m.tier).toBe('root');
      expect(m.pitchClass).toBe(0); // C
    });
  });

  it('C major에서 F(4도, semi 5)와 G(5도, semi 7)는 orange tier (I-IV-V 뼈대)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major, // { 5: 'orange', 7: 'orange' }
    });
    const fourths = marks.filter((m) => m.semitonesFromRoot === 5);
    const fifths = marks.filter((m) => m.semitonesFromRoot === 7);
    fourths.forEach((m) => expect(m.tier).toBe('orange'));
    fifths.forEach((m) => expect(m.tier).toBe('orange'));
  });

  it('C major의 3도(E, semi 4)는 regular — orange가 아님', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    const thirds = marks.filter((m) => m.semitonesFromRoot === 4);
    expect(thirds.length).toBeGreaterThan(0);
    thirds.forEach((m) => expect(m.tier).toBe('regular'));
  });

  it('highlights 맵 외의 스케일 음은 regular', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 22,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    // Major의 highlights는 {5, 7} → 2(2도), 4(3도), 9(6도), 11(7도)은 regular
    const regulars = marks.filter((m) => [2, 4, 9, 11].includes(m.semitonesFromRoot));
    expect(regulars.length).toBeGreaterThan(0);
    regulars.forEach((m) => expect(m.tier).toBe('regular'));
  });

  it('유저 override로 특정 semitone에 다른 색 지정', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major',
      // 유저가 3도만 green으로 강조, 다른 highlight는 비움
      highlights: { 4: 'green' },
    });
    const thirds = marks.filter((m) => m.semitonesFromRoot === 4);
    const fifths = marks.filter((m) => m.semitonesFromRoot === 7);
    thirds.forEach((m) => expect(m.tier).toBe('green'));
    fifths.forEach((m) => expect(m.tier).toBe('regular'));
  });

  it('빈 highlights는 Root만 Root로, 나머지는 regular', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: {},
    });
    marks.forEach((m) => {
      if (m.semitonesFromRoot === 0) {
        expect(m.tier).toBe('root');
      } else {
        expect(m.tier).toBe('regular');
      }
    });
  });

  it('Minor Blues의 b5(semitone 6)는 blue tier', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 9 as PitchClass, // A
      scale: 'minor_blues',
      highlights: SCALE_HIGHLIGHTS.minor_blues,
    });
    const blueNotes = marks.filter((m) => m.semitonesFromRoot === 6);
    expect(blueNotes.length).toBeGreaterThan(0);
    blueNotes.forEach((m) => expect(m.tier).toBe('blue'));
  });

  it('Major Blues의 b3(semitone 3)는 blue tier', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major_blues',
      highlights: SCALE_HIGHLIGHTS.major_blues,
    });
    const blueNotes = marks.filter((m) => m.semitonesFromRoot === 3);
    expect(blueNotes.length).toBeGreaterThan(0);
    blueNotes.forEach((m) => expect(m.tier).toBe('blue'));
  });

  it('Lydian의 #4(semitone 6)는 green tier (모드 특성음)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'lydian',
      highlights: SCALE_HIGHLIGHTS.lydian,
    });
    const characteristic = marks.filter((m) => m.semitonesFromRoot === 6);
    expect(characteristic.length).toBeGreaterThan(0);
    characteristic.forEach((m) => expect(m.tier).toBe('green'));
  });
});

describe('getFretboardNotes — 노트 이름 표기', () => {
  it('C Root는 샾 표기 (F#, C# 등)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major', // F#는 없지만 확인용으로 chromatic에 있으면 샾
      highlights: SCALE_HIGHLIGHTS.major,
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
      highlights: SCALE_HIGHLIGHTS.major,
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
      highlights: SCALE_HIGHLIGHTS.major,
    });
    const cMark = marks.find((m) => m.semitonesFromRoot === 0);
    const fMark = marks.find((m) => m.semitonesFromRoot === 5);
    expect(cMark?.degree).toBe('1');
    expect(fMark?.degree).toBe('4');
  });
});

describe('getFretboardNotes — 엣지 케이스', () => {
  it('frets=0 이면 결과는 빈 배열 (오픈은 getOpenStringLabels 담당)', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 0,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    expect(marks).toEqual([]);
  });

  it('Whole Tone scale (6음) Root=C → 지판 노트 수가 Major(7음)보다 적다', () => {
    const common = { tuning: STANDARD_TUNING, frets: 22, root: 0 as PitchClass } as const;
    const major = getFretboardNotes({
      ...common,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    const whole = getFretboardNotes({
      ...common,
      scale: 'whole_tone',
      highlights: SCALE_HIGHLIGHTS.whole_tone,
    });
    expect(whole.length).toBeLessThan(major.length);
  });

  it('Diminished HW (8음) Root=C → 지판 노트 수가 Major보다 많다', () => {
    const common = { tuning: STANDARD_TUNING, frets: 22, root: 0 as PitchClass } as const;
    const major = getFretboardNotes({
      ...common,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    const dim = getFretboardNotes({
      ...common,
      scale: 'diminished_hw',
      highlights: SCALE_HIGHLIGHTS.diminished_hw,
    });
    expect(dim.length).toBeGreaterThan(major.length);
  });

  it('string 번호 1은 1번줄(최고음 E) — fret 1 이상에서도 유지', () => {
    const marks = getFretboardNotes({
      tuning: STANDARD_TUNING,
      frets: 12,
      root: 0 as PitchClass,
      scale: 'major',
      highlights: SCALE_HIGHLIGHTS.major,
    });
    // 1번줄(high E, open=E=4)에서 C major의 첫 스케일 노트는 1프렛=F(pc 5, 4도).
    const firstString = marks
      .filter((m): m is NoteMark => m.string === 1)
      .sort((a, b) => a.fret - b.fret)[0];
    expect(firstString?.fret).toBe(1);
    expect(firstString?.pitchClass).toBe(5); // F on 1st fret of high E
  });
});

describe('getOpenStringLabels', () => {
  it('표준 튜닝에서 6개 레이블을 항상 반환', () => {
    const labels = getOpenStringLabels(STANDARD_TUNING, 0 as PitchClass);
    expect(labels).toHaveLength(6);
  });

  it('스케일이 무엇이든 6개 전부 반환 (whole_tone처럼 음이 적은 스케일에서도)', () => {
    // 서명에 scale이 없으므로 이 함수는 스케일과 무관. 이 불변식을 명시적으로 테스트.
    // tuning 순서(저음→고음: 6번줄 low E → 1번줄 high E)대로 반환.
    const labels = getOpenStringLabels(STANDARD_TUNING, 0 as PitchClass);
    expect(labels.map((l) => l.noteName)).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
  });

  it('string 번호 매핑: tuning 앞 인덱스가 큰 string 번호(저음)', () => {
    const labels = getOpenStringLabels(STANDARD_TUNING, 0 as PitchClass);
    // tuning[0] = 6번줄 low E, tuning[5] = 1번줄 high E
    expect(labels[0]).toMatchObject({ string: 6, noteName: 'E' });
    expect(labels[5]).toMatchObject({ string: 1, noteName: 'E' });
  });

  it('string 번호 1은 1번줄(최고음 E)', () => {
    const labels = getOpenStringLabels(STANDARD_TUNING, 0 as PitchClass);
    const first = labels.find((l) => l.string === 1);
    expect(first?.pitchClass).toBe(4);
    expect(first?.noteName).toBe('E');
  });

  it('Bb Root → 플랫 컨벤션. 단 표준 튜닝은 모두 자연음이라 이름 변화 없음', () => {
    const labels = getOpenStringLabels(STANDARD_TUNING, 10 as PitchClass);
    expect(labels.map((l) => l.noteName)).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
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
