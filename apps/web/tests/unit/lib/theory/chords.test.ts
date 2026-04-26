import { describe, expect, it } from 'vitest';

import {
  chordPitchClasses,
  getChordTonesInKey,
  parseRoman,
  romanToChord,
} from '@/lib/theory/chords';
import type { PitchClass } from '@/lib/theory/types';

describe('parseRoman — 기본 triad', () => {
  it('I는 1도 메이저', () => {
    expect(parseRoman('I')).toEqual({ degree: 1, rootSemitones: 0, quality: 'major' });
  });

  it('ii는 2도 마이너', () => {
    expect(parseRoman('ii')).toEqual({ degree: 2, rootSemitones: 2, quality: 'minor' });
  });

  it('IV는 4도 메이저', () => {
    expect(parseRoman('IV')).toEqual({ degree: 4, rootSemitones: 5, quality: 'major' });
  });

  it('V는 5도 메이저', () => {
    expect(parseRoman('V')).toEqual({ degree: 5, rootSemitones: 7, quality: 'major' });
  });

  it('vi는 6도 마이너', () => {
    expect(parseRoman('vi')).toEqual({ degree: 6, rootSemitones: 9, quality: 'minor' });
  });
});

describe('parseRoman — 7th 코드', () => {
  it('I7은 도미넌트7', () => {
    expect(parseRoman('I7')?.quality).toBe('dominant7');
  });

  it('V7은 도미넌트7', () => {
    expect(parseRoman('V7')).toMatchObject({ degree: 5, quality: 'dominant7' });
  });

  it('Imaj7은 메이저7', () => {
    expect(parseRoman('Imaj7')?.quality).toBe('major7');
  });

  it('iim7은 마이너7', () => {
    expect(parseRoman('iim7')?.quality).toBe('minor7');
  });

  it('ii7은 소문자라 마이너7로 해석', () => {
    expect(parseRoman('ii7')?.quality).toBe('minor7');
  });
});

describe('parseRoman — 특수 품질', () => {
  it('vii°는 디미니쉬드', () => {
    expect(parseRoman('vii°')?.quality).toBe('diminished');
  });

  it('viidim도 디미니쉬드', () => {
    expect(parseRoman('viidim')?.quality).toBe('diminished');
  });

  it('iiø7은 half-diminished7', () => {
    expect(parseRoman('iiø7')?.quality).toBe('half_diminished7');
  });

  it('III+는 augmented', () => {
    expect(parseRoman('III+')?.quality).toBe('augmented');
  });

  it('im(maj7)은 minor-major7', () => {
    expect(parseRoman('im(maj7)')?.quality).toBe('minor_major7');
  });
});

describe('parseRoman — 실패 케이스', () => {
  it('빈 문자열은 null', () => {
    expect(parseRoman('')).toBeNull();
  });

  it('로마 숫자 아닌 문자는 null', () => {
    expect(parseRoman('X')).toBeNull();
    expect(parseRoman('abc')).toBeNull();
  });

  it('bVII — b 접두사 지원 후: 유효한 파싱 (rootSemitones = 10)', () => {
    // D1 이전에는 null이었으나 b/# prefix 지원으로 파싱 가능.
    const c = parseRoman('bVII');
    expect(c).not.toBeNull();
    expect(c!.rootSemitones).toBe(10);
  });

  it('알 수 없는 접미사는 null', () => {
    expect(parseRoman('Ixyz')).toBeNull();
  });
});

describe('romanToChord — semitones 채움', () => {
  it('I 메이저 → [0, 4, 7]', () => {
    expect(romanToChord('I')?.semitones).toEqual([0, 4, 7]);
  });

  it('i 마이너 → [0, 3, 7]', () => {
    expect(romanToChord('i')?.semitones).toEqual([0, 3, 7]);
  });

  it('V7 도미넌트 → [7, 11, 2, 5]', () => {
    // V=7, +major3=11, +perfect5=14%12=2, +min7=17%12=5
    expect(romanToChord('V7')?.semitones).toEqual([7, 11, 2, 5]);
  });

  it('iim7 → [2, 5, 9, 0]', () => {
    // ii=2, +min3=5, +perfect5=9, +min7=12%12=0
    expect(romanToChord('iim7')?.semitones).toEqual([2, 5, 9, 0]);
  });

  it('vii°7 → [11, 2, 5, 8]', () => {
    // vii=11, +min3=14%12=2, +b5=17%12=5, +bb7=20%12=8
    expect(romanToChord('vii°7')?.semitones).toEqual([11, 2, 5, 8]);
  });

  it('모든 반환 semitones는 0~11 범위', () => {
    for (const sym of ['I', 'ii', 'V7', 'iiø7', 'vii°7', 'III+']) {
      const chord = romanToChord(sym);
      chord?.semitones.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(12);
      });
    }
  });
});

describe('chordPitchClasses — Key 문맥 적용', () => {
  it('I + Key C → [C, E, G]', () => {
    expect(chordPitchClasses('I', 0 as PitchClass)).toEqual([0, 4, 7]);
  });

  it('V7 + Key C → [G, B, D, F]', () => {
    expect(chordPitchClasses('V7', 0 as PitchClass)).toEqual([7, 11, 2, 5]);
  });

  it('ii + Key G → [A, C, E]', () => {
    // G=7, ii=9(=A), A major triad = [A, C#, E] = [9, 1, 4]
    // 하지만 ii(소문자)는 minor triad = [9, 0, 4] = [A, C, E]
    expect(chordPitchClasses('ii', 7 as PitchClass)).toEqual([9, 0, 4]);
  });

  it('V7 + Key A → [E, G#, B, D]', () => {
    // A=9, V=9+7=16%12=4(E), dominant7 intervals [0,4,7,10] → [4, 8, 11, 2]
    expect(chordPitchClasses('V7', 9 as PitchClass)).toEqual([4, 8, 11, 2]);
  });

  it('파싱 실패 시 null', () => {
    expect(chordPitchClasses('abc', 0 as PitchClass)).toBeNull();
  });
});

describe('getChordTonesInKey — 지판 하이라이트 호출부', () => {
  it('성공 시 chordPitchClasses 결과', () => {
    expect(getChordTonesInKey('V7', 0 as PitchClass)).toEqual([7, 11, 2, 5]);
  });

  it('파싱 실패 시 빈 배열', () => {
    // 컴포넌트는 빈 배열을 "하이라이트 없음"으로 처리 가능
    expect(getChordTonesInKey('bogus', 0 as PitchClass)).toEqual([]);
  });
});

describe('parseRoman — flat/sharp degree prefix', () => {
  it('bVII7 — major key의 ♭7도, dominant7. rootSemitones = 11 - 1 = 10', () => {
    const c = romanToChord('bVII7');
    expect(c).not.toBeNull();
    expect(c!.degree).toBe(7);
    expect(c!.quality).toBe('dominant7');
    expect(c!.rootSemitones).toBe(10);
  });

  it('bVI — major key의 ♭6도, major triad. rootSemitones = 9 - 1 = 8', () => {
    const c = romanToChord('bVI');
    expect(c).not.toBeNull();
    expect(c!.degree).toBe(6);
    expect(c!.rootSemitones).toBe(8);
  });

  it('#IV — major key의 ♯4도. rootSemitones = 5 + 1 = 6', () => {
    const c = romanToChord('#IV');
    expect(c).not.toBeNull();
    expect(c!.rootSemitones).toBe(6);
  });

  it('bIII — major key의 ♭3도. rootSemitones = 4 - 1 = 3 (마이너 3도)', () => {
    const c = romanToChord('bIII');
    expect(c).not.toBeNull();
    expect(c!.rootSemitones).toBe(3);
  });

  it('잘못된 접두사 조합은 null', () => {
    expect(romanToChord('bbVII')).toBeNull();
    expect(romanToChord('##V')).toBeNull();
    expect(romanToChord('b#V')).toBeNull();
    expect(romanToChord('#bVII')).toBeNull();
  });

  it('단일 b/# 단독은 null (로마 숫자 부분 없음)', () => {
    expect(romanToChord('b')).toBeNull();
    expect(romanToChord('#')).toBeNull();
  });

  it('jazz-major-blues progression: 모든 코드가 파싱된다', () => {
    const chords = ['Imaj7','I7','IVmaj7','ivm7','bVII7','iiim7','VI7','iim7','V7'];
    for (const c of chords) {
      expect(romanToChord(c), c).not.toBeNull();
    }
  });
});

describe('romanToChord — 시드 데이터 전수 (planning.md §6.3.2)', () => {
  // seed.py SEED_TEMPLATES 에서 실제 쓰이는 코드 심볼들.
  const SEED_CHORDS = [
    'I', 'I7', 'IV', 'IV7', 'V', 'V7',
    'i', 'i7', 'iv', 'iv7', 'iiø7',
    'vi', 'VI', 'III', 'VII',
    'ii', 'iim7', 'Imaj7', 'II',
  ];

  it.each(SEED_CHORDS)('%s 는 파싱 성공해야 한다', (sym) => {
    expect(romanToChord(sym)).not.toBeNull();
  });
});
