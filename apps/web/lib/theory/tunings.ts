import type { PitchClass } from './types';

/*
 * 튜닝 프리셋 카탈로그 — 7개 정의.
 *
 * 인덱스 규약 (planning.md §6.2.5 / fretboard.ts와 동일):
 *   index 0 = 최저음 (low E, low B 등)
 *   index length-1 = 최고음
 *
 * displayString은 readout 표시용. 이명동음 표기는 표기 컨벤션 따라 수동 작성.
 */

export type InstrumentKind = 'guitar-6' | 'guitar-7' | 'bass-4';

export type TuningPresetId =
  | 'guitar-6-standard'
  | 'guitar-6-drop-d'
  | 'guitar-6-dadgad'
  | 'guitar-6-eb-half'
  | 'guitar-7-standard'
  | 'bass-4-standard'
  | 'bass-4-drop-d';

export interface TuningPreset {
  /** id를 필드로 중복 보유. presetsByInstrument 결과를 dropdown에 매핑할 때
   *  React key + 배열 순회 destructure에서 id에 접근하기 위함. Record 키와 동일. */
  id: TuningPresetId;
  instrument: InstrumentKind;
  /** UI 라벨 (Tuning dropdown 표시용). */
  label: string;
  /** index 0 = 최저음. length = 줄 개수. */
  tuning: readonly PitchClass[];
  /** readout 문자열 — 'EADGBE' / 'BEADGBE' / 'EADG' 등. */
  displayString: string;
}

export const TUNING_PRESETS: Record<TuningPresetId, TuningPreset> = {
  'guitar-6-standard': {
    id: 'guitar-6-standard',
    instrument: 'guitar-6',
    label: 'Standard',
    tuning: [4, 9, 2, 7, 11, 4],
    displayString: 'EADGBE',
  },
  'guitar-6-drop-d': {
    id: 'guitar-6-drop-d',
    instrument: 'guitar-6',
    label: 'Drop D',
    tuning: [2, 9, 2, 7, 11, 4],
    displayString: 'DADGBE',
  },
  'guitar-6-dadgad': {
    id: 'guitar-6-dadgad',
    instrument: 'guitar-6',
    label: 'DADGAD',
    tuning: [2, 9, 2, 7, 9, 2],
    displayString: 'DADGAD',
  },
  'guitar-6-eb-half': {
    id: 'guitar-6-eb-half',
    instrument: 'guitar-6',
    label: 'E♭ Half-step',
    tuning: [3, 8, 1, 6, 10, 3],
    displayString: 'E♭A♭D♭G♭B♭E♭',
  },
  'guitar-7-standard': {
    id: 'guitar-7-standard',
    instrument: 'guitar-7',
    label: 'Standard',
    // 6현 standard 앞에 low B(11) 추가.
    tuning: [11, 4, 9, 2, 7, 11, 4],
    displayString: 'BEADGBE',
  },
  'bass-4-standard': {
    id: 'bass-4-standard',
    instrument: 'bass-4',
    label: 'Standard',
    // 6현 standard의 6번~3번 줄과 동일 (EADG).
    tuning: [4, 9, 2, 7],
    displayString: 'EADG',
  },
  'bass-4-drop-d': {
    id: 'bass-4-drop-d',
    instrument: 'bass-4',
    label: 'Drop D',
    tuning: [2, 9, 2, 7],
    displayString: 'DADG',
  },
};

/**
 * Dropdown 표시용 — 같은 instrument의 preset만 추림.
 * 결과 첫 원소는 항상 standard (DEFAULT_PRESET_BY_INSTRUMENT와 일치).
 * 명시적 array literal 순서로 정의 — Record 순회 순서에 의존하지 않음.
 */
export function presetsByInstrument(kind: InstrumentKind): TuningPreset[] {
  switch (kind) {
    case 'guitar-6':
      return [
        TUNING_PRESETS['guitar-6-standard'],
        TUNING_PRESETS['guitar-6-drop-d'],
        TUNING_PRESETS['guitar-6-dadgad'],
        TUNING_PRESETS['guitar-6-eb-half'],
      ];
    case 'guitar-7':
      return [TUNING_PRESETS['guitar-7-standard']];
    case 'bass-4':
      return [
        TUNING_PRESETS['bass-4-standard'],
        TUNING_PRESETS['bass-4-drop-d'],
      ];
  }
}

/** 각 instrument의 default preset id. setInstrument 자동 전환 시 사용. */
export const DEFAULT_PRESET_BY_INSTRUMENT: Record<InstrumentKind, TuningPresetId> = {
  'guitar-6': 'guitar-6-standard',
  'guitar-7': 'guitar-7-standard',
  'bass-4': 'bass-4-standard',
};

/** 6현 표준 튜닝 — 별칭. fretboard.ts에서 re-export해 기존 import 유지. */
export const STANDARD_TUNING: readonly PitchClass[] = TUNING_PRESETS['guitar-6-standard'].tuning;
