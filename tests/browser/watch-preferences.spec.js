import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const managerPath = "/marknaden/bevakning/hantera";
const vocabulary = {
  events: ["EARNINGS", "GUIDANCE", "ORDER", "M_AND_A", "CAPITAL_RAISE", "DIVIDEND", "MANAGEMENT", "INSIDER", "MACRO"],
  sectors: ["Industrials", "Technology", "Energy", "Real Estate", "Financials", "Health Care"],
  segments: ["LARGE_CAP", "MID_CAP", "SMALL_CAP", "FIRST_NORTH", "SPOTLIGHT"],
};

async function setup(page, options = {}) {
  const state = {
    writes: [],
    failKind: null,
    vocabularyError: false,
    ...options,
    user: {
      email: "preferences@example.test", verified: true, plan: "free",
      watchlist: ["NORD.TEST"], topics: ["SAVED_UNKNOWN_TOPIC"], keywords: ["försvar"],
      ...options.user,
    },
  };
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget { close() {} };
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/user") return route.fulfill({ json: state.user });
    if (path === "/api/feed/topics") return route.fulfill({
      json: state.vocabularyError ? { error: "Unavailable" } : vocabulary,
      status: state.vocabularyError ? 503 : 200,
    });
    if (path === "/api/user/topics" || path === "/api/user/keywords") {
      const kind = path.split("/").at(-1);
      const body = request.postDataJSON();
      state.writes.push({ kind, ...body });
      if (state.holdWrites) await new Promise((resolve) => { state.releaseWrite = resolve; });
      if (state.failKind === kind) return route.fulfill({ status: 503, json: { error: "Dina val kunde inte sparas. Försök igen." } });
      state.user[kind] = body[kind];
      return route.fulfill({ json: { [kind]: state.user[kind] } });
    }
    if (path.startsWith("/api/user/watchlist/") && request.method() === "PUT") {
      const symbol = decodeURIComponent(path.split("/").at(-1));
      const body = request.postDataJSON();
      state.writes.push({ kind: "company", symbol, ...body });
      if (state.failKind === "company") return route.fulfill({ status: 503, json: { error: "Bolaget kunde inte sparas. Försök igen." } });
      state.user.watchlist = body.followed
        ? [...new Set([...state.user.watchlist, symbol])]
        : state.user.watchlist.filter((value) => value !== symbol);
      return route.fulfill({ json: { watchlist: state.user.watchlist } });
    }
    if (path.startsWith("/api/")) return route.fulfill({
      response: await route.fetch({ url: `http://127.0.0.1:8100${path}${url.search}` }),
    });
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
  return state;
}

async function checkTabGeometry(scope) {
  const list = scope.getByRole("tablist", { name: "Anpassa bevakning" });
  await expect(list.getByRole("tab")).toHaveCount(3);
  const dimensions = await list.evaluate((element) => {
    const list = element.getBoundingClientRect();
    return {
      overflow: element.scrollWidth > element.clientWidth + 1,
      tabs: [...element.querySelectorAll('[role="tab"]')].map((tab) => {
        const rect = tab.getBoundingClientRect();
        return { height: rect.height, fits: rect.left >= list.left - 1 && rect.right <= list.right + 1 };
      }),
    };
  });
  expect(dimensions.overflow).toBe(false);
  for (const tab of dimensions.tabs) {
    expect(tab.height).toBeGreaterThanOrEqual(44);
    expect(tab.fits).toBe(true);
  }
}

for (const width of [1440, 390, 320]) {
  test(`preference dialog ${width}: three visible tabs, keyboard navigation and focus restoration`, async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marknaden/bevakning");
    const trigger = page.getByRole("button", { name: "Anpassa bevakning", exact: true }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Anpassa bevakning", exact: true });
    await checkTabGeometry(dialog);
    const companyTab = dialog.getByRole("tab", { name: "Bolag 1", exact: true });
    await companyTab.focus();
    await page.keyboard.press("ArrowRight");
    const topicTab = dialog.getByRole("tab", { name: "Ämnen 1", exact: true });
    await expect(topicTab).toBeFocused();
    await expect(companyTab).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(topicTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByRole("button", { name: "Ta bort ämnet SAVED_UNKNOWN_TOPIC" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Händelser", exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Sektorer", exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Börslistor", exact: true })).toBeVisible();
    expect(await dialog.getByRole("button", { name: /^Följ ämnet/ }).count()).toBeLessThanOrEqual(9);
    await dialog.getByRole("button", { name: "Nästa ämnen" }).scrollIntoViewIfNeeded();
    await checkTabGeometry(dialog);
    await expect(dialog.getByRole("tab", { name: "Nyckelord 1", exact: true })).toBeInViewport();
    await dialog.getByRole("tab", { name: "Nyckelord 1", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`preferences-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(results.violations).toEqual([]);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}

test("direct editor searches grouped topics and preserves unknown saved values", async ({ page }) => {
  const state = await setup(page);
  await page.goto(managerPath);
  await page.getByRole("tab", { name: "Ämnen 1", exact: true }).click();
  await page.getByRole("textbox", { name: "Sök ämnen", exact: true }).fill("Teknik");
  await expect(page.getByRole("heading", { name: "Sektorer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Följ ämnet Teknik", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Ämnen 2", exact: true })).toBeVisible();
  expect(state.user.topics).toEqual(["SAVED_UNKNOWN_TOPIC", "Technology"]);
  await page.getByRole("button", { name: "Ta bort ämnet SAVED_UNKNOWN_TOPIC" }).click();
  await expect(page.getByRole("tab", { name: "Ämnen 1", exact: true })).toBeVisible();
  expect(state.user.topics).toEqual(["Technology"]);
  await expect(page.getByRole("status")).toContainText("Ämnet har tagits bort.");
  await page.reload();
  await page.getByRole("tab", { name: "Ämnen 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ta bort ämnet Teknik", exact: true })).toBeVisible();
});

test("keyword validation and failed writes preserve input, with pending and saved feedback", async ({ page }) => {
  const state = await setup(page);
  await page.goto(managerPath);
  await page.getByRole("tab", { name: "Nyckelord 1", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Nytt nyckelord", exact: true });
  await input.fill("x");
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Skriv mellan 2 och 40 tecken.")).toBeVisible();
  await input.fill(" FÖRSVAR ");
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(page.getByText("Du följer redan det nyckelordet.")).toBeVisible();
  expect(state.writes).toHaveLength(0);
  state.failKind = "keywords";
  await input.fill("  ny   order  ");
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Dina val kunde inte sparas.");
  await expect(input).toHaveValue("  ny   order  ");
  expect(state.user.keywords).toEqual(["försvar"]);
  state.failKind = null;
  state.holdWrites = true;
  await page.getByRole("button", { name: "Lägg till", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Sparar…");
  await expect(input).toBeDisabled();
  await expect(page.getByRole("button", { name: "Ta bort nyckelordet försvar" })).toBeDisabled();
  await expect.poll(() => Boolean(state.releaseWrite)).toBe(true);
  state.releaseWrite();
  await expect(page.getByRole("status")).toContainText("Nyckelordet är sparat.");
  await expect(input).toHaveValue("");
  expect(state.user.keywords).toEqual(["försvar", "ny order"]);
});

for (const [plan, limit] of [["free", 5], ["plus", 10], ["premium", 100]]) {
  test(`${plan}: company limit allows removal and explicit follow state`, async ({ page }) => {
    const watchlist = ["NORD.TEST", ...Array.from({ length: limit - 1 }, (_, index) => `SAVED${index}.TEST`)];
    const state = await setup(page, { user: { plan, watchlist } });
    await page.goto(managerPath);
    await expect(page.getByText(`${limit}/${limit} bolag i din plan`, { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Sök ett bolag att följa" }).fill("Skärgården");
    await page.getByRole("option", { name: /Skärgården Teknik/ }).click();
    await expect(page.getByRole("button", { name: "Följ Skärgården Teknik", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Sluta följa Norden Industri", exact: true }).click();
    await expect(page.getByText(`${limit - 1}/${limit} bolag i din plan`, { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Sök ett bolag att följa" }).fill("Skärgården");
    await page.getByRole("option", { name: /Skärgården Teknik/ }).click();
    await page.getByRole("button", { name: "Följ Skärgården Teknik", exact: true }).click();
    await expect(page.getByText(`${limit}/${limit} bolag i din plan`, { exact: true })).toBeVisible();
    expect(state.writes).toEqual([
      { kind: "company", symbol: "NORD.TEST", followed: false },
      { kind: "company", symbol: "SKAR.TEST", followed: true },
    ]);
  });
}

test("topic vocabulary recovery keeps saved values and removal works at the topic cap", async ({ page }) => {
  const topics = Array.from({ length: 10 }, (_, index) => `SAVED_TOPIC_${index}`);
  const state = await setup(page, { vocabularyError: true, user: { topics } });
  await page.goto(managerPath);
  await page.getByRole("tab", { name: "Ämnen 10", exact: true }).click();
  await expect(page.getByText("Ämnen kunde inte hämtas. Dina sparade ämnen finns kvar.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Valda ämnen", exact: true }).getByRole("button")).toHaveCount(10);
  state.vocabularyError = false;
  await page.getByRole("button", { name: "Hämta ämnen igen" }).click();
  await expect(page.getByRole("button", { name: "Följ ämnet Rapporter", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ta bort ämnet SAVED_TOPIC_0", exact: true }).click();
  await expect(page.getByRole("button", { name: "Följ ämnet Rapporter", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Följ ämnet Rapporter", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Ämnen 10", exact: true })).toBeVisible();
  expect(state.user.topics).toEqual([...topics.slice(1), "EARNINGS"]);
});
