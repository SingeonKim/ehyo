import { describe, it, expect } from 'vitest';

import {
  normalizeRomanCase,
  romanToAbsolute,
  displayChord,
} from '@/lib/theory/chord-display';

describe('normalizeRomanCase', () => {
  it('대문자 도수는 그대로 유지', () => {
    expect(normalizeRomanCase('I')).toBe('I');
    expect(normalizeRomanCase('V7')).toBe('V7');
    expect(normalizeRomanCase('Imaj7')).toBe('Imaj7');
  });

  it('소문자 도수는 대문자 + m suffix', () => {
    expect(normalizeRomanCase('i')).toBe('Im');
    expect(normalizeRomanCase('i7')).toBe('Im7');
    expect(normalizeRomanCase('iim7')).toBe('IIm7');
    expect(normalizeRomanCase('vi')).toBe('VIm');
  });

  it('quality 접미사 정확히 보존', () => {
    expect(normalizeRomanCase('vii°')).toBe('VII°');
    expect(normalizeRomanCase('iiø7')).toBe('IIø7');
    expect(normalizeRomanCase('III+')).toBe('III+');
  });

  it('파싱 실패 시 원본 반환 (UI 무손상)', () => {
    expect(normalizeRomanCase('???')).toBe('???');
    expect(normalizeRomanCase('')).toBe('');
  });
});

describe('romanToAbsolute', () => {
  it('C 키 (0) — 도수가 절대 음으로 변환', () => {
    expect(romanToAbsolute('I', 0)).toBe('C');
    expect(romanToAbsolute('I7', 0)).toBe('C7');
    expect(romanToAbsolute('IV', 0)).toBe('F');
    expect(romanToAbsolute('V7', 0)).toBe('G7');
    expect(romanToAbsolute('vi', 0)).toBe('Am');
  });

  it('D 키 (2) — 도수 적용', () => {
    expect(romanToAbsolute('I', 2)).toBe('D');
    expect(romanToAbsolute('V7', 2)).toBe('A7');
    expect(romanToAbsolute('iim7', 2)).toBe('Em7');
  });

  it('플랫 키 — flat 표기 우선', () => {
    // F 키 (5) — flat 키
    expect(romanToAbsolute('I', 5)).toBe('F');
    expect(romanToAbsolute('IV', 5)).toBe('Bb');
    // Bb 키 (10)
    expect(romanToAbsolute('I', 10)).toBe('Bb');
    expect(romanToAbsolute('IV', 10)).toBe('Eb');
  });

  it('파싱 실패 시 원본', () => {
    expect(romanToAbsolute('???', 0)).toBe('???');
  });
});

describe('displayChord (dispatch)', () => {
  it('mode=roman → normalizeRomanCase', () => {
    expect(displayChord('i7', 0, 'roman')).toBe('Im7');
  });
  it('mode=absolute → romanToAbsolute', () => {
    expect(displayChord('i7', 0, 'absolute')).toBe('Cm7');
  });
});
