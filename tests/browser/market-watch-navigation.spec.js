import { test, expect } from "@playwright/test";

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
  page.on("pageerror", (error) => state.errors.push(error.message));
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
          url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
        }),
      });
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  return state;
}

test("market views share three workspace links and one active primary destination", async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [path, active] of [
    ["/marknaden", "Överblick"],
    ["/marknaden/nyheter", "Nyhetsflöde"],
    ["/marknaden/bevakning", "Bevakning"],
    ["/marknaden/bevakning/hantera", "Bevakning"],
  ]) {
    await page.goto(path);
    const primary = page.getByRole("navigation", { name: "Huvudmeny", exact: true });
    await expect(primary.getByRole("link")).toHaveText(["Marknaden", "Aktier", "Breven"]);
    await expect(primary.locator('[aria-current="page"]')).toHaveText("Marknaden");
    const workspace = page.getByRole("navigation", { name: "Marknaden", exact: true });
    await expect(workspace.getByRole("link")).toHaveText(["Överblick", "Nyhetsflöde", "Bevakning"]);
    await expect(workspace.locator('[aria-current="page"]')).toHaveText(active);
    await expect(workspace.getByRole("link", { name: "Bevakning", exact: true }))
      .toHaveAttribute("href", "/marknaden/bevakning");
  }
  expect(state.errors).toEqual([]);
});

for (const width of [320, 390, 768]) {
  test(`mobile navigation has three equal touch targets at ${width}px`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marknaden/bevakning");
    const dock = page.getByRole("navigation", { name: "Snabbmeny", exact: true });
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("link")).toHaveText(["Marknaden", "Aktier", "Breven"]);
    await expect(dock.locator('[aria-current="page"]')).toHaveText("Marknaden");
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("navigation", { name: "Sidfot" })
      .getByRole("link", { name: "Terminal", exact: true })).toHaveAttribute("href", "/terminal");
  });
}

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

test("watch story navigation preserves the nested source route and direct-reader fallback", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/marknaden/bevakning?filter=companies");
  const story = page.locator('main article a[href^="/nyhet/"]').first();
  await expect(story).toBeVisible();
  const href = await story.getAttribute("href");
  await story.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=companies$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: /Dina bevakningar/ }).click();
  await expect(page).toHaveURL(/\/marknaden\/bevakning$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(href);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("header login retains the canonical personal route and filter", async ({ page }) => {
  const state = await setup(page, { email: null, verified: false, plan: "free" });
  await page.goto("/bevakning?filter=topics");
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=topics$/);
  await page.getByRole("banner").getByRole("button", { name: "Logga in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Välkommen till OMXsum" });
  await dialog.getByRole("textbox", { name: "E-postadress" }).fill("guest@example.test");
  await dialog.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  await expect(dialog.getByRole("status")).toContainText("En inloggningslänk har skickats");
  expect(state.loginRequests).toEqual([
    { email: "guest@example.test", redirectTo: "/marknaden/bevakning?filter=topics" },
  ]);
});
