/**
 * 마디 단위 스케줄러 — LookaheadScheduler 위에 얹는 추상화.
 *
 * 역할:
 *   BPM + 박수(beatsPerBar)로부터 마디 길이(intervalSeconds)를 계산해
 *   LookaheadScheduler에 주입한다. tick마다 (eventTime, barIndex)를 onBar로 전달.
 *
 * 왜 scheduleAhead를 마디 길이의 50%로 상향하는가:
 *   기본 scheduleAhead(100ms)는 빠른 박자엔 충분하지만, 느린 BPM(예: 60 BPM 4/4 = 4초짜리
 *   마디)에서 백그라운드 탭 복귀나 GC 스파이크가 발생하면 다음 마디 예약이 통째로 누락될 수 있다.
 *   마디 길이의 절반을 미리 예약 창으로 확보하면 한 마디 이상의 여유가 생긴다.
 *
 * BPM 변경:
 *   setBpm 호출 즉시 interval과 scheduleAhead가 갱신된다.
 *   이미 LookaheadScheduler에 예약된 이벤트(다음 tick까지의 시간)는 그대로 재생되고,
 *   그 이후부터 새 BPM이 적용된다.
 */

import type { LookaheadScheduler } from './lookahead-scheduler';

export interface BarScheduler {
  /**
   * 스케줄러 시작.
   * @param bpm - 분당 박자 수
   * @param beatsPerBar - 박수 (4/4박이면 4)
   * @param onBar - 마디 시작 시각(AudioContext 기준 절대 시각)과 0-베이스 마디 인덱스를 받는 콜백
   */
  start(bpm: number, beatsPerBar: number, onBar: (eventTime: number, barIndex: number) => void): void;
  /** 스케줄러 정지. 이미 예약된 오디오 이벤트는 AudioContext가 자체 처리한다. */
  stop(): void;
  /**
   * 실행 중 BPM 변경.
   * 다음 LookaheadScheduler tick 이후부터 새 BPM 간격이 적용된다.
   */
  setBpm(bpm: number): void;
}

export interface BarSchedulerOptions {
  lookahead: LookaheadScheduler;
}

export function createBarScheduler(options: BarSchedulerOptions): BarScheduler {
  const { lookahead } = options;
  // 현재 박수를 클로저에 보관 — setBpm에서도 재계산에 필요
  let beatsPerBar = 4;
  // 실행 중 여부 플래그 — stop 이후 tick 콜백이 onBar를 호출하지 않도록 방어
  let running = false;
  // 단조증가 마디 인덱스
  let barIndex = 0;
  let onBar: ((eventTime: number, barIndex: number) => void) | null = null;

  /**
   * BPM으로부터 마디 길이를 계산해 LookaheadScheduler에 적용하는 내부 헬퍼.
   * start와 setBpm 양쪽에서 호출한다.
   */
  function applyBpm(bpm: number): void {
    // 마디 길이(초) = 4분음표 한 박의 길이 × 박수
    const barLengthSec = (60 / bpm) * beatsPerBar;
    lookahead.setIntervalSeconds(barLengthSec);
    // 마디 길이의 50%를 scheduleAhead로 설정 — 느린 BPM에서 누락 방지
    lookahead.setScheduleAhead(barLengthSec * 0.5);
  }

  return {
    start(bpm, _beatsPerBar, cb) {
      beatsPerBar = _beatsPerBar;
      running = true;
      barIndex = 0;
      onBar = cb;
      // interval과 scheduleAhead를 먼저 설정한 뒤 lookahead.start 호출
      applyBpm(bpm);
      lookahead.start((eventTime) => {
        // stop() 이후 혹시 남아있는 Worker tick이 들어왔을 때를 방어
        if (!running || !onBar) return;
        const idx = barIndex;
        barIndex += 1;
        onBar(eventTime, idx);
      });
    },

    stop() {
      running = false;
      onBar = null;
      lookahead.stop();
    },

    setBpm(bpm) {
      // 실행 중이 아닐 때도 호출 허용 — 다음 start()에서 applyBpm이 다시 계산하므로 무해
      applyBpm(bpm);
    },
  };
}
