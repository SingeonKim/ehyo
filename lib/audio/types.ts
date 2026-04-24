import type { SoundType, SubdivisionType, TimeSignature } from '@/lib/store/app-store';

/*
 * 메트로놈 오디오 레이어의 공용 타입.
 *
 * 설계 원칙:
 *   - 스케줄러는 순수 상태 머신 + 이벤트 생성기. AudioContext는 주입받아
 *     타이밍 spy·mock이 가능하도록 (테스트 용이성).
 *   - 이벤트는 AudioContext.currentTime 기준 절대 시각을 캐리하고, UI 구독자와
 *     테스트 spy가 동일한 스트림을 소비한다.
 */

/** 스케줄러 동작 설정. 런타임 변경 시 다음 틱부터 반영. */
export interface SchedulerConfig {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: SubdivisionType;
  soundType: SoundType;
  accentBeatOne: boolean;
  volume: number;
}

/** 각 박/서브디비전 이벤트. */
export interface SchedulerEvent {
  /** AudioContext.currentTime 기준 절대 시각 (sec). */
  time: number;
  /** 1-indexed 현재 마디 내 박 (1 ~ timeSignature.numerator). */
  beat: number;
  /** 한 박 내 서브디비전 인덱스 (0..subdivCount-1). 0이 정박. */
  subdivIndex: number;
  /** 악센트 여부 (beat 1 + accentBeatOne=true일 때만 true). */
  isAccent: boolean;
  /** UI·spy 분류: accent(첫박 강조) / beat(정박) / sub(서브디비전). */
  type: 'accent' | 'beat' | 'sub';
}

/** 스케줄러 이벤트 구독 콜백. UI(LED 점등, 진자 동기화)용. */
export type SchedulerListener = (event: SchedulerEvent) => void;

export interface MetronomeScheduler {
  /** 시작. 최초 호출은 반드시 유저 제스처 이후 (AudioContext resume 필요). */
  start(): Promise<void>;
  /** 정지. 이미 예약된 노트는 끝까지 재생되지 않도록 gain 끊음. */
  stop(): void;
  /** 설정 갱신. BPM 변경 시 예약 큐를 플러시하고 새 BPM으로 재개. */
  updateConfig(next: SchedulerConfig): void;
  /** 이벤트 구독. 반환값은 unsubscribe 함수. */
  subscribe(listener: SchedulerListener): () => void;
  /** 현재 실행 중인가. */
  readonly isRunning: boolean;
}

/** 스케줄러 timing 상수 — 플랫폼별 보정. */
export const LOOKAHEAD_MS = 25;
export const SCHEDULE_AHEAD_SEC = 0.1;
export const SCHEDULE_AHEAD_IOS_SEC = 0.15;

/** subdivision별 한 박 안의 분할 수. */
export const SUBDIVISION_COUNT: Record<SubdivisionType, number> = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
  sixteenth: 4,
  swing: 2, // 8th 기반, 리듬만 delay로 조정
};
