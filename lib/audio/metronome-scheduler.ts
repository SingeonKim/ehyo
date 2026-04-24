import type {
  MetronomeScheduler,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerListener,
} from './types';
import { LOOKAHEAD_MS, SCHEDULE_AHEAD_IOS_SEC, SCHEDULE_AHEAD_SEC, SUBDIVISION_COUNT } from './types';
import { scheduleClick } from './sounds';

/*
 * Chris Wilson lookahead 스케줄러.
 *
 * 핵심 로직:
 *   1. Worker가 LOOKAHEAD_MS(25ms)마다 메인 스레드에 'tick' 메시지를 보냄.
 *   2. tick 수신 시 "다음 예약할 이벤트의 시각"이 currentTime + scheduleAheadTime
 *      보다 작으면 = 이 lookahead 창 안에 들어왔으면 — 실제 오디오를 예약하고
 *      다음 이벤트 시각을 계산해 포인터 전진.
 *   3. 그렇지 않으면 패스 (다음 틱에서 재검토).
 *
 * 이 구조가 setInterval 단독보다 정확한 이유:
 *   - 오디오 예약은 AudioContext의 샘플-정확 clock에 맡김
 *   - JS 타이머의 지터(± 수 ms)는 lookahead 창(100ms)으로 흡수됨
 *   - 창을 넘어서면 예약이 밀리므로 창 < lookahead 간격이면 무조건 catch up
 *
 * Swing 처리:
 *   한 박을 8분음 2개로 나눌 때, 두 번째 8분음을 (1 + SWING_DELAY) × halfBeat
 *   만큼 뒤로 밀어 셔플 리듬 구현. 재즈 전형 ≈ 2:1 (delay ~0.33).
 */

const SWING_DELAY = 0.33; // 0 = 스트레이트, 0.33 ≈ 재즈 셔플, 0.5 = 3연음의 2음째

interface SchedulerOptions {
  audioContext: AudioContext;
  /** 현재 config를 읽는 함수 — 스토어 구독을 여기서 추상화. */
  getConfig: () => SchedulerConfig;
  /** Web Worker. 테스트 시에는 fake worker 주입 가능. */
  createWorker?: () => Worker;
  /** 테스트 spy — 이벤트가 "예약된" 시점 기록. */
  spy?: SchedulerListener;
  /**
   * 플랫폼 보정용 override. 미지정 시 navigator.userAgent로 iOS 판별.
   * 테스트에서는 false 고정 권장.
   */
  isIOS?: boolean;
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

/** 주어진 BPM·subdivision에서 한 tick(subdivision) 간격 초. */
function tickInterval(config: SchedulerConfig): number {
  const beatSec = 60 / config.bpm;
  return beatSec / SUBDIVISION_COUNT[config.subdivision];
}

export function createMetronomeScheduler(options: SchedulerOptions): MetronomeScheduler {
  const { audioContext, getConfig, spy } = options;
  const isIOS = options.isIOS ?? detectIOS();
  const scheduleAhead = isIOS ? SCHEDULE_AHEAD_IOS_SEC : SCHEDULE_AHEAD_SEC;

  let worker: Worker | null = null;
  let running = false;
  /** 다음에 예약할 이벤트의 AudioContext 시각. */
  let nextEventTime = 0;
  /** 한 마디 내 박(1..numerator). */
  let currentBeat = 1;
  /** 한 박 내 서브디비전 인덱스. */
  let currentSubdiv = 0;
  /** 출력 gain — stop 시 즉시 끊기 위함. */
  const master = audioContext.createGain();
  master.gain.value = 1;
  master.connect(audioContext.destination);

  const listeners = new Set<SchedulerListener>();

  function advancePointer(config: SchedulerConfig): void {
    const subdivCount = SUBDIVISION_COUNT[config.subdivision];
    currentSubdiv += 1;
    if (currentSubdiv >= subdivCount) {
      currentSubdiv = 0;
      currentBeat += 1;
      if (currentBeat > config.timeSignature.numerator) {
        currentBeat = 1;
      }
    }
  }

  /** 현재 예약 포인터에 대해 오디오 + 이벤트 발행. */
  function dispatchAt(time: number, config: SchedulerConfig): void {
    const isFirstSubdiv = currentSubdiv === 0;
    const isFirstBeat = currentBeat === 1 && isFirstSubdiv;
    const isAccent = config.accentBeatOne && isFirstBeat;

    const type: SchedulerEvent['type'] = isAccent
      ? 'accent'
      : isFirstSubdiv
        ? 'beat'
        : 'sub';

    // 오디오 예약 — 테스트에서는 mock ctx라 no-op일 수도 있음
    scheduleClick(audioContext, master, {
      time,
      soundType: config.soundType,
      isAccent,
      volume: config.volume,
      isSubdiv: !isFirstSubdiv,
    });

    const event: SchedulerEvent = {
      time,
      beat: currentBeat,
      subdivIndex: currentSubdiv,
      isAccent,
      type,
    };

    spy?.(event);
    listeners.forEach((l) => l(event));
  }

  /** Worker tick 처리 — lookahead 내에 있는 모든 이벤트를 예약. */
  function onTick(): void {
    if (!running) return;
    const config = getConfig();
    const horizon = audioContext.currentTime + scheduleAhead;

    // 안전 가드: 구성이 바뀌어 nextEventTime이 너무 뒤처졌다면 현재 시각에서 재시작
    if (nextEventTime < audioContext.currentTime - 0.1) {
      nextEventTime = audioContext.currentTime + 0.05;
    }

    while (nextEventTime < horizon) {
      dispatchAt(nextEventTime, config);

      // Swing: 8th subdivision 두 번째에만 지연 적용
      const baseInterval = tickInterval(config);
      const isSecondEighth = config.subdivision === 'swing' && currentSubdiv === 0;
      const delta = isSecondEighth ? baseInterval * (1 + SWING_DELAY) : baseInterval * (isSecondEighthBefore(config) ? 1 - SWING_DELAY : 1);
      nextEventTime += delta;

      advancePointer(config);
    }
  }

  /** Swing의 "현재가 두 번째 8분음이었는가"를 advancePointer 이전에 판별. */
  function isSecondEighthBefore(config: SchedulerConfig): boolean {
    // currentSubdiv가 advance되기 전에 호출됨. swing 모드의 currentSubdiv === 1이면
    // 이번 예약이 off-beat이고 다음은 다음 박의 down-beat — delta = baseInterval * (1 - SWING).
    // 실제 로직은 위 삼항에서 반전되어 적용됨. 이 헬퍼는 가독성용.
    return config.subdivision === 'swing' && currentSubdiv === 1;
  }

  function handleMessage(e: MessageEvent): void {
    if ((e.data as { type?: string } | null)?.type === 'tick') {
      onTick();
    }
  }

  return {
    get isRunning() {
      return running;
    },

    async start() {
      if (running) return;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      running = true;
      currentBeat = 1;
      currentSubdiv = 0;
      // 5ms 버퍼로 시작 — 첫 이벤트를 안정적으로 예약
      nextEventTime = audioContext.currentTime + 0.05;

      const create = options.createWorker;
      if (!worker && create) {
        worker = create();
        worker.addEventListener('message', handleMessage);
      }
      worker?.postMessage({ type: 'start', intervalMs: LOOKAHEAD_MS });
    },

    stop() {
      running = false;
      worker?.postMessage({ type: 'stop' });
      // 이미 예약된 노트는 AudioContext 스레드에서 자체 종료되므로 별도 취소 X.
      // 단 master gain을 일시 음소거 → 즉시 정적. 재시작 시 복원.
      try {
        master.gain.cancelScheduledValues(audioContext.currentTime);
        master.gain.setValueAtTime(0, audioContext.currentTime);
        master.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.02);
      } catch {
        // mock context에서 실패 가능 — 무시
      }
    },

    updateConfig(_next) {
      // config는 getConfig() 참조로 실시간 반영. BPM 변화 시 다음 틱부터 새 간격.
      // 강한 동기화(예약 큐 플러시)는 이번 버전에선 생략. 가벼운 변경은 자연히 수렴.
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
