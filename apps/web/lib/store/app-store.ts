import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  AccidentalMode,
  FretSpacing,
  Handedness,
  ImportantColor,
  LabelMode,
  PitchClass,
  ScaleKey,
} from '@/lib/theory/types';
import { SCALE_HIGHLIGHTS } from '@/lib/theory/scales';
import type { ChordDisplayMode } from '@/lib/theory/chord-display';
import { GENRE_RULES, type ProgressionCategory } from '@/lib/theory/genre-rules';
import type { ProgressionTemplate } from '@/lib/api/progression-templates';

/*
 * 앱 전역 상태 — Zustand + persist.
 *
 * 영속화 규칙:
 *   - key: `my-music-app:v1` (planning.md 7.1 참조)
 *   - version 필드 + migrate 함수로 하위호환
 *   - partialize로 런타임 상태(isPlaying, tapTimestamps)는 저장 제외
 *
 * SSR 주의:
 *   - 이 스토어를 사용하는 컴포넌트는 `'use client'` 필수
 *   - 첫 렌더 hydration mismatch 방지 위해 `useHasHydrated()` 패턴 권장 (Phase 1 컴포넌트에서 구현)
 */

// ─── 메트로놈 ──────────────────────────────────────────────
export type SubdivisionType = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'swing';
export type SoundType = 'click' | 'wood' | 'cowbell' | 'digital' | 'rim';

export interface TimeSignature {
  numerator: number;        // 2,3,4,5,6,7,9,12 등
  denominator: 2 | 4 | 8;
}

export interface MetronomeState {
  // 영속
  bpm: number;                     // 20 ~ 300
  timeSignature: TimeSignature;
  subdivision: SubdivisionType;
  accentBeatOne: boolean;
  soundType: SoundType;
  volume: number;                  // 0.0 ~ 1.0

  // 런타임 (persist 제외)
  isPlaying: boolean;
  tapTimestamps: number[];         // performance.now() 값들, 최근 4개만 사용
}

// ─── 지판 ──────────────────────────────────────────────────
export interface FretboardState {
  root: PitchClass;
  scale: ScaleKey;
  /** 스케일별 강조 색상 매핑(semitone→color) 오버라이드. 없으면 SCALE_HIGHLIGHTS 기본. */
  highlightsByScale: Partial<Record<ScaleKey, Record<number, ImportantColor>>>;
  labelMode: LabelMode;
  handedness: Handedness;
  frets: 22 | 24;
  fretSpacing: FretSpacing;
  /** 이명동음 표기 모드. 기본 'auto'(Root의 전통 조표). */
  accidentalMode: AccidentalMode;
}

// ─── UI ────────────────────────────────────────────────────
export interface UiState {
  theme: 'dark' | 'light';
  /**
   * 배킹 카탈로그의 코드 표기 모드.
   * 'roman': 도수 표기 (I, IV, V7) — 키와 무관한 보편 형태
   * 'absolute': 키 적용 표기 (C, F, G7) — 실제 음 이름
   * 사용자가 토글로 전환, persist에 포함.
   */
  chordDisplayMode: ChordDisplayMode;
}

// ─── 배킹 트랙 ─────────────────────────────────────────────
//
// Sprint 2-6 후속(v9): 배킹 재생 Key를 fretboard.root와 단일 소스로 통합.
//   기존 backing.backingKey는 제거 — KeySelector(잼)와 RootPicker(설정)이
//   같은 fretboard.root를 양방향으로 제어한다. 엔진은 store 브리지에서
//   fretboard.root 변화를 구독해 setKey를 호출.
export interface BackingSliceState {
  /** 런타임. 재생 중인 template.slug 또는 null. */
  backingPlayingSlug: string | null;
  /** 런타임. 재생 중인 template.category. backingPlayingSlug와 항상 동기화. */
  backingPlayingCategory: ProgressionCategory | null;
  /** 런타임. 엔진이 퍼블리시하는 현재 코드. */
  backingCurrentChord: { symbol: string; barIndex: number } | null;
  /** 영속. 카드 slug → 사용자가 설정한 BPM. 없으면 template.default_bpm 사용. */
  bpmOverrides: Record<string, number>;
  /**
   * 영속. 배킹 트랙 마스터 볼륨 (0~1). 메트로놈 볼륨과는 별개.
   * 엔진은 store 브리지에서 이 값을 구독해 master gain에 적용한다.
   */
  volume: number;
  /** 런타임. 사용자가 카드 마디를 클릭해서 선택한 슬러그. 정지 상태에서만 유효. */
  backingSelectedSlug: string | null;
  /** 런타임. 선택된 마디 인덱스. backingSelectedSlug와 항상 쌍으로 변경. */
  backingSelectedBarIndex: number | null;
}

// ─── 루트 state + 액션 ────────────────────────────────────
export interface AppState {
  metronome: MetronomeState;
  fretboard: FretboardState;
  ui: UiState;
  backing: BackingSliceState;

  // 메트로놈 액션 (Phase 1에서 확장)
  setBpm: (bpm: number) => void;
  setTimeSignature: (ts: TimeSignature) => void;
  setSubdivision: (s: SubdivisionType) => void;
  toggleAccentBeatOne: () => void;
  setSoundType: (s: SoundType) => void;
  setVolume: (v: number) => void;
  startMetronome: () => void;
  stopMetronome: () => void;
  tap: (now?: number) => void;

  // 지판 액션 (Phase 2에서 확장)
  setRoot: (root: PitchClass) => void;
  setScale: (scale: ScaleKey) => void;
  setLabelMode: (mode: LabelMode) => void;
  setHandedness: (h: Handedness) => void;
  setAccidentalMode: (mode: AccidentalMode) => void;
  /**
   * 특정 semitone의 강조 색상을 사이클 전환: undefined → orange → green → blue → undefined.
   * Root(semitones=0)에는 적용 금지 (항상 red 고정).
   */
  cycleNoteHighlight: (scale: ScaleKey, semitones: number) => void;

  /** 현재 스케일의 override를 제거해 SCALE_HIGHLIGHTS 기본값으로 되돌린다. */
  resetHighlights: (scale: ScaleKey) => void;

  // 배킹 액션
  /** engine subscriber 전용 — UI에서 호출 금지. slug + category 동시 set. */
  _setBackingPlayingTemplate: (template: ProgressionTemplate | null) => void;
  /** engine subscriber 전용 — UI에서 호출 금지. */
  _setBackingCurrentChord: (
    c: { symbol: string; barIndex: number } | null,
  ) => void;
  /** slug에 BPM override를 설정. 엔진의 setBpm과 함께 호출해야 즉시 반영. */
  setBackingBpm: (slug: string, bpm: number) => void;
  /** slug의 BPM override를 제거. 이후 재생 시 template.default_bpm으로 복귀. */
  clearBackingBpm: (slug: string) => void;
  /** 배킹 마스터 볼륨 변경 (0~1). 엔진 브리지가 setVolume을 자동 호출. */
  setBackingVolume: (v: number) => void;
  /**
   * 사용자 마디 선택 토글.
   *  - template + barIndex 양쪽 non-null: 선택 적용. 정지 상태면 chord 컨텍스트
   *    (backingCurrentChord + backingPlayingCategory)도 함께 set해서 fretboard
   *    하이라이팅이 동기화. 재생 중이면 chord 컨텍스트는 엔진이 관리하므로
   *    selectedSlug + selectedBarIndex만 갱신.
   *  - 둘 중 하나라도 null: 선택 해제. 정지 상태면 chord 컨텍스트도 함께 해제.
   *
   * 다른 카드를 선택하거나 같은 마디 재클릭으로 토글 해제할 때 사용.
   */
  setBackingSelectedBar: (
    template: ProgressionTemplate | null,
    barIndex: number | null,
  ) => void;

  // UI 액션
  /** 카탈로그 코드 표기 모드 전환. 'roman' ↔ 'absolute'. */
  setChordDisplayMode: (mode: ChordDisplayMode) => void;
}

/** 색 사이클 순서: none(undefined) → orange → green → blue → none. */
const COLOR_CYCLE: readonly (ImportantColor | undefined)[] = [
  undefined,
  'orange',
  'green',
  'blue',
] as const;

function nextHighlightColor(current: ImportantColor | undefined): ImportantColor | undefined {
  const idx = COLOR_CYCLE.indexOf(current);
  return COLOR_CYCLE[(idx + 1) % COLOR_CYCLE.length];
}

// ─── 기본값 ───────────────────────────────────────────────
const DEFAULT_METRONOME: MetronomeState = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  subdivision: 'quarter',
  accentBeatOne: true,
  soundType: 'click',
  // 초보가 시작하기 편한 볼륨. 유저는 Volume 슬라이더로 조정.
  volume: 0.5,
  isPlaying: false,
  tapTimestamps: [],
};

const DEFAULT_FRETBOARD: FretboardState = {
  root: 0,        // C
  scale: 'major',
  highlightsByScale: {},
  labelMode: 'name',
  handedness: 'right',
  frets: 22,
  fretSpacing: 'uniform',
  accidentalMode: 'auto',
};

const DEFAULT_UI: UiState = {
  theme: 'dark',
  chordDisplayMode: 'roman',
};

const DEFAULT_BACKING: BackingSliceState = {
  backingPlayingSlug: null,
  backingPlayingCategory: null,
  backingCurrentChord: null,
  bpmOverrides: {},
  // 메트로놈 볼륨(0.5)과 동일한 시작점. 사용자가 슬라이더로 조정 가능.
  volume: 0.5,
  backingSelectedSlug: null,
  backingSelectedBarIndex: null,
};

// BPM 클램프 유틸 — planning 1.3 M1 요건: 20~300
const clampBpm = (n: number): number => Math.round(Math.max(20, Math.min(300, n)));
const TAP_WINDOW_MS = 2000;  // 2초 공백 시 tap 초기화
const TAP_MAX = 4;           // 최근 4탭으로 평균

// ─── persist migrate 함수 ─────────────────────────────────
// module-level로 추출한 이유: persist config 안에서 참조하면서,
// 동시에 __migrate export로 단위테스트에서 직접 호출할 수 있도록 한다.
function migrate(persistedState: unknown, version: number): unknown {
  if (!persistedState || typeof persistedState !== 'object') return persistedState;
  const s = persistedState as Record<string, unknown>;
  const fb = (s.fretboard as Record<string, unknown>) ?? {};
  if (version < 2) {
    delete fb.importantDegreesByScale;
  }
  if (version < 3) {
    fb.highlightsByScale = {};
  }
  if (version < 4 && fb.accidentalMode === undefined) {
    fb.accidentalMode = 'auto';
  }
  s.fretboard = fb;
  if (version < 5) {
    const met = (s.metronome as Record<string, unknown>) ?? {};
    if (met.volume === 0.8) {
      met.volume = 0.5;
    }
    s.metronome = met;
  }
  // v5 → v6: backing 슬라이스 추가. 기존 유저 데이터에는 backing 키가
  // 없으므로 기본값 주입. 런타임 필드는 rehydrate 직후 엔진이 null로
  // 재설정하므로 여기서는 backingKey만 챙긴다.
  if (version < 6) {
    const backing = (s.backing as Record<string, unknown>) ?? {};
    if (typeof backing.backingKey !== 'number') {
      backing.backingKey = 0;
    }
    backing.backingPlayingSlug = null;
    backing.backingCurrentChord = null;
    s.backing = backing;
  }
  // v6 → v7: backing.bpmOverrides 추가. 카드별 BPM override를 영속화하기 위함.
  // null/배열처럼 잘못된 타입이 이미 있는 경우도 빈 객체로 교체한다.
  if (version < 7) {
    const backing = (s.backing as Record<string, unknown>) ?? {};
    const overrides = backing.bpmOverrides;
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      backing.bpmOverrides = {};
    }
    s.backing = backing;
  }
  // v7 → v8: ui.chordDisplayMode 추가. 잘못된 값(undefined/문자열 외)은 'roman'으로 정정.
  // 카탈로그 카드 코드 표기를 도수↔절대 토글하는 UI 상태이므로 persist 포함.
  if (version < 8) {
    const ui = (s.ui as Record<string, unknown>) ?? {};
    if (ui.chordDisplayMode !== 'absolute' && ui.chordDisplayMode !== 'roman') {
      ui.chordDisplayMode = 'roman';
    }
    s.ui = ui;
  }
  // v8 → v9: backing.backingKey 제거 → fretboard.root로 통합.
  //   사용자가 jam에서 G 키로 듣다가 마이그레이션하면 fretboard.root가 G로 옮겨와
  //   설정 영역(RootPicker)도 G를 보여주는 단일 소스 상태가 된다.
  //   잘못된 값(미정의·범위 밖)은 무시하고 fretboard 기본값(C=0)을 유지.
  if (version < 9) {
    const backing = (s.backing as Record<string, unknown>) ?? {};
    const fbCur = (s.fretboard as Record<string, unknown>) ?? {};
    const bk = backing.backingKey;
    if (typeof bk === 'number' && bk >= 0 && bk <= 11 && Number.isInteger(bk)) {
      // jam에서 듣던 키를 우선 보존 — RootPicker 기본값보다 사용자 의도에 가깝다
      fbCur.root = bk;
    }
    delete backing.backingKey;
    s.backing = backing;
    s.fretboard = fbCur;
  }
  // v9 → v10: backing.volume 추가. 잘못된 값/누락은 0.5(기본).
  if (version < 10) {
    const backing = (s.backing as Record<string, unknown>) ?? {};
    const v = backing.volume;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      backing.volume = 0.5;
    }
    s.backing = backing;
  }
  // v10 → v11: backing.backingPlayingCategory 추가. 런타임 필드라 기본 null.
  //   엔진은 start 시 _setBackingPlayingTemplate으로 채운다.
  if (version < 11) {
    const backing = (s.backing as Record<string, unknown>) ?? {};
    if (!('backingPlayingCategory' in backing)) {
      backing.backingPlayingCategory = null;
    }
    s.backing = backing;
  }
  return persistedState;
}

/**
 * Test helper — persist 미들웨어 외부에서 migrate 로직을 직접 검증할 때만 사용.
 * 프로덕션 코드에서 import 금지.
 */
export function __migrate(state: unknown, version: number): unknown {
  return migrate(state, version);
}

// ─── 스토어 생성 ──────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      metronome: DEFAULT_METRONOME,
      fretboard: DEFAULT_FRETBOARD,
      ui: DEFAULT_UI,
      backing: DEFAULT_BACKING,

      setBpm: (bpm) =>
        set((s) => {
          s.metronome.bpm = clampBpm(bpm);
        }),

      setTimeSignature: (ts) =>
        set((s) => {
          s.metronome.timeSignature = ts;
        }),

      setSubdivision: (sub) =>
        set((s) => {
          s.metronome.subdivision = sub;
        }),

      toggleAccentBeatOne: () =>
        set((s) => {
          s.metronome.accentBeatOne = !s.metronome.accentBeatOne;
        }),

      setSoundType: (st) =>
        set((s) => {
          s.metronome.soundType = st;
        }),

      setVolume: (v) =>
        set((s) => {
          s.metronome.volume = Math.max(0, Math.min(1, v));
        }),

      startMetronome: () =>
        set((s) => {
          s.metronome.isPlaying = true;
        }),

      stopMetronome: () =>
        set((s) => {
          s.metronome.isPlaying = false;
        }),

      tap: (now?: number) =>
        set((s) => {
          // 방어 로직: 호출부에서 MouseEvent 같은 비-숫자 인자를 잘못 넘길 수 있다
          // (예: <button onClick={tap}>는 MouseEvent를 now로 전달). 유한 숫자가
          // 아니면 현재 시각으로 폴백해 NaN 전파를 차단.
          const safeNow =
            typeof now === 'number' && Number.isFinite(now)
              ? now
              : typeof performance !== 'undefined'
                ? performance.now()
                : Date.now();
          const ts = s.metronome.tapTimestamps;
          const lastTap = ts[ts.length - 1];
          // 2초 이상 공백이면 탭 기록 리셋 (사용자가 다시 시작하는 것으로 간주)
          if (lastTap !== undefined && safeNow - lastTap > TAP_WINDOW_MS) {
            ts.length = 0;
          }
          ts.push(safeNow);
          // 최근 TAP_MAX + 1 (=5)개만 유지 → 4개 간격 계산 가능
          while (ts.length > TAP_MAX + 1) ts.shift();

          // 간격이 최소 2개 이상일 때 BPM 계산
          if (ts.length >= 2) {
            const intervals: number[] = [];
            for (let i = 1; i < ts.length; i++) {
              intervals.push(ts[i]! - ts[i - 1]!);
            }
            const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            s.metronome.bpm = clampBpm(60000 / avg);
          }
        }),

      setRoot: (root) =>
        set((s) => {
          s.fretboard.root = root;
        }),

      setScale: (scale) =>
        set((s) => {
          s.fretboard.scale = scale;
        }),

      setLabelMode: (mode) =>
        set((s) => {
          s.fretboard.labelMode = mode;
        }),

      setHandedness: (h) =>
        set((s) => {
          s.fretboard.handedness = h;
        }),

      setAccidentalMode: (mode) =>
        set((s) => {
          s.fretboard.accidentalMode = mode;
        }),

      cycleNoteHighlight: (scale, semitones) =>
        set((s) => {
          // Root는 항상 red 고정 — 토글 무시
          if (semitones === 0) return;

          // 최초 상태면 SCALE_HIGHLIGHTS 기본값을 복제해 시작점으로 사용.
          // 그래야 유저가 기본 강조 도수를 "다음 색으로 바꾸거나 끄는" UX를 얻는다.
          const existing = s.fretboard.highlightsByScale[scale];
          const base: Record<number, ImportantColor> = existing
            ? { ...existing }
            : { ...(SCALE_HIGHLIGHTS[scale] as Record<number, ImportantColor>) };

          const next = nextHighlightColor(base[semitones]);
          if (next === undefined) {
            delete base[semitones];
          } else {
            base[semitones] = next;
          }
          s.fretboard.highlightsByScale[scale] = base;
        }),

      resetHighlights: (scale) =>
        set((s) => {
          // override를 삭제하면 resolveScaleHighlights가 SCALE_HIGHLIGHTS
          // 기본값을 반환한다. 앞으로 기본값이 바뀌어도 리셋한 스케일은 항상 최신.
          delete s.fretboard.highlightsByScale[scale];
        }),

      _setBackingPlayingTemplate: (template) =>
        set((s) => {
          if (!template) {
            s.backing.backingPlayingSlug = null;
            s.backing.backingPlayingCategory = null;
            return;
          }
          s.backing.backingPlayingSlug = template.slug ?? null;
          const cat = template.category as string | undefined;
          // 알 수 없는 category는 pop fallback — presets.ts getPreset과 동일 패턴.
          s.backing.backingPlayingCategory =
            cat && cat in GENRE_RULES
              ? (cat as ProgressionCategory)
              : 'pop';
          // 재생 시작 → selection은 엔진이 인계받았으므로 clear
          s.backing.backingSelectedSlug = null;
          s.backing.backingSelectedBarIndex = null;
        }),

      _setBackingCurrentChord: (c) =>
        set((s) => {
          s.backing.backingCurrentChord = c;
        }),

      setBackingBpm: (slug, bpm) =>
        set((s) => {
          // slug에 BPM override를 기록. 엔진 setBpm 호출과 쌍으로 사용한다.
          s.backing.bpmOverrides[slug] = bpm;
        }),

      clearBackingBpm: (slug) =>
        set((s) => {
          // override를 삭제하면 다음 재생 시 template.default_bpm으로 복귀한다.
          delete s.backing.bpmOverrides[slug];
        }),

      setBackingVolume: (v) =>
        set((s) => {
          // 0~1 클램프. NaN/Infinity는 무시(기존 값 유지).
          if (!Number.isFinite(v)) return;
          s.backing.volume = Math.max(0, Math.min(1, v));
        }),

      setBackingSelectedBar: (template, barIndex) =>
        set((s) => {
          const isPlaying = s.backing.backingPlayingSlug !== null;

          if (!template || barIndex === null) {
            // 선택 해제
            s.backing.backingSelectedSlug = null;
            s.backing.backingSelectedBarIndex = null;
            if (!isPlaying) {
              // 정지 상태에서는 chord 컨텍스트도 우리가 set 했으므로 같이 해제
              s.backing.backingCurrentChord = null;
              s.backing.backingPlayingCategory = null;
            }
            return;
          }

          s.backing.backingSelectedSlug = template.slug ?? null;
          s.backing.backingSelectedBarIndex = barIndex;

          if (!isPlaying) {
            // 정지 상태 — chord 컨텍스트를 직접 채워 fretboard 하이라이팅 트리거
            const step = template.progression[barIndex];
            if (step) {
              s.backing.backingCurrentChord = {
                symbol: step.chord,
                barIndex,
              };
              const cat = template.category as string | undefined;
              s.backing.backingPlayingCategory =
                cat && cat in GENRE_RULES
                  ? (cat as ProgressionCategory)
                  : 'pop';
            }
          }
          // 재생 중이면 backingCurrentChord와 category는 엔진 책임 — 건드리지 않음
        }),

      setChordDisplayMode: (mode) =>
        set((s) => {
          // 카탈로그 칩/재생 라벨 모두 ui.chordDisplayMode를 구독하므로
          // 이 한 줄 변경이 전역적으로 표기를 전환한다.
          s.ui.chordDisplayMode = mode;
        }),
    })),
    {
      name: 'my-music-app:v1',
      storage: createJSONStorage(() => localStorage),
      version: 11,
      // v1 → v2: importantDegreesByScale → highlightsByScale 스키마 전환.
      // v2 → v3: SCALE_HIGHLIGHTS 기본값 I-IV-V 재조정. override 초기화.
      // v3 → v4: accidentalMode 필드 추가. 기존 데이터에 없으면 'auto'로.
      // v4 → v5: volume 기본값 0.8 → 0.5. 유저가 슬라이더로 바꾸지 않았던 경우
      //         (정확히 0.8인 경우)만 조정. 커스터마이징된 값은 보존.
      // v5 → v6: backing 슬라이스 추가.
      // v6 → v7: backing.bpmOverrides 추가. 카드별 BPM override 영속화.
      // v7 → v8: ui.chordDisplayMode 추가 (Sprint 2-6 카탈로그 표기 토글).
      // v8 → v9: backing.backingKey 제거 → fretboard.root로 통합 (Key 동기화).
      // v9 → v10: backing.volume 추가 — 배킹 마스터 볼륨.
      // v10 → v11: backing.backingPlayingCategory 추가 (Sprint 2-7 스마트 하이라이팅).
      migrate,
      // 런타임 전용 상태는 저장 제외
      partialize: (state) => ({
        metronome: {
          bpm: state.metronome.bpm,
          timeSignature: state.metronome.timeSignature,
          subdivision: state.metronome.subdivision,
          accentBeatOne: state.metronome.accentBeatOne,
          soundType: state.metronome.soundType,
          volume: state.metronome.volume,
          // isPlaying, tapTimestamps 제외
        },
        fretboard: state.fretboard,
        ui: state.ui,
        backing: {
          // bpmOverrides만 영속화 — 카드별 BPM 설정 유지.
          // backingKey는 v9에서 제거 (fretboard.root와 통합).
          bpmOverrides: state.backing.bpmOverrides,
          // v10: 마스터 볼륨도 영속화.
          volume: state.backing.volume,
        },
      }),
      // Zustand 기본 merge는 top-level shallow. metronome 같은 nested object가
      // partialize로 일부 필드만 저장되면 rehydrate 시 기본값의 나머지 필드가
      // 통째로 날아간다 (tapTimestamps: undefined → tap 액션 크래시).
      // nested deep-merge로 누락된 필드를 defaults로부터 복원.
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<AppState> | undefined;
        if (!p) return currentState;
        return {
          ...currentState,
          ...p,
          metronome: { ...currentState.metronome, ...(p.metronome ?? {}) },
          fretboard: { ...currentState.fretboard, ...(p.fretboard ?? {}) },
          ui: { ...currentState.ui, ...(p.ui ?? {}) },
          backing: { ...currentState.backing, ...(p.backing ?? {}) },
        };
      },
    },
  ),
);
