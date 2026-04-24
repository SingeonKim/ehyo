/**
 * 배킹 트랙 재생 엔진 (Sprint 2-2 PoC).
 *
 * 역할:
 *   ProgressionTemplate + keyRoot를 받아 Tone.Transport에 마디(1m) 단위 콜백을
 *   등록, 매 tick마다 현재 코드를 Tone.PolySynth로 블록 코드 재생. barIndex가
 *   template.bars를 넘으면 0으로 wrap — 무한 루프.
 *
 * 단일 재생 원칙:
 *   start() 호출 시 내부에서 먼저 stop() 수행. 다른 카드 ▶ 눌러도 이전 세션
 *   자동 teardown.
 *
 * AudioContext 수명:
 *   stop()이 컨텍스트를 suspend하지 않는다 — 메트로놈과 공유 중일 수 있음.
 *
 * 테스트:
 *   tone-bridge 전체를 vi.mock으로 교체 → Transport/PolySynth가 spy 객체로
 *   대체됨. 실제 오디오 출력은 수동 검증 (docs 참조).
 */

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { chordSymbolToMidi, midiToFrequency } from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

import { resumeAudioContext } from './context';
import { bindToneToSharedContext, getTone } from './tone-bridge';

export type BackingState =
  | { status: 'idle' }
  | { status: 'loading'; template: ProgressionTemplate }
  | {
      status: 'playing';
      template: ProgressionTemplate;
      keyRoot: PitchClass;
      barIndex: number;
      chordSymbol: string;
    }
  | { status: 'error'; message: string };

export interface BackingEngine {
  getState(): BackingState;
  subscribe(listener: (s: BackingState) => void): () => void;
  start(template: ProgressionTemplate, keyRoot: PitchClass): Promise<void>;
  stop(): void;
  dispose(): void;
}

type PolySynthLike = {
  toDestination(): PolySynthLike;
  triggerAttackRelease(
    notes: number[],
    duration: string,
    time?: number,
  ): void;
  releaseAll(): void;
  dispose(): void;
};

function createEngine(): BackingEngine {
  let state: BackingState = { status: 'idle' };
  const listeners = new Set<(s: BackingState) => void>();

  let polySynth: PolySynthLike | null = null;
  let scheduleId: number | null = null;
  let barIndex = 0;

  const setState = (next: BackingState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  const ensurePolySynth = (): PolySynthLike => {
    if (polySynth) return polySynth;
    const Tone = getTone();
    const instance = new Tone.PolySynth().toDestination() as unknown as PolySynthLike;
    polySynth = instance;
    return instance;
  };

  const clearSchedule = () => {
    const Tone = getTone();
    if (scheduleId !== null) {
      Tone.Transport.clear(scheduleId);
      scheduleId = null;
    }
  };

  const hardStop = () => {
    const Tone = getTone();
    clearSchedule();
    try {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    } catch (e) {
      // Transport 미초기화·중복 stop 등 드문 케이스. releaseAll은 계속 진행하되,
      // silent swallow는 재생 실패 원인 추적을 막으므로 단서는 남긴다.
      console.warn('[backing-track] Transport stop/cancel raised:', e);
    }
    if (polySynth) polySynth.releaseAll();
    barIndex = 0;
  };

  const start: BackingEngine['start'] = async (template, keyRoot) => {
    hardStop();

    setState({ status: 'loading', template });

    const ctx = await resumeAudioContext();
    if (!ctx) {
      setState({
        status: 'error',
        message: 'AudioContext resume failed — user gesture required',
      });
      return;
    }

    bindToneToSharedContext();

    const Tone = getTone();
    Tone.Transport.bpm.value = template.default_bpm;
    Tone.Transport.timeSignature = [4, 4];

    const synth = ensurePolySynth();
    barIndex = 0;

    const callback = (time: number) => {
      const idx = barIndex % template.bars;
      const step = template.progression[idx];
      if (!step) {
        barIndex += 1;
        return;
      }
      const symbol = step.chord;
      const midi = chordSymbolToMidi(symbol, keyRoot);
      if (midi) {
        synth.triggerAttackRelease(
          midi.map(midiToFrequency),
          '1m',
          time,
        );
      } else {
        console.warn(
          `[backing-track] unparseable chord symbol "${symbol}" at bar ${idx}; skipping`,
        );
      }
      setState({
        status: 'playing',
        template,
        keyRoot,
        barIndex: idx,
        chordSymbol: symbol,
      });
      barIndex += 1;
    };

    scheduleId = Tone.Transport.scheduleRepeat(callback, '1m');
    Tone.Transport.start();

    setState({
      status: 'playing',
      template,
      keyRoot,
      barIndex: 0,
      chordSymbol: template.progression[0]?.chord ?? '',
    });
  };

  const stop: BackingEngine['stop'] = () => {
    hardStop();
    setState({ status: 'idle' });
  };

  const dispose: BackingEngine['dispose'] = () => {
    hardStop();
    if (polySynth) {
      polySynth.dispose();
      polySynth = null;
    }
    listeners.clear();
    state = { status: 'idle' };
  };

  return {
    getState: () => state,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    start,
    stop,
    dispose,
  };
}

let _engine: BackingEngine | null = null;

export function getBackingEngine(): BackingEngine {
  if (!_engine) _engine = createEngine();
  return _engine;
}

/** 테스트·HMR 전용. 운영 경로에서 호출하지 않는다. */
export function __disposeBackingEngineForTests(): void {
  if (_engine) {
    _engine.dispose();
    _engine = null;
  }
}
