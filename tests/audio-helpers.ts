// tests/audio-helpers.ts
// vi는 vitest globals가 활성화된 경우 전역 사용 가능하지만,
// vitest.config.ts에서 globals: true를 설정하지 않은 경우를 대비해 명시적으로 import한다.
import { vi } from 'vitest';

// ──────────────────────────────────────────────
// 오디오 타이밍 테스트를 위한 공용 헬퍼 모음.
//
// 왜 이 파일이 필요한가:
//   실제 AudioContext는 테스트 환경에서 사용 불가능하고,
//   오디오 출력 자체를 검증하는 것은 의미 없다.
//   대신 "스케줄러가 어떤 시각에 어떤 이벤트를 예약했는가"를
//   Spy 객체로 캡처해서 검증한다.
//
// Phase 1에서 MetronomeScheduler가 구현되면 이 헬퍼를 주입 인터페이스로 활용한다.
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

/** 스케줄러가 예약한 단일 오디오 이벤트 */
export interface ScheduledEvent {
  /** Web Audio API 기준 절대 시각 (초 단위) */
  time: number;
  /** click: 일반 박자, accent: 강박(1번 박자), sub: 서브디비전 */
  type: 'click' | 'accent' | 'sub';
}

/** 스케줄러에 주입하는 Spy 인터페이스 */
export interface SchedulerSpy {
  /** 예약된 이벤트가 순서대로 쌓인다 */
  scheduledEvents: ScheduledEvent[];
  /** 다음 테스트를 위해 기록을 초기화한다 */
  reset(): void;
  /**
   * 스케줄러가 이벤트를 예약할 때 호출하는 메서드.
   * 실제 AudioContext 대신 이 메서드를 호출하도록 스케줄러를 설계한다.
   */
  record(event: ScheduledEvent): void;
}

// ──────────────────────────────────────────────
// createSchedulerSpy
// ──────────────────────────────────────────────

/**
 * 오디오 타이밍 Spy 생성 팩토리.
 *
 * 사용 예:
 * ```ts
 * const spy = createSchedulerSpy();
 * const scheduler = new MetronomeScheduler({ audioContext: mockCtx, spy });
 * scheduler.start({ bpm: 120, timeSignature: { numerator: 4, denominator: 4 } });
 * mockCtx.advanceTime(10);
 * expect(spy.scheduledEvents).toHaveLength(80); // 120 BPM × 10초 = 20박 × 4 = 80
 * expect(spy.scheduledEvents[0]).toMatchObject({ type: 'accent' });
 * expect(spy.scheduledEvents[1].time - spy.scheduledEvents[0].time).toBeCloseTo(0.5, 3);
 * ```
 */
export function createSchedulerSpy(): SchedulerSpy {
  const scheduledEvents: ScheduledEvent[] = [];

  return {
    scheduledEvents,
    reset() {
      // 배열 참조를 유지하면서 내용만 비워야 기존 참조를 들고 있는 테스트도 영향 받는다
      scheduledEvents.length = 0;
    },
    record(event: ScheduledEvent) {
      scheduledEvents.push(event);
    },
  };
}

// ──────────────────────────────────────────────
// MockAudioContext 타입 정의
// ──────────────────────────────────────────────

/** createMockAudioContext()가 반환하는 타입 */
export interface MockAudioContext {
  /**
   * 현재 AudioContext 시각 (초 단위).
   * 실제 AudioContext는 자동으로 증가하지만,
   * mock은 advanceTime()으로만 변경된다 — 결정론적 테스트를 보장하기 위해.
   */
  currentTime: number;

  /**
   * 시각을 수동으로 앞으로 이동시킨다.
   * 스케줄러의 lookahead 루프가 이 시각을 기준으로 이벤트를 예약하므로,
   * advanceTime()을 호출하면 해당 시간 구간의 이벤트들이 spy에 기록된다.
   */
  advanceTime(seconds: number): void;

  /** AudioBufferSourceNode stub — start/stop 호출 횟수 추적 */
  createBufferSource: ReturnType<typeof vi.fn>;

  /** GainNode stub */
  createGain: ReturnType<typeof vi.fn>;

  /**
   * AudioBuffer stub을 반환한다.
   * 실제 PCM 데이터가 필요 없으므로 duration만 설정한 fake buffer를 반환한다.
   */
  createBuffer: ReturnType<typeof vi.fn>;

  /**
   * 실제 디코딩 없이 즉시 fake AudioBuffer를 resolve한다.
   * 샘플 로딩 로직을 테스트할 때 네트워크·디코딩 지연을 제거하기 위해.
   */
  decodeAudioData: ReturnType<typeof vi.fn>;

  /** AudioContext.destination stub */
  destination: AudioNode;

  /** AudioContext.sampleRate (44100 고정) */
  sampleRate: number;
}

// ──────────────────────────────────────────────
// createMockAudioContext
// ──────────────────────────────────────────────

/**
 * 테스트용 AudioContext 팩토리.
 *
 * 왜 직접 만드는가:
 *   jest-environment-jsdom / vitest jsdom 모두 Web Audio API를 지원하지 않는다.
 *   `new AudioContext()`는 에러를 던지므로 완전한 stub이 필요하다.
 *
 * 사용 예:
 * ```ts
 * const mockCtx = createMockAudioContext();
 * expect(mockCtx.currentTime).toBe(0);
 * mockCtx.advanceTime(2.5);
 * expect(mockCtx.currentTime).toBe(2.5);
 * ```
 */
export function createMockAudioContext(): MockAudioContext {
  // currentTime은 let으로 관리하고, 게터로 노출해 외부에서 읽기 전용처럼 보이게 한다
  let _currentTime = 0;

  // destination stub — connect() 등 chaining을 허용하기 위해 최소 구현
  const destination = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;

  // AudioBufferSourceNode stub 팩토리
  const createBufferSourceNode = () => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  });

  // GainNode stub 팩토리
  const createGainNode = () => ({
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  // AudioBuffer stub — duration과 채널 수만 유의미하게 설정
  const createAudioBuffer = (
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ) => ({
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  });

  return {
    get currentTime() {
      return _currentTime;
    },

    advanceTime(seconds: number) {
      // 음수 진행은 물리적으로 불가능 — 명시적 에러로 테스트 실수를 빠르게 잡는다
      if (seconds < 0) {
        throw new Error(`advanceTime: seconds는 0 이상이어야 합니다. 전달된 값: ${seconds}`);
      }
      _currentTime += seconds;
    },

    createBufferSource: vi.fn(createBufferSourceNode),
    createGain: vi.fn(createGainNode),
    createBuffer: vi.fn(createAudioBuffer),

    // ArrayBuffer를 받아 즉시 fake AudioBuffer를 resolve
    // 실제 mp3/wav 파싱이 없으므로 1초짜리 모노 버퍼를 반환
    decodeAudioData: vi.fn((_arrayBuffer: ArrayBuffer) =>
      Promise.resolve(createAudioBuffer(1, 44100, 44100)),
    ),

    destination,
    sampleRate: 44100,
  };
}
