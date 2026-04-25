/**
 * 장르 × 코드 품질 색채음 룰 + 키 단위 universal 색채음.
 *
 * - perChord: 코드 품질별로 추가되는 텐션 (root 기준 반음).
 *   chord-extensions.ts(Part A)와 합집합으로 colorTones 산출.
 * - universal: 코드와 무관, 키 root 기준 반음으로 항상 추가되는 색채음.
 *   블루스의 ♭3·♭5·♭7 같은 "장르 색깔" 자체.
 *
 * music-theory-guardian 게이트 대상.
 *
 * 9개 카테고리는 시드 데이터(presets.ts)와 1:1 대응 — 새 장르 추가 시 동기화 필수.
 */

import type { ChordQuality } from './chords';

/** 코드 진행 카탈로그 카테고리. presets.ts CATEGORY_PRESETS 키와 동기화. */
export type ProgressionCategory =
  | 'pop'
  | 'rock'
  | 'funk'
  | 'jazz'
  | 'blues'
  | 'folk'
  | 'bossa'
  | 'minor'
  | 'modal';

export interface GenreRule {
  /** 코드 품질별 추가 텐션 (root 기준 반음). 미정의 quality는 추가 없음. */
  readonly perChord: Partial<Record<ChordQuality, readonly number[]>>;
  /** 키 root 기준 반음. 코드 무관 색채음. */
  readonly universal: readonly number[];
}

export const GENRE_RULES: Record<ProgressionCategory, GenreRule> = {
  jazz: {
    perChord: {
      dominant7: [1, 3, 6, 8], // ♭9, ♯9, ♯11, ♭13
    },
    universal: [],
  },
  bossa: {
    perChord: {
      dominant7: [1, 6], // ♭9, ♯11 — 절제된 alt
    },
    universal: [],
  },
  blues: {
    perChord: {
      dominant7: [3], // ♭3 (블루스 cross)
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3, 6, 10], // ♭3, ♭5, ♭7 — 블루노트 3종
  },
  rock: {
    perChord: {
      dominant7: [3],
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3, 10], // ♭3, ♭7 — 펜타 컬러
  },
  funk: {
    perChord: {
      dominant7: [3],
      major: [3, 10],
      major7: [3, 10],
    },
    universal: [3], // ♭3 — dorian/mixo cross
  },
  pop: {
    perChord: {},
    universal: [],
  },
  folk: {
    perChord: {},
    universal: [],
  },
  minor: {
    perChord: {
      dominant7: [1], // ♭9 (V7 alt — harmonic minor 함의)
    },
    universal: [],
  },
  modal: {
    perChord: {},
    universal: [],
  },
} as const;
