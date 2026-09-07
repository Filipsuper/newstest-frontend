import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { screenerResponse, profileResponse } from "../fixtures/screener.mjs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/feed/screener") return route.fulfill({ json: screenerResponse });
    if (url.pathname === "/api/feed/company-profiles") return route.fulfill({ json: profileResponse((url.searchParams.get("symbols") || "").split(",")) });
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});
const table = page => page.getByRole("table", { name: "Bolag och nyckeltal" });
const rows = page => table(page).locator("tbody tr");
const region = page => page.getByRole("region", { name: /^Screenerresultat/ });
const settleTheme = page => page.evaluate(async () => {
  await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {})));
});
const openFilters = async page => {
  await page.getByRole("button", { name: "Lägg till filter", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filtrera bolag" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test("table keeps its metrics, compact density, shared palette and profile scores", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /Base UI|hydration/i.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/aktier/screener");
  await expect(rows(page)).toHaveCount(50);
  await expect(table(page).getByRole("columnheader")).toHaveCount(11);
  await expect(page.getByRole("navigation", { name: "Aktier", exact: true }).getByRole("link", { name: "Screener" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main time")).toHaveText("2026-09-07 11:05");
  await expect(rows(page).first().getByRole("img")).toHaveAccessibleName(/stark profil/);
  await expect(rows(page).nth(2).getByRole("img")).toHaveAccessibleName(/svag profil.*Värdering saknas/);
  expect((await rows(page).first().boundingBox()).height).toBe(64);
  expect(await rows(page).first().locator("td").nth(1).evaluate(el => getComputedStyle(el).fontSize)).toBe("14px");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    await settleTheme(page);
    await page.mouse.move(0, 0);
    const cell = rows(page).first().locator("td").first();
    expect(await cell.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(theme === "dark" ? "rgb(34, 37, 31)" : "rgb(255, 255, 255)");
    const change = rows(page).first().locator("td").nth(2);
    expect(await change.evaluate(el => getComputedStyle(el).color)).toBe(theme === "dark" ? "rgb(130, 206, 163)" : "rgb(23, 110, 72)");
    const margin = rows(page).first().locator("td").nth(5);
    expect(await margin.evaluate(el => getComputedStyle(el).color)).toBe(theme === "dark" ? "rgb(242, 243, 237)" : "rgb(37, 38, 32)");
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`screener-${theme}-desktop.png`) });
  }
  expect(errors).toEqual([]);
});

test("presets, sorting, missing values, removing rules, refresh and load more retain comparison behavior", async ({ page }) => {
  await page.goto("/aktier/screener");
  await expect(rows(page)).toHaveCount(50);
  await page.getByRole("button", { name: "Visa fler bolag" }).click();
  await expect(rows(page)).toHaveCount(63);
  await table(page).getByRole("button", { name: "Kurs", exact: true }).click();
  await expect(table(page).getByRole("columnheader", { name: "Kurs", exact: true })).toHaveAttribute("aria-sort", "descending");
  await expect(rows(page).first()).toContainText("Norden Industri");
  await expect(rows(page).last().locator("td").nth(1)).toHaveText("Saknas");
  await table(page).getByRole("button", { name: "Kurs", exact: true }).click();
  await expect(table(page).getByRole("columnheader", { name: "Kurs", exact: true })).toHaveAttribute("aria-sort", "ascending");
  await expect(rows(page).first()).toContainText("Fjäll Energi");
  await expect(rows(page).last().locator("td").nth(1)).toHaveText("Saknas");
  await expect(rows(page).first().locator("td").nth(2)).toHaveText("0%");
  for (const [name, count] of [["Ovanligt hög handel", 2], ["Stiger med volym", 1], ["Lönsam tillväxt", 1], ["Lägre P/E", 2]]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(rows(page)).toHaveCount(count);
    await expect(page.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await expect(rows(page).first()).toContainText("Skärgården Teknik");
  await page.getByRole("button", { name: "Uppdatera screenerdata", exact: true }).click();
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Ta bort PE < 15", exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Lägre P/E", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Rensa filter", exact: true }).click();
  await expect(rows(page)).toHaveCount(50);
});

test("Base UI filters support grouped selection, validation, keyboard dismissal and focus return", async ({ page }, testInfo) => {
  await page.goto("/aktier/screener");
  const dialog = await openFilters(page);
  const metric = dialog.getByRole("combobox", { name: "Nyckeltal", exact: true });
  await metric.click();
  await expect(page.getByRole("group", { name: "Värdering", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "P/E", exact: true }).click();
  await expect(metric).toHaveText("P/E");
  await metric.press("Space");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(metric).toBeFocused();
  await dialog.getByRole("combobox", { name: "Villkor", exact: true }).click();
  await page.getByRole("option", { name: "Under", exact: true }).click();
  const value = dialog.getByRole("spinbutton", { name: "Värde (x)", exact: true });
  await value.fill("");
  await expect(dialog.getByRole("button", { name: "Lägg till villkor", exact: true })).toBeDisabled();
  await value.fill("15");
  await value.press("Enter");
  await expect(dialog.getByRole("status")).toContainText("1 aktiva filter · 2 bolag matchar");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("screener-filters-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lägg till filter", exact: true })).toBeFocused();
  await expect(rows(page)).toHaveCount(2);
  await openFilters(page);
  await dialog.getByRole("combobox", { name: "Lista", exact: true }).click();
  await page.getByRole("option", { name: "Small Cap", exact: true }).click();
  await dialog.getByRole("button", { name: "Visa 0 bolag", exact: true }).click();
  await expect(page.getByText("Inga bolag matchar urvalet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visa alla bolag", exact: true }).click();
  await expect(rows(page)).toHaveCount(50);
});

test("loading, failure and stale refresh are distinct and retryable", async ({ page }) => {
  let fail = false, release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route("**/api/feed/screener?**", async route => {
    await held;
    return route.fulfill(fail ? { status: 503, json: { error: "Fixture unavailable" } } : { json: screenerResponse });
  });
  await page.goto("/aktier/screener");
  await expect(page.getByRole("status", { name: "Laddar screenerdata", exact: true })).toBeVisible();
  fail = true;
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("Kunde inte hämta screenerdata");
  await expect(page.getByText("Ingen screenerdata att visa ännu", { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(rows(page)).toHaveCount(50);
  fail = true;
  await page.getByRole("button", { name: "Uppdatera screenerdata", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Tidigare hämtade värden visas");
  await expect(rows(page)).toHaveCount(50);
  fail = false;
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("Plus boundary is unchanged for guests and free accounts", async ({ page }) => {
  let requests = 0, guest = true;
  await page.route("**/api/user", route => route.fulfill({ json: guest ? { error: "No token provided" } : { email: "free@example.test", verified: true, plan: "free" } }));
  page.on("request", request => { if (/\/api\/feed\/screener/.test(request.url())) requests++; });
  for (const isGuest of [true, false]) {
    guest = isGuest;
    await page.goto("/aktier/screener");
    await expect(page.getByRole("heading", { name: "Utforska aktier med Plus", exact: true })).toBeVisible();
    await expect(table(page)).toHaveCount(0);
    if (isGuest) {
      await page.getByRole("button", { name: "Har du redan Plus? Logga in", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Logga in på OMXsum", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
  expect(requests).toBe(0);
});

test.describe("touch layouts", () => {
  test.use({ hasTouch: true });
  test("320/390px layouts pin identity, scroll the table only and retain usable filter controls", async ({ page }, testInfo) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/aktier/screener");
      await expect(rows(page)).toHaveCount(50);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const button of await page.getByRole("group", { name: "Färdiga urval" }).getByRole("button").all()) {
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      expect((await page.getByRole("button", { name: "Lägg till filter", exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44);
      expect((await region(page).boundingBox()).y).toBeLessThan(540);
      expect(await region(page).evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      const identity = rows(page).first().locator("td").first();
      const x = (await identity.boundingBox()).x;
      await region(page).evaluate(el => { el.scrollLeft = 600; });
      expect((await identity.boundingBox()).x).toBeCloseTo(x, 0);
      await region(page).evaluate(el => { el.scrollLeft = 0; });
      await page.mouse.move(width - 2, 2);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
        await settleTheme(page);
        await page.screenshot({ path: testInfo.outputPath(`screener-mobile-${width}-${theme}.png`) });
      }
      const dialog = await openFilters(page);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(width - 32);
      await dialog.getByRole("combobox", { name: "Nyckeltal", exact: true }).click();
      const list = page.getByRole("listbox");
      await expect(list).toBeVisible();
      const bounds = await list.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.getByRole("option", { name: "Nettoskuld/EBITDA", exact: true }).click();
      await expect(list).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`screener-filters-mobile-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Lägg till filter", exact: true })).toBeFocused();
      await region(page).hover();
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 550);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 200);
    }
  });
});
