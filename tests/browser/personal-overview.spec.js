import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`company-led personal overview at ${width}px`, async ({ page, request }) => {
    const response = await request.get('http://127.0.0.1:8100/api/user/personal-feed');
    const source = (await response.json()).stories[0];
    const stories = [
      { ...source, id: 'personal-important', eventId: 'personal-important', headline: 'Viktig ny order', importance: 90 },
      { ...source, id: 'personal-routine', eventId: 'personal-routine', facts: {}, headline: 'Inbjudan till årsstämma', importance: 95 },
      { ...source, id: 'personal-keyword', eventId: 'personal-keyword', headline: 'Nyheter om batterier', companies: [{ symbol: 'OTHER', name: 'Other' }], matchedKeyword: 'batterier', viaWatchlist: false },
    ].map(story => ({ ...story, publishedAt: new Date().toISOString() }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.EventSource = class extends EventTarget { close() {} };
    });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/user') return route.fulfill({ json: { email: 'personal@example.test', verified: true, plan: 'plus', watchlist: ['NORD.TEST'], topics: [], keywords: ['batterier'] } });
      if (url.pathname === '/api/user/personal-feed') return route.fulfill({ json: { stories, coverage: { complete: true }, nextCursor: null } });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/marknaden/bevakning');
    await expect(page.getByRole('heading', { name: 'Mina bolag', exact: true })).toBeVisible();
    const important = page.getByRole('region', { name: 'Viktigt i dina bolag', exact: true });
    await expect(important.locator('article')).toHaveCount(1);
    await expect(important).toContainText('Viktig ny order');
    await expect(important).toContainText('Fiktiv AI-text');
    const companies = page.getByRole('region', { name: 'Bolag för bolag', exact: true });
    await expect(companies.locator('article')).toHaveCount(1);
    await companies.getByRole('button', { name: 'Visa 1 till' }).click();
    await expect(companies.locator('article')).toHaveCount(2);
    await expect(companies).not.toContainText('Fiktiv AI-text');
    await expect(page.getByRole('region', { name: 'Dina andra bevakningar' })).toContainText('batterier');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/omxsum-personal-overview-${width}.png`, fullPage: true });
    await page.goto('/marknaden');
    const entry = page.getByRole('region', { name: 'Dina bevakningar', exact: true });
    await expect(entry).toContainText('Viktig ny order');
    await expect(entry).not.toContainText('Nyheter om batterier');
    const entryBox = await entry.boundingBox();
    const marketBox = await page.getByRole('heading', { name: 'Viktigast just nu', exact: true }).boundingBox();
    expect(entryBox.y).toBeLessThan(marketBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/omxsum-personal-market-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
