import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { SESSION_PREVIEW_NOW, sessionPreviewStories } from "../../app/designsystem/sessions/fixtures.js";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(SESSION_PREVIEW_NOW));
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({
      response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }),
    });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

const reaction = scope => scope.getByRole("region", { name: "Marknadens reaktion", exact: true });
const facts = scope => scope.locator('dl[aria-label="Nyckeltal"]');
const fact = (scope, label) => facts(scope).locator(":scope > div").filter({ hasText: label });
const badge = (scope, label) => scope.locator(`[aria-label="${label}"]`);
const story = key => sessionPreviewStories().find(item => item.id === `session-preview-${key}`);
const stockChart = scope => scope.getByRole("figure", { name: /^Aktiekurs ·/ });

async function continuousStockChart(scope) {
  const chart = stockChart(scope);
  await expect(chart).toBeVisible();
  const line = chart.locator('path[fill="none"]');
  await expect(line).toHaveAttribute("stroke", "var(--ui-accent)");
  expect((await line.getAttribute("d")).match(/M/g)).toHaveLength(1);
  expect(await line.getAttribute("d")).toContain("L");
  await expect(chart.locator("circle")).toHaveCount(0);
  return chart;
}

async function alignedFacts(scope) {
  const boxes = await facts(scope).locator(":scope > div").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    const value = element.querySelector("dd > span").getBoundingClientRect();
    return { left: box.left, right: box.right, valueTop: value.top, valueRight: value.right };
  }));
  expect(boxes).toHaveLength(3);
  boxes.forEach((box, index) => {
    expect(Math.abs(box.valueTop - boxes[0].valueTop)).toBeLessThan(1);
    expect(box.valueRight).toBeLessThanOrEqual(box.right + 1);
    if (index) expect(box.left).toBeGreaterThan(boxes[index - 1].right);
  });
}

for (const width of [320, 1440]) {
  test(`session-context preview is fictional, compact and accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/designsystem/sessions");
    await expect(page.getByRole("heading", { name: "Nyheter & bolagets handelsdag", exact: true })).toBeVisible();
    await expect(page.getByText("Fiktiv förhandsvisning · ingen livedata")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(5);
    await expect(page.locator("article").getByText("+99,0 %", { exact: true })).toHaveCount(0);
    await expect(badge(page.locator("article").first(), "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const trigger = page.getByRole("button", { name: story("premarket").headline, exact: true });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => document.documentElement.classList.toggle("dark", value === "dark"), theme);
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(badge(reaction(dialog), "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
      await expect(fact(dialog, "Aktien idag")).toContainText("Mot föregående stängning");
      await expect(fact(dialog, "RVOL vid samma tid")).toContainText("2×");
      await expect(fact(dialog, "RVOL mot heldag")).toContainText("2×");
      await continuousStockChart(reaction(dialog));
      await expect(stockChart(dialog).getByText("Nyhet före öppning", { exact: true })).toBeVisible();
      await alignedFacts(dialog);
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(accessibility.violations.filter(item => ["critical", "serious"].includes(item.impact))).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`session-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });
}

test("premarket story has its full stock-price chart even without an exact news baseline", async ({ page }) => {
  await page.goto("/nyhet/session-preview-premarket");
  const section = reaction(page);
  await expect(badge(section, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
  await expect(facts(section).getByText("Saknas", { exact: true })).toHaveCount(0);
  await continuousStockChart(section);
  await expect(stockChart(section)).toContainText("Tickdata");
  await expect(stockChart(section).getByText("Nyhet före öppning", { exact: true })).toBeVisible();
  await expect(stockChart(section).locator('line[stroke-dasharray]')).toHaveCount(0);
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  const trading = section.locator('dl[aria-label="Dagens handel"]');
  await expect(trading.locator(":scope > div").filter({ hasText: "Senaste kurs" })).toContainText("11 SEK");
  await expect(trading.locator(":scope > div").filter({ hasText: "Föregående stängning" })).toContainText("10 SEK");
  await expect(trading).toContainText("2026-09-08");
  await expect(trading).toContainText(/500\s000 aktier/);
  await expect(section.getByText("Kurs före nyheten saknas.", { exact: true })).toBeVisible();
  await expect(section.getByText(/Det är bolagets handel, inte volym orsakad av nyheten/)).toBeVisible();
  await expect(stockChart(section)).toBeVisible();
  await expect(section.getByRole("img", { name: /Observerad kursförändring/ })).toHaveCount(0);
});

test("intraday exact reaction stays separate from its continuous full-session stock chart", async ({ page }) => {
  await page.goto("/nyhet/session-preview-during");
  const section = reaction(page);
  await expect(badge(section, "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await expect(fact(section, "Kursreaktion")).toContainText("1 tim");
  await expect(facts(section).getByText("+10,0 %", { exact: true })).toHaveCount(0);
  await expect(fact(section, "RVOL vid samma tid")).toContainText("2×");
  await continuousStockChart(section);
  await expect(stockChart(section)).toContainText("Aktiekurs · 9 sep.");
  await expect(stockChart(section)).toContainText("Tickdata");
  await expect(stockChart(section).getByText("Nyhet · 10:00", { exact: true })).toBeVisible();
  await expect(stockChart(section).locator('line[stroke-dasharray]')).toHaveCount(1);
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(section.getByText("Idag mot föregående stängning", { exact: true })).toBeVisible();
  await expect(section.getByText("+10,0 %", { exact: true })).toBeVisible();
  await expect(section.getByText("Volym / normalt · Första 30 min", { exact: true })).toBeVisible();
  await expect(section.getByText("2,4×", { exact: true })).toBeVisible();
});

test("missing price data leaves valid cumulative volume and RVOL visible", async ({ page }) => {
  await page.goto("/nyhet/session-preview-volume-only");
  const section = reaction(page);
  await expect(fact(section, "Kursreaktion")).toContainText("Saknas");
  await expect(fact(section, "RVOL vid samma tid")).toContainText("1,8×");
  await expect(fact(section, "RVOL mot heldag")).toContainText("1,8×");
  await expect(section.getByRole("img")).toHaveCount(0);
  await expect(section.locator('[aria-label*="0,0 %"]')).toHaveCount(0);
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(section.locator('dl[aria-label="Dagens handel"]')).toContainText(/450\s000 aktier/);
  await expect(section.getByRole("button", { name: "Uppdatera data", exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Uppdatera data", exact: true }).click();
  await expect(fact(section, "RVOL vid samma tid")).toContainText("1,8×");
  await expect(fact(section, "Kursreaktion")).not.toContainText("1 min");
});

test("company switching changes daily prices, both RVOL methods and quote details together", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/nyhet/session-preview-multi");
  const section = reaction(page);
  const companies = section.getByRole("group", { name: "Bolag i nyheten" });
  await expect(badge(section, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
  await continuousStockChart(section);
  const firstChart = await stockChart(section).locator('path[fill="none"]').getAttribute("d");
  const second = companies.getByRole("button", { name: "Skärgården Teknik", exact: true });
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(badge(section, "Idag · mot föregående stängning: −5,0 %")).toBeVisible();
  await expect(fact(section, "RVOL vid samma tid")).toContainText("0,5×");
  await expect(fact(section, "RVOL mot heldag")).toContainText("0,5×");
  await alignedFacts(section);
  expect(await companies.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  for (const button of await companies.getByRole("button").all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(section.locator('dl[aria-label="Dagens handel"]')).toContainText("9,5 SEK");
  await expect(section.locator('dl[aria-label="Dagens handel"]')).toContainText(/125\s000 aktier/);
  await continuousStockChart(section);
  await expect(stockChart(section).locator('path[fill="none"]')).not.toHaveAttribute("d", firstChart);
  await companies.getByRole("button", { name: "Norden Industri", exact: true }).click();
  await expect(badge(section, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
  await expect(fact(section, "RVOL vid samma tid")).toContainText("2×");
  await expect(section.locator('dl[aria-label="Dagens handel"]')).toContainText("11 SEK");
  await expect(stockChart(section).locator('path[fill="none"]')).toHaveAttribute("d", firstChart);
});

test("today's context does not relabel an older story's measured outcome", async ({ page }) => {
  await page.goto("/nyhet/session-preview-older");
  const section = reaction(page);
  await expect(badge(section, "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await expect(facts(section).getByText("Aktien idag", { exact: true })).toHaveCount(0);
  await expect(facts(section).getByText("+10,0 %", { exact: true })).toHaveCount(0);
  await expect(fact(section, "RVOL vid samma tid")).toContainText("Idag");
  await continuousStockChart(section);
  await expect(stockChart(section)).toContainText("Aktiekurs · 1 sep.");
  await expect(stockChart(section)).toContainText("1 min");
  await expect(stockChart(section)).not.toContainText("Tickdata");
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(section.getByText("Handelsdagen ovan är senare än nyhetens första börssession.", { exact: true })).toBeVisible();
  await expect(section.getByText("Idag mot föregående stängning", { exact: true })).toBeVisible();
});

test("expired daily context is not carried into the next session", async ({ page }) => {
  await page.goto("/designsystem/sessions");
  await page.clock.setFixedTime(new Date("2026-09-10T07:00:00Z"));
  await page.getByRole("button", { name: story("premarket").headline, exact: true }).click();
  const section = reaction(page.getByRole("dialog"));
  await expect(section.locator('[aria-label*="+10,0 %"]')).toHaveCount(0);
  await expect(facts(section).getByText("2×", { exact: true })).toHaveCount(0);
  // An independently dated historical price chart remains valid after the live
  // company-context capsule expires. It never becomes today's quote.
  await continuousStockChart(section);
  await expect(stockChart(section)).toContainText("Aktiekurs · 9 sep.");
});

test("company-session share images support a daily quote, continuous stock chart and volume-only story", async ({ request }, testInfo) => {
  for (const scenario of ["premarket", "during", "volume-only"]) {
    const response = await request.get(`/nyhet/session-preview-${scenario}/opengraph-image`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
    await writeFile(testInfo.outputPath(`session-${scenario}-og.png`), body);
  }
});

test("a delayed chart response cannot replace the newly selected company's curve", async ({ page }) => {
  let releaseSecond;
  const secondGate = new Promise(resolve => { releaseSecond = resolve; });
  let secondStarted = false;
  let secondSettled = false;
  await page.route(/\/api\/feed\/news\/session-preview-multi\/chart(?:\?|$)/, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` });
    const data = await response.json();
    if (url.searchParams.get("symbol") === "SKAR.TEST") {
      secondStarted = true;
      await secondGate;
      // The old company's browser request is intentionally aborted on switch.
      await route.fulfill({ json: data }).catch(() => {});
      secondSettled = true;
      return;
    }
    await route.fulfill({ json: data });
  });
  try {
    await page.goto("/nyhet/session-preview-multi");
    const section = reaction(page);
    await continuousStockChart(section);
    const firstPath = await stockChart(section).locator('path[fill="none"]').getAttribute("d");
    const companies = section.getByRole("group", { name: "Bolag i nyheten" });
    await companies.getByRole("button", { name: "Skärgården Teknik", exact: true }).click();
    await expect.poll(() => secondStarted).toBe(true);
    await expect(badge(section, "Idag · mot föregående stängning: −5,0 %")).toBeVisible();
    await expect(stockChart(section)).toHaveCount(0);
    await companies.getByRole("button", { name: "Norden Industri", exact: true }).click();
    await expect(badge(section, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
    await expect(stockChart(section).locator('path[fill="none"]')).toHaveAttribute("d", firstPath);
    releaseSecond();
    await expect.poll(() => secondSettled).toBe(true);
    await expect(stockChart(section).locator('path[fill="none"]')).toHaveAttribute("d", firstPath);
    await expect(badge(section, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
  } finally {
    releaseSecond();
  }
});

test("feed rows do not fetch stock charts before the reader opens", async ({ page }) => {
  const chartRequests = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (/\/api\/feed\/news\/[^/]+\/chart$/.test(url.pathname)) chartRequests.push(url);
  });
  const selected = [story("premarket"), story("during")];
  await page.route(/\/api\/feed\/news\?/, route => route.fulfill({
    json: { items: selected, nextCursor: null, serverFilters: true },
  }));
  await page.goto("/marknaden/nyheter");
  const row = page.locator("article").filter({ has: page.locator('a[href="/nyhet/session-preview-premarket"]') });
  await expect(badge(row, "Idag · mot föregående stängning: +10,0 %")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(chartRequests).toHaveLength(0);
  await row.locator('a[href="/nyhet/session-preview-premarket"]').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await continuousStockChart(reaction(dialog));
  expect(chartRequests.some(url => url.pathname === "/api/feed/news/session-preview-premarket/chart"
    && url.searchParams.get("symbol") === "LITEN.TEST")).toBe(true);
  expect(chartRequests.some(url => url.pathname === "/api/feed/news/session-preview-during/chart")).toBe(false);
});
