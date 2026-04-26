import { describe, expect, it, vi } from 'vitest';

import { makeAudioContextMock, makeGainNodeMock } from './voice-mock-helpers';

// smplr-bridge의 getReverb를 mock — Reverb 노드 대신 GainNode mock으로 대체
vi.mock('@/lib/audio/backing/smplr-bridge', () => ({
  getReverb: vi.fn(async () => {
    const node = makeGainNodeMock() as unknown as AudioNode;
    return {
      input: node,
      connect: vi.fn(),
      ready: () => Promise.resolve(undefined),
      isReady: true,
    };
  }),
}));

import { createMasterFxChain } from '@/lib/audio/backing/fx-chain';

const makeMockCompressor = () => ({
  threshold: { value: 0 },
  ratio: { value: 0 },
  attack: { value: 0 },
  release: { value: 0 },
  knee: { value: 0 },
  connect: vi.fn(),
  disconnect: vi.fn(),
});

function makeCtxWithCompressor(): AudioContext {
  const ctx = makeAudioContextMock();
  (ctx as unknown as { createDynamicsCompressor: () => unknown }).createDynamicsCompressor =
    vi.fn(makeMockCompressor);
  return ctx;
}

describe('createMasterFxChain', () => {
  it('input GainNode + compressor + dry/wet 두 갈래 노드를 모두 노출', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    expect(fx.input).toBeDefined();
    expect(fx.compressor).toBeDefined();
    expect(fx.dryGain).toBeDefined();
    expect(fx.wetGain).toBeDefined();
    expect(fx.reverb).toBeDefined();
    expect(typeof fx.dispose).toBe('function');
  });

  it('compressor 파라미터: threshold=-18, ratio=3, attack=0.005, release=0.2, knee=6', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    expect(fx.compressor.threshold.value).toBe(-18);
    expect(fx.compressor.ratio.value).toBe(3);
    expect(fx.compressor.attack.value).toBeCloseTo(0.005);
    expect(fx.compressor.release.value).toBeCloseTo(0.2);
    expect(fx.compressor.knee.value).toBe(6);
  });

  it('dry/wet 비율: dry=0.82, wet=0.18', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    expect(fx.dryGain.gain.value).toBeCloseTo(0.82);
    expect(fx.wetGain.gain.value).toBeCloseTo(0.18);
  });

  it('input → compressor connect 호출됨', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    expect((fx.input.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(fx.compressor);
  });

  it('compressor → dryGain + wetGain 두 갈래 connect', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    const compressorConnect = fx.compressor.connect as ReturnType<typeof vi.fn>;
    expect(compressorConnect).toHaveBeenCalledWith(fx.dryGain);
    expect(compressorConnect).toHaveBeenCalledWith(fx.wetGain);
  });

  it('wetGain → reverb.input connect', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    const wetConnect = fx.wetGain.connect as ReturnType<typeof vi.fn>;
    expect(wetConnect).toHaveBeenCalledWith(fx.reverb.input);
  });

  it('dryGain·reverb 모두 ctx.destination으로 connect', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    expect((fx.dryGain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(ctx.destination);
    expect((fx.reverb.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(ctx.destination);
  });

  it('dispose는 모든 노드 disconnect 호출', async () => {
    const ctx = makeCtxWithCompressor();
    const fx = await createMasterFxChain(ctx);
    fx.dispose();
    expect((fx.input.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((fx.compressor.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((fx.dryGain.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((fx.wetGain.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});
