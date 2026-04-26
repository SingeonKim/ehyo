/**
 * Guitar strumming voice — Sprint 2-8 PR-A.
 *
 * smplr Soundfont는 queueStrumDown/Up 같은 strum 헬퍼가 없다. 6음을 12ms
 * 간격으로 시간차 트리거해 strum 효과를 직접 합성한다.
 * down = 저음 먼저(오름차순), up = 고음 먼저(내림차순).
 *
 * velocity는 0~1 패턴 데이터를 0~127 MIDI 범위로 변환해 smplr에 전달한다.
 */

import type { Soundfont } from 'smplr';

import { getAudioContext } from '../../context';

const STRUM_STAGGER_SEC = 0.012; // 12ms per string — 일반 다운 스트럼 속도

type StopFn = (time?: number) => void;

export interface GuitarVoice {
  strum(
    direction: 'down' | 'up',
    midiNotes: readonly number[],
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
export function createGuitarVoice(destination?: AudioNode): GuitarVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(destination ?? ctx.destination);

  const pendingStops: StopFn[] = [];

  return {
    strum(direction, midiNotes, soundfont, durationSec, time, velocity = 0.6, velocityScale = 1) {
      // down: 저음 → 고음(오름차순), up: 고음 → 저음(내림차순)
      const sorted = [...midiNotes].sort((a, b) => a - b);
      const order = direction === 'down' ? sorted : sorted.reverse();
      // velocity × velocityScale를 [0,1]로 clamp 후 smplr 0~127 변환 (루프 밖 1회 계산)
      const scaled = Math.max(0, Math.min(1, velocity * velocityScale));
      const v = Math.max(0, Math.min(127, Math.round(scaled * 127)));
      order.forEach((note, i) => {
        const stop = soundfont.start({
          note,
          time: time + i * STRUM_STAGGER_SEC,
          duration: durationSec,
          velocity: v,
        }) as unknown as StopFn;
        pendingStops.push(stop);
      });
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
