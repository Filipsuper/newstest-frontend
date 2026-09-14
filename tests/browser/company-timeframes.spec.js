import { test, expect } from "@playwright/test";

test.setTimeout(60000);

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

for (const width of [320, 390, 1440]) test(`short periods stay usable and match their data at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 950 });
  const errors = [], requests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (r.url().includes("/company/NORDIC.TEST/intraday")) requests.push(r.url()); });
  await page.goto("/aktie/NORDIC.TEST?range=2d");
  const controls = page.getByRole("group", { name: "Kursperiod", exact: true });
  await expect(controls.getByRole("button", { name: "2 dagar", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".company-chart-loading")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".company-chart .recharts-bar-rectangle")).toHaveCount(36);
  expect(await controls.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width < 700) {
    const boxes = await controls.getByRole("button").evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
    }));
    expect(boxes.every(box => box.h >= 44 && box.w >= 44)).toBe(true);
    expect(new Set(boxes.map(box => Math.round(box.y))).size).toBe(2);
  }
  await page.screenshot({ path: testInfo.outputPath(`timeframes-${width}.png`) });
  const requestsBeforeSwitch = requests.length;
  await controls.getByRole("button", { name: "1 dag", exact: true }).click();
  await expect(page.locator(".company-chart .recharts-bar-rectangle")).toHaveCount(12);
  expect(requests.length).toBe(requestsBeforeSwitch); // allow Strict Mode's initial replay, but no range-switch refetch
  for (const [label, range, points] of [["1 vecka", "1w", 5], ["1 mån", "1m", 22]]) {
    await controls.getByRole("button", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`range=${range}$`));
    await expect(page.locator(".company-chart .recharts-bar-rectangle")).toHaveCount(points);
    await expect(page.getByRole("button", { name: "Jämför med OMXSPI", exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(controls.getByRole("button", { name: "1 mån", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#overview").getByRole("link", { name: "Yahoo Finance" })).toBeVisible();
  expect(await page.evaluate(() => window.__quoteStreams)).toEqual([]);
  expect(errors).toEqual([]);
});

test("two-day Swedish view shares one existing stream; sparse two-day data stays explicit", async ({ page }) => {
  await page.goto("/aktie/OG-INTRA.TEST?range=1d");
  await expect.poll(() => page.evaluate(() => window.__quoteStreams.length)).toBe(1);
  await page.getByRole("button", { name: "2 dagar", exact: true }).click();
  await expect(page.locator(".company-chart .recharts-bar-rectangle")).toHaveCount(60);
  expect(await page.evaluate(() => window.__quoteStreams.length)).toBe(1);
  await page.goto("/aktie/NORDIC-EMPTY.TEST?range=2d");
  await expect(page.getByText("Kursdata saknas för perioden.", { exact: true })).toBeVisible();
  await expect(page.getByText("Föregående handelsdag saknas.", { exact: true })).toBeVisible();
});

test("short-period metadata and rendered share cards preserve the selected range", async ({ request, page }, testInfo) => {
  for (const range of ["2d", "1w", "1m"]) {
    const response = await request.get(`/aktie/NORDIC.TEST?range=${range}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const image = new URL(html.match(/property="og:image" content="([^"]+)"/)[1].replaceAll("&amp;", "&"));
    expect(image.searchParams.get("range")).toBe(range);
    const png = await request.get(image.pathname + image.search);
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toContain("image/png");
    const body = await png.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
    await page.setContent(`<img src="data:image/png;base64,${body.toString("base64")}" width="600" height="315" alt="Period preview" />`);
    await page.locator("img").screenshot({ path: testInfo.outputPath(`${range}-share.png`) });
  }
});
