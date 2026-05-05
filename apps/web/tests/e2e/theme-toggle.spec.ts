import { expect, test } from '@playwright/test';

/*
 * Light theme toggle E2E.
 *
 * 검증:
 *   1) 첫 방문(localStorage 비어있음): 다크가 기본
 *   2) 토글 클릭 → data-theme="light", body 배경이 라이트 hex
 *   3) 새로고침: 라이트 보존 + 첫 페인트부터 라이트(FOUC 가드)
 *   4) 다시 토글: 다크 복귀, localStorage state.ui.theme === 'dark'
 */

const LIGHT_BG_HEX = '#F4ECD8';
const DARK_BG_HEX = '#0E0B08';

// rgb() 문자열을 hex로 변환해 비교
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g);
  if (!match) return rgb;
  const [r, g, b] = match.map((x) => parseInt(x, 10));
  return (
    '#' +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

// body 배경색이 목표 hex에 도달할 때까지 polling.
// body에 transition: background-color 200ms가 있어 토글 직후 중간값이 나올 수 있다.
async function waitForBgHex(page: import('@playwright/test').Page, hex: string) {
  await page.waitForFunction(
    (expectedHex) => {
      const rgb = getComputedStyle(document.body).backgroundColor;
      const m = rgb.match(/\d+/g);
      if (!m) return false;
      const [r, g, b] = m.map((x: string) => parseInt(x, 10));
      return (
        '#' +
        [r, g, b]
          .map((c: number) => c.toString(16).padStart(2, '0').toUpperCase())
          .join('') ===
        expectedHex
      );
    },
    hex,
    { timeout: 3000 },
  );
}

test.describe('테마 토글', () => {
  test('첫 방문은 다크', async ({ page }) => {
    await page.goto('/');
    const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    // FOUC 스크립트는 light일 때만 박으므로, 다크는 dataset.theme이 비어있을 수 있다.
    expect(dataTheme === undefined || dataTheme === 'dark').toBe(true);

    // 배경색도 polling으로 확인(CSS var 반영 완료를 보장)
    await waitForBgHex(page, DARK_BG_HEX);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(DARK_BG_HEX);
  });

  test('토글 클릭 → 라이트 전환 + persist', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();

    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('light');

    // body에 transition: background-color 200ms가 있어 토글 직후 중간값이 나올 수 있다.
    // 목표 hex에 도달할 때까지 polling해 transition 완료를 기다린다.
    await waitForBgHex(page, LIGHT_BG_HEX);

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(LIGHT_BG_HEX);

    const persisted = await page.evaluate(() => localStorage.getItem('my-music-app:v1'));
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.ui.theme).toBe('light');
  });

  test('새로고침 후에도 라이트 유지 + 첫 페인트 라이트(FOUC 가드)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('light');

    // FOUC 가드 검증: 새로고침 직후 data-theme="light"가 유지되어야 한다.
    // inline FOUC 스크립트가 DOMContentLoaded 전에 실행되므로 load 완료 시점에 이미 적용돼 있어야 함.
    await page.reload();
    const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(dataTheme).toBe('light');

    // 배경색도 transition 완료까지 polling해 검증
    await waitForBgHex(page, LIGHT_BG_HEX);

    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(rgbToHex(bg)).toBe(LIGHT_BG_HEX);
  });

  test('두 번 토글 → 다크 복귀', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: /모드로 전환/ });
    await button.click();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('light');

    await button.click();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.dataset.theme),
    ).toBe('dark');

    const persisted = await page.evaluate(() => localStorage.getItem('my-music-app:v1'));
    const parsed = JSON.parse(persisted as string);
    expect(parsed.state.ui.theme).toBe('dark');
  });
});
