import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__quoteStreams = [];
    window.EventSource = class extends EventTarget {
      constructor(url) { super(); window.__quoteStreams.push(String(url)); }
      close() {}
    };
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.abort();
  });
});

for (const width of [390, 1440]) test(`Nordic prices use the common chart, currency and attribution at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 950 });
  await page.clock.install();
  const errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().includes("/company/NORDIC.TEST/intraday")) requests.push(request.url()); });
  await page.goto("/aktie/NORDIC.TEST?range=1d");
  await expect(page.locator("#overview").getByText("125,1 NOK", { exact: true })).toBeVisible();
  await expect(page.locator("#overview").getByRole("link", { name: "Yahoo Finance" })).toBeVisible();
  await expect(page.locator("#overview").getByText(/Kan vara fördröjd/)).toBeVisible();
  await expect(page.locator(".company-chart-loading")).toHaveAttribute("aria-hidden", "true");
  expect(await page.evaluate(() => window.__quoteStreams.filter(url => url.includes("/company/")))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.clock.fastForward(301_000);
  await expect.poll(() => requests.length).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`nordic-${width}.png`) });
});

test("empty Nordic chart ends loading; Swedish stock still opens a quote stream", async ({ page }) => {
  await page.goto("/aktie/NORDIC-EMPTY.TEST?range=1d");
  await expect(page.getByText("Kursdata saknas för perioden.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__quoteStreams.filter(url => url.includes("/company/")))).toEqual([]);
  await page.goto("/aktie/OG-INTRA.TEST?range=1d");
  await expect.poll(() => page.evaluate(() => window.__quoteStreams.filter(url => url.includes("/company/OG-INTRA.TEST/stream")).length)).toBe(1);
});
