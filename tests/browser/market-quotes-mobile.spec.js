import { test, expect } from '@playwright/test';

// Read-only fictional market sessions; never use an account or production API.
test.use({ hasTouch: true });
async function setup(page, { missingHistory = false } = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget { close() {} };
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      const response = await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` });
      if (url.pathname === '/api/feed/market-overview') {
        const data = await response.json();
        data.benchmarks.forEach((index, n) => { index.session.latestPrice = [3028.45, 3141.32, 7469.53][n]; });
        const points = data.benchmarks[0].session.points;
        data.commodities = [{ id: 'brent', price: 98.94, changePct: 2.9,
          session: { points: missingHistory ? [] : points, asOf: data.generatedAt }, asOf: data.generatedAt }];
        if (missingHistory) data.benchmarks.forEach(index => { index.session.points = []; });
        return route.fulfill({ json: data });
      }
      return route.fulfill({ response });
    }
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
}

for (const width of [320, 390, 768]) {
  for (const theme of ['light', 'dark']) {
    test(`market curves stay visible and fit at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await setup(page);
      await page.setViewportSize({ width, height: 850 });
      await page.goto('/marknaden');
      const strip = page.getByRole('region', { name: 'Marknadsläge', exact: true });
      // Brent is added by the client fixture, so wait for the hydrated session.
      await expect(strip.getByRole('img', { name: /^Brentolja,/ })).toBeVisible();
      await page.evaluate(mode => {
        document.documentElement.classList.toggle('dark', mode === 'dark');
        document.documentElement.classList.toggle('light', mode === 'light');
      }, theme);
      await expect(strip.getByRole('img')).toHaveCount(4);
      for (const name of ['OMXSPI', 'OMXS30', 'S&P 500', 'Brentolja']) {
        const card = strip.locator(`div[aria-label="${name}"]`);
        const curve = card.getByRole('img');
        const label = card.getByText(name, { exact: true });
        const badge = card.locator('[aria-label]').filter({ hasText: '%' });
        const value = card.locator('small');
        await expect(value).toBeVisible();
        await expect(curve).toBeVisible();
        await expect(curve.locator('path')).not.toHaveAttribute('d', '');
        const [cardBox, curveBox] = await Promise.all([card.boundingBox(), curve.boundingBox()]);
        expect(curveBox.width).toBeGreaterThanOrEqual(36);
        expect(curveBox.height).toBeGreaterThanOrEqual(24);
        expect(curveBox.x).toBeGreaterThanOrEqual(cardBox.x);
        expect(curveBox.x + curveBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
        const [labelBox, badgeBox, valueBox] = await Promise.all([label.boundingBox(), badge.boundingBox(), value.boundingBox()]);
        expect(valueBox.y).toBeGreaterThanOrEqual(labelBox.y + labelBox.height);
        expect(await value.evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
        await expect(card).not.toContainText(/\b20\d{2}-\d{2}-\d{2}\b/);
        if (width <= 760) {
          expect(curveBox.y).toBeGreaterThanOrEqual(Math.max(valueBox.y + valueBox.height, badgeBox.y + badgeBox.height));
          expect(Math.abs(curveBox.x - cardBox.x)).toBeLessThan(1);
          expect(Math.abs(curveBox.width - cardBox.width)).toBeLessThan(1);
          // Only the graph bleeds to the edges; the text remains inset.
          expect(labelBox.x).toBeGreaterThanOrEqual(cardBox.x + 11);
          expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width - 11);
          if (width > 360) expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(labelBox.x);
          else expect(badgeBox.y).toBeGreaterThanOrEqual(valueBox.y + valueBox.height);
        }
      }
      await expect(strip).toContainText('3\u00a0028,45');
      await expect(strip).toContainText('7\u00a0469,53');
      await expect(strip).toContainText('98,94');
      const first = await strip.locator('div[aria-label="OMXSPI"]').boundingBox();
      const second = await strip.locator('div[aria-label="OMXS30"]').boundingBox();
      const third = await strip.locator('div[aria-label="S&P 500"]').boundingBox();
      expect(first.y).toBe(second.y);
      expect(third.y).toBeGreaterThan(first.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await strip.screenshot({ path: testInfo.outputPath(`market-curves-${width}-${theme}.png`) });
      await page.screenshot({ path: testInfo.outputPath(`overview-${width}-${theme}.png`) });
    });
  }
}

test('missing session history does not create a fictional mobile curve', async ({ page }) => {
  await setup(page, { missingHistory: true });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/marknaden');
  const strip = page.getByRole('region', { name: 'Marknadsläge', exact: true });
  await expect(strip).toContainText('98,94');
  await expect(strip).toContainText('USD/fat');
  await expect(strip.getByRole('img')).toHaveCount(0);
  await expect(strip).toContainText('+2,9 %');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
