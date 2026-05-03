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

import { CHORD_EXTENSIONS } from './chord-extensions';
import { chordPitchClasses, romanToChord } from './chords';
import { GENRE_RULES, type ProgressionCategory } from './genre-rules';
import { pitchClassFromRoot } from './notes';
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
 * 베이스 voice용 단일 MIDI 노트 번호 반환.
 *
 * 슬래시 코드(예: 'I/VII')면 bassSemitones를, 아니면 chord root의 semitones를 사용.
 * engine이 bass voice trigger 직전에 호출해 chord root 대신 슬래시 베이스를 쓸 수 있게 한다.
 *
 * 예:
 *   chordBassMidi('V', 0, 4)      → 67  (G4 — V in C key의 root)
 *   chordBassMidi('I/VII', 0, 4)  → 71  (B4 — VII bass in C key)
 *   chordBassMidi('vim/V', 0, 4)  → 67  (G4 — V bass in C key)
 *
 * MIDI = 12 * (octave + 1) + pitchClass (C4=60, G4=67, B4=71)
 */
export function chordBassMidi(
  symbol: string,
  keyRoot: PitchClass,
  rootOctave: number = DEFAULT_OCTAVE,
): number | null {
  const chord = romanToChord(symbol);
  if (!chord) return null;
  // 슬래시 코드면 bassSemitones, 아니면 chord root의 semitones[0]
  const semitones = chord.bassSemitones ?? chord.semitones[0]!;
  const bassPc = pitchClassFromRoot(keyRoot, semitones);
  return 12 * (rootOctave + 1) + bassPc;
}

/**
 * MIDI 노트 번호 → 주파수(Hz).
 * Tone.Frequency를 쓰지 않는 이유: 테스트에서 Tone 전체 모킹 시
 * 이 함수가 여전히 독립적으로 동작해야 하므로.
 */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface AppropriateNotes {
  /** 코드 root pitch class. 파싱 실패 시 null. */
  chordRoot: PitchClass | null;
  /** 코드 톤 (root 제외). 파싱 실패 시 빈 Set. */
  chordTones: ReadonlySet<PitchClass>;
  /** 색채음 — Part A·B·C 합집합에서 chordRoot/chordTones 제외. */
  colorTones: ReadonlySet<PitchClass>;
}

/**
 * Sprint 2-7 — 배킹 재생 중 "적절한 음" 집합 계산.
 *
 * 입력 3축:
 *   - chordSymbol (현재 마디 코드 심볼, 로마 숫자)
 *   - keyRoot (베이스 키)
 *   - category (장르 — Part B/C 룰 선택)
 *
 * NOTE: scale은 현재 시그니처에서 제외. modal-aware 어보이드 정제가 실제
 * 필요해질 때 다시 추가한다(YAGNI).
 *
 * 출력:
 *   - chordRoot (1pc)        → 빨강 ring
 *   - chordTones (root 제외) → 파랑 ring
 *   - colorTones             → 파랑 faded ring
 *
 * Part A(코드 품질 텐션)는 카테고리 무관 적용 — 음악 이론 표준이므로
 * modal/folk라도 Part A는 유지. modal/folk는 Part B/C가 비어 있어 "장르 색깔만"
 * 추가하지 않을 뿐이다.
 */
export function getAppropriateNotes(
  chordSymbol: string,
  keyRoot: PitchClass,
  category: ProgressionCategory,
): AppropriateNotes {
  const chord = romanToChord(chordSymbol);
  if (!chord) {
    return { chordRoot: null, chordTones: new Set(), colorTones: new Set() };
  }

  const chordRoot = pitchClassFromRoot(keyRoot, chord.rootSemitones);
  // chord.semitones[0] === rootSemitones, 이미 chordRoot로 분리하므로 [1:] 사용
  const chordTonesArr = chord.semitones
    .slice(1)
    .map((s) => pitchClassFromRoot(keyRoot, s));
  const chordTones = new Set(chordTonesArr);

  const partA = CHORD_EXTENSIONS[chord.quality]
    .map((s) => pitchClassFromRoot(keyRoot, (chord.rootSemitones + s) % 12));

  const partB = (GENRE_RULES[category].perChord[chord.quality] ?? [])
    .map((s) => pitchClassFromRoot(keyRoot, (chord.rootSemitones + s) % 12));

  const partC = GENRE_RULES[category].universal
    .map((s) => pitchClassFromRoot(keyRoot, s));

  const colorTones = new Set<PitchClass>([...partA, ...partB, ...partC]);
  // chord-tone 영역과 disjoint 보장
  for (const t of chordTones) colorTones.delete(t);
  colorTones.delete(chordRoot);

  return { chordRoot, chordTones, colorTones };
}
