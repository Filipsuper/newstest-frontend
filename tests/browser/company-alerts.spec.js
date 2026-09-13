import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Only fictional, per-test API state. No real MongoDB, credentials or mail sender.
async function setup(page, overrides = {}) {
  const user = {
    email: "alerts-reader@example.test", plan: "plus", verified: true,
    watchlist: ["NORD.TEST", "BANK.TEST"], topics: [], keywords: [], active_newsletters: ["Morgonbrev"],
    ...overrides,
  };
  const state = {
    user, puts: [], reads: 0, status: 200, putStatus: 200, delayed: null, putDelayed: null, errors: [],
    resource: {
      revision: 0, enabled: false, importanceLevel: "important", mutedSymbols: [],
      quietHours: { enabled: true, start: "22:00", end: "07:00" }, timeZone: "Europe/Stockholm",
      destination: user.email, verified: user.verified,
      entitlement: { eligible: ["plus", "premium"].includes(user.plan), companyLimit: user.plan === "premium" ? 100 : user.plan === "plus" ? 10 : 0 },
      delivery: { status: user.plan === "free" ? "requires_plan" : !user.verified ? "requires_verification" : "off", available: false },
      batching: { windowSeconds: 120, maxWaitSeconds: 300 },
    },
  };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/user/company-alerts") {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON(); state.puts.push(body);
        if (state.putStatus !== 200) return route.fulfill({ status: state.putStatus, json: { error: "fictional failure" } });
        state.resource = { ...state.resource, ...body, revision: state.resource.revision + 1,
          delivery: { available: false, status: body.enabled ? "service_paused" : "off" } };
        // Capture the committed write before delaying its network response.
        const response = { status: state.status, json: structuredClone(state.resource) };
        if (state.putDelayed) await state.putDelayed;
        if (state.delayed) await state.delayed;
        return route.fulfill(response);
      } else state.reads++;
      if (state.delayed) await state.delayed;
      return route.fulfill({ status: state.status, json: structuredClone(state.resource) });
    }
    if (url.pathname === "/api/user") return route.fulfill({ json: structuredClone(state.user) });
    if (url.pathname.startsWith("/api/user/watchlist/")) {
      const symbol = decodeURIComponent(url.pathname.split("/").at(-1));
      const body = route.request().postDataJSON();
      state.user.watchlist = body.followed
        ? [...new Set([...state.user.watchlist, symbol])]
        : state.user.watchlist.filter((value) => value !== symbol);
      return route.fulfill({ json: { watchlist: state.user.watchlist } });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({
      url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
    }) });
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
  return state;
}

async function openSettings(page) {
  await page.goto("/marknaden/bevakning/hantera");
  await page.locator("summary", { hasText: /^Mejl om mina bolag$/ }).click();
  return page.locator("details").filter({ has: page.locator("summary", { hasText: /^Mejl om mina bolag$/ }) }).first();
}

test("Plus explicit save, keyboard levels, reload and stop preserve newsletter/follows", async ({ page }) => {
  const state = await setup(page);
  const panel = await openSettings(page);
  const enabled = panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true });
  await expect(enabled).not.toBeChecked();
  await enabled.click();
  const slider = panel.getByRole("slider");
  await slider.focus(); await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  expect(state.puts).toHaveLength(0);
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(1);
  expect(state.puts[0]).toMatchObject({ enabled: true, importanceLevel: "major", revision: 0 });
  expect(state.puts[0]).not.toHaveProperty("destination");
  expect(state.user.active_newsletters).toEqual(["Morgonbrev"]);
  expect(state.user.watchlist).toEqual(["NORD.TEST", "BANK.TEST"]);
  await expect(panel).not.toContainText("Mejl på");
  await page.reload();
  await page.locator("summary", { hasText: /^Mejl om mina bolag$/ }).click();
  await expect(enabled).toBeChecked();
  await expect(slider).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  await enabled.click();
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(2);
  expect(state.puts[1].enabled).toBe(false);
  expect(state.errors).toEqual([]);
});

test("free users see a quiet Plus/Pro explanation, never an actionable delivery switch", async ({ page }) => {
  const state = await setup(page, { plan: "free" });
  const panel = await openSettings(page);
  await expect(panel).toContainText("Plus");
  await expect(panel).toContainText("Pro");
  await expect(panel.getByRole("switch")).toHaveCount(0);
  expect(state.puts).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test("failed preferences are unavailable with retry, not an off setting or paywall", async ({ page }) => {
  const state = await setup(page); state.status = 503;
  const panel = await openSettings(page);
  await expect(panel.getByRole("switch")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /igen/ }).first()).toBeVisible();
  state.status = 200;
  await panel.getByRole("button", { name: /igen/ }).first().click();
  await expect(panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0);
});

test("save errors retain draft and no autosave is triggered by changing importance", async ({ page }) => {
  const state = await setup(page); state.putStatus = 503;
  const panel = await openSettings(page);
  await panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true }).click();
  const slider = panel.getByRole("slider");
  await slider.focus(); await page.keyboard.press("Home");
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(slider).toHaveAttribute("aria-valuetext", "Fler relevanta nyheter");
  await expect(panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true })).toBeChecked();
  state.putStatus = 200;
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.resource.importanceLevel).toBe("relevant");
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390, 1280]) test(`email editor and slider fit ${width}px with usable targets`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const state = await setup(page, { plan: "premium" });
  const panel = await openSettings(page);
  await panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true }).click();
  await expect(panel.getByRole("slider")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  for (const button of await panel.getByRole("button").all()) {
    if (!await button.isVisible()) continue;
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `test-results/company-alerts-${width}.png`, fullPage: true });
  expect(state.errors).toEqual([]);
});

test("status entry opens the existing editor directly to email, not another dialog", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/marknaden/bevakning");
  await page.getByRole("button", { name: "Välj mejlbevakning", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Anpassa bevakning", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("switch", { name: "Mejl om mina bolag", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(state.puts).toHaveLength(0);
});

test("draft survives collapsing settings and switching preference tabs", async ({ page }) => {
  const state = await setup(page);
  const panel = await openSettings(page);
  await panel.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  await panel.locator("summary", { hasText: /^Mejl om mina bolag$/ }).click();
  await page.getByRole("tab", { name: /^Nyckelord/ }).click();
  await page.getByRole("tab", { name: /^Bolag/ }).click();
  await panel.locator("summary", { hasText: /^Mejl om mina bolag$/ }).click();
  await expect(panel.getByRole("slider")).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  await expect(panel.getByText("Du har osparade mejlval.", { exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0);
});

test("409 retains input and requires explicit review before another save", async ({ page }) => {
  const state = await setup(page); state.putStatus = 409;
  const panel = await openSettings(page);
  await panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true }).click();
  await panel.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Hämta sparade mejlval", exact: true })).toBeVisible();
  await expect(panel.getByRole("slider")).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  state.resource = { ...state.resource, revision: 1, importanceLevel: "relevant" };
  await panel.getByRole("button", { name: "Hämta sparade mejlval", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Spara mejlval", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Behåll mina ändringar", exact: true }).click();
  state.putStatus = 200;
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(2);
  expect(state.puts[1]).toMatchObject({ revision: 1, importanceLevel: "major", enabled: true });
});

test("company mutes and quiet hours save separately without unfollowing", async ({ page }) => {
  const state = await setup(page);
  const panel = await openSettings(page);
  await panel.locator("summary", { hasText: /^Bolagsval/ }).click();
  await panel.getByRole("switch", { name: "Norden Industri", exact: true }).click();
  await panel.locator("summary", { hasText: /^Tysta timmar/ }).click();
  await panel.getByLabel("Från", { exact: true }).fill("21:00");
  await panel.getByLabel("Till", { exact: true }).fill("08:00");
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(1);
  expect(state.puts[0]).toMatchObject({ mutedSymbols: ["NORD.TEST"], quietHours: { enabled: true, start: "21:00", end: "08:00" } });
  expect(state.user.watchlist).toEqual(["NORD.TEST", "BANK.TEST"]);
});

test("unverified accounts cannot enable and have a real recovery link", async ({ page }) => {
  const state = await setup(page, { verified: false });
  const panel = await openSettings(page);
  await expect(panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Bekräfta mejladress", exact: true }).click();
  await expect(panel.getByRole("textbox", { name: "E-postadress", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Skicka inloggningslänk", exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0);
});

test("no companies guides following rather than enabling an empty alert", async ({ page }) => {
  const state = await setup(page, { watchlist: [] });
  const panel = await openSettings(page);
  await expect(panel.getByText("Följ ett bolag för att välja mejlbevakning.", { exact: true })).toBeVisible();
  await expect(panel.getByRole("switch")).toHaveCount(0);
  expect(state.puts).toHaveLength(0);
});

test("an enabled account can mute its final company without deleting its watchlist", async ({ page }) => {
  const state = await setup(page, { watchlist: ["NORD.TEST"] });
  state.resource.enabled = true; state.resource.delivery.status = "service_paused";
  const panel = await openSettings(page);
  await panel.locator("summary", { hasText: /^Bolagsval/ }).click();
  await panel.getByRole("switch", { name: "Norden Industri", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Spara mejlval", exact: true })).toBeEnabled();
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(1);
  expect(state.puts[0]).toMatchObject({ enabled: true, mutedSymbols: ["NORD.TEST"] });
  expect(state.user.watchlist).toEqual(["NORD.TEST"]);
});

test("loading email preferences never flashes an off switch or upgrade offer", async ({ page }) => {
  const state = await setup(page);
  let release; state.delayed = new Promise((resolve) => { release = resolve; });
  const panel = await openSettings(page);
  try {
    await expect(panel.getByRole("status", { name: "Hämtar mejlval", exact: true })).toBeVisible();
    await expect(panel.getByRole("switch")).toHaveCount(0);
    await expect(panel.getByRole("link", { name: /Plus/ })).toHaveCount(0);
  } finally { state.delayed = null; release(); }
  await expect(panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true })).toBeVisible();
});

test("an older delayed PUT cannot replace a newer accepted focus GET or reset the draft", async ({ page }) => {
  const state = await setup(page);
  const panel = await openSettings(page);
  await panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true }).click();
  await panel.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  let release;
  state.putDelayed = new Promise((resolve) => { release = resolve; });
  try {
    await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
    await expect.poll(() => state.puts.length).toBe(1);
    expect(state.resource.revision).toBe(1);
    state.resource = { ...state.resource, revision: 2, importanceLevel: "relevant" };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    // This summary proves the newer GET was accepted while the PUT is still pending.
    await expect(panel.getByText(/^Sparat:/)).toContainText("Fler relevanta nyheter");
    // A post-save retry must not hide the regression by fetching revision 2 again.
    state.status = 503;
  } finally {
    state.putDelayed = null;
    release();
  }
  await expect(panel.getByRole("button", { name: "Sparar mejlval…", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("slider")).toHaveAttribute("aria-valuetext", "Fler relevanta nyheter");
  await expect(panel.getByText("Mejlvalen kunde inte uppdateras. Dina ändringar finns kvar.", { exact: true })).toBeVisible();
  await expect(panel.getByRole("slider")).toHaveAttribute("aria-valuetext", "Fler relevanta nyheter");
  expect(state.puts).toHaveLength(1);
  expect(state.errors).toEqual([]);
});

test("a status-entry dialog preserves its dirty draft when a background refresh fails", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/marknaden/bevakning");
  await page.getByRole("button", { name: "Välj mejlbevakning", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Anpassa bevakning", exact: true });
  await dialog.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  state.status = 503;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dialog.getByText("Mejlvalen kunde inte uppdateras. Dina ändringar finns kvar.", { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("slider")).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  await expect(dialog.getByText("Du har osparade mejlval.", { exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test("a status-entry dialog retains its dirty draft through a follow-change refetch", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/marknaden/bevakning");
  await page.getByRole("button", { name: "Välj mejlbevakning", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Anpassa bevakning", exact: true });
  await dialog.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  let release;
  state.delayed = new Promise((resolve) => { release = resolve; });
  const readsBeforeFollow = state.reads;
  try {
    await dialog.getByRole("button", { name: "Sluta följa Norden Industri", exact: true }).click();
    await expect.poll(() => state.user.watchlist).toEqual(["BANK.TEST"]);
    await expect.poll(() => state.reads).toBeGreaterThan(readsBeforeFollow);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Hämtar mejlval…", { exact: true })).toBeVisible();
  } finally {
    state.delayed = null;
    release();
  }
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("slider")).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  await expect(dialog.getByText("Du har osparade mejlval.", { exact: true })).toBeVisible();
  expect(state.puts).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test("keeping a draft after a server pause still requires an explicit opt-in again", async ({ page }) => {
  const state = await setup(page);
  state.resource.enabled = true;
  state.resource.delivery.status = "service_paused";
  const panel = await openSettings(page);
  await panel.getByRole("button", { name: "Bara det viktigaste", exact: true }).click();
  state.resource = { ...state.resource, revision: 1, enabled: false,
    delivery: { available: false, status: "resume_required" } };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await panel.getByRole("button", { name: "Behåll mina ändringar", exact: true }).click();
  const enabled = panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true });
  await expect(enabled).not.toBeChecked();
  await expect(panel.getByRole("slider")).toHaveAttribute("aria-valuetext", "Bara det viktigaste");
  expect(state.puts).toHaveLength(0);
  await enabled.click();
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(1);
  expect(state.puts[0]).toMatchObject({ revision: 1, enabled: true, importanceLevel: "major" });
  expect(state.errors).toEqual([]);
});

test("an over-cap Plus account chooses ten email companies without deleting follows", async ({ page }) => {
  const watchlist = ["NORD.TEST", ...Array.from({ length: 10 }, (_, index) => `B${index}.TEST`)];
  const state = await setup(page, { watchlist });
  state.resource.delivery.status = "over_limit";
  const panel = await openSettings(page);
  const enabled = panel.getByRole("switch", { name: "Mejl om mina bolag", exact: true });
  await expect(enabled).toBeDisabled();
  await panel.locator("summary", { hasText: /^Bolagsval/ }).click();
  await panel.getByRole("switch", { name: "Norden Industri", exact: true }).click();
  await expect(enabled).toBeEnabled();
  await expect(enabled).not.toBeChecked();
  await enabled.click();
  await panel.getByRole("button", { name: "Spara mejlval", exact: true }).click();
  await expect.poll(() => state.puts.length).toBe(1);
  expect(state.puts[0]).toMatchObject({ enabled: true, mutedSymbols: ["NORD.TEST"] });
  expect(state.user.watchlist).toEqual(watchlist);
  expect(state.errors).toEqual([]);
});

test("email choices pass automated accessibility checks in both themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const state = await setup(page);
  const panel = await openSettings(page);
  await panel.locator("summary", { hasText: /^Bolagsval/ }).click();
  await panel.locator("summary", { hasText: /^Tysta timmar/ }).click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page.getByRole("button", { name: "Växla tema", exact: true }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
      // Audit the settled theme, not intermediate colors during the shared
      // 160ms transition. Wait for actual animations rather than a fixed sleep.
      await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))));
    }
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`email-${theme}.png`), fullPage: true });
  }
  expect(state.errors).toEqual([]);
});
