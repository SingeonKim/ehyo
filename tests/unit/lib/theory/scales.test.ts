import { describe, it, expect } from 'vitest';

import {
  CATEGORY_LABELS,
  IMPORTANT_DEGREES,
  SCALES,
  SCALE_CATEGORIES,
  SCALE_LABELS,
  getScaleDegreeLabels,
  getScaleNotes,
  getScalePitchClasses,
  resolveImportantDegrees,
} from '@/lib/theory/scales';
import type { PitchClass, ScaleKey } from '@/lib/theory/types';

const ALL_SCALES = Object.keys(SCALES) as ScaleKey[];

describe('SCALES 불변식', () => {
  it.each(ALL_SCALES)('%s: 모든 interval은 0~11', (scale) => {
    SCALES[scale].forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(12);
    });
  });

  it.each(ALL_SCALES)('%s: 첫 원소(Root)는 0', (scale) => {
    expect(SCALES[scale][0]).toBe(0);
  });

  it.each(ALL_SCALES)('%s: 오름차순 정렬', (scale) => {
    const arr = SCALES[scale];
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i]).toBeGreaterThan(arr[i - 1] ?? -1);
    }
  });

  it.each(ALL_SCALES)('%s: 중복 없음', (scale) => {
    const arr = SCALES[scale];
    expect(new Set(arr).size).toBe(arr.length);
  });
});

describe('IMPORTANT_DEGREES 불변식', () => {
  it.each(ALL_SCALES)('%s: Root(0)를 항상 포함', (scale) => {
    expect(IMPORTANT_DEGREES[scale]).toContain(0);
  });

  it.each(ALL_SCALES)('%s: IMPORTANT_DEGREES는 SCALES의 부분집합', (scale) => {
    const scaleSet = new Set(SCALES[scale]);
    IMPORTANT_DEGREES[scale].forEach((d) => {
      expect(scaleSet.has(d)).toBe(true);
    });
  });

  it.each(ALL_SCALES)('%s: 개수 1~4개', (scale) => {
    const count = IMPORTANT_DEGREES[scale].length;
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(4);
  });
});

describe('음악 이론 정확성 (대표 스케일)', () => {
  it('Major는 메이저 3도(4)와 perfect 5도(7)를 포함', () => {
    expect(SCALES.major).toContain(4);
    expect(SCALES.major).toContain(7);
  });

  it('Natural Minor는 단3도(3), 단6도(8), 단7도(10)', () => {
    expect(SCALES.natural_minor).toContain(3);
    expect(SCALES.natural_minor).toContain(8);
    expect(SCALES.natural_minor).toContain(10);
  });

  it('Harmonic Minor의 7음은 자연 7도(11)', () => {
    expect(SCALES.harmonic_minor).toContain(11);
  });

  it('Melodic Minor 상행 형태는 11을 포함 (단3도 + 장7도)', () => {
    expect(SCALES.melodic_minor).toContain(3);
    expect(SCALES.melodic_minor).toContain(11);
  });

  it('Lydian의 특성음 #4(=반음 6)', () => {
    expect(SCALES.lydian).toContain(6);
    expect(IMPORTANT_DEGREES.lydian).toContain(6);
  });

  it('Mixolydian의 특성음 b7(=반음 10)', () => {
    expect(SCALES.mixolydian).toContain(10);
    expect(IMPORTANT_DEGREES.mixolydian).toContain(10);
  });

  it('Phrygian의 특성음 b2(=반음 1)', () => {
    expect(SCALES.phrygian).toContain(1);
    expect(IMPORTANT_DEGREES.phrygian).toContain(1);
  });

  it('Minor Blues는 블루노트 b5(=반음 6) 포함', () => {
    expect(SCALES.minor_blues).toContain(6);
    expect(IMPORTANT_DEGREES.minor_blues).toContain(6);
  });

  it('Whole Tone은 정확히 6개 음, 전부 온음 간격', () => {
    expect(SCALES.whole_tone).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('Diminished HW는 반음-온음 패턴 8개 음', () => {
    expect(SCALES.diminished_hw).toEqual([0, 1, 3, 4, 6, 7, 9, 10]);
  });

  it('Diminished WH는 온음-반음 패턴 8개 음', () => {
    expect(SCALES.diminished_wh).toEqual([0, 2, 3, 5, 6, 8, 9, 11]);
  });

  it('대칭 스케일은 중요 노트가 최소화 (whole_tone은 Root만)', () => {
    expect(IMPORTANT_DEGREES.whole_tone).toEqual([0]);
  });
});

describe('getScaleNotes', () => {
  it('C major → C D E F G A B', () => {
    expect(getScaleNotes(0, 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('G major → G A B C D E F# (F# 포함)', () => {
    expect(getScaleNotes(7, 'major')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
  });

  it('Bb major(10)는 플랫 표기 → Bb C D Eb F G A', () => {
    expect(getScaleNotes(10, 'major')).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  it('F# lydian 7음 — 샾 계열이므로 F# 표기', () => {
    const notes = getScaleNotes(6, 'lydian');
    expect(notes).toHaveLength(7);
    expect(notes[0]).toBe('F#');
  });

  it('A minor pentatonic → A C D E G', () => {
    expect(getScaleNotes(9, 'minor_pentatonic')).toEqual(['A', 'C', 'D', 'E', 'G']);
  });

  it('E minor blues → E G A A# B D (E는 샾 키, 블루노트가 A#)', () => {
    // 음악 이론 텍스트는 흔히 Bb로 쓰지만 앱의 "샾 우선" 규율(E=샾 키)과
    // 일관을 유지. isFlatKey(4)=false이므로 PC 10은 A#로 표기.
    expect(getScaleNotes(4, 'minor_blues')).toEqual(['E', 'G', 'A', 'A#', 'B', 'D']);
  });

  it('Eb minor blues → Eb Gb Ab A Bb Db (Eb는 플랫 키)', () => {
    // 대조 사례: Eb는 플랫 키이므로 모두 플랫 표기
    expect(getScaleNotes(3, 'minor_blues')).toEqual(['Eb', 'Gb', 'Ab', 'A', 'Bb', 'Db']);
  });
});

describe('getScalePitchClasses', () => {
  it('C major → 0 2 4 5 7 9 11', () => {
    expect(getScalePitchClasses(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('D dorian → 2 4 5 7 9 11 0', () => {
    expect(getScalePitchClasses(2, 'dorian')).toEqual([2, 4, 5, 7, 9, 11, 0]);
  });

  it('Root 기준으로 wrap된 피치 클래스', () => {
    const result = getScalePitchClasses(11 as PitchClass, 'major');
    // B + [0,2,4,5,7,9,11] = [11, 1, 3, 4, 6, 8, 10]
    expect(result).toEqual([11, 1, 3, 4, 6, 8, 10]);
  });
});

describe('resolveImportantDegrees', () => {
  it('override 없으면 기본값', () => {
    expect(resolveImportantDegrees('major', undefined)).toEqual(IMPORTANT_DEGREES.major);
  });

  it('override가 있으면 그것을 사용', () => {
    expect(resolveImportantDegrees('major', [0, 4])).toEqual([0, 4]);
  });

  it('override 빈 배열도 유효 (Root 강조 없음)', () => {
    expect(resolveImportantDegrees('major', [])).toEqual([]);
  });
});

describe('getScaleDegreeLabels', () => {
  it('major → 1,2,3,4,5,6,7', () => {
    const labels = getScaleDegreeLabels('major').map((d) => d.label);
    expect(labels).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('natural_minor → 1,2,b3,4,5,b6,b7', () => {
    const labels = getScaleDegreeLabels('natural_minor').map((d) => d.label);
    expect(labels).toEqual(['1', '2', 'b3', '4', '5', 'b6', 'b7']);
  });

  it('minor_blues → 1,b3,4,b5,5,b7', () => {
    const labels = getScaleDegreeLabels('minor_blues').map((d) => d.label);
    expect(labels).toEqual(['1', 'b3', '4', 'b5', '5', 'b7']);
  });
});

describe('카테고리·레이블 정합성', () => {
  it('SCALE_CATEGORIES의 모든 원소는 정의된 스케일', () => {
    const all = new Set(ALL_SCALES);
    Object.values(SCALE_CATEGORIES)
      .flat()
      .forEach((s) => {
        expect(all.has(s)).toBe(true);
      });
  });

  it('SCALE_CATEGORIES 전 카테고리에 걸친 총합은 SCALES 개수와 동일 (중복 없음)', () => {
    const flat = Object.values(SCALE_CATEGORIES).flat();
    expect(flat).toHaveLength(ALL_SCALES.length);
    expect(new Set(flat).size).toBe(ALL_SCALES.length);
  });

  it('모든 ScaleKey가 SCALE_LABELS에 존재', () => {
    ALL_SCALES.forEach((key) => {
      expect(SCALE_LABELS[key]).toBeTruthy();
    });
  });

  it('CATEGORY_LABELS는 4개', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(4);
  });
});
