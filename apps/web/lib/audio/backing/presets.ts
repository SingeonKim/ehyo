/**
 * 카테고리 → InstrumentBundle 매핑 (Sprint 2-8 PR-A).
 *
 * smplr 백엔드 전용. 이전 WebAudioFont 기반 InstrumentPreset/CATEGORY_PRESETS/getPreset은
 * Sprint 2-8 마이그레이션 완료(A5)로 제거됨.
 *
 * 카테고리는 ProgressionTemplate.category 값. 알려지지 않은 카테고리는
 * pop fallback — 모든 카드가 최소한 들리도록 보장.
 */

/**
 * Sprint 2-8 PR-A — smplr 백엔드용 instrument bundle.
 * 카테고리별 매핑은 A4에서 작성.
 */
export type DrumMachineName = 'TR-808' | 'Casio-RZ1' | 'LM-2' | 'MFB-512' | 'Roland CR-8000';

export type InstrumentBundle = {
  label: string;
  drums: { machine: DrumMachineName; volume?: number };
  bass: { instrument: string; octaveShift?: number };
  guitar: { instrument: string; octaveShift?: number };
  aux?: { kind: 'shaker' | 'clave'; pattern: 'bossa' | 'funk-16' };
};

/**
 * 카테고리 → InstrumentBundle 매핑 (Sprint 2-8 PR-A Task A4).
 *
 * spike 결과 반영(2026-04-26): smplr 0.20.0 DrumMachine은 5개 kit만 지원하고
 * jazz brush·acoustic 부재 → jazz는 TR-808 폴백, baseline은 LM-2(가장
 * 어쿠스틱-인접한 음색).
 *
 * octaveShift는 voice 내부에서 MIDI 변환 시 적용 — 기존 -24(bass)/-12(guitar)
 * 옥타브 다운 동작을 유지하도록 -2/-1 (반음 12 단위).
 */
export const CATEGORY_BUNDLES = {
  pop: {
    label: 'Pop · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
  rock: {
    label: 'Rock · Distortion + Pick Bass',
    drums: { machine: 'Roland CR-8000' },
    bass: { instrument: 'electric_bass_pick', octaveShift: -2 },
    // 정통 rock은 distortion이 표준 — clean은 modal/pop과 차별화 약함.
    guitar: { instrument: 'distortion_guitar', octaveShift: -1 },
  },
  funk: {
    label: 'Funk · Muted Electric + Shaker',
    drums: { machine: 'TR-808' },
    bass: { instrument: 'electric_bass_pick', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_muted', octaveShift: -1 },
    aux: { kind: 'shaker', pattern: 'funk-16' },
  },
  jazz: {
    // jazz brush는 smplr DrumMachine에 없어 TR-808으로 대체. Sprint 2-8 RhythmRecipe에서 복원 예정.
    label: 'Jazz · Jazz Guitar + Acoustic Bass (TR-808 brush 대체)',
    drums: { machine: 'TR-808' },
    bass: { instrument: 'acoustic_bass', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_jazz', octaveShift: -1 },
  },
  blues: {
    // overdriven_guitar는 MusyngKite에서 디스토션이 거의 안 들려 distortion_guitar로 교체 (스모크 결과).
    label: 'Blues · Distortion + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'distortion_guitar', octaveShift: -1 },
  },
  folk: {
    label: 'Folk · Steel Acoustic + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'acoustic_guitar_steel', octaveShift: -1 },
  },
  bossa: {
    label: 'Bossa · Nylon + Acoustic Bass + Clave',
    drums: { machine: 'LM-2', volume: 0.7 },
    bass: { instrument: 'acoustic_bass', octaveShift: -2 },
    guitar: { instrument: 'acoustic_guitar_nylon', octaveShift: -1 },
    aux: { kind: 'clave', pattern: 'bossa' },
  },
  minor: {
    label: 'Minor · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
  modal: {
    label: 'Modal · Clean Electric + Finger Bass',
    drums: { machine: 'LM-2' },
    bass: { instrument: 'electric_bass_finger', octaveShift: -2 },
    guitar: { instrument: 'electric_guitar_clean', octaveShift: -1 },
  },
} as const satisfies Record<string, InstrumentBundle>;

/** 알려지지 않은 카테고리는 pop fallback. (engine.ts가 이 호출에서 안전 보장) */
export function getBundle(category: string): InstrumentBundle {
  return (CATEGORY_BUNDLES as Record<string, InstrumentBundle>)[category] ?? CATEGORY_BUNDLES.pop;
}

/**
 * Sprint 9 — 카테고리별 default tone profile.
 *
 * voice trigger 시 velocity에 velocityScale 곱, voice gain에 voiceGain 적용,
 * fxChain.wetGain에 reverbWet setValueAtTime. 카드별 부분 override는 CardProfile.
 */
export type ToneProfile = {
  velocityScale: number;
  voiceGain: { drums: number; bass: number; guitar: number; aux: number };
  reverbWet: number;
};

export const CATEGORY_TONE_DEFAULTS: Readonly<Record<keyof typeof CATEGORY_BUNDLES, ToneProfile>> =
  {
    pop: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    rock: {
      velocityScale: 1.1,
      voiceGain: { drums: 1.05, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.14,
    },
    funk: {
      velocityScale: 1.05,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.12,
    },
    jazz: {
      velocityScale: 0.95,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.22,
    },
    blues: {
      velocityScale: 1.0,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.05, aux: 1.0 },
      reverbWet: 0.22,
    },
    folk: {
      velocityScale: 0.95,
      voiceGain: { drums: 0.95, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    bossa: {
      velocityScale: 0.9,
      voiceGain: { drums: 0.9, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.20,
    },
    minor: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
    modal: {
      velocityScale: 1.0,
      voiceGain: { drums: 1.0, bass: 1.0, guitar: 1.0, aux: 1.0 },
      reverbWet: 0.18,
    },
  };

/** 알려지지 않은 카테고리는 pop default. */
export function getCategoryToneDefault(category: string): ToneProfile {
  return (
    (CATEGORY_TONE_DEFAULTS as Record<string, ToneProfile>)[category] ?? CATEGORY_TONE_DEFAULTS.pop
  );
}
