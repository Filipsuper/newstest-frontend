import { test, expect } from '@playwright/test';

// All personal state and mutations belong to this page's local routes. The
// shared fixture is used only for unrelated read-only APIs and the reader.
const LETTER_TITLE = 'Fiktivt morgonbrev: bolagens rapporter och räntor';
const IMPORTANT_TITLE = 'Fiktiv viktig serviceorder från förra veckan';
const LATEST_TITLE = 'Fiktiv ny prognos för Norden Industri';
const KEYWORD_TITLE = 'Fiktiv batterinyhet utanför dina bolag';
const pageStates = new WeakMap();
const companies = [
  { symbol: 'NORD.TEST', name: 'Norden Industri' },
  { symbol: 'SKAR.TEST', name: 'Skärgården Teknik' },
  { symbol: 'FJALL.TEST', name: 'Fjäll Energi' },
  { symbol: 'FOUR.TEST', name: 'Fiktiva Industriella Komponenter och Energi Holding' },
  { symbol: 'FIVE.TEST', name: 'Femte Fiktiva Bolaget' },
];

function story(id, headline, company, ageHours, overrides = {}) {
  return {
    id, eventId: `${id}-event`, version: 1, status: 'flash', headline,
    companies: [company], company: company.name, symbol: company.symbol,
    publishedAt: new Date(Date.now() - ageHours * 3_600_000).toISOString(),
    primarySource: { name: 'Fiktiv lokal källa', sourceKind: 'issuer_release', url: 'https://example.test/release', language: 'sv' },
    summary: 'Fiktiv källa för det lokala webbläsartestet.',
    aiSummary: { text: 'Fiktiv AI-text från den sparade viktiga nyheten.', bullets: [] },
    tags: ['ORDER'], importance: 90, facts: {}, reaction: null,
    viaWatchlist: true,
    readState: { status: 'unread', receipt: `${id}-receipt` },
    ...overrides,
  };
}

function quote(symbol, { startPrice = 100, price = 102, change = 2, currency = 'SEK' } = {}) {
  const end = Date.now() - 30 * 60_000;
  return {
    symbol, timezone: 'Europe/Stockholm', updateMode: 'snapshot', previousClose: 100,
    previous: [], previousFull: [],
    current: [{ time: end - 30 * 60_000, close: startPrice, volume: 80 }, { time: end, close: price, volume: 90 }],
    quote: { price, change: price - 100, changePct: change, currency, quoteTime: end,
      source: 'fictional-local-fixture', fresh: false, updateMode: 'snapshot' },
  };
}

async function setup(page, options = {}) {
  const state = {
    user: { email: 'personal-dashboard@example.test', verified: true, plan: 'plus',
      watchlist: ['NORD.TEST', 'SKAR.TEST'], topics: ['ORDER'], keywords: ['batterier'], ...options.user },
    stories: [
      story('fixture-0', LATEST_TITLE, companies[0], 1, { importance: 99 }),
      story('fixture-1', 'Fiktiv inbjudan till årsstämma', companies[1], 2, { importance: 95 }),
      story('fixture-2', KEYWORD_TITLE, { symbol: 'OTHER.TEST', name: 'Annat Fiktivt Bolag' }, 3,
        { viaWatchlist: false, matchedKeyword: 'batterier', matchedTopic: 'ORDER' }),
    ],
    important: [story('fixture-important', IMPORTANT_TITLE, companies[0], 5 * 24)],
    coverage: { complete: true }, importantCoverage: { complete: true, candidateLimit: 20, candidatesLimited: false },
    letters: [{ id: 'personal-dashboard-letter', title: LETTER_TITLE,
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), isEveningLetter: false,
      introText: 'Fiktiv lokal utgåva med faktiskt sparat datum.',
      bulletPoints: '- Fiktiv order i industrin.\n- Fiktivt räntebesked.', summary: null }],
    userStatus: 200, feedStatus: 200, quoteFailures: false, quoteWrongSymbol: false, quoteOptions: {},
    comparisonReads: [], letterReads: 0,
    readReceipts: new Set(), writes: [], reads: [], quoteReads: [], errors: [],
    ...options,
  };
  pageStates.set(page, state);
  page.on('pageerror', error => state.errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      state.writes.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
      if (url.pathname === '/api/user/personal-feed/read') {
        const receipts = request.postDataJSON().receipts;
        receipts.forEach(receipt => state.readReceipts.add(receipt));
        return route.fulfill({ json: { acknowledged: receipts } });
      }
      return route.fulfill({ status: 405, json: { error: 'Read-only personal dashboard fixture' } });
    }
    if (url.pathname === '/api/user') return route.fulfill({ status: state.userStatus, json: state.user });
    if (url.pathname === '/api/user/personal-feed') {
      const query = Object.fromEntries(url.searchParams);
      state.reads.push(query);
      const filtered = state.stories.filter(item => query.filter === 'companies' ? item.viaWatchlist
        : query.filter === 'topics' ? item.matchedTopic : query.filter === 'keywords' ? item.matchedKeyword : true);
      const withReadState = item => ({ ...item, readState: { ...item.readState,
        status: state.readReceipts.has(item.readState.receipt) ? 'read' : 'unread' } });
      return route.fulfill({ status: state.feedStatus, json: {
        stories: filtered.map(withReadState), sinceHours: 168, readStateAvailable: true,
        importantStories: ['all', 'companies', undefined].includes(query.filter) ? state.important.map(withReadState) : [],
        coverage: state.coverage, importantCoverage: state.importantCoverage, nextCursor: null,
      } });
    }
    if (url.pathname === '/api/feed/companies') return route.fulfill({ json: companies });
    if (url.pathname === '/api/feed/company-directory') return route.fulfill({ json: companies });
    if (/^\/api\/feed\/company\/[^/]+\/intraday$/.test(url.pathname)) {
      const symbol = decodeURIComponent(url.pathname.split('/').at(-2));
      state.quoteReads.push(symbol);
      return route.fulfill({ status: state.quoteFailures ? 503 : 200,
        json: state.quoteFailures ? { error: 'Fiktivt kursfel' } : quote(state.quoteWrongSymbol ? 'WRONG.TEST' : symbol, state.quoteOptions) });
    }
    if (url.pathname.startsWith('/api/feed/spark/')) {
      return route.fulfill({ status: state.quoteFailures ? 503 : 200,
        json: state.quoteFailures ? { error: 'Fiktivt historikfel' } : { symbol: state.quoteWrongSymbol ? 'WRONG.TEST' : decodeURIComponent(url.pathname.split('/').at(-1)), data: [] } });
    }
    if (/^\/api\/feed\/company\/[^/]+\/overview$/.test(url.pathname)) {
      const symbol = decodeURIComponent(url.pathname.split('/').at(-2));
      state.comparisonReads.push(symbol);
      return route.fulfill({ status: 503, json: { error: 'No comparison reads expected' } });
    }
    if (url.pathname === '/api/data') {
      state.letterReads++;
      return route.fulfill({ json: state.letters });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({
      url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
    }) });
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return state;
}

test.afterEach(async ({ page }) => {
  expect(pageStates.get(page).letterReads).toBe(0);
  expect(pageStates.get(page).comparisonReads).toEqual([]);
  await expect(page.getByRole('button', { name: 'Jämför kursutveckling', exact: true })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Fördjupning för dina bolag', exact: true })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Senaste brevet', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(LETTER_TITLE);
});

const importantRegion = page => page.getByRole('region', { name: 'Viktigast för dig', exact: true });
const latestRegion = page => page.getByRole('region', { name: 'Senaste nytt i din bevakning', exact: true });

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const filters = page.getByRole('group', { name: 'Filtrera bevakning', exact: true });
  const geometry = await filters.evaluate(node => ({
    overflow: node.scrollWidth > node.clientWidth + 1,
    touch: matchMedia('(pointer: coarse)').matches || innerWidth <= 960,
    controls: [...node.querySelectorAll('button')].map(button => {
      const rect = button.getBoundingClientRect();
      return { height: rect.height, left: rect.left, right: rect.right, width: innerWidth };
    }),
  }));
  expect(geometry.overflow).toBe(false);
  for (const control of geometry.controls) {
    expect(control.height).toBeGreaterThanOrEqual(geometry.touch ? 44 : 36);
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(control.width + 1);
  }
  expect(await latestRegion(page).evaluate(root => [root, ...root.querySelectorAll('*')].some(node => {
    const style = getComputedStyle(node);
    return ['auto', 'scroll'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
  }))).toBe(false);
}

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390, 1440]) {
    test(`personal dashboard keeps news primary at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      const state = await setup(page);
      await page.goto('/marknaden/bevakning');
      const important = importantRegion(page), latest = latestRegion(page);
      const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
      await expect(important.locator('article')).toHaveCount(1);
      await expect(important).toContainText(IMPORTANT_TITLE);
      await expect(important).toContainText('Fiktiv AI-text');
      await expect(latest.locator('article')).toHaveCount(3);
      await expect(latest.locator('article').first()).toContainText(LATEST_TITLE);
      await expect(latest).not.toContainText('Fiktiv AI-text');
      expect(state.reads.find(query => query.filter === 'all')?.limit).toBe('20');
      await expect(strip.getByRole('link', { name: /Norden Industri/ })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const [quoteBox, importantBox, latestBox] = await Promise.all([
        strip.boundingBox(), important.boundingBox(), latest.boundingBox(),
      ]);
      expect(quoteBox.y + quoteBox.height).toBeLessThanOrEqual(importantBox.y);
      expect(latestBox.y).toBeGreaterThan(importantBox.y);
      expect(Math.abs(importantBox.width - latestBox.width)).toBeLessThan(2);
      expect(Math.abs(importantBox.x - latestBox.x)).toBeLessThan(2);
      expect(Math.abs(importantBox.width - quoteBox.width)).toBeLessThan(2);
      await expectNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`personal-${theme}-${width}.png`), fullPage: true });
      expect(state.writes).toEqual([]);
      expect(state.errors).toEqual([]);
    });
  }
}

test('important candidates stay separate from chronological pages and interest filters', async ({ page }) => {
  const state = await setup(page, { importantCoverage: { complete: false, candidateLimit: 20, candidatesLimited: true } });
  await page.goto('/marknaden/bevakning?filter=keywords');
  const important = importantRegion(page), latest = latestRegion(page);
  await expect(important).toContainText(IMPORTANT_TITLE);
  await expect(important).toContainText('Urvalet är ofullständigt');
  await expect(important).not.toContainText(LATEST_TITLE);
  await expect(latest.locator('article')).toHaveCount(1);
  await expect(latest).toContainText(KEYWORD_TITLE);
  await expect(latest).not.toContainText(IMPORTANT_TITLE);
  expect(state.reads.some(query => query.filter === 'companies')).toBe(true);
  expect(state.reads.some(query => query.filter === 'keywords')).toBe(true);
  await page.getByRole('group', { name: 'Filtrera bevakning' }).getByRole('button', { name: 'Alla', exact: true }).click();
  await expect(latest.locator('article')).toHaveCount(3);
  await expect(important.locator('article')).toHaveCount(1);
  expect(state.writes).toEqual([]);
});

test('an explicit empty important pool never promotes a latest story', async ({ page }) => {
  const state = await setup(page, { important: [] });
  await page.goto('/marknaden/bevakning');
  await expect(latestRegion(page)).toContainText(LATEST_TITLE);
  await expect(importantRegion(page).locator('article')).toHaveCount(0);
  await expect(importantRegion(page)).not.toContainText(LATEST_TITLE);
  expect(state.writes).toEqual([]);
});

for (const guest of [true, false]) {
  test(`${guest ? 'guest' : 'empty account'} can start following without invented personal data`, async ({ page }) => {
    const state = await setup(page, { user: { email: guest ? null : 'empty@example.test', verified: !guest,
      plan: 'free', watchlist: [], topics: [], keywords: [] } });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/marknaden/bevakning');
    await expect(page.getByRole('heading', { name: 'Börja med ett bolag', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Personliga nyheter', exact: true }).getByRole('combobox', { name: 'Sök efter bolag eller ticker', exact: true })).toBeVisible();
    await expect(page.locator('main article')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Dina bolagskurser' })).toHaveCount(0);
    expect(state.reads).toEqual([]);
    expect(state.quoteReads).toEqual([]);
    expect(state.writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(state.errors).toEqual([]);
  });
}

test('topics-only preferences keep their real news without company quotes', async ({ page }) => {
  const state = await setup(page, { user: { email: 'topics@example.test', verified: true, plan: 'free',
    watchlist: [], topics: ['ORDER'], keywords: [] }, important: [] });
  state.stories = state.stories.filter(item => item.matchedTopic);
  await page.goto('/marknaden/bevakning?filter=topics');
  await expect(latestRegion(page)).toContainText(KEYWORD_TITLE);
  await expect(page.getByRole('region', { name: 'Dina bolagskurser' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Börja med ett bolag', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Filtrera bevakning' }).getByRole('button', { name: 'Ämnen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(state.quoteReads).toEqual([]);
  expect(state.writes).toEqual([]);
});

test('quote failures leave personal news readable with retry', async ({ page }) => {
  const state = await setup(page, { quoteFailures: true });
  await page.goto('/marknaden/bevakning');
  const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
  await expect(strip.getByText('Kursen kunde inte hämtas', { exact: true })).toHaveCount(2);
  await expect(strip.locator('svg[role="img"]')).toHaveCount(0);
  await expect(importantRegion(page)).toContainText(IMPORTANT_TITLE);
  await expect(latestRegion(page)).toContainText(LATEST_TITLE);
  state.quoteFailures = false;
  await strip.getByRole('button', { name: 'Försök igen med kurserna', exact: true }).click();
  await expect(strip.getByText('Kursen kunde inte hämtas', { exact: true })).toHaveCount(0);
  await expect(strip.locator('svg[role="img"]')).toHaveCount(2);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('wrong-company quote responses cannot fabricate prices or curves', async ({ page }) => {
  const state = await setup(page, { quoteWrongSymbol: true });
  await page.goto('/marknaden/bevakning');
  const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
  await expect(strip.getByText('Kursen kunde inte hämtas', { exact: true })).toHaveCount(2);
  await expect(strip.locator('svg[role="img"]')).toHaveCount(0);
  await expect(strip).not.toContainText('102,00');
  await expect(latestRegion(page)).toContainText(LATEST_TITLE);
  expect(state.writes).toEqual([]);
});

test('news failures offer recovery without hiding followed-company quotes', async ({ page }) => {
  const state = await setup(page, { feedStatus: 503 });
  await page.goto('/marknaden/bevakning');
  await expect(page.getByRole('alert').filter({ hasText: 'Bevakningsflödet kunde inte hämtas' })).toBeVisible();
  const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
  await expect(strip.locator('svg[role="img"]')).toHaveCount(2);
  await expect(page.locator('main article')).toHaveCount(0);
  state.feedStatus = 200;
  await page.getByRole('region', { name: 'Personliga nyheter' }).getByRole('button', { name: 'Försök igen', exact: true }).first().click();
  await expect(latestRegion(page)).toContainText(LATEST_TITLE);
  expect(state.writes).toEqual([]);
});

test('quote paging bounds requests to the four shown companies', async ({ page }) => {
  const state = await setup(page, { user: { email: 'many@example.test', verified: true, plan: 'plus',
    watchlist: companies.map(company => company.symbol), topics: [], keywords: [] } });
  await page.goto('/marknaden/bevakning');
  const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
  const list = strip.getByRole('list', { name: 'Följda bolag med kurser', exact: true });
  await expect(list.getByRole('link')).toHaveCount(4);
  await expect(strip).toContainText('Bolag 1–4 av 5');
  expect([...new Set(state.quoteReads)].sort()).toEqual(companies.slice(0, 4).map(company => company.symbol).sort());
  await strip.getByRole('button', { name: 'Nästa bolag', exact: true }).click();
  await expect(list.getByRole('link')).toHaveCount(1);
  await expect(strip).toContainText('Femte Fiktiva Bolaget');
  await expect.poll(() => state.quoteReads.includes('FIVE.TEST')).toBe(true);
  expect(state.writes).toEqual([]);
});

test('one followed company uses the full desktop news width without an empty sidebar', async ({ page }) => {
  const state = await setup(page, { user: { email: 'single@example.test', verified: true, plan: 'free',
    watchlist: ['NORD.TEST'], topics: [], keywords: [] } });
  state.stories = state.stories.filter(item => item.symbol === 'NORD.TEST');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/marknaden/bevakning');
  const important = importantRegion(page), latest = latestRegion(page);
  await expect(important).toContainText(IMPORTANT_TITLE);
  await expect(latest).toContainText(LATEST_TITLE);
  await expect(page.getByRole('complementary', { name: 'Fördjupning för dina bolag', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Jämför kursutveckling', exact: true })).toHaveCount(0);
  const [newsBox, importantBox, latestBox] = await Promise.all([
    page.getByRole('region', { name: 'Personliga nyheter', exact: true }).boundingBox(),
    important.boundingBox(), latest.boundingBox(),
  ]);
  expect(Math.abs(importantBox.width - newsBox.width)).toBeLessThan(2);
  expect(Math.abs(latestBox.width - newsBox.width)).toBeLessThan(2);
  expect(state.comparisonReads).toEqual([]);
  expect(state.writes).toEqual([]);
});

for (const width of [320, 1440]) {
  test(`multiple followed companies keep full-width news without comparison at ${width}px`, async ({ page }) => {
    const state = await setup(page, { user: { email: 'multiple@example.test', verified: true, plan: 'plus',
      watchlist: companies.map(company => company.symbol), topics: [], keywords: [] } });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/marknaden/bevakning');
    await expect(importantRegion(page)).toContainText(IMPORTANT_TITLE);
    await expect(latestRegion(page)).toContainText(LATEST_TITLE);
    await expect(page.getByRole('region', { name: 'Jämför dina bolags kursutveckling', exact: true })).toHaveCount(0);
    const [newsBox, importantBox, latestBox] = await Promise.all([
      page.getByRole('region', { name: 'Personliga nyheter', exact: true }).boundingBox(),
      importantRegion(page).boundingBox(), latestRegion(page).boundingBox(),
    ]);
    expect(Math.abs(importantBox.width - newsBox.width)).toBeLessThan(2);
    expect(Math.abs(latestBox.width - newsBox.width)).toBeLessThan(2);
    expect(state.comparisonReads).toEqual([]);
    await expectNoOverflow(page);
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test('an unknown account fails with retry instead of a guest invitation or personal data', async ({ page }) => {
  const state = await setup(page, { userStatus: 503 });
  await page.goto('/marknaden/bevakning');
  await expect(page.getByRole('alert').filter({ hasText: 'Kontot kunde inte hämtas.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Börja med ett bolag', exact: true })).toHaveCount(0);
  expect(state.reads).toEqual([]);
  expect(state.quoteReads).toEqual([]);
  state.userStatus = 200;
  await page.getByRole('button', { name: 'Försök hämta kontot igen', exact: true }).click();
  await expect(latestRegion(page)).toContainText(LATEST_TITLE);
  expect(state.writes).toEqual([]);
});

for (const width of [320, 390, 1440]) {
  test(`quote cards omit info and date rows at ${width}px`, async ({ page }, testInfo) => {
    const state = await setup(page, { quoteOptions: { currency: null } });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/marknaden/bevakning');
    const strip = page.getByRole('region', { name: 'Dina bolagskurser', exact: true });
    const card = strip.getByRole('listitem', { name: 'Norden Industri', exact: true });
    const link = card.getByRole('link', { name: 'Norden Industri', exact: true });
    await expect(card).toContainText('102,00');
    await expect(card).toContainText('+2,0 %');
    const name = link.getByText('Norden Industri', { exact: true });
    const price = link.getByText('102,00', { exact: true });
    const [nameBox, priceBox] = await Promise.all([name.boundingBox(), price.boundingBox()]);
    expect(priceBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
    expect(await price.evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
    if (width === 320) {
      const name = link.getByText('Norden Industri', { exact: true });
      const badge = link.getByText('+2,0 %', { exact: true });
      const [nameBox, badgeBox, linkBox] = await Promise.all([
        name.boundingBox(), badge.boundingBox(), link.boundingBox(),
      ]);
      expect(badgeBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
      expect(nameBox.width).toBeGreaterThanOrEqual(linkBox.width - 1);
    }
    await expect(card.getByRole('img')).toBeVisible();
    if (width < 700) {
      await expect(strip.getByRole('img')).toHaveCount(2);
      const [cardBox, curveBox] = await Promise.all([card.boundingBox(), card.getByRole('img').boundingBox()]);
      expect(Math.abs(curveBox.x - cardBox.x)).toBeLessThan(1);
      expect(Math.abs(curveBox.width - cardBox.width)).toBeLessThan(1);
      expect(curveBox.y).toBeGreaterThanOrEqual(priceBox.y + priceBox.height);
      expect(curveBox.height).toBe(40);
      const otherCurve = await strip.getByRole('img').nth(1).boundingBox();
      expect(otherCurve.y).toBe(curveBox.y);
    }
    await expect(card.locator('button, time')).toHaveCount(0);
    await expect(strip.getByRole('button', { name: /Kursunderlag/ })).toHaveCount(0);
    await expect(card).not.toContainText(/\d{1,2}:\d{2}|\b20\d{2}\b|Handelsdagen|Dagskurser/);
    await expect(strip).not.toContainText('Valuta saknas');
    await expect(strip).not.toContainText(/fictional-local-fixture|Kurskälla|Kurvkälla/);
    await link.focus();
    await expect(link).toBeFocused();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(await link.getAttribute('href')).toBe('/aktie/NORD.TEST');
    await expect(page).toHaveURL(/\/marknaden\/bevakning$/);
    await expectNoOverflow(page);
    await strip.screenshot({ path: testInfo.outputPath(`personal-quote-cards-${width}.png`) });
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

for (const scenario of [
  { label: 'positive daily change despite a falling curve', startPrice: 103, price: 102, change: 2, token: '--ui-positive', badge: '+2,0 %' },
  { label: 'negative daily change despite a rising curve', startPrice: 97, price: 98, change: -2, token: '--ui-negative', badge: '−2,0 %' },
  { label: 'zero daily change despite a falling curve', startPrice: 101, price: 100, change: 0, token: '--ui-text-secondary', badge: '0,0 %' },
  { label: 'unknown daily change despite a rising curve', startPrice: 100, price: 102, change: null, token: '--ui-text-secondary', badge: 'Saknas' },
]) {
  test(`quote curve color follows ${scenario.label}`, async ({ page }) => {
    const state = await setup(page, { quoteOptions: scenario });
    await page.goto('/marknaden/bevakning');
    const card = page.getByRole('listitem', { name: 'Norden Industri', exact: true });
    await expect(card).toContainText(scenario.badge);
    await expect(card.getByRole('img').locator('path')).toHaveAttribute('stroke', `var(${scenario.token})`);
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}
