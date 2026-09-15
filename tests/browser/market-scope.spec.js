import { test, expect } from "@playwright/test";

for (const width of [390, 1280]) test(`Swedish overview and Brent at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const story = (id, symbol) => ({ id, headline: `Testnyhet ${id}`, publishedAt: new Date().toISOString(),
    status: "flash", importance: 95, tags: ["EARNINGS"], companies: [{ symbol, name: id }],
    primarySource: { name: "mfn" } });
  const items = [story("swedish", "VOLV-B.ST"), story("foreign", "XCSE.DSV")];
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      constructor() { super(); window.testNewsStream = this; }
      close() {}
    };
  });
  await page.route("**/api/user", route => route.fulfill({ json: {
    email: "reader@example.test", verified: true, plan: "plus", watchlist: [],
  } }));
  await page.route("**/api/feed/market-overview", route => route.fulfill({ json: {
    news: items, moverNews: [], commodities: [{ id: "brent", price: 105.25, changePct: 2.4, asOf: Date.now() }],
  } }));
  await page.route("**/api/feed/news?**", route => route.fulfill({ json: { items } }));
  await page.goto("/marknaden");
  const latest = page.locator("#senaste-nytt");
  await expect(latest.getByText("Testnyhet swedish", { exact: false })).toBeVisible();
  await expect(page.getByText("Testnyhet foreign", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Brentolja", { exact: true })).toContainText("105,25");
  await expect(page.getByLabel("Brentolja", { exact: true })).toContainText("USD/fat");
  await page.waitForFunction(() => Boolean(window.testNewsStream));
  await page.evaluate(story => window.testNewsStream.dispatchEvent(new MessageEvent("story", {
    data: JSON.stringify(story),
  })), story("foreign-stream", "XHEL.TEST"));
  await expect(latest.getByText("Testnyhet foreign-stream", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `/private/tmp/market-scope-${width}.png`, fullPage: true });
  await page.goto("/marknaden/nyheter");
  await expect(page.getByText("Testnyhet foreign", { exact: false })).toBeVisible();
});

test("unavailable oil stays missing instead of zero", async ({ page }) => {
  await page.route("**/api/feed/market-overview", route => route.fulfill({ json: { news: [], commodities: [] } }));
  await page.goto("/marknaden");
  const oil = page.getByLabel("Brentolja", { exact: true });
  await expect(oil).toContainText("Kursdata saknas");
  await expect(oil).not.toContainText("0,00");
});
