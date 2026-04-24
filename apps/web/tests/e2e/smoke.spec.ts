// tests/e2e/smoke.spec.ts
// ──────────────────────────────────────────────
// 스모크 테스트: 앱이 기본적으로 렌더링되는지 확인한다.
//
// 이 테스트의 목적:
//   실제 사용자 시나리오(BPM 조작, 지판 탐색 등)는 Phase별로 추가되고,
//   여기서는 "배포된 앱이 최소한 응답하는가"만 확인한다.
//   CI에서 배포 파이프라인이 깨졌을 때 가장 빠르게 감지할 수 있는 안전망이다.
// ──────────────────────────────────────────────
import { test, expect } from '@playwright/test';

test.describe('스모크 — 기본 렌더링', () => {
  test('루트 페이지에 h1 요소가 존재한다', async ({ page }) => {
    // 페이지 이동
    await page.goto('/');

    // 폰트 로드 대기 — 폰트가 준비되기 전에 스크린샷을 찍으면
    // OS별 fallback 폰트 차이로 시각적 리그레션이 발생한다.
    // document.fonts.ready는 모든 @font-face 로드가 완료될 때 resolve된다.
    await page.evaluate(() => document.fonts.ready);

    // h1이 DOM에 존재하고 가시 상태인지 확인
    // 텍스트 내용을 검증하지 않는 이유: 이 단계에서 카피는 확정되지 않았다.
    // role='heading' + level=1로 접근성 기반 셀렉터 사용
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('페이지 title이 비어있지 않다', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    // <title>이 없거나 비어있으면 SEO와 탭 식별이 불가능하다
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });
});
