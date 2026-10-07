import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { REVENUE_BETA_LABEL, REVENUE_BETA_UNCERTAINTY } from '../../app/utils/revenueBeta.js';
const fixtureBase = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `${fixtureBase}${url.pathname}${url.search}` }) });
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 1440]) for (const theme of ['light', 'dark']) test(`revenue-only beta has shared readable labels and disclosures ${width}px ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/VALUE-R12-BETA.TEST#estimates');
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  const estimates = page.locator('#estimates');
  await expect(estimates.getByText(REVENUE_BETA_LABEL, { exact: true })).toBeVisible();
  await expect(estimates.getByText(REVENUE_BETA_UNCERTAINTY, { exact: true })).toBeVisible();
  await expect(estimates.getByRole('img', { name: /Omsättning.*OMXsum-estimat · Beta/ })).toBeVisible();
  await expect(estimates.getByRole('heading', { name: 'EBIT', exact: true })).toBeVisible();
  await expect(estimates.getByText(/medianen av de fyra senaste rapporterade/)).not.toBeVisible();
  await estimates.getByText('Estimatens källor & underlag', { exact: true }).click();
  await expect(estimates.getByText(/medianen av de fyra senaste rapporterade/)).toBeVisible();
  await expect(estimates.getByText(/Nyheter justerar ännu inte beloppet/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include('#estimates').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/aktie/VALUE-R12-BETA.TEST#valuation');
  await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
  const valuation = page.locator('#valuation');
  await valuation.getByRole('button', { name: 'P/S', exact: true }).click();
  await expect(valuation.getByText(REVENUE_BETA_LABEL, { exact: true })).toBeVisible();
  await expect(valuation.getByText(REVENUE_BETA_UNCERTAINTY, { exact: true })).toBeVisible();
  await expect(valuation.getByRole('img', { name: /Prickad linje: R12E.*OMXsum-estimat · Beta/ })).toBeVisible();
  await valuation.getByText('Beräkning & underlag', { exact: true }).click();
  await expect(valuation.getByText(/medianen av de fyra senaste rapporterade/)).toBeVisible();
  await expect(valuation.getByText(/medianen av senare årstillväxt/)).toHaveCount(0);
  await valuation.getByRole('button', { name: 'EV/EBIT', exact: true }).click();
  await expect(valuation.getByText(REVENUE_BETA_LABEL, { exact: true })).toHaveCount(0);
  await expect(valuation.getByText(REVENUE_BETA_UNCERTAINTY, { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('qualified consensus keeps its own label and never inherits model beta warnings', async ({ page }) => {
  const response = await page.request.get(`${fixtureBase}/api/feed/company/VALUE-R12-BETA-CONSENSUS.TEST/overview`);
  const data = await response.json();
  expect(data.estimates.revenueBetaModels).toHaveLength(1);
  expect(data.estimates.snapshots).toHaveLength(1);
  await page.goto('/aktie/VALUE-R12-BETA-CONSENSUS.TEST#estimates');
  const estimates = page.locator('#estimates');
  await expect(estimates.getByText('Konsensus', { exact: true }).first()).toBeVisible();
  await expect(estimates.getByText(REVENUE_BETA_LABEL, { exact: true })).toHaveCount(0);
  await expect(estimates.getByText(REVENUE_BETA_UNCERTAINTY, { exact: true })).toHaveCount(0);
});

test('retired revenue never falls back to an old estimate when beta is off or withheld', async ({ page }) => {
  await page.goto('/aktie/VALUE-R12-RETIRED.TEST#estimates');
  const estimates = page.locator('#estimates');
  await expect(estimates.getByRole('heading', { name: 'EBIT', exact: true })).toBeVisible();
  await expect(estimates.getByRole('heading', { name: 'Omsättning', exact: true })).toHaveCount(0);
  await expect(estimates.getByText(REVENUE_BETA_LABEL, { exact: true })).toHaveCount(0);
  await page.goto('/aktie/VALUE-R12-RETIRED.TEST#valuation');
  const valuation = page.locator('#valuation');
  await valuation.getByRole('button', { name: 'P/S', exact: true }).click();
  await expect(valuation.getByText('Inget jämförbart estimat för detta mått.', { exact: true })).toBeVisible();
  await expect(valuation.getByRole('list', { name: 'Framåtblickande värden' })).toHaveCount(0);
  await expect(valuation.getByRole('img', { name: /^P\/S historiskt/ })).toBeVisible();
  await expect(valuation.getByRole('img', { name: /^Omsättning:/ })).toBeVisible();
});

test('all-model retirement retains the new revenue beta while removing old EBIT and annual models', async ({ page }) => {
  await page.goto('/aktie/VALUE-R12-BETA-ALL-HIDDEN.TEST#estimates');
  const estimates = page.locator('#estimates');
  await expect(estimates.getByText(REVENUE_BETA_LABEL, { exact: true })).toBeVisible();
  await expect(estimates.getByRole('heading', { name: 'EBIT', exact: true })).toHaveCount(0);
  await expect(estimates.getByRole('heading', { name: 'Vinst per aktie', exact: true })).toHaveCount(0);
  await expect(estimates.getByText('Årsestimat behöver granskas', { exact: true })).toHaveCount(0);
  await page.goto('/aktie/VALUE-R12-RETIRED-ALL.TEST#estimates');
  await expect(page.locator('#estimates').getByText('Inga jämförbara estimat ännu', { exact: true })).toBeVisible();
});
