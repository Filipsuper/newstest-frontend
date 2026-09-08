import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

for (const width of [320, 1440]) {
  test(`volume context and equal-window comparison stay distinct and fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marknaden");
    const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
    await expect(featured.getByText(/Volym 3,4× kl\./)).toHaveCount(1);
    await featured.locator('a[href="/nyhet/fixture-0"]').click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Handelsvolym", { exact: true }).click();
    await expect(dialog.getByText("RVOL · mot normal heldag", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1,8×", { exact: true })).toBeVisible();
    await expect(dialog.getByText("RVOL vid denna tid", { exact: true })).toBeVisible();
    await expect(dialog.getByText("3,4×", { exact: true })).toBeVisible();
    await expect(dialog.getByText("30 hela minuter efter", { exact: true })).toBeVisible();
    await expect(dialog.getByText("3×", { exact: true })).toBeVisible();
    await expect(dialog).toContainText("inte hur mycket handel nyheten orsakade");
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
      await dialog.getByText("Handelsvolym", { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`volume-${width}-${theme}.png`) });
    }
    await dialog.getByRole("button", { name: "Uppdatera data" }).click();
    await expect(dialog.getByRole("button", { name: "Uppdatera data" })).toBeEnabled();
    await expect(dialog.getByText("Handelsvolym", { exact: true })).toBeVisible();
  });
}

test("provisional RVOL and unavailable before/after data are labelled without invented zero", async ({ page }) => {
  await page.goto("/nyhet/fixture-1");
  await page.getByText("Handelsvolym", { exact: true }).click();
  await expect(page.getByText("3,4× · preliminärt", { exact: true })).toBeVisible();
  await expect(page.getByText("Minutdata saknas för delar av jämförelseperioden.")).toBeVisible();
  await expect(page.getByText("Efter / före", { exact: true })).toHaveCount(0);
});

test("quote-only refresh updates visible observations without a new-news banner", async ({ page, request }) => {
  const snapshot = await (await request.get("http://127.0.0.1:8100/api/feed/market-overview")).json();
  await page.clock.install();
  await page.goto("/marknaden");
  const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
  await expect(featured.locator("article")).toHaveCount(3);
  await page.route("**/api/feed/market-overview", route => route.fulfill({ json: {
    ...snapshot, news: snapshot.news.map((story, i) => i ? story : {
      ...story, reaction: { ...story.reaction, pct: 7.5 }, marketContext: { ...story.marketContext, rvolAtTime: 4.5 },
    }),
  } }));
  await page.clock.runFor(31000);
  await expect(featured.getByText(/Volym 4,5× kl\./)).toBeVisible();
  await expect(featured.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
});

test("ranking-only changes wait behind a selection action, not a new-news count", async ({ page, request }) => {
  const snapshot = await (await request.get("http://127.0.0.1:8100/api/feed/market-overview")).json();
  await page.clock.install();
  await page.goto("/marknaden");
  const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
  await expect(featured.locator("article").first()).toContainText("Höjer prognosen");
  const replacement = featured.locator('a[href="/nyhet/fixture-10"]');
  await expect(replacement).toHaveCount(0);
  await page.route("**/api/feed/market-overview", route => route.fulfill({ json: {
    ...snapshot, news: snapshot.news.map((story, i) => i === 10 ? { ...story, importance: 100 } : story),
  } }));
  await page.clock.runFor(31000);
  await expect(featured.getByRole("button", { name: "Uppdatera urval" })).toBeVisible();
  await expect(featured.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  await expect(featured.locator("article").first()).toContainText("Höjer prognosen");
  await expect(replacement).toHaveCount(0);
  await featured.getByRole("button", { name: "Uppdatera urval" }).click();
  // Selection acceptance must not depend on which editorial policy ranks it first.
  await expect(replacement).toBeVisible();
  await expect(featured.getByRole("button", { name: "Uppdatera urval" })).toHaveCount(0);
});
