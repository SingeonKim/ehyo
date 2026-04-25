/**
 * 멀티트랙 배킹 패턴 데이터 타입 + 시각 표기 파서.
 *
 * 시각 표기는 'bar:beat:sub' (16분 sub). Sprint 2-3에서 Tone.Time을 썼으나
 * Sprint 2-4는 자체 파서로 결정론성을 확보 — BPM을 명시 인자로 받음.
 */

export type BeatStep = {
  /** 'bar:beat:sub' — 16분 sub. 예: '0:1:2' = 2박+8분(half beat). */
  time: string;
  velocity?: number;
};

export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
};

export type BassPattern = {
  /** 각 step에서 현재 코드 루트(한 옥타브 다운)를 친다. */
  steps: BeatStep[];
};

// keys 필드 제거 — Sprint 2-4부터 guitar로 대체.
export type StrumStep = BeatStep & { direction: 'down' | 'up' };
export type StrumPattern = StrumStep[];

export type TrackPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  guitar: StrumPattern;
};

/**
 * 'bar:beat:sub' 표기를 BPM 기준 초로 환산.
 * sub는 16분음 단위(한 박 = 4 sub).
 */
export function parseBeatStep(notation: string, bpm: number, beatsPerBar = 4): number {
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;
  const beatSec = 60 / bpm;
  return bars * beatsPerBar * beatSec + beats * beatSec + (subs / 4) * beatSec;
}
