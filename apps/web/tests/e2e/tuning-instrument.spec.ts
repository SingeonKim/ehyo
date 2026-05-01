import { test, expect } from '@playwright/test';

/*
 * Task 15 — Tuning / Instrument extension E2E smoke
 *
 * 4 케이스:
 *   1. Guitar 7 instrument 전환 → SVG height가 6현 대비 증가 (현 추가)
 *   2. Bass 4 → Drop D preset 선택 → readout 'DADG' 표시
 *   3. 24-fret 토글 → SVG width 증가 (프렛 칸 추가)
 *   4. Voice mute drums 칩 클릭 → aria-pressed=true 토글
 *
 * persist key: 'my-music-app:v1'. 각 테스트는 default 상태(guitar-6-standard, 22프렛,
 * voiceMutes 모두 false)로 출발해야 결정론적으로 검증 가능.
 */

test.describe('Tuning / Instrument extension', () => {
  test('switching to Guitar 7 increases SVG height', async ({ page }) => {
    // 깨끗한 default 상태에서 출발 — persist v12 default = guitar-6-standard
    await page.goto('/fretboard');
    await page.evaluate(() => localStorage.removeItem('my-music-app:v1'));
    await page.reload();

    const svg = page.getByRole('img', { name: /Guitar fretboard/i });
    await expect(svg).toBeVisible();

    const before = (await svg.boundingBox())!.height;

    // Instrument 그룹의 'Guitar 7' 버튼 (segmented control)
    await page.getByRole('button', { name: 'Guitar 7', exact: true }).click();

    // Guitar 7은 7현이라 stringCount 6 → 7. SVG height가 증가해야 함.
    await expect
      .poll(async () => (await svg.boundingBox())!.height, { timeout: 3000 })
      .toBeGreaterThan(before);
  });

  test('Bass 4 → Drop D shows DADG readout', async ({ page }) => {
    await page.goto('/fretboard');
    await page.evaluate(() => localStorage.removeItem('my-music-app:v1'));
    await page.reload();

    // Bass 4로 전환 — TuningPresetSelector가 bass tuning 목록만 노출하도록 갱신됨
    await page.getByRole('button', { name: 'Bass 4', exact: true }).click();

    // Tuning preset native <select>의 'Drop D' 옵션 선택
    await page.locator('select[aria-label="Tuning preset"]').selectOption({ label: 'Drop D' });

    // readout span에 displayString 'DADG' 노출
    await expect(page.getByText('DADG', { exact: true })).toBeVisible();
  });

  test('24-fret toggle widens the SVG', async ({ page }) => {
    await page.goto('/fretboard');
    await page.evaluate(() => localStorage.removeItem('my-music-app:v1'));
    await page.reload();

    const svg = page.getByRole('img', { name: /Guitar fretboard/i });
    await expect(svg).toBeVisible();

    // SVG는 overflow-x-auto 컨테이너 안에 있어 boundingBox.width가 viewport에
    // clamp된다. viewBox attribute는 컨테이너 clip과 무관하게 frets에 따라 직접
    // 변화하므로 이쪽을 비교한다.
    const getViewBoxWidth = async () => {
      const vb = await svg.getAttribute('viewBox');
      if (!vb) throw new Error('SVG viewBox missing');
      return parseFloat(vb.split(/\s+/)[2]!);
    };

    // 22프렛 baseline
    const before = await getViewBoxWidth();

    // FretCountToggle 그룹 안에서 '24' 버튼 클릭 — group label로 한정해 다른 24 텍스트 충돌 방지
    const fretGroup = page.getByRole('group', { name: 'Fret count' });
    await fretGroup.getByRole('button', { name: '24', exact: true }).click();

    // 24프렛이면 fret slot 수가 늘어 viewBox width 증가
    await expect.poll(getViewBoxWidth, { timeout: 3000 }).toBeGreaterThan(before);
  });

  test('voice mute drums updates aria-pressed', async ({ page }) => {
    // VoiceMutePanel은 /jam의 ProgressionCatalogClient에 마운트
    await page.goto('/jam');
    await page.evaluate(() => localStorage.removeItem('my-music-app:v1'));
    await page.reload();

    // aria-label="Mute drums" 정확 매치 (kind 그대로 소문자)
    const drumsButton = page.getByRole('button', { name: 'Mute drums' });
    await expect(drumsButton).toBeVisible();
    await expect(drumsButton).toHaveAttribute('aria-pressed', 'false');

    await drumsButton.click();
    await expect(drumsButton).toHaveAttribute('aria-pressed', 'true');
  });
});
