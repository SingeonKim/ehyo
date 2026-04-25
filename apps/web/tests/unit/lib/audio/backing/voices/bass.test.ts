import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createToneBridgeMock, resetToneBridgeMock } from '../voice-mock-helpers';

vi.mock('@/lib/audio/tone-bridge', () => createToneBridgeMock());

import { createBassVoice } from '@/lib/audio/backing/voices/bass';
import { midiToFrequency } from '@/lib/theory/chord-voicing';

async function getInternals() {
  const mod = await import('@/lib/audio/tone-bridge');
  return (mod as unknown as { __mockInternals: ReturnType<typeof createToneBridgeMock>['__mockInternals'] }).__mockInternals;
}

beforeEach(async () => {
  const internals = await getInternals();
  resetToneBridgeMock(internals);
});

describe('createBassVoice', () => {
  it('instantiates a MonoSynth routed to destination', async () => {
    createBassVoice();
    const internals = await getInternals();

    expect(internals.MonoSynth).toHaveBeenCalledOnce();
    expect(internals.monoSynth.toDestination).toHaveBeenCalledOnce();
  });

  it('trigger(midi, duration, time) converts midi to frequency', async () => {
    const voice = createBassVoice();
    const internals = await getInternals();

    voice.trigger(48, '4n', 1.5);

    expect(internals.monoSynth.triggerAttackRelease).toHaveBeenCalledOnce();
    const [freq, duration, time] = internals.monoSynth.triggerAttackRelease.mock.calls[0]!;
    expect(freq).toBeCloseTo(midiToFrequency(48));
    expect(duration).toBe('4n');
    expect(time).toBe(1.5);
  });

  it('stop() calls triggerRelease without disposing', async () => {
    const voice = createBassVoice();
    const internals = await getInternals();

    voice.stop();

    expect(internals.monoSynth.triggerRelease).toHaveBeenCalled();
    expect(internals.monoSynth.dispose).not.toHaveBeenCalled();
  });

  it('dispose() disposes the MonoSynth', async () => {
    const voice = createBassVoice();
    const internals = await getInternals();

    voice.dispose();

    expect(internals.monoSynth.dispose).toHaveBeenCalledOnce();
  });
});
