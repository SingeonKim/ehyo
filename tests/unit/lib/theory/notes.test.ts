import { describe, it, expect } from 'vitest';

import {
  DEGREE_LABELS,
  NOTE_NAMES_FLAT,
  NOTE_NAMES_SHARP,
  allPitchClasses,
  getNoteName,
  isFlatKey,
  pitchClassFromRoot,
  semitonesFromRoot,
  semitonesToDegree,
} from '@/lib/theory/notes';
import type { PitchClass } from '@/lib/theory/types';

describe('노트 이름 상수', () => {
  it('샾 배열은 정확히 12개', () => {
    expect(NOTE_NAMES_SHARP).toHaveLength(12);
  });

  it('플랫 배열은 정확히 12개', () => {
    expect(NOTE_NAMES_FLAT).toHaveLength(12);
  });

  it('샾 배열의 첫 원소는 C, 마지막은 B', () => {
    expect(NOTE_NAMES_SHARP[0]).toBe('C');
    expect(NOTE_NAMES_SHARP[11]).toBe('B');
  });

  it('도수 레이블은 12개, 고정 순서', () => {
    expect(DEGREE_LABELS).toEqual(['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']);
  });
});

describe('isFlatKey', () => {
  it('플랫 계열 Root(F=5, Bb=10, Eb=3, Ab=8, Db=1)는 true', () => {
    [5, 10, 3, 8, 1].forEach((pc) => {
      expect(isFlatKey(pc as PitchClass)).toBe(true);
    });
  });

  it('Gb/F# (PC 6)은 샾 계열로 취급 → false', () => {
    // 이명동음. 기타 컨벤션상 F#를 선호.
    expect(isFlatKey(6 as PitchClass)).toBe(false);
  });

  it('자연 키(C, G, D, A, E, B)와 F#는 모두 false', () => {
    [0, 7, 2, 9, 4, 11, 6].forEach((pc) => {
      expect(isFlatKey(pc as PitchClass)).toBe(false);
    });
  });
});

describe('getNoteName', () => {
  it('기본은 샾 표기', () => {
    expect(getNoteName(1)).toBe('C#');
    expect(getNoteName(6)).toBe('F#');
    expect(getNoteName(10)).toBe('A#');
  });

  it('useFlats=true이면 플랫 표기', () => {
    expect(getNoteName(1, true)).toBe('Db');
    expect(getNoteName(6, true)).toBe('Gb');
    expect(getNoteName(10, true)).toBe('Bb');
  });

  it('자연음은 샾/플랫 옵션과 무관하게 동일', () => {
    expect(getNoteName(0)).toBe('C');
    expect(getNoteName(0, true)).toBe('C');
    expect(getNoteName(5)).toBe('F');
    expect(getNoteName(5, true)).toBe('F');
  });
});

describe('semitonesFromRoot', () => {
  it('Root가 C(0)일 때 피치 클래스 자체가 반음 간격', () => {
    expect(semitonesFromRoot(0, 0)).toBe(0);
    expect(semitonesFromRoot(7, 0)).toBe(7);
  });

  it('Root가 G(7)일 때 C(0)는 5도 위 = 5반음', () => {
    expect(semitonesFromRoot(0, 7)).toBe(5);
  });

  it('결과는 항상 0~11', () => {
    for (let root = 0; root < 12; root++) {
      for (let pc = 0; pc < 12; pc++) {
        const result = semitonesFromRoot(pc as PitchClass, root as PitchClass);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(12);
      }
    }
  });
});

describe('semitonesToDegree', () => {
  it('0~11 각각에 대해 12슬롯 고정 문자열 반환', () => {
    expect(semitonesToDegree(0)).toBe('1');
    expect(semitonesToDegree(3)).toBe('b3');
    expect(semitonesToDegree(6)).toBe('b5');
    expect(semitonesToDegree(11)).toBe('7');
  });

  it('12 이상은 모듈로 처리', () => {
    expect(semitonesToDegree(12)).toBe('1');
    expect(semitonesToDegree(19)).toBe('5'); // 19 % 12 = 7 = '5'
  });

  it('음수도 정상 처리', () => {
    expect(semitonesToDegree(-1)).toBe('7'); // -1 ≡ 11
  });
});

describe('pitchClassFromRoot', () => {
  it('C + 반음 0~11', () => {
    expect(pitchClassFromRoot(0, 0)).toBe(0);
    expect(pitchClassFromRoot(0, 7)).toBe(7);
    expect(pitchClassFromRoot(0, 11)).toBe(11);
  });

  it('G Root + 5반음 = C', () => {
    expect(pitchClassFromRoot(7, 5)).toBe(0);
  });

  it('반음이 12를 넘으면 wrap', () => {
    expect(pitchClassFromRoot(0, 12)).toBe(0);
    expect(pitchClassFromRoot(3, 15)).toBe(6);
  });
});

describe('allPitchClasses', () => {
  it('0~11 순서로 반환', () => {
    expect(allPitchClasses()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});
