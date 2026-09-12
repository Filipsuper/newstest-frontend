import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const LETTER_TITLE = "Fiktivt morgonbrev: rapporter och räntor i fokus";
const LETTER_POINTS = [
  "Norden Industri höjer sin helårsprognos.",
  "Styrräntan lämnas oförändrad.",
];

async function setup(page, request, { guest = false, title = LETTER_TITLE, empty = false } = {}) {
  const [personalResponse, overviewResponse] = await Promise.all([
    request.get("http://127.0.0.1:8100/api/user/personal-feed"),
    request.get("http://127.0.0.1:8100/api/feed/market-overview"),
  ]);
  const personal = await personalResponse.json();
  const overview = await overviewResponse.json();
  const letters = empty ? [] : [{
    id: "market-layout-letter",
    title,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    isEveningLetter: false,
    introText: "Fiktiv testutgåva med bolagens rapporter och dagens räntebesked.",
    summary: null,
    bulletPoints: LETTER_POINTS.map((point) => `- ${point}`).join("\n"),
  }];
  const state = { errors: [], writes: [], letterReads: 0 };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      state.writes.push({ method: request.method(), path: url.pathname });
      return route.fulfill({ status: 405, json: { error: "Read-only layout fixture" } });
    }
    if (url.pathname === "/api/user") return route.fulfill({ json: guest
      ? { email: null, verified: false, plan: "free" }
      : { email: "layout@example.test", verified: true, plan: "free", watchlist: ["NORD.TEST"], topics: [], keywords: [] },
    });
    if (url.pathname === "/api/user/personal-feed") return route.fulfill({ json: personal });
    if (url.pathname === "/api/feed/market-overview") return route.fulfill({ json: overview });
    if (url.pathname === "/api/data") {
      state.letterReads++;
      return route.fulfill({ json: letters });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({
      url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
    }) });
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  return state;
}

async function bounds(locator) {
  const rect = await locator.boundingBox();
  expect(rect).not.toBeNull();
  return { ...rect, right: rect.x + rect.width, bottom: rect.y + rect.height };
}

async function expectUnclipped(locator) {
  const geometry = await locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
      scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
      x: rect.left, right: rect.right, viewport: innerWidth,
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function loadedRegions(page, title = LETTER_TITLE) {
  const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
  const letter = page.getByRole("complementary", { name: "Senaste brevet", exact: true });
  const personal = page.getByRole("region", { name: "Dina bevakningar", exact: true });
  const latest = page.getByRole("region", { name: "Senaste nytt", exact: true });
  await expect(letter.getByRole("heading", { level: 2 })).toHaveText(title);
  await expect(featured.locator("article").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { featured, letter, personal, latest };
}

for (const [width, height] of [[1440, 900], [1280, 800], [900, 900], [390, 844], [320, 800]]) {
  test(`market layout ${width}x${height} gives the letter room before personal context`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width, height });
    const state = await setup(page, request);
    await page.goto("/marknaden");
    const { featured, letter, personal, latest } = await loadedRegions(page);
    await expect(personal.locator("article")).toHaveCount(2);
    const allPersonal = personal.getByRole("link").filter({ hasText: /^Visa alla/ });
    await expect(allPersonal).toBeVisible();
    await expect(allPersonal).toHaveAttribute("href", "/marknaden/bevakning");
    await expect(letter.getByRole("listitem")).toHaveText(LETTER_POINTS);
    await expect(letter.getByRole("listitem")).toHaveCount(2);

    const [featuredBox, letterBox, personalBox, latestBox] = await Promise.all([
      bounds(featured), bounds(letter), bounds(personal), bounds(latest),
    ]);
    expect(personalBox.y).toBeGreaterThanOrEqual(letterBox.bottom + 16);
    if (width > 960) {
      expect(letterBox.width).toBeGreaterThanOrEqual(360);
      expect(letterBox.width).toBeLessThanOrEqual(384);
      expect(letterBox.x).toBeGreaterThanOrEqual(featuredBox.right + 24);
      expect(Math.abs(featuredBox.y - letterBox.y)).toBeLessThan(2);
      expect(featuredBox.width).toBeGreaterThan(letterBox.width);
      expect(latestBox.y).toBeGreaterThanOrEqual(featuredBox.bottom + 16);
      for (const name of ["Läs brevet", "Få i mejlen"]) {
        const action = await bounds(letter.getByRole("link", { name, exact: true }));
        expect(action.bottom, `${name} should be available without scrolling`).toBeLessThanOrEqual(height);
      }
    } else {
      expect(letterBox.y).toBeGreaterThanOrEqual(featuredBox.bottom + 16);
      expect(latestBox.y).toBeGreaterThanOrEqual(personalBox.bottom + 16);
      for (const box of [letterBox, personalBox, latestBox]) {
        expect(Math.abs(box.x - featuredBox.x)).toBeLessThan(2);
        expect(Math.abs(box.width - featuredBox.width)).toBeLessThan(2);
      }
    }
    await expectUnclipped(letter);
    await expectUnclipped(letter.getByRole("heading", { level: 2 }));
    for (const action of [
      letter.getByRole("link", { name: "Läs brevet", exact: true }),
      letter.getByRole("link", { name: "Få i mejlen", exact: true }),
      allPersonal,
    ]) {
      await expectUnclipped(action);
      expect((await bounds(action)).height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) expect((await new AxeBuilder({ page })
      .include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`market-layout-${width}.png`), fullPage: true });
    expect(state.writes).toEqual([]);
    expect(state.errors).toEqual([]);
  });
}

test("guests also see the letter before the personal invitation", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const state = await setup(page, request, { guest: true });
  await page.goto("/marknaden");
  const { letter, personal } = await loadedRegions(page);
  await expect(personal.getByRole("link", { name: "Lägg till ditt första bolag", exact: true })).toBeVisible();
  await expect(personal.locator("article")).toHaveCount(0);
  expect((await bounds(personal)).y).toBeGreaterThanOrEqual((await bounds(letter)).bottom + 16);
  expect((await bounds(letter.getByRole("link", { name: "Läs brevet", exact: true }))).bottom).toBeLessThanOrEqual(800);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const width of [1280, 320]) {
  test(`a long letter title wraps completely and keeps both actions accessible at ${width}px`, async ({ page, request }) => {
    const title = "Fiktivt morgonbrev: industrins orderingång, bankernas rapporter och räntebeskedet som ger sammanhang till dagens viktigaste börsnyheter";
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page, request, { title });
    await page.goto("/marknaden");
    const { letter } = await loadedRegions(page, title);
    const heading = letter.getByRole("heading", { level: 2 });
    await expectUnclipped(heading);
    const lines = await heading.evaluate((node) => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight));
    expect(lines).toBeGreaterThan(2);
    const card = await bounds(letter);
    for (const name of ["Läs brevet", "Få i mejlen"]) {
      const action = letter.getByRole("link", { name, exact: true });
      await expectUnclipped(action);
      const rect = await bounds(action);
      expect(rect.y).toBeGreaterThanOrEqual((await bounds(heading)).bottom);
      expect(rect.bottom).toBeLessThanOrEqual(card.bottom);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(state.errors).toEqual([]);
  });
}

test("an absent letter stays an honest fallback without fabricated highlights", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, request, { empty: true });
  await page.goto("/marknaden");
  const letter = page.getByRole("complementary", { name: "Senaste brevet", exact: true });
  await expect.poll(() => state.letterReads).toBeGreaterThan(0);
  await expect(letter.getByRole("heading", { level: 2 })).toHaveText("Dagens börs, sammanfattad.");
  await expect(letter.getByRole("listitem")).toHaveCount(0);
  await expect(letter).not.toContainText(LETTER_POINTS[0]);
  await expect(letter).not.toContainText(LETTER_POINTS[1]);
  await expect(letter.getByRole("link", { name: "Läs brevet", exact: true })).toHaveAttribute("href", "/nyhetsbrev");
  await expectUnclipped(letter);
  await expectUnclipped(letter.getByRole("link", { name: "Få i mejlen", exact: true }));
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});
