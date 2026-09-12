import { test, expect } from "@playwright/test";

for (const close of ["browser Back", "close button"]) {
  test(`unfinished story dialog recovers on Forward after ${close}`, async ({ page }) => {
    const errors = [];
    const pendingRoutes = [];
    let clientRequests = 0;
    let releaseClient;
    let releaseRsc;
    const clientGate = new Promise((resolve) => { releaseClient = resolve; });
    const rscGate = new Promise((resolve) => { releaseRsc = resolve; });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.EventSource = class extends EventTarget { close() {} };
    });
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/user") return route.fulfill({ json: {
        email: "history@example.test", verified: true, plan: "plus",
        watchlist: ["NORD.TEST"], topics: [], keywords: [],
      } });
      if (url.pathname.startsWith("/nyhet/") && request.headers().rsc && !request.headers()["next-router-prefetch"]) {
        pendingRoutes.push(url.pathname);
        // Keep the server-rendered reader unavailable throughout the assertion.
        // The restored dialog must recover independently through its client API.
        await rscGate;
      }
      if (/^\/api\/feed\/news\/[^/]+$/.test(url.pathname)) {
        clientRequests += 1;
        await clientGate;
      }
      if (url.pathname.startsWith("/api/")) return route.fulfill({
        response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }),
      });
      return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
    });

    try {
      await page.goto("/marknaden/bevakning?filter=companies");
      const story = page.locator('main article a[href^="/nyhet/"]').first();
      await expect(story).toBeVisible();
      const href = await story.getAttribute("href");
      await story.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect.poll(() => pendingRoutes.length).toBeGreaterThan(0);
      await expect(page.getByRole("dialog").locator('[aria-busy="true"]')).toBeVisible();
      if (close === "browser Back") await page.goBack();
      else await page.getByRole("dialog").getByRole("button", { name: "Stäng dialog" }).click();
      await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=companies$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.goForward();
      await expect.poll(() => new URL(page.url()).pathname).toBe(href);
      await expect(page.getByRole("dialog")).toBeVisible();
      releaseClient();
      await expect(page.getByRole("dialog").getByRole("heading", { level: 1 })).toBeVisible();
      expect(clientRequests).toBeGreaterThan(0);
      await expect(page.getByRole("dialog").getByRole("link", { name: /Dina bevakningar/ })).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      releaseClient();
      releaseRsc();
    }
  });
}
