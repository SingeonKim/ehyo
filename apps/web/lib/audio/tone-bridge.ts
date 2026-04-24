/**
 * Tone.js ↔ 공유 AudioContext 브릿지.
 *
 * 왜 이 파일만 Tone을 직접 import하는가:
 *   1. 단일 import 지점 — 번들 사이즈·트리 셰이킹 감시가 쉬움.
 *   2. 테스트에서 `vi.mock('@/lib/audio/tone-bridge')` 한 방으로 교체.
 *   3. Tone.setContext 호출이 한 곳에서만 일어나 "AudioContext 1개 원칙"을 강제.
 *
 * 공유 원칙:
 *   Tone.Transport와 메트로놈 스케줄러는 반드시 동일 AudioContext를 써야 한다
 *   (planning.md §3.3, §4.2). 이 모듈이 `bindToneToSharedContext`로 1회 바인딩.
 */

import * as Tone from 'tone';

import { getAudioContext } from './context';

let _bound = false;

/**
 * Tone을 공유 AudioContext에 바인딩한다. 최초 1회만 실제 setContext 수행.
 * 유저 제스처 이후에 호출해야 AudioContext가 running 상태로 결합된다.
 */
export function bindToneToSharedContext(): void {
  if (_bound) return;
  Tone.setContext(getAudioContext());
  _bound = true;
}

/** 바인딩 상태 조회 — 테스트·디버깅용. */
export function isToneBound(): boolean {
  return _bound;
}

/**
 * Tone 네임스페이스 getter.
 * 직접 import 대신 이 함수로 얻어와야 테스트에서 모킹이 가능하다.
 */
export function getTone(): typeof Tone {
  return Tone;
}

/** 테스트·HMR 정리용. 운영 중 호출하지 않는다. */
export function __resetToneBridgeForTests(): void {
  _bound = false;
}
