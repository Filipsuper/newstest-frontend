import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

// Run against a preview with API_URL=http://127.0.0.1:8100/api and the fixture server.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__newsStreams = [];
    window.EventSource = class extends EventTarget {
      constructor(url) {
        super();
        this.url = url;
        this.closed = false;
        window.__newsStreams.push(this);
        setTimeout(() => {
          if (!this.closed) this.onopen?.();
        }, 50);
      }
      close() {
        this.closed = true;
      }
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const response = await route.fetch({
        url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
      });
      return route.fulfill({ response });
    }
    if (["127.0.0.1", "localhost"].includes(url.hostname))
      return route.continue();
    return route.abort();
  });
});

test("overview is news first and opens a URL-backed dialog with Back and forward", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/marknaden");
  await expect(
    page.getByRole("heading", { name: "Viktigast just nu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Senaste nytt", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Marknadston", { exact: true })).toHaveCount(0);
  const story = page.locator("article").first().getByRole("link").first();
  const href = await story.getAttribute("href");
  await story.click();
  await expect(page).toHaveURL(new RegExp(href));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Marknadens reaktion" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("story-dialog-desktop.png"),
  });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/marknaden$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(story).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Marknadens reaktion" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("chronological feed buffers arrivals, pauses, filters by URL and loads older news", async ({
  page,
}) => {
  await page.goto("/marknaden/nyheter");
  await expect(page.locator("article")).toHaveCount(12);
  await page.evaluate(() => {
    const stream = window.__newsStreams.findLast((source) => !source.closed);
    stream.dispatchEvent(
      new MessageEvent("story", {
        data: JSON.stringify({
          id: "incoming",
          headline: "En helt ny testnyhet",
          publishedAt: new Date().toISOString(),
          tags: ["ORDER"],
          version: 1,
          status: "flash",
        }),
      }),
    );
  });
  await expect(
    page.getByRole("button", { name: "1 nya eller uppdaterade nyheter" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "En helt ny testnyhet", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "1 nya eller uppdaterade nyheter" })
    .click();
  await expect(page.locator("article").first()).toContainText(
    "En helt ny testnyhet",
  );
  await page
    .getByRole("button", { name: "Pausa uppdateringar", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      window.__newsStreams.every((source) => source.closed),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Visa äldre nyheter" }).click();
  await expect(page.locator("article")).toHaveCount(19);
  await page.getByRole("button", { name: "Rapporter", exact: true }).click();
  await expect(page).toHaveURL(/category=reports/);
  await expect(page.locator("article")).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Rapporter", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("news rows and reader show AI prose and bullets, never the wire description", async ({ page }) => {
  const detailRequests = [];
  page.on("request", (request) => {
    if (/\/api\/feed\/news\/fixture-/.test(new URL(request.url()).pathname))
      detailRequests.push(request.url());
  });
  await page.goto("/marknaden/nyheter");
  const row = page.locator("article").filter({ has: page.locator('a[href="/nyhet/fixture-0"]') });
  await expect(row.getByText("AI-sammanfattning", { exact: true })).toBeVisible();
  await expect(row.getByRole("list", { name: "AI-sammanfattningens huvudpunkter" }).getByRole("listitem")).toHaveCount(3);
  await expect(row).toContainText("Fiktiv AI-text.");
  await expect(row).not.toContainText("Uppgifterna kommer från bolagets publicerade rapport.");
  const proseOnly = page.locator("article").filter({ has: page.locator('a[href="/nyhet/fixture-1"]') });
  await expect(proseOnly.getByRole("list")).toHaveCount(0);
  const missing = page.locator("article").filter({ has: page.locator('a[href="/nyhet/fixture-2"]') });
  await expect(missing.getByText("AI-sammanfattning", { exact: true })).toHaveCount(0);
  await expect(missing).not.toContainText("Uppgifterna kommer från bolagets publicerade rapport.");
  expect(detailRequests).toEqual([]);

  await row.getByRole("link").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("AI-sammanfattning", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole("list", { name: "AI-sammanfattningens huvudpunkter" }).first().getByRole("listitem")).toHaveCount(3);
  await expect(dialog).not.toContainText("Uppgifterna kommer från bolagets publicerade rapport.");
  await page.reload();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Fiktiv AI-text/);
  const reader = page.locator("main > article");
  expect(await reader.evaluate((element) => {
    const heading = element.querySelector("h1");
    const summary = element.querySelector("[data-reading]");
    const action = element.querySelector("button");
    return Boolean(heading.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(summary.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await page.goto("/nyhet/fixture-2");
  await expect(page.locator("[data-reading]")).toHaveCount(0);
  await expect(page.locator("main > article")).not.toContainText("Uppgifterna kommer från bolagets publicerade rapport.");
});

for (const width of [320, 1440]) {
  test(`slow dashboard loads have spaced news skeletons and no premature queue at ${width}px`, async ({ page, request }, testInfo) => {
    const body = await (await request.get("http://127.0.0.1:8100/api/feed/news")).json();
    const personal = await (await request.get("http://127.0.0.1:8100/api/user/personal-feed")).json();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route("**/api/feed/news?**", async (route) => {
      await gate;
      await route.fulfill({ json: body });
    });
    await page.route("**/api/user/personal-feed?**", async (route) => {
      await gate;
      await route.fulfill({ json: personal });
    });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/marknaden");
    const latest = page.getByRole("region", { name: "Senaste nytt", exact: true });
    const loader = latest.getByRole("status", { name: "Hämtar nyheter", exact: true });
    await expect(loader).toBeVisible();
    await expect(page.getByRole("status", { name: "Hämtar dina bevakningar" })).toBeVisible();
    await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
    expect(await page.evaluate(() => window.__newsStreams.length)).toBe(0);
    expect(await loader.evaluate((element) => ({
      gap: getComputedStyle(element).rowGap,
      rows: element.children.length,
      lines: [...element.querySelectorAll('[aria-hidden="true"]')].filter((line) => getComputedStyle(line).height === "14px").length,
    }))).toEqual({ gap: "8px", rows: 4, lines: 8 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      }, theme);
      await page.screenshot({ path: testInfo.outputPath(`dashboard-loading-${width}-${theme}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    }
    release();
    await expect(loader).toHaveCount(0);
    await expect(latest.locator("article")).toHaveCount(12);
    await expect(latest.getByText("Ansluten · Senast publicerat först")).toBeVisible();
    await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  });
}

async function emitStories(page, stories) {
  await page.evaluate(async (stories) => {
    const source = window.__newsStreams.findLast((source) => !source.closed);
    for (const story of stories)
      source.dispatchEvent(new MessageEvent("story", { data: JSON.stringify(story) }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, stories);
}

test("dashboard ignores replayed copies, internal revisions and stories outside its preview", async ({ page, request }) => {
  const body = await (await request.get("http://127.0.0.1:8100/api/feed/news")).json();
  await page.goto("/marknaden");
  const latest = page.getByRole("region", { name: "Senaste nytt", exact: true });
  await expect(latest.locator("article")).toHaveCount(12);
  await expect(latest.getByText("Ansluten · Senast publicerat först")).toBeVisible();
  const existing = body.items[1];
  await emitStories(page, [
    { ...existing, version: 2, importance: existing.importance + 1, reaction: { pct: 99 } },
    { ...existing, id: "duplicate-wire", importance: 1 },
    { ...body.items.at(-1), id: "older-wire", eventId: "older-event", publishedAt: "2026-01-01T08:00:00Z" },
  ]);
  await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  const incoming = { ...existing, id: "real-new", eventId: "real-new-event", headline: "En faktiskt ny händelse", publishedAt: new Date().toISOString() };
  await emitStories(page, [incoming, { ...incoming, id: "new-wire-copy", importance: 1 }]);
  await expect(latest.getByRole("button", { name: "1 nya eller uppdaterade nyheter" })).toBeVisible();
  await latest.getByRole("button", { name: "1 nya eller uppdaterade nyheter" }).click();
  await expect(latest.locator("article").first()).toContainText(incoming.headline);
  await emitStories(page, [incoming, { ...incoming, id: "new-wire-copy", importance: 1 }]);
  await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
});

test("failed initial news requests leave the loader and recover through retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/feed/news?**", async (route) => {
    if (fail) return route.fulfill({ status: 503, json: { error: "Temporarily unavailable", items: [] } });
    return route.fallback();
  });
  await page.goto("/marknaden");
  const latest = page.getByRole("region", { name: "Senaste nytt", exact: true });
  await expect(latest.getByRole("alert")).toContainText("Nyheterna kunde inte hämtas");
  await expect(latest.getByRole("status", { name: "Hämtar nyheter" })).toHaveCount(0);
  expect(await page.evaluate(() => window.__newsStreams.length)).toBe(0);
  fail = false;
  await latest.getByRole("button", { name: "Försök igen" }).click();
  await expect(latest.locator("article")).toHaveCount(12);
  await expect(latest.getByRole("alert")).toHaveCount(0);
  await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
});

test("a stalled dashboard request times out instead of showing skeletons indefinitely", async ({ page }) => {
  await page.route("**/api/feed/news?**", () => {});
  await page.goto("/marknaden");
  const latest = page.getByRole("region", { name: "Senaste nytt", exact: true });
  await expect(latest.getByRole("status", { name: "Hämtar nyheter" })).toBeVisible();
  await expect(latest.getByRole("alert")).toContainText("Nyheterna kunde inte hämtas", { timeout: 20000 });
  await expect(latest.getByRole("status", { name: "Hämtar nyheter" })).toHaveCount(0);
  await expect(latest.getByRole("button", { name: "Försök igen" })).toBeVisible();
  await expect(latest.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
});

test("featured headlines do not announce AI-only enrichment or hidden candidate revisions", async ({ page, request }) => {
  const snapshot = await (await request.get("http://127.0.0.1:8100/api/feed/market-overview")).json();
  await page.clock.install();
  await page.goto("/marknaden");
  const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
  await expect(featured.locator("article")).toHaveCount(3);
  let response = {
    ...snapshot,
    news: snapshot.news.map((story, index) => ({
      ...story,
      aiSummary: { text: "Uppdaterad AI-text som bara visas i läsaren." },
      ...(index === 3 ? { version: 2, headline: "Uppdaterad rubrik utanför toppurvalet" } : {}),
    })),
  };
  let refreshes = 0;
  await page.route("**/api/feed/market-overview", (route) => {
    refreshes++;
    return route.fulfill({ json: response });
  });
  await page.clock.runFor(31000);
  await expect.poll(() => refreshes).toBe(1);
  await expect(featured.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  response = { ...response, news: response.news.map((story, index) => index === 0
    ? { ...story, version: 2, headline: "Bolaget meddelar en ny helårsprognos" } : story) };
  await page.clock.runFor(30000);
  await expect(featured.getByRole("button", { name: "1 nya eller uppdaterade nyheter" })).toBeVisible();
  await featured.getByRole("button", { name: "1 nya eller uppdaterade nyheter" }).click();
  await expect(featured.locator("article").first()).toContainText("Bolaget meddelar en ny helårsprognos");
  await page.clock.runFor(31000);
  await expect(featured.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
});

test("reaction filter only announces changes that can be seen in that view", async ({ page, request }) => {
  const body = await (await request.get("http://127.0.0.1:8100/api/feed/news")).json();
  await page.goto("/marknaden/nyheter?view=reactions");
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByText("Ansluten · Störst uppmätt förändring")).toBeVisible();
  const incoming = { ...body.items[1], id: "no-reaction", eventId: "no-reaction-event", reaction: null, headline: "Nyhet utan uppmätt reaktion" };
  await emitStories(page, [incoming]);
  await expect(page.getByRole("button", { name: /nya eller uppdaterade/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Senaste", exact: true }).click();
  await page.getByRole("button", { name: "1 nya eller uppdaterade nyheter" }).click();
  await expect(page.locator("article").filter({ hasText: incoming.headline })).toBeVisible();
});

test("AI enrichment with the same story version waits for explicit feed acceptance", async ({ page, request }) => {
  const body = await (await request.get("http://127.0.0.1:8100/api/feed/news")).json();
  const enriched = { ...body.items[2], aiSummary: { text: "Ny AI-sammanfattning efter publicering.", bullets: ["Ett nytt huvudbudskap."] } };
  await page.goto("/marknaden/nyheter");
  await expect(page.locator("article")).toHaveCount(12);
  await page.evaluate((story) => {
    const source = window.__newsStreams.findLast((source) => !source.closed);
    source.dispatchEvent(new MessageEvent("story", { data: JSON.stringify(story) }));
  }, enriched);
  await expect(page.getByRole("button", { name: "1 nya eller uppdaterade nyheter" })).toBeVisible();
  await expect(page.getByText(enriched.aiSummary.text, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "1 nya eller uppdaterade nyheter" }).click();
  await expect(page.getByText(enriched.aiSummary.text, { exact: true })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
});

for (const width of [320, 390, 1440]) {
  test(`market and reader reflow at ${width}px in both themes`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/marknaden");
    await expect(page.locator("article").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // All list containers participate in the document's vertical scroll.
    expect(
      await page
        .locator("main")
        .evaluate((element) => getComputedStyle(element).overflowY),
    ).toBe("visible");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      }, theme);
      await page.screenshot({
        path: testInfo.outputPath(`market-${width}-${theme}.png`),
        fullPage: true,
      });
      expect(
        (
          await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.locator("article").first().getByRole("link").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: "Marknadens reaktion" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`reader-${width}.png`) });
  });
}

test("direct story has social metadata, missing data is not zero, and OG variants render", async ({
  page,
  request,
  context,
}, testInfo) => {
  await page.goto("/nyhet/missing-data");
  await expect(
    page.getByText("Inväntar kursdata", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://omxsum.com/nyhet/missing-data/opengraph-image?v=3",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://omxsum.com/nyhet/missing-data",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Kopiera länk", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "https://omxsum.com/nyhet/missing-data",
  );
  for (const id of ["fixture-0", "fixture-1", "missing-data", "long-title"]) {
    const response = await request.get(`/nyhet/${id}/opengraph-image`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    await testInfo.attach(`og-${id}.png`, {
      body: await response.body(),
      contentType: "image/png",
    });
    await writeFile(testInfo.outputPath(`og-${id}.png`), await response.body());
  }
  const missing = await request.get("/nyhet/not-real/opengraph-image");
  expect(missing.status()).toBe(404);
});

test("letter library reads and paginates while following remains separate from alerts", async ({
  page,
}) => {
  await page.goto("/nyhetsbrev");
  await expect(
    page.getByRole("heading", { name: "Breven", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(12);
  await page.getByRole("button", { name: "Visa äldre brev" }).click();
  await expect(page.locator("article")).toHaveCount(16);
  await page.getByRole("button", { name: "Kvällsbrevet", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(8);
  await page.goto("/nyhet/fixture-1");
  const follow = page.getByRole("button", {
    name: "Följ Skärgården Teknik",
    exact: true,
  });
  await follow.click();
  await expect(
    page.getByRole("button", {
      name: "Sluta följa Skärgården Teknik",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/bevakning");
  await expect(page.getByText("Bolag du följer").first()).toBeVisible();
  await expect(
    page.getByText("Att följa något ändrar ditt flöde.", { exact: false }),
  ).toBeVisible();
});

test("free readers see a labelled selection and cannot fetch the Plus feed", async ({
  page,
}) => {
  let feedRequests = 0;
  await page.route("**/api/user", (route) =>
    route.fulfill({ json: { email: null, verified: false, plan: "free" } }),
  );
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/feed/news")) feedRequests++;
  });
  await page.goto("/marknaden");
  await expect(
    page.getByText("Senaste i det publika urvalet", { exact: false }),
  ).toBeVisible();
  await page.goto("/marknaden/nyheter");
  await expect(
    page.getByRole("heading", { name: "Följ hela nyhetsflödet med Plus" }),
  ).toBeVisible();
  expect(feedRequests).toBe(0);
  await page.goto("/nyhet/fixture-0");
  await page
    .getByRole("button", { name: "Följ Norden Industri", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Spara din bevakning" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "E-postadress" }),
  ).toBeVisible();
});

test("search uses the keyboard and related stories retain their own identity", async ({
  page,
}) => {
  await page.goto("/marknaden");
  const search = page.getByRole("combobox");
  await search.fill("Norden");
  await expect(
    page.getByRole("option", { name: /Norden Industri/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sök ”Norden” i nyheterna ↗" }),
  ).toHaveAttribute("href", "/marknaden/nyheter?q=Norden");
  await page.keyboard.press("Escape");
  await page.locator("article").first().getByRole("link").first().click();
  await expect(
    page.getByRole("heading", { name: "Fler nyheter om bolaget" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Lägre marginaler/ })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /Lägre marginaler/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/fixture-3$/);
});

test("company chart introduces a continuous news-led report, including without price history", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/aktie/NORD.TEST");
  const heading = page.getByRole("heading", {
    name: "Nyheter & reaktioner",
  });
  await expect(heading).toBeVisible();
  const chart = page.getByRole("group", {
    name: "Kursutveckling för Norden Industri",
    exact: true,
  });
  expect((await heading.boundingBox()).y).toBeGreaterThan(
    (await chart.boundingBox()).y,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("company-mobile.png") });
  await page.locator("#news article").first().getByRole("link").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/aktie\/NORD.TEST$/);
  await page.goto("/aktie/FJALL.TEST");
  await expect(
    page.getByRole("heading", { name: "Nyheter & reaktioner" }),
  ).toBeVisible();
  await expect(
    page.locator("main:visible").getByText("Ingen historisk kursdata är tillgänglig ännu."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile preferences preserve unsaved keywords after a failed save", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/api/user/keywords", (route) =>
    route.fulfill({ status: 503, json: { error: "Försök igen senare." } }),
  );
  await page.goto("/bevakning/hantera");
  await page.getByText("Nyckelord · 0/10", { exact: true }).click();
  const field = page.getByRole("textbox", { name: "Nytt nyckelord" });
  await field.fill("halvledare");
  await page.getByRole("button", { name: "Lägg till nyckelord" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Försök igen senare.",
  );
  await expect(field).toHaveValue("halvledare");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
