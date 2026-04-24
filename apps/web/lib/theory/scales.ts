import type { ImportantColor, PitchClass, ScaleCategory, ScaleKey } from './types';
import { getNoteName, isFlatKey, pitchClassFromRoot, semitonesToDegree } from './notes';

/*
 * 스케일 인터벌·중요 노트·카테고리 정의.
 *
 * 모든 값은 Root로부터의 반음(semitones) 기준.
 * - SCALES: 스케일이 포함하는 음
 * - IMPORTANT_DEGREES: 그 스케일의 캐릭터를 정의하는 핵심 도수 (Root 포함 2~4개)
 * - SCALE_CATEGORIES: UI 아코디언 그룹화용
 * - SCALE_LABELS: 사람이 읽을 레이블 (한글)
 *
 * 새 스케일 추가 시 이 파일의 4개 상수 모두 갱신 + 테스트 추가.
 * music-theory-guardian 에이전트 승인 대상.
 */

export const SCALES: Record<ScaleKey, readonly number[]> = {
  // ── Standard ─────────────────────────────────
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],

  // ── Pentatonic ───────────────────────────────
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  major_blues: [0, 2, 3, 4, 7, 9],
  minor_blues: [0, 3, 5, 6, 7, 10],

  // ── Jazz / Modes ─────────────────────────────
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11], // 상행 형태
  whole_tone: [0, 2, 4, 6, 8, 10],
  diminished_hw: [0, 1, 3, 4, 6, 7, 9, 10],
  diminished_wh: [0, 2, 3, 5, 6, 8, 9, 11],

  // ── Other ────────────────────────────────────
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const;

/**
 * 스케일별 기본 강조 색상 매핑 — 음계의 비-루트 음을 색으로 의미화.
 *
 * 색상 의미 (음악 이론 도메인):
 *   orange → **I-IV-V의 IV·V** (서브도미넌트·도미넌트). 코드 진행의 구조적 뼈대.
 *            3도(장/단)는 스케일의 질을 정의하지만 화성 네비게이션에서는 4·5도가
 *            더 핵심이라 orange는 4·5도에 할당. 스케일에 4도가 없으면(예: major
 *            pentatonic, major blues, lydian) 5도만, 5도가 없으면(locrian) 4도만.
 *   green  → 모드 특성음 (parallel 스케일 대비 모드의 정체성을 만드는 음)
 *   blue   → 블루노트 (블루스 전용; Major Blues의 b3, Minor Blues의 b5)
 *
 * Root(0)는 이 맵에 포함하지 않는다 — Root는 항상 고정 red이며 NoteTier 'root'로
 * 별도 처리된다. 여기에 0을 넣는 것은 invariant 위반 (테스트로 검증).
 *
 * 값이 없는 semitone은 'regular' tier(outline only)로 렌더된다.
 *
 * 반음 레퍼런스: 4도=5반음, 5도=7반음, #4/b5=6반음, b3=3반음, b7=10반음.
 */
export const SCALE_HIGHLIGHTS: Record<ScaleKey, Readonly<Partial<Record<number, ImportantColor>>>> = {
  // ── Standard — I-IV-V 뼈대 ───────────────
  major: { 5: 'orange', 7: 'orange' }, // 4도, 5도
  natural_minor: { 5: 'orange', 7: 'orange' }, // 4도(iv), 5도(v)

  // ── Pentatonic ───────────────────────────
  major_pentatonic: { 7: 'orange' }, // 4도 없음 → 5도만
  minor_pentatonic: { 5: 'orange', 7: 'orange' }, // 4·5도 모두 보유
  major_blues: { 7: 'orange', 3: 'blue' }, // 4도 없음; b3 = 블루노트
  minor_blues: { 5: 'orange', 7: 'orange', 6: 'blue' }, // 4·5도 + b5(블루노트)

  // ── Modes — IV·V 뼈대 + 모드 특성음(green) ──
  dorian: { 5: 'orange', 7: 'orange', 9: 'green' }, // nat6 = 도리안 특성
  lydian: { 7: 'orange', 6: 'green' }, // 리디안은 4도 대신 #4 → 5도만 orange, #4 green
  mixolydian: { 5: 'orange', 7: 'orange', 10: 'green' }, // b7 = 믹솔 특성
  phrygian: { 5: 'orange', 7: 'orange', 1: 'green' }, // b2 = 프리지안 특성
  locrian: { 5: 'orange', 6: 'green' }, // perfect 5도 없음(b5뿐) → 4도만 orange, b5 green

  // ── Minor variants ───────────────────────
  harmonic_minor: { 5: 'orange', 7: 'orange', 11: 'green' }, // nat7 = 하모닉 특성
  melodic_minor: { 5: 'orange', 7: 'orange', 11: 'green' }, // nat7 = 멜로딕(상행) 특성

  // ── 대칭 스케일 — 중심성 약해 기본값 없음 ──
  whole_tone: {},
  diminished_hw: {},
  diminished_wh: {},
} as const;

/** 카테고리별 스케일 묶음 (UI 아코디언). 선언 순서가 표시 순서. */
export const SCALE_CATEGORIES: Record<ScaleCategory, readonly ScaleKey[]> = {
  standard: ['major', 'natural_minor'],
  pentatonic: ['major_pentatonic', 'minor_pentatonic', 'major_blues', 'minor_blues'],
  jazz: ['dorian', 'lydian', 'mixolydian', 'melodic_minor', 'whole_tone', 'diminished_hw', 'diminished_wh'],
  other: ['phrygian', 'locrian', 'harmonic_minor'],
} as const;

/** 카테고리 레이블 (한글 표시용). */
export const CATEGORY_LABELS: Record<ScaleCategory, string> = {
  standard: 'Standard',
  pentatonic: 'Pentatonic',
  jazz: 'Jazz / Mode',
  other: 'Other',
} as const;

/** 스케일 레이블 — 사람이 읽는 표기. 한글과 라틴을 혼용. */
export const SCALE_LABELS: Record<ScaleKey, string> = {
  major: 'Major',
  natural_minor: 'Natural Minor',
  major_pentatonic: 'Major Pentatonic',
  minor_pentatonic: 'Minor Pentatonic',
  major_blues: 'Major Blues',
  minor_blues: 'Minor Blues',
  dorian: 'Dorian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  melodic_minor: 'Melodic Minor',
  whole_tone: 'Whole Tone',
  diminished_hw: 'Diminished (H-W)',
  diminished_wh: 'Diminished (W-H)',
  phrygian: 'Phrygian',
  locrian: 'Locrian',
  harmonic_minor: 'Harmonic Minor',
} as const;

// ─── 유틸 함수 ──────────────────────────────────────────

/**
 * 선택한 Root와 스케일에 속하는 노트들을 이름 배열로 반환.
 * 플랫 키 Root면 플랫 표기를 사용한다.
 */
export function getScaleNotes(root: PitchClass, scale: ScaleKey): string[] {
  const useFlats = isFlatKey(root);
  return SCALES[scale].map((semitones) =>
    getNoteName(pitchClassFromRoot(root, semitones), useFlats),
  );
}

/**
 * 스케일에 속하는 피치 클래스 집합 (Set이 아닌 readonly 배열).
 * 지판 렌더러가 "이 프렛의 피치 클래스가 스케일에 속하는가" 판정에 사용.
 */
export function getScalePitchClasses(root: PitchClass, scale: ScaleKey): readonly PitchClass[] {
  return SCALES[scale].map((s) => pitchClassFromRoot(root, s));
}

/** semitone → 색상 매핑. Root(0) 제외. */
export type ScaleHighlights = Readonly<Partial<Record<number, ImportantColor>>>;

/**
 * 현재 스케일에 적용할 강조 매핑을 반환.
 * 유저 오버라이드가 있으면 그걸, 없으면 SCALE_HIGHLIGHTS 기본값.
 */
export function resolveScaleHighlights(
  scale: ScaleKey,
  override: ScaleHighlights | undefined,
): ScaleHighlights {
  return override ?? SCALE_HIGHLIGHTS[scale];
}

/**
 * 스케일의 모든 도수를 도수 레이블(`'1','b3'` 등) 배열로.
 * 토글 UI에서 "이 스케일의 어떤 도수를 강조할지" 고르는 pill 버튼용.
 */
export function getScaleDegreeLabels(scale: ScaleKey): readonly { semitones: number; label: string }[] {
  return SCALES[scale].map((s) => ({ semitones: s, label: semitonesToDegree(s) }));
}
