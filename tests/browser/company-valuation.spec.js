import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 390, 820, 1440]) for (const theme of ['light', 'dark']) test(`coordinated valuation charts fit ${width}px ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE.TEST#valuation');
  await page.evaluate(theme => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, theme);
  const section = page.locator('#valuation');
  await expect(section.getByRole('heading', { name: 'P/E över tid' })).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Vinst per aktie', exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'EV/EBIT', exact: true }).click();
  await expect(section.getByRole('heading', { name: 'EV/EBIT över tid' })).toBeVisible();
  await expect(section.getByText('OMXsum-estimat', { exact: true })).toBeVisible();
  await expect(section.getByText('Kvartalsestimat · ingen helårsmultipel')).toBeVisible();
  await expect(section.locator('pattern')).toHaveCount(1);
  const bars = section.locator('.recharts-bar-rectangle');
  const firstBar = await bars.first().boundingBox(), lastBar = await bars.last().boundingBox();
  expect(firstBar.height).toBeGreaterThan(lastBar.height * .8);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await section.getByRole('button').all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(43);
  if (width === 320) {
    const buttons = section.getByRole('button');
    expect((await buttons.nth(2).boundingBox()).y).toBeGreaterThan((await buttons.nth(0).boundingBox()).y);
  }
  const charts = section.locator('div[role="img"]');
  expect(await charts.count()).toBe(2);
  const [left, right] = await Promise.all([charts.nth(0).boundingBox(), charts.nth(1).boundingBox()]);
  if (width === 1440) expect(right.x).toBeGreaterThan(left.x + left.width);
  else expect(right.y).toBeGreaterThan(left.y + left.height);
  if ([320, 1440].includes(width)) {
    expect((await new AxeBuilder({ page }).include('#valuation').analyze()).violations).toEqual([]);
    await section.screenshot({ path: `/private/tmp/omx-valuation-live-${width}-${theme}.png` });
  }
  await section.getByText('Beräkning & underlag', { exact: true }).click();
  await expect(section.getByText(/antagen publiceringsfördröjning/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('annual forward multiples retain sources and keyboard-driven metric control', async ({ page }) => {
  await page.goto('/aktie/VALUE-ANNUAL.TEST#valuation');
  const section = page.locator('#valuation');
  await expect(section.getByText('P/E 17,2×', { exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'P/E', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(section.getByRole('heading', { name: 'EV/EBIT över tid' })).toBeVisible();
  await expect(section.getByText('EV/EBIT 35,1×', { exact: true })).toBeVisible();
  await section.screenshot({ path: '/private/tmp/omx-valuation-live-annual.png' });
});

test('failed valuation can be retried and failed estimates do not claim an absence', async ({ page }) => {
  let fail = true;
  await page.route('**/api/feed/company/VALUE-FAIL.TEST/valuation', async route => {
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Tillfälligt fel' }) });
    return route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:8100/api/feed/company/VALUE-FAIL.TEST/valuation' }) });
  });
  await page.goto('/aktie/VALUE-FAIL.TEST#valuation');
  const section = page.locator('#valuation');
  await expect(section.getByText('Värderingen kunde inte hämtas', { exact: true })).toBeVisible();
  fail = false;
  await section.getByRole('button', { name: 'Försök igen' }).click();
  await expect(section.getByRole('heading', { name: 'P/E över tid' })).toBeVisible();
  await expect(section.getByText('Estimat kunde inte hämtas.', { exact: true })).toBeVisible();
});

test('wrong-company response is not rendered', async ({ page }) => {
  await page.route('**/api/feed/company/VALUE.TEST/valuation', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ symbol: 'OTHER.TEST', multiples: [] }) }));
  await page.goto('/aktie/VALUE.TEST#valuation');
  await expect(page.locator('#valuation').getByText('Värderingsunderlaget kunde inte verifieras.')).toBeVisible();
});
