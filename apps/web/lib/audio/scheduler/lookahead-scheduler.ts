/**
 * Chris Wilson 패턴 lookahead 스케줄러.
 *
 * 메트로놈과 backing track 양쪽에서 공유하는 핵심 타이밍 모듈.
 *
 * 핵심 동작:
 *   1. Worker가 25ms마다 tick 메시지를 보낸다.
 *   2. tick 수신 시 [currentTime, currentTime + scheduleAhead] 윈도우 안의
 *      모든 다음 이벤트를 onTick으로 전달한다.
 *   3. onTick을 받은 caller가 AudioContext.currentTime 기준 절대 시각으로 오디오 예약.
 *
 * Worker 인스턴스는 caller별 독립 생성 — 공유 시 한쪽 stop이 다른쪽 ticker를
 * 멈추는 회귀가 발생한다.
 *
 * iOS 보정:
 *   baseLatency로 iOS Safari를 감지해 scheduleAhead를 0.15s로 상향.
 *   iOS는 AudioContext 처리 지연이 커서 100ms만으로는 드리프트가 생긴다.
 */

/** Worker에서 tick을 보내는 주기 (ms). 이 값은 scheduleAhead보다 항상 작아야 한다. */
const DEFAULT_LOOKAHEAD_MS = 25;

/** 미리 예약할 구간 (sec). JS 타이머 지터를 흡수하는 창. */
const DEFAULT_SCHEDULE_AHEAD_SEC = 0.1;

/** iOS Safari 보정값 — baseLatency가 높아 더 넓은 창 필요. */
const IOS_SCHEDULE_AHEAD_SEC = 0.15;

export interface LookaheadScheduler {
  /**
   * 스케줄러 시작. onTick은 예약할 다음 이벤트 시각을 받아 오디오를 예약해야 한다.
   * 이미 실행 중이면 no-op.
   */
  start(onTick: (eventTime: number) => void): void;
  /** 스케줄러 정지. 이미 예약된 오디오 이벤트는 AudioContext가 자체 처리한다. */
  stop(): void;
  /** 다음 이벤트까지의 간격 (초). 박자에 따라 동적으로 변경 가능. */
  setIntervalSeconds(seconds: number): void;
  /**
   * scheduleAhead를 동적으로 상향.
   * BarScheduler가 마디 길이의 50% 등으로 호출할 때 사용.
   * isIOS 기본값보다 작으면 무시된다.
   */
  setScheduleAhead(seconds: number): void;
}

export interface LookaheadOptions {
  audioContext: AudioContext;
  /**
   * 테스트에서 FakeWorker를 주입할 때 사용.
   * 운영 환경에서는 미지정 시 default factory가 worker.ts를 로드한다.
   */
  createWorker?: () => Worker;
  /** iOS 여부를 override. 미지정 시 navigator.userAgent로 자동 감지. */
  isIOS?: boolean;
}

/** iOS Safari 감지. navigator가 없는 SSR/테스트 환경에서는 false 반환. */
function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

/**
 * 운영용 Worker 생성 팩토리.
 * Next.js의 new Worker(new URL(...)) 패턴으로 번들러가 worker.ts를 별도 청크로 분리.
 */
function defaultCreateWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url));
}

export function createLookaheadScheduler(options: LookaheadOptions): LookaheadScheduler {
  const { audioContext } = options;
  const isIOS = options.isIOS ?? detectIOS();
  const createWorkerFn = options.createWorker ?? defaultCreateWorker;

  let worker: Worker | null = null;
  let running = false;
  // 기본 이벤트 간격. setIntervalSeconds로 변경 가능.
  let intervalSeconds = 0.5;
  // 미리 예약할 시간 창. iOS는 더 넓게.
  let scheduleAhead = isIOS ? IOS_SCHEDULE_AHEAD_SEC : DEFAULT_SCHEDULE_AHEAD_SEC;
  // 다음에 onTick으로 전달할 이벤트 시각 포인터.
  let nextEventTime = 0;
  let currentOnTick: ((eventTime: number) => void) | null = null;

  /**
   * Worker tick 처리.
   * currentTime + scheduleAhead 창 안에 들어온 모든 이벤트를 onTick에 전달.
   * "들어올 때까지 기다렸다가 while로 한 번에 처리"하는 것이 Chris Wilson 패턴의 핵심.
   */
  function handleMessage(e: MessageEvent): void {
    if ((e.data as { type?: string } | null)?.type !== 'tick') return;
    if (!running || !currentOnTick) return;

    const horizon = audioContext.currentTime + scheduleAhead;

    // 안전 가드: nextEventTime이 너무 뒤처진 경우 (stop 후 재시작, BPM 급변 등)
    // 현재 시각에서 약간 앞으로 재정렬해 누적 이벤트 폭발을 방지한다.
    if (nextEventTime < audioContext.currentTime - scheduleAhead) {
      nextEventTime = audioContext.currentTime + 0.05;
    }

    while (nextEventTime < horizon) {
      currentOnTick(nextEventTime);
      nextEventTime += intervalSeconds;
    }
  }

  return {
    start(onTick) {
      // 이미 실행 중이면 중복 시작 방지
      if (running) return;
      running = true;
      currentOnTick = onTick;
      // 5ms 버퍼: 첫 이벤트를 안정적으로 예약하기 위한 최소 여유
      nextEventTime = audioContext.currentTime + 0.05;

      // Worker를 아직 생성하지 않은 경우에만 생성 — start/stop 반복 시 재사용
      if (!worker) {
        worker = createWorkerFn();
        worker.addEventListener('message', handleMessage);
      }
      worker.postMessage({ type: 'start', intervalMs: DEFAULT_LOOKAHEAD_MS });
    },

    stop() {
      running = false;
      currentOnTick = null;
      worker?.postMessage({ type: 'stop' });
      // Worker 자체는 유지 — 다음 start()에서 재사용
    },

    setIntervalSeconds(seconds: number) {
      intervalSeconds = seconds;
    },

    setScheduleAhead(seconds: number) {
      // iOS 기본값보다 작은 값은 무시 — 최솟값 보장
      const baseAhead = isIOS ? IOS_SCHEDULE_AHEAD_SEC : DEFAULT_SCHEDULE_AHEAD_SEC;
      scheduleAhead = Math.max(baseAhead, seconds);
    },
  };
}
