import test from "node:test";
import assert from "node:assert/strict";
import { landingNews, landingLetter } from "../app/utils/landing.js";
import { fetchAllArticles, fetchMarketOverview } from "../app/utils/api.js";

const now = "2026-09-07T10:00:00Z";
const story = (id, overrides = {}) => ({
  id,
  eventId: id,
  headline: `Nyhet ${id}`,
  publishedAt: now,
  companies: [{ symbol: `${id}.TEST`, name: `Bolag ${id}` }],
  importance: 70,
  primarySource: { name: "Fiktiv källa" },
  tags: ["EARNINGS"],
  ...overrides,
});

test("landing news is a bounded material selection, not the biggest percentage or a demo", () => {
  const result = landingNews(
    {
      news: [
        story("routine", {
          tags: ["INSIDER"],
          reaction: { pct: 150 },
          importance: 100,
        }),
        story("admin", {
          headline: "Inbjudan till årsstämma",
          importance: 100,
        }),
        story("future", { publishedAt: "2026-09-08T10:00:00Z" }),
        story("old", { publishedAt: "2026-08-01T10:00:00Z" }),
        story("withdrawn", { status: "withdrawn" }),
        story("../unsafe"),
        null,
        story("a", {
          importance: 95,
          aiSummary: { text: "Faktisk AI-text", bullets: ["En uppgift"] },
        }),
        story("duplicate", { eventId: "a", importance: 80 }),
        story("b"),
        story("c"),
      ],
    },
    now,
  );
  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.stories.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(result.stories[0].aiSummary.text, "Faktisk AI-text");
  assert.equal(result.stories[0].reaction, null);
});

test("news empty, failed and retained stale sources stay distinct", () => {
  assert.equal(landingNews({ news: [] }, now).status, "empty");
  for (const overview of [
    null,
    {},
    { error: true, news: [] },
    { unavailable: true },
  ])
    assert.equal(landingNews(overview, now).status, "unavailable");
  const result = landingNews(
    { news: { items: [story("a")] }, stale: true },
    now,
  );
  assert.equal(result.status, "ready");
  assert.equal(result.stale, true);
});

test("preview requests preserve timeouts and do not treat HTTP failures as empty data", async (t) => {
  const calls = [];
  let failed = false;
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify(url.endsWith("/data") ? [] : { news: [] }),
      {
        status: failed ? 503 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await fetchAllArticles({ signal }), []);
  assert.deepEqual(await fetchMarketOverview({ signal }), { news: [] });
  assert.equal(calls[0].options.signal, signal);
  assert.equal(calls[1].options.signal, signal);
  failed = true;
  await assert.rejects(fetchAllArticles({ signal }), /hämta breven/);
  await assert.rejects(fetchMarketOverview({ signal }), /marknadsöversikten/);
});

test("letter preview respects publication and Stockholm evening cutoff, including sparse archives", () => {
  const morning = { title: "Morgon", createdAt: "2026-09-07T06:00:00Z" };
  const evening = {
    title: "Kväll",
    createdAt: "2026-09-07T15:29:00Z",
    isEveningLetter: true,
  };
  const older = {
    title: "Föregående kväll",
    createdAt: "2026-09-04T15:30:00Z",
    isEveningLetter: true,
  };
  const articles = [
    evening,
    null,
    { title: "Trasigt datum", createdAt: "invalid" },
    morning,
  ];
  assert.equal(
    landingLetter(articles, "2026-09-07T15:29:30Z").article.title,
    "Morgon",
  );
  assert.equal(
    landingLetter(articles, "2026-09-07T15:30:00Z").article.title,
    "Kväll",
  );
  assert.equal(landingLetter([evening], now).status, "empty");
  assert.equal(
    landingLetter([evening], "2026-09-07T15:29:30Z").status,
    "empty",
  );
  assert.equal(landingLetter([older], now).article.title, "Föregående kväll");
  assert.equal(landingLetter(null, now).status, "unavailable");
  assert.equal(landingLetter([], now).status, "empty");
});
