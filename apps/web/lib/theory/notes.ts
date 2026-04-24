import type { AccidentalMode, PitchClass } from './types';

/*
 * 피치 클래스·노트 이름·도수 변환 유틸.
 *
 * 모든 함수는 순수하다. 이 모듈을 수정할 때는 music-theory-guardian
 * 에이전트의 승인을 받는다 (`.claude/agents/music-theory-guardian.md` 참조).
 *
 * 규율:
 *   - 피치 클래스는 0(C) ~ 11(B)
 *   - 샾(#) 우선 표기. Root가 플랫 키일 때만 플랫 이명동음 사용.
 *   - 도수 표기는 12슬롯 고정 문자열 — '1','b2','2','b3','3','4','b5','5','b6','6','b7','7'
 *     이론상 리디안의 6도(=반음 6)는 '#4'가 정확하지만, 앱의 UX 단순화를 위해 'b5'로 통일.
 *     필요 시 추후 컨텍스트 기반 이명동음 표기를 추가할 여지를 남긴다.
 */

export const NOTE_NAMES_SHARP: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const NOTE_NAMES_FLAT: readonly string[] = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

/** 12슬롯 고정 도수 문자열. 인덱스 = Root로부터의 반음 수. */
export const DEGREE_LABELS: readonly string[] = [
  '1',
  'b2',
  '2',
  'b3',
  '3',
  '4',
  'b5',
  '5',
  'b6',
  '6',
  'b7',
  '7',
] as const;

/**
 * 플랫 이명동음을 사용하는 Root인가 (전통 조표 기준).
 * 재즈·팝 컨벤션에 따라 플랫 계열 메이저 키에서 스케일을 플랫으로 나열한다.
 *
 * 포함: F=5 (1♭), Bb=10 (2♭), Eb=3 (3♭), Ab=8 (4♭), Db=1 (5♭)
 * 제외: Gb=6 — F#와 동일 피치 클래스. 기타·재즈 컨벤션상 F#(샾 계열)로 취급해
 *   사용자가 혼동을 덜 겪게 한다. 7♭ vs 5# 대비 6♭ vs 6#에서는 #쪽이 더 친숙.
 */
export function isFlatKey(root: PitchClass): boolean {
  return root === 5 || root === 10 || root === 3 || root === 8 || root === 1;
}

/**
 * 사용자 설정(AccidentalMode)과 Root를 조합해 "플랫 표기를 쓸지" 결정.
 *   auto  → isFlatKey(root) 그대로 (전통 조표 컨벤션)
 *   sharp → 항상 false (샾으로 강제)
 *   flat  → 항상 true (플랫으로 강제)
 */
export function shouldUseFlats(root: PitchClass, mode: AccidentalMode): boolean {
  if (mode === 'sharp') return false;
  if (mode === 'flat') return true;
  return isFlatKey(root);
}

/**
 * 피치 클래스 → 노트 이름.
 * @param pc 피치 클래스 0~11
 * @param useFlats 플랫 표기를 사용할지. 기본 false (샾 우선).
 *                 Root가 플랫 키일 때는 true를 넘겨야 스케일 표기가 일관된다.
 */
export function getNoteName(pc: PitchClass, useFlats = false): string {
  // 배열 bounds는 타입상 PitchClass로 제한되므로 안전하지만, noUncheckedIndexedAccess
  // 설정 때문에 string | undefined로 추론된다. fallback은 논리적으로 도달 불가.
  return (useFlats ? NOTE_NAMES_FLAT[pc] : NOTE_NAMES_SHARP[pc]) ?? '';
}

/**
 * Root와 현재 피치 클래스 사이의 반음 간격 (0~11).
 * 항상 양수로 반환되도록 `+ 12) % 12` 패턴을 쓴다.
 */
export function semitonesFromRoot(pc: PitchClass, root: PitchClass): number {
  return (pc - root + 12) % 12;
}

/**
 * 반음 간격 → 도수 레이블 ('1', 'b3', '5' 등).
 * semitones는 0~11 범위여야 하며 벗어나면 모듈로 처리한다.
 */
export function semitonesToDegree(semitones: number): string {
  const normalized = ((semitones % 12) + 12) % 12;
  return DEGREE_LABELS[normalized] ?? '';
}

/**
 * Root + 반음 간격 → 피치 클래스.
 * 지판 노트 계산 등에서 스케일 인터벌을 Root에 적용할 때 사용.
 */
export function pitchClassFromRoot(root: PitchClass, semitones: number): PitchClass {
  const result = (((root + semitones) % 12) + 12) % 12;
  return result as PitchClass;
}

/**
 * 피치 클래스 전체 12개를 순서대로 반환 (Root부터 시작).
 * Chromatic wheel UI 등에서 사용.
 */
export function allPitchClasses(): readonly PitchClass[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
}
