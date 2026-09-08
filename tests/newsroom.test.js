import test from "node:test";
import assert from "node:assert/strict";
import {
  featuredNews,
  changedFeedItems,
  mergeFeed,
  pendingChanges,
  normalizeStory,
  safeSourceUrl,
  storyHref,
} from "../app/utils/newsroom.js";
import { currentLetter } from "../app/utils/letters.js";
import { reactionGeometry } from "../app/utils/reactionGeometry.js";

test("reaction curves leave explicit missing samples as gaps", () => {
  const result = reactionGeometry(
    {
      points: [
        { t: 1, pct: 0 },
        { t: 2, pct: 1 },
        { t: 3, pct: null },
        { t: 4, pct: 2 },
        { t: 5, pct: 3 },
      ],
    },
    2,
  );
  assert.equal(result.path.match(/M/g).length, 2);
  assert.equal(result.area.match(/Z/g).length, 2);
  assert.equal(result.points.length, 4);
});

const now = Date.parse("2026-09-04T16:00:00Z");
const item = (overrides) => ({
  id: "story",
  title: "Bolaget höjer prognosen",
  ts: now - 3600_000,
  importance: 90,
  labels: ["GUIDANCE"],
  version: 1,
  ...overrides,
});
test("selection excludes administrative notices, routine filings and old events without requiring a reaction", () => {
  const result = featuredNews(
    [
      item({ id: "admin", title: "Invitation to Investor Briefing" }),
      item({
        id: "insider",
        labels: ["INSIDER"],
        facts: { grossValue: 2_899_863 },
        reaction: { pct: 20 },
      }),
      item({ id: "old", ts: now - 100 * 3600_000 }),
      item({ id: "future", ts: now + 1000 }),
      item({ id: "report" }),
    ],
    now,
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["report"],
  );
});
test("material importance can outrank a less important story with a large move", () => {
  const result = featuredNews(
    [
      item({ id: "material", importance: 95 }),
      item({ id: "moving", importance: 65, reaction: { pct: 20 } }),
    ],
    now,
  );
  assert.equal(result[0].id, "material");
});
test("feed keeps older history, collapses event copies, and rejects older versions", () => {
  const old = item({ id: "history", ts: now - 3600_000 * 10 });
  const existing = item({ version: 2, title: "Uppdaterad rubrik" });
  const result = mergeFeed(
    [old, existing],
    [item({ version: 1 }), item({ id: "new", ts: now })],
  );
  assert.equal(result.length, 3);
  assert.equal(
    result.find((item) => item.id === "story").title,
    "Uppdaterad rubrik",
  );
  assert.equal(
    pendingChanges([existing], [{ ...existing, reaction: { pct: 4 } }])
      .length,
    0,
  );
  assert.equal(pendingChanges([existing], [item({ version: 3, title: "Ny prognos" })]).length, 1);
});
test("pending counts reflect rendered events, not replays, versions or duplicate wire IDs", () => {
  const existing = item({ eventId: "event-1", version: 2, language: "sv", sourceCount: 1, sourceNames: ["MFN"] });
  for (const incoming of [
    { ...existing, version: 3, reaction: { pct: 8 } },
    { ...existing, version: 3, summary: "Ny intern beskrivning", importance: 92 },
    { ...existing, id: "wire-copy", language: "en", title: "Another language" },
    { ...existing, status: "withdrawn" },
  ]) assert.equal(pendingChanges([existing], [incoming]).length, 0);
  const next = item({ id: "new", eventId: "new-event", title: "Ett nytt avtal" });
  assert.equal(pendingChanges([existing], [next, { ...next, id: "new-copy" }]).length, 1);
  const accepted = mergeFeed([existing], [next]);
  assert.equal(pendingChanges(accepted, [next, { ...next, id: "new-copy" }]).length, 0);
});
test("the same fact-based deduplication is used for rows and update counts", () => {
  const existing = item({ facts: { contractValue: 100 }, symbol: "TEST.ST" });
  const duplicate = { ...existing, id: "another-wire", eventId: "another-event" };
  assert.equal(pendingChanges([existing], [duplicate]).length, 0);
  assert.equal(pendingChanges([existing], [{ ...duplicate, facts: { contractValue: 200 } }]).length, 1);
});
test("headline-only selection ignores AI detail and counts only visible candidate changes", () => {
  const existing = item({ aiSummary: null });
  const enriched = { ...existing, aiSummary: { text: "AI-text" } };
  assert.equal(pendingChanges([existing], [enriched], { showSummary: false }).length, 0);
  const current = [existing, item({ id: "older", ts: now - 3 * 3600_000 })];
  const next = mergeFeed(current, [item({ id: "oldest", ts: now - 6 * 3600_000 })]);
  assert.equal(changedFeedItems(current.slice(0, 2), next.slice(0, 2)).length, 0);
});
test("evening letter switches only after 17:30 Stockholm and only to today's edition", () => {
  const morning = { title: "Morgon", createdAt: "2026-09-04T05:00:00Z" };
  const evening = {
    title: "Kväll",
    createdAt: "2026-09-04T15:30:00Z",
    isEveningLetter: true,
  };
  const previous = { ...evening, createdAt: "2026-09-03T15:30:00Z" };
  assert.equal(
    currentLetter([evening, morning], "2026-09-04T15:29:00Z"),
    morning,
  );
  assert.equal(
    currentLetter([evening, morning], "2026-09-04T15:30:00Z"),
    evening,
  );
  assert.equal(currentLetter([previous, morning], now), morning);
});
test("story links and source links are safe and missing reaction is not zero", () => {
  assert.equal(storyHref("story-1"), "/nyhet/story-1");
  assert.equal(storyHref("../settings"), null);
  assert.equal(safeSourceUrl("javascript:alert(1)"), null);
  const story = normalizeStory({
    id: "a",
    headline: "Rubrik",
    publishedAt: new Date(now).toISOString(),
    reaction: { pct: null },
  });
  assert.equal(story.reaction.pct, null);
  assert.equal(
    reactionGeometry(
      {
        points: [
          { t: 1, pct: null },
          { t: 2, pct: 1 },
        ],
      },
      now,
    ),
    null,
  );
});
