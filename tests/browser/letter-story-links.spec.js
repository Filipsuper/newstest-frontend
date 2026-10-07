import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixtureOrigin = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) {
      expect(['GET', 'HEAD', 'OPTIONS']).toContain(req.method());
      return route.fulfill({ response: await route.fetch({ url: `${fixtureOrigin}${url.pathname}${url.search}` }) });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    if (req.resourceType() === 'script') return route.fulfill({ contentType: 'application/javascript', body: '' });
    return route.abort();
  });
});

for (const width of [320, 390, 1440]) test(`exact newsletter citation opens reader and returns to same paragraph at ${width}px`, async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/article/linked-letter');
  const lists = page.getByRole('list', { name: 'Nyheterna bakom stycket' });
  await expect(lists).toHaveCount(2);
  const source = lists.first().getByRole('link', { name: /^Läs nyheten\s*: Höjer prognosen efter stark orderingång$/ });
  await expect(source).toHaveAttribute('href', '/nyhet/hojer-prognosen-efter-stark-orderingang~fixture-0');
  await expect(source).not.toHaveAttribute('target', '_blank');
  await expect(lists.nth(1).getByRole('link')).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  await source.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const intro = page.locator('main article header p').first();
  const introLineHeight = await intro.evaluate(element => getComputedStyle(element).lineHeight);
  expect(introLineHeight).toBe('26.4px');
  const before = await source.boundingBox();
  expect(before.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath(`letter-citations-${width}.png`) });
  for (const close of ['Escape', 'Back']) {
    await source.click();
    const reader = page.getByRole('dialog');
    await expect(reader).toBeVisible();
    await expect(reader.getByRole('heading', { name: 'Höjer prognosen efter stark orderingång', exact: true })).toBeVisible();
    const original = reader.getByRole('region', { name: 'Nyhetens källor' })
      .locator('a[href="https://example.com/release"]');
    await expect(original).toBeVisible();
    await expect(original).toHaveAccessibleName('MFN');
    if (close === 'Escape') await page.keyboard.press('Escape');
    else await page.goBack();
    await expect(reader).toHaveCount(0);
    await expect(page).toHaveURL(/\/article\/linked-letter$/);
    await expect(intro).toHaveCSS('line-height', introLineHeight);
    await expect.poll(async () => Math.abs((await source.boundingBox()).y - before.y)).toBeLessThanOrEqual(4);
    await expect(source).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

for (const route of ['fixture-letter', 'stale-linked-letter']) test(`legacy or edited letter ${route} stays readable without invented links`, async ({ page }) => {
  await page.goto(`/article/${route}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Nyheterna bakom stycket' })).toHaveCount(0);
  await expect(page.locator('p h2, a a')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(route === 'fixture-letter' ? 'Dagens viktigaste händelser' : 'Redigerat i efterhand.');
});
