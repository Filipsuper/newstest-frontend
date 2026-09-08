import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { previewStories } from "../../app/designsystem/reactions/fixtures.js";

test.use({ reducedMotion: "reduce" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

const badge = (scope, label) => scope.locator(`[aria-label="${label}"]`);
const reaction = page => page.getByRole("region", { name: "Marknadens reaktion", exact: true });
const kpis = scope => scope.locator('dl[aria-label="Nyckeltal"]');

async function expectAlignedKpis(scope) {
  const columns = kpis(scope).locator(":scope > div");
  await expect(columns).toHaveCount(3);
  const geometry = await columns.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    const value = element.querySelector("dd > span").getBoundingClientRect();
    const period = element.querySelector("dd:last-child").getBoundingClientRect();
    return { left: box.left, right: box.right, valueTop: value.top, valueRight: value.right, periodTop: period.top };
  }));
  for (const [index, column] of geometry.entries()) {
    expect(Math.abs(column.valueTop - geometry[0].valueTop)).toBeLessThan(1);
    expect(Math.abs(column.periodTop - geometry[0].periodTop)).toBeLessThan(1);
    expect(column.valueRight).toBeLessThanOrEqual(column.right + 1);
    if (index) expect(column.left).toBeGreaterThan(geometry[index - 1].right);
  }
}

for (const width of [320, 1440]) {
  test(`v2 compact rows and expandable reader fit at ${width}px in both themes`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/designsystem/reactions");
    await expect(page.getByText("Fiktiv förhandsvisning · ingen livedata")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(6);
    await expect(page.locator("article").getByText(/Fiktivt exempel/)).toHaveCount(0);
    await expect(page.locator("article").getByText("+99,0 %", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const trigger = page.getByRole("button", { name: "Höjer prognosen efter stark orderingång", exact: true });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
      await page.screenshot({ path: testInfo.outputPath(`rows-${width}-${theme}.png`), fullPage: true });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(badge(dialog, "1 tim efter nyheten: +4,2 %")).toBeVisible();
      await expect(dialog).toHaveCSS("opacity", "1");
      await expect(dialog.getByText(/Senaste mätning|Handeln efter nyheten|Avläst/)).toHaveCount(0);
      await expect(dialog.getByRole("combobox", { name: /Mätperiod|Volymperiod/ })).toHaveCount(0);
      await expect(kpis(dialog).getByText("Första 30 min", { exact: true })).toHaveCount(2);
      await expect(dialog.getByText(/180\s000 aktier/)).not.toBeVisible();
      await expect(dialog.getByText(/inte bevis på orsak/)).not.toBeVisible();
      await expectAlignedKpis(dialog);
      await page.screenshot({ path: testInfo.outputPath(`reader-${width}-${theme}.png`) });
      await expect(dialog.getByText("2,4×", { exact: true })).toBeVisible();
      await expect(dialog.getByText("2×", { exact: true })).toBeVisible();
      await dialog.getByText("Mätpunkter & underlag", { exact: true }).click();
      await expect(dialog.getByText(/inte bevis på orsak/)).toBeVisible();
      await expect(dialog.getByText(/180\s000 aktier/)).toBeVisible();
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(accessibility.violations.filter(item => ["critical", "serious"].includes(item.impact))).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`underlag-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}

test("one-click company switching updates the latest price, curve and visible volume", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/nyhet/reaction-preview-multi");
  const section = reaction(page);
  await expect(badge(section, "1 tim efter nyheten: +1,7 %")).toBeVisible();
  await expect(section.getByRole("combobox")).toHaveCount(0);
  const companies = section.getByRole("group", { name: "Bolag i nyheten" });
  const second = companies.getByRole("button", { name: "Skärgården Teknik", exact: true });
  await second.click();
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(badge(section, "1 tim efter nyheten: −1,2 %")).toBeVisible();
  await expect(section.getByText("0,8×", { exact: true })).toBeVisible();
  await expect(section.getByText("0,6×", { exact: true })).toBeVisible();
  await expectAlignedKpis(section);
  expect(await page.locator("main > article").evaluate(element => {
    const summary = element.querySelector("[data-reading]").getBoundingClientRect();
    const data = element.querySelector('[aria-label="Marknadens reaktion"]').getBoundingClientRect();
    const share = [...element.querySelectorAll("button")].find(button => button.textContent.includes("Dela nyheten")).getBoundingClientRect();
    return summary.bottom <= data.top && data.bottom <= share.top;
  })).toBe(true);
  expect(await section.locator('svg path[fill="none"]').getAttribute("stroke")).toBe("var(--ui-negative)");
  expect(await companies.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  for (const button of await companies.getByRole("button").all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await section.evaluate(element => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: testInfo.outputPath("company-facts-mobile.png") });
  await second.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect(badge(section, "1 tim efter nyheten: +1,7 %")).toBeVisible();
  await expect(section.getByText("2,4×", { exact: true })).toBeVisible();
});

test("next-open, waiting and missing states have explicit labels and no fabricated charts", async ({ page }) => {
  await page.goto("/nyhet/reaction-preview-after-close");
  await expect(badge(reaction(page), "1 tim efter öppning: +2,8 %")).toBeVisible();
  await expect(reaction(page).getByText("Börsöppning", { exact: true })).toBeVisible();
  await expect(kpis(reaction(page)).getByText("1 tim från öppning", { exact: true })).toBeVisible();
  await expect(kpis(reaction(page)).getByText("Från öppning · 30 min", { exact: true })).toHaveCount(2);
  await expect(kpis(reaction(page)).getByText("Saknas", { exact: true })).toBeVisible();
  await reaction(page).getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(reaction(page).getByText("Före/efter: perioden går utanför börsdagen.", { exact: true })).toBeVisible();
  await page.goto("/nyhet/reaction-preview-waiting");
  await expect(kpis(reaction(page)).getByText("Väntar", { exact: true })).toHaveCount(3);
  await expect(reaction(page).getByText(/Mätningen börjar vid börsöppning/)).not.toBeVisible();
  await reaction(page).getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(reaction(page).getByText(/Mätningen börjar vid börsöppning/)).toBeVisible();
  await expect(reaction(page).getByRole("img")).toHaveCount(0);
  await page.goto("/nyhet/reaction-preview-missing");
  await expect(kpis(reaction(page)).getByText("Saknas", { exact: true })).toHaveCount(3);
  await reaction(page).getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(reaction(page).getByText("Kurs före nyheten saknas.", { exact: true })).toBeVisible();
  await expect(reaction(page).getByRole("img")).toHaveCount(0);
  await expect(reaction(page).locator('[aria-label*="0,0 %"]')).toHaveCount(0);
});

test("negative curves retain gaps and provisional volume remains qualified", async ({ page }, testInfo) => {
  await page.goto("/nyhet/reaction-preview-negative");
  const section = reaction(page);
  await expect(badge(section, "1 tim efter nyheten: −3,1 %")).toBeVisible();
  expect((await section.locator('svg path[fill="none"]').getAttribute("d")).match(/M/g)).toHaveLength(2);
  await expect(section.locator('[aria-label*="preliminär jämförelse"]')).toBeVisible();
  await expect(kpis(section).getByText("*", { exact: true })).toBeVisible();
  await expect(section.getByText(/8 jämförbara handelsdagar/)).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("negative-gap.png"), fullPage: true });
  await section.getByText("Mätpunkter & underlag", { exact: true }).click();
  await expect(section.getByText("* Preliminärt · 8 jämförbara handelsdagar.", { exact: true })).toBeVisible();
});

test("a detail refresh without optional v2 data retains the matching measurement", async ({ page, request }) => {
  const detail = await (await request.get("http://127.0.0.1:8100/api/feed/news/reaction-preview-positive")).json();
  await page.goto("/nyhet/reaction-preview-positive");
  delete detail.story.reactionV2;
  await page.route("**/api/feed/news/reaction-preview-positive", route => route.fulfill({ json: detail }));
  await reaction(page).getByText("Mätpunkter & underlag", { exact: true }).click();
  await reaction(page).getByRole("button", { name: "Uppdatera data" }).click();
  await expect(reaction(page).getByRole("button", { name: "Uppdatera data" })).toBeEnabled();
  await expect(badge(reaction(page), "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await expect(reaction(page).getByText("Handelsvolym", { exact: true })).toHaveCount(0);
});

test("latest facts advance without period controls and never pair a closing return with an earlier chart", async ({ page, request }) => {
  const detail = await (await request.get("http://127.0.0.1:8100/api/feed/news/reaction-preview-positive")).json();
  await page.goto("/nyhet/reaction-preview-positive");
  const measurement = detail.story.reactionV2.measurements[0];
  measurement.windows.h1.status = "pending";
  measurement.volume.m30.post.status = "pending";
  await page.route("**/api/feed/news/reaction-preview-positive", route => route.fulfill({ json: detail }));
  await reaction(page).getByText("Mätpunkter & underlag", { exact: true }).click();
  await reaction(page).getByRole("button", { name: "Uppdatera data" }).click();
  await expect(badge(reaction(page), "15 min efter nyheten: +1,1 %")).toBeVisible();
  await expect(kpis(reaction(page)).getByText("Första 15 min", { exact: true })).toHaveCount(2);
  await expect(reaction(page).getByRole("figure").getByText("8 sep. 10:15", { exact: true })).toBeVisible();
  const close = measurement.windows.session_close;
  Object.assign(close, { status: "complete", pct: 0, endpoint: { price: 100, priceAt: close.targetAt } });
  measurement.asOf = close.targetAt;
  detail.story.reactionV2.asOf = Date.parse(close.targetAt);
  await reaction(page).getByRole("button", { name: "Uppdatera data" }).click();
  await expect(badge(reaction(page), "Vid stängning: 0,0 %")).toBeVisible();
  await expect(reaction(page).getByRole("img")).toHaveCount(0);
  await expect(reaction(page).getByText("Kurskurva saknas för den senaste mätperioden.", { exact: true })).toBeVisible();
  await expect(reaction(page).getByRole("combobox")).toHaveCount(0);
});

test("the real chronological feed opens the same v2 measurement in its URL-backed reader", async ({ page }) => {
  const story = previewStories()[0];
  await page.route(/\/api\/feed\/news\?/, route => route.fulfill({ json: { items: [story], nextCursor: null, serverFilters: true } }));
  await page.goto("/marknaden/nyheter");
  const row = page.locator("article").filter({ has: page.locator(`a[href="/nyhet/${story.id}"]`) });
  await expect(badge(row, "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await row.locator(`a[href="/nyhet/${story.id}"]`).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(badge(reaction(page), "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await expect(page).toHaveURL(/\/nyhet\/reaction-preview-positive$/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/marknaden\/nyheter$/);
  await expect(badge(row, "1 tim efter nyheten: +4,2 %")).toBeVisible();
});

test("reaction filtering and refresh use v2 without automatic reordering or false news counts", async ({ page }) => {
  await page.clock.install();
  const stories = previewStories();
  let items = [stories[0], stories[1], stories[4]];
  let requests = 0;
  await page.route(/\/api\/feed\/news\?/, route => {
    requests++;
    return route.fulfill({ json: { items, nextCursor: null, serverFilters: true } });
  });
  await page.goto("/marknaden/nyheter?view=reactions");
  const rows = page.locator("article");
  await expect(rows).toHaveCount(2); // Missing v2 is not rescued by legacy +99%.
  await expect(rows.first()).toContainText(stories[0].headline);
  await expect(badge(rows.first(), "1 tim efter nyheten: +4,2 %")).toBeVisible();
  items = structuredClone(items);
  items[1].reactionV2.asOf += 60_000;
  items[1].reactionV2.measurements[0].windows.h1.pct = -8;
  await page.clock.runFor(61_000);
  await expect(badge(rows.nth(1), "1 tim efter nyheten: −8,0 %")).toBeVisible();
  await expect(rows.first()).toContainText(stories[0].headline);
  await expect(page.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Uppdatera urval", exact: true }).click();
  await expect(rows.first()).toContainText(stories[1].headline);
  await page.getByRole("button", { name: "Pausa uppdateringar", exact: true }).click();
  const before = requests;
  await page.clock.runFor(61_000);
  expect(requests).toBe(before);
});

test("an open reader refreshes its latest measurement without a manual details click", async ({ page, request }) => {
  await page.clock.install();
  const detail = await (await request.get("http://127.0.0.1:8100/api/feed/news/reaction-preview-positive")).json();
  await page.goto("/nyhet/reaction-preview-positive");
  const data = detail.story.reactionV2;
  data.asOf += 60_000;
  const measurement = data.measurements[0];
  measurement.windows.h1.pct = 6;
  measurement.windows.h1.endpoint.price = 106;
  measurement.series.points.at(-1).pct = 6;
  await page.route("**/api/feed/news/reaction-preview-positive", route => route.fulfill({ json: detail }));
  await page.clock.runFor(61_000);
  await expect(badge(reaction(page), "1 tim efter nyheten: +6,0 %")).toBeVisible();
  await expect(reaction(page).locator("details")).not.toHaveAttribute("open");
  await expect(reaction(page).getByRole("img")).toHaveCount(1);
});

test("personalized news uses the same v2 badge as the canonical reader", async ({ page }) => {
  const story = previewStories()[0];
  await page.route("**/api/user/personal-feed?**", route => route.fulfill({ json: {
    stories: [{ ...story, viaWatchlist: true }], matchedCount: 1, hasPrefs: true, sinceHours: 48,
  } }));
  await page.goto("/bevakning");
  const row = page.locator("article").filter({ has: page.locator('a[href="/nyhet/reaction-preview-positive"]') });
  await expect(badge(row, "1 tim efter nyheten: +4,2 %")).toBeVisible();
  await row.locator('a[href="/nyhet/reaction-preview-positive"]').click();
  await expect(badge(reaction(page), "1 tim efter nyheten: +4,2 %")).toBeVisible();
});

test("share images support the same v2 observation and the text-only missing state", async ({ request }, testInfo) => {
  for (const scenario of ["positive", "missing", "after-close"]) {
    const response = await request.get(`/nyhet/reaction-preview-${scenario}/opengraph-image`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
    await writeFile(testInfo.outputPath(`reaction-${scenario}-og.png`), body);
  }
});
