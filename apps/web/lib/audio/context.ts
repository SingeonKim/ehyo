/*
 * 앱 전체에서 AudioContext 인스턴스를 **오직 1개** 관리하는 싱글턴.
 *
 * 왜 이게 중요한가:
 *   브라우저는 탭당 AudioContext 개수가 제한적이고, 여러 컨텍스트는 서로 동기화가 불가능하다.
 *   메트로놈과 (Phase 5+) 배킹 트랙 Transport가 같은 clock을 공유하려면 컨텍스트 1개를 써야 한다.
 *
 * 사용 규칙:
 *   - AudioContext 생성은 이 모듈에서만. 다른 곳에서 `new AudioContext()` 금지.
 *   - 최초 호출은 반드시 **유저 제스처 이후**. 아니면 브라우저 오토플레이 정책으로 suspended 상태 고착.
 *   - Phase 5에서 Tone.js 도입 시 `Tone.setContext(getAudioContext())`로 바인딩.
 *
 * Phase 0 현재는 인터페이스만 제공. 실제 호출은 Phase 1 메트로놈 스케줄러에서 시작된다.
 */

import { unlockIosAudioSession } from './silent-unlock';

let _ctx: AudioContext | null = null;

/** 현재 컨텍스트를 가져온다. 없으면 생성한다. SSR 환경에선 호출 금지 (window 없음). */
export function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('getAudioContext() called in non-browser environment');
  }
  if (!_ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new Ctor();
  }
  return _ctx;
}

/** 컨텍스트가 이미 생성되었는지. UI가 "오디오 권한 필요" 배너 표시 여부 판단에 사용. */
export function hasAudioContext(): boolean {
  return _ctx !== null;
}

/**
 * 유저 제스처 후 호출. suspended 상태를 running으로 전환한다.
 * 실패 시 null 반환 — UI가 사용자에게 안내를 띄울 수 있게.
 */
export async function resumeAudioContext(): Promise<AudioContext | null> {
  // iOS 무음 스위치 우회 — 호출 시점이 user gesture 콜백 안임을 호출자가 보장.
  // await 이전에 동기적으로 실행돼야 gesture 컨텍스트가 살아 있어 play()가 허용된다.
  unlockIosAudioSession();
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * 테스트·hot reload 정리용. 앱 생명주기 중 통상 호출하지 않는다.
 * StrictMode의 이중 mount로 이중 생성을 방지할 때만 써야 하며 Phase 1에서 재검토.
 */
export async function closeAudioContext(): Promise<void> {
  if (_ctx) {
    await _ctx.close();
    _ctx = null;
  }
}
