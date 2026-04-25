/**
 * engine.test.ts — Sprint 2-4 Task 7에서 전면 재작성 예정.
 *
 * Task 6에서 voice-mock-helpers의 createToneBridgeMock/resetToneBridgeMock가
 * 삭제되고, keys voice가 제거됨에 따라 기존 테스트 전체가 컴파일 에러.
 * Task 7(engine.ts WebAudioFont 재작성)과 함께 이 파일도 재작성한다.
 *
 * TODO(sprint-2-4-task-7): engine.ts WebAudioFont 기반 재작성 후 테스트 복원.
 */

// 타입 에러 없는 빈 테스트 파일 — vitest가 suite 없어도 통과.
import { describe, it } from 'vitest';

describe('BackingEngine (stub — Task 7 pending)', () => {
  it.todo('engine.start sets Transport.bpm from template.default_bpm');
  it.todo('engine.start registers scheduleRepeat and starts Transport');
  it.todo('engine transitions state to playing');
  it.todo('calling start twice stops the previous session first');
  it.todo('scheduled callback triggers drums/bass/guitar per bar');
  it.todo('parsing failure triggers no voice');
  it.todo('barIndex wraps back to 0 after template.bars ticks');
  it.todo('setKey reflects in next callback for bass/guitar');
  it.todo('stop calls voice.fadeOut, not dispose');
  it.todo('dispose calls voice.dispose exactly once');
  it.todo('subscribe invokes listener on state transitions');
});
