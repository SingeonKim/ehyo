/*
 * 메트로놈 스케줄러 Worker.
 *
 * 왜 Worker가 필요한가:
 *   메인 스레드의 setInterval은 탭이 백그라운드로 가면 브라우저에 의해 1초로
 *   throttle된다. 그러면 lookahead(25ms) 틱이 멎고, "돌아왔을 때 박자가 누적
 *   예약"되어 쏟아지거나 아예 멈춘다. Worker의 타이머는 throttle 면제.
 *
 * Worker의 역할은 순전히 "틱만 보내는 것". 실제 오디오 예약은 메인 스레드에서
 * AudioContext.currentTime을 보고 수행한다 (AudioContext는 Worker에서 접근 불가).
 *
 * 메시지 프로토콜:
 *   main → worker: { type: 'start', intervalMs } / { type: 'stop' }
 *   worker → main: { type: 'tick' } — 스케줄러가 lookahead 범위 검사 수행하라는 신호
 *
 * export {}는 TypeScript에서 이 파일을 모듈 스코프로 취급하게 만드는 관용구.
 * 없으면 intervalId가 전역 선언으로 인식되어 TS2451 에러 발생.
 */
export {};

let intervalId: ReturnType<typeof setInterval> | null = null;

// DedicatedWorkerGlobalScope 타입 내부에서만 self 접근 가능.
// lib.webworker.d.ts의 self는 post/onmessage를 가짐.
// 이 파일은 Next.js의 new Worker(new URL(...)) 패턴으로 로드된다.
self.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as { type: 'start' | 'stop'; intervalMs?: number };

  if (msg.type === 'start') {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    const interval = msg.intervalMs ?? 25;
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, interval);
  } else if (msg.type === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});
