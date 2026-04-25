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
   *
   * startBarIndex (Sprint 2-7 후속 click-to-seek):
   *   유효한 [0, template.bars) 정수면 해당 마디부터 시작. 그 외(undefined / 음수 /
   *   범위 밖 / NaN)는 무시하고 0번 마디부터.
   */
  start(
    template: ProgressionTemplate,
    keyRoot: PitchClass,
    initialBpm?: number,
    startBarIndex?: number,
  ): Promise<void>;
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
  /**
   * 마스터 볼륨 설정. 0~1 범위. 유효하지 않은 값은 무시.
   * 재생 중이면 즉시 반영(부드러운 ramp 없이 setValueAtTime — 슬라이더 드래그 빈도가
   * 충분히 빨라 사용자 입장에서 자연스러움).
   */
  setVolume(v: number): void;
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
   * 마스터 게인 노드 — 모든 voice가 여기로 합류한 뒤 destination으로 출력.
   * setVolume이 이 gain.value만 조정하므로 voice별 fadeOut/start 사이클과 독립.
   * lazy 생성: 첫 ensureVoices 시 audio context와 함께 만들어진다.
   */
  let masterGain: GainNode | null = null;
  let currentVolume = 0.7; // store에서 setVolume 들어오기 전 기본값. UI 슬라이더와 동일 default.

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

  /** voice 객체를 lazy 생성. start/stop 사이클에서 재사용.
   *  마스터 게인을 먼저 만들고 모든 voice가 그것을 destination으로 사용한다. */
  const ensureVoices = () => {
    if (!masterGain) {
      const ctx = getAudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = currentVolume;
      masterGain.connect(ctx.destination);
    }
    if (!drums) drums = createDrumVoice(masterGain);
    if (!bass) bass = createBassVoice(masterGain);
    if (!guitar) guitar = createGuitarVoice(masterGain);
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

  const start: BackingEngine['start'] = async (template, keyRoot, initialBpm, startBarIndex) => {
    // 다른 카드 ▶ 눌러도 이전 세션 자동 teardown
    hardStop();
    setState({ status: 'loading', template });

    // startBarIndex 검증 — 음수·범위 밖·NaN·정수 아님 모두 0으로 fallback.
    // 유효해도 progression이 비어있을 수 없다는 전제(template.bars >= 1)는 백엔드 시드에서 보장.
    const startOffset =
      typeof startBarIndex === 'number' &&
      Number.isInteger(startBarIndex) &&
      startBarIndex >= 0 &&
      startBarIndex < template.bars
        ? startBarIndex
        : 0;

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
      // click-to-seek: barIndexAbs는 0부터 증가하지만 startOffset만큼 이동시켜
      // 사용자가 클릭한 마디부터 진행이 시작되도록 한다.
      const idx = (barIndexAbs + startOffset) % tpl.bars;
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

        // bass: 루트 2옥타브 다운, 1박·3박 2회 queueWaveTable
        // -12는 C3 부근(midrange) — 일반 베이스 기타 컴핑 음역(E1~G3)보다 높아 가벼움.
        // -24로 C2 부근까지 내려야 어쿠스틱 업라이트/일렉 베이스 저역과 맞는다.
        const bassMidi = midi[0]! - 24;
        for (const s of BACKBEAT_BASS.steps) voices.bass.trigger(bassMidi, preset.bass, beatSec, t(s.time), s.velocity);

        // guitar: EIGHTH_STRUM 6스텝 — down/up 방향으로 queueStrumDown/queueStrumUp
        // 코드 톤을 1옥타브 다운 — chordSymbolToMidi 기본 옥타브(C4=60) 기준은 실제
        // 기타 컴핑 음역대(E2~E5)보다 높아 "쇠 같은" 가벼운 소리. 한 옥타브 내려
        // C3 부근으로 옮기면 실제 어쿠스틱/일렉기타 컴핑 음역과 맞는다.
        const guitarMidi = midi.map((n) => n - 12);
        for (const s of EIGHTH_STRUM)
          voices.guitar.strum(s.direction, guitarMidi, preset.guitar, strumDurSec, t(s.time), s.velocity);
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

    // 초기 playing 상태 즉시 설정 (첫 onBar 콜백 전에 UI가 playing 상태를 표시).
    // startOffset이 있으면 해당 마디 코드를 첫 표시로 사용 — UI 깜빡임 방지.
    setState({
      status: 'playing',
      template,
      keyRoot,
      barIndex: startOffset,
      chordSymbol: template.progression[startOffset]?.chord ?? '',
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

  const setVolume: BackingEngine['setVolume'] = (v) => {
    if (!Number.isFinite(v)) {
      console.warn('[backing] invalid volume ignored:', v);
      return;
    }
    const clamped = Math.max(0, Math.min(1, v));
    currentVolume = clamped;
    if (masterGain) {
      const ctx = getAudioContext();
      masterGain.gain.setValueAtTime(clamped, ctx.currentTime);
    }
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
    if (masterGain) {
      masterGain.disconnect();
      masterGain = null;
    }
    listeners.clear();
    state = { status: 'idle' };
  };

  return {
    getState: () => state,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    start, setKey, setBpm, resetBpmToDefault, setVolume, stop, dispose,
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
        store._setBackingPlayingTemplate(s.template);
        store._setBackingCurrentChord({
          symbol: s.chordSymbol,
          barIndex: s.barIndex,
        });
      } else {
        store._setBackingPlayingTemplate(null);
        store._setBackingCurrentChord(null);
      }
    });

    // store → engine: Key 변경 + BPM override + volume 변화 전파.
    // Sprint 2-6 후속(v9): backing key가 fretboard.root로 통합됐으므로 root를 구독.
    // 사용자가 RootPicker/KeySelector 어디서든 키를 바꿔도 같은 fretboard.root를
    // 갱신하므로 한 번의 subscribe로 두 컨트롤이 모두 잡힌다.
    //
    // 초기 hydration 직후 store.backing.volume이 default(0.5) 또는 영속값으로
    // 들어와 있으나, masterGain은 아직 lazy-create 안 된 상태일 수 있다.
    // engine.setVolume은 masterGain이 없으면 currentVolume에 캐시만 해두고,
    // ensureVoices가 master를 만들 때 그 값으로 초기화하므로 안전.
    engine.setVolume(useAppStore.getState().backing.volume);

    useAppStore.subscribe((s, prev) => {
      if (s.fretboard.root !== prev.fretboard.root) {
        engine.setKey(s.fretboard.root);
      }
      if (s.backing.volume !== prev.backing.volume) {
        engine.setVolume(s.backing.volume);
      }
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
