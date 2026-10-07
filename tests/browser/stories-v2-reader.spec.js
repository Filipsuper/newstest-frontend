import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
    await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
        return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
    });
});

for (const width of [320, 1440]) test(`fictional v2 narrative and exact bar/line chart data at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/story/omxs_' + '4'.repeat(24));
    await expect(page.getByRole('heading', { level: 1, name: 'Norden Industri tappar försäljning men förbättrar rörelseresultatet' })).toBeVisible();
    await expect(page.getByText('Fiktiv v2-testartikel · inte AI-genererad', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Det vet vi inte ännu' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Händelserna bakom storyn' })).toHaveCount(0);
    const bars = page.getByRole('figure', { name: 'Rörelseförlusten krymper' });
    await expect(bars).toBeVisible();
    await expect(bars.getByRole('row', { name: /Rapportens jämförelsetal −1\s320\s000 SEK/ })).toBeVisible();
    await expect(bars.getByRole('row', { name: /Aktuell rapportperiod −120\s000 SEK/ })).toBeVisible();
    await expect(bars.locator('svg[data-renderer="static"] [data-observation]')).toHaveCount(2);
    const line = page.getByRole('figure', { name: 'Årsomsättning över tid' });
    await expect(line.getByRole('table')).toBeVisible();
    await expect(line.locator('tbody tr')).toHaveCount(3);
    await expect(line.locator('[data-segment="reported"]')).toHaveCount(2);
    for (const chart of [bars, line]) expect(await chart.getByRole('region', { name: /· värden/ }).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(page.getByText(/Yahoo|fingerprint|evidence_|prompt/)).toHaveCount(0);
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.classList.remove('light', 'dark'); document.documentElement.classList.add(theme); }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`stories-v2-${width}-${theme}.png`), fullPage: true });
    }
});

test('article charts and exact tables are present without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 950 } });
    const page = await context.newPage();
    await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.goto('/story/omxs_' + '4'.repeat(24));
    await expect(page.getByRole('figure')).toHaveCount(2);
    await expect(page.locator('svg[data-renderer="static"]')).toHaveCount(2);
    await expect(page.getByRole('figure').getByRole('table')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
});
