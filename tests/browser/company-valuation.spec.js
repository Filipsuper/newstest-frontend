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
  await expect(section.getByText('Kvartalsestimat · R12E-underlag saknas')).toBeVisible();
  await expect(section.locator('.recharts-line-curve[stroke-dasharray="1 6"]')).toHaveCount(0);
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

for (const width of [320, 1440]) for (const theme of ['light', 'dark']) test(`R12E reference uses matching history ${width}px ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE-R12.TEST#valuation');
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  const section = page.locator('#valuation');
  await expect(section.getByRole('group', { name: 'Estimatår', exact: true })).toHaveCount(0);
  for (const metric of ['P/E', 'P/S', 'EV/EBIT', 'EV/S']) {
    await section.getByRole('button', { name: metric, exact: true }).click();
    await expect(section.getByText('R12 → R12E', { exact: true })).toBeVisible();
    await expect(section.getByRole('img', { name: /Prickad linje: R12E/ })).toBeVisible();
    await expect(section.locator('.recharts-line-curve[stroke-dasharray="1 6"]')).toHaveCount(1);
    await expect(section.getByText(/3 rapporterade kvartal/)).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await section.screenshot({ path: testInfo.outputPath(`r12e-${width}-${theme}.png`) });
  await section.getByText('Beräkning & underlag', { exact: true }).click();
  await expect(section.getByText(/Det är inte en prognos för de kommande tolv månaderna/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include('#valuation').analyze()).violations).toEqual([]);
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

for (const width of [320, 1440]) for (const theme of ['light', 'dark']) test(`annual hybrid model and quarter toggle ${width}px ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE-MODEL-ANNUAL.TEST#valuation');
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  const section = page.locator('#valuation'), year = new Date().getUTCFullYear();
  await section.getByRole('button', { name: 'P/S', exact: true }).click();
  await expect(section.getByRole('button', { name: `${year + 1}E`, exact: true })).toBeVisible();
  await section.getByRole('button', { name: `${year + 2}E`, exact: true }).click();
  await expect(section.getByRole('img', { name: new RegExp(`Prickad linje: ${year + 2}E`) })).toBeVisible();
  await section.getByText('Beräkning & underlag', { exact: true }).click();
  await expect(section.getByText(/Vikterna är preliminära/)).toBeVisible();
  const estimates = page.locator('#estimates');
  await estimates.scrollIntoViewIfNeeded();
  await expect(estimates.getByRole('button', { name: 'Helår', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(estimates.getByText(/Vissa årsestimat behöver granskas/)).toBeVisible();
  await estimates.getByRole('button', { name: 'Kvartal', exact: true }).click();
  await expect(estimates.getByRole('button', { name: 'Kvartal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await estimates.getByRole('button', { name: 'Helår', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('#estimates').analyze()).violations).toEqual([]);
  await estimates.screenshot({ path: testInfo.outputPath(`annual-hybrid-${width}-${theme}.png`) });
});

for (const width of [320, 1440]) for (const theme of ['light', 'dark']) test(`estimate year selection changes the endpoint ${width}px ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE-ANNUAL.TEST#valuation');
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  const section = page.locator('#valuation');
  const year = new Date().getUTCFullYear();
  const first = section.getByRole('button', { name: `${year}E`, exact: true });
  const second = section.getByRole('button', { name: `${year + 1}E`, exact: true });
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  for (const [metric, multiple] of [['P/E', '15,6'], ['EV/EBIT', '30,2'], ['P/S', '4,1'], ['EV/S', '4,2']]) {
    await section.getByRole('button', { name: metric, exact: true }).click();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    const chart = section.getByRole('img', { name: new RegExp(`Prickad linje: ${year + 1}E · ${multiple}×`) });
    await expect(chart).toBeVisible();
    await expect(chart.locator('.recharts-reference-dot').filter({ hasText: `${year + 1}E · ${multiple}×` })).toHaveCount(1);
    await expect(section.locator('.recharts-line-curve[stroke-dasharray="1 6"]')).toHaveCount(1);
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of [first, second]) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(43);
  expect((await new AxeBuilder({ page }).include('#valuation').analyze()).violations).toEqual([]);
  await section.screenshot({ path: testInfo.outputPath(`estimate-year-${width}-${theme}.png`) });
  await second.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByRole('img', { name: new RegExp(`Prickad linje: ${year}E · 4,7×`) })).toBeVisible();
});

for (const width of [320, 1440]) for (const theme of ['light', 'dark']) test(`annual estimate reference is labelled and visible ${width}px ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE-ANNUAL.TEST#valuation');
  await page.evaluate(async theme => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    await new Promise(resolve => requestAnimationFrame(resolve));
    await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  }, theme);
  const section = page.locator('#valuation');
  for (const [metric, value] of [['P/E', '17,2'], ['EV/EBIT', '35,1'], ['P/S', '4,5'], ['EV/S', '4,7']]) {
    await section.getByRole('button', { name: metric, exact: true }).click();
    const line = section.locator('.recharts-line-curve[stroke-dasharray="1 6"]');
    await expect(line).toHaveCount(1);
    const chart = section.getByRole('img', { name: new RegExp(`Prickad linje:.*${value}×`) });
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAccessibleName(/Konsensus, vid kurs 100 SEK/);
    await expect(chart.locator('.recharts-reference-dot').filter({ hasText: `${new Date().getUTCFullYear()}E · ${value}×` })).toHaveCount(1);
    const lineBox = await line.boundingBox(), chartBox = await chart.boundingBox();
    // Compare path coordinates; browser bounding boxes include stroke padding.
    const endpoints = await chart.evaluate(element => {
      const history = element.querySelector('.recharts-line-curve:not([stroke-dasharray])');
      const estimate = element.querySelector('.recharts-line-curve[stroke-dasharray="1 6"]');
      const point = (path, length) => { const p = path.getPointAtLength(length); return { x: p.x, y: p.y }; };
      return { first: point(history, 0), last: point(history, history.getTotalLength()),
        start: point(estimate, 0), end: point(estimate, estimate.getTotalLength()) };
    });
    expect((endpoints.end.x - endpoints.start.x) / (endpoints.end.x - endpoints.first.x)).toBeCloseTo(.1, 2);
    expect(endpoints.start.x).toBeCloseTo(endpoints.last.x, 2);
    expect(endpoints.start.y).toBeCloseTo(endpoints.last.y, 2);
    expect(lineBox.y).toBeGreaterThan(chartBox.y);
    expect(lineBox.y).toBeLessThan(chartBox.y + chartBox.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await section.getByRole('button', { name: 'P/E', exact: true }).click();
  expect((await new AxeBuilder({ page }).include('#valuation').analyze()).violations).toEqual([]);
  await section.screenshot({ path: testInfo.outputPath(`estimate-reference-${width}-${theme}.png`) });
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
