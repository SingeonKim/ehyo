/**
 * engine.test.ts — Sprint 2-4 Task 7 재작성.
 *
 * 테스트 전략:
 *   - BarScheduler, LookaheadScheduler를 mock으로 교체 → onBar 콜백을 테스트가 직접 호출
 *   - WebAudioFont bridge(loadPreset)를 mock으로 교체 → 실제 CDN 요청 없음
 *   - AudioContext를 mock으로 주입 → 실제 오디오 출력 없음
 *   - voice 생성은 실제 createDrumVoice/createBassVoice/createGuitarVoice 호출하되
 *     내부 AudioContext 의존성이 mock으로 충족됨
 *
 * 검증 항목(spec §10):
 *   1. start → preset 로드 성공 시 status=playing
 *   2. start → preset 로드 실패 시 status=error
 *   3. barScheduler.start가 default_bpm으로 호출됨
 *   4. 파싱 가능 코드는 drums 12 + bass 2 + guitar strum 6 trigger
 *   5. 파싱 실패 코드는 전 트랙 0회 trigger + console.warn
 *   6. setState는 동기 블록이 아닌 microtask에서 호출됨 (4.2박 회귀 차단)
 *   7. barIndex는 template.bars로 wrap
 *   8. setBpm은 barScheduler.setBpm 호출
 *   9. setBpm(NaN/0/음수)는 무시 + 경고
 *   10. resetBpmToDefault는 template.default_bpm으로 복귀
 *   11. start → stop → start 시 voice factory는 1회만 호출 (재사용)
 *   12. stop when idle은 no-op
 *   13. dispose 시 voice GainNode disconnect 호출
 *   14. subscribe/unsubscribe 동작
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  installPlayerMock,
  makeAudioContextMock,
  resetPlayerInstance,
  getPlayerInstance,
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

// loadPreset 모킹 — 즉시 resolve. getPlayer는 installPlayerMock이 설치한 인스턴스 반환
// drums는 LoadedDrumKit — kick/snare/hat 각각 별도 패치 객체
const fakeDrumsKit = {
  kick:  { patch: { kick: 1 },  url: 'kick-d'  },
  snare: { patch: { snare: 1 }, url: 'snare-d' },
  hat:   { patch: { hat: 1 },   url: 'hat-d'   },
};
const fakeBassPreset = { patch: { bass: 1 }, url: 'b' };
const fakeGuitarPreset = { patch: { guitar: 1 }, url: 'g' };
vi.mock('@/lib/audio/backing/webaudiofont-bridge', () => ({
  getPlayer: vi.fn(() => getPlayerInstance()),
  loadPreset: vi.fn(async () => ({
    drums: fakeDrumsKit,
    bass: fakeBassPreset,
    guitar: fakeGuitarPreset,
  })),
  ensurePatch: vi.fn(),
  ensureDrumPatch: vi.fn(),
  ensureScriptLoaded: vi.fn(async () => {}),
  __resetWebAudioFontBridgeForTests: vi.fn(),
}));

import {
  __disposeBackingEngineForTests,
  getBackingEngine,
} from '@/lib/audio/backing';
import * as bridgeModule from '@/lib/audio/backing/webaudiofont-bridge';
import type { PitchClass } from '@/lib/theory/types';

// 테스트용 ProgressionTemplate 고정 픽스처
// bVII: 접두 b로 시작 → parseRoman이 null 반환하는 파싱 실패 케이스
const TEMPLATE = {
  id: 'test-1',
  slug: 'test-12-bar',
  name: 'Blues',
  category: 'blues',
  bars: 4,
  default_bpm: 90,
  progression: [
    { bar: 1, chord: 'I7' },   // 파싱 성공
    { bar: 2, chord: 'IV7' },  // 파싱 성공
    { bar: 3, chord: 'V7' },   // 파싱 성공
    { bar: 4, chord: 'bVII' }, // 파싱 실패
  ],
  time_signature: '4/4',
  recommended_scales: ['major_blues'],
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  // 각 테스트마다 엔진 싱글턴 초기화 — 상태 누출 방지
  __disposeBackingEngineForTests();
  mockCtx = makeAudioContextMock();
  installPlayerMock();
  // BarScheduler mock 호출 이력 초기화
  barSchedulerInstance.start.mockClear();
  barSchedulerInstance.stop.mockClear();
  barSchedulerInstance.setBpm.mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
  resetPlayerInstance();
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
  it('preset 로드 성공 시 status playing', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    expect(engine.getState().status).toBe('playing');
  });

  it('preset 로드 실패 시 status error + message 포함', async () => {
    vi.mocked(bridgeModule.loadPreset).mockRejectedValueOnce(new Error('CORS'));
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
// onBar 콜백 — 멀티트랙 트리거
// ─────────────────────────────────────────────────────────────────────────────

describe('onBar 콜백 — 멀티트랙 트리거', () => {
  it('파싱 가능 코드(I7)는 queueWaveTable 14회 + strum 6회', async () => {
    const cb = await getOnBarCallback();
    const player = getPlayerInstance();
    player.queueWaveTable.mockClear();
    player.queueStrumDown.mockClear();
    player.queueStrumUp.mockClear();

    // bar 0 → I7 (파싱 성공)
    cb(0, 0);

    // drums: kick 2 + snare 2 + hat 8 = 12회 queueWaveTable
    // bass: 2회 queueWaveTable (1박·3박)
    // 합계 = 14
    expect(player.queueWaveTable).toHaveBeenCalledTimes(14);
    // guitar: EIGHTH_STRUM 6스텝 → down/up 합산 6회
    expect(
      player.queueStrumDown.mock.calls.length + player.queueStrumUp.mock.calls.length
    ).toBe(6);
  });

  it('파싱 실패 코드(bVII)는 drums/bass/guitar 모두 0회 trigger + warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cb = await getOnBarCallback();
    const player = getPlayerInstance();
    player.queueWaveTable.mockClear();
    player.queueStrumDown.mockClear();
    player.queueStrumUp.mockClear();

    // bar 3 → bVII (파싱 실패)
    cb(0, 3);

    // 동기 블록에서는 trigger가 없어야 함
    expect(player.queueWaveTable).not.toHaveBeenCalled();
    expect(player.queueStrumDown).not.toHaveBeenCalled();
    expect(player.queueStrumUp).not.toHaveBeenCalled();

    // warn은 microtask(setState 내부)에서 발생
    await flushMicrotasks();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bVII'));

    warnSpy.mockRestore();
  });

  it('setState는 동기 블록이 아닌 microtask에서 호출됨 (4.2박 회귀 차단)', async () => {
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // start() 자체의 listener 호출(loading → playing)은 여기서 초기화
    listener.mockClear();

    const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
    if (!lastCall) throw new Error('barScheduler.start was not called');
    const cb = lastCall[2] as (eventTime: number, barIndex: number) => void;

    cb(0, 0); // onBar 동기 호출

    // 동기 직후 — listener는 아직 호출되지 않아야 함
    expect(listener).not.toHaveBeenCalled();

    // microtask flush 후 — listener 호출 확인
    await flushMicrotasks();
    expect(listener).toHaveBeenCalled();
  });

  it('barIndex는 template.bars(4)로 wrap', async () => {
    const cb = await getOnBarCallback();
    const engine = getBackingEngine();
    const listener = vi.fn();
    engine.subscribe(listener);

    // 0, 1, 2, 3, 4 → 4 % 4 = 0, chord = I7
    cb(0, 0); cb(0, 1); cb(0, 2); cb(0, 3); cb(0, 4);
    await flushMicrotasks();

    // 마지막 listener 호출의 상태 확인
    const last = listener.mock.calls.at(-1)?.[0];
    expect(last?.status).toBe('playing');
    if (last?.status === 'playing') {
      expect(last.barIndex).toBe(0);
      expect(last.chordSymbol).toBe('I7');
    }
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
});

// ─────────────────────────────────────────────────────────────────────────────
// engine.dispose
// ─────────────────────────────────────────────────────────────────────────────

describe('engine.dispose', () => {
  it('dispose 시 생성된 GainNode들의 disconnect가 호출됨', async () => {
    const engine = getBackingEngine();
    await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
    // createGain 호출 결과(GainNode mock)들 수집 — voice 당 1개씩 총 3개
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
