/**
 * 기타 strumming voice — Sprint 2-3의 keys.ts(PolySynth 블록 코드) 대체.
 *
 * WebAudioFont의 queueStrumDown/Up이 코드 톤 배열을 시간차로 훑어줌(자동
 * 슬라이스). durationSec은 caller(engine)가 BPM 비례로 계산해 넘긴다 —
 * 일반적으로 min(0.4, beatSec * 0.4). 그래야 빠른 BPM에서 strum이 박을 넘지 않음.
 */

import { getAudioContext } from '../../context';
import { getPlayer, type LoadedInstrument } from '../webaudiofont-bridge';

export interface GuitarVoice {
  strum(
    direction: 'down' | 'up',
    midiNotes: number[],
    preset: LoadedInstrument,
    durationSec: number,
    time: number,
    velocity?: number,
  ): void;
  fadeOut(): void;
  dispose(): void;
}

export function createGuitarVoice(): GuitarVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(ctx.destination);

  return {
    strum(direction, midiNotes, preset, durationSec, time, velocity = 0.6) {
      const player = getPlayer();
      if (direction === 'down') {
        player.queueStrumDown(ctx, gain, preset.patch, time, midiNotes, durationSec, velocity);
      } else {
        player.queueStrumUp(ctx, gain, preset.patch, time, midiNotes, durationSec, velocity);
      }
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
