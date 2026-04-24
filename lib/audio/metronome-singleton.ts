import { useAppStore } from '@/lib/store/app-store';

import { getAudioContext } from './context';
import { createMetronomeScheduler } from './metronome-scheduler';
import type { MetronomeScheduler, SchedulerConfig, SchedulerListener } from './types';

/*
 * 메트로놈 스케줄러 싱글턴.
 *
 * 왜 싱글턴인가:
 *   스케줄러를 MetronomeClient 컴포넌트가 소유하면, 유저가 /metronome → /fretboard
 *   이동 시 컴포넌트가 unmount → cleanup에서 scheduler.stop() 호출 → 소리 끊김.
 *   그러나 스토어의 isPlaying=true는 유지되어 돌아왔을 때 "재생 중처럼 보이지만
 *   무음"인 상태 괴리. 유저가 경험한 부자연스러움의 원인.
 *
 *   해결: 스케줄러를 React 생명주기 밖 모듈 스코프로 올려 라우트 이동에
 *   영향받지 않게. (practice) 레이아웃 전체에 걸쳐 상시 가동.
 *
 * getConfig는 useAppStore.getState()로 최신 상태를 pull — Zustand의 getState는
 * subscriber 없이도 최신 값을 반환하므로 리렌더·구독 오버헤드 0.
 */

let instance: MetronomeScheduler | null = null;
let worker: Worker | null = null;

function readConfig(): SchedulerConfig {
  const m = useAppStore.getState().metronome;
  return {
    bpm: m.bpm,
    timeSignature: m.timeSignature,
    subdivision: m.subdivision,
    soundType: m.soundType,
    accentBeatOne: m.accentBeatOne,
    volume: m.volume,
  };
}

/**
 * 싱글턴 스케줄러를 얻거나 최초 1회 생성. 브라우저 외(SSR)에서는 null.
 * 실제 생성은 최초 유저 제스처 이후 호출되어야 한다 — AudioContext 오토플레이 정책.
 */
export function ensureMetronomeScheduler(): MetronomeScheduler | null {
  if (instance) return instance;
  if (typeof window === 'undefined') return null;

  const ctx = getAudioContext();
  // Worker URL은 Next.js가 import.meta.url 패턴을 인식해 번들한다.
  worker = new Worker(new URL('./scheduler-worker.ts', import.meta.url));
  instance = createMetronomeScheduler({
    audioContext: ctx,
    getConfig: readConfig,
    createWorker: () => worker!,
  });
  return instance;
}

/**
 * 메트로놈 토글. 필요 시 스케줄러 인스턴스와 AudioContext resume까지 처리.
 * 스토어의 isPlaying과 스케줄러 실행 상태를 동기화한다.
 */
export async function toggleMetronome(): Promise<void> {
  const scheduler = ensureMetronomeScheduler();
  if (!scheduler) return;

  const store = useAppStore.getState();
  if (store.metronome.isPlaying) {
    scheduler.stop();
    store.stopMetronome();
  } else {
    await scheduler.start(); // start() 내부에서 AudioContext.resume() 처리
    store.startMetronome();
  }
}

/**
 * 박자 이벤트 구독. Dock과 MetronomeClient가 각자 구독해 독립된 UI 업데이트.
 * 스케줄러가 아직 없으면 no-op unsubscribe 반환 — 호출자는 상관없이 호출 가능.
 */
export function subscribeToBeats(listener: SchedulerListener): () => void {
  const scheduler = ensureMetronomeScheduler();
  if (!scheduler) return () => {};
  return scheduler.subscribe(listener);
}

/** 현재 스케줄러가 실제로 실행 중인가. 스토어 isPlaying과 일치해야 정상. */
export function isMetronomeRunning(): boolean {
  return instance?.isRunning ?? false;
}
