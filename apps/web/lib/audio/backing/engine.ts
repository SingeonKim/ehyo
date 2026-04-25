/**
 * 멀티트랙 backing 엔진 — Sprint 2-4 재작성 (WebAudioFont).
 *
 * 핵심 변화:
 *   - Tone.Transport → BarScheduler (Chris Wilson lookahead 위)
 *   - 합성 voice → WebAudioFont 샘플 voice (drums/bass/guitar)
 *   - 카테고리별 InstrumentPreset (lazy 로드, 캐시)
 *   - BPM 런타임 변경 (setBpm/resetBpmToDefault)
 *
 * 4.2박 회귀 차단:
 *   onBar 콜백 안 setState를 setTimeout(delay)으로 분리. 오디오 예약 블록은 동기,
 *   상태 갱신은 eventTime까지 대기 후 실행. queueMicrotask는 현재 JS 턴에서
 *   즉시 실행되므로 scheduleAheadTime(100–150ms) 동안 UI가 오디오보다 앞서
 *   렌더되는 문제를 막지 못한다 — setTimeout으로 eventTime 동기화.
 *
 * BPM 스냅샷:
 *   onBar 진입 직후 const bpm = currentBpm으로 로컬 캡처. 마디 도중 setBpm이
 *   들어와도 현재 마디는 일관된 BPM으로 trigger.
 *
 * 단일 재생 원칙:
 *   start() 내부에서 먼저 hardStop. 다른 카드 ▶ 눌러도 자동 teardown.
 *
 * AudioContext 수명:
 *   stop()이 컨텍스트를 suspend하지 않는다 — 메트로놈과 공유.
 *
 * Voice 수명:
 *   start/stop 사이클에서 voice 객체 재사용. fadeOut만 호출(ramp 0).
 *   엔진 dispose() 시에만 voice.dispose().
 *
 * initialBpm (Bug 1 수정):
 *   start()의 optional 3번째 인자. 정지 상태에서 BPM 슬라이더 조정 후 ▶ 누를 때
 *   store의 bpmOverrides를 호출자(ProgressionPlayButton)가 읽어 전달한다.
 *   엔진은 store를 직접 import하지 않는 bridge 패턴 유지.
 */

import type { ProgressionTemplate } from '@/lib/api/progression-templates';
import { chordSymbolToMidi } from '@/lib/theory/chord-voicing';
import type { PitchClass } from '@/lib/theory/types';

import { getAudioContext, resumeAudioContext } from '../context';
import { createBarScheduler, type BarScheduler } from '../scheduler/bar-scheduler';
import { createLookaheadScheduler } from '../scheduler/lookahead-scheduler';
import { BACKBEAT_BASS, BACKBEAT_DRUMS } from './patterns/backbeat';
import { EIGHTH_STRUM } from './patterns/strumming';
import { parseBeatStep } from './patterns/types';
import { getPreset } from './presets';
import { createBassVoice, type BassVoice } from './voices/bass';
import { createDrumVoice, type DrumVoice } from './voices/drums';
import { createGuitarVoice, type GuitarVoice } from './voices/guitar';
import { getPlayer, loadPreset, type LoadedPreset } from './webaudiofont-bridge';

export type BackingState =
  | { status: 'idle' }
  | { status: 'loading'; template: ProgressionTemplate }
  | {
      status: 'playing';
      template: ProgressionTemplate;
      keyRoot: PitchClass;
      barIndex: number;
      chordSymbol: string;
      currentBpm: number;
    }
  | { status: 'error'; message: string };

export interface BackingEngine {
  getState(): BackingState;
  subscribe(listener: (s: BackingState) => void): () => void;
  /**
   * 재생 시작. initialBpm이 유효한 양수면 그 값으로 시작, 아니면 template.default_bpm.
   * 호출자가 store의 bpmOverrides[slug]를 읽어 전달하는 bridge 패턴으로
   * 엔진 자체는 store를 import하지 않는다.
   */
  start(template: ProgressionTemplate, keyRoot: PitchClass, initialBpm?: number): Promise<void>;
  /**
   * 재생 중 Key를 교체. 현재 바의 소리는 유지, 다음 바부터 새 Key로 전조.
   * 재생 중이 아니면 currentKeyRoot만 갱신.
   */
  setKey(keyRoot: PitchClass): void;
  /**
   * 런타임 BPM 변경. 유효하지 않은 값(NaN, 0, 음수)은 경고 후 무시.
   * BarScheduler.setBpm을 호출해 다음 tick 이후부터 새 BPM 간격 적용.
   */
  setBpm(bpm: number): void;
  /**
   * 현재 template의 default_bpm으로 복귀.
   */
  resetBpmToDefault(): void;
  stop(): void;
  dispose(): void;
}

function createEngine(): BackingEngine {
  let state: BackingState = { status: 'idle' };
  const listeners = new Set<(s: BackingState) => void>();

  const setState = (next: BackingState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  let drums: DrumVoice | null = null;
  let bass: BassVoice | null = null;
  let guitar: GuitarVoice | null = null;
  let scheduler: BarScheduler | null = null;

  /**
   * eventTime까지 setState를 지연하는 setTimeout ID 집합.
   * hardStop에서 일괄 cancel → stop 후에도 playing 상태가 뒤늦게 dispatch되는 것을 막음.
   */
  const pendingStateUpdates = new Set<ReturnType<typeof setTimeout>>();

  let currentTemplate: ProgressionTemplate | null = null;
  let currentKeyRoot: PitchClass = 0;
  let currentBpm = 90;
  let currentDefaultBpm = 90;
  let currentLoadedPreset: LoadedPreset | null = null;

  /** voice 객체를 lazy 생성. start/stop 사이클에서 재사용. */
  const ensureVoices = () => {
    if (!drums) drums = createDrumVoice();
    if (!bass) bass = createBassVoice();
    if (!guitar) guitar = createGuitarVoice();
    return { drums, bass, guitar };
  };

  /** 재생 중인 voice의 gain을 10ms ramp로 끊음. WebAudioFont cancelQueue가
   *  이미 attack된 노트를 release하지 못하는 한계를 보완. */
  const fadeOutVoices = () => {
    drums?.fadeOut();
    bass?.fadeOut();
    guitar?.fadeOut();
  };

  /** 스케줄러를 멈추고 WebAudioFont 큐도 취소. voice는 fadeOut만. */
  const hardStop = () => {
    scheduler?.stop();
    scheduler = null;
    // pending setState timer를 모두 취소 — stop 후 playing 상태가 뒤늦게 dispatch되는 것을 막음
    for (const id of pendingStateUpdates) clearTimeout(id);
    pendingStateUpdates.clear();
    try {
      const player = getPlayer();
      const ctx = getAudioContext();
      player.cancelQueue(ctx);
    } catch (e) {
      // player 미초기화·미로드 등 — silent swallow는 회귀 추적을 막으니 단서만 남김.
      console.warn('[backing] cancelQueue raised:', e);
    }
    fadeOutVoices();
  };

  const start: BackingEngine['start'] = async (template, keyRoot, initialBpm) => {
    // 다른 카드 ▶ 눌러도 이전 세션 자동 teardown
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

    const preset = getPreset(template.category ?? 'pop');
    let loaded: LoadedPreset;
    try {
      loaded = await loadPreset(preset);
    } catch (e) {
      setState({
        status: 'error',
        message: `Failed to load instruments: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }

    currentLoadedPreset = loaded;
    currentTemplate = template;
    currentKeyRoot = keyRoot;
    currentDefaultBpm = template.default_bpm;
    // Bug 1: initialBpm이 유효한 양수면 그 값으로 시작. 없거나 무효면 default_bpm.
    // 호출자(ProgressionPlayButton)가 store의 bpmOverrides[slug]를 읽어 전달한다.
    currentBpm =
      typeof initialBpm === 'number' && Number.isFinite(initialBpm) && initialBpm > 0
        ? initialBpm
        : template.default_bpm;

    const voices = ensureVoices();
    const lookahead = createLookaheadScheduler({ audioContext: ctx });
    scheduler = createBarScheduler({ lookahead });

    scheduler.start(currentBpm, 4, (eventTime, barIndexAbs) => {
      const tpl = currentTemplate;
      if (!tpl || !currentLoadedPreset) return;

      // ── 1. 오디오 예약 블록 (동기) ──────────────────────────────────────────
      // 4.2박 회귀 차단: 이 블록 안에서는 setState 절대 금지.
      // setState는 아래 setTimeout에서 eventTime 기준 지연 후 실행.
      const idx = barIndexAbs % tpl.bars;
      const step = tpl.progression[idx];
      if (!step) return;

      const symbol = step.chord;
      // BPM 스냅샷: 마디 도중 setBpm이 들어와도 현재 마디는 일관된 BPM으로 trigger
      const bpm = currentBpm;
      const beatSec = 60 / bpm;
      const strumDurSec = Math.min(0.4, beatSec * 0.4);

      // chordSymbolToMidi: @/lib/theory/chord-voicing — 파싱 실패 시 null 반환
      const midi = chordSymbolToMidi(symbol, currentKeyRoot);

      if (midi) {
        const preset = currentLoadedPreset;
        // parseBeatStep 결과는 마디 시작으로부터의 상대 시각(초) → eventTime에 더해 절대 시각
        const t = (notation: string) => eventTime + parseBeatStep(notation, bpm);

        // drums: kick 2회(1박·3박) + snare 2회(2박·4박) + hat 8회 = 12회 queueWaveTable
        for (const s of BACKBEAT_DRUMS.kick)  voices.drums.trigger('kick',  preset.drums, t(s.time), s.velocity);
        for (const s of BACKBEAT_DRUMS.snare) voices.drums.trigger('snare', preset.drums, t(s.time), s.velocity);
        for (const s of BACKBEAT_DRUMS.hat)   voices.drums.trigger('hat',   preset.drums, t(s.time), s.velocity);

        // bass: 루트 1옥타브 다운, 1박·3박 2회 queueWaveTable
        const bassMidi = midi[0]! - 12;
        for (const s of BACKBEAT_BASS.steps) voices.bass.trigger(bassMidi, preset.bass, beatSec, t(s.time), s.velocity);

        // guitar: EIGHTH_STRUM 6스텝 — down/up 방향으로 queueStrumDown/queueStrumUp
        for (const s of EIGHTH_STRUM)
          voices.guitar.strum(s.direction, midi, preset.guitar, strumDurSec, t(s.time), s.velocity);
      }

      // ── 2. 상태 갱신 — eventTime까지 대기 후 setState. UI/audio 위상 일치. ──
      // queueMicrotask는 JS 턴 내에서 즉시 실행되므로 scheduleAheadTime(100–150ms) 동안
      // UI가 오디오보다 앞서 렌더되는 문제가 있다. setTimeout으로 eventTime 기준 동기화.
      const delayMs = Math.max(0, (eventTime - ctx.currentTime) * 1000);
      const id = setTimeout(() => {
        pendingStateUpdates.delete(id);
        if (!midi) console.warn(`[backing] unparseable "${symbol}" at bar ${idx}; skipping`);
        setState({
          status: 'playing',
          template: tpl,
          keyRoot: currentKeyRoot,
          barIndex: idx,
          chordSymbol: symbol,
          currentBpm: bpm,
        });
      }, delayMs);
      pendingStateUpdates.add(id);
    });

    // 초기 playing 상태 즉시 설정 (첫 onBar 콜백 전에 UI가 playing 상태를 표시)
    setState({
      status: 'playing',
      template,
      keyRoot,
      barIndex: 0,
      chordSymbol: template.progression[0]?.chord ?? '',
      currentBpm: currentBpm,
    });
  };

  const setKey: BackingEngine['setKey'] = (keyRoot) => {
    currentKeyRoot = keyRoot;
    if (state.status === 'playing') setState({ ...state, keyRoot });
  };

  const setBpm: BackingEngine['setBpm'] = (bpm) => {
    if (!Number.isFinite(bpm) || bpm <= 0) {
      console.warn('[backing] invalid BPM ignored:', bpm);
      return;
    }
    currentBpm = bpm;
    scheduler?.setBpm(bpm);
    if (state.status === 'playing') setState({ ...state, currentBpm: bpm });
  };

  const resetBpmToDefault: BackingEngine['resetBpmToDefault'] = () => {
    setBpm(currentDefaultBpm);
  };

  const stop: BackingEngine['stop'] = () => {
    hardStop();
    setState({ status: 'idle' });
  };

  const dispose: BackingEngine['dispose'] = () => {
    hardStop();
    drums?.dispose(); drums = null;
    bass?.dispose(); bass = null;
    guitar?.dispose(); guitar = null;
    listeners.clear();
    state = { status: 'idle' };
  };

  return {
    getState: () => state,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    start, setKey, setBpm, resetBpmToDefault, stop, dispose,
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

    // store → engine: Key 변경 + BPM override 변화 전파
    useAppStore.subscribe((s, prev) => {
      if (s.backing.backingKey !== prev.backing.backingKey) {
        engine.setKey(s.backing.backingKey);
      }
      // BPM override 변화 감지 — Task 9에서 bpmOverrides 추가 시 활성.
      // 현재는 store에 bpmOverrides 없음 → 이 selector는 항상 undefined === undefined.
      const slug = s.backing.backingPlayingSlug;
      if (!slug) return;
      const newBpm = (s.backing as { bpmOverrides?: Record<string, number> }).bpmOverrides?.[slug];
      const oldBpm = (prev.backing as { bpmOverrides?: Record<string, number> }).bpmOverrides?.[slug];
      if (newBpm !== oldBpm) {
        if (newBpm !== undefined) engine.setBpm(newBpm);
        else engine.resetBpmToDefault();
      }
    });
  });
}
