import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixtureOrigin = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        window.EventSource = class extends EventTarget { close() {} };
    });
    await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
            const response = await route.fetch({ url: `${fixtureOrigin}${url.pathname}${url.search}` });
            return route.fulfill({ response });
        }
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
    });
});

for (const width of [320, 390, 1440]) test(`separate Stories listing, sourced reader and feed cross-links at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/marknaden/stories');
    await expect(page.getByRole('heading', { level: 1, name: 'OMXsum Stories' })).toBeVisible();
    await expect(page.locator('main article')).toHaveCount(3);
    await expect(page.getByRole('navigation', { name: 'Marknaden', exact: true }).getByRole('link', { name: 'Nyhetsflöde' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Story-format' })).toHaveCount(0);
    expect(await page.locator('main article').first().evaluate(node => Number.parseFloat(getComputedStyle(node).paddingLeft))).toBe(width <= 700 ? 16 : 24);
    await expect(page.getByRole('link', { name: /^Läs artikeln:/ })).toHaveCount(3);
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
        }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`omxsum-stories-index-${width}-${theme}.png`), fullPage: true });
    }
    await page.getByRole('heading', { name: 'Norden Industri: positiv EBITDA trots lägre omsättning' }).getByRole('link').click();
    // The development server compiles the full article reader on first use.
    await expect(page).toHaveURL(/\/story\/.+~omxs_/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Siffrorna i korthet' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Det vet vi inte ännu' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Källor & beräkningar' })).toBeVisible();
    await expect(page.getByText('OMXsum-beräkning', { exact: true })).toHaveCount(0);
    const external = page.getByRole('link', { name: 'Fiktiv rapport från Norden Industri ↗' });
    await expect(external).toHaveAttribute('href', 'https://example.com/fictional-report');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`omxsum-story-${width}.png`), fullPage: true });
    await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`omxsum-story-${width}-dark.png`), fullPage: true });
    await page.getByRole('link', { name: 'Höjer prognosen efter stark orderingång', exact: true }).click();
    // The development server compiles the intercepted reader on first use.
    await expect(page).toHaveURL(/\/nyhet\//, { timeout: 15000 });
    await expect(page.getByRole('region', { name: 'OMXsum Stories', exact: true }).getByRole('link', { name: 'Norden Industri: positiv EBITDA trots lägre omsättning' })).toBeVisible();
});

test('empty company stories are distinct from an unavailable response', async ({ page }) => {
    await page.goto('/marknaden/stories?symbol=EMPTY.TEST');
    await expect(page.getByText('Inga publicerade artiklar här ännu')).toBeVisible();
    await expect(page.getByText('Artiklarna kunde inte hämtas')).toHaveCount(0);
});

test('bookmarked article-format filters stay understandable without filter tabs', async ({ page }) => {
    await page.goto('/marknaden/stories?format=report');
    await expect(page.locator('main article')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Story-format' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Visa alla artiklar' }).click();
    await expect(page).toHaveURL(/\/marknaden\/stories$/);
    await expect(page.locator('main article')).toHaveCount(3);
});

test('stable article ID redirects to its current canonical headline URL', async ({ page }) => {
    await page.goto('/story/omxs_' + '1'.repeat(24));
    await expect(page).toHaveURL(/\/story\/norden-industri.+~omxs_/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /https:\/\/omxsum.com\/story\//);
});

test('Stories outage shows retry, not an empty publication, and leaves the fast feed usable', async ({ page }) => {
    const mutations = [];
    page.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/api/feed/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(request.url());
    });
    await page.goto('/marknaden/stories?symbol=UNAVAILABLE.TEST');
    await expect(page.getByText('Artiklarna kunde inte hämtas', { exact: true })).toBeVisible();
    await expect(page.getByText('Inga publicerade artiklar här ännu')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Försök igen', exact: true })).toHaveAttribute('href', '/marknaden/stories?symbol=UNAVAILABLE.TEST');
    await page.getByRole('navigation', { name: 'Marknaden', exact: true }).getByRole('link', { name: 'Nyhetsflöde' }).click();
    await expect(page).toHaveURL(/\/marknaden\/nyheter/, { timeout: 15000 });
    await expect(page.locator('main article')).toHaveCount(12);
    expect(mutations).toEqual([]);
});

test('unavailable article keeps retry and noindex metadata, while missing articles return 404', async ({ page, request }) => {
    const id = 'omxs_' + 'f'.repeat(24);
    await page.goto(`/story/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Storyn är tillfälligt otillgänglig' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Försök igen', exact: true })).toHaveAttribute('href', `/story/${id}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const missing = await request.get('/story/omxs_' + 'e'.repeat(24));
    expect(missing.status()).toBe(404);
});
