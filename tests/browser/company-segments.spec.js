import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 390, 820, 1440]) test(`stock page integrates the segment card without changing its annual basis at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/NORD.TEST#financials');
  const financials = page.locator('#financials');
  const card = financials.getByRole('region', { name: 'Omsättning per affärsområde' });
  const geography = financials.getByRole('region', { name: 'Omsättning per land', exact: true });
  await expect(card).toBeVisible();
  await expect(geography).toBeVisible();
  await expect(geography.getByRole('img')).toHaveAccessibleName(/Extern omsättning 2025: 120 MSEK.*per land/);
  await expect(geography.getByText('Sverige', { exact: true })).toBeVisible();
  await expect(geography.getByText('40,0 %', { exact: true })).toBeVisible();
  await expect(card.getByRole('img')).toHaveAccessibleName(/Extern omsättning 2025: 120 MSEK/);
  await expect(card).toContainText('MSEK · 2025');
  await expect(card.getByText('Industriprodukter', { exact: true })).toBeVisible();
  await expect(card.getByText('60,0 %', { exact: true })).toBeVisible();
  const series = await card.locator('svg [data-segment]').evaluateAll(slices => slices.map(slice => slice.getAttribute('stroke-dasharray')));
  const earnings = financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true });
  const earningsBox = await earnings.boundingBox(), cardBox = await card.boundingBox(), geographyBox = await geography.boundingBox();
  expect(cardBox.y).toBeGreaterThanOrEqual(earningsBox.y + earningsBox.height);
  if (width >= 820) {
    expect(geographyBox.x).toBeGreaterThan(cardBox.x);
    expect(Math.abs(cardBox.y - geographyBox.y)).toBeLessThan(2);
    expect(cardBox.width).toBeLessThan(earningsBox.width * .51);
    expect(Math.abs(cardBox.width - geographyBox.width)).toBeLessThan(2);
  } else expect(geographyBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
  for (const label of ['År', 'Kvartal']) {
    await financials.getByRole('button', { name: label, exact: true }).click();
    await expect(financials.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByRole('img')).toHaveAccessibleName(/Extern omsättning 2025: 120 MSEK/);
    await expect(geography.getByRole('img')).toHaveAccessibleName(/Extern omsättning 2025: 120 MSEK/);
    expect(await card.locator('svg [data-segment]').evaluateAll(slices => slices.map(slice => slice.getAttribute('stroke-dasharray')))).toEqual(series);
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: testInfo.outputPath(`stock-segments-${theme}-${width}.png`) });
    await geography.screenshot({ path: testInfo.outputPath(`stock-geography-${theme}-${width}.png`) });
    expect((await new AxeBuilder({ page }).include('#financials').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await card.locator('summary').press('Enter');
  await expect(card.getByRole('link', { name: 'Årsrapport 2025 · s. 12' })).toHaveAttribute('href', 'https://example.test/fictional-segments.pdf#page=12');
  await geography.locator('summary').press('Enter');
  await expect(geography).toContainText('kundernas geografiska placering');
  await expect(geography.getByRole('link')).toHaveAttribute('href', 'https://example.test/fictional-segments.pdf#page=13');
});

test('stock page shows qualified segment-only reports without empty period controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [symbol, total, year, pdfPage] of [['ATCO-A.ST', '168 343', 2025, 119], ['EPI-A.ST', '61 998', 2025, 168], ['ALFA.ST', '66 954', 2024, 60]]) {
    await page.goto(`/aktie/${symbol}#financials`);
    const financials = page.locator('#financials');
    const card = financials.getByRole('region', { name: 'Omsättning per affärsområde' });
    await expect(card).toBeVisible();
    expect((await card.boundingBox()).width).toBeLessThan((await financials.boundingBox()).width * .51);
    await expect(financials.getByRole('region', { name: /Omsättning per (land|region)$/ })).toHaveCount(0);
    await expect(card.getByRole('img')).toContainText(total);
    await expect(card).toContainText(`MSEK · ${year}`);
    await expect(financials.getByRole('button', { name: /^(Kvartal|År)$/ })).toHaveCount(0);
    await expect(financials).not.toContainText('Data saknas för vald period');
    await card.locator('summary').click();
    await expect(card.getByRole('link')).toHaveAttribute('href', new RegExp(`#page=${pdfPage}$`));
    await expect(page.locator('#overview')).toContainText('Kurs saknas');
  }
});

test('geography alone stays half-width with its own period and no empty controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/aktie/GEO-ONLY.TEST#financials');
  const financials = page.locator('#financials'), card = financials.getByRole('region', { name: 'Omsättning per land', exact: true });
  await expect(card).toBeVisible();
  expect((await card.boundingBox()).width).toBeLessThan((await financials.boundingBox()).width * .51);
  await expect(card).toContainText('MSEK · 2025');
  await expect(financials.getByRole('button', { name: /^(Kvartal|År)$/ })).toHaveCount(0);
  await expect(financials).not.toContainText('Data saknas för vald period');
  await expect(financials.getByRole('region', { name: 'Omsättning per affärsområde' })).toHaveCount(0);
});

test('regional reports retain the regional label rather than pretending to contain countries', async ({ page }) => {
  await page.goto('/aktie/GEO-REGION.TEST#financials');
  const card = page.locator('#financials').getByRole('region', { name: 'Omsättning per region', exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByRole('img')).toHaveAccessibleName(/Fördelning per region/);
  await expect(card.getByText('Europa', { exact: true })).toBeVisible();
  await expect(page.locator('#financials').getByRole('region', { name: 'Omsättning per land', exact: true })).toHaveCount(0);
});

test('missing, invalid, wrong-company and locked geography stays absent', async ({ page }) => {
  for (const symbol of ['GEO-WRONG.TEST', 'GEO-INVALID.TEST', 'GEO-UNAVAILABLE.TEST', 'GEO-FREE.TEST', 'SEGMENT-ONLY.TEST']) {
    await page.goto(`/aktie/${symbol}#financials`);
    const financials = page.locator('#financials');
    await expect(financials.getByRole('heading', { name: 'Finansiell utveckling', exact: true })).toBeVisible();
    if (symbol === 'GEO-FREE.TEST') await expect(financials).toContainText('ingår i Plus');
    else if (symbol === 'GEO-UNAVAILABLE.TEST') await expect(financials).toContainText('kunde inte hämtas');
    else await expect(financials.getByRole('heading', { name: symbol === 'SEGMENT-ONLY.TEST' ? 'Omsättning per affärsområde' : 'Resultat', exact: true })).toBeVisible();
    await expect(financials.getByRole('region', { name: /Omsättning per (land|region)$/ })).toHaveCount(0);
  }
});

test('many-country reports use the same readable bar fallback without inventing Other', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('/aktie/GEO-MANY.TEST#financials');
  const card = page.locator('#financials').getByRole('region', { name: 'Omsättning per land', exact: true });
  await expect(card).toBeVisible();
  await expect(card.locator('dl > div')).toHaveCount(7);
  await expect(card.locator('svg')).toHaveCount(0);
  await expect(card).toContainText('2025 · MSEK');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('#financials').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('stock page omits wrong-company, incomplete, unavailable and locked segment data', async ({ page }) => {
  for (const symbol of ['SEGMENT-WRONG.TEST', 'SEGMENT-PARENT.TEST', 'SEGMENT-INVALID.TEST', 'SEGMENT-UNAVAILABLE.TEST', 'SEGMENT-FREE.TEST', 'FJALL.TEST']) {
    await page.goto(`/aktie/${symbol}#financials`);
    const financials = page.locator('#financials');
    await expect(financials.getByRole('heading', { name: 'Finansiell utveckling', exact: true })).toBeVisible();
    if (symbol === 'SEGMENT-FREE.TEST') await expect(financials).toContainText('ingår i Plus');
    else if (symbol === 'SEGMENT-UNAVAILABLE.TEST') await expect(financials).toContainText('kunde inte hämtas');
    else if (symbol !== 'FJALL.TEST') await expect(financials.getByRole('heading', { name: 'Resultat', exact: true })).toBeVisible();
    await expect(financials.getByRole('region', { name: 'Omsättning per affärsområde' })).toHaveCount(0);
  }
});

test('stock page preserves every segment when using the many-segment bar fallback', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('/aktie/SEGMENT-MANY.TEST#financials');
  const card = page.locator('#financials').getByRole('region', { name: 'Omsättning per affärsområde' });
  await expect(card).toBeVisible();
  await expect(card.locator('dl > div')).toHaveCount(7);
  await expect(card.locator('svg')).toHaveCount(0);
  await expect(card).toContainText('2025 · MSEK');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('#financials').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

for (const width of [320, 390, 820, 1440]) test(`reviewed segment pilot fits ${width}px in both themes`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/designsystem/segments');
  await expect(page.getByRole('heading', { level: 1, name: 'Affärsområden' })).toBeVisible();
  const panels = page.getByRole('region', { name: 'Omsättning per affärsområde' });
  await expect(panels).toHaveCount(3);
  const alfa = panels.nth(2);
  await expect(alfa).toContainText('MSEK · 2024');
  const zero = alfa.locator('dl > div').filter({ hasText: 'Operations & Other' });
  await expect(zero).toContainText('0,0 %');
  await expect(alfa.locator('svg [data-segment="Operations & Other"]')).toHaveCount(0);
  await expect(alfa.locator('svg [data-segment]')).toHaveCount(3);
  expect(await panels.nth(0).locator('dl > div').count()).toBe(4);
  await expect(panels.nth(1)).toContainText('Common group functions');
  const chart = panels.first().getByRole('img');
  await expect(chart).toHaveAccessibleName(/Extern omsättning 2025: 168\s343 MSEK/);
  await expect(chart).toContainText('168 343');
  await expect(chart).toContainText('MSEK · 2025');
  await expect(panels.first().locator('svg [data-segment]')).toHaveCount(4);
  const tiny = panels.nth(1).locator('svg [data-segment="Common group functions"]');
  const tinySweep = Number((await tiny.getAttribute('stroke-dasharray')).split(' ')[0]);
  expect(tinySweep).toBeGreaterThan(0);
  expect(tinySweep).toBeLessThan(.2);
  const donutBox = await chart.boundingBox(), legendBox = await panels.first().locator('dl').boundingBox();
  if (width < 480) {
    expect(donutBox.y + donutBox.height).toBeLessThan(legendBox.y);
    expect(donutBox.width).toBe(160);
  } else {
    expect(donutBox.x + donutBox.width).toBeLessThan(legendBox.x);
    expect(donutBox.width).toBe(176);
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const panel of await panels.all()) {
      const colors = await panel.evaluate(element => ({
        slices: Array.from(element.querySelectorAll('svg [data-segment]'), slice => ({ label: slice.dataset.segment, color: getComputedStyle(slice).stroke })),
        rows: Array.from(element.querySelectorAll('dt'), row => ({ label: row.textContent, color: getComputedStyle(row.querySelector('[aria-hidden]')).backgroundColor })),
      }));
      for (const slice of colors.slices) expect(slice.color).toBe(colors.rows.find(row => row.label === slice.label).color);
    }
    await page.getByRole('main').screenshot({ path: testInfo.outputPath(`segments-${theme}-${width}.png`) });
    const audit = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
  }
  await alfa.locator('summary').click();
  await expect(alfa).toContainText('avviker med −1 MSEK');
  await expect(alfa.getByRole('link', { name: 'Årsrapport 2024 · s. 118' })).toHaveAttribute('href', /#page=60$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});
