import { test, expect } from '@playwright/test';

/*
 * Phase 2 핵심 시나리오 스모크:
 *   1) /fretboard 접속 → 지판 SVG가 렌더되는가
 *   2) Root 변경 → 선택 상태가 aria-checked에 반영되는가
 *   3) 스케일 변경 → SVG 안 노트 개수가 변하는가
 *   4) 라벨 모드 Hide → 노트 내 텍스트가 비는가
 */

test.describe('/fretboard — 지판 스케일 가이드', () => {
  test('페이지 로드 + SVG 렌더링', async ({ page }) => {
    await page.goto('/fretboard');

    // 정적 헤더는 SSR로 즉시 렌더
    await expect(page.getByRole('heading', { name: /Scales/ })).toBeVisible();

    // 클라이언트 hydration 이후 SVG가 나타난다
    const svg = page.getByRole('img', { name: /Guitar fretboard/i });
    await expect(svg).toBeVisible();
  });

  test('Root 변경 → aria-checked 반영', async ({ page }) => {
    await page.goto('/fretboard');

    // 초기: C가 체크되어 있어야 함 (기본값)
    const cButton = page.getByRole('radio', { name: 'C', exact: true });
    await expect(cButton).toHaveAttribute('aria-checked', 'true');

    // G 클릭 → G가 체크되고 C는 해제
    const gButton = page.getByRole('radio', { name: 'G', exact: true });
    await gButton.click();
    await expect(gButton).toHaveAttribute('aria-checked', 'true');
    await expect(cButton).toHaveAttribute('aria-checked', 'false');
  });

  test('스케일 변경 → 노트 개수 변화', async ({ page }) => {
    await page.goto('/fretboard');

    // 초기 Major 스케일에서 circle 개수 기록 (Root=C, 22프렛 기준 ~29개)
    const majorCount = await page.locator('svg circle').count();
    expect(majorCount).toBeGreaterThan(0);

    // Minor Pentatonic (5음)은 Major (7음)보다 노트 수가 적어야 함
    await page.getByRole('radio', { name: 'Minor Pentatonic' }).click();
    const pentaCount = await page.locator('svg circle').count();
    expect(pentaCount).toBeLessThan(majorCount);
  });

  test('라벨 모드 Hide → 텍스트 사라짐', async ({ page }) => {
    await page.goto('/fretboard');

    // SVG 렌더링 완료 대기 — webkit이 chromium보다 느려 count 전에 대기 필요
    await page.getByRole('img', { name: /Guitar fretboard/i }).waitFor();
    // 최소 한 개 이상의 svg text가 존재할 때까지 대기 (hydration + 폰트 로드)
    await expect(page.locator('svg text').first()).toBeVisible({ timeout: 5000 });

    // 기본은 Name — 텍스트(노트 이름)가 존재
    const textCountBefore = await page.locator('svg text').count();
    expect(textCountBefore).toBeGreaterThan(0);

    // Hide 모드로
    await page.getByRole('radio', { name: 'Hide' }).click();

    // 프렛 번호·오픈 스트링 이름은 남지만 in-scale 노트 라벨은 사라짐 → 총 텍스트 수 감소
    await expect
      .poll(async () => await page.locator('svg text').count(), { timeout: 3000 })
      .toBeLessThan(textCountBefore);
  });
});
