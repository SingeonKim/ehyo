/**
 * 멀티트랙 배킹 엔진 (Sprint 2-3).
 *
 * 역할:
 *   ProgressionTemplate + keyRoot를 받아 Tone.Transport에 마디(`'1m'`) 단위 콜백을
 *   등록한다. 매 콜백에서 BACKBEAT_PATTERN을 따라 drums/bass/keys voice를 트리거.
 *   barIndex가 template.bars를 넘으면 0으로 wrap — 무한 루프.
 *
 * 단일 재생 원칙:
 *   start() 호출 시 내부에서 먼저 hardStop. 다른 카드 ▶ 눌러도 이전 세션 자동 teardown.
 *
 * AudioContext 수명:
 *   stop()이 컨텍스트를 suspend하지 않는다 — 메트로놈과 공유 중일 수 있음.
 *
 * voice 수명:
 *   start/stop 사이클에서 voice 객체는 재사용. 각 stop()은 envelope만 강제 종료.
 *   엔진 dispose()에서만 voice.dispose() 호출.
 */

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { chordSymbolToMidi } from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

import { resumeAudioContext } from '../context';
import { bindToneToSharedContext, getTone } from '../tone-bridge';
// TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont
// import { BACKBEAT_PATTERN } from './patterns/backbeat';
// import type { BeatStep } from './patterns/types';
import { createBassVoice, type BassVoice } from './voices/bass';
import { createDrumVoice, type DrumVoice } from './voices/drums';
// TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont — keys replaced by guitar
// import { createKeysVoice, type KeysVoice } from './voices/keys';

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
  /**
   * 재생 중 Key를 교체. 현재 바의 소리는 유지, 다음 바부터 새 Key로 전조.
   * 재생 중이 아니면 no-op.
   */
  setKey(keyRoot: PitchClass): void;
  stop(): void;
  dispose(): void;
}

function createEngine(): BackingEngine {
  let state: BackingState = { status: 'idle' };
  const listeners = new Set<(s: BackingState) => void>();

  let drums: DrumVoice | null = null;
  let bass: BassVoice | null = null;
  // TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont — keys replaced by guitar
  // let keys: KeysVoice | null = null;

  let scheduleId: number | null = null;
  let barIndex = 0;
  // 재생 중 Key 교체를 위해 mutable ref 유지. 클로저 캡처 대신 이 ref를 읽는다.
  let currentKeyRoot: PitchClass = 0;
  let currentTemplate: ProgressionTemplate | null = null;

  const setState = (next: BackingState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  const ensureVoices = () => {
    if (!drums) drums = createDrumVoice();
    if (!bass) bass = createBassVoice();
    // TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont — guitar voice 추가
    // if (!keys) keys = createKeysVoice();
    return { drums, bass };
  };

  const stopVoices = () => {
    // TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont — fadeOut으로 교체
    // drums?.stop();
    // bass?.stop();
    // keys?.stop();
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
      // Transport 미초기화·중복 stop 등 드문 케이스. silent swallow는 재생 실패
      // 원인 추적을 막으므로 단서는 남긴다.
      console.warn('[backing] Transport stop/cancel raised:', e);
    }
    stopVoices();
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

    const voices = ensureVoices();
    barIndex = 0;
    currentKeyRoot = keyRoot;
    currentTemplate = template;

    // TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont
    // 아래 콜백은 BACKBEAT_PATTERN·keys·BeatStep 참조가 있어 임시 stub.
    // Task 7에서 WebAudioFont preset 기반으로 전체 재작성.
    const callback = (_time: number) => {
      const tpl = currentTemplate;
      if (!tpl) return;
      const idx = barIndex % tpl.bars;
      const step = tpl.progression[idx];
      if (!step) {
        barIndex += 1;
        return;
      }

      const symbol = step.chord;
      const midi = chordSymbolToMidi(symbol, currentKeyRoot);
      if (!midi) {
        console.warn(
          `[backing] unparseable chord symbol "${symbol}" at bar ${idx}; skipping`,
        );
        setState({
          status: 'playing',
          template: tpl,
          keyRoot: currentKeyRoot,
          barIndex: idx,
          chordSymbol: symbol,
        });
        barIndex += 1;
        return;
      }

      // TODO(sprint-2-4-task-7): WebAudioFont voice trigger 로직으로 교체
      // 현재는 상태 갱신만 수행 (드럼/베이스/기타 트리거 없음)
      void voices; // 미사용 변수 경고 억제
      setState({
        status: 'playing',
        template: tpl,
        keyRoot: currentKeyRoot,
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

  const setKey: BackingEngine['setKey'] = (keyRoot) => {
    currentKeyRoot = keyRoot;
    if (state.status === 'playing') {
      setState({ ...state, keyRoot });
    }
  };

  const stop: BackingEngine['stop'] = () => {
    hardStop();
    setState({ status: 'idle' });
  };

  const dispose: BackingEngine['dispose'] = () => {
    hardStop();
    drums?.dispose();
    bass?.dispose();
    // TODO(sprint-2-4-task-7): rewrite engine for WebAudioFont — guitar.dispose() 추가
    // keys?.dispose();
    drums = null;
    bass = null;
    // keys = null;
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
    setKey,
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

// ──────────────────────────────────────────────
// Store 브릿지 — 엔진 상태를 Zustand로 전파.
// 컴포넌트는 store만 구독, 엔진은 직접 건드리지 않는 원칙.
// ──────────────────────────────────────────────

let _bridgeWired = false;

/** 테스트에서 브릿지를 재장착할 때만 사용. */
export function __resetStoreBridgeForTests(): void {
  _bridgeWired = false;
}

if (typeof window !== 'undefined') {
  // SSR 시 실행되지 않도록 가드. 클라이언트에서 모듈 최초 로드 시 1회 wiring.
  void import('@/lib/store/app-store').then(({ useAppStore }) => {
    if (_bridgeWired) return;
    _bridgeWired = true;
    const engine = getBackingEngine();

    // engine → store: 재생 상태·현재 코드 전파
    engine.subscribe((s) => {
      const store = useAppStore.getState();
      if (s.status === 'playing') {
        store._setBackingPlaying(s.template.slug);
        store._setBackingCurrentChord({
          symbol: s.chordSymbol,
          barIndex: s.barIndex,
        });
      } else {
        store._setBackingPlaying(null);
        store._setBackingCurrentChord(null);
      }
    });

    // store → engine: Key 변경을 런타임 전조로 전파.
    useAppStore.subscribe((s, prev) => {
      if (s.backing.backingKey !== prev.backing.backingKey) {
        engine.setKey(s.backing.backingKey);
      }
    });
  });
}
