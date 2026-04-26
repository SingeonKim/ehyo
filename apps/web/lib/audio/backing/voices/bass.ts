/**
 * Bass voice — Sprint 2-8 PR-A에서 smplr Soundfont로 교체.
 *
 * 단일 MIDI 노트 trigger. duration은 caller가 BPM 비례로 결정.
 * velocity는 0~1 패턴 데이터를 0~127 MIDI 범위로 변환해 smplr에 전달한다.
 */

import type { Soundfont } from 'smplr';

import { getAudioContext } from '../../context';

type StopFn = (time?: number) => void;

export interface BassVoice {
  trigger(
    midi: number,
    soundfont: Soundfont,
    durationSec: number,
    time: number,
    velocity?: number,
    velocityScale?: number,
  ): void;
  /** voice 내부 GainNode 스케일 즉시 세팅. 카드 시작 시 프로파일 voiceGain 적용. */
  setVoiceGain(scale: number): void;
  fadeOut(): void;
  /** 모든 예약/재생 중인 음 즉시 취소. drums.ts 주석 참조. */
  cancelScheduled(): void;
  dispose(): void;
}

/** destination이 주어지면 그 노드로 연결(엔진 master gain). 없으면 ctx.destination. */
export function createBassVoice(destination?: AudioNode): BassVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(destination ?? ctx.destination);

  const pendingStops: StopFn[] = [];

  return {
    trigger(midi, soundfont, durationSec, time, velocity = 0.9, velocityScale = 1) {
      // velocity × velocityScale를 [0,1]로 clamp한 뒤 smplr 요구 0~127 범위로 변환
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const stop = soundfont.start({
        note: midi,
        time,
        duration: durationSec,
        velocity: Math.max(0, Math.min(127, Math.round(scaled * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
    },
    setVoiceGain(scale: number) {
      // 카드 시작 시 프로파일 voiceGain을 즉시 반영 — ramp 없이 setValueAtTime 사용
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0, scale), t);
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
    cancelScheduled() {
      for (const stop of pendingStops) {
        try { stop(); } catch { /* idempotent */ }
      }
      pendingStops.length = 0;
    },
    dispose() {
      gain.disconnect();
    },
  };
}
