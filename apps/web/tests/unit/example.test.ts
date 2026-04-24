// tests/unit/example.test.ts
// ──────────────────────────────────────────────
// [플레이스홀더] 이 파일은 테스트 하네스가 정상 동작하는지만 확인한다.
//
// Phase 1 작업 시작 시 이 파일을 제거하고, 아래 경로에 실제 단위 테스트를 추가한다:
//   - tests/unit/lib/theory/   → 음악 이론 순수 함수 (목표: 100% 커버리지)
//   - tests/unit/lib/audio/    → 메트로놈 스케줄러 (목표: 90% 커버리지)
//   - tests/unit/lib/store/    → Zustand 스토어 액션 (목표: 100% 커버리지)
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('1 + 1 = 2 (테스트 하네스 동작 확인)', () => {
    expect(1 + 1).toBe(2);
  });
});
