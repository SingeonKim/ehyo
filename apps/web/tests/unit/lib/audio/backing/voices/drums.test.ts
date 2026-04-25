import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createToneBridgeMock, resetToneBridgeMock } from '../voice-mock-helpers';

vi.mock('@/lib/audio/tone-bridge', () => createToneBridgeMock());

import { createDrumVoice } from '@/lib/audio/backing/voices/drums';

async function getInternals() {
  const mod = await import('@/lib/audio/tone-bridge');
  return (mod as unknown as { __mockInternals: ReturnType<typeof createToneBridgeMock>['__mockInternals'] }).__mockInternals;
}

beforeEach(async () => {
  const internals = await getInternals();
  resetToneBridgeMock(internals);
});

describe('createDrumVoice', () => {
  it('instantiates Membrane/Noise/Metal synths and routes to destination', async () => {
    createDrumVoice();
    const internals = await getInternals();

    expect(internals.MembraneSynth).toHaveBeenCalledOnce();
    expect(internals.NoiseSynth).toHaveBeenCalledOnce();
    expect(internals.MetalSynth).toHaveBeenCalledOnce();
    expect(internals.membraneSynth.toDestination).toHaveBeenCalledOnce();
    expect(internals.noiseSynth.toDestination).toHaveBeenCalledOnce();
    expect(internals.metalSynth.toDestination).toHaveBeenCalledOnce();
  });

  it('trigger("kick", t, v) calls kick synth triggerAttackRelease with time', async () => {
    const voice = createDrumVoice();
    const internals = await getInternals();

    voice.trigger('kick', 1.5, 0.7);

    expect(internals.membraneSynth.triggerAttackRelease).toHaveBeenCalledOnce();
    const call = internals.membraneSynth.triggerAttackRelease.mock.calls[0];
    // (note, duration, time, velocity)
    expect(call?.[2]).toBe(1.5);
    expect(call?.[3]).toBe(0.7);
  });

  it('trigger("snare", t) uses default velocity 0.8', async () => {
    const voice = createDrumVoice();
    const internals = await getInternals();

    voice.trigger('snare', 2.0);

    const call = internals.noiseSynth.triggerAttackRelease.mock.calls[0];
    // (duration, time, velocity)
    expect(call?.[1]).toBe(2.0);
    expect(call?.[2]).toBe(0.8);
  });

  it('trigger("hat", t, v) calls hat synth with velocity', async () => {
    const voice = createDrumVoice();
    const internals = await getInternals();

    voice.trigger('hat', 3.5, 0.5);

    const call = internals.metalSynth.triggerAttackRelease.mock.calls[0];
    expect(call?.[1]).toBe(3.5);
    expect(call?.[2]).toBe(0.5);
  });

  it('stop() calls triggerRelease on all three synths and does not dispose', async () => {
    const voice = createDrumVoice();
    const internals = await getInternals();

    voice.stop();

    expect(internals.membraneSynth.triggerRelease).toHaveBeenCalled();
    expect(internals.noiseSynth.triggerRelease).toHaveBeenCalled();
    expect(internals.metalSynth.triggerRelease).toHaveBeenCalled();
    expect(internals.membraneSynth.dispose).not.toHaveBeenCalled();
    expect(internals.noiseSynth.dispose).not.toHaveBeenCalled();
    expect(internals.metalSynth.dispose).not.toHaveBeenCalled();
  });

  it('dispose() disposes all three synths', async () => {
    const voice = createDrumVoice();
    const internals = await getInternals();

    voice.dispose();

    expect(internals.membraneSynth.dispose).toHaveBeenCalledOnce();
    expect(internals.noiseSynth.dispose).toHaveBeenCalledOnce();
    expect(internals.metalSynth.dispose).toHaveBeenCalledOnce();
  });
});
