/**
 * GM 드럼킷 voice — Sprint 2-8 PR-A에서 webaudiofont에서 smplr DrumMachine으로 교체.
 *
 * voice는 stateless: DrumMachine 인스턴스를 매 trigger마다 인자로 받음.
 * 카드(카테고리) 전환 시 voice 객체 재사용, drumMachine만 swap.
 *
 * note는 string ('kick', 'snare', 'hat') — DrumMachine의 sample group name.
 * velocity는 0~1 패턴 데이터를 0~127 MIDI 범위로 변환해 smplr에 전달한다.
 */

import type { DrumMachine } from 'smplr';

import { getAudioContext } from '../../context';

/** smplr Smplr.start()가 반환하는 StopFn. 호출 시 미예약된 이벤트는 큐에서 제거,
 *  이미 재생된 voice는 stopById로 정지 (smplr 0.20.0 dist L1019-1031). */
type StopFn = (time?: number) => void;

export interface DrumVoice {
  /**
   * 드럼 스텝 트리거.
   *
   * step: 'kick' | 'snare' | 'hat' — DrumMachine의 sample group name.
   * drumMachine: smplr DrumMachine 인스턴스.
   * velocity: 0~1 패턴 범위 — 내부에서 0~127로 변환.
   */
  trigger(
    step: 'kick' | 'snare' | 'hat',
    drumMachine: DrumMachine,
    time: number,
    velocity?: number,
  ): void;
  /** 즉시 fade out — hardStop에서 already-attacked note 잔향 차단. */
  fadeOut(): void;
  /** 모든 예약/재생 중인 음을 즉시 취소·정지. smplr Smplr.stop()은 큐를 비우지
   *  않으므로 trigger마다 모은 StopFn을 호출하는 것이 신뢰 가능한 경로. */
  cancelScheduled(): void;
  dispose(): void;
}

/**
 * destination이 주어지면 그 노드로 연결(엔진의 master gain). 없으면 ctx.destination
 * 직접 연결로 폴백 — voice 자체가 다른 컨텍스트에서 재사용 가능하도록.
 */
export function createDrumVoice(destination?: AudioNode): DrumVoice {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.gain.value = 1.0;
  gain.connect(destination ?? ctx.destination);

  // 진행 중 세션의 StopFn 누적. cancelScheduled에서 일괄 호출 후 비움.
  const pendingStops: StopFn[] = [];

  return {
    trigger(step, drumMachine, time, velocity = 0.8) {
      // velocity 0~1을 smplr 요구 0~127 범위로 변환
      const stop = drumMachine.start({
        note: step,
        time,
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
        try { stop(); } catch { /* StopFn은 idempotent여야 — 이미 정지된 voice는 무시 */ }
      }
      pendingStops.length = 0;
    },
    dispose() {
      gain.disconnect();
    },
  };
}
