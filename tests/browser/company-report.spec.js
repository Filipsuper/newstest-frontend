import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CONTENT_OG_VERSION } from "../../app/utils/brand.js";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

const nav = page => page.getByRole("navigation", { name: "Bolagsavsnitt", exact: true });
const privateRequests = page => {
  const requests = [];
  page.on("request", request => { if (/\/api\/feed\/company\/[^/]+\/(insiders|shorts|valuation)/.test(request.url())) requests.push(new URL(request.url()).pathname); });
  return requests;
};
const belowChrome = async (page, id) => {
  // A streamed route transition can briefly retain the outgoing section.
  // Assert uniqueness once navigation settles before measuring its position.
  await expect(page.locator(`#${id}`)).toHaveCount(1);
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => {
    const offset = parseFloat(getComputedStyle(element).getPropertyValue("--report-offset"));
    return Math.abs(element.getBoundingClientRect().top - offset);
  })).toBeLessThan(12);
};

for (const width of [320, 1440]) test(`company profile precedes financials in document and contents at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/NORD.TEST?range=6m');
  // The initial streamed tree can briefly contain the outgoing sections too.
  await expect(page.locator('[data-report-section]')).toHaveCount(10);
  const sectionOrder = await page.locator('[data-report-section]').evaluateAll(sections => sections.map(section => section.id));
  expect(sectionOrder.slice(0, 5)).toEqual(['overview', 'news', 'profile', 'financials', 'management']);
  if (width < 960) await page.getByRole('button', { name: 'Avsnitt', exact: true }).click();
  const contents = width < 960 ? page.getByRole('navigation', { name: 'Välj bolagsavsnitt', exact: true }) : nav(page);
  expect(await contents.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href').slice(1)))).toEqual(sectionOrder);
  await contents.getByRole('link', { name: 'Bolagsprofil', exact: true }).click();
  await expect(page.locator('#profile .stock-profile')).toBeVisible();
  await belowChrome(page, 'profile');
  await expect(page).toHaveURL(/range=6m#profile$/);
  if (width < 960) await page.getByRole('button', { name: 'Avsnitt', exact: true }).click();
  await contents.getByRole('link', { name: 'Finansiellt', exact: true }).click();
  await expect(page.locator('#financials').getByRole('heading', { name: 'Resultat', exact: true })).toBeVisible();
  await belowChrome(page, 'financials');
  await expect(page).toHaveURL(/range=6m#financials$/);
});

for (const width of [320, 390, 820, 1440]) test(`open company profile fits ${width}px with report perspectives and optional scores`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/NORD.TEST?range=6m#profile');
  const profile = page.locator('#profile');
  await expect(profile.locator('.stock-profile')).toBeVisible();
  await expect(profile.locator('dl > div')).toHaveCount(6);
  await expect(profile.getByText('83 % underlag', { exact: true })).toBeVisible();
  await expect(profile.getByText('Underlag saknas: Insyn', { exact: true })).toBeVisible();
  await expect(profile.locator('.stock-profile__point, .stock-profile__missing-point, .stock-profile__label')).toHaveCount(0);
  const labels = profile.locator('.stock-profile__perimeter-label');
  await expect(labels).toHaveText(['Värdering', 'Tillväxt', 'Historik', 'Hälsa', 'Insyn', 'Utdelning']);
  // Account for SVG scaling and rotation: labels remain readable and wholly
  // inside the viewport, not merely present in the accessibility tree.
  expect(await labels.evaluateAll(nodes => nodes.every(node => {
    const matrix = node.getScreenCTM();
    const fontSize = parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.a, matrix.b);
    const label = node.getBoundingClientRect(), chart = node.ownerSVGElement.getBoundingClientRect();
    return fontSize >= 13.5 && label.left >= chart.left && label.right <= chart.right
      && label.top >= chart.top && label.bottom <= chart.bottom;
  }))).toBe(true);
  await expect(profile.locator('.stock-profile__shape')).toHaveCount(1);
  await expect(profile.getByRole('img')).toHaveAccessibleName(/Insyn saknas av 5.*Utdelning 0 av 5/);
  const opportunities = profile.getByRole('region', { name: 'Möjligheter', exact: true });
  const risks = profile.getByRole('region', { name: 'Risker', exact: true });
  await expect(opportunities).toContainText('Serviceavtalen ger återkommande intäkter.');
  await expect(risks).toContainText('Försäljningen är beroende av ett fåtal stora kunder.');
  await expect(profile.getByText('Fiktiv årsrapport · 2025', { exact: true })).not.toBeVisible();
  await expect(opportunities.getByRole('link')).toHaveCount(0);
  await expect(risks.getByRole('link')).toHaveCount(0);
  await expect(opportunities.locator('li svg[aria-hidden="true"], li [aria-hidden="true"] svg')).toHaveCount(2);
  await expect(risks.locator('li svg[aria-hidden="true"], li [aria-hidden="true"] svg')).toHaveCount(2);
  const riskBox = await risks.boundingBox(), opportunityBox = await opportunities.boundingBox();
  expect(opportunityBox.y).toBeGreaterThanOrEqual(riskBox.y + riskBox.height);
  expect(await opportunities.locator('li p').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBe(16);
  expect(await opportunities.getByRole('heading').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBe(20);
  const chartBox = await profile.getByRole('img').boundingBox();
  expect(chartBox.width).toBeGreaterThanOrEqual(248);
  const alignment = await profile.locator('figure').evaluate(figure => {
    const chart = figure.querySelector('svg').getBoundingClientRect();
    const bounds = figure.getBoundingClientRect();
    const card = figure.parentElement.getBoundingClientRect();
    const caption = figure.querySelector('figcaption').getBoundingClientRect();
    return {
      horizontal: Math.abs(chart.x + chart.width / 2 - (bounds.x + bounds.width / 2)),
      vertical: Math.abs(chart.y + chart.height / 2 - (card.y + card.height / 2)),
      captionInside: caption.bottom <= card.bottom && caption.top >= chart.bottom,
    };
  });
  expect(alignment.horizontal).toBeLessThan(1);
  if (width === 1440) expect(alignment.vertical).toBeLessThan(1);
  expect(alignment.captionInside).toBe(true);
  await expect(profile.locator('details dl')).not.toBeVisible();
  await expect(profile.getByText(/Minst hälften måste ha underlag/)).not.toBeVisible();
  await belowChrome(page, 'profile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    expect(await labels.first().evaluate(node => {
      const expected = getComputedStyle(node).getPropertyValue('--ui-text').trim();
      const probe = document.createElement('span');
      probe.style.color = expected;
      node.ownerSVGElement.parentElement.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return getComputedStyle(node).fill === color;
    })).toBe(true);
    await profile.screenshot({ path: testInfo.outputPath(`profile-${theme}-${width}.png`) });
    const audit = await new AxeBuilder({ page }).include('#profile').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
  }
  const sourceDisclosure = profile.locator('details').filter({ has: page.locator('summary', { hasText: /^Källor$/ }) });
  // Element screenshots/axe can leave the summary behind the fixed mobile
  // dock. Scroll it into the reading area before testing a real pointer click.
  await sourceDisclosure.locator('summary').evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sourceDisclosure.locator('summary').click();
  await expect(sourceDisclosure.getByRole('link')).toHaveCount(4);
  await expect(sourceDisclosure.getByRole('link').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await sourceDisclosure.locator('summary').click();
  await profile.getByText('Så beräknas bolagsprofilen', { exact: true }).click();
  const missing = profile.locator('dl > div').filter({ hasText: 'Insyn' });
  await expect(missing).toBeVisible();
  await expect(missing).toContainText('Saknas');
  const zero = profile.locator('dl > div').filter({ hasText: 'Utdelning' });
  await expect(zero).toContainText('0 / 5');
  await expect(profile.getByText(/Minst hälften måste ha underlag/)).toBeVisible();
  await expect(profile.getByText(/Underliggande kontrollvärden ingår inte/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await belowChrome(page, 'profile');
  await expect(page).toHaveURL(/range=6m#profile$/);
});

test('profile lists keep all citations and report metadata behind one keyboard-accessible source disclosure', async ({ page }) => {
  await page.goto('/aktie/NORD.TEST#profile');
  const profile = page.locator('#profile');
  const opportunities = profile.getByRole('region', { name: 'Möjligheter', exact: true });
  const sources = profile.locator('details').filter({ has: page.locator('summary', { hasText: /^Källor$/ }) });
  await expect(opportunities.getByRole('link')).toHaveCount(0);
  await expect(sources.getByRole('link')).toHaveCount(0);
  await sources.locator('summary').focus();
  await sources.locator('summary').press('Enter');
  await expect(sources.getByText('Fiktiv årsrapport · 2025', { exact: true })).toBeVisible();
  await expect(sources.getByRole('link')).toHaveCount(4);
  const source = sources.getByRole('link', { name: /^Möjligheter:/ }).first();
  await expect(source).toHaveAttribute('href', 'https://example.test/fictional-report.pdf#page=12');
  await source.focus();
  await expect(source).toBeFocused();
  await expect(sources.getByRole('link', { name: /^Risker:/ }).first()).toHaveAttribute('href', 'https://example.test/fictional-report.pdf#page=18');
  expect((await new AxeBuilder({ page }).include('#profile').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await sources.locator('summary').press('Enter');
  await expect(sources.getByRole('link')).toHaveCount(0);
  await expect(profile).not.toContainText('Värdering mot egen historik');
});

test('absent or invalid report insights do not become inferred company risks or opportunities', async ({ page }) => {
  for (const state of ['absent', 'wrong', 'invalid', 'empty-risk']) {
    await page.route('**/feed/company-profiles?*', async route => {
      const response = await route.fetch({ url: `http://127.0.0.1:8100${new URL(route.request().url()).pathname}${new URL(route.request().url()).search}` });
      const data = await response.json();
      if (state === 'absent') delete data.items[0].insights;
      if (state === 'wrong') data.items[0].insights.symbol = 'WRONG.TEST';
      if (state === 'invalid') data.items[0].insights.source.url = 'javascript:alert(1)';
      if (state === 'empty-risk') data.items[0].insights.risks = [];
      return route.fulfill({ json: data });
    });
    // A same-URL hash navigation can retain the previous mounted profile.
    await page.goto(`/aktie/NORD.TEST?fixture-insights=${state}#profile`);
    const profile = page.locator('#profile');
    await expect(profile.locator('.stock-profile')).toBeVisible();
    await expect(profile.getByRole('region', { name: 'Risker', exact: true })).toContainText('Rapportunderlag för risker saknas ännu.');
    if (state !== 'empty-risk') await expect(profile.getByRole('region', { name: 'Möjligheter', exact: true })).toContainText('Rapportunderlag för möjligheter saknas ännu.');
    else await expect(profile.getByRole('region', { name: 'Möjligheter', exact: true })).toContainText('Serviceavtalen');
    await page.unroute('**/feed/company-profiles?*');
  }
  await page.goto('/aktie/FREE.TEST#profile');
  await expect(page.locator('#profile .stock-profile')).toBeVisible();
  await expect(page.locator('#profile')).toContainText('Rapportunderlag för risker saknas ännu.');
  await expect(page.locator('#profile')).not.toContainText('ingår i Plus');
});

test('profile loading, error/retry, missing data and wrong-symbol responses stay distinct', async ({ page }) => {
  let state = 'loading', release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/feed/company-profiles?*', async route => {
    if (state === 'loading') await pending;
    if (state === 'error') return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    if (state === 'wrong') return route.fulfill({ json: { items: [{ symbol: 'WRONG.TEST', axes: [{ key: 'value', score: 5 }] }], missing: [] } });
    if (state === 'missing') return route.fulfill({ json: { items: [], missing: ['NORD.TEST'] } });
    return route.fallback();
  });
  await page.goto('/aktie/NORD.TEST#profile');
  const profile = page.locator('#profile');
  await expect(profile.getByRole('status', { name: 'Hämtar bolagsprofil' })).toBeVisible();
  state = 'error'; release();
  await expect(profile.getByText('Bolagsprofilen kunde inte hämtas')).toBeVisible();
  state = 'ready';
  await profile.getByRole('button', { name: 'Försök igen' }).click();
  await expect(profile.locator('.stock-profile')).toBeVisible();
  for (const value of ['missing', 'wrong']) {
    state = value;
    await page.reload();
    await expect(profile.getByText('Bolagsprofil saknas', { exact: true })).toBeVisible();
    await expect(profile.locator('.stock-profile')).toHaveCount(0);
  }
});

for (const width of [320, 390, 820, 1440]) test(`compact financial overview and VD-ord fit ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/aktie/NORD.TEST#financials');
  const financials = page.locator('#financials');
  await expect(financials.getByRole('heading', { name: 'Resultat', exact: true })).toBeVisible();
  await expect(financials.getByRole('heading', { name: 'Kassaflöde', exact: true })).toBeVisible();
  await expect(financials.getByRole('heading', { name: 'Finansiell ställning' })).toBeVisible();
  await expect(financials.getByRole('button', { name: 'Kvartal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(financials.getByRole('combobox')).toHaveCount(0);
  await expect(financials.getByText('Senaste kvartal: Q3 2025')).toBeVisible();
  const result = financials.getByRole('region', { name: 'Resultat', exact: true });
  await expect(result.getByText('26', { exact: true })).toBeVisible();
  await expect(result.getByText('+18,2 %', { exact: true })).toBeVisible();
  await expect(result.getByRole('img', { name: /^Omsättning och EBIT i MSEK, ebit-marginal/ })).toBeVisible();
  await expect(result.locator('.recharts-bar')).toHaveCount(2);
  await expect(result.locator('.recharts-line')).toHaveCount(1);
  await expect(result.getByRole('button')).toHaveCount(0);
  await expect(result.getByText('12,3 %', { exact: true })).toBeVisible();
  await expect(result.locator('.recharts-line-dot')).toHaveCount(7);
  const balance = financials.getByRole('region', { name: 'Finansiell ställning', exact: true });
  await expect(balance.getByText('Nettokassa', { exact: true })).toBeVisible();
  await expect(balance.locator('p').filter({ hasText: /^9$/ })).toBeVisible();
  const debtBridge = balance.getByRole('img', { name: /^Nettoskuldsbrygga, Q3 2025/ });
  await expect(debtBridge).toBeVisible();
  await expect(debtBridge).toHaveAttribute('aria-label', /Nettoskuld −9\s000\s000 SEK/);
  await expect(balance.getByRole('img', { name: /^Nettoskuld över tid/ })).not.toBeVisible();
  const cash = financials.getByRole('region', { name: 'Kassaflöde', exact: true });
  const cashBridge = cash.getByRole('img', { name: /^Kassaflödesbrygga, Q3 2025/ });
  await expect(cashBridge).toBeVisible();
  for (const bridge of [cashBridge, debtBridge]) {
    await expect(bridge.locator('.recharts-bar-rectangle')).toHaveCount(3);
    await expect(bridge.locator('.recharts-reference-line')).toHaveCount(3);
  }
  expect((await debtBridge.boundingBox()).height).toBe((await cashBridge.boundingBox()).height);
  await expect(cash.getByText('+33,3 %', { exact: true })).toBeVisible();
  await expect(cash.getByRole('img', { name: /^Från driften och Fritt kassaflöde per period/ })).not.toBeVisible();
  const earnings = financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true });
  await expect(earnings).toBeVisible();
  await expect(earnings.locator('p').filter({ hasText: /^1,6$/ })).toBeVisible();
  await expect(earnings.locator('p').filter({ hasText: /^2,6$/ })).toBeVisible();
  const earningsChart = earnings.getByRole('img', { name: /^Nettoresultat och Operativt kassaflöde per period, MSEK/ });
  await expect(earningsChart).toBeVisible();
  await expect(earningsChart.locator('.recharts-bar')).toHaveCount(2);
  await expect(earningsChart.locator('.recharts-bar-rectangle path')).toHaveCount(13); // One missing income value stays absent.
  await expect(earningsChart.locator('.recharts-yAxis')).toHaveCount(1);
  await expect(earningsChart.locator('.recharts-line')).toHaveCount(0);
  await expect(earnings.getByRole('button')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const audit = await new AxeBuilder({ page }).include('#financials').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await financials.screenshot({ path: testInfo.outputPath(`financial-compact-${theme}-${width}.png`) });
  }
  await financials.getByRole('button', { name: 'År', exact: true }).click();
  await expect(financials.getByText('Senaste helår: 2025')).toBeVisible();
  await expect(result.locator('p').filter({ hasText: /^120$/ })).toBeVisible();
  await expect(result.getByText('+9,1 %', { exact: true })).toBeVisible();
  await expect(result.getByRole('button')).toHaveCount(0);
  await expect(result.getByText('11,7 %', { exact: true })).toBeVisible();
  await expect(earnings.locator('p').filter({ hasText: /^8$/ })).toBeVisible();
  await expect(earnings.locator('p').filter({ hasText: /^10$/ })).toBeVisible();
  await expect(earningsChart.locator('.recharts-bar-rectangle path')).toHaveCount(6);
  await expect(balance.locator('p').filter({ hasText: /^10$/ }).first()).toBeVisible();
  await expect(balance.getByRole('img', { name: /^Nettoskuldsbrygga, 2025:/ })).toBeVisible();
  await balance.getByText('Historik och beräkning', { exact: true }).click();
  await expect(balance.getByRole('img', { name: /^Nettoskuld över tid/ })).toBeVisible();
  await expect(balance.locator('.recharts-line-dot')).toHaveCount(3);
  await expect(balance.getByText(/kortfristiga placeringar/)).toBeVisible();
  await expect(balance.getByText('2025 · 2025-12-31 · Bolagsrapport', { exact: true })).toBeVisible();
  await expect(balance.getByRole('link', { name: 'Öppna rapporten ↗' })).toHaveAttribute('href', 'https://example.test/fictional-report.pdf');
  await expect(result.getByRole('img', { name: /^Omsättning och EBIT i MSEK, ebit-marginal/ })).toBeVisible();
  await expect(cash.getByRole('img', { name: /^Kassaflödesbrygga, 2025:/ })).toBeVisible();
  await cash.getByText('Historik och beräkning', { exact: true }).click();
  await expect(cash.getByRole('img', { name: /^Från driften och Fritt kassaflöde per period/ })).toBeVisible();
  await expect(cash.getByRole('link', { name: 'Öppna rapporten ↗' })).toHaveAttribute('href', 'https://example.test/fictional-report.pdf');
  await financials.getByText('Underlag och rapportkällor', { exact: true }).click();
  const source = financials.getByRole('region', { name: 'Underlag till graferna, rulla i sidled' });
  await expect(source.getByRole('link', { name: 'Rapport ↗' }).first()).toHaveAttribute('href', 'https://example.test/fictional-report.pdf');
  await expect(source.getByRole('row')).toHaveCount(4);
  await expect(source.getByRole('columnheader', { name: 'Nettoresultat', exact: true })).toBeVisible();
  await expect(source.getByRole('columnheader', { name: 'Operativt kassaflöde', exact: true })).toHaveCount(1);
  await expect(source.getByRole('columnheader', { name: 'Nettomarginal', exact: true })).toBeVisible();
  await expect(source.getByRole('columnheader', { name: 'Nettoskuld, beräknad', exact: true })).toBeVisible();
  await expect(source.getByRole('columnheader', { name: 'Nettoskuld enligt källa', exact: true })).toBeVisible();
  await financials.getByRole('button', { name: 'Kvartal', exact: true }).click();
  await expect(source.getByRole('row')).toHaveCount(8);
  await page.goto('/aktie/NORD.TEST#management');
  const management = page.locator('#management');
  await expect(management.getByText('AI-sammanfattning', { exact: true })).toBeVisible();
  await expect(management.getByText('2025-Q3', { exact: true })).toBeVisible();
  await expect(management.getByText('Unqualified figure', { exact: true })).toHaveCount(0);
  await expect(management.getByRole('link', { name: 'Öppna originalkällan' })).toHaveAttribute('href', 'https://example.test/fictional-report.pdf');
  await management.getByText('Läs hela VD-ordet', { exact: true }).click();
  await expect(management.getByText('Originaltext', { exact: true })).toBeVisible();
  await expect(management.getByText(/Detta är ett fiktivt VD-ord/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await management.screenshot({ path: testInfo.outputPath(`management-${width}.png`) });
  const audit = await new AxeBuilder({ page }).include('#management').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('missing net income does not affect the fixed EBIT margin chart', async ({ page }) => {
  await page.goto('/aktie/MARGIN-MISSING.TEST#financials');
  const financials = page.locator('#financials');
  const result = financials.getByRole('region', { name: 'Resultat', exact: true });
  await expect(result.getByRole('button')).toHaveCount(0);
  await expect(result.getByText('12,3 %', { exact: true })).toBeVisible();
  await expect(result.getByText('3,2', { exact: true })).toBeVisible();
  await expect(result.locator('.recharts-line-dot')).toHaveCount(7);
  await expect(financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true })).toHaveCount(0);
  await financials.getByRole('button', { name: 'År', exact: true }).click();
  await expect(financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true })).toBeVisible();
  await expect(result.getByText('11,7 %', { exact: true })).toBeVisible();
  await expect(result.getByRole('img', { name: /^Omsättning och EBIT i MSEK, ebit-marginal/ })).toBeVisible();
});

test('earnings/cash bars retain losses, negative cash and zero values on one signed axis', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('/aktie/EARNINGS-SIGNED.TEST#financials');
  const financials = page.locator('#financials');
  const earnings = financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true });
  await expect(earnings.locator('p').filter({ hasText: /^−1,6$/ })).toBeVisible();
  await expect(earnings.locator('p').filter({ hasText: /^2,6$/ })).toBeVisible();
  await expect(earnings.locator('.recharts-bar')).toHaveCount(2);
  const geometry = await earnings.evaluate(element => {
    const zero = Number(element.querySelector('.recharts-reference-line-line').getAttribute('y1'));
    const bars = [...element.querySelectorAll('.recharts-bar-rectangle path')].map(bar => bar.getBBox());
    return { above: bars.some(bar => bar.height > 0 && bar.y < zero && bar.y + bar.height <= zero + 1),
      below: bars.some(bar => bar.height > 0 && bar.y >= zero - 1) };
  });
  expect(geometry).toEqual({ above: true, below: true });
  await earnings.screenshot({ path: testInfo.outputPath('earnings-signed-mobile.png') });
  await financials.getByText('Underlag och rapportkällor', { exact: true }).click();
  const source = financials.getByRole('region', { name: 'Underlag till graferna, rulla i sidled' });
  const zeroRow = source.getByRole('row').filter({ hasText: 'Q1 2025' });
  const headers = await source.getByRole('columnheader').allTextContents();
  await expect(zeroRow.locator('td').nth(headers.indexOf('Nettoresultat') - 1)).toHaveText('0 SEK');
  await expect(zeroRow.locator('td').nth(headers.indexOf('Operativt kassaflöde') - 1)).toHaveText('0 SEK');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('earnings/cash comparison keeps partial data visible without filling the missing value', async ({ page }) => {
  await page.goto('/aktie/EARNINGS-PARTIAL.TEST#financials');
  const earnings = page.locator('#financials').getByRole('region', { name: 'Vinst och kassaflöde', exact: true });
  await expect(earnings.locator('p').filter({ hasText: /^1,6$/ })).toBeVisible();
  await expect(earnings.getByText('Saknas', { exact: true })).toBeVisible();
  await expect(earnings.locator('.recharts-bar')).toHaveCount(2);
  await earnings.locator('.recharts-bar').first().locator('.recharts-bar-rectangle path').last().hover();
  await expect(earnings.getByText('Operativt kassaflöde: Saknas', { exact: true })).toBeVisible();
  await expect(earnings.getByText('Nettoresultat: 1 600 000 SEK', { exact: true })).toBeVisible();
});

test('earnings/cash comparison is hidden when no selected period has both values', async ({ page }) => {
  await page.goto('/aktie/EARNINGS-DISJOINT.TEST#financials');
  const financials = page.locator('#financials');
  await expect(financials.getByRole('region', { name: 'Resultat', exact: true })).toBeVisible();
  await expect(financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true })).toHaveCount(0);
  await expect(financials.getByRole('region', { name: 'Omsättning per affärsområde', exact: true })).toHaveCount(0);
  await financials.getByRole('button', { name: 'År', exact: true }).click();
  await expect(financials.getByRole('region', { name: 'Vinst och kassaflöde', exact: true })).toBeVisible();
});

for (const [symbol, headline, value, message, points] of [
  ['NET-DEBT.TEST', 'Nettoskuld', '25', null, 6],
  ['NET-ZERO.TEST', 'Nettoskuld', '0', null, 7],
  ['NET-MISSING.TEST', 'Nettoskuld', null, 'Underlag för uppdelningen saknas.', 6],
  ['NET-MISMATCH.TEST', 'Nettoskuld', '27', 'Uppdelningen stämmer inte med källans nettoskuld.', 6],
  ['NET-INVALID.TEST', 'Nettoskuld', '25', 'Underlaget för uppdelningen behöver kontrolleras.', 6],
  ['NET-ONLY.TEST', 'Nettoskuld', '8', 'Underlag för uppdelningen saknas.', 0],
]) test(`net-debt panel retains honest values and history: ${symbol}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`/aktie/${symbol}#financials`);
  const balance = page.locator('#financials').getByRole('region', { name: 'Finansiell ställning', exact: true });
  await expect(balance.locator('p').filter({ hasText: new RegExp(`^${headline}$`) })).toBeVisible();
  if (value !== null) await expect(balance.locator('p').filter({ hasText: new RegExp(`^${value}$`) }).first()).toBeVisible();
  const bridge = balance.getByRole('img', { name: /^Nettoskuldsbrygga/ });
  if (message) {
    await expect(balance.getByText(message, { exact: true })).toBeVisible();
    await expect(bridge).toHaveCount(0);
  } else {
    await expect(bridge).toBeVisible();
  }
  await expect(balance.getByRole('img', { name: /^Nettoskuld över tid/ })).not.toBeVisible();
  if (symbol === 'NET-ZERO.TEST') {
    const bars = bridge.locator('.recharts-bar-rectangle path');
    expect(await bars.evaluateAll(elements => elements.every(element => element.getBBox().height === 0))).toBe(true);
  }
  await balance.screenshot({ path: testInfo.outputPath(`${symbol}.png`) });
  await balance.getByText('Historik och beräkning', { exact: true }).click();
  await expect(balance.locator('.recharts-line-dot')).toHaveCount(points);
  if (!points) await expect(balance.getByText('Jämförbar nettoskuldshistorik saknas.', { exact: true })).toBeVisible();
  if (symbol === 'NET-DEBT.TEST') {
    const path = await balance.locator('.recharts-line-curve').getAttribute('d');
    expect(path.match(/M/g).length).toBe(2); // The missing quarter is not connected across.
  }
  await expect(balance.getByText('Nettoskuld enligt källa', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).include('#financials').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
});

for (const [symbol, message] of [
  ['CASH-MISSING.TEST', 'Underlag för uppdelningen saknas.'],
  ['CASH-MISMATCH.TEST', 'Uppdelningen kan inte stämmas av.'],
]) test(`cash flow fallback keeps values without a fictional bridge: ${symbol}`, async ({ page }) => {
  await page.goto(`/aktie/${symbol}#financials`);
  const cash = page.locator('#financials').getByRole('region', { name: 'Kassaflöde', exact: true });
  await expect(cash.getByText(message, { exact: true })).toBeVisible();
  await expect(cash.getByRole('img', { name: /^Kassaflödesbrygga/ })).toHaveCount(0);
  await cash.getByText('Historik och beräkning', { exact: true }).click();
  await expect(cash.getByRole('img', { name: /^Från driften och Fritt kassaflöde per period/ })).toBeVisible();
});

for (const symbol of ['CASH-NEGATIVE.TEST', 'CASH-ZERO.TEST']) test(`cash-flow waterfall handles negative and zero totals: ${symbol}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`/aktie/${symbol}#financials`);
  const cash = page.locator('#financials').getByRole('region', { name: 'Kassaflöde', exact: true });
  await expect(cash.getByRole('img', { name: /^Kassaflödesbrygga/ })).toBeVisible();
  await expect(cash).not.toContainText('Underlag för uppdelningen saknas');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cash.screenshot({ path: testInfo.outputPath(`${symbol}.png`) });
});

test('R12 stays available in the detailed table without changing the overview', async ({ page }) => {
  await page.goto('/aktie/NORD.TEST#financials');
  const financials = page.locator('#financials');
  await financials.getByText('Alla nyckeltal och rapporterade siffror', { exact: true }).click();
  await financials.getByRole('checkbox', { name: 'Visa R12 i tabellen (beräknat)' }).check();
  await expect(financials.getByRole('region', { name: 'Finansiella nyckeltal, rulla i sidled' })).toContainText('R12');
  await expect(financials.getByText('Senaste kvartal: Q3 2025')).toBeVisible();
  await financials.getByRole('button', { name: 'År', exact: true }).click();
  await expect(financials.getByRole('checkbox', { name: 'Visa R12 i tabellen (beräknat)' })).not.toBeChecked();
});

test("desktop report uses one chart, persistent sections and on-demand research", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const requests = privateRequests(page), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/aktie/NORD.TEST");
  await expect(page.locator("[data-report-section]")).toHaveCount(10);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(nav(page)).toBeVisible();
  await expect(page.locator(".company-chart")).toHaveCount(1);
  expect(requests).toEqual([]);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {}))); });
    const audit = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`company-${theme}-desktop.png`) });
  }
  await nav(page).getByRole("link", { name: "Finansiellt", exact: true }).click();
  await expect(page).toHaveURL(/#financials$/);
  await belowChrome(page, "financials");
  await page.getByRole("button", { name: "Kvartal", exact: true }).click();
  await page.getByText("Alla nyckeltal och rapporterade siffror", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Finansiella nyckeltal, rulla i sidled" })).toBeVisible();
  await nav(page).getByRole("link", { name: "Nyheter & reaktioner" }).click();
  await expect(nav(page).getByRole("link", { name: "Nyheter & reaktioner" })).toHaveAttribute("aria-current", "location");
  await nav(page).getByRole("link", { name: "Finansiellt", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kvartal", exact: true })).toHaveAttribute("aria-pressed", "true");
  await nav(page).getByRole("link", { name: "Insyn & ägare" }).click();
  await expect(page.locator('#insiders').getByRole('heading', { name: 'Insynshandel', exact: true })).toBeVisible();
  // React's development effect replay can send then cancel the first request.
  // A visited section must stay mounted and must not fetch again on returning.
  const insiderRequests = requests.filter(request => request.endsWith('/insiders')).length;
  expect(insiderRequests).toBeGreaterThanOrEqual(1);
  expect(insiderRequests).toBeLessThanOrEqual(2);
  await nav(page).getByRole("link", { name: "Översikt", exact: true }).click();
  await expect(page.locator(".company-chart")).toHaveCount(1);
  await nav(page).getByRole('link', { name: 'Insyn & ägare' }).click();
  expect(requests.filter(request => request.endsWith('/insiders')).length).toBe(insiderRequests);
  expect(errors).toEqual([]);
});

test("legacy links, section reload and reader Back/Forward preserve chart and reading position", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/aktie/NORD.TEST?tab=news&range=6m&ma=50");
  await expect(page).toHaveURL(/range=6m&ma=50#news$/);
  await belowChrome(page, "news");
  await expect(page.getByRole("button", { name: "6 mån", exact: true })).toHaveAttribute("aria-pressed", "true");
  const article = page.locator('#news article a[href^="/nyhet/"][href$="~fixture-3"]');
  await article.scrollIntoViewIfNeeded();
  await article.focus();
  const position = await page.evaluate(() => scrollY);
  const original = page.url();
  await article.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(original);
  await expect(article).toBeFocused();
  await expect.poll(() => page.evaluate(y => Math.abs(scrollY - y), position)).toBeLessThan(4);
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(original);
  await nav(page).getByRole("link", { name: "Blankning", exact: true }).click();
  await belowChrome(page, "shorts");
  await page.reload();
  await belowChrome(page, "shorts");
});

for (const width of [320, 390, 820]) test(`mobile ${width}: contents sheet jumps instead of hiding panels; page scrolls normally`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/aktie/NORD.TEST");
  const trigger = page.getByRole("button", { name: "Avsnitt", exact: true });
  await expect(trigger).toBeVisible();
  expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Nyheter & reaktioner" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await belowChrome(page, "news");
  await expect(page.locator("#news-heading")).toBeFocused();
  await expect(page.locator("[data-report-section]")).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(width / 2, 550);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`company-${width}-news.png`) });
  await trigger.click();
  await page.getByRole("dialog").getByRole("link", { name: "Finansiellt", exact: true }).click();
  await belowChrome(page, "financials");
  await page.getByText("Alla nyckeltal och rapporterade siffror", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`company-${width}-financials.png`) });
});

test("news is bounded, chronological and deduplicated; intraday loading has no synthetic curve", async ({ page }) => {
  await page.goto("/aktie/MANY.TEST#news");
  await expect(page.locator("#news article")).toHaveCount(6);
  await expect(page.locator('#news a[href^="/nyhet/"][href$="~fixture-0"]')).toHaveCount(1);
  await expect(page.locator('#news a[href^="/nyhet/"][href$="~duplicate-release"]')).toHaveCount(0);
  await expect(page.locator("#news article").first()).toContainText("Fiktiv AI-text");
  await expect(page.locator("#news article").first().getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Visa fler nyheter" }).click();
  await expect(page.locator("#news article")).toHaveCount(12);
  await page.getByRole("button", { name: "Visa fler nyheter" }).click();
  await expect(page.locator("#news article")).toHaveCount(18);
  await expect(page.getByRole("button", { name: "Visa fler nyheter" })).toHaveCount(0);
  await nav(page).getByRole("link", { name: "Översikt", exact: true }).click();
  await page.getByRole("button", { name: "1 dag", exact: true }).click();
  await expect(page).toHaveURL(/range=1d#overview$/);
  await expect(page.locator(".company-chart .recharts-line-curve")).toHaveCount(0);
  await page.getByRole("button", { name: "1 år", exact: true }).click();
  await page.getByRole("button", { name: "Diagraminställningar", exact: true }).click();
  await page.getByRole("checkbox", { name: "MA50", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Diagraminställningar", exact: true })).toBeFocused();
  await expect(page).toHaveURL(/ma=50#overview$/);
  await page.getByRole("button", { name: "Dela aktien", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Kopiera länk" })).toBeVisible();
  await expect(page.getByRole("dialog").locator('img[src*="/og/aktie"]')).toHaveAttribute("src", new RegExp(`range=1y&ma=50&v=${CONTENT_OG_VERSION}$`));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Dela aktien", exact: true })).toBeFocused();
});

test("server access prevents private requests while news/calendar remain usable; empty and error states are honest", async ({ page }) => {
  const requests = privateRequests(page);
  await page.goto("/aktie/FREE.TEST?tab=insiders");
  await expect(page).toHaveURL(/#insiders$/);
  await belowChrome(page, "insiders");
  await expect(page.locator("#insiders")).toContainText("ingår i Plus");
  await expect(page.locator("#financials")).toContainText("Omsättning");
  await expect(page.locator("#financials")).toContainText("120 M SEK");
  await nav(page).getByRole('link', { name: 'Bolagsprofil', exact: true }).click();
  await belowChrome(page, 'profile');
  await expect(page.locator('#profile .stock-profile')).toBeVisible();
  await expect(page.locator('#profile')).not.toContainText('ingår i Plus');
  await nav(page).getByRole("link", { name: "Kalender", exact: true }).click();
  await expect(page.locator('#calendar').getByRole('list', { name: 'Kommande bolagshändelser' })).toBeVisible();
  expect(requests).toEqual([]);
  await page.goto("/aktie/FJALL.TEST");
  await expect(page.locator("main:visible").getByText("Ingen historisk kursdata är tillgänglig ännu.")).toBeVisible();
  await expect(page.locator("#news article")).not.toHaveCount(0);
  await page.goto("/aktie/MISSING.TEST");
  await expect(page.locator("main:visible").getByText("Aktien kunde inte hittas", { exact: true })).toBeVisible();
  await page.goto("/aktie/UNAVAILABLE.TEST");
  await expect(page.locator("main:visible").getByText("Bolagssidan kunde inte hämtas", { exact: true })).toBeVisible();
});
