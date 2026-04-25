/**
 * 합성 드럼 보이스 — Kick(MembraneSynth) + Snare(NoiseSynth) + Hi-hat(MetalSynth).
 *
 * 외부 샘플 없이 Tone.js 내장 신스로 구성. 음색 파라미터는 spec §6.
 * Sprint 2-3 PoC 범위로, 카테고리별 분기는 없다.
 *
 * 단일 AudioContext 원칙:
 *   getTone()을 통해 tone-bridge 경유로 Tone에 접근. 직접 import 금지.
 *
 * stop() vs dispose():
 *   stop()은 envelope을 강제 종료(노드 유지) — start/stop 사이클에서 재사용.
 *   dispose()는 Web Audio 노드 해제 — 엔진 dispose 시에만.
 */

import { getTone } from '../../tone-bridge';

export interface DrumVoice {
  trigger(step: 'kick' | 'snare' | 'hat', time: number, velocity?: number): void;
  stop(): void;
  dispose(): void;
}

type SynthLike = {
  toDestination(): SynthLike;
  triggerAttackRelease(...args: unknown[]): void;
  triggerRelease?(time?: number): void;
  dispose(): void;
};

export function createDrumVoice(): DrumVoice {
  const Tone = getTone();

  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).toDestination() as unknown as SynthLike;

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
  }).toDestination() as unknown as SynthLike;

  // Hat: sustain:0 명시 — MetalSynth 기본 envelope sustain은 1이라 stop 시 잔향.
  // frequency는 Signal이라 options에 못 넣음 — 인스턴스 생성 후 별도 설정.
  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).toDestination() as unknown as SynthLike & {
    frequency?: { value: number };
  };
  if (hat.frequency) hat.frequency.value = 250;

  return {
    trigger(step, time, velocity = 0.8) {
      if (step === 'kick') {
        kick.triggerAttackRelease('C1', '8n', time, velocity);
      } else if (step === 'snare') {
        snare.triggerAttackRelease('16n', time, velocity);
      } else {
        hat.triggerAttackRelease('32n', time, velocity);
      }
    },
    stop() {
      const Tone = getTone();
      const now = Tone.now();
      kick.triggerRelease?.(now);
      snare.triggerRelease?.(now);
      hat.triggerRelease?.(now);
    },
    dispose() {
      kick.dispose();
      snare.dispose();
      hat.dispose();
    },
  };
}
