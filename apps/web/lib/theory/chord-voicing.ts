/**
 * 코드 보이싱 → MIDI 변환 순수 함수.
 *
 * 배킹 엔진이 `chordPitchClasses(symbol, keyRoot)`로 얻은 pitch class 배열을
 * 실제 연주할 MIDI 번호로 펼칠 때 사용.
 *
 * MIDI 규약: C4=60, A4=69 (modern standard, MIDI = 12*(octave+1) + pc)
 *
 * Voicing 규칙 (PoC):
 *   - 첫 pc를 root로 해석, `rootOctave` 옥타브에 배치.
 *   - 이후 pc는 항상 직전 음보다 위에 배치 (stacked voicing).
 *     → 코드 톤이 root 아래로 내려가지 않아 "코드" 느낌이 또렷.
 *   - 옥타브 wrap은 12의 배수를 더해 해결.
 *
 * Tone 무의존 — 순수 함수. Vitest 100% 커버리지 타겟.
 */

import { chordPitchClasses } from './chords';
import type { PitchClass } from './types';

/** MIDI 노트 번호 변환 기준 옥타브. C4=60이 되는 옥타브. */
export const DEFAULT_OCTAVE = 4;

/**
 * pitch class 배열 → MIDI 번호 배열.
 * 첫 원소가 root, 나머지는 root 위로 stacked.
 */
export function voicingToMidi(
  pitchClasses: readonly PitchClass[],
  rootOctave: number = DEFAULT_OCTAVE,
): number[] {
  if (pitchClasses.length === 0) return [];

  const rootPc = pitchClasses[0]!;
  const rootMidi = 12 * (rootOctave + 1) + rootPc;

  const result: number[] = [rootMidi];
  let prev = rootMidi;

  for (let i = 1; i < pitchClasses.length; i++) {
    const pc = pitchClasses[i]!;
    let candidate = 12 * (rootOctave + 1) + pc;
    while (candidate <= prev) candidate += 12;
    result.push(candidate);
    prev = candidate;
  }

  return result;
}

/**
 * 로마 숫자 심볼 → MIDI. 파싱 실패 시 null.
 * Engine이 "파싱 실패 바는 소리 스킵" 분기를 할 수 있게 null을 유지.
 */
export function chordSymbolToMidi(
  symbol: string,
  keyRoot: PitchClass,
  rootOctave: number = DEFAULT_OCTAVE,
): number[] | null {
  const pcs = chordPitchClasses(symbol, keyRoot);
  if (pcs === null) return null;
  return voicingToMidi(pcs, rootOctave);
}

/**
 * MIDI 노트 번호 → 주파수(Hz).
 * Tone.Frequency를 쓰지 않는 이유: 테스트에서 Tone 전체 모킹 시
 * 이 함수가 여전히 독립적으로 동작해야 하므로.
 */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
