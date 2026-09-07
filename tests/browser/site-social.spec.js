import { test, expect } from "@playwright/test";
import { SITE_OG_IMAGE } from "../../app/utils/brand";

const imageUrl = new URL(SITE_OG_IMAGE.url, "https://omxsum.com").href;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
        }),
      });
    if (["127.0.0.1", "localhost"].includes(url.hostname))
      return route.continue();
    return route.abort();
  });
});

test("public pages share the versioned site artwork in Open Graph and Twitter", async ({
  page,
}) => {
  for (const path of ["/", "/marknaden", "/aktier", "/nyhetsbrev", "/om-oss"]) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      imageUrl,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      imageUrl,
    );
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      SITE_OG_IMAGE.alt,
    );
  }
});

test("the generic artwork does not replace story, company or editorial previews", async ({
  page,
}) => {
  for (const [path, expected] of [
    ["/nyhet/fixture-0", /\/nyhet\/fixture-0\/opengraph-image/],
    ["/aktie/NORD.TEST", /\/og\/aktie\?symbol=NORD.TEST/],
    ["/article/fixture-letter", /\/article\/fixture-letter\/opengraph-image/],
  ]) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      expected,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      expected,
    );
  }
});

test("crawlers receive metadata without JavaScript and the versioned URL serves a PNG", async ({
  request,
}) => {
  for (const agent of ["facebookexternalhit/1.1", "Twitterbot/1.0"]) {
    const response = await request.get("/", {
      headers: { "user-agent": agent },
    });
    expect(response.status()).toBe(200);
    const head = (await response.text()).split("</head>")[0];
    expect(head).toContain(`property="og:image" content="${imageUrl}"`);
    expect(head).toContain(`name="twitter:image" content="${imageUrl}"`);
  }
  const response = await request.get(SITE_OG_IMAGE.url);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
