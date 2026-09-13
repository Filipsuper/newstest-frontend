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
      const title = `${name} aktie (${ticker}) – kurs, nyheter och rapporter`;
      expect(head.match(/<title>[^<]*<\/title>/g)).toEqual([
        `<title>${title} | OMXsum</title>`,
      ]);
      expect(head).toContain(`property="og:title" content="${title}"`);
      expect(head).toContain(`name="twitter:title" content="${title}"`);
      expect(head).toContain(`rel="canonical" href="https://omxsum.com/aktie/${symbol}"`);
      expect(head).not.toContain("noindex");
    }
  });
}

test("unknown companies retain a title and noindex in the initial head", async ({ request }) => {
  const response = await request.get("/aktie/MISSING.TEST", {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  expect(head).toContain("<title>MISSING.TEST aktie (MISSING.TEST) – kurs, nyheter och rapporter | OMXsum</title>");
  expect(head).toContain('name="robots" content="noindex, nofollow"');
});
