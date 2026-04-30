/**
 * 멀티트랙 backing 엔진 — Sprint 2-8 PR-A에서 WebAudioFont → smplr으로 atomic migration.
 *
 * 핵심 변화 (Sprint 2-8 PR-A):
 *   - loadPreset / getPlayer → loadBundle (smplr-bridge)
 *   - voice trigger 시그니처: LoadedPreset/LoadedDrumKit → Soundfont/DrumMachine
 *   - hardStop에서 getPlayer().cancelQueue(ctx) 제거 — smplr은 queue 개념 없음
 *   - aux voice 추가 (funk/bossa 패턴이 PR-C에서 사용 시작)
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
import { createMasterFxChain, type MasterFxChain } from './fx-chain';
import { createBarScheduler, type BarScheduler } from '../scheduler/bar-scheduler';
import { createLookaheadScheduler } from '../scheduler/lookahead-scheduler';
import { CATEGORY_RHYTHMS } from './patterns/library';
import { parseBeatStep } from './patterns/types';
import { resolveCardProfile } from './profile-merge';
import { resolveSwing } from './swing';
import { loadBundle, type LoadedBundle } from './smplr-bridge';
import { createAuxVoice, type AuxVoice } from './voices/aux';
import { createBassVoice, type BassVoice } from './voices/bass';
import { createDrumVoice, type DrumVoice } from './voices/drums';
import { createGuitarVoice, type GuitarVoice } from './voices/guitar';

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
  let aux: AuxVoice | null = null;
  let scheduler: BarScheduler | null = null;

  /**
   * 마스터 게인 노드 — fxChain 출력(dry + reverb tail) 이후 final stage.
   * 토폴로지: voices → fxChain.input → compressor → dry/wet → masterGain → destination.
   * setVolume이 이 gain.value만 조정. dry+wet 양쪽 모두 영향 받아 진정한 master volume.
   * lazy 생성: 첫 ensureVoices 시 audio context와 함께 만들어진다.
   */
  let masterGain: GainNode | null = null;
  let fxChain: MasterFxChain | null = null;
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
  let currentLoadedBundle: LoadedBundle | null = null;

  /** voice 객체를 lazy 생성. start/stop 사이클에서 재사용.
   *  토폴로지: voices → fxChain.input → compressor → dry/wet → masterGain → destination.
   *  masterGain이 fxChain *이후* 단계에 위치해 dry + reverb tail 둘 다 master volume의 영향 받음.
   *  reverb AudioWorklet 준비 대기 때문에 async. */
  const ensureVoices = async () => {
    if (!masterGain) {
      const ctx = getAudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = currentVolume;
      masterGain.connect(ctx.destination);
      // fxChain 생성 시 outputDestination으로 masterGain 전달 — dry/reverb 둘 다 master 통과.
      if (!fxChain) {
        fxChain = await createMasterFxChain(ctx, masterGain);
      }
    }
    // voice들은 fxChain.input으로 합류 (compressor → dry/wet → masterGain → destination).
    if (!drums) drums = createDrumVoice(fxChain!.input);
    if (!bass) bass = createBassVoice(fxChain!.input);
    if (!guitar) guitar = createGuitarVoice(fxChain!.input);
    if (!aux) aux = createAuxVoice(fxChain!.input);
    return { drums, bass, guitar, aux };
  };

  /** 재생 중인 voice의 gain을 10ms ramp로 끊음. */
  const fadeOutVoices = () => {
    drums?.fadeOut();
    bass?.fadeOut();
    guitar?.fadeOut();
    aux?.fadeOut();
  };

  /** 스케줄러를 멈추고 진행 중인 모든 음을 즉시 정지.
   *
   *  smplr Smplr.stop()은 *재생 중인 voice만* 정지하고 *내부 스케줄러 큐의 미예약
   *  이벤트는 비우지 않는다* (dist/index.js:1041-1052). 따라서 ⏸ 누른 시점에 이미
   *  start({time: future})로 예약된 노트 한 마디 분량이 그대로 발화 → "한 마디 잔향
   *  + 다른 카드 전환 시 이중 재생" 버그의 원인.
   *
   *  올바른 경로: smplr Smplr.start()가 반환하는 StopFn(dist/index.js:1019-1031)을
   *  voice가 매 trigger마다 모아두고, hardStop에서 일괄 호출. StopFn은
   *  schedulerStop() + voices.stopById()를 모두 처리해 미예약/재생 양쪽 정리. */
  const hardStop = () => {
    scheduler?.stop();
    scheduler = null;
    // pending setState timer를 모두 취소 — stop 후 playing 상태가 뒤늦게 dispatch되는 것을 막음
    for (const id of pendingStateUpdates) clearTimeout(id);
    pendingStateUpdates.clear();
    // 각 voice가 trigger마다 모아둔 StopFn을 호출 — 미예약 + 재생 양쪽 정리.
    drums?.cancelScheduled();
    bass?.cancelScheduled();
    guitar?.cancelScheduled();
    aux?.cancelScheduled();
    // gain fade는 보조: StopFn이 미처 잡지 못한 attack release 잔향 차단.
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

    // PR-B: 카드 슬러그로 profile resolve. 미등재 = 빈 프로필 → 카테고리 default 그대로.
    const profile = resolveCardProfile(template.slug, template.category ?? 'pop');
    const bundle = profile.bundle;
    let loaded: LoadedBundle;
    try {
      loaded = await loadBundle(ctx, bundle);
    } catch (e) {
      setState({
        status: 'error',
        message: `Failed to load instruments: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }

    currentLoadedBundle = loaded;
    currentTemplate = template;
    currentKeyRoot = keyRoot;
    currentDefaultBpm = template.default_bpm;
    // Bug 1: initialBpm이 유효한 양수면 그 값으로 시작. 없거나 무효면 default_bpm.
    // 호출자(ProgressionPlayButton)가 store의 bpmOverrides[slug]를 읽어 전달한다.
    currentBpm =
      typeof initialBpm === 'number' && Number.isFinite(initialBpm) && initialBpm > 0
        ? initialBpm
        : template.default_bpm;

    const voices = await ensureVoices();

    // PR-B: 카드 시작 시 tone 적용. setValueAtTime은 즉시 반영(ramp 없음 — hardStop 직후라 OK).
    const ctxNow = ctx.currentTime;
    if (fxChain) fxChain.wetGain.gain.setValueAtTime(profile.tone.reverbWet, ctxNow);
    voices.drums.setVoiceGain(profile.tone.voiceGain.drums);
    voices.bass.setVoiceGain(profile.tone.voiceGain.bass);
    voices.guitar.setVoiceGain(profile.tone.voiceGain.guitar);
    voices.aux.setVoiceGain(profile.tone.voiceGain.aux);

    const lookahead = createLookaheadScheduler({ audioContext: ctx });
    scheduler = createBarScheduler({ lookahead });

    scheduler.start(currentBpm, 4, (eventTime, barIndexAbs) => {
      const tpl = currentTemplate;
      if (!tpl || !currentLoadedBundle) return;

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
        const loaded = currentLoadedBundle;

        // 카테고리별 CATEGORY_RHYTHMS로 디스패치 — 알 수 없는 카테고리는 pop fallback.
        const rhythm = CATEGORY_RHYTHMS[tpl.category as string] ?? CATEGORY_RHYTHMS['pop']!;
        // PR-B: profile.variant를 selectSlot에 forward (PR-A에서 placeholder였던 부분 활성화)
        const variant = profile.variant;
        const slotName = rhythm.selectSlot(tpl, idx, variant);
        const pattern = rhythm.patterns[slotName];
        // 정의되지 않은 슬롯이면 스킵 — selectSlot이 올바르게 구현되면 발생하지 않음.
        if (!pattern) return;

        // PR-A: parseBeatStep에 unit/swing 흘려보내기. swing 미정의 카테고리는 0.5(straight).
        const swing = resolveSwing(rhythm, variant);
        // bs(BeatStep): 외부 const step과의 변수 shadow를 피하기 위해 파라미터명 bs 사용
        const t = (bs: { time: string; unit?: 'sub16' | 'triplet8' }) =>
          eventTime + parseBeatStep(bs.time, bpm, 4, { unit: bs.unit, swing });

        // PR-B: velocityScale를 chord 진입 시 1회 계산. voice trigger 마지막 인자로 전달.
        const vs = profile.tone.velocityScale;

        // drums: smplr DrumMachine은 sample group name ('kick'/'snare'/'hat')으로 트리거
        for (const s of pattern.drums.kick)  voices.drums.trigger('kick',  loaded.drums, t(s), s.velocity, vs);
        for (const s of pattern.drums.snare) voices.drums.trigger('snare', loaded.drums, t(s), s.velocity, vs);
        for (const s of pattern.drums.hat)   voices.drums.trigger('hat',   loaded.drums, t(s), s.velocity, vs);

        // bass: 루트 2옥타브 다운, 카테고리 패턴별 스텝 수로 trigger
        // -24로 C2 부근 — 어쿠스틱 업라이트/일렉 베이스 저역과 맞는다.
        const bassMidi = midi[0]! - 24;
        for (const s of pattern.bass.steps) voices.bass.trigger(bassMidi, loaded.bass, beatSec, t(s), s.velocity, vs);

        // guitar: 카테고리 패턴별 strum — down/up 방향으로 12ms 시간차 strum
        // 코드 톤을 1옥타브 다운 — C3 부근으로 옮겨 어쿠스틱/일렉기타 컴핑 음역과 맞춤.
        const guitarMidi = midi.map((n) => n - 12);
        for (const s of pattern.guitar)
          voices.guitar.strum(s.direction, guitarMidi, loaded.guitar, strumDurSec, t(s), s.velocity, vs);

        // aux: funk(shaker)/bossa(clave) 패턴 — pattern.aux + loaded.aux 둘 다 있을 때만 활성화.
        // bundle은 profile.bundle 사용 (instrumentOverrides 반영). 기존 getBundle 호출 제거.
        if (pattern.aux && voices.aux && loaded.aux) {
          const auxKind = bundle.aux?.kind;
          if (auxKind) {
            for (const s of pattern.aux) voices.aux.trigger(loaded.aux, auxKind, t(s), s.velocity, vs);
          }
        }
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
      // cancelScheduledValues로 이전 setValueAtTime 잔여 스케줄 정리 — 즉각 반영 보장.
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
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
    aux?.dispose(); aux = null;
    if (masterGain) {
      masterGain.disconnect();
      masterGain = null;
    }
    if (fxChain) {
      fxChain.dispose();
      fxChain = null;
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
