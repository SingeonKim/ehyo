import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  FretSpacing,
  Handedness,
  LabelMode,
  PitchClass,
  ScaleKey,
} from '@/lib/theory/types';
import { IMPORTANT_DEGREES } from '@/lib/theory/scales';

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
  /** 스케일별 강조 도수 사용자 토글 결과. 값이 없으면 IMPORTANT_DEGREES 기본값 사용. */
  importantDegreesByScale: Partial<Record<ScaleKey, number[]>>;
  labelMode: LabelMode;
  handedness: Handedness;
  frets: 22 | 24;
  fretSpacing: FretSpacing;
}

// ─── UI ────────────────────────────────────────────────────
export interface UiState {
  theme: 'dark' | 'light';
}

// ─── 루트 state + 액션 ────────────────────────────────────
export interface AppState {
  metronome: MetronomeState;
  fretboard: FretboardState;
  ui: UiState;

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
  toggleImportantDegree: (scale: ScaleKey, degree: number) => void;
}

// ─── 기본값 ───────────────────────────────────────────────
const DEFAULT_METRONOME: MetronomeState = {
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  subdivision: 'quarter',
  accentBeatOne: true,
  soundType: 'click',
  volume: 0.8,
  isPlaying: false,
  tapTimestamps: [],
};

const DEFAULT_FRETBOARD: FretboardState = {
  root: 0,        // C
  scale: 'major',
  importantDegreesByScale: {},
  labelMode: 'name',
  handedness: 'right',
  frets: 22,
  fretSpacing: 'uniform',
};

const DEFAULT_UI: UiState = {
  theme: 'dark',
};

// BPM 클램프 유틸 — planning 1.3 M1 요건: 20~300
const clampBpm = (n: number): number => Math.round(Math.max(20, Math.min(300, n)));
const TAP_WINDOW_MS = 2000;  // 2초 공백 시 tap 초기화
const TAP_MAX = 4;           // 최근 4탭으로 평균

// ─── 스토어 생성 ──────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      metronome: DEFAULT_METRONOME,
      fretboard: DEFAULT_FRETBOARD,
      ui: DEFAULT_UI,

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

      tap: (now = typeof performance !== 'undefined' ? performance.now() : Date.now()) =>
        set((s) => {
          const ts = s.metronome.tapTimestamps;
          const lastTap = ts[ts.length - 1];
          // 2초 이상 공백이면 탭 기록 리셋 (사용자가 다시 시작하는 것으로 간주)
          if (lastTap !== undefined && now - lastTap > TAP_WINDOW_MS) {
            ts.length = 0;
          }
          ts.push(now);
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

      toggleImportantDegree: (scale, degree) =>
        set((s) => {
          // 오버라이드가 없는 최초 상태에서는 기본값(IMPORTANT_DEGREES)을 시작점으로
          // 삼아야 UX가 자연스럽다. 예: Major의 기본 강조는 [0,5,7]. 유저가 5도를
          // 클릭하면 "기본에서 5도를 뺀 [0,7]"이 override로 저장되어야 한다. 이전에는
          // 빈 배열에서 시작해 5도를 추가하는 역동작이 돼 있었다.
          const existing = s.fretboard.importantDegreesByScale[scale];
          const current = existing ?? [...IMPORTANT_DEGREES[scale]];
          const idx = current.indexOf(degree);
          if (idx >= 0) {
            s.fretboard.importantDegreesByScale[scale] = current.filter((d) => d !== degree);
          } else {
            s.fretboard.importantDegreesByScale[scale] = [...current, degree].sort((a, b) => a - b);
          }
        }),
    })),
    {
      name: 'my-music-app:v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 버전 업그레이드 시 여기에 마이그레이션. v0 → v1 경로는 아직 없음.
      migrate: (persistedState, _version) => persistedState as AppState,
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
      }),
    },
  ),
);
