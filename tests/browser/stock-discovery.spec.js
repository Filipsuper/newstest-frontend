import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe.configure({ mode: "serial" });
test.use({ hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});
const resultList = page => page.getByRole("list", { name: "Bolag", exact: true });

test("compact discovery is company-first, uses shared palette and does not fetch row details or radars", async ({ page }, testInfo) => {
  const extraRequests = [], errors = [];
  page.on("request", request => { if (/\/api\/feed\/(company-profiles|news\/fixture-)/.test(request.url())) extraRequests.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/aktier");
  await expect(resultList(page).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("navigation", { name: "Aktier", exact: true }).getByRole("link", { name: "Screener" })).toHaveAttribute("href", "/aktier/screener");
  const row = resultList(page).getByRole("listitem").first();
  expect((await row.boundingBox()).y).toBeLessThan(520);
  expect((await row.boundingBox()).height).toBeLessThan(150);
  await expect(row.getByRole("link", { name: "Norden Industri", exact: true })).toHaveAttribute("href", "/aktie/NORD.TEST");
  await expect(row.locator('a[href="/nyhet/fixture-0"]')).toBeVisible();
  await expect(row.locator('[aria-label^="Dagsförändring"]')).toBeVisible();
  await expect(row).not.toContainText("Fiktiv AI-text");
  await expect(row.locator(".stock-profile")).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    expect(await row.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(theme === "dark" ? "rgb(34, 37, 31)" : "rgb(255, 255, 255)");
    // Audit the settled palette, not interpolated colors during a theme change.
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {}))); });
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`discovery-${theme}-desktop.png`), fullPage: true });
  }
  expect(extraRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("filters, report choice and story dialog roundtrip through URL without losing state", async ({ page }) => {
  await page.goto("/aktier");
  await page.getByRole("button", { name: "Rapporter", exact: true }).click();
  await expect(resultList(page).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Sök bolag eller ticker", exact: true }).fill("nord");
  await page.getByRole("combobox", { name: "Sektor", exact: true }).click();
  await page.getByRole("option", { name: "Industri", exact: true }).click();
  await expect(page).toHaveURL(/view=reports.*q=nord.*sector=Industri/);
  const original = page.url();
  await page.reload();
  await expect(page.getByRole("button", { name: "Rapporter", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "Sök bolag eller ticker", exact: true })).toHaveValue("nord");
  const story = resultList(page).locator('a[href="/nyhet/fixture-0"]');
  await story.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("AI-sammanfattning", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(original);
  await expect(story).toBeFocused();
  await expect(resultList(page).getByRole("listitem")).toHaveCount(1);
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(original);
  await resultList(page).getByRole("link", { name: "Norden Industri", exact: true }).click();
  await expect(page).toHaveURL(/\/aktie\/NORD.TEST$/);
  await page.goBack();
  await expect(page).toHaveURL(original);
  await expect(resultList(page).getByRole("listitem")).toHaveCount(1);
});

test("complete directory, load more, missing data, search and clearing filters", async ({ page }) => {
  await page.goto("/aktier?view=all");
  await expect(resultList(page).getByRole("listitem")).toHaveCount(24);
  await page.getByRole("button", { name: "Visa fler bolag" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(resultList(page).getByRole("listitem")).toHaveCount(33);
  await page.reload();
  await expect(resultList(page).getByRole("listitem")).toHaveCount(33);
  const search = page.getByRole("searchbox", { name: "Sök bolag eller ticker", exact: true });
  await search.fill("Övrigt Testbolag 30");
  await expect(resultList(page).getByRole("listitem")).toHaveCount(1);
  await expect(resultList(page)).toContainText("Kurs saknas");
  await expect(resultList(page)).toContainText("Ingen nyhet i urvalet");
  await expect(resultList(page)).not.toContainText("0,00 kr");
  await page.getByRole("button", { name: "I nyheterna", exact: true }).click();
  await expect(page.getByText("Inga bolag matchar filtren", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visa alla bolag", exact: true }).click();
  await expect(resultList(page).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Rensa filter", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(resultList(page).getByRole("listitem")).toHaveCount(24);
});

test("following is separate from navigation and preserves the failed-save state", async ({ page }) => {
  let watchlist = [], fail = false, writes = 0;
  await page.route("**/api/user", route => route.fulfill({ json: { email: "directory@example.test", verified: true, plan: "plus", watchlist } }));
  await page.route("**/api/user/watchlist/toggle", async route => {
    writes++;
    if (fail) return route.fulfill({ status: 403, json: { error: "Din bevakningslista är full." } });
    const symbol = route.request().postDataJSON().symbol;
    watchlist = watchlist.includes(symbol) ? [] : [symbol];
    return route.fulfill({ json: { watchlist } });
  });
  await page.goto("/aktier");
  await page.getByRole("button", { name: "Följ Norden Industri", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sluta följa Norden Industri", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/aktier$/);
  fail = true;
  await page.getByRole("button", { name: "Följ Skärgården Teknik", exact: true }).click();
  await expect(resultList(page).getByRole("alert")).toContainText("Din bevakningslista är full.");
  await expect(page.getByRole("button", { name: "Följ Skärgården Teknik", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(writes).toBe(2);
});

test("guests get login, and selection failure is recoverable without hiding the directory", async ({ page, request }) => {
  await page.route("**/api/user", route => route.fulfill({ json: { error: "No token provided" } }));
  await request.post("http://127.0.0.1:8100/__discovery_failure", { data: { fail: true } });
  try {
    await page.goto("/aktier");
    await expect(page.getByText("Bolagsurvalet är inte tillgängligt", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Visa alla bolag", exact: true }).click();
    await expect(resultList(page).getByRole("listitem")).toHaveCount(24);
    await request.post("http://127.0.0.1:8100/__discovery_failure", { data: { fail: false } });
    await page.getByRole("button", { name: "Försök igen", exact: true }).click();
    await expect(page.getByText("Nyhetsurvalet kunde inte hämtas.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Följ Norden Industri", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Spara din bevakning" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/view=all/);
  } finally { await request.post("http://127.0.0.1:8100/__discovery_failure", { data: { fail: false } }); }
});

test("small screens reflow without clipped headlines or nested vertical scrolling", async ({ page }, testInfo) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/aktier");
    const list = resultList(page);
    await expect(list.getByRole("listitem")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole("group", { name: "Utforska bolag" }).evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect((await list.getByRole("listitem").first().boundingBox()).y).toBeLessThan(600);
    expect(await list.evaluate(element => getComputedStyle(element).overflowY)).not.toMatch(/auto|scroll/);
    for (const button of await page.getByRole("group", { name: "Utforska bolag" }).getByRole("button").all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    expect((await list.getByRole("button").first().boundingBox()).height).toBeGreaterThanOrEqual(44);
    await list.getByRole("listitem").last().scrollIntoViewIfNeeded();
    const story = list.locator('a[href="/nyhet/fixture-2"]');
    const scroll = await page.evaluate(() => scrollY);
    await story.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(story).toBeFocused();
    expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThan(10);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`discovery-mobile-${width}.png`), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({ path: testInfo.outputPath(`discovery-mobile-${width}-dark.png`), fullPage: true });
  }
});
