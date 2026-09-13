import { test, expect } from "@playwright/test";

const canonicalPath = "/nyhet/hojer-prognosen-efter-stark-orderingang~fixture-0";

test("legacy and stale news URLs permanently redirect to a single headline URL", async ({ request }) => {
  for (const path of ["/nyhet/fixture-0", "/nyhet/gammal-rubrik~fixture-0"]) {
    const redirect = await request.get(path, { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(new URL(redirect.headers().location, redirect.url()).pathname).toBe(canonicalPath);
  }
  const response = await request.get(canonicalPath, { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain(`rel="canonical" href="https://omxsum.com${canonicalPath}"`);
  expect(html).toContain(`property="og:url" content="https://omxsum.com${canonicalPath}"`);
  expect(html).toContain("Höjer prognosen efter stark orderingång");
  for (const path of ["/nyhet/bad~id~extra", "/nyhet/old-headline~not-real"])
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
});

test("canonical news URLs also serve their sharing image", async ({ request }) => {
  const response = await request.get(`${canonicalPath}/opengraph-image`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test("copying and native sharing use the same headline URL as the reader", async ({ page }) => {
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget { close() {} };
    window.sharedNews = [];
    window.copiedNews = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: async data => window.sharedNews.push(data) });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => window.copiedNews.push(value) } });
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto(canonicalPath);
  await page.getByRole("button", { name: "Kopiera länk", exact: true }).click();
  expect(await page.evaluate(() => window.copiedNews)).toEqual([`https://omxsum.com${canonicalPath}`]);
  await page.getByRole("button", { name: "Dela nyheten", exact: true }).click();
  expect(await page.evaluate(() => window.sharedNews)).toEqual([{
    title: "Höjer prognosen efter stark orderingång", url: `https://omxsum.com${canonicalPath}`,
  }]);
});
