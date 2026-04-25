/*
 * LookaheadScheduler용 Worker.
 *
 * 역할: setInterval 기반 tick 메시지를 메인 스레드로 송출.
 * Worker 타이머는 탭이 백그라운드로 가도 브라우저 throttle 면제 — 이것이
 * 메인 스레드 setInterval 대신 Worker를 쓰는 핵심 이유.
 *
 * 실제 오디오 예약은 메인 스레드에서만 수행 (AudioContext는 Worker 접근 불가).
 *
 * 메시지 프로토콜:
 *   main → worker: { type: 'start', intervalMs } / { type: 'stop' }
 *   worker → main: { type: 'tick' }
 *
 * export {}는 TypeScript에서 이 파일을 모듈 스코프로 취급하게 만드는 관용구.
 * 없으면 intervalId가 전역 선언으로 인식되어 다른 worker 파일과 TS2451 충돌 발생.
 */
export {};

let intervalId: ReturnType<typeof setInterval> | null = null;

self.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as { type: 'start' | 'stop'; intervalMs?: number };
  if (data.type === 'start') {
    // 중복 start 방지: 이전 interval을 먼저 정리
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = setInterval(() => {
      (self as unknown as Worker).postMessage({ type: 'tick' });
    }, data.intervalMs ?? 25);
  } else if (data.type === 'stop' && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
});
