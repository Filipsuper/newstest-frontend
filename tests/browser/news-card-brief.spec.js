import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TITLE = 'Stor serviceorder stärker orderingången';
const COMPANY = 'Norden Industri';

async function setup(page, request, contextOnly) {
  const snapshot = await (await request.get('http://127.0.0.1:8100/api/feed/market-overview')).json();
  // Keep both publication and next opening in the past without changing the
  // browser's clock on an SSR page. The fictional story stays within 48 hours.
  const now = new Date();
  const day = new Date(now.getTime() - (now.getUTCHours() < 8 ? 2 : 1) * 86_400_000).toISOString().slice(0, 10);
  const nextDay = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const publishedAt = `${day}T17:00:00Z`;
  const story = { ...snapshot.news[0], id: 'brief-preview', eventId: 'brief-preview-event', version: 1,
    headline: `${COMPANY}: ${TITLE}`, publishedAt, companies: [{ name: COMPANY, symbol: 'NORD.TEST', exchangeMic: 'XSTO' }],
    tags: ['ORDER'], importance: 99, viaWatchlist: true, reaction: null, marketContext: null,
    aiSummary: { text: 'En kort sparad AI-ingress visas bara i det större kortet.', bullets: ['Punkt endast i läsaren.'] },
    companyContext: null, reactionV2: { schemaVersion: 2, storyId: 'brief-preview', storyVersion: 1, publishedAt,
      measurements: [{ symbol: 'NORD.TEST', timing: 'after_close', status: 'measured', windows: {
        m5: { status: 'complete', pct: 2, targetAt: `${nextDay}T07:05:00Z`, endpoint: { priceAt: `${nextDay}T07:05:00Z` } },
      } }] } };
  if (contextOnly) {
    story.reactionV2 = null;
    story.companyContext = { schemaVersion: 1, scope: 'session_context', storyId: story.id, storyVersion: 1,
      publishedAt, asOf: Date.parse(`${day}T18:00:00Z`), companies: [{ symbol: 'NORD.TEST', timing: 'after_close',
        relationship: 'before_event_session', asOf: Date.parse(`${day}T18:00:00Z`), validUntil: Date.parse(`${nextDay}T07:00:01Z`),
        session: { date: day, open: `${day}T07:00:00Z`, close: `${day}T15:30:00Z`, exchange: 'XSTO', calendarVersion: 'fictional-xsto' }, fields: {} }] };
  }
  const writes = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
      writes.push(url.pathname); return route.fulfill({ status: 405, json: { error: 'Read-only fixture' } });
    }
    if (url.pathname === '/api/user') return route.fulfill({ json: { email: 'brief@example.test', verified: true, plan: 'plus', watchlist: ['NORD.TEST'], topics: [], keywords: [] } });
    if (url.pathname === '/api/feed/market-overview') return route.fulfill({ json: { ...snapshot, news: [story] } });
    if (url.pathname === '/api/user/personal-feed') return route.fulfill({ json: { stories: [story], importantStories: [story], coverage: { complete: true } } });
    if (url.pathname === '/api/feed/news') return route.fulfill({ json: { items: [story], nextCursor: null, serverFilters: true } });
    if (url.pathname === '/api/feed/news/observations') return route.fulfill({ json: { items: [] } });
    if (url.pathname === '/api/feed/news/brief-preview') return route.fulfill({ json: { story, text: 'Fiktiv källtext.', related: [] } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return { writes, errors };
}

for (const width of [320, 1440]) for (const contextOnly of [false, true]) {
  test(`brief rows share the featured title and retain publication labels at ${width}px, company context ${contextOnly}`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await setup(page, request, contextOnly);
    await page.goto('/marknaden');
    const featured = page.getByRole('region', { name: 'Viktigast just nu', exact: true }).locator('article');
    const personal = page.getByRole('region', { name: 'Dina bevakningar', exact: true }).locator('article');
    const latest = page.getByRole('region', { name: 'Senaste nytt', exact: true }).locator('article');
    for (const card of [featured, personal, latest]) {
      await expect(card).toHaveCount(1);
      await expect(card.getByRole('link', { name: TITLE, exact: true })).toBeVisible();
      await expect(card.getByText('Efter stängning', { exact: true })).toHaveCount(1);
      await expect(card).not.toContainText(`${COMPANY}:`);
      const companyLink = card.getByRole('link', { name: COMPANY, exact: true });
      await expect(companyLink).toHaveAttribute('href', '/aktie/NORD.TEST');
      const header = card.locator('[data-news-header]');
      expect(await header.evaluate(el => el.firstElementChild.textContent)).toMatch(contextOnly ? /Efter stängning/ : /\+2,0/);
      expect((await header.boundingBox()).y + (await header.boundingBox()).height).toBeLessThanOrEqual((await card.getByRole('link', { name: TITLE, exact: true }).boundingBox()).y);
      if (width === 320) expect((await companyLink.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    for (const card of [personal, latest]) {
      await expect(card).toHaveAttribute('data-news-layout', 'brief');
      await expect(card.getByLabel('Kort AI-sammanfattning')).toHaveCount(0);
      await expect(card.getByRole('link', { name: 'Läs nyheten', exact: true })).toHaveCount(0);
      expect(await card.getByRole('link', { name: TITLE, exact: true }).evaluate(el => getComputedStyle(el).fontSize)).toBe('14px');
      if (width === 320) expect((await card.getByRole('link', { name: TITLE, exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44);
      await card.screenshot({ path: testInfo.outputPath(`brief-${width}-${contextOnly}.png`) });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('[data-news-layout="brief"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await latest.getByRole('link', { name: TITLE, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.locator('[data-reading]').first()).toContainText('En kort sparad AI-ingress');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/marknaden$/);
    expect(state.writes).toEqual([]); expect(state.errors).toEqual([]);
  });
}
