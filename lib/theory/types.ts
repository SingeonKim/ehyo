/*
 * 음악 이론 공용 타입.
 * 실 데이터(SCALES, IMPORTANT_DEGREES)는 Phase 2에서 scales.ts에 추가.
 * Phase 0에서는 타입 골격만 잡고 스토어·UI가 참조할 수 있게 한다.
 */

/** 피치 클래스 — 0(C) ~ 11(B). 옥타브 무시. */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** 스케일 식별자. Phase 2에서 SCALES 상수 키로도 사용. */
export type ScaleKey =
  | 'major'
  | 'natural_minor'
  | 'major_pentatonic'
  | 'minor_pentatonic'
  | 'major_blues'
  | 'minor_blues'
  | 'dorian'
  | 'lydian'
  | 'mixolydian'
  | 'phrygian'
  | 'locrian'
  | 'melodic_minor'
  | 'harmonic_minor'
  | 'whole_tone'
  | 'diminished_hw'
  | 'diminished_wh';

export type ScaleCategory = 'standard' | 'pentatonic' | 'jazz' | 'other';

/** 강조 노트의 색상 — Root(red) 외 3종. 역할 기반:
 *   orange = 코드 톤 (3·5·7도)
 *   green  = 모드 특성음
 *   blue   = 블루노트 (블루스 전용)
 */
export type ImportantColor = 'orange' | 'green' | 'blue';

/** 지판 노트 마커 티어 — FretboardNote가 prop으로 받는 시각 분류. */
export type NoteTier = 'root' | ImportantColor | 'regular';

/** 라벨 표시 모드. */
export type LabelMode = 'name' | 'degree' | 'none';

/** 손잡이. */
export type Handedness = 'right' | 'left';

/** 프렛 간격 방식. uniform은 교육용, equal-temperament는 실기타 근사. */
export type FretSpacing = 'uniform' | 'equal-temperament';

/**
 * 이명동음(샾/플랫) 표기 모드.
 *   auto  → Root의 전통 조표에 따라 자동 (F·Bb·Eb·Ab·Db는 플랫, 나머지는 샾)
 *   sharp → 강제 샾 (C#, D#, F#, G#, A#)
 *   flat  → 강제 플랫 (Db, Eb, Gb, Ab, Bb)
 */
export type AccidentalMode = 'auto' | 'sharp' | 'flat';
