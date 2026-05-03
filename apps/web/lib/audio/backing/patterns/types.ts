/**
 * 멀티트랙 배킹 패턴 데이터 타입 + 시각 표기 파서.
 *
 * 시각 표기는 'bar:beat:sub' (16분 sub). Sprint 2-3에서 Tone.Time을 썼으나
 * Sprint 2-4는 자체 파서로 결정론성을 확보 — BPM을 명시 인자로 받음.
 */

export type BeatStep = {
  /** 'bar:beat:sub' — sub의 의미는 unit에 따름. */
  time: string;
  /**
   * sub 단위 해석:
   *  - 'sub16'(default): sub 0/1/2/3 = 0/0.25/0.5/0.75박 (16분).
   *    swing 인자가 0.5 초과면 sub 2(8분 off-beat)가 swing 비율로 밀린다.
   *  - 'triplet8': sub 0/1/2 = 0/0.333/0.667박 (8분 트리플렛 long-mid-short).
   *    swing 인자는 무시된다 — 트리플렛은 명시적 long-short.
   */
  unit?: 'sub16' | 'triplet8';
  velocity?: number;
};

export type DrumPattern = {
  kick: BeatStep[];
  snare: BeatStep[];
  hat: BeatStep[];
  /** Optional — 카드 climax/fill에서 사용. kit 부재 시 snare 폴백. */
  tom?: BeatStep[];
  /** Optional — 카드 climax 끝 액센트. kit 부재 시 clap → snare 폴백. */
  crash?: BeatStep[];
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
 * 카테고리별 리듬 정의 — Sprint 9에서 swing/variant 확장.
 *
 * patterns: 슬롯 이름 → BarPattern.
 * swing?: 글로벌 그루브 캐릭터. 미지정 = 0.5(straight).
 *   variant별 override가 default와 다른 경우만 perVariant에 등록.
 * selectSlot: (tpl, barIndexAbs, variant?) → 슬롯 이름.
 *   variant는 카드 프로필이 흘려준 값. 카테고리는 무시하거나 풀 분기에 사용.
 *   결정론 — 같은 인자는 항상 같은 슬롯.
 */
export interface CategoryRhythm {
  patterns: Readonly<Record<string, BarPattern>>;
  swing?: { default: number; perVariant?: Record<string, number> };
  selectSlot: (
    tpl: { bars: number; default_bpm: number; progression: ReadonlyArray<{ chord: string }> },
    barIndexAbs: number,
    variant?: string,
  ) => string;
}

/**
 * 'bar:beat:sub' 표기를 BPM 기준 초로 환산.
 *
 * opts.unit:
 *  - 'sub16'(default): 16분 sub. swing이 0.5 초과면 sub 2를 swing 비율로 밀기.
 *  - 'triplet8': 8분 트리플렛 sub(0/1/2 → 0박 / 1/3박 / 2/3박). swing 무시.
 *
 * opts.swing: 0.5(straight) ~ 0.75(hard shuffle). default 0.5(회귀 안전).
 */
export function parseBeatStep(
  notation: string,
  bpm: number,
  beatsPerBar = 4,
  opts?: { unit?: 'sub16' | 'triplet8'; swing?: number },
): number {
  const { unit = 'sub16', swing = 0.5 } = opts ?? {};
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
    if (!Number.isFinite(swing) || swing < 0.5 || swing > 0.75) {
      throw new Error(`parseBeatStep: swing must be in [0.5, 0.75], got ${swing}`);
    }
  }

  const beatSec = 60 / bpm;
  let subFrac: number;

  if (unit === 'triplet8') {
    // 8분 트리플렛: sub 0/1/2 → 박의 0/1/3/2/3
    subFrac = subs / 3;
  } else {
    // sub16(default): 16분 sub. swing이 0.5 초과면 sub 2(8분 off-beat)를 밀기.
    subFrac = subs / 4;
    if (swing !== 0.5 && subs === 2) {
      subFrac = swing;
    }
  }

  return bars * beatsPerBar * beatSec + beats * beatSec + subFrac * beatSec;
}
