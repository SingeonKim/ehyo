import type { PitchClass, ScaleCategory, ScaleKey } from './types';
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
 * 스케일별 "중요 노트" 기본값.
 * 각 값은 SCALES[key]의 부분집합이어야 한다 (단위 테스트에서 검증).
 *
 * 근거 (planning.md §6.2.2):
 *   - Major/Minor: 토닉·서브도미넌트·도미넌트 (1/4/5 또는 1/b3/5)
 *   - 모드: 각 모드의 특성음 (리디안 #4, 믹솔 b7, 프리 b2, 로크 b5)
 *   - 블루스 마이너: 블루노트 b5 포함 4개
 *   - 대칭 스케일(홀톤·디미니쉬드): 중심성이 약해 최소 강조
 */
export const IMPORTANT_DEGREES: Record<ScaleKey, readonly number[]> = {
  major: [0, 5, 7], // 1, 4, 5
  natural_minor: [0, 3, 7], // 1, b3, 5

  major_pentatonic: [0, 4, 7], // 1, 3, 5
  minor_pentatonic: [0, 3, 7], // 1, b3, 5
  major_blues: [0, 4, 7], // 1, 3, 5
  minor_blues: [0, 3, 6, 7], // 1, b3, b5(블루노트), 5

  dorian: [0, 3, 7], // 1, b3, 5
  lydian: [0, 4, 6], // 1, 3, #4(=b5 표기) — 리디안 특성음
  melodic_minor: [0, 3, 7], // 1, b3, 5

  // 대칭 스케일 — 루트 중심성이 약함
  whole_tone: [0], // 루트만
  diminished_hw: [0, 3], // 1, b3
  diminished_wh: [0, 3], // 1, b3

  phrygian: [0, 1, 3], // 1, b2, b3 — b2가 프리지안 특성음
  locrian: [0, 3, 6], // 1, b3, b5 — b5가 로크리안 특성음
  harmonic_minor: [0, 3, 7], // 1, b3, 5
  mixolydian: [0, 4, 10], // 1, 3, b7 — b7이 믹솔 특성음
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

/**
 * 주어진 스케일에서 "현재 적용할 중요 도수" 배열을 반환.
 * 유저 오버라이드(override)가 있으면 그걸, 없으면 IMPORTANT_DEGREES 기본값.
 */
export function resolveImportantDegrees(
  scale: ScaleKey,
  override: readonly number[] | undefined,
): readonly number[] {
  return override ?? IMPORTANT_DEGREES[scale];
}

/**
 * 스케일의 모든 도수를 도수 레이블(`'1','b3'` 등) 배열로.
 * 토글 UI에서 "이 스케일의 어떤 도수를 강조할지" 고르는 pill 버튼용.
 */
export function getScaleDegreeLabels(scale: ScaleKey): readonly { semitones: number; label: string }[] {
  return SCALES[scale].map((s) => ({ semitones: s, label: semitonesToDegree(s) }));
}
