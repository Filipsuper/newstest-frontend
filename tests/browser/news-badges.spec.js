import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 1440]) {
  test(`news omits unavailable badges and their space but retains zero at ${width}px`, async ({ page, request }, testInfo) => {
    const fixture = await (await request.get("http://127.0.0.1:8100/api/feed/news")).json();
    const source = fixture.items[0];
    const cases = [["missing", null], ["invalid", "2.4"], ["waiting", 22],
      ["zero", 0], ["positive", 2.4], ["negative", -2.4]];
    const stories = cases.map(([kind, pct], index) => {
      const story = { ...source, id: `badge-${kind}`, eventId: `badge-event-${kind}`, facts: {},
        headline: `Fiktivt exempel ${kind}`, publishedAt: new Date(Date.now() - index * 60_000).toISOString(),
        reaction: pct === null ? null : { pct }, reactionV2: null,
        companyContext: null, marketContext: null };
      if (kind === "waiting") story.reactionV2 = {
        schemaVersion: 2, storyId: story.id, storyVersion: story.version,
        publishedAt: story.publishedAt, measurements: [{
          symbol: story.companies[0].symbol, status: "waiting_for_session",
          session: { open: new Date(Date.now() + 3_600_000).toISOString() }, windows: {},
        }],
      };
      return story;
    });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/feed/news") return route.fulfill({ json: { items: stories, nextCursor: null } });
      if (url.pathname === "/api/feed/news/observations") return route.fulfill({ json: { items: [] } });
      if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({
        url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
      }) });
      return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.abort();
    });
    await page.goto("/marknaden/nyheter");
    const rows = page.locator("main article");
    await expect(rows).toHaveCount(cases.length);
    const row = kind => rows.filter({ has: page.locator(`a[href$="~badge-${kind}"]`) });
    for (const kind of ["missing", "invalid", "waiting"]) {
      await expect(row(kind).getByText("Nyhet", { exact: true })).toHaveCount(0);
      await expect(row(kind).locator('span[aria-label]')).toHaveCount(0);
      // The body takes the full padded row width, with no empty badge column.
      const geometry = await row(kind).evaluate(element => {
        const headline = element.querySelector('a[href^="/nyhet/"]').getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return { children: element.children.length,
          inset: headline.left - bounds.left, padding: parseFloat(getComputedStyle(element).paddingLeft) };
      });
      expect(geometry.children).toBe(1);
      expect(geometry.inset).toBeCloseTo(geometry.padding, 0);
    }
    await expect(row("waiting")).toContainText("Inväntar börsöppning");
    await expect(row("waiting")).not.toContainText("+22,0 %");
    for (const [kind, value] of [["zero", "0,0 %"], ["positive", "+2,4 %"], ["negative", "−2,4 %"]]) {
      await expect(row(kind).locator('span[aria-label]').filter({ hasText: value })).toBeVisible();
      await expect(row(kind)).toContainText("Sedan publicering");
    }
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      }, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`news-badges-${width}-${theme}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
