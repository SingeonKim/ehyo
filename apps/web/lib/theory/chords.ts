/**
 * 로마 숫자 코드 표기 → 피치 클래스 집합 변환.
 *
 * 배킹 트랙 엔진이 시드 데이터의 progression(`[{bar, chord: "I7"}, ...]`)을
 * 실제 코드 톤으로 구체화할 때 사용. 순수 함수 — Key 문맥과 분리돼 있어
 * `romanToChord('V7', 'C') === { root: 7, qualities: ['dominant7'], pitches: [7, 11, 2, 5] }`.
 *
 * 지원 표기:
 *   대소문자: 대문자 = 장3도(메이저/도미넌트), 소문자 = 단3도(마이너/디미니쉬드)
 *   숫자 접미사: 7, maj7, m7, 6
 *   품질: b5(dim), #5(aug), dim, +  (확장 여지, 현재 시드는 기본만)
 *   단계: I, II, III, IV, V, VI, VII (아라비아 숫자 2,4,7도 허용)
 *
 * music-theory-guardian 규율:
 *   - Key 문맥과 분리된 순수 함수. 전역 상태 접근 금지.
 *   - 모든 반환 피치 클래스는 0~11 범위.
 *   - 파싱 실패는 예외가 아닌 null 반환 — 라벨 표시는 망가지면 안 되므로.
 */

import type { PitchClass } from './types';
import { pitchClassFromRoot } from './notes';

/** 스케일 도수별 반음 오프셋 (장조 기준). I=0, ii=2, iii=4, IV=5, V=7, vi=9, vii=11. */
const DEGREE_OFFSET: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const ROMAN_TO_DIGIT: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
};

/** 코드 품질 — triad + 7th 조합 표현. */
export type ChordQuality =
  | 'major' // I, IV, V
  | 'minor' // i, ii, iii, vi
  | 'diminished' // vii° (b5)
  | 'augmented' // III+ (#5)
  | 'major7' // Imaj7
  | 'minor7' // im7, iim7
  | 'dominant7' // I7, V7
  | 'diminished7' // vii°7
  | 'half_diminished7' // iiø7 (m7b5)
  | 'minor_major7'; // im(maj7)

export interface ParsedChord {
  /** 스케일 상의 도수 (1~7). 없으면 null. */
  degree: number;
  /** Key 루트로부터의 반음 오프셋 (0~11). major 스케일 기준 degree 오프셋 + 품질 변형. */
  rootSemitones: number;
  /** 코드 품질. */
  quality: ChordQuality;
  /** 화성 구성 피치 클래스 목록 (키에 루트를 적용하면 실제 연주 노트). */
  semitones: readonly number[];
}

/**
 * 장3도/완전5도 기본 트라이어드 + 품질별 변형 반음 간격.
 * 모두 root(0)부터의 반음.
 */
const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  half_diminished7: [0, 3, 6, 10],
  minor_major7: [0, 3, 7, 11],
};

/**
 * 로마 숫자 코드 표기를 파싱. 실패 시 null.
 *
 * 예:
 *   "I"       → degree 1, major
 *   "V7"      → degree 5, dominant7
 *   "ii"      → degree 2, minor
 *   "iim7"    → degree 2, minor7
 *   "Imaj7"   → degree 1, major7
 *   "vii°"    → degree 7, diminished
 *   "iiø7"    → degree 2, half_diminished7
 *   "III+"    → degree 3, augmented
 */
export function parseRoman(symbol: string): Omit<ParsedChord, 'semitones'> | null {
  // 선행 변화(b/#)는 현재 시드에서 쓰지 않지만 확장 여지 위해 분리.
  // 예: "bVII"의 b는 접두사. 지금은 지원 안 함(null 반환).
  if (symbol.startsWith('b') || symbol.startsWith('#')) {
    return null;
  }

  // 로마 숫자 부분 추출 (최장 매치)
  let romanPart = '';
  for (const candidate of ['VII', 'III', 'VI', 'IV', 'II', 'V', 'I']) {
    if (symbol.toUpperCase().startsWith(candidate)) {
      romanPart = symbol.slice(0, candidate.length);
      break;
    }
  }
  if (!romanPart) return null;

  const degree = ROMAN_TO_DIGIT[romanPart.toUpperCase()];
  if (degree === undefined) return null;

  const isLower = romanPart === romanPart.toLowerCase();
  const suffix = symbol.slice(romanPart.length).trim();

  // 기본 품질: 대문자 = 메이저, 소문자 = 마이너
  let quality: ChordQuality = isLower ? 'minor' : 'major';

  // 접미사 매핑. 우선순위: 구체적인 것(maj7, m7b5) 먼저.
  // 소문자 기반 suffix는 이미 minor 전제.
  if (suffix === '' || suffix === 'maj') {
    // 기본 유지 (대문자=major, 소문자=minor)
  } else if (suffix === 'maj7' || suffix === 'Δ7' || suffix === 'Maj7' || suffix === 'M7') {
    quality = 'major7';
  } else if (suffix === '7') {
    // 대문자 7 = dominant7 (예: V7, I7)
    // 소문자 7 = minor7 (예: iim7, iiim7... 실제론 'iim7'처럼 m7로 표기하지만 'ii7'도 허용)
    quality = isLower ? 'minor7' : 'dominant7';
  } else if (suffix === 'm7') {
    quality = 'minor7';
  } else if (suffix === 'm') {
    quality = 'minor';
  } else if (suffix === '°' || suffix === 'dim' || suffix === 'o') {
    quality = 'diminished';
  } else if (suffix === '°7' || suffix === 'dim7' || suffix === 'o7') {
    quality = 'diminished7';
  } else if (suffix === 'ø' || suffix === 'ø7' || suffix === 'm7b5') {
    quality = 'half_diminished7';
  } else if (suffix === '+' || suffix === 'aug') {
    quality = 'augmented';
  } else if (suffix === 'm(maj7)' || suffix === 'mMaj7') {
    quality = 'minor_major7';
  } else {
    // 미지 접미사 — 파싱 실패로 간주
    return null;
  }

  const rootSemitones = DEGREE_OFFSET[degree];
  if (rootSemitones === undefined) return null;

  return { degree, rootSemitones, quality };
}

/**
 * 로마 숫자 코드를 완전히 분해. semitones 필드까지 채운다.
 * 각 요소는 Key 루트로부터의 반음 오프셋 (0~11, 옥타브 접기 적용).
 */
export function romanToChord(symbol: string): ParsedChord | null {
  const parsed = parseRoman(symbol);
  if (!parsed) return null;

  const intervals = QUALITY_INTERVALS[parsed.quality];
  const semitones = intervals.map(
    (interval) => (parsed.rootSemitones + interval) % 12,
  );

  return { ...parsed, semitones };
}

/**
 * Key Root에 로마 숫자 코드를 적용 → 실 피치 클래스 배열.
 * 예: "V7" + Key C(0) → [7, 11, 2, 5] = [G, B, D, F]
 */
export function chordPitchClasses(
  symbol: string,
  keyRoot: PitchClass,
): readonly PitchClass[] | null {
  const chord = romanToChord(symbol);
  if (!chord) return null;
  return chord.semitones.map((s) => pitchClassFromRoot(keyRoot, s));
}

/**
 * 코드 톤 전용 피치 클래스 — 지판 하이라이트에서 "현재 코드 ring" 레이어 용.
 * chordPitchClasses의 alias지만 semantic이 분명해 호출부 가독성 ↑.
 */
export function getChordTonesInKey(
  symbol: string,
  keyRoot: PitchClass,
): readonly PitchClass[] {
  return chordPitchClasses(symbol, keyRoot) ?? [];
}
