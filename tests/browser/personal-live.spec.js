import { test, expect } from "@playwright/test";

// Each test owns its response snapshots; shared fixture state is only read.
async function setup(page, request) {
  const [personalResponse, overviewResponse] = await Promise.all([
    request.get("http://127.0.0.1:8100/api/user/personal-feed"),
    request.get("http://127.0.0.1:8100/api/feed/market-overview"),
  ]);
  const state = {
    personal: await personalResponse.json(),
    overview: await overviewResponse.json(),
    personalReads: 0,
    overviewReads: 0,
    personalGate: null,
    personalStatus: 200,
    errors: [],
  };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.clock.install();
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/user")
      return route.fulfill({ json: {
        email: "personal-live@example.test", verified: true, plan: "free",
        watchlist: ["NORD.TEST"], topics: [], keywords: ["orderingång"],
      } });
    if (url.pathname === "/api/user/personal-feed") {
      state.personalReads++;
      const body = structuredClone(state.personal);
      const status = state.personalStatus;
      if (state.personalGate) await state.personalGate;
      return route.fulfill({ status, json: body });
    }
    if (url.pathname === "/api/feed/market-overview") {
      state.overviewReads++;
      return route.fulfill({ json: state.overview });
    }
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({ response: await route.fetch({
        url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
      }) });
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  return state;
}

function newStory(source, id, headline) {
  return {
    ...source,
    id,
    eventId: `${id}-event`,
    version: 1,
    headline,
    publishedAt: new Date().toISOString(),
    viaWatchlist: true,
  };
}

async function openPersonal(page) {
  await page.goto("/marknaden/bevakning");
  const region = page.getByRole("region", { name: "Personliga nyheter", exact: true });
  await expect(region.locator("article")).toHaveCount(3);
  await expect(region.getByRole("status", { name: "Hämtar nyheter" })).toHaveCount(0);
  return region;
}

const clickGate = /nya eller uppdaterade|Visa nya|Uppdatera urval/;

test("personal snapshots insert new stories and revisions after 30 seconds without a click gate", async ({ page, request }) => {
  const state = await setup(page, request);
  const region = await openPersonal(page);
  const arrival = newStory(state.personal.stories[1], "personal-arrival", "Fiktiv ny order visas automatiskt");
  const revised = { ...state.personal.stories[0], version: 2, headline: "Fiktiv helårsprognos har uppdaterats" };
  state.personal = { ...state.personal, stories: [arrival, revised, ...state.personal.stories.slice(1)] };
  const before = state.personalReads;
  await page.clock.runFor(30_100);
  await expect.poll(() => state.personalReads).toBeGreaterThan(before);
  await expect(region.locator("article")).toHaveCount(4);
  await expect(region.locator("article").first()).toContainText(arrival.headline);
  await expect(region.locator(`[data-live-news-id="${revised.id}"]`)).toContainText(revised.headline);
  await expect(region.getByRole("button", { name: clickGate })).toHaveCount(0);
  await expect(region.getByRole("status", { name: "Hämtar nyheter" })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("a company and keyword match remains visible in both URL-backed filters after reload", async ({ page, request }) => {
  const state = await setup(page, request);
  const overlap = {
    ...state.personal.stories[0],
    viaWatchlist: true,
    matchedKeyword: "orderingång",
    headline: "Fiktiv orderingång matchar både bolag och nyckelord",
  };
  state.personal = { ...state.personal, stories: [overlap] };
  await page.goto("/marknaden/bevakning?filter=companies");
  const region = page.getByRole("region", { name: "Personliga nyheter", exact: true });
  const filters = region.getByRole("group", { name: "Filtrera bevakning", exact: true });
  await expect(filters.getByRole("button", { name: "Bolag", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.locator("article")).toHaveCount(1);
  await expect(region.locator("article")).toContainText(overlap.headline);
  await expect(region.locator("article")).toContainText("Matchar ”orderingång”");
  await filters.getByRole("button", { name: "Nyckelord", exact: true }).click();
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=keywords$/);
  await expect(region.locator("article")).toHaveCount(1);
  await expect(region.locator("article")).toContainText(overlap.headline);
  await page.reload();
  await expect(filters.getByRole("button", { name: "Nyckelord", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.locator("article")).toHaveCount(1);
  await filters.getByRole("button", { name: "Bolag", exact: true }).click();
  await expect(page).toHaveURL(/\/marknaden\/bevakning\?filter=companies$/);
  await expect(region.locator("article")).toContainText(overlap.headline);
  expect(state.errors).toEqual([]);
});

test("pausing retains personal rows and resuming catches up without replacing them with skeletons", async ({ page, request }) => {
  const state = await setup(page, request);
  const region = await openPersonal(page);
  const originalTitle = state.personal.stories[0].headline;
  const before = state.personalReads;
  await region.getByRole("button", { name: "Pausa uppdateringar", exact: true }).click();
  await expect(region.getByRole("button", { name: "Återuppta", exact: true })).toHaveAttribute("aria-pressed", "true");
  const arrival = newStory(state.personal.stories[1], "personal-during-pause", "Fiktiv nyhet publicerad under pausen");
  state.personal = { ...state.personal, stories: [arrival, ...state.personal.stories] };
  await page.clock.runFor(60_100);
  expect(state.personalReads).toBe(before);
  await expect(region.locator("article")).toHaveCount(3);
  await expect(region.locator("article").first()).toContainText(originalTitle);
  await expect(region.getByText(arrival.headline, { exact: true })).toHaveCount(0);

  let release;
  state.personalGate = new Promise((resolve) => { release = resolve; });
  try {
    await region.getByRole("button", { name: "Återuppta", exact: true }).click();
    await expect.poll(() => state.personalReads).toBeGreaterThan(before);
    // The network is deliberately unresolved, so this checks the actual resume state.
    await expect(region.locator("article")).toHaveCount(3);
    await expect(region.locator("article").first()).toContainText(originalTitle);
    await expect(region.getByRole("status", { name: "Hämtar nyheter" })).toHaveCount(0);
  } finally {
    state.personalGate = null;
    release();
  }
  await expect(region.locator("article")).toHaveCount(4);
  await expect(region.locator("article").first()).toContainText(arrival.headline);
  await expect(region.getByRole("button", { name: clickGate })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("the overview refreshes its featured headline and personal preview automatically", async ({ page, request }) => {
  const state = await setup(page, request);
  await page.goto("/marknaden");
  const featured = page.getByRole("region", { name: "Viktigast just nu", exact: true });
  const personal = page.getByRole("region", { name: "Dina bevakningar", exact: true });
  await expect(personal.locator("article")).toHaveCount(2);
  await expect.poll(() => state.overviewReads).toBeGreaterThan(0);
  const original = featured.locator('article a[href^="/nyhet/"]').first();
  await expect(original).toBeVisible();
  const id = (await original.getAttribute("href")).split("/").at(-1);
  const headline = "Fiktivt bolag höjer helårsprognosen efter stark orderingång";
  state.overview = {
    ...state.overview,
    news: state.overview.news.map((story) => story.id === id
      ? { ...story, version: (story.version ?? 1) + 1, headline }
      : story),
  };
  const arrival = newStory(state.personal.stories[1], "overview-personal-arrival", "Fiktiv personlig nyhet i överblicken");
  state.personal = { ...state.personal, stories: [arrival, ...state.personal.stories] };
  const before = { market: state.overviewReads, personal: state.personalReads };
  await page.clock.runFor(30_100);
  await expect.poll(() => state.overviewReads).toBeGreaterThan(before.market);
  await expect.poll(() => state.personalReads).toBeGreaterThan(before.personal);
  // A news link's accessible name includes its company before the headline.
  const updatedStory = featured.locator(`a[href="/nyhet/${id}"]`);
  await expect(updatedStory).toBeVisible();
  await expect(updatedStory).toContainText(headline);
  await expect(personal.locator("article")).toHaveCount(2);
  await expect(personal.locator("article").first()).toContainText(arrival.headline);
  await expect(page.getByRole("main").getByRole("button", { name: clickGate })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("a shared since-last-visit URL explains a missing local baseline and offers all matches", async ({ page, request }) => {
  const state = await setup(page, request);
  // A fresh Playwright context has no marker for this account/device.
  await page.goto("/marknaden/bevakning?filter=new");
  const region = page.getByRole("region", { name: "Personliga nyheter", exact: true });
  await expect(region.getByRole("button", { name: "Sedan sist", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(region.getByText("Inget tidigare besök på den här enheten", { exact: true })).toBeVisible();
  await expect(region.getByText("Du är ikapp", { exact: true })).toHaveCount(0);
  await expect(region.locator("article")).toHaveCount(0);
  await region.getByRole("button", { name: "Visa alla matchningar", exact: true }).click();
  await expect(page).toHaveURL(/\/marknaden\/bevakning$/);
  await expect(region.locator("article")).toHaveCount(3);
  await expect(region.getByRole("button", { name: "Alla", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  expect(state.errors).toEqual([]);
});

test("an empty personal preview retains its empty state during the next pending poll", async ({ page, request }) => {
  const state = await setup(page, request);
  state.personal = { ...state.personal, stories: [] };
  await page.goto("/marknaden");
  const preview = page.getByRole("region", { name: "Dina bevakningar", exact: true });
  const empty = preview.getByText("Inga nya matchningar just nu. Dina bevakningar är sparade.", { exact: true });
  const skeleton = preview.getByRole("status", { name: "Hämtar dina bevakningar", exact: true });
  await expect(empty).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  await expect.poll(() => state.personalReads).toBeGreaterThan(0);
  const before = state.personalReads;
  let release;
  state.personalGate = new Promise((resolve) => { release = resolve; });
  try {
    await page.clock.runFor(30_100);
    await expect.poll(() => state.personalReads).toBeGreaterThan(before);
    await expect(empty).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    await expect(preview.locator("article")).toHaveCount(0);
  } finally {
    state.personalGate = null;
    release();
  }
  await expect(empty).toBeVisible();
  expect(state.errors).toEqual([]);
});

test("a failed personal preview refresh retains its news with a quiet error and retry", async ({ page, request }) => {
  const state = await setup(page, request);
  await page.goto("/marknaden");
  const preview = page.getByRole("region", { name: "Dina bevakningar", exact: true });
  const skeleton = preview.getByRole("status", { name: "Hämtar dina bevakningar", exact: true });
  await expect(preview.locator("article")).toHaveCount(2);
  const initialTitles = await preview.locator('article a[href^="/nyhet/"]').allTextContents();
  const before = state.personalReads;
  state.personalStatus = 503;
  await page.clock.runFor(30_100);
  await expect.poll(() => state.personalReads).toBeGreaterThan(before);
  await expect(preview.getByRole("status"))
    .toHaveText("Kunde inte uppdatera. Visar senast hämtade nyheter.");
  await expect(preview.locator("article")).toHaveCount(2);
  expect(await preview.locator('article a[href^="/nyhet/"]').allTextContents()).toEqual(initialTitles);
  await expect(skeleton).toHaveCount(0);
  const arrival = newStory(state.personal.stories[1], "preview-retry-arrival", "Fiktiv personlig nyhet efter återhämtning");
  state.personal = { ...state.personal, stories: [arrival, ...state.personal.stories] };
  state.personalStatus = 200;
  await preview.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(preview.locator("article").first()).toContainText(arrival.headline);
  await expect(preview.locator("article")).toHaveCount(2);
  await expect(preview.getByText("Kunde inte uppdatera. Visar senast hämtade nyheter.", { exact: true })).toHaveCount(0);
  await expect(skeleton).toHaveCount(0);
  expect(state.errors).toEqual([]);
});
