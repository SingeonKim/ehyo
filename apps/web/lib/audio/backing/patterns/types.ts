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
 * Sprint 2-8 PR-C — 카테고리별 다중 패턴 + 도메인 selectSlot 시스템.
 *
 * AuxStep은 BeatStep 그대로지만 의미 분리 위해 alias. shaker/clave 같은
 * 보조 percussion 트랙에 사용 — voice 내부에서 고정 음높이로 연주.
 */
export type AuxStep = BeatStep;
export type AuxPattern = AuxStep[];

/** 한 마디(0:0:0~0:3:3) 분량의 BarPattern. 슬롯의 단위. */
export type BarPattern = {
  drums: DrumPattern;
  bass: BassPattern;
  guitar: StrumPattern;
  aux?: AuxPattern;
};

/**
 * 카테고리별 리듬 정의.
 *
 * patterns: 슬롯 이름 → BarPattern. 슬롯 이름은 카테고리가 자유롭게 정의
 *   (e.g. 'groove_a', 'turnaround', 'iv_pickup', 'clave_3_2').
 * selectSlot: 도메인 규칙으로 (template, barIndexAbs) → 슬롯 이름.
 *   결정론 — 같은 인자는 항상 같은 슬롯을 반환해야 한다.
 */
export interface CategoryRhythm {
  patterns: Readonly<Record<string, BarPattern>>;
  selectSlot: (
    tpl: { bars: number; default_bpm: number; progression: ReadonlyArray<{ chord: string }> },
    barIndexAbs: number,
  ) => string;
}

/**
 * 'bar:beat:sub' 표기를 BPM 기준 초로 환산.
 * sub는 16분음 단위(한 박 = 4 sub).
 */
export function parseBeatStep(notation: string, bpm: number, beatsPerBar = 4): number {
  const parts = notation.split(':').map(Number);
  const [bars = 0, beats = 0, subs = 0] = parts;

  // dev 가드: 패턴 데이터는 모두 우리가 작성하는 상수 — 잘못된 값이 들어오면
  // 런타임 즉시 발견. production 빌드에서는 dead-code-eliminate.
  if (process.env.NODE_ENV !== 'production') {
    if (!Number.isFinite(bars) || !Number.isFinite(beats) || !Number.isFinite(subs)) {
      throw new Error(`parseBeatStep: invalid notation "${notation}"`);
    }
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new Error(`parseBeatStep: bpm must be > 0, got ${bpm}`);
    }
  }

  const beatSec = 60 / bpm;
  return bars * beatsPerBar * beatSec + beats * beatSec + (subs / 4) * beatSec;
}
