import { test, expect } from '@playwright/test';

const fixtureOrigin = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ9sAAAAASUVORK5CYII=', 'base64');
const companies = [
  { symbol: 'NORD.TEST', name: 'Norden Industri' },
  { symbol: 'SKAR.TEST', name: 'Skärgården Teknik' },
  { symbol: 'FJALL.TEST', name: 'Fjäll Energi' },
  { symbol: 'FOUR.TEST', name: 'Fiktiva Industriella Komponenter och Energi Holding' },
];
const stripFor = page => page.getByRole('region', { name: 'Dina bolagskurser', exact: true });

function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

function quote(symbol) {
  const session = new Date();
  session.setUTCHours(10, 0, 0, 0);
  if (session.getTime() > Date.now()) session.setUTCDate(session.getUTCDate() - 1);
  const end = session.getTime();
  return {
    symbol, timezone: 'Europe/Stockholm', updateMode: 'snapshot', previousClose: 100,
    previous: [], previousFull: [],
    current: [{ time: end - 30 * 60_000, close: 100, volume: 80 }, { time: end, close: 102, volume: 90 }],
    quote: { price: 102, change: 2, changePct: 2, currency: 'SEK', quoteTime: end,
      source: 'fictional-local-fixture', fresh: false, updateMode: 'snapshot' },
  };
}

async function setup(page, imageOutcome) {
  const metadata = gate(), prices = gate(), images = gate();
  const state = { writes: [], errors: [], imageRequests: [], metadata, prices, images };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      state.writes.push({ path: url.pathname, method: request.method() });
      return route.fulfill({ status: 405, json: { error: 'Read-only quote layout fixture' } });
    }
    if (url.hostname === 'terminal.omxsum.com') {
      state.imageRequests.push(url.pathname);
      await images.promise;
      return imageOutcome === 'success'
        ? route.fulfill({ body: image, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } })
        : route.fulfill({ status: 404, body: '', headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/api/user') return route.fulfill({ json: {
      email: 'quote-layout@example.test', verified: true, plan: 'plus',
      watchlist: companies.map(company => company.symbol), topics: [], keywords: [],
    } });
    if (['/api/feed/companies', '/api/feed/company-directory'].includes(url.pathname)) {
      await metadata.promise;
      return route.fulfill({ json: companies });
    }
    if (url.pathname === '/api/user/personal-feed') return route.fulfill({ json: {
      stories: [], importantStories: [], sinceHours: 168, nextCursor: null, readStateAvailable: true,
      coverage: { complete: true }, importantCoverage: { complete: true, candidatesLimited: false },
    } });
    if (/^\/api\/feed\/company\/[^/]+\/intraday$/.test(url.pathname)) {
      await prices.promise;
      return route.fulfill({ json: quote(decodeURIComponent(url.pathname.split('/').at(-2))) });
    }
    if (url.pathname.startsWith('/api/feed/spark/')) return route.fulfill({ json: {
      symbol: decodeURIComponent(url.pathname.split('/').at(-1)), data: [],
    } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({
      url: `${fixtureOrigin}${url.pathname}${url.search}`,
    }) });
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return state;
}

async function geometry(strip) {
  return strip.getByRole('listitem').evaluateAll(cards => {
    const box = node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    };
    return cards.map(card => {
      const link = card.querySelector('a');
      const name = card.querySelector('[data-company-quote-name]');
      const price = card.querySelector('[data-company-quote-price]');
      const logo = card.querySelector('[data-company-logo]');
      return { card: box(card), link: box(link), name: box(name), price: box(price), logo: box(logo),
        change: box(price.nextElementSibling), chartSlot: box(link.lastElementChild) };
    });
  });
}

function expectStable(before, after) {
  expect(after).toHaveLength(before.length);
  for (let index = 0; index < before.length; index++) {
    for (const part of Object.keys(before[index])) {
      for (const dimension of ['x', 'y', 'width', 'height']) {
        expect(after[index][part][dimension], `card ${index + 1}: ${part}.${dimension}`).toBeCloseTo(before[index][part][dimension], 2);
      }
    }
  }
}

for (const width of [320, 390, 1101, 1440]) {
  for (const imageOutcome of ['success', 'failure']) {
    test(`personal quote cards reserve names, prices and logos through ${imageOutcome} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      const state = await setup(page, imageOutcome);
      await page.goto('/marknaden/bevakning', { waitUntil: 'domcontentloaded' });
      const strip = stripFor(page), cards = strip.getByRole('listitem');
      await expect(cards).toHaveCount(4);
      await expect(strip.locator('[data-company-quote-name]')).toHaveText(companies.map(company => company.symbol));
      await page.evaluate(() => document.fonts.ready);
      const pending = await geometry(strip);

      state.metadata.release();
      await expect(strip.locator('[data-company-quote-name]')).toHaveText(companies.map(company => company.name));
      expectStable(pending, await geometry(strip));
      state.prices.release();
      await expect(strip.locator('[data-company-quote-price]')).toHaveText(companies.map(() => '102,00 kr'));
      await expect(strip.getByRole('img')).toHaveCount(4);
      expectStable(pending, await geometry(strip));

      const logos = strip.locator('[data-company-logo]');
      await expect(logos).toHaveCount(4);
      await expect(strip.locator('[data-logo-state="fallback"]')).toHaveCount(4);
      const beforeImage = await geometry(strip);
      state.images.release();
      if (imageOutcome === 'success') {
        await expect(strip.locator('[data-logo-state="loaded"]')).toHaveCount(4);
      } else {
        await expect(logos.locator('img')).toHaveCount(0);
        await expect(strip.locator('[data-logo-state="fallback"]')).toHaveCount(4);
      }
      expectStable(beforeImage, await geometry(strip));

      for (let index = 0; index < companies.length; index++) {
        const card = cards.nth(index), current = beforeImage[index];
        const name = card.locator('[data-company-quote-name]');
        const chart = await card.getByRole('img').boundingBox();
        expect(current.logo.width).toBe(24);
        expect(current.logo.height).toBe(24);
        expect(current.name.x).toBe(current.logo.x + 32);
        expect(current.name.width).toBeGreaterThanOrEqual(current.link.width - 33);
        expect(current.name.width).toBeGreaterThanOrEqual(60);
        const nameStyle = await name.evaluate(node => {
          const style = getComputedStyle(node);
          return { lineHeight: parseFloat(style.lineHeight), clamp: style.webkitLineClamp, overflow: style.overflow };
        });
        expect(current.name.height).toBeCloseTo(nameStyle.lineHeight * 2, 2);
        expect(nameStyle.clamp).toBe('2');
        expect(nameStyle.overflow).toBe('hidden');
        expect(current.price.y).toBeGreaterThanOrEqual(current.name.y + current.name.height);
        if (width <= 360) {
          expect(current.change.y).toBeGreaterThanOrEqual(current.price.y + current.price.height);
        } else {
          expect(current.change.y).toBe(current.price.y);
          expect(current.change.x).toBeGreaterThanOrEqual(current.price.x + current.price.width);
        }
        expect(chart.y).toBeGreaterThanOrEqual(current.change.y + current.change.height);
        expect(chart.height).toBe(40);
        expect(chart.x).toBeCloseTo(current.card.x, 2);
        expect(chart.width).toBeCloseTo(current.card.width, 2);
        await expect(card.getByRole('link')).toHaveAttribute('href', `/aktie/${companies[index].symbol}`);
        await expect(card.locator('button')).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(new Set(state.imageRequests).size).toBe(4);
      expect(state.writes).toEqual([]);
      expect(state.errors).toEqual([]);
      await strip.screenshot({ path: testInfo.outputPath(`personal-quote-logos-${imageOutcome}-${width}.png`) });
    });
  }
}
