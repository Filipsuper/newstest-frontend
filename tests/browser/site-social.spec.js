import { test, expect } from "@playwright/test";
import { SITE_ICONS, SITE_OG_IMAGE } from "../../app/utils/brand";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

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

test("public metadata uses a crisp yellow-circle favicon and matching PNG/touch icons", async ({ page, request }, testInfo) => {
  await page.goto("/marknaden");
  const links = await page.locator('link[rel="icon"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  for (const icon of SITE_ICONS.icon) expect(links).toContain(icon.url);
  expect(links).not.toContain("/favicon-32x32.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", SITE_ICONS.apple[0].url);
  const svg = await request.get(SITE_ICONS.icon[1].url);
  expect(svg.status()).toBe(200);
  expect(await svg.text()).toContain('<circle cx="16" cy="16" r="13" fill="#ebc467"');
  for (const [url, size] of [[SITE_ICONS.icon[0].url, 32], [SITE_ICONS.apple[0].url, 180]]) {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const bytes = await response.body();
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(size);
    expect(info.height).toBe(size);
    expect([...data.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
    const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4;
    expect([...data.subarray(center, center + 4)]).toEqual([235, 196, 103, 255]);
    await testInfo.attach(`circle-${size}.png`, { body: bytes, contentType: "image/png" });
  }
  // Inspect the actual served artwork at tab and touch sizes on both browser themes.
  const origin = new URL(page.url()).origin;
  const samples = [[SITE_ICONS.icon[1].url, 16], [SITE_ICONS.icon[0].url, 32], [SITE_ICONS.apple[0].url, 180]];
  await page.setViewportSize({ width: 640, height: 260 });
  await page.setContent(`<body style="margin:0;display:flex">${["#ffffff", "#181914"].map((background) => `
    <section style="display:flex;align-items:center;justify-content:center;gap:20px;width:320px;height:260px;background:${background}">
      ${samples.map(([url, size]) => `<img alt="Circle ${size}px" src="${origin}${url}" width="${size}" height="${size}">`).join("")}
    </section>`).join("")}</body>`);
  await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
  await page.screenshot({ path: testInfo.outputPath("circle-icons-light-dark.png") });
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
