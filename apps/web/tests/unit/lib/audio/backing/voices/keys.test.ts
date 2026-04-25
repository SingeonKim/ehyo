import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createToneBridgeMock, resetToneBridgeMock } from '../voice-mock-helpers';

vi.mock('@/lib/audio/tone-bridge', () => createToneBridgeMock());

import { createKeysVoice } from '@/lib/audio/backing/voices/keys';
import { midiToFrequency } from '@/lib/theory/chord-voicing';

async function getInternals() {
  const mod = await import('@/lib/audio/tone-bridge');
  return (mod as unknown as { __mockInternals: ReturnType<typeof createToneBridgeMock>['__mockInternals'] }).__mockInternals;
}

beforeEach(async () => {
  const internals = await getInternals();
  resetToneBridgeMock(internals);
});

describe('createKeysVoice', () => {
  it('instantiates a PolySynth routed to destination', async () => {
    createKeysVoice();
    const internals = await getInternals();

    expect(internals.PolySynth).toHaveBeenCalledOnce();
    expect(internals.polySynth.toDestination).toHaveBeenCalledOnce();
  });

  it('trigger(midi[], duration, time) converts each midi to frequency', async () => {
    const voice = createKeysVoice();
    const internals = await getInternals();

    voice.trigger([60, 64, 67], '1m', 1.5);

    expect(internals.polySynth.triggerAttackRelease).toHaveBeenCalledOnce();
    const [freqs, duration, time] = internals.polySynth.triggerAttackRelease.mock.calls[0]!;
    expect(freqs).toEqual([60, 64, 67].map(midiToFrequency));
    expect(duration).toBe('1m');
    expect(time).toBe(1.5);
  });

  it('stop() calls releaseAll without disposing', async () => {
    const voice = createKeysVoice();
    const internals = await getInternals();

    voice.stop();

    expect(internals.polySynth.releaseAll).toHaveBeenCalledOnce();
    expect(internals.polySynth.dispose).not.toHaveBeenCalled();
  });

  it('dispose() disposes the PolySynth', async () => {
    const voice = createKeysVoice();
    const internals = await getInternals();

    voice.dispose();

    expect(internals.polySynth.dispose).toHaveBeenCalledOnce();
  });
});
