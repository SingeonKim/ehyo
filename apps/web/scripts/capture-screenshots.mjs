// 마케팅·README용 스크린샷 자동 캡처 스크립트.
//
// 왜 별도 스크립트인가 — Playwright E2E 테스트는 결정론적 회귀 검증이 목표라
// viewport·trace·screenshot 정책이 다르다. 마케팅 샷은 Retina 톤(deviceScaleFactor 2)
// 과 1440×900 데스크톱 viewport, 카드 hydration 완료 후 캡처가 필요해서 분리했다.
//
// 실행 — Docker (권장):
//   pnpm screenshots
//
// 결과는 docs/introduction/auto/ 에 저장 — 매번 폴더 비우고 다시 채운다.
// 사용자가 결과를 검수한 뒤 docs/introduction/ 본 디렉토리로 직접 옮기는 흐름.

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'introduction', 'auto');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const VIEWPORT = { width: 1440, height: 900 };

async function settle(page) {
  // network idle = 폰트·smplr 번들 로드 완료, hydration gate 풀림.
  await page.waitForLoadState('networkidle').catch(() => {});
  // useHasHydrated() 훅이 mount → setHydrated(true)까지 한 마이크로태스크 더 필요.
  await page.waitForTimeout(400);
}

async function shoot(page, name, options = {}) {
  const filePath = path.join(OUT_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false, ...options });
  console.log(`  ✓ ${name}`);
}

async function shootLocator(page, name, locator, options = {}) {
  const filePath = path.join(OUT_DIR, name);
  await locator.screenshot({ path: filePath, ...options });
  console.log(`  ✓ ${name}`);
}

// Highlight Colors 패널의 *좌측 영역*만 (라벨 + 도수 pill 마지막까지) clip.
// 우측의 "클릭: orange → green → blue → off · Reset"은 제외.
//
// page.screenshot + viewport-relative clip — Locator.screenshot()의 clip은
// 안정적으로 동작하지 않아(전체 element 캡처되는 케이스 발생) page 단위로 처리.
// 패널을 먼저 viewport 안으로 scroll해서 좌표가 양수 영역에 들어오게 한다.
async function shootHighlightLeft(page, name) {
  const panel = page.locator('[data-testid="highlight-colors"]');
  await panel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);

  const cropBox = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="highlight-colors"]');
    if (!p) return null;
    const pr = p.getBoundingClientRect();
    let maxRight = pr.left;
    for (const btn of p.querySelectorAll('button')) {
      if (btn.textContent?.trim() === 'Reset') continue;
      const r = btn.getBoundingClientRect();
      if (r.right > maxRight) maxRight = r.right;
    }
    return {
      x: Math.max(0, pr.left),
      y: Math.max(0, pr.top),
      width: maxRight - pr.left + 6,
      height: pr.height,
    };
  });
  if (!cropBox) {
    console.warn(`  ! Could not measure highlight panel for ${name}`);
    return;
  }
  await page.screenshot({ path: path.join(OUT_DIR, name), clip: cropBox });
  console.log(`  ✓ ${name} (left-only clip @${Math.round(cropBox.width)}×${Math.round(cropBox.height)})`);
}

async function setScaleByName(page, name) {
  // ScalePicker의 radiogroup(aria-label='스케일 선택') 안에서 정확 텍스트 매칭.
  await page
    .getByRole('radiogroup', { name: '스케일 선택' })
    .getByRole('radio', { name: new RegExp(`^${name}$`, 'i') })
    .click();
  await page.waitForTimeout(300);
}

async function setLabelMode(page, mode) {
  // FretboardOptions의 Segmented(aria-label='Label') 안의 Name/Degree/Hide.
  await page
    .getByRole('radiogroup', { name: 'Label' })
    .getByRole('radio', { name: mode })
    .click();
  await page.waitForTimeout(150);
}

// 지판 페이지의 viewport 캡처 영역을 *highlight-colors 패널 bottom*까지 확장.
// 03~05 시리즈에서 강조 색 컨트롤이 한 화면에 같이 보이게 하기 위함.
async function shootFretboardPageWithHighlight(page, name) {
  const cropHeight = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="highlight-colors"]');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return Math.ceil(r.bottom + window.scrollY + 24); // 패널 끝 + 24px 여백
  });
  if (!cropHeight) {
    console.warn(`  ! Could not measure highlight panel bottom for ${name}`);
    await shoot(page, name);
    return;
  }
  await page.screenshot({
    path: path.join(OUT_DIR, name),
    fullPage: true,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: cropHeight },
  });
  console.log(`  ✓ ${name} (page clip @${VIEWPORT.width}×${cropHeight})`);
}

async function main() {
  // 매번 깨끗하게 — 기존 시리즈와 새 시리즈가 섞이지 않게.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Capturing screenshots from ${BASE_URL} → ${OUT_DIR}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    // RandomTaunt 페이드가 캡처 시점 절반 투명되는 것 방지.
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  // 1. 메인 (랜딩)
  console.log('1/14 main');
  await page.goto(`${BASE_URL}/`);
  await settle(page);
  await shoot(page, '01_main.png');

  // 2. 메트로놈
  console.log('2/14 metronome');
  await page.goto(`${BASE_URL}/metronome`);
  await settle(page);
  await shoot(page, '02_metronome.png');

  // 3. 지판 — Major (페이지 clip — highlight-colors 패널까지 포함)
  console.log('3/14 fretboard major');
  await page.goto(`${BASE_URL}/fretboard`);
  await settle(page);
  await setScaleByName(page, 'Major');
  await shootFretboardPageWithHighlight(page, '03_fretboard_major.png');

  // 4. 지판 — Minor Blues + Label=Degree
  console.log('4/14 fretboard minor blues (degree label)');
  await setScaleByName(page, 'Minor Blues');
  await setLabelMode(page, 'Degree');
  await shootFretboardPageWithHighlight(page, '04_fretboard_minor_blues_degree.png');

  // 5. 지판 — Dorian (Label은 Name으로 복원)
  console.log('5/14 fretboard dorian');
  await setScaleByName(page, 'Dorian');
  await setLabelMode(page, 'Name');
  await shootFretboardPageWithHighlight(page, '05_fretboard_dorian.png');

  // 6. Practice — BLUES/POP까지 (Jazz 카테고리 직전까지 clip).
  //    Quick Change 카드를 Key=A·Label=Degree로 재생, bar 10/12 (IV7) 시점에 캡처.
  //    sticky 지판은 Practice 페이지에 라벨 토글이 노출되지 않아 fretboard 페이지에서
  //    먼저 LabelMode='Degree'로 설정 → store persist → jam 페이지에서 그대로 사용.
  console.log('6/14 practice (BLUES/POP only — Quick Change · Key A · IV7)');
  await page.goto(`${BASE_URL}/fretboard`);
  await settle(page);
  await setLabelMode(page, 'Degree');

  await page.goto(`${BASE_URL}/jam`);
  await settle(page);

  // Key를 A(PitchClass 9)로
  await page.getByLabel('Backing track key').selectOption('9');
  await page.waitForTimeout(200);

  const quickChange = page.locator('[data-testid="progression-card-12-bar-blues-quick-change"]');
  await quickChange.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await quickChange.getByRole('button', { name: 'Play' }).click();

  // bar 10/12 (IV7) 진입 대기 — Quick Change BPM 기준 1마디 ~2초, 30초 타임아웃이면 충분.
  await page.waitForFunction(
    () => /bar 10\/12/.test(document.body.textContent ?? ''),
    null,
    { timeout: 60_000 },
  );
  // 캡처 직전 페이지 상단으로 스크롤 — clip은 0,0 기준.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);

  const jazzY = await page.evaluate(() => {
    const el = document.querySelector('[data-category="jazz"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.top + window.scrollY;
  });
  if (jazzY) {
    const cropHeight = Math.round(jazzY - 12);
    await page.screenshot({
      path: path.join(OUT_DIR, '06_practice_blues_pop_jazz.png'),
      fullPage: true,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: cropHeight },
    });
    console.log(`  ✓ 06_practice_blues_pop_jazz.png (clipped at y=${cropHeight})`);
  } else {
    console.warn('  ! Could not locate Jazz category, skipping');
  }

  // 후속 시나리오에 영향 주지 않게 재생 정지.
  await quickChange.getByRole('button', { name: 'Stop' }).click().catch(() => {});
  await page.waitForTimeout(200);

  // 7~10. Minor Blues highlight 시리즈 — 지판 영역만 + Highlight Colors 패널만
  console.log('7/14 fretboard minor blues default (svg only)');
  await page.goto(`${BASE_URL}/fretboard`);
  await settle(page);
  await setScaleByName(page, 'Minor Blues');
  await setLabelMode(page, 'Degree');
  // 이전 시나리오에서 highlight를 변경했을 수 있으니 Reset 버튼 활성이면 클릭
  const resetBtn = page.getByRole('button', { name: 'Reset' });
  if (await resetBtn.isEnabled().catch(() => false)) {
    await resetBtn.click();
    await page.waitForTimeout(200);
  }
  const fretboardSvg = page.locator('svg[aria-label="Guitar fretboard scale visualization"]');
  const highlightPanel = page.locator('[data-testid="highlight-colors"]');

  // 7. 지판만 (default highlight)
  await shootLocator(page, '07_fretboard_minor_blues_default.png', fretboardSvg);

  // 8. Highlight Colors 패널 좌측만 (default)
  console.log('8/14 highlight colors panel — default (left only)');
  await shootHighlightLeft(page, '08_highlight_colors_default.png');

  // 9. 지판만 (custom highlight: 4 green, b7 green 추가)
  console.log('9/14 fretboard minor blues custom (svg only)');
  await page.getByRole('button', { name: /^Degree 4 — orange/ }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: /^Degree b7($| —)/ }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: /^Degree b7 — orange/ }).click();
  await page.waitForTimeout(300);
  await shootLocator(page, '09_fretboard_minor_blues_custom.png', fretboardSvg);

  // 10. Highlight Colors 패널 좌측만 (custom)
  console.log('10/14 highlight colors panel — custom (left only)');
  await shootHighlightLeft(page, '10_highlight_colors_custom.png');

  // Practice 시나리오 진입 전 highlight를 default로 되돌림 — 11번 지판이
  // 9번의 custom 색상(4 green, b7 green)을 그대로 받지 않도록.
  console.log('   resetting highlights → default');
  const resetAfterCustom = page.getByRole('button', { name: 'Reset' });
  if (await resetAfterCustom.isEnabled().catch(() => false)) {
    await resetAfterCustom.click();
    await page.waitForTimeout(200);
  }

  // 11~14. Practice — 12-Bar Blues (Minor) 재생 중 Im7(bar 1) / V7(bar 9)
  // 지판만 + 카드만 두 장씩.
  console.log('11/14 practice 12-bar-blues-minor — Im7 (fretboard)');
  await page.goto(`${BASE_URL}/jam`);
  await settle(page);
  const card = page.locator('[data-testid="progression-card-12-bar-blues-minor"]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await card.getByRole('button', { name: 'Play' }).click();
  // 'bar 1/12' 텍스트 등장 = engine.start sample 로딩 끝 + 첫 마디 진입.
  await page.waitForFunction(
    () => /bar 1\/12/.test(document.body.textContent ?? ''),
    null,
    { timeout: 30_000 },
  );

  const practiceFretboard = page.locator(
    'svg[aria-label="Guitar fretboard scale visualization"]',
  );

  // 11. Im7 — 지판만 (스크롤 상단 → SVG 캡처)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await shootLocator(page, '11_practice_im7_fretboard.png', practiceFretboard);

  // 12. Im7 — 재생 중 카드만 (스크롤 카드까지 → 카드 캡처)
  console.log('12/14 practice 12-bar-blues-minor — Im7 (card)');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await shootLocator(page, '12_practice_im7_card.png', card);

  // bar 9 (V7) 대기
  console.log('13/14 practice 12-bar-blues-minor — V7 (fretboard)');
  await page.waitForFunction(
    () => /bar 9\/12/.test(document.body.textContent ?? ''),
    null,
    { timeout: 35_000 },
  );
  // bar 9 진입 직후 — 빠르게 두 장 캡처. BPM 80 기준 1마디=3초라 충분.

  // 13. V7 — 지판만
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await shootLocator(page, '13_practice_v7_fretboard.png', practiceFretboard);

  // 14. V7 — 재생 중 카드만
  console.log('14/14 practice 12-bar-blues-minor — V7 (card)');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await shootLocator(page, '14_practice_v7_card.png', card);

  // Stop
  await card.getByRole('button', { name: 'Stop' }).click().catch(() => {});

  await browser.close();
  console.log(`\nDone. Files saved under ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
