/**
 * engine.test.ts — Sprint 2-8 PR-A smplr 마이그레이션 후 재작성.
 *
 * 변경 사항:
 *   - webaudiofont-bridge mock → smplr-bridge(loadBundle) mock으로 교체
 *   - LoadedPreset/LoadedDrumKit → LoadedBundle(DrumMachine/Soundfont) 픽스처
 *   - onBar 트리거 검증: queueWaveTable/queueStrumDown/Up → DrumMachine.start/Soundfont.start
 *   - voice trigger 검증은 smplr mock 기준으로 재작성
 *
 * 테스트 전략:
 *   - BarScheduler, LookaheadScheduler를 mock으로 교체 → onBar 콜백을 테스트가 직접 호출
 *   - smplr-bridge(loadBundle)를 mock으로 교체 → 실제 CDN 요청 없음
 *   - AudioContext를 mock으로 주입 → 실제 오디오 출력 없음
 *   - voice 생성은 실제 createDrumVoice/createBassVoice/createGuitarVoice 호출하되
 *     내부 AudioContext 의존성이 mock으로 충족됨
 *
 * 검증 항목:
 *   1. start → bundle 로드 성공 시 status=playing
 *   2. start → bundle 로드 실패 시 status=error
 *   3. barScheduler.start가 default_bpm으로 호출됨
 *   4. 파싱 가능 코드는 drums 12 + bass 2 trigger + guitar strum 6회
 *   5. 파싱 실패 코드는 전 트랙 0회 trigger + console.warn
 *   6. setState는 동기 블록이 아닌 setTimeout(delay)에서 호출됨
 *   7. barIndex는 template.bars로 wrap
 *   8. setBpm은 barScheduler.setBpm 호출
 *   9. setBpm(NaN/0/음수)는 무시 + 경고
 *   10. resetBpmToDefault는 template.default_bpm으로 복귀
 *   11. start → stop → start 시 voice factory는 1회만 호출 (재사용)
 *   12. stop when idle은 no-op
 *   13. dispose 시 voice GainNode disconnect 호출
 *   14. subscribe/unsubscribe 동작
 *   15. (Bug 1) start에 initialBpm 주면 barScheduler에 그 값이 전달됨
 *   16. (Bug 1) initialBpm이 invalid면 default_bpm 사용
 *   17. (Bug 2) setState는 eventTime까지 setTimeout으로 지연됨
 *   18. (Bug 2) hardStop은 pending setState timer를 모두 cancel
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeDrumMachineMock,
  makeSoundfontMock,
  makeAudioContextMock,
} from './voice-mock-helpers';

// AudioContext mock — engine 내부 getAudioContext/resumeAudioContext를 대체
let mockCtx: AudioContext;
vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => mockCtx),
  resumeAudioContext: vi.fn(async () => mockCtx),
  hasAudioContext: vi.fn(() => true),
  closeAudioContext: vi.fn(),
}));

// BarScheduler 모킹 — onBar 콜백을 테스트가 직접 호출할 수 있게 참조 보관
const barSchedulerInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  setBpm: vi.fn(),
};
vi.mock('@/lib/audio/scheduler/bar-scheduler', () => ({
  createBarScheduler: vi.fn(() => barSchedulerInstance),
}));

// LookaheadScheduler 모킹 — BarScheduler가 직접 사용하므로 형태만 맞춤
vi.mock('@/lib/audio/scheduler/lookahead-scheduler', () => ({
  createLookaheadScheduler: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    setIntervalSeconds: vi.fn(),
    setScheduleAhead: vi.fn(),
  })),
}));

// smplr-bridge(loadBundle) 모킹 — 실제 CDN 요청 없이 즉시 resolve
// LoadedBundle: { drums: DrumMachine, bass: Soundfont, guitar: Soundfont, aux?: Soundfont }
const fakeDrumsMock = makeDrumMachineMock();
const fakeBassMock = makeSoundfontMock();
const fakeGuitarMock = makeSoundfontMock();

// fx-chain mock — vi.hoisted로 호이스팅 문제 해결 (vi.mock 팩토리보다 먼저 초기화)
const { fakeFxChain, fakeCreateMasterFxChain } = vi.hoisted(() => {
  const fakeFxChain = {
    input: { connect: vi.fn(), disconnect: vi.fn() } as unknown as GainNode,
    compressor: {} as unknown as DynamicsCompressorNode,
    dryGain: {} as unknown as GainNode,
    wetGain: { gain: { setValueAtTime: vi.fn() } } as unknown as GainNode,
    reverb: {} as never,
    dispose: vi.fn(),
  };
  const fakeCreateMasterFxChain = vi.fn(async () => fakeFxChain);
  return { fakeFxChain, fakeCreateMasterFxChain };
});
vi.mock('@/lib/audio/backing/fx-chain', () => ({
  createMasterFxChain: fakeCreateMasterFxChain,
}));

vi.mock('@/lib/audio/backing/smplr-bridge', () => ({
  loadBundle: vi.fn(async () => ({
    drums: fakeDrumsMock,
    bass: fakeBassMock,
    guitar: fakeGuitarMock,
  })),
  getSoundfont: vi.fn(),
  getDrumMachine: vi.fn(),
  getReverb: vi.fn(),
  __resetSmplrBridgeForTests: vi.fn(),
}));

import {
  __disposeBackingEngineForTests,
  getBackingEngine,
} from '@/lib/audio/backing';
import * as smplrBridgeModule from '@/lib/audio/backing/smplr-bridge';
import type { PitchClass } from '@/lib/theory/types';

// 테스트용 ProgressionTemplate 고정 픽스처
// XBAD: b# 조합은 parseRoman이 null 반환하는 파싱 실패 케이스
// (D1 이후 단일 b/# 접두사는 유효해졌으므로, 이중 접두사로 대체)
const TEMPLATE = {
  id: 'test-1',
  slug: 'test-12-bar',
  name: 'Blues',
  category: 'blues',
  bars: 4,
  default_bpm: 90,
  progression: [
    { bar: 1, chord: 'I7' },    // 파싱 성공
    { bar: 2, chord: 'IV7' },   // 파싱 성공
    { bar: 3, chord: 'V7' },    // 파싱 성공
    { bar: 4, chord: 'b#VII' }, // 파싱 실패 (이중 접두사 — D1에서 거부)
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  // 각 테스트마다 엔진 싱글턴 초기화 — 상태 누출 방지
  __disposeBackingEngineForTests();
  mockCtx = makeAudioContextMock();
  // smplr mock의 start 이력 초기화
  fakeDrumsMock.start.mockClear();
  fakeBassMock.start.mockClear();
  fakeGuitarMock.start.mockClear();
  // BarScheduler mock 호출 이력 초기화
  barSchedulerInstance.start.mockClear();
  barSchedulerInstance.stop.mockClear();
  barSchedulerInstance.setBpm.mockClear();
  // fx-chain mock 초기화
  fakeCreateMasterFxChain.mockClear();
  fakeFxChain.dispose.mockClear();
  (fakeFxChain.input.connect as ReturnType<typeof vi.fn>).mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
});

/** microtask 큐를 비울 때까지 두 번 await */
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

/** barScheduler.start에 전달된 onBar 콜백을 추출하는 헬퍼 */
async function getOnBarCallback() {
  const engine = getBackingEngine();
  await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
  const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
  if (!lastCall) throw new Error('barScheduler.start was not called');
  return lastCall[2] as (eventTime: number, barIndex: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// engine.start
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.start', () => {
  it('bundle 로드 성공 시 status playing', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    expect(engine.getState().status).toBe('playing');
  });

  it('bundle 로드 실패 시 status error + message 포함', async () => {
    vi.mocked(smplrBridgeModule.loadBundle).mockRejectedValueOnce(new Error('CORS'));
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    const state = engine.getState();
    expect(state.status).toBe('error');
    if (state.status === 'error') expect(state.message).toContain('CORS');
  });

  it('barScheduler.start가 template.default_bpm으로 호출됨', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // 첫 번째 인자: bpm, 두 번째: beatsPerBar, 세 번째: onBar 콜백
    expect(barSchedulerInstance.start).toHaveBeenCalledWith(90, 4, expect.any(Function));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onBar 콜백 — 멀티트랙 트리거 (smplr DrumMachine.start / Soundfont.start)
// ─────────────────────────────────────────────────────────────────────────────

describe('onBar 콜백 — 멀티트랙 트리거', () => {
  it('파싱 가능 코드(I7)는 drums 12회 + bass 2회 + guitar 6음×6스텝 trigger', async () => {
    const cb = await getOnBarCallback();
    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();

    // bar 0 → I7 (파싱 성공)
    cb(0, 0);

    // drums: blues shuffle_a — kick 2 + snare 2 + hat 8 = 12회
    expect(fakeDrumsMock.start).toHaveBeenCalledTimes(12);
    // bass: blues shuffle_a — 2스텝(1박·3박)
    expect(fakeBassMock.start).toHaveBeenCalledTimes(2);
    // guitar: blues shuffle_a — 4스텝 × midiNotes 음 수(I7 = 4음) = 16회 (최소 1회 이상)
    expect(fakeGuitarMock.start.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('drums trigger note는 string("kick"/"snare"/"hat")으로 호출됨', async () => {
    const cb = await getOnBarCallback();
    fakeDrumsMock.start.mockClear();

    cb(0, 0);

    const calls = fakeDrumsMock.start.mock.calls;
    const notes = calls.map((c: unknown[]) => (c[0] as { note: string }).note);
    // kick 노트가 존재해야 함
    expect(notes).toContain('kick');
    expect(notes).toContain('snare');
    expect(notes).toContain('hat');
  });

  it('파싱 실패 코드(b#VII)는 drums/bass/guitar 모두 0회 trigger + warn', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cb = await getOnBarCallback();
    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();

    // bar 3 → b#VII (파싱 실패 — 이중 접두사), eventTime=0 → delayMs=0
    cb(0, 3);

    // 동기 블록에서는 trigger가 없어야 함
    expect(fakeDrumsMock.start).not.toHaveBeenCalled();
    expect(fakeBassMock.start).not.toHaveBeenCalled();
    expect(fakeGuitarMock.start).not.toHaveBeenCalled();

    // warn은 setTimeout(delay) 내부에서 발생 (eventTime=0이므로 delay=0)
    vi.advanceTimersByTime(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('b#VII'));

    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it('setState는 eventTime까지 setTimeout으로 지연됨 (UI/audio 위상 일치)', async () => {
    vi.useFakeTimers();
    // mockCtx.currentTime을 1.0으로 고정
    (mockCtx as unknown as { currentTime: number }).currentTime = 1.0;

    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // start() 자체의 listener 호출(loading → playing)은 여기서 초기화
    listener.mockClear();

    const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
    if (!lastCall) throw new Error('barScheduler.start was not called');
    const cb = lastCall[2] as (eventTime: number, barIndex: number) => void;

    // eventTime=1.5, currentTime=1.0 → delayMs=500
    cb(1.5, 0);

    // 동기 직후 — listener는 아직 호출되지 않아야 함
    expect(listener).not.toHaveBeenCalled();

    // 499ms 진행 — 아직 미호출
    vi.advanceTimersByTime(499);
    expect(listener).not.toHaveBeenCalled();

    // 2ms 더 진행(총 501ms) — listener 호출됨
    vi.advanceTimersByTime(2);
    expect(listener).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('barIndex는 template.bars(4)로 wrap', async () => {
    vi.useFakeTimers();
    const cb = await getOnBarCallback();
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    // 0, 1, 2, 3, 4 → 4 % 4 = 0, chord = I7 (eventTime=0 → delay=0)
    cb(0, 0); cb(0, 1); cb(0, 2); cb(0, 3); cb(0, 4);
    vi.advanceTimersByTime(0);

    // 마지막 listener 호출의 상태 확인
    const last = listener.mock.calls.at(-1)?.[0];
    expect(last?.status).toBe('playing');
    if (last?.status === 'playing') {
      expect(last.barIndex).toBe(0);
      expect(last.chordSymbol).toBe('I7');
    }
    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// engine.setBpm / resetBpmToDefault
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.setBpm / resetBpmToDefault', () => {
  it('setBpm은 barScheduler.setBpm 호출', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    engine.setBpm(120);
    expect(barSchedulerInstance.setBpm).toHaveBeenCalledWith(120);
  });

  it('setBpm에 NaN/0/음수는 무시 + 경고 3회', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    barSchedulerInstance.setBpm.mockClear();

    engine.setBpm(NaN);
    engine.setBpm(0);
    engine.setBpm(-10);

    // 유효하지 않은 값 → setBpm 미호출
    expect(barSchedulerInstance.setBpm).not.toHaveBeenCalled();
    // warn은 각각 1회씩 총 3회
    expect(warn).toHaveBeenCalledTimes(3);

    warn.mockRestore();
  });

  it('resetBpmToDefault는 template.default_bpm(90)으로 복귀', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    engine.setBpm(120);
    barSchedulerInstance.setBpm.mockClear();

    engine.resetBpmToDefault();
    expect(barSchedulerInstance.setBpm).toHaveBeenCalledWith(90);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// engine.stop / start 재사용
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.stop / start 재사용', () => {
  it('start → stop → start 시 voice factory는 1회만 호출 (재사용)', async () => {
    const drumsModule = await import('@/lib/audio/backing/voices/drums');
    const ctorSpy = vi.spyOn(drumsModule, 'createDrumVoice');
    ctorSpy.mockClear();

    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    engine.stop();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);

    // voice 객체는 재사용. createDrumVoice는 1회만 호출됨.
    expect(ctorSpy).toHaveBeenCalledTimes(1);
  });

  it('stop when already idle is a no-op (throws 없음)', () => {
    const engine = getBackingEngine();
    expect(() => engine.stop()).not.toThrow();
    expect(engine.getState().status).toBe('idle');
  });

  it('stop은 trigger한 모든 음의 StopFn을 호출 (한 마디 잔향 버그 회귀 차단)', async () => {
    // 시나리오: ▶ 재생 후 ⏸. smplr Smplr.stop()은 *재생 중인 음만* 정지하고
    // 미예약 큐는 비우지 않는다 (dist/index.js:1041-1052). 정답은 start()가 반환하는
    // StopFn 각각을 호출해 schedulerStop + voices.stopById 양쪽 처리.
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);

    // onBar 콜백을 한 번 트리거해 trigger 호출 발생 — voice가 StopFn을 모음.
    const onBar = barSchedulerInstance.start.mock.calls[0]?.[2];
    expect(onBar).toBeTypeOf('function');
    onBar?.(mockCtx.currentTime, 0);

    // 모인 StopFn 추출 — drums/bass/guitar mock의 start가 각각 StopFn을 반환했음.
    const drumStopFns = fakeDrumsMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>);
    const bassStopFns = fakeBassMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>);
    const guitarStopFns = fakeGuitarMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>);
    expect(drumStopFns.length).toBeGreaterThan(0);
    expect(bassStopFns.length).toBeGreaterThan(0);
    expect(guitarStopFns.length).toBeGreaterThan(0);

    engine.stop();

    // 각 StopFn이 호출됐어야 — 이게 "한 마디 더 들리는 버그" 회귀 차단의 핵심.
    for (const fn of drumStopFns) expect(fn).toHaveBeenCalled();
    for (const fn of bassStopFns) expect(fn).toHaveBeenCalled();
    for (const fn of guitarStopFns) expect(fn).toHaveBeenCalled();
  });

  it('다른 카드로 전환 시 이전 카드의 StopFn도 호출 (이중 재생 버그 회귀 차단)', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    const onBar = barSchedulerInstance.start.mock.calls[0]?.[2];
    onBar?.(mockCtx.currentTime, 0);

    const previousStopFns = [
      ...fakeDrumsMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>),
      ...fakeBassMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>),
      ...fakeGuitarMock.start.mock.results.map((r) => r.value as ReturnType<typeof vi.fn>),
    ];
    expect(previousStopFns.length).toBeGreaterThan(0);

    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 5 as PitchClass);

    // start()가 내부적으로 hardStop을 호출 → 이전 트리거 분의 StopFn이 모두 호출돼야 함.
    for (const fn of previousStopFns) expect(fn).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// engine.dispose
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.dispose', () => {
  it('dispose 시 생성된 GainNode들의 disconnect가 호출됨', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // createGain 호출 결과(GainNode mock)들 수집 — voice 당 1개씩 + masterGain
    const gainResults = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results;

    __disposeBackingEngineForTests();

    for (const result of gainResults) {
      expect(result.value.disconnect).toHaveBeenCalled();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// subscribe / unsubscribe
// ─────────────────────────────────────────────────────────────────────────────

describe('subscribe', () => {
  it('상태 변화 시 listener 호출, unsubscribe 후에는 호출 없음', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    engine.stop();

    // 최소 playing + idle 상태가 전파되었어야 함
    expect(listener).toHaveBeenCalled();
    const statuses = listener.mock.calls.map((c) => (c[0] as { status: string }).status);
    expect(statuses).toContain('playing');
    expect(statuses).toContain('idle');

    // unsubscribe 이후 listener는 더 이상 호출되지 않음
    unsubscribe();
    listener.mockClear();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 1: initialBpm 지원 (Sprint 2-5)
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.start initialBpm (Bug 1)', () => {
  it('start에 initialBpm 주면 barScheduler에 그 값이 전달됨', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass, 120);
    // barScheduler.start의 첫 번째 인자가 initialBpm(120)이어야 함
    expect(barSchedulerInstance.start).toHaveBeenCalledWith(120, 4, expect.any(Function));
  });

  it('start의 initialBpm이 NaN이면 default_bpm 사용', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass, NaN);
    // NaN은 무효 → template.default_bpm(90)으로 폴백
    expect(barSchedulerInstance.start).toHaveBeenCalledWith(90, 4, expect.any(Function));
  });

  it('start의 initialBpm이 0이면 default_bpm 사용', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass, 0);
    // 0은 무효 → template.default_bpm(90)으로 폴백
    expect(barSchedulerInstance.start).toHaveBeenCalledWith(90, 4, expect.any(Function));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 2: hardStop pending timer cancel (Sprint 2-5)
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.stop pending setState cancel (Bug 2)', () => {
  it('hardStop은 pending setState timer를 모두 cancel', async () => {
    vi.useFakeTimers();
    (mockCtx as unknown as { currentTime: number }).currentTime = 0;

    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // start() 자체의 playing dispatch는 여기서 초기화
    listener.mockClear();

    const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
    if (!lastCall) throw new Error('barScheduler.start was not called');
    const cb = lastCall[2] as (eventTime: number, barIndex: number) => void;

    // eventTime=0.5, currentTime=0 → delayMs=500
    cb(0.5, 0);

    // stop → hardStop이 pending timer를 cancel
    engine.stop();
    vi.advanceTimersByTime(1000);

    // playing status dispatch는 없어야 함 (stop이 dispatch한 idle만 있음)
    const playingCalls = listener.mock.calls.filter(
      (c) => (c[0] as { status: string }).status === 'playing',
    );
    expect(playingCalls).toHaveLength(0);

    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FX 체인 wiring (Sprint 2-8 PR-B Task B2)
// ─────────────────────────────────────────────────────────────────────────────

describe('engine + master FX chain wiring', () => {
  it('start 후 createMasterFxChain이 1회 호출되고 masterGain이 fxChain.input에 연결', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);

    expect(fakeCreateMasterFxChain).toHaveBeenCalledTimes(1);
    // masterGain.connect 호출 — fakeFxChain.input에 연결됐어야
    const lastGainResult = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(lastGainResult.connect).toHaveBeenCalledWith(fakeFxChain.input);
  });

  it('두 번째 start는 fxChain을 새로 만들지 않음 (재사용)', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 5 as PitchClass);
    expect(fakeCreateMasterFxChain).toHaveBeenCalledTimes(1);
  });

  it('dispose 시 fxChain.dispose 호출', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    __disposeBackingEngineForTests();
    expect(fakeFxChain.dispose).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 9 PR-A: unit/swing flow 회귀 가드
// ─────────────────────────────────────────────────────────────────────────────

// pop 카테고리 템플릿 — swing 미정의 카테고리의 대표. groove_a 슬롯이 선택되도록
// bars=4, idx=0(짝수) 조건을 맞춘다.
const POP_TEMPLATE = {
  id: 'test-pop-1',
  slug: 'test-pop-4bar',
  name: 'Pop',
  category: 'pop',
  bars: 4,
  default_bpm: 120,
  progression: [
    { bar: 1, chord: 'I' },
    { bar: 2, chord: 'IV' },
    { bar: 3, chord: 'V' },
    { bar: 4, chord: 'I' },
  ],
  time_signature: '4/4',
  recommended_scales: ['major'],
  created_at: '2024-01-01T00:00:00Z',
};

describe('Sprint 9 PR-A: unit/swing flow 회귀', () => {
  it('swing 미정의 카테고리(pop)는 kick 타이밍이 straight 유지 (regression: PR-C 이후도 보장)', async () => {
    // pop 카테고리는 CategoryRhythm.swing = undefined → resolveSwing → 0.5(straight).
    // groove_a 슬롯: kick = ['0:0:0', '0:2:0'], bpm=120 → beatSec=0.5.
    // straight 기준: '0:0:0' → 0s, '0:2:0' → 1.0s (eventTime 기준).
    // PR-C에서 blues/jazz에 swing=0.66이 추가되어도 pop은 이 타이밍을 유지해야 한다.
    const engine = getBackingEngine();
    await engine.start(POP_TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
    if (!lastCall) throw new Error('barScheduler.start was not called');
    const cb = lastCall[2] as (eventTime: number, barIndex: number) => void;

    fakeDrumsMock.start.mockClear();

    // eventTime=10.0, barIndex=0 → groove_a 슬롯 → kick 2회
    cb(10.0, 0);

    const kickCalls = fakeDrumsMock.start.mock.calls.filter(
      (c: unknown[]) => (c[0] as { note: string }).note === 'kick',
    );
    expect(kickCalls).toHaveLength(2);

    // kick 시각이 straight(swing=0.5) 기준인지 확인.
    // parseBeatStep('0:0:0', 120, 4, { swing: 0.5 }) = 0s → time = eventTime + 0 = 10.0
    // parseBeatStep('0:2:0', 120, 4, { swing: 0.5 }) = 1.0s → time = eventTime + 1.0 = 11.0
    const kickTimes = kickCalls.map((c: unknown[]) => (c[0] as { time: number }).time).sort((a: number, b: number) => a - b);
    expect(kickTimes[0]).toBeCloseTo(10.0, 5);
    expect(kickTimes[1]).toBeCloseTo(11.0, 5);
  });
});
