import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetWebAudioFontBridgeForTests,
  ensurePatch,
  ensureScriptLoaded,
  getPlayer,
  loadPreset,
} from '@/lib/audio/backing/webaudiofont-bridge';

vi.mock('@/lib/audio/context', () => ({
  getAudioContext: vi.fn(() => ({}) as AudioContext),
  resumeAudioContext: vi.fn(async () => ({}) as AudioContext),
}));

// 테스트용 player 인스턴스 — globalThis.WebAudioFontPlayer 생성자가 반환하는 객체
const playerInstance = {
  loader: {
    startLoad: vi.fn(),
    // 동기 콜백으로 바로 실행해 await이 즉시 resolve되도록 한다
    waitLoad: vi.fn((cb: () => void) => cb()),
  },
  queueWaveTable: vi.fn(),
  queueStrumDown: vi.fn(),
  queueStrumUp: vi.fn(),
  cancelQueue: vi.fn(),
};

// 생성자 함수 — 매번 같은 playerInstance를 반환해 싱글턴 확인이 가능하도록
const PlayerCtor = vi.fn(() => playerInstance);

beforeEach(() => {
  __resetWebAudioFontBridgeForTests();
  // 글로벌에 직접 주입 — ensureScriptLoaded는 hasGlobalPlayerClass()가 true이므로 즉시 resolve
  (globalThis as { WebAudioFontPlayer?: unknown }).WebAudioFontPlayer = PlayerCtor as unknown;
  PlayerCtor.mockClear();
  playerInstance.loader.startLoad.mockClear();
  playerInstance.loader.waitLoad.mockClear();
  // startLoad가 실제로 설정할 글로벌 패치 변수를 미리 심어둔다 (jsdom에서 script 로드 불가)
  (globalThis as Record<string, unknown>)['_tone_0270_FluidR3_GM_sf2_file'] = { fakePatch: true };
});

afterEach(() => {
  __resetWebAudioFontBridgeForTests();
});

describe('webaudiofont-bridge', () => {
  it('ensurePatch는 startLoad + waitLoad 호출 후 LoadedInstrument 반환', async () => {
    const result = await ensurePatch('melodic', 27);
    expect(playerInstance.loader.startLoad).toHaveBeenCalledOnce();
    expect(result).toBeDefined();
    expect(typeof result.url).toBe('string');
  });

  it('같은 패치 재요청은 캐시 히트로 startLoad 추가 호출 없음', async () => {
    await ensurePatch('melodic', 27);
    playerInstance.loader.startLoad.mockClear();
    await ensurePatch('melodic', 27);
    expect(playerInstance.loader.startLoad).not.toHaveBeenCalled();
  });

  it('loadPreset은 drums/bass/guitar 3개 패치 병렬 로드', async () => {
    (globalThis as Record<string, unknown>)['_drum_0_FluidR3_GM_sf2_file'] = { drum: true };
    (globalThis as Record<string, unknown>)['_tone_0330_FluidR3_GM_sf2_file'] = { bass: true };
    (globalThis as Record<string, unknown>)['_tone_0270_FluidR3_GM_sf2_file'] = { guitar: true };

    const preset = await loadPreset({ drumsKit: 0, bass: 33, guitar: 27, label: 'test' });
    expect(preset.drums).toBeDefined();
    expect(preset.bass).toBeDefined();
    expect(preset.guitar).toBeDefined();
  });

  it('getPlayer는 동일 player 인스턴스 반환 (싱글턴)', () => {
    const p1 = getPlayer();
    const p2 = getPlayer();
    expect(p1).toBe(p2);
  });

  it('ensureScriptLoaded는 클래스가 이미 있으면 즉시 resolve', async () => {
    // beforeEach에서 globalThis.WebAudioFontPlayer를 이미 주입했으므로 즉시 resolve
    await expect(ensureScriptLoaded()).resolves.toBeUndefined();
  });
});
