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
    news: items, moverNews: [], dataAsOf: Date.now(), breadth: { rising: 306, falling: 462 },
    benchmarks: ["omxspi", "omxs30", "sp500"].map(id => ({ id, session: {
      date: "2026-09-15", changePct: 0.5, points: [[1, 100], [2, 101], [3, 100.5]],
    } })),
    commodities: [{ id: "brent", price: 105.25, changePct: 2.4, asOf: Date.now(),
      session: { points: [[1, 104], [2, 105.5], [3, 105.25]], asOf: Date.now() } }],
  } }));
  await page.route("**/api/feed/news?**", route => route.fulfill({ json: { items } }));
  await page.goto("/marknaden");
  const latest = page.locator("#senaste-nytt");
  await expect(latest.getByText("Testnyhet swedish", { exact: false })).toBeVisible();
  await expect(page.getByText("Testnyhet foreign", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Brentolja", { exact: true })).toContainText("105,25");
  await expect(page.getByLabel("Brentolja", { exact: true })).toContainText("USD/fat");
  await expect(page.getByText("Stockholmsbörsen", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/306 stiger|Kurser per/)).toHaveCount(0);
  const strip = page.getByRole("region", { name: "Marknadsläge" });
  await expect(strip.locator("svg")).toHaveCount(4);
  if (width === 1280) {
    await expect(page.getByRole("img", { name: /Brentolja, kursförlopp/ })).toBeVisible();
    const boxes = await strip.locator(":scope > div").evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(); return { y: r.y, height: r.height };
    }));
    expect(new Set(boxes.map(box => `${box.y}:${box.height}`)).size).toBe(1);
  }
  await page.waitForFunction(() => Boolean(window.testNewsStream));
  await page.evaluate(story => window.testNewsStream.dispatchEvent(new MessageEvent("story", {
    data: JSON.stringify(story),
  })), story("foreign-stream", "XHEL.TEST"));
  await expect(latest.getByText("Testnyhet foreign-stream", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await strip.screenshot({ path: `/private/tmp/market-strip-${width}.png` });
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
