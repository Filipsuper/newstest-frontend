import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { CONTENT_OG_VERSION } from "../../app/utils/brand";

test("crawler images are versioned without changing canonical story or company URLs", async ({
  request,
}) => {
  for (const [path, imagePath] of [
    ["/nyhet/fixture-0", "/nyhet/fixture-0/opengraph-image"],
    ["/aktie/NORD.TEST?range=6m&ma=50%2C200", "/og/aktie"],
  ]) {
    const response = await request.get(path, {
      headers: { "user-agent": "Twitterbot/1.0" },
    });
    expect(response.status()).toBe(200);
    const html = await response.text();
    const image = new URL(
      html
        .match(/property="og:image" content="([^"]+)"/)[1]
        .replaceAll("&amp;", "&"),
    );
    expect(image.pathname).toBe(imagePath);
    expect(image.searchParams.get("v")).toBe(CONTENT_OG_VERSION);
    if (imagePath === "/og/aktie") {
      expect(image.searchParams.get("range")).toBe("6m");
      expect(image.searchParams.get("ma")).toBe("50,200");
    }
    const canonical = new URL(
      html.match(/rel="canonical" href="([^"]+)"/)[1].replaceAll("&amp;", "&"),
    );
    expect(canonical.pathname).toBe(path.split("?")[0]);
    expect(canonical.search).toBe("");
  }
});

async function renderCard(
  { page, request },
  testInfo,
  url,
  name,
  background,
  badge,
) {
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const body = await response.body();
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
  await writeFile(testInfo.outputPath(`${name}.png`), body);
  await testInfo.attach(name, { body, contentType: "image/png" });
  await page.setContent(
    `<img src="data:image/png;base64,${body.toString("base64")}" style="width:600px;height:315px" alt="Share preview" />`,
  );
  const pixels = await page.locator("img").evaluate(async (img) => {
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, 1200, 630).data;
    const counts = {};
    let chartAmber = 0;
    for (let i = 0; i < data.length; i += 4) {
      const key = [data[i], data[i + 1], data[i + 2]].join(",");
      counts[key] = (counts[key] || 0) + 1;
      const y = Math.floor(i / 4 / 1200);
      if (y >= 270 && y < 530 && key === "235,196,103") chartAmber += 1;
    }
    return { corner: [...data.slice(0, 3)].join(","), counts, chartAmber };
  });
  expect(pixels.corner).toBe(background);
  if (badge) expect(pixels.counts[badge] || 0).toBeGreaterThan(500);
  if (background === "23,25,22" && badge)
    expect(pixels.chartAmber).toBeGreaterThan(100);
  // News is on one warm canvas; no old dark data box or empty chart panel.
  if (background === "246,245,241")
    expect(pixels.counts["34,37,31"] || 0).toBe(0);
  await page
    .locator("img")
    .screenshot({ path: testInfo.outputPath(`${name}-thumbnail.png`) });
  return body;
}

test("news share layouts handle positive, negative, absent charts and long headlines", async ({
  page,
  request,
}, testInfo) => {
  const tools = { page, request };
  for (const [id, badge] of [
    ["fixture-0", "227,241,232"],
    ["fixture-1", "250,233,229"],
    ["missing-data"],
    ["no-chart", "227,241,232"],
    ["zero-change", "238,237,232"],
    ["chart-only"],
    ["long-title", "250,233,229"],
    ["long-title-no-chart", "250,233,229"],
  ]) {
    await renderCard(
      tools,
      testInfo,
      `/nyhet/${id}/opengraph-image`,
      id,
      "246,245,241",
      badge,
    );
  }
  expect(
    (await tools.request.get("/nyhet/unavailable/opengraph-image")).status(),
  ).toBe(503);
  expect(
    (await tools.request.get("/nyhet/not-real/opengraph-image")).status(),
  ).toBe(404);
});

test("chart shares keep period, moving averages, intraday and honest missing-data variants", async ({
  page,
  request,
}, testInfo) => {
  const tools = { page, request };
  for (const [name, query, badge] of [
    ["year", "symbol=NORD.TEST&range=1y", "37,56,44"],
    ["negative", "symbol=OG-DOWN.TEST&range=6m", "62,43,39"],
    ["flat", "symbol=OG-FLAT.TEST&range=1y", "43,46,39"],
    ["averages", "symbol=NORD.TEST&range=1y&ma=50,200", "37,56,44"],
    ["penny", "symbol=OG-PENNY.TEST&range=1y", "37,56,44"],
    ["long-company", "symbol=OG-LONG.TEST&range=5y", "37,56,44"],
    ["intraday", "symbol=OG-INTRA.TEST&range=1d", "37,56,44"],
    ["no-history", "symbol=FJALL.TEST&range=1y"],
    ["unavailable-company", "symbol=UNAVAILABLE.TEST&range=1y"],
  ]) {
    await renderCard(
      tools,
      testInfo,
      `/og/aktie?${query}`,
      name,
      "23,25,22",
      badge,
    );
  }
});
