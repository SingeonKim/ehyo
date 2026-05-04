// tests/e2e/jam-card-profiles.spec.ts
//
// Sprint 9 PR-D — 카드 프로필 시스템 회귀 E2E.
//
// 검증 의도:
//   1) 5 blues 카드 순차 재생/정지 → console error 0 (Sprint 2-8 trailing 음 회귀 가드)
//   2) instrument override 카드 2장(slow-minor-blues, jazz-major-blues)
//      재생 시 Soundfont 로드 + 오디오 에러 0
//
// docker-compose.test.yml로 실행 — 실제 백엔드 카탈로그 가용 가정.
// backend 미가용 시 카드 자체가 렌더되지 않아 셀렉터가 매칭 안 되어 timeout — 의도적.

import { test, expect } from '@playwright/test';

const BLUES_CARDS = [
  '12-bar-blues-major',
  'slow-minor-blues',
  'hard-bop-minor-blues',
  'jump-blues',
  'jazz-major-blues',
];

test.describe('Sprint 9 — Jam Card Profiles', () => {
  // page.goto의 기본 waitUntil='load'는 클라이언트 fetch(폰트·API 재시도 등)가
  // 매달리면 'load' 이벤트가 늦게 떠서 timeout 위험. DOM이 준비되면 마크업 검증은
  // 충분하므로 'domcontentloaded'로 통일.
  const goto = (page: import('@playwright/test').Page, url: string) =>
    page.goto(url, { waitUntil: 'domcontentloaded' });

  test('5 blues 카드 순차 재생/정지 — console error 0', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await goto(page, '/jam');
    // 카탈로그가 렌더될 때까지 대기 — 첫 카드 셀렉터로 readiness 확인
    await page
      .locator('[data-testid="progression-card-12-bar-blues-major"]')
      .waitFor({
        timeout: 15000,
      });

    for (const slug of BLUES_CARDS) {
      const card = page.locator(`[data-testid="progression-card-${slug}"]`);
      await expect(card).toBeVisible();

      // 재생 버튼 — aria-label 'Play'
      const playBtn = card.getByRole('button', { name: 'Play' });
      await playBtn.click();

      // 1초 재생 — Soundfont 로드 + 첫 마디 트리거 검증 가능 시간
      await page.waitForTimeout(1000);

      // 정지 버튼 — aria-label 'Stop'(재생 중 토글)
      const stopBtn = card.getByRole('button', { name: 'Stop' });
      await stopBtn.click();

      // trailing 음 회귀 가드: 정지 직후 200ms 안에 다음 카드로 이동해도 에러 없어야 함
      await page.waitForTimeout(200);
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('instrument override 카드 로드 — 오디오 에러 0', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await goto(page, '/jam');
    await page
      .locator('[data-testid="progression-card-slow-minor-blues"]')
      .waitFor({
        timeout: 15000,
      });

    // slow-minor-blues: electric_guitar_clean override
    // jazz-major-blues: electric_guitar_jazz override
    for (const slug of ['slow-minor-blues', 'jazz-major-blues']) {
      const card = page.locator(`[data-testid="progression-card-${slug}"]`);
      const playBtn = card.getByRole('button', { name: 'Play' });
      await playBtn.click();
      // 첫 instrument 로딩은 시간 더 걸림 (Soundfont 다운로드)
      await page.waitForTimeout(2000);
      const stopBtn = card.getByRole('button', { name: 'Stop' });
      await stopBtn.click();
      await page.waitForTimeout(300);
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});

// Sprint 11 — 신규 7 카드 중 카테고리당 1장 (rock 대표는 power-ballad).
// E2E는 회귀 가드 — 카드 click → 재생 4초 → console error 0 + 정지 깨끗.
// 각 카드의 음악적 정확성은 단위/패턴 테스트가 책임.
const SPRINT11_REPRESENTATIVES = [
  'autumn-leaves',         // jazz
  'epic-minor-cinematic',  // minor
  'cissy-strut-funk',      // funk
  'bossa-major-ipanema',   // bossa
  'travis-pick-folk',      // folk (슬래시 코드 베이스 + 드럼 비움 첫 사례)
  'power-ballad-rock',     // rock 대표 (clean override + tom/crash)
] as const;

test.describe('Sprint 11 — 신규 카드 회귀 (카테고리당 1장)', () => {
  const goto = (page: import('@playwright/test').Page, url: string) =>
    page.goto(url, { waitUntil: 'domcontentloaded' });

  for (const slug of SPRINT11_REPRESENTATIVES) {
    test(`${slug} — 4초 재생 후 console error 0`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });

      await goto(page, '/jam');
      const card = page.locator(`[data-testid="progression-card-${slug}"]`);
      await card.waitFor({ timeout: 15000 });
      await expect(card).toBeVisible();

      const playBtn = card.getByRole('button', { name: 'Play' });
      await playBtn.click();

      // 4초 — 가장 느린 카드(epic 70bpm = 3.4s/마디)에서도 한 마디 이상 진행 보장
      await page.waitForTimeout(4000);

      const stopBtn = card.getByRole('button', { name: 'Stop' });
      await stopBtn.click();
      await page.waitForTimeout(300);

      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
