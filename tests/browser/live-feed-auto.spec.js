import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__newsStreams = [];
    window.EventSource = class extends EventTarget {
      constructor(url) {
        super();
        this.url = url;
        this.closed = false;
        window.__newsStreams.push(this);
        setTimeout(() => { if (!this.closed) this.onopen?.(); }, 50);
      }
      close() { this.closed = true; }
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const response = await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` });
      return route.fulfill({ response });
    }
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
});

async function snapshot(request) {
  return (await (await request.get("http://127.0.0.1:8100/api/feed/news")).json()).items;
}

async function emit(page, stories) {
  await page.evaluate((stories) => {
    const stream = window.__newsStreams.findLast((source) => !source.closed);
    for (const story of stories) stream.dispatchEvent(new MessageEvent("story", { data: JSON.stringify(story) }));
  }, stories);
}

async function openFeed(page, search = "") {
  await page.goto(`/marknaden/nyheter${search}`);
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByText(/Ansluten ·/)).toBeVisible();
}

function incoming(story, id, changes = {}) {
  return {
    ...story,
    id,
    eventId: `${id}-event`,
    headline: `Automatisk nyhet ${id}`,
    publishedAt: new Date().toISOString(),
    // A distinct event must not inherit the source event's extracted facts:
    // fact-based deduplication intentionally takes precedence over eventId.
    facts: {},
    marketContext: null,
    companyContext: null,
    reactionV2: null,
    ...changes,
  };
}

test("automatic arrivals deduplicate and reject stale versions and withdrawn replays", async ({ page, request }) => {
  const stories = await snapshot(request);
  await openFeed(page);
  const original = incoming(stories[1], "automatic-version");
  await emit(page, [original, { ...original, id: "same-event-wire", importance: 1 }]);
  await expect(page.locator("article")).toHaveCount(13);
  await expect(page.locator("article").first()).toContainText(original.headline);
  await emit(page, [{ ...original, version: 3, headline: "Den senaste nyhetsversionen" }]);
  await expect(page.locator("article").first()).toContainText("Den senaste nyhetsversionen");
  await emit(page, [original, { ...original, version: 2, status: "withdrawn" }]);
  await expect(page.locator("article").first()).toContainText("Den senaste nyhetsversionen");
  await emit(page, [{ ...original, version: 4, status: "withdrawn" }]);
  await expect(page.locator("article")).toHaveCount(12);
  await emit(page, [{ ...original, version: 3 }, { ...original, version: 4 }]);
  await expect(page.locator("article")).toHaveCount(12);
  await expect(page.getByRole("button", { name: /nya eller uppdaterade|Visa nya|Uppdatera urval/ })).toHaveCount(0);
});

for (const width of [390, 1440]) {
  test(`automatic prepend keeps the visible story and scroll position at ${width}px`, async ({ page, request }) => {
    const stories = await snapshot(request);
    await page.setViewportSize({ width, height: 900 });
    await openFeed(page);
    const anchor = page.locator('[data-live-news-id="fixture-5"]');
    await anchor.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top, behavior: "instant" });
    });
    const before = await anchor.boundingBox();
    await emit(page, [incoming(stories[1], `prepend-${width}`)]);
    await expect(page.locator("article")).toHaveCount(13);
    await expect.poll(async () => Math.abs((await anchor.boundingBox()).y - before.y)).toBeLessThan(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("automatic arrivals leave an open reader and its headline intact", async ({ page, request }) => {
  const stories = await snapshot(request);
  await openFeed(page);
  await page.locator('[data-live-news-id="fixture-1"] article').getByRole("link").first().click();
  const reader = page.getByRole("dialog");
  await expect(reader).toBeVisible();
  const url = page.url();
  const title = await reader.getByRole("heading", { level: 1 }).textContent();
  await emit(page, [incoming(stories[2], "while-reading"), { ...stories[1], version: 2, headline: "Ny rubrik i bakgrundsflödet" }]);
  await expect(reader).toBeVisible();
  await expect(page).toHaveURL(url);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator('[data-live-news-id="while-reading"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("article").first()).toContainText("Automatisk nyhet while-reading");
  await expect(page.locator('[data-live-news-id="fixture-1"]')).toContainText("Ny rubrik i bakgrundsflödet");
});

test("pause freezes updates and resume catches up automatically with the existing cursor", async ({ page, request }) => {
  const stories = await snapshot(request);
  await openFeed(page);
  await page.getByRole("button", { name: "Pausa uppdateringar", exact: true }).click();
  const arrival = incoming(stories[1], "during-pause");
  await page.route("**/api/feed/news?**", (route) => {
    if (new URL(route.request().url()).searchParams.has("cursor")) return route.fallback();
    return route.fulfill({ json: { items: [arrival, ...stories], nextCursor: "different-live-cursor" } });
  });
  await page.evaluate((story) => {
    const stream = window.__newsStreams.at(-1);
    stream.dispatchEvent(new MessageEvent("story", { data: JSON.stringify(story) }));
  }, arrival);
  await expect(page.locator("article")).toHaveCount(12);
  await page.getByRole("button", { name: "Återuppta", exact: true }).click();
  await expect(page.locator("article").first()).toContainText(arrival.headline);
  const olderRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get("cursor") === "page2");
  await page.getByRole("button", { name: "Visa äldre nyheter" }).click();
  await olderRequest;
  await expect(page.locator("article")).toHaveCount(19);
});

test("60-second fallback inserts missed news without a stream frame", async ({ page, request }) => {
  const stories = await snapshot(request);
  await page.clock.install();
  await openFeed(page);
  let polls = 0;
  const arrival = incoming(stories[1], "fallback-arrival");
  await page.route("**/api/feed/news?**", (route) => {
    polls++;
    return route.fulfill({ json: { items: [arrival, ...stories], nextCursor: "page2" } });
  });
  await page.clock.runFor(60_100);
  await expect.poll(() => polls).toBeGreaterThan(0);
  await expect(page.locator("article").first()).toContainText(arrival.headline);
  await expect(page.getByRole("button", { name: /nya eller uppdaterade|Visa nya/ })).toHaveCount(0);
});

test("quote-only updates stay in place and real news refreshes reaction selection automatically", async ({ page, request }) => {
  const stories = await snapshot(request);
  await openFeed(page, "?view=reactions");
  const ids = () => page.locator("[data-live-news-id]").evaluateAll((rows) => rows.map((row) => row.dataset.liveNewsId));
  const initialOrder = await ids();
  const updated = { ...stories[1], reaction: { ...stories[1].reaction, pct: 99, asOf: Date.now() } };
  await emit(page, [updated]);
  await expect(page.locator('[data-live-news-id="fixture-1"]')).toContainText("+99");
  expect(await ids()).toEqual(initialOrder);
  await emit(page, [incoming(stories[2], "fresh-selection", { reaction: { pct: 5 } })]);
  await expect(page.locator('[data-live-news-id="fresh-selection"]')).toHaveCount(1);
  await expect.poll(async () => (await ids())[0]).toBe("fixture-1");
  await expect(page.getByRole("button", { name: /nya eller uppdaterade|Visa nya|Uppdatera urval/ })).toHaveCount(0);
});

test("automatic arrivals respect URL category filters and a search stays a stable result", async ({ page, request }) => {
  const stories = await snapshot(request);
  await page.goto("/marknaden/nyheter?category=reports");
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page.getByText(/Ansluten ·/)).toBeVisible();
  const report = incoming(stories[0], "new-report");
  await emit(page, [incoming(stories[1], "outside-category"), report]);
  await expect(page.locator("article")).toHaveCount(4);
  await expect(page.locator("article").first()).toContainText(report.headline);
  await emit(page, [{ ...report, version: 2, tags: ["ORDER"] }]);
  await expect(page.locator("article")).toHaveCount(3);
  await page.getByRole("textbox", { name: "Sök i nyhetsflödet" }).fill("none");
  await page.getByRole("button", { name: "Sök", exact: true }).click();
  await expect(page).toHaveURL(/category=reports&q=none/);
  await expect(page.getByText("Inga nyheter i urvalet", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__newsStreams.every((source) => source.closed))).toBe(true);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Sök i nyhetsflödet" })).toHaveValue("none");
  await expect(page.getByRole("button", { name: "Rapporter", exact: true })).toHaveAttribute("aria-pressed", "true");
});
