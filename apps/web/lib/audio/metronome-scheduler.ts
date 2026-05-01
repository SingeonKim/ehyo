import type {
  MetronomeScheduler,
  SchedulerConfig,
  SchedulerEvent,
  SchedulerListener,
} from './types';
import { SUBDIVISION_COUNT } from './types';
import { scheduleClick } from './sounds';
import { createLookaheadScheduler } from './scheduler/lookahead-scheduler';
import { unlockIosAudioSession } from './silent-unlock';

/*
 * Chris Wilson lookahead 스케줄러 — LookaheadScheduler 코어를 재사용한 버전.
 *
 * 핵심 로직:
 *   1. LookaheadScheduler가 Worker를 관리하고 25ms마다 onTick 콜백을 트리거한다.
 *   2. onTick이 불릴 때마다 "다음 예약할 이벤트 시각"이 currentTime + scheduleAhead
 *      안에 들어왔으면 오디오를 예약하고 다음 이벤트 시각 포인터를 전진한다.
 *   3. LookaheadScheduler의 intervalSeconds = LOOKAHEAD_MS / 1000(= 0.025)로 설정.
 *      이로 인해 한 Worker tick 당 onTick이 최대 4~5번 불릴 수 있지만,
 *      메트로놈 windowing이 자체 nextEventTime과 horizon 가드를 가지므로
 *      중복 호출은 완전히 idempotent하다 (두 번째 호출부터 while이 즉시 종료).
 *
 * Swing 처리:
 *   한 박을 8분음 2개로 나눌 때, 두 번째 8분음을 (1 + SWING_DELAY) × halfBeat
 *   만큼 뒤로 밀어 셔플 리듬 구현. 재즈 전형 ≈ 2:1 (delay ~0.33).
 */

const SWING_DELAY = 0.33; // 0 = 스트레이트, 0.33 ≈ 재즈 셔플, 0.5 = 3연음의 2음째

// LookaheadScheduler에 전달할 intervalSeconds.
// 값 자체는 메트로놈 windowing에서 무시되지만, LookaheadScheduler 내부 while이
// Worker tick당 onTick을 몇 번 부르는지에 영향을 준다.
// 0.025(= LOOKAHEAD_MS/1000)로 설정하면 한 tick에 최대 scheduleAhead/0.025 ≈ 4회 호출.
// 메트로놈 자체 windowing이 idempotent하므로 문제없음.
const LOOKAHEAD_SCHEDULER_INTERVAL_SEC = 0.025;

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

/**
 * 주어진 BPM·time signature·subdivision에서 한 tick(subdivision) 간격 초.
 *
 * BPM 해석 — 고정 4분음 기준 (클래식 MM 표기와 동일).
 *   ♩=120 의미: 4분음이 분당 120개. 따라서:
 *     4/4 @ 120 → 한 박(4분음) 0.5s, 한 마디 = 4×0.5 = 2s
 *     6/8 @ 120 → 한 박(8분음) 0.25s, 한 마디 = 6×0.25 = 1.5s  (빨라짐 ✓)
 *     2/2 @ 120 → 한 박(2분음) 1.0s, 한 마디 = 2×1.0 = 2s  (느려짐)
 *   공식: beatSec = (60/bpm) × (4/denominator)
 *
 * 이전 버전은 denominator를 무시해 6/8도 4/4와 같은 속도였다 — 6/8에서 사용자가
 * "8분음이 더 빨라져야 하는데 안 빨라진다"고 느끼는 원인.
 */
function tickInterval(config: SchedulerConfig): number {
  const beatSec = (60 / config.bpm) * (4 / config.timeSignature.denominator);
  return beatSec / SUBDIVISION_COUNT[config.subdivision];
}

export function createMetronomeScheduler(options: SchedulerOptions): MetronomeScheduler {
  const { audioContext, getConfig, spy } = options;

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

  // LookaheadScheduler 인스턴스 — Worker 관리와 tick 트리거를 위임한다.
  // isIOS를 그대로 전달해 scheduleAhead 보정을 LookaheadScheduler가 처리하게 한다.
  const lookahead = createLookaheadScheduler({
    audioContext,
    createWorker: options.createWorker,
    isIOS: options.isIOS,
  });

  // LookaheadScheduler 내부가 관리하는 scheduleAhead 값.
  // 메트로놈 windowing의 horizon 계산에 동일한 값을 써야 드리프트 없이 맞는다.
  // isIOS=true일 때 LookaheadScheduler 내부는 0.15를 쓰므로 여기도 맞춘다.
  // isIOS 옵션이 undefined면 LookaheadScheduler와 동일한 navigator 감지 로직에 맡긴다.
  // 단, 테스트에서는 isIOS: false를 명시적으로 전달하므로 0.1이 사용된다.
  const IOS_SCHEDULE_AHEAD = 0.15;
  const DEFAULT_SCHEDULE_AHEAD = 0.1;

  function resolveIsIOS(): boolean {
    if (options.isIOS !== undefined) return options.isIOS;
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  }

  const scheduleAhead = resolveIsIOS() ? IOS_SCHEDULE_AHEAD : DEFAULT_SCHEDULE_AHEAD;

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

  /**
   * Swing의 "현재가 두 번째 8분음이었는가"를 advancePointer 이전에 판별.
   *
   * currentSubdiv가 advance되기 전에 호출됨. swing 모드의 currentSubdiv === 1이면
   * 이번 예약이 off-beat이고 다음은 다음 박의 down-beat — delta = baseInterval * (1 - SWING).
   */
  function isSecondEighthBefore(config: SchedulerConfig): boolean {
    return config.subdivision === 'swing' && currentSubdiv === 1;
  }

  /**
   * Worker tick 처리 — lookahead 창 안에 있는 모든 이벤트를 예약.
   *
   * LookaheadScheduler가 매 Worker tick 당 이 함수를 여러 번 호출할 수 있다
   * (LOOKAHEAD_SCHEDULER_INTERVAL_SEC = 0.025 기준으로 한 tick당 최대 4~5회).
   * 그러나 자체 nextEventTime과 horizon 가드가 있어 중복 호출은 idempotent하다.
   * — 두 번째 이후 호출에서 while 조건이 이미 false이므로 즉시 종료.
   *
   * LookaheadScheduler가 전달하는 eventTime 인수는 사용하지 않는다.
   * 메트로놈은 BPM·swing·subdivision에 따라 박마다 다른 간격을 계산하므로
   * 고정 intervalSeconds 기반의 외부 포인터가 아닌 자체 nextEventTime을 써야 한다.
   */
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
      const delta = isSecondEighth
        ? baseInterval * (1 + SWING_DELAY)
        : baseInterval * (isSecondEighthBefore(config) ? 1 - SWING_DELAY : 1);
      nextEventTime += delta;

      advancePointer(config);
    }
  }

  return {
    get isRunning() {
      return running;
    },

    async start() {
      if (running) return;
      // iOS 무음 스위치 우회 — await 이전 동기 시점에 호출해 gesture 컨텍스트 보존.
      unlockIosAudioSession();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      running = true;
      currentBeat = 1;
      currentSubdiv = 0;
      // 5ms 버퍼로 시작 — 첫 이벤트를 안정적으로 예약
      nextEventTime = audioContext.currentTime + 0.05;

      // LookaheadScheduler에 intervalSeconds를 설정한다.
      // 이 값은 LookaheadScheduler 내부 포인터 전진에만 사용되며,
      // 메트로놈의 onTick은 이 포인터를 무시하고 자체 nextEventTime으로 동작한다.
      lookahead.setIntervalSeconds(LOOKAHEAD_SCHEDULER_INTERVAL_SEC);

      // onTick을 콜백으로 전달 — Worker tick마다 메트로놈 windowing 실행.
      // _eventTime 인수(LookaheadScheduler 내부 포인터)는 의도적으로 무시한다.
      lookahead.start((_eventTime: number) => {
        onTick();
      });
    },

    stop() {
      running = false;
      lookahead.stop();
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
