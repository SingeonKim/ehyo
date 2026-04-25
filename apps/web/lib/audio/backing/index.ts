/**
 * Backing 엔진 공개 API 배럴.
 *
 * 외부 모듈은 `@/lib/audio/backing`만 import한다 — 내부 구조(engine/voices/patterns)는
 * 이 파일을 통해서만 노출.
 */

export {
  __disposeBackingEngineForTests,
  __resetStoreBridgeForTests,
  getBackingEngine,
} from './engine';
export type { BackingEngine, BackingState } from './engine';
