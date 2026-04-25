// tests/e2e/jam-skeleton.spec.ts
// ──────────────────────────────────────────────
// Sprint 2-6 — Jam Skeleton 회귀 E2E.
//
// 검증 의도:
//   1) /jam 본문에서 메트로놈 § 섹션이 제거되었음 (헤더 Dock으로만 사용)
//   2) 헤더 MetronomeDock은 모든 practice 페이지에서 살아있음
//   3) lg viewport에서 Fretboard 컨테이너에 sticky 클래스 적용
//   4) Roman/Absolute 토글이 칩 텍스트를 즉시 갱신
//   5) 카드 ▶ 누르면 첫 마디에 aria-current가 붙어 진행 상황을 시각화
//
// 4)·5)는 카탈로그 데이터(백엔드 API)가 필요. docker-compose.test.yml은 web만
// 띄우므로 backend 미가용 시 "Catalog offline" 분기로 떨어져 셀렉터가 맞지 않을 수 있다.
// 그 경우 1~3은 통과하고 4·5는 환경 종속으로 실패할 수 있음 — 회귀 방지의 핵심
// 의도(메트로놈 제거 / sticky / 카탈로그 인터랙션)는 그대로 유지.
// ──────────────────────────────────────────────
import { test, expect } from '@playwright/test';

test.describe('Sprint 2-6 — Jam Skeleton', () => {
  // page.goto의 기본 waitUntil='load'는 클라이언트 fetch(폰트·API 재시도 등)가
  // 매달리면 'load' 이벤트가 늦게 떠서 timeout 위험. DOM이 준비되면 마크업 검증은
  // 충분하므로 'domcontentloaded'로 통일.
  const goto = (page: import('@playwright/test').Page, url: string) =>
    page.goto(url, { waitUntil: 'domcontentloaded' });

  test('jam 본문에 메트로놈 § 섹션 없음', async ({ page }) => {
    await goto(page, '/jam');
    // 본문(main) 안에 § Metronome 헤더 텍스트가 없어야 함.
    // exact: true로 다른 § 섹션(§ Fretboard, § Backing Catalog) 오탐 방지.
    const main = page.locator('main');
    await expect(main.getByText('§ Metronome', { exact: true })).toHaveCount(0);
  });

  test('헤더 MetronomeDock은 존재 (모든 practice 페이지 공통)', async ({ page }) => {
    await goto(page, '/jam');
    // Dock의 Play 버튼 — aria-label '메트로놈 재생' (정지 상태 기본)
    await expect(page.getByRole('button', { name: /메트로놈 재생/ })).toBeVisible();
  });

  test('Fretboard 컨테이너에 sticky 클래스 (lg viewport)', async ({ page }) => {
    // lg breakpoint 이상일 때만 sticky 적용 — 1280px로 lg 이상 강제.
    await page.setViewportSize({ width: 1280, height: 800 });
    await goto(page, '/jam');
    // Fretboard 영역 내부의 SVG wrapper에 lg:sticky 클래스가 그대로 박혀 있어야 함.
    const fretboardWrapper = page.locator(
      'section[aria-label="Fretboard 영역"] >> .lg\\:sticky',
    );
    await expect(fretboardWrapper).toHaveCount(1);
  });

  test('절대/상대 토글 동작', async ({ page }) => {
    await goto(page, '/jam');
    // 기본 roman → I7 칩이 보임 (12-bar blues 카드)
    await expect(page.getByText('I7').first()).toBeVisible();
    // Absolute 클릭
    await page.getByRole('button', { name: /Absolute/i }).click();
    // C7 칩이 보임 (key=C 기본)
    await expect(page.getByText('C7').first()).toBeVisible();
  });

  test('재생 시 현재 마디 강조가 진행', async ({ page }) => {
    await goto(page, '/jam');
    // 12-Bar Blues (Major) 카드 영역으로 좁히기 위해 li 컨테이너로 끌어올림.
    const card = page.getByText('12-Bar Blues (Major)').locator('..').locator('..');
    // ▶ 버튼 클릭 (정지 상태일 때 aria-label='Play')
    await card.getByRole('button', { name: /^Play$/i }).click();
    // 첫 마디가 aria-current로 잡힘 (배킹 로딩 후 1~2초 내, 여유 5s)
    await expect(card.locator('li[aria-current="true"]')).toHaveCount(1, {
      timeout: 5000,
    });
    // 정지
    await card.getByRole('button', { name: /^Stop$/i }).click();
  });
});
