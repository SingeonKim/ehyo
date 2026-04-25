/*
 * 코드 심볼 표기 정규화 + 절대 변환.
 *
 * Sprint 2-6 — 카탈로그 카드/재생 버튼이 사용자에게 코드를 보여줄 때 단일 진입점.
 * seed 데이터는 case-sensitive parser(parseRoman)에 의존하므로 표기 변환은
 * 표시 단계에서만. seed/엔진/이론 데이터는 변경하지 않는다.
 */

import type { ChordQuality } from './chords';
import { parseRoman } from './chords';
import { getNoteName, isFlatKey, pitchClassFromRoot } from './notes';
import type { PitchClass } from './types';

export type ChordDisplayMode = 'roman' | 'absolute';

const UPPER_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: '°',
  augmented: '+',
  major7: 'maj7',
  minor7: 'm7',
  dominant7: '7',
  diminished7: '°7',
  half_diminished7: 'ø7',
  minor_major7: 'm(maj7)',
};

export function normalizeRomanCase(symbol: string): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const upper = UPPER_ROMAN[parsed.degree - 1];
  if (!upper) return symbol;
  return upper + QUALITY_SUFFIX[parsed.quality];
}

export function romanToAbsolute(symbol: string, keyRoot: PitchClass): string {
  const parsed = parseRoman(symbol);
  if (!parsed) return symbol;
  const rootPc = pitchClassFromRoot(keyRoot, parsed.rootSemitones);
  const noteName = getNoteName(rootPc, isFlatKey(keyRoot));
  return noteName + QUALITY_SUFFIX[parsed.quality];
}

export function displayChord(
  symbol: string,
  keyRoot: PitchClass,
  mode: ChordDisplayMode,
): string {
  return mode === 'absolute'
    ? romanToAbsolute(symbol, keyRoot)
    : normalizeRomanCase(symbol);
}
