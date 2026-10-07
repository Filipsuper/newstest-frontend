import { test, expect } from '@playwright/test';

// Explicit existing real SolidX Studio only; no generation/publication on load.
test.skip(!process.env.OMXSUM_STORIES_DATES_SNAPSHOT, 'Requires a configured frozen SolidX Studio');

test.beforeEach(async ({ page }) => {
    await page.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.abort();
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
        if (url.pathname.endsWith('/user')) return route.fulfill({ json: null });
        return route.continue();
    });
});

for (const width of [320, 1440]) test(`real draft uses readable dates and intact evidence at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/designsystem/stories');
    await expect(page.getByLabel('Välj utkast')).toBeEnabled();
    await page.getByRole('tab', { name: 'Artikel', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Opublicerad artikelpreview' });
    await expect(preview).toContainText('delårsrapporten för 1 maj–31 juli 2026');
    await expect(preview).toContainText('Periodslut 31 juli 2026');
    await expect(preview).not.toContainText('2026-05-01');
    await expect(preview).not.toContainText('2026-07-31');
    await expect(preview.getByRole('figure')).toHaveCount(2);
    const revenue = preview.getByRole('figure', { name: 'Nettoomsättning', exact: true });
    await expect(revenue.getByRole('table')).toContainText('1 maj–31 juli 2026');
    await expect(revenue.getByRole('table')).toContainText('23 630 000 SEK');
    await expect(revenue.getByRole('table')).toContainText('30 450 000 SEK');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await revenue.getByRole('button', { name: 'Granska underlaget för 1 maj–31 juli 2026', exact: true }).click();
    const fact = page.getByRole('region', { name: 'Vald faktauppgift' });
    await expect(fact).toContainText('23,63 MSEK (30,45 MSEK)');
    await expect(fact).toContainText('2026-05-01');
    await expect(fact).toContainText('2026-07-31');
});

test('date presentation is included in server-rendered article without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 950 } });
    const page = await context.newPage();
    await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.goto('/designsystem/stories');
    const preview = page.getByRole('region', { name: 'Opublicerad artikelpreview' });
    await expect(preview).toContainText('delårsrapporten för 1 maj–31 juli 2026');
    await expect(preview).toContainText('Periodslut 31 juli 2026');
    await expect(preview.getByRole('figure').getByRole('table').first()).toContainText('1 maj–31 juli 2026');
    await expect(preview).not.toContainText('2026-07-31');
    await context.close();
});
