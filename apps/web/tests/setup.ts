// tests/setup.ts
// 모든 테스트 파일 실행 전에 공통으로 적용되는 전처리 모음.
// vitest.config.ts의 setupFiles에서 참조된다.

/// <reference types="@testing-library/jest-dom" />

// jest-dom의 커스텀 matcher들을 vitest에서도 사용할 수 있게 확장한다.
// `/vitest` 서브패스를 써야 vitest의 expect에 올바르게 확장된다.
// 기본 진입점은 globals 전제라 vitest(globals: false)에서 ReferenceError 발생.
import '@testing-library/jest-dom/vitest';

// vitest는 기본적으로 globals를 주입하지 않으므로 명시적 import가 필요하다.
// (vitest.config의 `test.globals: true`를 켜면 생략 가능하나, 의존성을 드러내는
// 편이 테스트 파일 독자에게 덜 놀랍다.)
import { beforeEach } from 'vitest';

// ──────────────────────────────────────────────
// matchMedia polyfill
// ──────────────────────────────────────────────
// jsdom은 window.matchMedia를 구현하지 않는다.
// Tailwind나 컴포넌트가 미디어 쿼리를 참조할 때 오류 없이 작동하도록
// 최소한의 stub을 주입한다.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},       // deprecated이지만 일부 라이브러리가 여전히 호출
    removeListener: () => {},    // 동일 이유로 유지
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ──────────────────────────────────────────────
// ResizeObserver polyfill
// ──────────────────────────────────────────────
// jsdom은 ResizeObserver를 지원하지 않는다.
// Radix UI, Floating UI 등 레이아웃 계산 라이브러리가 이 API에 의존하므로
// noop 구현으로 에러를 방지한다.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

// ──────────────────────────────────────────────
// localStorage 초기화
// ──────────────────────────────────────────────
// 테스트 간 상태 오염을 막기 위해 각 테스트 실행 전에 localStorage를 비운다.
// Zustand의 persist 미들웨어가 localStorage를 사용할 때 특히 중요하다.
beforeEach(() => {
  localStorage.clear();
});
