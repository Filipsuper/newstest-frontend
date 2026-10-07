import { test, expect } from '@playwright/test';
const fixtureUrl = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;

async function setup(page, request, { delayedQuotes = false, empty = false, trial = false } = {}) {
  const response = await request.get(`${fixtureUrl}/api/user/personal-feed`);
  const source = (await response.json()).stories[0];
  const companies = Array.from({ length: 12 }, (_, index) => ({ symbol: `C${index}.TEST`,
    name: index === 1 ? 'Fiktiva Industriella Komponenter och Energi Holding' : `Fiktivt bolag ${index + 1}` }));
  const state = { reads: [], quotes: [], errors: [], delay: null, stories: empty ? [] : [{ ...source,
    id: 'cached-personal', eventId: 'cached-personal', symbol: companies[0].symbol, companies: [companies[0]],
    viaWatchlist: true, importance: 99, headline: 'Fiktiv viktig order', publishedAt: new Date().toISOString() }] };
  state.user = { email: 'cache@example.test', verified: true, plan: 'plus',
    watchlist: companies.map(c => c.symbol), topics: [], keywords: [],
    ...(trial ? { trial: { status: 'active', endsAt: Date.now() + 86_400_000 } } : {}) };
  if (delayedQuotes) state.delay = new Promise(resolve => { state.release = resolve; });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') && route.request().method() !== 'GET')
      return route.fulfill({ status: 405, json: { error: 'Read-only cache test' } });
    if (url.pathname === '/api/user') return route.fulfill({ json: state.user });
    if (url.pathname === '/api/user/personal-feed') {
      state.reads.push(Object.fromEntries(url.searchParams));
      const view = url.searchParams.get('view');
      const isPreview = view === 'preview';
      const stories = structuredClone(view === 'important' ? state.importantStories ?? state.stories : state.stories).slice(0, isPreview ? 2 : 20)
        .map(story => {
          if (!view) return story;
          const { reaction, reactionPct, reactionV2, marketContext, companyContext, ...news } = story;
          return news;
        });
      const delay = view === 'important' ? state.importantDelay : view === 'headlines' ? state.latestDelay : null;
      if (delay ?? state.feedDelay) await (delay ?? state.feedDelay);
      return route.fulfill({ json: { stories, preview: isPreview, curated: view === 'important',
        ...(!view ? { importantStories: stories, importantCoverage: { complete: true } } : {}),
        readStateAvailable: !isPreview, sinceHours: 168, coverage: { complete: true }, nextCursor: null } });
    }
    if (url.pathname === '/api/user/personal-feed/observations') {
      state.metrics ??= [];
      state.metrics.push(url.searchParams.get('stories'));
      if (state.metricsDelay) await state.metricsDelay;
      if (state.metricsFailure) return route.fulfill({ status: 502, json: { error: 'Unavailable' } });
      const refs = new Map((url.searchParams.get('stories') ?? '').split(',').map(ref => ref.split(':')));
      return route.fulfill({ json: { items: [...state.stories, ...(state.importantStories ?? [])].filter(row => refs.get(row.id) === String(row.version ?? 1))
        .map(row => ({ ...row, reaction: { pct: 2.5, window: 'since_publication', asOf: Date.now() } })) } });
    }
    if (url.pathname === '/api/feed/companies') {
      if (state.delay) await state.delay;
      return route.fulfill({ json: companies });
    }
    if (state.quoteFailure && url.pathname.startsWith('/api/feed/company/'))
      return route.fulfill({ status: 502, json: { error: 'Quote unavailable' } });
    if (/^\/api\/feed\/company\/[^/]+\/intraday$/.test(url.pathname)) {
      const symbol = decodeURIComponent(url.pathname.split('/').at(-2)); state.quotes.push(symbol);
      if (state.delay) await state.delay;
      const time = Date.now() - 60_000;
      return route.fulfill({ json: { symbol, previousClose: 100, timezone: 'Europe/Stockholm',
        current: [{ time: time - 60_000, close: 101 }, { time, close: 102 }],
        quote: { price: 102, changePct: 2, currency: 'SEK', quoteTime: time } } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({
      url: `${fixtureUrl}${url.pathname}${url.search}`,
    }) });
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  return state;
}

for (const width of [390, 1440]) test(`overview paints two headlines before observations at ${width}px`, async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  const state = await setup(page, request);
  state.stories = Array.from({ length: 3 }, (_, index) => ({ ...state.stories[0],
    id: `fast-${index}`, eventId: `fast-${index}`, facts: {}, headline: `Fiktiv nyhet ${index + 1}`,
    publishedAt: new Date(Date.now() - index * 60_000).toISOString() }));
  state.metricsDelay = new Promise(resolve => { state.releaseMetrics = resolve; });
  await page.goto('/marknaden');
  const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
  try {
    await expect.poll(() => state.metrics?.length ?? 0).toBe(1);
    await expect(preview).toContainText('Fiktiv nyhet 1');
    await expect(preview).toContainText('Fiktiv nyhet 2');
    await expect(preview).not.toContainText('Fiktiv nyhet 3');
    await expect(preview.getByRole('status', { name: 'Hämtar dina bevakningar', exact: true })).toHaveCount(0);
    await expect(preview).not.toContainText('+2,5');
    expect(state.reads).toEqual([{ limit: '2', filter: 'companies', view: 'preview' }]);
  } finally { state.metricsDelay = null; state.releaseMetrics(); }
  await expect(preview).toContainText('+2,5');
  const ids = await preview.locator('[data-live-news-id]').evaluateAll(nodes => nodes.map(node => node.dataset.liveNewsId));
  expect(ids).toEqual(['fast-0', 'fast-1']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await preview.screenshot({ path: testInfo.outputPath(`fast-preview-${width}.png`) });
  expect(state.errors).toEqual([]);
});

test('failed observations leave overview headlines readable and do not restart skeletons', async ({ page, request }) => {
  const state = await setup(page, request); state.metricsFailure = true;
  await page.goto('/marknaden');
  const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
  await expect.poll(() => state.metrics?.length ?? 0).toBe(1);
  await expect(preview).toContainText('Fiktiv viktig order');
  await expect(preview).not.toContainText('Bevakningen kunde inte hämtas');
  await expect(preview.getByRole('status', { name: 'Hämtar dina bevakningar', exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

async function trackLoaders(page) {
  await page.evaluate(() => {
    window.personalLoaderFlashes = 0;
    const count = node => {
      if (node.nodeType !== 1) return;
      if (node.matches('[aria-label="Hämtar dina bevakningar"]') || node.querySelector('[aria-label="Hämtar dina bevakningar"]'))
        window.personalLoaderFlashes++;
    };
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(count)))
      .observe(document.body, { childList: true, subtree: true });
  });
}

test('authoritative account changes remove previous private news before the next response', async ({ page, request }) => {
  const state = await setup(page, request, { trial: true });
  await page.goto('/marknaden');
  const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
  await expect(preview).toContainText('Fiktiv viktig order');
  state.user = { ...state.user, email: 'other@example.test', watchlist: ['C1.TEST'] };
  state.stories = [];
  state.feedDelay = new Promise(resolve => { state.releaseFeed = resolve; });
  try {
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(preview).toContainText('1 bolag · 0 ämnen · 0 nyckelord');
    await expect(preview).not.toContainText('Fiktiv viktig order');
    await expect(preview.getByRole('status', { name: 'Hämtar dina bevakningar', exact: true })).toBeVisible();
  } finally { state.feedDelay = null; state.releaseFeed(); }
  await expect(preview).toContainText('Inga bolagsnyheter i den hämtade perioden.');
  state.user = { email: null, verified: false, plan: 'free' };
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(preview).toContainText('Följ ditt första bolag');
  await expect(preview).not.toContainText('1 bolag');
  expect(state.errors).toEqual([]);
});

for (const width of [390, 1440]) test(`Mina bolag paints cached headlines before slow curation or reactions at ${width}px`, async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  const state = await setup(page, request);
  state.importantStories = [{ ...state.stories[0], id: 'old-curated', eventId: 'old-curated',
    headline: 'Fiktiv äldre viktig händelse', publishedAt: new Date(Date.now() - 5 * 86400e3).toISOString() }];
  state.latestDelay = new Promise(resolve => { state.releaseLatest = resolve; });
  state.importantDelay = new Promise(resolve => { state.releaseImportant = resolve; });
  state.metricsDelay = new Promise(resolve => { state.releaseMetrics = resolve; });
  try {
    await page.goto('/marknaden');
    const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
    await expect(preview).toContainText('Fiktiv viktig order', { timeout: 15_000 });
    await preview.getByRole('link', { name: 'Öppna dina bevakningar' }).click();
    await expect(page.getByRole('heading', { name: 'Mina bolag', exact: true })).toBeVisible({ timeout: 15_000 });
    const latest = page.getByRole('region', { name: 'Senaste nytt i din bevakning', exact: true });
    const important = page.getByRole('region', { name: 'Viktigast för dig', exact: true });
    await expect.poll(() => state.reads.some(query => query.view === 'headlines')).toBe(true);
    await expect.poll(() => state.reads.some(query => query.view === 'important')).toBe(true);
    await expect(latest).toContainText('Fiktiv viktig order');
    await expect(important).toContainText('Fiktiv viktig order');
    await expect(important).toContainText('Fler viktiga händelser kontrolleras');
    await expect(latest.getByRole('status', { name: 'Hämtar nyheter', exact: true })).toHaveCount(0);
    await expect(latest).not.toContainText('Alla nyheter kunde inte kontrolleras');
    expect(state.reads.filter(query => query.view === 'preview')).toHaveLength(1);
    state.latestDelay = null; state.releaseLatest();
    await expect(latest).not.toContainText('Resten av bevakningen hämtas');
    await expect(important).toContainText('Fler viktiga händelser kontrolleras');
    await expect(latest).toContainText('Fiktiv viktig order');
    state.importantDelay = null; state.releaseImportant();
    await expect(important).toContainText('Fiktiv äldre viktig händelse');
    await expect(important).not.toContainText('Fiktiv viktig order');
    await expect(latest).not.toContainText('Fiktiv äldre viktig händelse');
    await expect(important).not.toContainText('+2,5');
    state.metricsDelay = null; state.releaseMetrics();
    await expect(important).toContainText('+2,5');
    await expect(latest).toContainText('+2,5');
    await page.screenshot({ path: testInfo.outputPath(`personal-phases-${width}.png`), fullPage: true });
    expect(state.errors).toEqual([]);
  } finally {
    state.latestDelay = state.importantDelay = state.metricsDelay = null;
    state.releaseLatest(); state.releaseImportant(); state.releaseMetrics();
  }
});

test('fresh personal news and bounded quote prefetch survive client-side navigation without loader flashes', async ({ page, request }) => {
  const state = await setup(page, request);
  await page.goto('/marknaden');
  const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
  await expect(preview).toContainText('Fiktiv viktig order');
  await expect.poll(() => state.quotes.length).toBe(8);
  expect(new Set(state.quotes).size).toBe(8);
  await trackLoaders(page);
  await preview.getByRole('link', { name: 'Öppna dina bevakningar' }).click();
  await expect(page.getByRole('heading', { name: 'Mina bolag', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('region', { name: 'Dina bolagskurser' }).locator('svg[role="img"]')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Senaste nytt i din bevakning' })).toContainText('Fiktiv viktig order');
  const before = state.reads.length;
  await page.getByRole('navigation', { name: 'Huvudmeny', exact: true }).getByRole('link', { name: 'Marknaden', exact: true }).click();
  await expect(preview).toContainText('Fiktiv viktig order');
  expect(state.reads.length).toBe(before);
  expect(state.reads.filter(q => q.view === 'preview')).toHaveLength(1);
  expect(state.reads.find(q => q.view === 'preview')).toEqual({ limit: '2', filter: 'companies', view: 'preview' });
  expect(state.quotes).toHaveLength(8);
  expect(await page.evaluate(() => window.personalLoaderFlashes)).toBe(0);
  expect(state.errors).toEqual([]);
});

test('cached empty preview stays empty on reroute, and stale news remains visible during refresh', async ({ page, request }) => {
  await page.clock.install();
  const state = await setup(page, request, { empty: true });
  await page.goto('/marknaden');
  const preview = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
  await expect(preview).toContainText('Inga bolagsnyheter i den hämtade perioden.');
  await trackLoaders(page);
  await preview.getByRole('link', { name: 'Öppna dina bevakningar' }).click();
  await expect(page.getByRole('heading', { name: 'Mina bolag', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Senaste nytt i din bevakning' })).toContainText('Inga matchningar');
  await page.getByRole('navigation', { name: 'Huvudmeny', exact: true }).getByRole('link', { name: 'Marknaden', exact: true }).click();
  await expect(preview).toContainText('Inga bolagsnyheter i den hämtade perioden.');
  expect(await page.evaluate(() => window.personalLoaderFlashes)).toBe(0);
  const before = state.reads.length;
  state.feedDelay = new Promise(resolve => { state.releaseFeed = resolve; });
  try {
    await page.clock.runFor(30_100);
    await expect.poll(() => state.reads.length).toBeGreaterThan(before);
    await expect(preview).toContainText('Inga bolagsnyheter i den hämtade perioden.');
    expect(await page.evaluate(() => window.personalLoaderFlashes)).toBe(0);
  } finally { state.feedDelay = null; state.releaseFeed(); }
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390, 768, 1440]) {
  test(`quote cards reserve their loaded geometry at ${width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await setup(page, request, { delayedQuotes: true });
    await page.goto('/marknaden/bevakning');
    const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
    const cards = strip.getByRole('list', { name: 'Följda bolag med kurser' }).locator(':scope > li');
    await expect(cards).toHaveCount(4);
    await expect(strip.locator('[data-company-logo]')).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    await expect(cards.first()).toHaveAttribute('aria-busy', 'true');
    const before = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    if (width === 768) expect(await cards.first().evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(300);
    state.release(); state.delay = null;
    await expect(strip.locator('svg[role="img"]')).toHaveCount(4);
    await expect(strip).toContainText('Fiktiva Industriella Komponenter och Energi Holding');
    const after = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    after.forEach((height, index) => expect(Math.abs(height - before[index])).toBeLessThanOrEqual(1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`personal-cache-${width}.png`), fullPage: true });
    expect(state.errors).toEqual([]);
  });
}

test('unavailable quote and curve statuses stay horizontal and bounded at 768px', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  const state = await setup(page, request);
  state.user.watchlist = [state.user.watchlist[0]];
  state.quoteFailure = true;
  await page.goto('/marknaden/bevakning');
  const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
  await expect(strip.getByRole('button', { name: 'Försök igen med kurserna' })).toBeVisible();
  const price = strip.getByText('Kursen kunde inte hämtas', { exact: true });
  const curve = strip.getByText('Kurvan kunde inte hämtas', { exact: true });
  await expect(price).toBeVisible();
  await expect(curve).toBeVisible();
  const priceBox = await price.boundingBox();
  const curveBox = await curve.boundingBox();
  expect(priceBox.width).toBeGreaterThan(80);
  expect(priceBox.height).toBeLessThan(25);
  expect(curveBox.height).toBeLessThanOrEqual(40);
  expect(await strip.getByRole('listitem').evaluate(node => node.getBoundingClientRect().height)).toBeLessThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await strip.screenshot({ path: testInfo.outputPath('personal-quote-failure-768.png') });
  expect(state.errors).toEqual([]);
});
