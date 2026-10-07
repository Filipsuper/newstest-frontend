import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { screenerResponse, freeScreenerResponse } from '../fixtures/screener.mjs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/feed/screener') return route.fulfill({ json: screenerResponse });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});
const table = page => page.getByRole('table', { name: 'Bolag och nyckeltal' });
const companyLink = (page, name) => table(page).getByRole('link').filter({ has: page.locator('strong', { hasText: name }) });
const drawer = (page, name = 'Norden Industri') => page.getByRole('dialog', { name, exact: true });

for (const width of [320, 390, 1440]) test(`drawer entrance stays aligned while focus and company data arrive at ${width}px`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktier/screener');
  await expect(companyLink(page, 'Norden Industri')).toBeVisible();
  const openings = [];
  for (let opening = 0; opening < 2; opening++) {
    await page.evaluate(() => {
      window.drawerMotionSamples = [];
      const sample = () => {
        const panel = document.querySelector('[role="dialog"]');
        if (panel) {
          const viewport = panel.parentElement;
          const rect = panel.getBoundingClientRect();
          const parentRect = viewport.getBoundingClientRect();
          const transform = new DOMMatrix(getComputedStyle(panel).transform);
          window.drawerMotionSamples.push({ x: rect.x, width: rect.width, tx: transform.m41,
            scroll: viewport.scrollLeft, expected: parentRect.x + viewport.clientWidth - rect.width + transform.m41,
            starting: panel.hasAttribute('data-starting-style') });
        }
        if (window.drawerMotionSamples.length < 40) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await companyLink(page, 'Norden Industri').click();
    await expect.poll(() => page.evaluate(() => window.drawerMotionSamples.length)).toBeGreaterThanOrEqual(40);
    const samples = await page.evaluate(() => window.drawerMotionSamples);
    openings.push(samples);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  for (const samples of openings) {
    expect(samples.some(sample => sample.tx > 1)).toBe(true);
    expect(samples.every(sample => Math.abs(sample.x - sample.expected) < 1 && sample.scroll === 0)).toBe(true);
    expect(samples.slice(1).every((sample, index) => sample.tx <= samples[index].tx + 1)).toBe(true);
    expect(samples.at(-1).tx).toBeCloseTo(0, 1);
    expect(samples.every(sample => Math.abs(sample.width - samples[0].width) < 1)).toBe(true);
  }
});

test('drawer has a slower entrance without changing other dialogs and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/aktier/screener');
  await companyLink(page, 'Norden Industri').click();
  await expect(drawer(page)).toBeVisible();
  expect(await drawer(page).evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.36s');
  await expect(drawer(page).getByRole('button', { name: 'Diagraminställningar' })).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Diagraminställningar' }).click();
  const settings = page.getByRole('dialog', { name: 'Diagraminställningar', exact: true });
  await expect(settings).toBeVisible();
  expect(await settings.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.16s, 0.16s');
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await drawer(page).evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
});

test('company drawer retains the screener, navigates the filtered order and caches revisits', async ({ page }, testInfo) => {
  let overviewRequests = 0, profileRequests = 0;
  page.on('request', request => {
    if (/\/api\/feed\/company\/[^/]+\/overview/.test(request.url())) overviewRequests++;
    if (request.url().includes('/company-profiles')) profileRequests++;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/aktier/screener?utm_source=drawer');
  await expect(table(page).locator('tbody tr')).toHaveCount(50);
  await companyLink(page, 'Norden Industri').click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).getByRole('group', { name: 'Kursutveckling för Norden Industri' })).toBeVisible();
  await expect(drawer(page).getByRole('heading', { name: 'Senaste nytt' })).toBeVisible();
  await expect(drawer(page).getByRole('link', { name: 'Hela bolagssidan' })).toHaveAttribute('href', '/aktie/NORD.TEST');
  await expect(drawer(page).getByRole('button', { name: 'Föregående bolag' })).toBeDisabled();
  await expect(drawer(page).getByText('1 / 63', { exact: true })).toBeVisible();
  const beforeRange = page.url();
  await drawer(page).getByRole('button', { name: '1 mån', exact: true }).click();
  expect(page.url()).toBe(beforeRange);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {}))); });
    await expect(drawer(page).locator('.recharts-line-curve').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`screener-drawer-${theme}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await drawer(page).getByRole('button', { name: 'Nästa bolag' }).click();
  await expect(drawer(page, 'Skärgården Teknik')).toBeVisible();
  await expect(drawer(page, 'Skärgården Teknik').getByRole('group', { name: 'Kursutveckling för Skärgården Teknik' })).toBeVisible();
  const beforeRevisit = overviewRequests;
  await drawer(page, 'Skärgården Teknik').getByRole('button', { name: 'Föregående bolag' }).click();
  await expect(drawer(page).getByRole('group', { name: 'Kursutveckling för Norden Industri' })).toBeVisible();
  expect(overviewRequests).toBe(beforeRevisit);
  expect(profileRequests).toBe(0);
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
  await expect(companyLink(page, 'Norden Industri')).toBeFocused();
  expect(new URL(page.url()).searchParams.has('company')).toBe(false);
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('drawer');
  await page.goForward();
  await expect(drawer(page)).toBeVisible();
  await page.goBack();
  await expect(drawer(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Lägre P/E', exact: true }).click();
  await companyLink(page, 'Norden Industri').click();
  await expect(drawer(page).getByText('2 / 2', { exact: true })).toBeVisible();
  await expect(drawer(page).getByRole('button', { name: 'Nästa bolag' })).toBeDisabled();
  await drawer(page).getByRole('button', { name: 'Föregående bolag' }).click();
  await expect(drawer(page, 'Skärgården Teknik').getByText('1 / 2', { exact: true })).toBeVisible();
  await expect(drawer(page, 'Skärgården Teknik').getByRole('button', { name: 'Föregående bolag' })).toBeDisabled();
});

test('deep linked drawer rejects mismatched responses and retries without losing filters', async ({ page }) => {
  let wrongCompany = true;
  await page.route('**/api/feed/company/NORD.TEST/overview', async route => {
    const response = await route.fetch({ url: 'http://127.0.0.1:8100/api/feed/company/NORD.TEST/overview' });
    const data = await response.json();
    return route.fulfill({ json: wrongCompany ? { ...data, symbol: 'WRONG.TEST' } : data });
  });
  await page.goto('/aktier/screener?company=NORD.TEST&sector=Industri');
  await expect(drawer(page).getByRole('alert')).toContainText('Bolagsvyn kunde inte hämtas');
  await expect(drawer(page).locator('.company-chart')).toHaveCount(0);
  wrongCompany = false;
  await drawer(page).getByRole('button', { name: 'Försök igen' }).click();
  await expect(drawer(page).getByRole('group', { name: 'Kursutveckling för Norden Industri' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('sector')).toBe('Industri');
  await expect(table(page).locator('tbody tr')).toHaveCount(1);
});

for (const width of [320, 390]) test(`mobile drawer fits ${width}px and closes back to the same scroll`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await page.route('**/api/user', route => route.fulfill({ json: { email: 'free@example.test', verified: true, plan: 'free' } }));
  await page.route('**/api/feed/screener?**', route => route.fulfill({ json: freeScreenerResponse }));
  await page.goto('/aktier/screener');
  await expect(table(page).locator('tbody tr')).toHaveCount(50);
  await companyLink(page, 'Skärgården Teknik').scrollIntoViewIfNeeded();
  await companyLink(page, 'Skärgården Teknik').evaluate(element => element.addEventListener('click', () => { window.drawerClickScroll = scrollY; }, { once: true }));
  await companyLink(page, 'Skärgården Teknik').click();
  const originalScroll = await page.evaluate(() => window.drawerClickScroll);
  const panel = drawer(page, 'Skärgården Teknik');
  await expect(panel.getByRole('group', { name: 'Kursutveckling för Skärgården Teknik' })).toBeVisible();
  expect((await panel.boundingBox()).width).toBeCloseTo(width, 1);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ['Nästa bolag', 'Föregående bolag', 'Stäng dialog']) expect((await panel.getByRole('button', { name, exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath(`screener-drawer-mobile-${width}.png`) });
  await panel.getByRole('link', { name: 'Hela bolagssidan' }).scrollIntoViewIfNeeded();
  await expect(panel.getByRole('link', { name: 'Hela bolagssidan' })).toBeVisible();
  await panel.getByRole('button', { name: 'Stäng dialog' }).click();
  await expect(panel).toHaveCount(0);
  await expect(companyLink(page, 'Skärgården Teknik')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(originalScroll, 0);
});

test('a news reader opens over the drawer and closing it returns to the same company', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/aktier/screener?sector=Industri');
  await companyLink(page, 'Norden Industri').click();
  const story = drawer(page).locator('article a[href^="/nyhet/"]').first();
  await expect(story).toBeVisible();
  await story.click();
  const reader = page.getByRole('dialog', { name: 'OMXsum · Nyheter', exact: true });
  await expect(reader).toBeVisible();
  await expect(reader.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reader).toHaveCount(0);
  await expect(drawer(page)).toBeVisible();
  await expect(page).toHaveURL(/\/aktier\/screener\?.*company=NORD.TEST/);
  await page.keyboard.press('Escape');
  await expect(drawer(page)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('sector')).toBe('Industri');
  expect(errors).toEqual([]);
});

test('switching companies aborts an unfinished response and never shows the previous company data', async ({ page }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/api/feed/company/NORD.TEST/overview', async route => {
    await held;
    try { await route.fulfill({ response: await route.fetch({ url: 'http://127.0.0.1:8100/api/feed/company/NORD.TEST/overview' }) }); } catch { /* The previous company request was aborted. */ }
  });
  try {
    await page.goto('/aktier/screener');
    await companyLink(page, 'Norden Industri').click();
    await expect(drawer(page).getByRole('status', { name: 'Hämtar bolagsvy för Norden Industri' })).toBeVisible();
    await drawer(page).getByRole('button', { name: 'Nästa bolag' }).click();
    await expect(drawer(page, 'Skärgården Teknik').getByRole('group', { name: 'Kursutveckling för Skärgården Teknik' })).toBeVisible();
    release();
    await expect(drawer(page, 'Skärgården Teknik').getByRole('group', { name: 'Kursutveckling för Norden Industri' })).toHaveCount(0);
  } finally { release(); }
});
