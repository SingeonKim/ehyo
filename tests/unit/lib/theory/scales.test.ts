import { describe, it, expect } from 'vitest';

import {
  CATEGORY_LABELS,
  SCALES,
  SCALE_CATEGORIES,
  SCALE_HIGHLIGHTS,
  SCALE_LABELS,
  getScaleDegreeLabels,
  getScaleNotes,
  getScalePitchClasses,
  resolveScaleHighlights,
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

describe('SCALE_HIGHLIGHTS 불변식', () => {
  it.each(ALL_SCALES)('%s: Root(0)는 포함하지 않음 (Root는 별도 고정 red)', (scale) => {
    expect(SCALE_HIGHLIGHTS[scale]).not.toHaveProperty('0');
  });

  it.each(ALL_SCALES)('%s: 모든 semitone 키는 SCALES에 속한다', (scale) => {
    const scaleSet = new Set(SCALES[scale]);
    Object.keys(SCALE_HIGHLIGHTS[scale]).forEach((k) => {
      expect(scaleSet.has(Number(k))).toBe(true);
    });
  });

  it.each(ALL_SCALES)('%s: 모든 값은 orange/green/blue 중 하나', (scale) => {
    const allowed = new Set(['orange', 'green', 'blue']);
    Object.values(SCALE_HIGHLIGHTS[scale]).forEach((color) => {
      expect(allowed.has(color as string)).toBe(true);
    });
  });

  it.each(ALL_SCALES)('%s: 비-루트 강조는 최대 3개 (대칭 스케일은 0개 가능)', (scale) => {
    expect(Object.keys(SCALE_HIGHLIGHTS[scale]).length).toBeLessThanOrEqual(3);
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

  it('Lydian의 특성음 #4(=반음 6)는 green', () => {
    expect(SCALES.lydian).toContain(6);
    expect(SCALE_HIGHLIGHTS.lydian[6]).toBe('green');
  });

  it('Mixolydian의 특성음 b7(=반음 10)는 green', () => {
    expect(SCALES.mixolydian).toContain(10);
    expect(SCALE_HIGHLIGHTS.mixolydian[10]).toBe('green');
  });

  it('Phrygian의 특성음 b2(=반음 1)는 green', () => {
    expect(SCALES.phrygian).toContain(1);
    expect(SCALE_HIGHLIGHTS.phrygian[1]).toBe('green');
  });

  it('Minor Blues 블루노트 b5(=반음 6)는 blue', () => {
    expect(SCALES.minor_blues).toContain(6);
    expect(SCALE_HIGHLIGHTS.minor_blues[6]).toBe('blue');
  });

  it('Major Blues 블루노트 b3(=반음 3)는 blue', () => {
    expect(SCALES.major_blues).toContain(3);
    expect(SCALE_HIGHLIGHTS.major_blues[3]).toBe('blue');
  });

  it('Major의 3도·5도는 orange (코드 톤)', () => {
    expect(SCALE_HIGHLIGHTS.major[4]).toBe('orange');
    expect(SCALE_HIGHLIGHTS.major[7]).toBe('orange');
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

  it('대칭 스케일은 강조 없음 (Root는 언제나 별도 red)', () => {
    expect(SCALE_HIGHLIGHTS.whole_tone).toEqual({});
    expect(SCALE_HIGHLIGHTS.diminished_hw).toEqual({});
    expect(SCALE_HIGHLIGHTS.diminished_wh).toEqual({});
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

describe('resolveScaleHighlights', () => {
  it('override 없으면 SCALE_HIGHLIGHTS 기본값', () => {
    expect(resolveScaleHighlights('major', undefined)).toEqual(SCALE_HIGHLIGHTS.major);
  });

  it('override가 있으면 그것을 사용', () => {
    expect(resolveScaleHighlights('major', { 4: 'green' })).toEqual({ 4: 'green' });
  });

  it('override 빈 맵도 유효 (Root 외 강조 없음)', () => {
    expect(resolveScaleHighlights('major', {})).toEqual({});
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
