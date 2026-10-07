import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { screenerResponse, profileResponse } from '../fixtures/screener.mjs';

const fixtureOrigin = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ9sAAAAASUVORK5CYII=', 'base64');
const company = { symbol: 'NORD.TEST', name: 'Norden Industri', nativeSymbol: 'NORD',
  logo: { url: 'https://terminal.omxsum.com/api/v1/logos/NORD.TEST.png', sha256: 'a'.repeat(64) } };
const missing = { symbol: 'SKAR.TEST', name: 'Skärgården Teknik', nativeSymbol: 'SKAR', logo: null, logoUrl: null };

async function setup(page, { holdImages = false } = {}) {
  const requests = [], pending = [];
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'terminal.omxsum.com') {
      requests.push(url.pathname);
      if (holdImages) { await new Promise(resolve => pending.push(resolve)); }
      return route.fulfill({ body: image, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/api/user') return route.fulfill({ json: {
      email: 'logos@example.test', plan: 'plus', verified: true,
      watchlist: ['NORD.TEST', 'SKAR.TEST'], topics: [], keywords: [],
    } });
    if (url.pathname === '/api/feed/companies') return route.fulfill({ json: [company, missing] });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({
      url: `${fixtureOrigin}${url.pathname}${url.search}`,
    }) });
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return { requests, release: () => { holdImages = false; pending.splice(0).forEach(resolve => resolve()); } };
}

for (const width of [390, 1440]) test(`stock search uses compact logos and retains keyboard selection at ${width}px`, async ({ page }, testInfo) => {
  const { requests, release } = await setup(page, { holdImages: true });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/marknaden');
  if (width < 960) await page.getByRole('button', { name: 'Sök bolag och nyheter' }).click();
  const search = page.getByRole('combobox', { name: 'Sök efter bolag eller ticker' });
  await search.fill('Norden');
  const result = page.getByRole('option', { name: /Norden Industri/ });
  await expect(result).toBeVisible();
  const logo = result.locator('[data-company-logo]');
  await expect(logo).toHaveCSS('width', '32px');
  const before = await result.boundingBox();
  release();
  await expect(logo).toHaveAttribute('data-logo-state', 'loaded');
  const after = await result.boundingBox();
  expect(after.width).toBeCloseTo(before.width, 3);
  expect(after.height).toBeCloseTo(before.height, 3);
  await expect(logo.locator('img')).toHaveAttribute('alt', '');
  await expect(logo).toHaveAttribute('aria-hidden', 'true');
  // Other market rows can have older company metadata without a logo record.
  // The search result's explicit missing-logo record must still avoid an image.
  await search.fill('Skärgården');
  const missingResult = page.getByRole('option', { name: /Skärgården Teknik/ });
  await expect(missingResult.locator('[data-company-logo] img')).toHaveCount(0);
  await search.fill('Norden');
  await expect(result).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('listbox').screenshot({ path: testInfo.outputPath(`search-${width}-${theme}.png`) });
  }
  await search.press('ArrowDown');
  // The shared combobox loops through its input after the final option. The
  // sole result may already be auto-highlighted before this keyboard action.
  if (await result.getAttribute('data-highlighted') === null) await search.press('ArrowDown');
  await expect(result).toHaveAttribute('data-highlighted', '');
  await search.press('Enter');
  // The first company route includes a cold Next dev compilation/SSR pass.
  await expect(page).toHaveURL(/\/aktie\/NORD.TEST/, { timeout: 15000 });
});

test('company header reserves logo geometry and uses a fallback after failure', async ({ page }) => {
  await setup(page);
  await page.route('https://terminal.omxsum.com/**', route => route.abort());
  await page.goto('/aktie/NORD.TEST');
  const heading = page.getByRole('heading', { name: 'Norden Industri', exact: true });
  await expect(heading).toBeVisible();
  const logo = page.locator('header [data-company-logo="NORD.TEST"]').last();
  await expect(logo).toHaveCSS('width', '48px');
  await expect(logo).toHaveCSS('height', '48px');
  await expect(logo).toHaveAttribute('data-logo-state', 'fallback');
  await expect(logo.locator('img')).toHaveCount(0);
  await expect(logo).toContainText('NI');
  expect((await new AxeBuilder({ page }).include('#overview').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});

for (const width of [390, 1440]) test(`company header keeps its compact logo without image layout shifts at ${width}px`, async ({ page }) => {
  const { release } = await setup(page, { holdImages: true });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/aktie/NORD.TEST', { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { name: 'Norden Industri', exact: true });
  await expect(heading).toBeVisible();
  // Account hydration changes "Följ bolag" to "Följer" independently of
  // the image. Settle that state and fonts before measuring image shifts.
  await expect(page.getByRole('button', { name: 'Sluta följa Norden Industri', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const logo = page.locator('header [data-company-logo="NORD.TEST"]').last();
  const before = await logo.boundingBox();
  expect(before.height).toBe(48);
  expect(before.width).toBe(48);
  const copyBefore = await heading.locator('..').boundingBox();
  release();
  await expect(logo).toHaveAttribute('data-logo-state', 'loaded');
  expect(await logo.boundingBox()).toEqual(before);
  expect(await heading.locator('..').boundingBox()).toEqual(copyBefore);
  // Long names wrap as text, rather than inflating the logo and squeezing
  // the remaining text into an ever-narrower column on small screens.
  await heading.evaluate(node => { node.textContent = 'Norden Industri och Teknik Holding'; });
  expect((await logo.boundingBox()).width).toBe(before.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('saved companies use 24px logos without changing topic chips or consent', async ({ page }) => {
  const { requests } = await setup(page);
  const writes = [];
  page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/user')) writes.push(request.url()); });
  await page.goto('/marknaden/bevakning/hantera');
  const choices = page.getByRole('list', { name: 'Valda bolag' });
  await expect(choices).toBeVisible();
  await expect(choices.locator('[data-company-logo="NORD.TEST"]')).toHaveCSS('width', '24px');
  await expect(choices.locator('[data-company-logo="SKAR.TEST"]')).toHaveCSS('width', '24px');
  await expect(choices.locator('[data-company-logo="SKAR.TEST"] img')).toHaveCount(0);
  await expect(choices.getByRole('button', { name: 'Sluta följa Norden Industri' })).toBeEnabled();
  await page.getByRole('tab', { name: /Ämnen/ }).click();
  expect(requests.every(path => !path.includes('SKAR.TEST'))).toBe(true);
  expect(writes).toEqual([]);
});

test('onboarding retains compact saved-company rows on mobile', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem('omxsum:onboarding-step:account:logos@example.test', '2'));
  await page.goto('/kom-igang');
  const choices = page.getByRole('list', { name: 'Valda bolag' });
  await expect(choices).toBeVisible();
  await expect(choices.locator('[data-company-logo="NORD.TEST"]')).toHaveCSS('width', '24px');
  await expect(choices.locator('[data-company-logo="SKAR.TEST"] img')).toHaveCount(0);
  await expect(choices.getByRole('button', { name: 'Ta bort Norden Industri' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('discovery and the news reader reuse decorative fixed-size company logos', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/aktier');
  const rows = page.getByRole('list', { name: 'Bolag', exact: true });
  const companyLink = rows.getByRole('link', { name: 'Norden Industri', exact: true });
  const logo = rows.locator('[data-company-logo="NORD.TEST"]');
  await expect(logo).toHaveCSS('width', '32px');
  await expect(logo).toHaveAttribute('data-logo-state', 'loaded');
  await expect(companyLink).toHaveAttribute('href', '/aktie/NORD.TEST');
  await rows.locator('a[href^="/nyhet/"][href$="~fixture-0"]').click();
  const reader = page.getByRole('dialog');
  await expect(reader).toBeVisible();
  const readerCompany = reader.getByRole('link', { name: 'Norden Industri', exact: true }).first();
  await expect(readerCompany.locator('[data-company-logo]')).toHaveCSS('width', '24px');
  await expect(readerCompany.locator('[data-company-logo]')).toHaveAttribute('aria-hidden', 'true');
  await expect(readerCompany).toHaveAttribute('href', '/aktie/NORD.TEST');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/aktier$/);
  expect(errors).toEqual([]);
});

test('screener keeps company profiles without adding logos or expanding rows', async ({ page }) => {
  await setup(page);
  await page.route('**/api/feed/screener**', route => route.fulfill({ json: screenerResponse }));
  await page.route('**/api/feed/company-profiles**', route => route.fulfill({ json: profileResponse((new URL(route.request().url()).searchParams.get('symbols') || '').split(',')) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aktier/screener');
  const first = page.getByRole('table', { name: 'Bolag och nyckeltal', exact: true }).locator('tbody tr').first();
  await expect(first.locator('[data-company-logo]')).toHaveCount(0);
  await expect(first.getByRole('img')).toHaveAccessibleName(/profil/);
  expect((await first.boundingBox()).height).toBe(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
