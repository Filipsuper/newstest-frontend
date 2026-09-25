import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      const response = await route.fetch({ url: `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}${url.pathname}${url.search}` });
      return route.fulfill({ response });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 1440]) test(`separate calculated/provider figures and dated management fallback at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/COVERAGE.TEST#financials');
  const finance = page.locator('#financials');
  const debt = finance.getByRole('region', { name: 'Finansiell ställning', exact: true });
  await expect(debt.getByText('Beräknad · skuld − kassa', { exact: true })).toBeVisible();
  await expect(debt.getByRole('img', { name: /Nettoskuldsbrygga/ })).toBeVisible();
  await debt.locator('summary').click();
  await expect(debt.locator('dd').nth(2)).toHaveText(/25.*000.*000 SEK/);
  await expect(debt.locator('dd').nth(3)).toHaveText(/27.*000.*000 SEK/);
  const cash = finance.getByRole('region', { name: 'Kassaflöde', exact: true });
  await expect(cash.getByText('Beräknat · från driften − capex', { exact: true })).toBeVisible();
  await expect(cash.getByRole('img', { name: /Kassaflödesbrygga/ })).toHaveAccessibleName(/Fritt kassaflöde 7.*000.*000 SEK/);
  await cash.locator('summary').click();
  await expect(cash).toContainText('leverantörens rapporterade capex');
  await expect(cash).toContainText(/enligt källa: 10.*000.*000 SEK/);
  await debt.locator('summary').click(); await cash.locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await finance.screenshot({ path: info.outputPath(`calculations-${width}.png`) });
  await page.goto('/aktie/COVERAGE.TEST#management');
  const management = page.locator('#management');
  await expect(management).toContainText('Senaste tillgängliga VD-ord · 2025-Q3');
  await expect(management.locator('time')).toHaveAttribute('dateTime', '2025-10-20T06:00:00Z');
  await expect(management.getByRole('link', { name: 'Öppna originalkällan' })).toHaveAttribute('href', 'https://example.test/fictional-report.pdf');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await management.screenshot({ path: info.outputPath(`management-${width}-${theme}.png`) });
    expect((await new AxeBuilder({ page }).include('#management').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  }
});
