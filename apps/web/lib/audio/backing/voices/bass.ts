/**
 * GM 베이스 샘플 voice (Sprint 2-4).
 * Sprint 2-3의 MonoSynth 합성 베이스 대체.
 *
 * 단일 MIDI 노트 trigger. duration은 caller가 BPM 비례로 결정해 넘긴다(예: 4분음 = 60/bpm).
 */

import { getAudioContext } from '../../context';
import { getPlayer, type LoadedInstrument } from '../webaudiofont-bridge';

export interface BassVoice {
  trigger(midi: number, preset: LoadedInstrument, durationSec: number, time: number, velocity?: number): void;
  fadeOut(): void;
  dispose(): void;
}

export function createBassVoice(): BassVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(ctx.destination);

  return {
    trigger(midi, preset, durationSec, time, velocity = 0.9) {
      getPlayer().queueWaveTable(ctx, gain, preset.patch, time, midi, durationSec, velocity);
    },
    fadeOut() {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.01);
      // 100ms 후 1.0 복구 — 다음 start 즉시 재사용 가능
      setTimeout(() => {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
      }, 100);
    },
    dispose() {
      gain.disconnect();
    },
  };
}
