import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
    await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
        ? route.continue() : route.abort());
});
for (const width of [320, 1440]) test(`public story route renders exact source-separated estimates at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`/story/omxs_${'e'.repeat(24)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Fiktivt integrationstest: rapporterade värden och estimat' })).toBeVisible();
    await expect(page.getByText('Fiktivt public-reader-test · inte AI-genererat eller publicerat', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Utfall och estimat' })).toBeVisible();
    await expect(page.getByRole('figure')).toHaveCount(3);
    const ebit = page.getByRole('figure', { name: 'EBIT' });
    await ebit.getByText('Visa värden').click();
    await expect(ebit.getByRole('table')).toContainText(/−?[-]?1\s000\s000 SEK/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(ebit.getByText('Analytikerkonsensus', { exact: true }).first()).toBeVisible();
    await expect(ebit.getByText('OMXsum-estimat', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Linjer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Linjer', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(ebit.locator('svg[data-renderer="static"]')).toBeVisible();
    await expect(page.getByText(/Yahoo|captureAudit|researchBinding|sourceBindings|payloadJson|writerOutput/)).toHaveCount(0);
    for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.classList.remove('light', 'dark'); document.documentElement.classList.add(theme); }, theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    }
});
test('public estimates are server-rendered with native exact tables even without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 950 } });
    try {
        const page = await context.newPage();
        await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
        await page.goto(`/story/omxs_${'e'.repeat(24)}`);
        await expect(page.getByRole('figure')).toHaveCount(3);
        await expect(page.locator('svg[data-renderer="static"]')).toHaveCount(3);
        const ebit = page.getByRole('figure', { name: 'EBIT' });
        await ebit.getByText('Visa värden').click();
        await expect(ebit.getByRole('table')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
});
