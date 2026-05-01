/**
 * engine.voice-mute.test.ts — Task 12 (튜닝/악기 확장)
 *
 * Voice별 mute gate 검증.
 *
 * 핵심 동작:
 *   - engine.setVoiceMute(voice, true) 후 onBar 콜백이 호출되면 해당 voice는 trigger 0회
 *   - 다른 voice는 영향 받지 않음
 *   - 재생 중 setVoiceMute(voice, false)로 mute 해제하면 다음 마디부터 trigger 발생
 *
 * 테스트 전략:
 *   - engine.test.ts와 동일한 mock 셋업(BarScheduler/loadBundle/fx-chain/AudioContext)
 *   - onBar 콜백을 직접 호출해 마디 진행을 시뮬레이션
 *   - voice별 smplr.start mock 호출 횟수로 gate 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeAudioContextMock,
  makeDrumMachineMock,
  makeSoundfontMock,
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

// LookaheadScheduler 모킹
vi.mock('@/lib/audio/scheduler/lookahead-scheduler', () => ({
  createLookaheadScheduler: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    setIntervalSeconds: vi.fn(),
    setScheduleAhead: vi.fn(),
  })),
}));

// smplr-bridge mock — drums/bass/guitar/aux 4 voice 모두 등록
const fakeDrumsMock = makeDrumMachineMock();
const fakeBassMock = makeSoundfontMock();
const fakeGuitarMock = makeSoundfontMock();
const fakeAuxMock = makeSoundfontMock();

// fx-chain mock
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
    aux: fakeAuxMock,
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
import type { PitchClass } from '@/lib/theory/types';

// 테스트용 progression — 4마디 전부 파싱 가능 코드
const TEMPLATE = {
  id: 'test-mute-1',
  slug: 'test-mute-template',
  name: 'Mute Test',
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

beforeEach(() => {
  __disposeBackingEngineForTests();
  mockCtx = makeAudioContextMock();
  fakeDrumsMock.start.mockClear();
  fakeBassMock.start.mockClear();
  fakeGuitarMock.start.mockClear();
  fakeAuxMock.start.mockClear();
  barSchedulerInstance.start.mockClear();
  barSchedulerInstance.stop.mockClear();
  barSchedulerInstance.setBpm.mockClear();
  fakeCreateMasterFxChain.mockClear();
});

afterEach(() => {
  __disposeBackingEngineForTests();
});

/** 엔진 부팅 후 onBar 콜백 추출 헬퍼. */
async function startAndGetOnBar() {
  const engine = getBackingEngine();
  await engine.start(TEMPLATE as Parameters<typeof engine.start>[0], 0 as PitchClass);
  const lastCall = barSchedulerInstance.start.mock.calls.at(-1);
  if (!lastCall) throw new Error('barScheduler.start was not called');
  const cb = lastCall[2] as (eventTime: number, barIndex: number) => void;
  return { engine, cb };
}

describe('engine.setVoiceMute API', () => {
  it('엔진은 setVoiceMute 메서드를 노출한다', async () => {
    const engine = getBackingEngine();
    expect(typeof (engine as unknown as { setVoiceMute?: unknown }).setVoiceMute).toBe('function');
  });

  it('드럼 mute=true 후 onBar 호출 시 drums.start는 0회, 다른 voice는 정상 trigger', async () => {
    const { engine, cb } = await startAndGetOnBar();

    // 사전 검증: mute 없을 때는 drums가 trigger 됨
    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();
    cb(0, 0);
    expect(fakeDrumsMock.start.mock.calls.length).toBeGreaterThan(0);
    expect(fakeBassMock.start.mock.calls.length).toBeGreaterThan(0);
    expect(fakeGuitarMock.start.mock.calls.length).toBeGreaterThan(0);

    // drums mute → 다음 마디는 drums 0회, bass/guitar는 그대로
    (engine as unknown as { setVoiceMute: (v: 'drums', m: boolean) => void }).setVoiceMute(
      'drums',
      true,
    );

    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();
    cb(0, 1);

    expect(fakeDrumsMock.start).not.toHaveBeenCalled();
    expect(fakeBassMock.start.mock.calls.length).toBeGreaterThan(0);
    expect(fakeGuitarMock.start.mock.calls.length).toBeGreaterThan(0);
  });

  it('베이스 mute=true 시 bass만 차단', async () => {
    const { engine, cb } = await startAndGetOnBar();

    (engine as unknown as { setVoiceMute: (v: 'bass', m: boolean) => void }).setVoiceMute(
      'bass',
      true,
    );

    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();
    cb(0, 0);

    expect(fakeBassMock.start).not.toHaveBeenCalled();
    expect(fakeDrumsMock.start.mock.calls.length).toBeGreaterThan(0);
    expect(fakeGuitarMock.start.mock.calls.length).toBeGreaterThan(0);
  });

  it('기타 mute=true 시 guitar만 차단', async () => {
    const { engine, cb } = await startAndGetOnBar();

    (engine as unknown as { setVoiceMute: (v: 'guitar', m: boolean) => void }).setVoiceMute(
      'guitar',
      true,
    );

    fakeDrumsMock.start.mockClear();
    fakeBassMock.start.mockClear();
    fakeGuitarMock.start.mockClear();
    cb(0, 0);

    expect(fakeGuitarMock.start).not.toHaveBeenCalled();
    expect(fakeDrumsMock.start.mock.calls.length).toBeGreaterThan(0);
    expect(fakeBassMock.start.mock.calls.length).toBeGreaterThan(0);
  });

  it('재생 중 mute 해제하면 다음 마디부터 다시 trigger', async () => {
    const { engine, cb } = await startAndGetOnBar();
    const setVoiceMute = (engine as unknown as {
      setVoiceMute: (v: 'drums', m: boolean) => void;
    }).setVoiceMute;

    // drums mute on → 0회
    setVoiceMute('drums', true);
    fakeDrumsMock.start.mockClear();
    cb(0, 0);
    expect(fakeDrumsMock.start).not.toHaveBeenCalled();

    // mute off → 다음 마디부터 다시 trigger
    setVoiceMute('drums', false);
    fakeDrumsMock.start.mockClear();
    cb(0, 1);
    expect(fakeDrumsMock.start.mock.calls.length).toBeGreaterThan(0);
  });
});
