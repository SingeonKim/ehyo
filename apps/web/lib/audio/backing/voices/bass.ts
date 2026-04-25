/**
 * 베이스 보이스 — Tone.MonoSynth, 단음.
 *
 * 엔진이 현재 코드의 루트 MIDI를 한 옥타브 다운(`midi[0] - 12`)해서 트리거한다.
 * 음색은 sawtooth + lowpass — 베이스 라인용 두툼한 음.
 */

import { midiToFrequency } from '@/lib/theory/chord-voicing';

import { getTone } from '../../tone-bridge';

export interface BassVoice {
  trigger(midiNote: number, duration: string, time: number): void;
  stop(): void;
  dispose(): void;
}

type MonoSynthLike = {
  toDestination(): MonoSynthLike;
  triggerAttackRelease(freq: number, duration: string, time: number): void;
  triggerRelease(time?: number): void;
  dispose(): void;
};

export function createBassVoice(): BassVoice {
  const Tone = getTone();

  const synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    filter: { Q: 2, type: 'lowpass' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
  }).toDestination() as unknown as MonoSynthLike;

  return {
    trigger(midiNote, duration, time) {
      synth.triggerAttackRelease(midiToFrequency(midiNote), duration, time);
    },
    stop() {
      const Tone = getTone();
      synth.triggerRelease(Tone.now());
    },
    dispose() {
      synth.dispose();
    },
  };
}
