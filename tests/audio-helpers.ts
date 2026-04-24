// tests/audio-helpers.ts
// vi는 vitest globals가 활성화된 경우 전역 사용 가능하지만,
// vitest.config.ts에서 globals: true를 설정하지 않은 경우를 대비해 명시적으로 import한다.
import { vi } from 'vitest';

/*
 * 오디오 테스트 헬퍼 모음 — MockAudioContext + MockWorker + 편의 Spy.
 *
 * 전략:
 *   실 AudioContext는 jsdom에서 사용 불가. 스케줄러는 AudioContext와 Worker를
 *   주입받으므로 mock을 넣어 "예약된 시각 배열이 BPM에 맞는가"만 검증.
 */

// ──────────────────────────────────────────────
// MockAudioContext
// ──────────────────────────────────────────────

export interface MockAudioContext {
  /** AudioContext 모양으로 쓸 수 있는 객체. 스케줄러에 그대로 주입. */
  readonly ctx: AudioContext;
  /** 초 단위로 currentTime을 전진. 각 스텝마다 onAdvance 콜백(예: worker.fireTick). */
  advance(seconds: number, onAdvance?: (tNow: number) => void): void;
  /** 현재 mock 시각. */
  currentTime(): number;
}

export function createMockAudioContext(): MockAudioContext {
  let t = 0;

  const makeOscillator = () => ({
    type: 'sine' as OscillatorType,
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  });

  const makeGain = () => ({
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  const makeBufferSource = () => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  });

  const makeBuffer = (numberOfChannels: number, length: number, sampleRate: number) => ({
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  });

  // `ctx` 형태의 유사 AudioContext — 스케줄러·sounds.ts가 요구하는 메서드들.
  const stub = {
    get currentTime() {
      return t;
    },
    state: 'running' as AudioContextState,
    sampleRate: 44100,
    destination: {
      connect: vi.fn(),
      disconnect: vi.fn(),
    },
    createOscillator: vi.fn(makeOscillator),
    createGain: vi.fn(makeGain),
    createBufferSource: vi.fn(makeBufferSource),
    createBuffer: vi.fn(makeBuffer),
    decodeAudioData: vi.fn((_ab: ArrayBuffer) =>
      Promise.resolve(makeBuffer(1, 44100, 44100) as unknown as AudioBuffer),
    ),
    resume: vi.fn(async () => {
      (stub as { state: AudioContextState }).state = 'running';
    }),
    close: vi.fn(async () => {}),
  };

  const ctx = stub as unknown as AudioContext;

  return {
    ctx,
    advance(seconds, onAdvance) {
      if (seconds < 0) {
        throw new Error(`advance: seconds는 0 이상이어야 합니다. 전달된 값: ${seconds}`);
      }
      // 25ms 스텝으로 나눠 전진 — 스케줄러 tick 주기와 맞춰 worker.fireTick 트리거.
      const stepSec = 0.025;
      const steps = Math.max(1, Math.round(seconds / stepSec));
      for (let i = 0; i < steps; i++) {
        t += stepSec;
        onAdvance?.(t);
      }
    },
    currentTime: () => t,
  };
}

// ──────────────────────────────────────────────
// MockWorker
// ──────────────────────────────────────────────

export interface MockWorker {
  postMessage(msg: unknown): void;
  addEventListener(type: string, handler: (e: MessageEvent) => void): void;
  removeEventListener(type: string, handler: (e: MessageEvent) => void): void;
  terminate(): void;
  /** 테스트가 수동으로 'tick' 이벤트를 스케줄러 콜백에 흘려보낸다. */
  fireTick(): void;
  /** 마지막으로 받은 'start' 메시지의 intervalMs. */
  readonly lastStartInterval: number | null;
}

export function createMockWorker(): MockWorker {
  let handler: ((e: MessageEvent) => void) | null = null;
  let running = false;
  let lastInterval: number | null = null;

  return {
    postMessage(msg) {
      const m = msg as { type: 'start' | 'stop'; intervalMs?: number };
      if (m.type === 'start') {
        running = true;
        lastInterval = m.intervalMs ?? null;
      } else if (m.type === 'stop') {
        running = false;
      }
    },
    addEventListener(type, h) {
      if (type === 'message') handler = h;
    },
    removeEventListener(type, h) {
      if (type === 'message' && handler === h) handler = null;
    },
    terminate() {
      handler = null;
      running = false;
    },
    fireTick() {
      if (!running || !handler) return;
      handler({ data: { type: 'tick' } } as MessageEvent);
    },
    get lastStartInterval() {
      return lastInterval;
    },
  };
}

// ──────────────────────────────────────────────
// 레거시 Scheduler Spy (Phase 0에서 설계된 단순 record 패턴)
// Phase 1 이후에는 createMetronomeScheduler의 내장 spy 콜백을 쓰는 것이 권장.
// ──────────────────────────────────────────────

/** 스케줄러가 예약한 단일 오디오 이벤트 — 레거시 형태. */
export interface ScheduledEvent {
  time: number;
  type: 'click' | 'accent' | 'sub';
}

export interface SchedulerSpy {
  scheduledEvents: ScheduledEvent[];
  reset(): void;
  record(event: ScheduledEvent): void;
}

export function createSchedulerSpy(): SchedulerSpy {
  const scheduledEvents: ScheduledEvent[] = [];
  return {
    scheduledEvents,
    reset() {
      scheduledEvents.length = 0;
    },
    record(event) {
      scheduledEvents.push(event);
    },
  };
}
