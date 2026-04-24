// vitest.config.ts
// Vitest 전체 설정 파일.
// jsdom 환경을 선택한 이유: React 컴포넌트가 DOM API에 의존하므로,
// Node 기본 환경이 아닌 브라우저 시뮬레이션 환경이 필요하다.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  test: {
    // 브라우저 DOM API를 시뮬레이션하는 환경
    environment: 'jsdom',

    // 각 테스트 파일 실행 전 공통 전처리 (polyfill, jest-dom 확장 등)
    setupFiles: ['./tests/setup.ts'],

    // 테스트 대상 파일 패턴 — unit과 component 테스트만 포함
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/component/**/*.test.tsx',
    ],

    coverage: {
      // v8 provider: Node 내장 커버리지 엔진, 별도 빌드 없이 빠르게 측정
      provider: 'v8',

      // 커버리지 측정 대상: 순수 로직이 있는 lib 디렉토리만 집중 측정
      include: ['lib/**'],

      // text: 터미널 요약 출력 / lcov: SonarQube·GitHub 커버리지 뱃지용 파일
      reporter: ['text', 'lcov'],

      // 리포트 출력 디렉토리
      reportsDirectory: './coverage',
    },
  },

  resolve: {
    alias: {
      // '@/components/...' 처럼 루트 기준 절대 경로 import를 사용하기 위한 alias
      '@': resolve(__dirname, '.'),
    },
  },
});
