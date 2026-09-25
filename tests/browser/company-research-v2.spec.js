import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 390, 820, 1440]) test(`research sections are readable, visual and accessible at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 1000 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const [id, title] of [['insiders', 'Insynshandel'], ['shorts', 'Namngivna positioner över tid'], ['calendar', 'Kalender'], ['estimates', 'Estimat']]) {
    await page.goto(`/aktie/${id === 'estimates' ? 'VALUE.TEST' : 'NORD.TEST'}#${id}`);
    const section = page.locator(`#${id}`);
    await expect(section.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (id === 'insiders') {
      await expect(section.getByRole('list', { name: 'Största ägarnas kapitalandel' })).toBeVisible();
      await expect(section.getByRole('list', { name: 'Köp och sälj i SEK' })).toBeVisible();
      await expect(section.getByRole('button', { name: '12 mån', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await section.getByRole('button', { name: '3 mån', exact: true }).click();
      await expect(section).toContainText('senaste 90 dagarna');
      await expect(section.locator('ol > li')).toHaveCount(6);
    }
    if (id === 'shorts') {
      await expect(section.getByRole('img', { name: /Namngiven blankning/ })).toBeVisible();
      await expect(section).not.toContainText('Under 0,5 %-tröskeln');
    }
    if (id === 'calendar') {
      await expect(section.getByRole('list', { name: 'Kommande bolagshändelser' })).toBeVisible();
      await expect(section).toContainText('Nästa händelse');
      await expect(section.locator('details [role="group"]')).toHaveCount(1);
      await expect(section.locator('details [role="group"]')).not.toBeVisible();
    }
    if (id === 'estimates') {
      await expect(section.getByRole('img')).toHaveCount(3);
      await expect(section).toContainText('OMXsum-estimat');
      await expect(section).toContainText('Konsensus');
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      await section.screenshot({ path: testInfo.outputPath(`${id}-${theme}-${width}.png`) });
      const audit = await new AxeBuilder({ page }).include(`#${id}`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test('transaction expansion, ownership detail and calendar month remain usable', async ({ page }) => {
  await page.goto('/aktie/NORD.TEST#insiders');
  const section = page.locator('#insiders');
  await expect(section.locator('ol > li')).toHaveCount(6);
  await section.getByRole('button', { name: 'Visa fler transaktioner' }).click();
  await expect(section.locator('ol > li')).toHaveCount(18);
  await section.getByText('Personinnehav, ägarunderlag & metod', { exact: true }).click();
  await expect(section.getByRole('region', { name: 'Insynspersoners innehav' })).toBeVisible();
  await expect(section.getByRole('region', { name: 'Alla ägare i rapportunderlaget' })).toBeVisible();
  await page.goto('/aktie/NORD.TEST#calendar');
  await page.locator('#calendar summary').click();
  await page.locator('#calendar').getByRole('button', { name: 'Nästa månad' }).click();
  await expect(page.locator('#calendar').getByRole('button', { name: 'Föregående månad' })).toBeEnabled();
});

test('news report filter uses event taxonomy and preserves ordinary reader links', async ({ page }) => {
  await page.goto('/aktie/NORD.TEST#news');
  const section = page.locator('#news');
  await expect(section.locator('article').first()).toBeVisible();
  const total = await section.locator('article').count();
  await section.getByRole('button', { name: 'Rapporter', exact: true }).click();
  await expect(section.getByRole('button', { name: 'Rapporter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(section.locator('article')).not.toHaveCount(total);
  await section.getByRole('button', { name: 'Alla nyheter', exact: true }).click();
  await expect(section.locator('article')).toHaveCount(total);
});

test('short history stays available without price bars; null and mismatched data do not become zero', async ({ page }) => {
  await page.goto('/aktie/FJALL.TEST#shorts');
  await expect(page.locator('#shorts').getByRole('img')).toBeVisible();
  let fail = true;
  await page.route('**/feed/company/NORD.TEST/shorts', route => fail ? route.fulfill({ status: 503, json: { error: 'Tillfälligt fel' } }) : route.fallback());
  await page.goto('/aktie/NORD.TEST#shorts');
  const section = page.locator('#shorts');
  await expect(section).toContainText('Blankningsdata kunde inte hämtas');
  fail = false;
  await section.getByRole('button', { name: 'Försök igen' }).click();
  await expect(section.getByRole('img')).toBeVisible();
  await page.route('**/feed/company/NORD.TEST/shorts', route => route.fulfill({ json: { symbol: 'WRONG', available: true, positions: [], series: [] } }));
  await page.reload();
  await expect(section).toContainText('Bolagsunderlaget kunde inte verifieras');
});

test('unsupported Nordic registers stay distinct from no disclosures', async ({ page }) => {
  for (const endpoint of ['insiders', 'shorts']) {
    await page.route(`**/feed/company/NORD.TEST/${endpoint}`, route => route.fulfill({ json: { symbol: 'NORD.TEST', status: 'unsupported', available: false, positions: [], series: [], transactions: [] } }));
    await page.goto(`/aktie/NORD.TEST?register-test=${endpoint}#${endpoint}`);
    await expect(page.locator(`#${endpoint}`)).toContainText('marknaden');
    await expect(page.locator(`#${endpoint}`).getByRole('img')).toHaveCount(0);
  }
});

test('mobile disclosures and next-section links preserve chart state and keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/aktie/NORD.TEST?range=6m&ma=50#insiders');
  const owners = page.locator('#insiders');
  await owners.locator('summary').focus();
  await owners.locator('summary').press('Enter');
  await expect(owners.getByRole('region', { name: 'Alla ägare i rapportunderlaget' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const next = owners.getByRole('link', { name: 'Nästa: Blankning' });
  await next.focus(); await next.press('Enter');
  await expect(page).toHaveURL(/range=6m&ma=50#shorts$/);
  await expect(page.locator('#shorts-heading')).toBeFocused();
  await page.locator('#shorts summary').focus();
  await page.locator('#shorts summary').press('Enter');
  await expect(page.getByRole('region', { name: 'Blankningshistorik' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('forecast absence and failed retrieval are distinct; no empty charts', async ({ page }) => {
  await page.goto('/aktie/NORD.TEST#estimates');
  await expect(page.locator('#estimates')).toContainText('Inga jämförbara estimat ännu');
  await expect(page.locator('#estimates').getByRole('img')).toHaveCount(0);
  await page.goto('/aktie/VALUE-FAIL.TEST#estimates');
  // Wait for Next's streamed replacement before addressing an anchor by ID.
  await expect(page.locator('#estimates')).toHaveCount(1);
  await expect(page.locator('#estimates')).toContainText('Estimatunderlaget kunde inte hämtas');
  await expect(page.locator('#estimates').getByRole('button', { name: 'Försök igen' })).toBeVisible();
});
