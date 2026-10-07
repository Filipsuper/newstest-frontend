import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const primaryLabels = ["Marknaden", "Mina bolag", "Aktier", "Screener", "Breven"];
const screenshotOptions = { style: 'nextjs-portal { visibility: hidden; }', animations: 'disabled' };

const reader = {
  email: "navigation@example.test",
  verified: true,
  plan: "plus",
  watchlist: ["NORD.TEST"],
  topics: [],
  keywords: [],
};

async function setup(page, user = reader) {
  const state = { errors: [], loginRequests: [] };
  page.on("pageerror", (error) => state.errors.push({ message: error.message, stack: error.stack, url: page.url() }));
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/user") return route.fulfill({ json: user });
    if (url.pathname === "/api/auth/register") {
      state.loginRequests.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}${url.pathname}${url.search}`,
        }),
      });
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  return state;
}

test("primary navigation exposes all everyday destinations without duplicate workspace tabs", async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [path, active, view] of [
    ["/marknaden", "Marknaden", "Överblick"],
    ["/marknaden/nyheter", "Marknaden", "Nyhetsflöde"],
    ["/marknaden/stories", "Marknaden", "Stories"],
    ["/marknaden/bevakning", "Mina bolag"],
    ["/marknaden/bevakning/hantera", "Mina bolag"],
    ["/aktier", "Aktier"],
    ["/aktier/screener", "Screener"],
    ["/nyhetsbrev", "Breven"],
  ]) {
    await page.goto(path);
    const primary = page.getByRole("navigation", { name: "Huvudmeny", exact: true });
    await expect(primary.getByRole("link")).toHaveText(primaryLabels);
    await expect(primary.locator('[aria-current="page"]')).toHaveText(active);
    const workspace = page.getByRole("navigation", { name: "Marknaden", exact: true });
    if (view) {
      await expect(workspace.getByRole("link")).toHaveText(["Överblick", "Nyhetsflöde", "Stories"]);
      await expect(workspace.locator('[aria-current="page"]')).toHaveText(view);
    } else {
      await expect(workspace).toHaveCount(0);
      await expect(page.locator('main nav[aria-label="Aktier"]')).toHaveCount(0);
    }
  }
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390, 768]) {
  test(`mobile navigation has five readable equal touch targets at ${width}px`, async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marknaden/bevakning");
    const dock = page.getByRole("navigation", { name: "Snabbmeny", exact: true });
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link")).toHaveText(primaryLabels);
    await expect(dock.locator('[aria-current="page"]')).toHaveText("Mina bolag");
    const boxes = await dock.getByRole("link").evaluateAll((links) => links.map((link) => {
      const { x, y, width, height, right } = link.getBoundingClientRect();
      return { x, y, width, height, right, scrollWidth: link.scrollWidth, clientWidth: link.clientWidth };
    }));
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1);
      expect(box.y).toBe(boxes[0].y);
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
      expect(box.right).toBeLessThanOrEqual(width);
    }
    for (const link of await dock.getByRole('link').all()) {
      const label = link.locator('span');
      const fits = await label.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const parent = element.parentElement.getBoundingClientRect();
        return bounds.left >= parent.left && bounds.right <= parent.right
          && parseFloat(getComputedStyle(element).fontSize) >= 12;
      });
      expect(fits).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("navigation", { name: "Sidfot" })
      .getByRole("link", { name: "Terminal", exact: true })).toHaveAttribute("href", "/terminal");
    expect((await new AxeBuilder({ page }).include('nav[aria-label="Snabbmeny"]').analyze()).violations).toEqual([]);
    await dock.screenshot({ path: testInfo.outputPath(`primary-navigation-${width}.png`), ...screenshotOptions });
    await dock.getByRole('link', { name: 'Screener', exact: true }).click();
    await expect(page).toHaveURL(/\/aktier\/screener$/);
    await expect(dock.locator('[aria-current="page"]')).toHaveText('Screener');
    await dock.getByRole('link', { name: 'Mina bolag', exact: true }).click();
    await expect(page).toHaveURL(/\/marknaden\/bevakning$/);
    await expect(dock.locator('[aria-current="page"]')).toHaveText('Mina bolag');
    await dock.getByRole('link', { name: 'Marknaden', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(dock.getByRole('link', { name: 'Mina bolag', exact: true })).toBeFocused();

    await page.getByRole('banner').getByRole('button', { name: 'Sök bolag och nyheter', exact: true }).click();
    const search = page.getByRole('dialog', { name: 'Hitta bolag och nyheter' });
    const input = search.getByRole('combobox');
    await expect(input).toBeFocused();
    await input.fill('Norden');
    await expect(page.getByRole('option', { name: /Norden Industri/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`navigation-search-${width}.png`), ...screenshotOptions });
    await page.getByRole('option', { name: /Norden Industri/ }).click();
    await expect(page).toHaveURL(/\/aktie\/NORD\.TEST$/);
    await expect(search).toHaveCount(0);
    await expect(dock.locator('[aria-current="page"]')).toHaveText('Aktier');
  });
}

for (const width of [900, 1440]) {
test(`desktop destinations, trial and search fit at ${width}px`, async ({ page }, testInfo) => {
  await setup(page, { ...reader, trial: { plan: 'plus', status: 'active', endsAt: Date.now() + 7 * 86400000 } });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/marknaden');
  const banner = page.getByRole('banner');
  const primary = page.getByRole('navigation', { name: 'Huvudmeny', exact: true });
  await expect(primary).toBeVisible();
  await expect(banner.getByRole('link', { name: /Plus-provperiod/ })).toBeVisible();
  await expect(primary.getByRole('link')).toHaveText(primaryLabels);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const boxes = await primary.getByRole('link').evaluateAll(links => links.map(link => {
    const { left, right, height } = link.getBoundingClientRect();
    return { left, right, height };
  }));
  for (const box of boxes) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
  }
  const controls = await banner.locator('div[class*="_bar_"] > *').evaluateAll(elements => elements
    .filter(element => getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width)
    .map(element => {
      const { left, right } = element.getBoundingClientRect();
      return { left, right };
    }));
  for (let i = 1; i < controls.length; i++) expect(controls[i].left).toBeGreaterThanOrEqual(controls[i - 1].right);
  await banner.screenshot({ path: testInfo.outputPath(`navigation-header-${width}.png`), ...screenshotOptions });
  let input;
  if (width === 900) {
    await banner.getByRole('button', { name: 'Sök bolag och nyheter', exact: true }).click();
    input = page.getByRole('dialog', { name: 'Hitta bolag och nyheter' }).getByRole('combobox');
    await expect(input).toBeFocused();
  } else {
    await expect(banner.getByRole('link', { name: 'Terminal', exact: true })).toBeVisible();
    input = banner.getByRole('combobox');
  }
  await input.fill('Norden');
  await expect(page.getByRole('option', { name: /Norden Industri/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sök ”Norden” i nyheterna/ })).toHaveAttribute('href', '/marknaden/nyheter?q=Norden');
  await page.screenshot({ path: testInfo.outputPath(`navigation-search-${width}.png`), ...screenshotOptions });
  await input.press('Enter');
  await expect(page).toHaveURL(/\/aktie\/NORD\.TEST$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Aktier');
});
}

test('compact search closes with Escape and restores its launcher focus', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/marknaden');
  const launcher = page.getByRole('banner').getByRole('button', { name: 'Sök bolag och nyheter', exact: true });
  await launcher.click();
  const search = page.getByRole('dialog', { name: 'Hitta bolag och nyheter' });
  await expect(search.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(launcher).toBeFocused();
});

test('guest header keeps the logo, search and login on one row at 320px', async ({ page }, testInfo) => {
  const state = await setup(page, { email: null, verified: false, plan: 'free' });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const banner = page.getByRole('banner');
  const logo = banner.getByRole('link', { name: /startsida/ });
  const search = banner.getByRole('button', { name: 'Sök bolag och nyheter', exact: true });
  const login = banner.getByRole('button', { name: 'Logga in', exact: true });
  await expect(login).toBeVisible();
  await expect(search).toBeVisible();
  const boxes = await Promise.all([logo, search, login].map(control => control.boundingBox()));
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
    expect(Math.abs(boxes[i].y + boxes[i].height / 2 - boxes[0].y - boxes[0].height / 2)).toBeLessThan(1);
    expect(boxes[i].x + boxes[i].width).toBeLessThanOrEqual(320);
  }
  expect((await banner.boundingBox()).height).toBe(64);
  await expect(page.getByRole('navigation', { name: 'Snabbmeny', exact: true }).getByRole('link')).toHaveText(primaryLabels);
  await banner.screenshot({ path: testInfo.outputPath('navigation-guest-header-320.png'), ...screenshotOptions });
  expect(state.errors).toEqual([]);
});

test("old watch bookmarks redirect directly to canonical market views with queries intact", async ({ page }) => {
  await setup(page);
  for (const [old, canonical] of [
    ["/bevakning", "/marknaden/bevakning"],
    ["/bevakning/hantera", "/marknaden/bevakning/hantera"],
    ["/mina-aktier", "/marknaden/bevakning"],
  ]) {
    await page.goto(`${old}?filter=companies&topic=Rapporter&topic=R%C3%A4ntor`);
    await expect.poll(() => new URL(page.url()).pathname).toBe(canonical);
    const url = new URL(page.url());
    expect(url.searchParams.get("filter")).toBe("companies");
    expect(url.searchParams.getAll("topic")).toEqual(["Rapporter", "Räntor"]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://omxsum.com${canonical}`);
  }
});

for (const width of [390, 1440]) {
test(`watch reader preserves the nested source, history and direct fallback at ${width}px`, async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/marknaden/bevakning?filter=companies");
  // Reader dialogs correctly make background navigation inert/hidden to AT.
  // Inspect its stored current route without attempting to interact with it.
  const primary = page.locator('nav[aria-label="Huvudmeny"]');
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Mina bolag');
  const story = page.locator('main article a[href^="/nyhet/"]').first();
  await expect(story).toBeVisible();
  const href = await story.getAttribute("href");
  await story.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Mina bolag');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=companies$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Mina bolag');
  await story.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=companies$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Mina bolag');
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Mina bolag');
  await page.getByRole("dialog").getByRole("link", { name: /Dina bevakningar/ }).click();
  await expect(page).toHaveURL(/\/marknaden\/bevakning$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(href);
  await expect(primary.locator('[aria-current="page"]')).toHaveText('Marknaden');
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
}

for (const [source, active, marketTab, width] of [
  ['/', null, null, 390],
  ['/marknaden', 'Marknaden', 'Överblick', 390],
  ['/marknaden/nyheter', 'Marknaden', 'Nyhetsflöde', 1440],
  ['/aktie/NORD.TEST?range=6m#news', 'Aktier', null, 1440],
]) {
  test(`news reader retains ${active ?? 'landing'} source navigation from ${source}`, async ({ page }) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(source);
    const navigation = page.locator(`nav[aria-label="${width < 860 ? 'Snabbmeny' : 'Huvudmeny'}"]`);
    const market = page.locator('nav[aria-label="Marknaden"]');
    const expectSourceNavigation = () => active
      ? expect(navigation.locator('[aria-current="page"]')).toHaveText(active)
      : expect(navigation.locator('[aria-current="page"]')).toHaveCount(0);
    await expectSourceNavigation();
    const story = page.locator(`${active === 'Aktier' ? '#news' : 'main'} article a[href^="/nyhet/"]`).first();
    await expect(story).toBeVisible();
    await story.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectSourceNavigation();
    if (marketTab) await expect(market.locator('[aria-current="page"]')).toHaveText(marketTab);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(source);
    await expectSourceNavigation();
    expect(state.errors).toEqual([]);
  });
}

test("header login retains the canonical personal route and filter", async ({ page }) => {
  const state = await setup(page, { email: null, verified: false, plan: "free" });
  await page.goto("/bevakning?filter=topics");
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=topics$/);
  await page.getByRole("banner").getByRole("button", { name: "Logga in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Välkommen till OMXsum" });
  await dialog.getByRole("textbox", { name: "E-postadress" }).fill("guest@example.test");
  await dialog.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  await expect(dialog.getByRole("status")).toContainText("Öppna länken vi skickat till guest@example.test");
  expect(state.loginRequests).toEqual([
    { email: "guest@example.test", redirectTo: "/marknaden/bevakning?filter=topics" },
  ]);
});
