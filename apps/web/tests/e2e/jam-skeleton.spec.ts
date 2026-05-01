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
    // 첫 마디가 aria-current로 잡힘 (배킹 로딩 후 1~2초 내, 여유 8s).
    // Sprint 2-7 후속: 마디 chip이 <li>에서 <button>으로 변경되어 aria-current가
    // button에 박혀 있음 — 셀렉터를 tag-agnostic으로 갱신.
    // 튜닝/voice-mute 확장 후속: smplr 첫 cache miss 시 5s가 빡빡해 webkit이
    // retry까지 fail하는 회귀가 있어 8s로 여유. main도 flaky 기록 있음.
    await expect(card.locator('[aria-current="true"]')).toHaveCount(1, {
      timeout: 8000,
    });
    // 정지
    await card.getByRole('button', { name: /^Stop$/i }).click();
  });
});

test.describe('Sprint 2-7 — Smart Highlighting', () => {
  // 기존 Sprint 2-6 describe와 동일한 goto 패턴 사용.
  const goto = (page: import('@playwright/test').Page, url: string) =>
    page.goto(url, { waitUntil: 'domcontentloaded' });

  test('배킹 재생 중 color-tone tier circle이 등장한다', async ({ page }) => {
    await goto(page, '/jam');
    // 안전 카드: 12-Bar Blues — 기존 회귀 테스트와 동일.
    // blues 카테고리는 universal blue notes(♭3·♭5·♭7)를 항상 colorTones로 추가하므로
    // I7 첫 마디에서도 즉시 color-tone group이 등장한다.
    const card = page.getByText('12-Bar Blues (Major)').locator('..').locator('..');
    await card.getByRole('button', { name: /^Play$/i }).click();

    // 첫 마디 진입까지 약간의 여유 (배킹 로드 + 첫 코드 emit).
    await expect(
      page.locator('[data-overlay-tier="color-tone"] circle').first(),
    ).toBeVisible({ timeout: 8000 });

    const colorToneCount = await page
      .locator('[data-overlay-tier="color-tone"] circle')
      .count();
    expect(colorToneCount).toBeGreaterThan(0);

    // 정지
    await card.getByRole('button', { name: /^Stop$/i }).click();
  });

  test('Jazz 카드 재생 중 ghost marker가 등장한다', async ({ page }) => {
    await goto(page, '/jam');
    // Jazz 카드(시드 'Jazz ii–V–I')는 dominant7에 alt 텐션 4종(♭9·♯9·♯11·♭13)을
    // 추가하므로 V7 마디에서 스케일 밖 ghost marker가 다수 등장한다.
    // 시드 이름이 en-dash(–)임에 주의 — apps/api/app/scripts/seed.py 참조.
    // 환경(백엔드 미가용)에서 카드 자체가 없으면 test.skip.
    const jazzLabel = page.getByText(/Jazz ii.{1,2}V.{1,2}I/i).first();
    if ((await jazzLabel.count()) === 0) {
      test.skip(true, 'Jazz 시드 없음 — 백엔드 카탈로그 미가용');
      return;
    }

    const jazzCard = jazzLabel.locator('..').locator('..');
    await jazzCard.getByRole('button', { name: /^Play$/i }).click();

    // V7 마디까지 도달 대기. ii–V–I는 둘째 마디부터 V7이 들어오므로 비교적 빠르게
    // ghost marker가 등장하지만, 배킹 로드 지연을 감안해 timeout을 넉넉히.
    await expect(
      page.locator('[data-overlay-tier="ghost"] circle').first(),
    ).toBeVisible({ timeout: 10000 });

    const ghostCount = await page
      .locator('[data-overlay-tier="ghost"] circle')
      .count();
    expect(ghostCount).toBeGreaterThan(0);

    // 정지
    await jazzCard.getByRole('button', { name: /^Stop$/i }).click();
  });
});
