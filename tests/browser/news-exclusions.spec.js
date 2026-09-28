import { test, expect } from '@playwright/test';

test('exclusions preserve failed drafts, save explicitly and can be removed', async ({ page, request }) => {
  const user = await (await request.get('http://127.0.0.1:8100/api/user')).json();
  let excluded = [], fail = true, writes = [];
  await page.route('**/api/user', route => route.fulfill({ json: { ...user, excludedKeywords: excluded } }));
  await page.route('**/api/user/keyword-exclusions', route => {
    const body = route.request().postDataJSON(); writes.push(body);
    if (fail) return route.fulfill({ status: 503, json: { error: 'Undantaget kunde inte sparas.' } });
    excluded = body.operation === 'add' ? ['ai'] : [];
    return route.fulfill({ json: { excludedKeywords: excluded } });
  });
  await page.goto('/marknaden/bevakning/hantera');
  await page.getByRole('tab', { name: /Nyckelord/ }).click();
  await page.getByText('Avancerade undantag', { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const input = page.getByRole('textbox', { name: 'Ord eller fras att undanta' });
  await input.fill('AI');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Lägg till undantag' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Undantaget kunde inte sparas' })).toBeVisible();
  await expect(input).toHaveValue('AI');
  fail = false;
  await page.getByRole('button', { name: 'Lägg till undantag' }).click();
  await expect(page.getByRole('button', { name: 'Ta bort undantaget ai' })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /Nyckelord/ }).click();
  await page.getByText('Avancerade undantag', { exact: true }).click();
  await page.getByRole('button', { name: 'Ta bort undantaget ai' }).click();
  await expect(page.getByRole('button', { name: 'Ta bort undantaget ai' })).toHaveCount(0);
  expect(writes.at(-1)).toEqual({ keyword: 'ai', operation: 'remove' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const touch of [false, true]) {
  test(`personal read action stays quiet and accessible (touch=${touch})`, async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: touch, viewport: { width: touch ? 390 : 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3111'}/marknaden/bevakning?filter=all`);
    const action = page.getByRole('button', { name: 'Markera som läst' }).first();
    await expect(action).toBeAttached();
    await expect(page.getByRole('button', { name: /Sluta följa|Mindre som detta/ })).toHaveCount(0);
    if (!touch) {
      await page.mouse.move(0, 0);
      await expect(action).toHaveCSS('opacity', '0');
      const before = await action.boundingBox();
      await action.locator('xpath=ancestor::article').hover();
      await expect(action).toHaveCSS('opacity', '1');
      expect(await action.boundingBox()).toEqual(before);
      await page.mouse.move(0, 0);
      await action.focus();
      await expect(action).toHaveCSS('opacity', '1');
    } else {
      await expect(action).toHaveCSS('opacity', '1');
      expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await action.click();
    await expect(page.getByText('Läst', { exact: true }).first()).toBeVisible();
    await context.close();
  });
}
