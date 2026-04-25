/**
 * Keys 보이스 — Tone.PolySynth 블록 코드.
 *
 * Sprint 2-2의 단일 PolySynth 사용 코드를 voice 인터페이스로 래핑한 것.
 * 엔진이 현재 코드의 MIDI 배열을 frequency로 변환해 trigger.
 */

import { midiToFrequency } from '@/lib/theory/chord-voicing';

import { getTone } from '../../tone-bridge';

export interface KeysVoice {
  trigger(midiNotes: number[], duration: string, time: number): void;
  /** PolySynth.releaseAll로 모든 보이스 release. */
  stop(): void;
  dispose(): void;
}

type PolySynthLike = {
  toDestination(): PolySynthLike;
  triggerAttackRelease(freqs: number[], duration: string, time: number): void;
  releaseAll(): void;
  dispose(): void;
};

export function createKeysVoice(): KeysVoice {
  const Tone = getTone();
  const synth = new Tone.PolySynth().toDestination() as unknown as PolySynthLike;

  return {
    trigger(midiNotes, duration, time) {
      synth.triggerAttackRelease(midiNotes.map(midiToFrequency), duration, time);
    },
    stop() {
      synth.releaseAll();
    },
    dispose() {
      synth.dispose();
    },
  };
}
