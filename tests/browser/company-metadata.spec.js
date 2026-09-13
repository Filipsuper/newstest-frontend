import { test, expect } from "@playwright/test";

// Inspect the HTTP response, not the browser DOM: hydration moves streamed
// metadata into the head and would conceal the HTML-only crawler regression.
for (const userAgent of ["Mozilla/5.0", "Twitterbot/1.0"]) {
  test(`company metadata is in the initial head for ${userAgent}`, async ({ request }) => {
    for (const [symbol, name, ticker] of [
      ["NORD.TEST", "Norden Industri", "NORD"],
      ["SKAR.TEST", "Skärgården Teknik", "SKAR"],
    ]) {
      const response = await request.get(`/aktie/${symbol}?range=6m&ma=50`, {
        headers: { "user-agent": userAgent },
      });
      expect(response.status()).toBe(200);
      const html = await response.text();
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
      const title = `${name} – nyheter, aktiekurs och rapporter`;
      const description = `Nyheter om ${name} (${ticker}), aktiekurs och kursreaktioner. Se vad som händer i bolaget och följ rapporter och kommande händelser på OMXsum.`;
      expect(head.match(/<title>[^<]*<\/title>/g)).toEqual([
        `<title>${title} | OMXsum</title>`,
      ]);
      expect(head).toContain(`property="og:title" content="${title}"`);
      expect(head).toContain(`name="twitter:title" content="${title}"`);
      expect(head).toContain(`name="description" content="${description}"`);
      expect(head).toContain(`property="og:description" content="${description}"`);
      expect(head).toContain(`name="twitter:description" content="${description}"`);
      expect(head).toContain(`rel="canonical" href="https://omxsum.com/aktie/${symbol}"`);
      expect(head).not.toContain("noindex");
      const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((match) => JSON.parse(match[1]))
        .find((item) => item["@graph"]?.some((entity) => entity["@type"] === "Corporation"))?.["@graph"] ?? [];
      expect(graph.find((entity) => entity["@type"] === "WebPage")).toMatchObject({ name: title, description });
      expect(graph.find((entity) => entity["@type"] === "Corporation")).toMatchObject({ name, tickerSymbol: ticker });
    }
  });
}

test("unknown companies retain a title and noindex in the initial head", async ({ request }) => {
  const response = await request.get("/aktie/MISSING.TEST", {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  expect(head).toContain("<title>MISSING.TEST – nyheter, aktiekurs och rapporter | OMXsum</title>");
  expect(head).toContain('name="robots" content="noindex, nofollow"');
});

test("company news remains available for snippets while quote and chart controls are excluded", async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto("/aktie/NORD.TEST");
  await expect(page.getByRole("heading", { level: 1, name: "Norden Industri", exact: true })).toBeVisible();
  const intro = page.getByText("Följ nyheter om Norden Industri, aktiens kursreaktioner och kommande rapporter.", { exact: true });
  await expect(intro).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nyheter om Norden Industri", exact: true })).toBeVisible();
  expect(await intro.evaluate((element) => Boolean(element.closest("[data-nosnippet]")))).toBe(false);
  expect(await page.locator("#news").evaluate((element) => Boolean(element.closest("[data-nosnippet]")))).toBe(false);
  const quoteTime = page.locator("#overview").getByText(/^Kursuppdatering/);
  await expect(quoteTime).toHaveAttribute("data-nosnippet", "");
  for (const locator of [page.getByRole("group", { name: "Kursperiod", exact: true }), page.locator(".company-chart")]) {
    expect(await locator.evaluate((element) => Boolean(element.closest("[data-nosnippet]")))).toBe(true);
  }
});
