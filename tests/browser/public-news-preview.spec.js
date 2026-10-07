import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = Date.parse('2026-10-06T10:00:00Z');
const stories = Array.from({ length: 24 }, (_, index) => ({
  id: `public-${index}`, eventId: `public-event-${index}`, version: 1,
  headline: `Testbolag ${index} tecknar ett nytt avtal`,
  publishedAt: new Date(base - index * 60_000).toISOString(),
  companies: [{ symbol: `PUBLIC${index}.ST`, name: `Testbolag ${index}`, exchangeMic: 'XSTO' }],
  primarySource: { name: 'mfn', language: 'sv' }, tags: ['ORDER'], importance: 75,
}));
const guest = { email: null, verified: false, plan: 'free' };

async function setup(page, { user = guest, overview = { news: stories }, feed = stories, accountFailure = false } = {}) {
  if (process.env.PLAYWRIGHT_DEBUG_EXCEPTIONS) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Runtime.enable');
    cdp.on('Runtime.exceptionThrown', value => console.log(JSON.stringify(value.exceptionDetails)));
  }
  const state = { requests: [], mutations: [], errors: [], overview, feed, accountFailure };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    window.__previewStreams = [];
    window.EventSource = class extends EventTarget {
      constructor(url) { super(); window.__previewStreams.push(url); }
      close() {}
    };
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      state.requests.push(url.pathname + url.search);
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) state.mutations.push(url.pathname);
      if (url.pathname === '/api/user') return route.fulfill(state.accountFailure
        ? { status: 503, json: { error: 'Account unavailable' } } : { json: user });
      if (url.pathname === '/api/feed/market-overview') return route.fulfill(state.overview === null
        ? { status: 503, json: { error: 'Overview unavailable' } } : { json: state.overview });
      if (url.pathname === '/api/feed/news') return route.fulfill({ json: { items: state.feed.slice(0, 20), nextCursor: 'older' } });
      if (url.pathname === '/api/feed/news/observations') return route.fulfill({ json: { items: [] } });
      if (url.pathname === '/api/feed/companies') return route.fulfill({ json: [] });
      return route.fulfill({ json: { items: [] } });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    // Offline third-party placeholders avoid reporting intentionally blocked
    // stylesheet/script load events as reader failures during navigation.
    if (['stylesheet', 'script'].includes(request.resourceType())) return route.fulfill({
      body: '', contentType: request.resourceType() === 'script' ? 'application/javascript' : 'text/css',
    });
    return route.abort();
  });
  return state;
}

for (const [name, user, width] of [
  ['guest desktop', guest, 1440],
  ['guest phone', guest, 320],
  ['free account', { email: 'preview@example.test', verified: true, plan: 'free', watchlist: [], trial: { eligible: false } }, 390],
]) test(`${name} can read a bounded public selection despite paid query parameters`, async ({ page }, info) => {
  const state = await setup(page, { user });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/marknaden/nyheter?q=hidden&category=insider&selection=all&scope=following&view=reactions&cursor=old&limit=999');
  const preview = page.getByRole('region', { name: 'Publikt nyhetsurval' });
  await expect(preview.locator('article')).toHaveCount(16);
  await expect(preview.locator('article').first()).toContainText('Testbolag 0');
  await expect(preview.locator('article').first().getByRole('link', { name: 'Testbolag 0 tecknar ett nytt avtal' }))
    .toHaveAttribute('href', /\/nyhet\/testbolag-0-tecknar-ett-nytt-avtal~public-0$/);
  await expect(preview.getByRole('link', { name: /Testa 7 dagar gratis|Utforska Plus/ })).toHaveAttribute('href', '/pro#plan-plus');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Sök i nyhetsflödet' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Visa äldre nyheter' })).toHaveCount(0);
  expect(state.requests.filter(path => /\/feed\/(news(?:\?|\/observations)|stream)/.test(path))).toEqual([]);
  expect(await page.evaluate(() => window.__previewStreams)).toEqual([]);
  expect(state.mutations).toEqual([]);
  expect(state.errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath(`public-news-${width}.png`), fullPage: true, style: 'nextjs-portal { visibility: hidden; }' });
});

test('failed public requests retry, preserve the offer and render a distinct empty state', async ({ page }) => {
  const state = await setup(page, { overview: null });
  await page.goto('/marknaden/nyheter');
  const preview = page.getByRole('region', { name: 'Publikt nyhetsurval' });
  await expect(preview.getByRole('alert')).toContainText('Nyhetsurvalet kunde inte hämtas.');
  await expect(preview.getByRole('link', { name: /Testa 7 dagar gratis|Utforska Plus/ })).toBeVisible();
  state.overview = { news: [] };
  await preview.getByRole('button', { name: 'Försök igen' }).click();
  await expect(preview.getByText('Inga nyheter i det publika urvalet just nu')).toBeVisible();
  state.overview = { news: stories };
  await preview.getByRole('button', { name: 'Uppdatera urvalet' }).click();
  await expect(preview.locator('article')).toHaveCount(16);
  state.overview = null;
  await preview.getByRole('button', { name: 'Uppdatera urvalet' }).click();
  await expect(preview.getByRole('alert')).toBeVisible();
  await expect(preview.locator('article')).toHaveCount(16);
  state.overview = { latestNews: null, news: stories };
  await preview.getByRole('button', { name: 'Försök igen' }).click();
  await expect(preview.getByRole('alert')).toBeVisible();
  await expect(preview.locator('article')).toHaveCount(16);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an account failure is retried without treating unknown access as a free account', async ({ page }) => {
  const state = await setup(page, { accountFailure: true });
  await page.goto('/marknaden/nyheter');
  await expect(page.getByText('Kunde inte hämta ditt konto')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Publikt nyhetsurval' })).toHaveCount(0);
  expect(state.requests.some(path => path.includes('market-overview'))).toBe(false);
  state.accountFailure = false;
  await page.getByRole('button', { name: 'Försök igen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Publikt nyhetsurval' }).locator('article')).toHaveCount(16);
});

test('public rows open the canonical reader and retain the source view on Back and Forward', async ({ page, request }) => {
  const detail = await (await request.get(`http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}/api/feed/news/fixture-0`)).json();
  const state = await setup(page, { overview: { news: [detail.story] } });
  await page.route('**/api/feed/news/fixture-0', route => route.fulfill({ json: detail }));
  const source = '/marknaden/nyheter?selection=all&q=preview';
  await page.goto(source);
  const preview = page.getByRole('region', { name: 'Publikt nyhetsurval' });
  const headline = preview.locator('article a[href^="/nyhet/"]');
  await expect(headline).toHaveCount(1);
  const href = await headline.getAttribute('href');
  await headline.click();
  const dialog = page.getByRole('dialog', { name: 'OMXsum · Nyheter' });
  await expect(dialog.getByRole('heading', { name: detail.story.headline, exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(href);
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(source);
  await expect(preview.locator('article')).toHaveCount(1);
  await page.goForward();
  await expect(dialog).toBeVisible();
  expect(state.requests.filter(path => /\/feed\/(news\?|news\/observations|stream)/.test(path))).toEqual([]);
  expect(state.mutations).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const plan of ['plus', 'premium']) test(`${plan} retains the full query-backed feed`, async ({ page }) => {
  const state = await setup(page, { user: { email: 'member@example.test', verified: true, plan, watchlist: [] } });
  await page.goto('/marknaden/nyheter?q=Testbolag&selection=all');
  await expect(page.getByRole('textbox', { name: 'Sök i nyhetsflödet' })).toHaveValue('Testbolag');
  await expect(page.getByRole('region', { name: 'Nyhetsflöde', exact: true }).locator('article')).toHaveCount(20);
  await expect(page.getByRole('region', { name: 'Publikt nyhetsurval' })).toHaveCount(0);
  expect(state.requests.some(path => path.startsWith('/api/feed/news?q=Testbolag') && path.includes('selection=all'))).toBe(true);
  expect(state.requests.some(path => path.includes('market-overview'))).toBe(false);
});

test('ordinary public preview shows low-importance news from latestNews, not just featured candidates', async ({ page }) => {
  const ordinary = { ...stories[0], headline: 'Testbolag meddelar datum för nästa rapport', importance: 15,
    featuredEligible: false, editorial: { kind: 'omxsum_news', featuredEligible: false, score: 15 } };
  const featured = { ...stories[1], headline: 'Ett separat viktigt förvärv', importance: 95, featuredEligible: true };
  const state = await setup(page, { overview: { latestNews: [ordinary], news: [featured], moverNews: [featured] } });
  await page.goto('/marknaden/nyheter');
  const preview = page.getByRole('region', { name: 'Publikt nyhetsurval' });
  await expect(preview.locator('article')).toHaveCount(1);
  await expect(preview).toContainText(ordinary.headline);
  await expect(preview).not.toContainText(featured.headline);
  await expect(preview).toContainText('det vanliga nyhetsflödet');
  expect(state.errors).toEqual([]);
});

test('Plus opens chronological All by default and preserves an explicit selected filter', async ({ page }) => {
  const ordinary = { ...stories[0], headline: 'En vanlig bolagsnyhet', importance: 20, featuredEligible: false };
  const significant = { ...stories[1], headline: 'Ett betydande nytt avtal', importance: 85, featuredEligible: true };
  const state = await setup(page, { user: { email: 'member@example.test', verified: true, plan: 'plus', watchlist: [] }, feed: [ordinary, significant] });
  await page.goto('/marknaden/nyheter');
  const feed = page.getByRole('region', { name: 'Nyhetsflöde', exact: true });
  await expect(feed.locator('article')).toHaveCount(2);
  await expect(feed.locator('article').first()).toContainText(ordinary.headline);
  await expect.poll(() => state.requests.filter(path => path.startsWith('/api/feed/news?')).at(-1)).toContain('selection=all');
  await page.goto('/marknaden/nyheter?selection=selected');
  await expect(feed.locator('article')).toHaveCount(1);
  await expect(feed).toContainText(significant.headline);
  await expect(feed).not.toContainText(ordinary.headline);
  await expect.poll(() => state.requests.filter(path => path.startsWith('/api/feed/news?')).at(-1)).toContain('selection=selected');
  expect(state.errors).toEqual([]);
});

test('partial own brief keeps its editorial label, named source and remaining source roundup on mobile', async ({ page }) => {
  const source = { ...stories[0], id: 'source-roundup', eventId: 'shared-event',
    headline: 'Testbolag får ny rekommendation', primarySource: { name: 'Placera', language: 'sv' },
    facts: { recommendation: 'buy' }, importance: 65 };
  const own = { ...source, id: 'own-recommendation', aiSummary: 'Banken lämnar en ny rekommendation för Testbolag.',
    importance: 65, featuredEligible: false,
    editorial: { kind: 'omxsum_news', publicationTier: 'brief', sourceCoverage: 'partial', featuredEligible: false } };
  const state = await setup(page, { overview: { latestNews: [own, source], news: [] } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/marknaden/nyheter');
  const preview = page.getByRole('region', { name: 'Publikt nyhetsurval' });
  await expect(preview.locator('article')).toHaveCount(2);
  const ownRow = preview.locator('article').filter({ has: page.getByText('OMXsum notis', { exact: true }) });
  await expect(ownRow).toHaveCount(1);
  await expect(ownRow).toContainText('Placera');
  await expect(ownRow).not.toContainText('AI-sammanfattning');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(state.errors).toEqual([]);
});
