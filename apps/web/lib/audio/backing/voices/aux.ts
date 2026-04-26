/**
 * Aux percussion voice — Sprint 2-8 PR-A.
 *
 * funk(shaker) / bossa(clave) 같은 보조 percussion. smplr Soundfont로
 * woodblock/percussive_organ 같은 적절한 GM 사운드를 트리거.
 *
 * 패턴 데이터의 BeatStep은 시간만 갖고 음높이는 voice 내부 고정 — clave는
 * D5(MIDI 75), shaker는 C4(MIDI 60). 텍스처 용도라 정확한 음정은 무관.
 *
 * velocity는 0~1 패턴 데이터를 0~127 MIDI 범위로 변환해 smplr에 전달한다.
 */

import type { Soundfont } from 'smplr';

import { getAudioContext } from '../../context';

const AUX_NOTE_DURATION_SEC = 0.15;
const AUX_DEFAULT_VELOCITY = 0.6;
// 두 종류 모두 고정 음 — clave는 wood block 느낌으로 높은 음, shaker는 중간 음.
const AUX_NOTE_BY_KIND = { shaker: 60, clave: 75 } as const;

type StopFn = (time?: number) => void;

export interface AuxVoice {
  trigger(soundfont: Soundfont, kind: 'shaker' | 'clave', time: number, velocity?: number): void;
  fadeOut(): void;
  /** 모든 예약/재생 중인 음 즉시 취소. drums.ts 주석 참조. */
  cancelScheduled(): void;
  dispose(): void;
}

/**
 * destination이 주어지면 그 노드로 연결(엔진 master gain). 없으면 ctx.destination.
 *
 * aux voice의 GainNode는 voice 자체 fade-out 신호용.
 * smplr Soundfont는 자체 destination을 가지므로, 오디오 경로는
 * loadBundle 시 smplr-bridge가 ctx.destination으로 연결한 상태.
 * fadeOut은 voice gain 노드를 형식적으로 두되, smplr이 이미 출력을 담당한다.
 */
export function createAuxVoice(destination?: AudioNode): AuxVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(destination ?? ctx.destination);

  const pendingStops: StopFn[] = [];

  return {
    trigger(soundfont, kind, time, velocity = AUX_DEFAULT_VELOCITY) {
      // velocity 0~1을 smplr 요구 0~127 범위로 변환
      const stop = soundfont.start({
        note: AUX_NOTE_BY_KIND[kind],
        time,
        duration: AUX_NOTE_DURATION_SEC,
        velocity: Math.max(0, Math.min(127, Math.round(velocity * 127))),
      }) as unknown as StopFn;
      pendingStops.push(stop);
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
