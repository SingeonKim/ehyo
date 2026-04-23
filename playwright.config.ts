// playwright.config.ts
// Playwright E2E 테스트 전체 설정.
//
// 왜 chromium + webkit 두 프로젝트만 두는가:
//   Firefox는 Web Audio API 타이밍이 Chromium과 미묘하게 달라
//   false-positive를 낼 수 있다. v1에서는 가장 점유율 높은 두 엔진만 커버한다.
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  // E2E 테스트 파일 위치
  testDir: './tests/e2e',

  // 테스트 타임아웃: 30초 (느린 CI 환경 고려)
  timeout: 30_000,

  // expect().toBeVisible() 등 assertion 타임아웃
  expect: {
    timeout: 5_000,
  },

  // 공통 브라우저 옵션 — screenshot/trace는 `use` 블록 안에 놓아야 한다.
  use: {
    baseURL: BASE_URL,
    // 기본 뷰포트 1280x720 — 데스크톱 기준
    viewport: { width: 1280, height: 720 },
    // 실패 시에만 스크린샷 저장 — 성공 케이스 용량 낭비 방지
    screenshot: 'only-on-failure',
    // 실패 시 trace 저장 (CI에서 디버깅할 때 유용)
    trace: 'retain-on-failure',
    // 스크린샷 비교는 Docker(linux) 안에서만 생성·비교한다.
    // 로컬 macOS에서 직접 비교하면 안티앨리어싱 차이로 false-positive가 발생한다.
  },

  // 리포터: 터미널 목록 출력 + HTML 상세 리포트
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  // 테스트 프로젝트: 브라우저 엔진별 분리
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // 로컬: pnpm dev 서버를 자동 기동. CI: docker-compose가 이미 web 컨테이너를 띄우므로 재사용.
  webServer: {
    command: 'pnpm dev',
    port: PORT,
    // CI 환경에서는 docker-compose가 띄운 서버를 재사용해 중복 기동을 막는다
    reuseExistingServer: process.env.CI === 'true',
    // 서버 준비 대기 최대 60초
    timeout: 60_000,
  },
});
