import type { NoteTier, PitchClass, ScaleKey } from './types';
import { getNoteName, isFlatKey, semitonesFromRoot, semitonesToDegree } from './notes';
import { SCALES, type ScaleHighlights } from './scales';

/*
 * 지판 노트 계산 — 순수 음악 이론 + 좌표(string, fret) 매핑.
 * SVG 렌더링은 components/fretboard에서 담당. 이 모듈은 "어느 프렛에 어떤 노트가
 * 있고 그 노트가 어떤 tier인가"만 결정한다.
 *
 * 튜닝 배열 인덱스 규약 (planning.md §6.2.5):
 *   index 0 = 6번줄 (최저음, low E)
 *   index 5 = 1번줄 (최고음, high E)
 *
 * 렌더링 시에는 반대 방향(index 5가 위)으로 뒤집는다.
 */

/** 표준 튜닝: 6번줄부터 EADGBE. */
export const STANDARD_TUNING: readonly PitchClass[] = [4, 9, 2, 7, 11, 4] as const;

/** 지판 상 한 노트의 속성. */
export interface NoteMark {
  /** 1~6 — 1번줄(최고음)이 1, 6번줄(최저음)이 6. */
  string: number;
  /** 0(오픈) ~ frets. */
  fret: number;
  /** 해당 위치의 피치 클래스 0~11. */
  pitchClass: PitchClass;
  /** Root로부터의 반음. */
  semitonesFromRoot: number;
  /** 도수 레이블 ('1', 'b3', '5' 등). */
  degree: string;
  /** 표시 이름 (Root 플랫 여부 반영). */
  noteName: string;
  /** 렌더러가 크기·색을 고를 때 쓰는 티어. */
  tier: NoteTier;
}

/**
 * 한 줄 한 프렛의 피치 클래스.
 * 오픈 스트링은 튜닝 그대로, n번째 프렛은 n반음 위.
 */
export function pitchAt(tuning: readonly PitchClass[], stringIdx: number, fret: number): PitchClass {
  const open = tuning[stringIdx];
  if (open === undefined) {
    throw new Error(`Invalid string index: ${stringIdx}`);
  }
  return (((open + fret) % 12) + 12) % 12 as PitchClass;
}

/**
 * 튜닝 배열 인덱스(0 = 6번줄 = 저음) → 사람이 읽는 string number(1~6, 1 = 고음).
 * 예: tuning[0] (6번줄 low E) → stringNumber = 6
 */
function stringNumberFromIndex(tuning: readonly PitchClass[], idx: number): number {
  return tuning.length - idx;
}

/**
 * 선택한 Root·스케일에 해당하는 지판 노트들을 전부 계산 (프렛 1 이상).
 * 프렛 0 (오픈 스트링)은 별도 관리 — getOpenStringLabels 참조.
 * 이유: 오픈 스트링은 줄의 기본 음이라 항상 표시되어야 하고, 스케일·중요도
 * 토글과 무관한 레이블 성격이다. 여기서 함께 반환하면 렌더러 측에서
 * "fret===0만 다르게 그린다"는 분기가 필요해 분리하는 편이 깔끔하다.
 *
 * tier 결정:
 *   - semitonesFromRoot === 0 → 'root'
 *   - importantDegrees에 포함 → 'important'
 *   - 그 외 → 'regular'
 */
export function getFretboardNotes(params: {
  tuning: readonly PitchClass[];
  frets: number;
  root: PitchClass;
  scale: ScaleKey;
  /** 적용할 강조 색상 매핑 (resolveScaleHighlights의 결과). semitone → color. */
  highlights: ScaleHighlights;
}): NoteMark[] {
  const { tuning, frets, root, scale, highlights } = params;
  const scaleSet = new Set(SCALES[scale]);
  const useFlats = isFlatKey(root);

  const marks: NoteMark[] = [];

  for (let stringIdx = 0; stringIdx < tuning.length; stringIdx++) {
    // fret 1부터 — 오픈 스트링은 getOpenStringLabels가 책임진다.
    for (let fret = 1; fret <= frets; fret++) {
      const pc = pitchAt(tuning, stringIdx, fret);
      const semi = semitonesFromRoot(pc, root);

      if (!scaleSet.has(semi)) continue;

      // Root는 항상 'root', 나머지는 highlights 맵에서 색 조회. 없으면 regular.
      const tier: NoteTier = semi === 0 ? 'root' : (highlights[semi] ?? 'regular');

      marks.push({
        string: stringNumberFromIndex(tuning, stringIdx),
        fret,
        pitchClass: pc,
        semitonesFromRoot: semi,
        degree: semitonesToDegree(semi),
        noteName: getNoteName(pc, useFlats),
        tier,
      });
    }
  }

  return marks;
}

/** 오픈 스트링(프렛 0)의 고정 레이블. 스케일·중요도 토글과 무관하게 6개 모두 항상 표시. */
export interface OpenStringLabel {
  /** 1~6, 1번줄(최고음). */
  string: number;
  pitchClass: PitchClass;
  /** 샾/플랫 이명동음은 Root 컨벤션(isFlatKey)에 맞춰 선택. */
  noteName: string;
}

/**
 * 6개 오픈 스트링을 항상 반환.
 * 지판 UX 관점: 사용자가 어떤 스케일을 골라도 "줄의 기본 음이 무엇인가"는
 * 지판 학습의 기준점이다. 따라서 스케일 소속과 무관하게 항상 노출.
 */
export function getOpenStringLabels(
  tuning: readonly PitchClass[],
  root: PitchClass,
): OpenStringLabel[] {
  const useFlats = isFlatKey(root);
  return tuning.map((pc, idx) => ({
    string: stringNumberFromIndex(tuning, idx),
    pitchClass: pc,
    noteName: getNoteName(pc, useFlats),
  }));
}

/**
 * 표준 기타 인레이(dot) 위치.
 * 렌더러가 그리드를 그릴 때 참조. `double`은 같은 프렛에 점 2개(12, 24).
 */
export const INLAY_POSITIONS: readonly { fret: number; double: boolean }[] = [
  { fret: 3, double: false },
  { fret: 5, double: false },
  { fret: 7, double: false },
  { fret: 9, double: false },
  { fret: 12, double: true },
  { fret: 15, double: false },
  { fret: 17, double: false },
  { fret: 19, double: false },
  { fret: 21, double: false },
  { fret: 24, double: true },
] as const;
