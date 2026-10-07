import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TITLE = 'Höjer prognosen efter starkare orderingång';
const INTRO = 'En fiktiv prognos höjs efter starkare orderingång.';
const DETAILS = 'Kompletterande AI-detaljer visas endast i den öppnade nyheten.';

async function setup(page, request, { summary = true, pct = 2, summaryText } = {}) {
  const snapshot = await (await request.get('http://127.0.0.1:8100/api/feed/market-overview')).json();
  const publishedAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
  const at = new Date(Date.now() - 60_000).toISOString();
  const story = { ...snapshot.news[0], id: 'scan-preview', eventId: 'scan-preview-event', version: 1,
    headline: `Fiktiva Industri: ${TITLE}`, company: 'Fiktiva Industri', symbol: 'NORD.TEST',
    companies: [{ name: 'Fiktiva Industri', symbol: 'NORD.TEST', exchangeMic: 'XSTO' }], importance: 99, publishedAt,
    summary: 'Deterministisk text ska inte visas i kortet.',
    aiSummary: summary ? { text: summaryText ?? `${INTRO} ${DETAILS.repeat(15)}`, bullets: ['En sparad punkt som bara hör till läsaren.'] } : null,
    companyContext: null, marketContext: null, reaction: { pct: 99 },
    reactionV2: { schemaVersion: 2, storyId: 'scan-preview', storyVersion: 1, publishedAt,
      measurements: [{ symbol: 'NORD.TEST', status: 'measured', timing: 'during_session',
        windows: { session_close: { status: 'complete', pct, targetAt: at, endpoint: { priceAt: at } } } }] },
  };
  const errors = [], writes = [], detailRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      writes.push(url.pathname);
      return route.fulfill({ status: 405, json: { error: 'Read-only fixture' } });
    }
    if (url.pathname === '/api/feed/market-overview') return route.fulfill({ json: { ...snapshot, news: [story] } });
    if (url.pathname === '/api/feed/news/observations') return route.fulfill({ json: { items: [] } });
    if (url.pathname === '/api/feed/news/scan-preview') {
      detailRequests.push(url.pathname);
      return route.fulfill({ json: { story, text: 'Fiktiv källtext.', related: [] } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return { errors, writes, detailRequests };
}

for (const width of [320, 390, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`news-first cards are readable, accessible and open complete details at ${width}px in ${theme}`, async ({ page, request }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const state = await setup(page, request);
      await page.goto('/marknaden');
      const featured = page.getByRole('region', { name: 'Viktigast just nu', exact: true });
      const card = featured.locator('article');
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute('data-news-layout', 'editorial');
      await expect(card.getByRole('link', { name: TITLE, exact: true })).toBeVisible();
      await expect(card).toContainText('Fiktiva Industri');
      await expect(card.getByLabel('Kort AI-sammanfattning')).toHaveText(INTRO);
      await expect(card).not.toContainText(DETAILS);
      await expect(card).not.toContainText('AI-sammanfattning');
      await expect(card).not.toContainText('Vid stängning');
      await expect(card.getByRole('list')).toHaveCount(0);
      await expect(card.locator('span[aria-label="Vid stängning: +2,0 %"]')).toBeVisible();
      expect(state.detailRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await card.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await card.screenshot({ path: testInfo.outputPath(`news-first-${theme}-${width}.png`) });
      expect((await new AxeBuilder({ page }).include('[data-news-layout="editorial"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      const action = card.getByRole('link', { name: 'Läs nyheten', exact: true });
      const headline = await card.getByRole('link', { name: TITLE, exact: true }).boundingBox();
      const badge = await card.locator('span[aria-label="Vid stängning: +2,0 %"]').boundingBox();
      const publication = await card.locator('time').boundingBox();
      const excerpt = await card.getByLabel('Kort AI-sammanfattning').boundingBox();
      const cta = await action.boundingBox();
      expect(badge.y + badge.height).toBeLessThanOrEqual(headline.y);
      expect(headline.y + headline.height).toBeLessThanOrEqual(excerpt.y);
      expect(excerpt.y + excerpt.height).toBeLessThanOrEqual(cta.y);
      expect(excerpt.y + excerpt.height).toBeLessThanOrEqual(publication.y);
      const company = card.getByRole('link', { name: 'Fiktiva Industri', exact: true });
      await expect(company).toHaveAttribute('href', '/aktie/NORD.TEST');
      expect(await card.locator('[data-news-header]').evaluate(el => el.firstElementChild.querySelector('[aria-label]')?.getAttribute('aria-label'))).toBe('Vid stängning: +2,0 %');
      if (width <= 390) expect((await company.boundingBox()).height).toBeGreaterThanOrEqual(44);
      const letter = page.getByRole('complementary', { name: 'Senaste brevet', exact: true });
      expect(await card.getByRole('link', { name: TITLE, exact: true }).evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
      expect(await letter.locator('h2').evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
      expect(await card.getByLabel('Kort AI-sammanfattning').evaluate(el => getComputedStyle(el).fontSize)).toBe('14px');
      expect(await letter.locator('li').first().evaluate(el => getComputedStyle(el).fontSize)).toBe('14px');
      expect(await card.evaluate(el => getComputedStyle(el).paddingTop)).toBe('16px');
      expect(await letter.evaluate(el => getComputedStyle(el).paddingTop)).toBe('16px');
      if (width <= 390) expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await action.click();
      const dialog = page.getByRole('dialog');
      // The isolated Next dev server compiles the intercepted route on first use.
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog.locator('[data-reading]').first()).toContainText(DETAILS);
      await expect(dialog.getByRole('list', { name: 'AI-sammanfattningens huvudpunkter' }).first()).toContainText('En sparad punkt');
      await page.keyboard.press('Escape');
      await expect(page).toHaveURL(/\/marknaden$/);
      await expect(action).toBeFocused();
      expect(state.errors).toEqual([]);
      expect(state.writes).toEqual([]);
    });
  }
}

test('missing AI does not revive wire prose and a real zero stays a measured value', async ({ page, request }) => {
  await setup(page, request, { summary: false, pct: 0 });
  await page.goto('/marknaden');
  const card = page.getByRole('region', { name: 'Viktigast just nu', exact: true }).locator('article');
  await expect(card.getByLabel('Kort AI-sammanfattning')).toHaveCount(0);
  await expect(card).not.toContainText('Deterministisk text');
  await expect(card.locator('span[aria-label="Vid stängning: 0,0 %"]')).toBeVisible();
  await expect(card.getByRole('link', { name: 'Läs nyheten', exact: true })).toBeVisible();
});

test('long excerpts take at most two lines while the reader retains the complete supplied copy', async ({ page, request }) => {
  const text = 'Det fiktiva bolaget höjer sin prognos efter att orderingången har ökat på flera marknader och ledningen beskriver fortsatt stark efterfrågan tillsammans med ett större behov av investeringar.';
  await page.setViewportSize({ width: 320, height: 900 });
  await setup(page, request, { summaryText: text });
  await page.goto('/marknaden');
  const card = page.getByRole('region', { name: 'Viktigast just nu', exact: true }).locator('article');
  const excerpt = card.getByLabel('Kort AI-sammanfattning');
  await expect(excerpt).toHaveText(text);
  expect(await excerpt.evaluate(el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 2 + 1)).toBe(true);
  await card.getByRole('link', { name: 'Läs nyheten', exact: true }).click();
  await expect(page.getByRole('dialog').locator('[data-reading]').first()).toContainText(text, { timeout: 15_000 });
});
