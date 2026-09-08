import test from "node:test";
import assert from "node:assert/strict";
import { newsMarketAttention, newsMarketContext } from "../app/utils/newsMarketAttention.js";
import { featuredNews, refreshMarketObservations, pendingChanges } from "../app/utils/newsroom.js";

const now = Date.parse("2026-09-08T11:00:00Z");
const item = (overrides = {}) => ({ id: "one", title: "Bolaget får en order", symbol: "ONE.TEST", labels: ["ORDER"], importance: 80,
  ts: now - 2 * 3600_000, reaction: { pct: 12, h1Pct: 4, m15Pct: 7, asOf: now }, ...overrides });
const context = (story, overrides = {}) => ({ storyId: story.id, symbol: story.symbol, publishedAt: new Date(story.ts).toISOString(),
  scope: "session_context", sessionDate: "2026-09-08", asOf: now, rvolAtTime: 4, dailyRvol: 9,
  baselineMature: true, baselineSessionCount: 20, turnover: 10_000_000, ...overrides });

test("completed reactions restore a capped symmetric boost, without choosing the biggest window", () => {
  const positive = newsMarketAttention(item(), now);
  assert.equal(positive.priceWindow, "h1Pct");
  assert.equal(positive.priceBoost, 8);
  assert.equal(newsMarketAttention(item({ reaction: { h1Pct: -4, asOf: now } }), now).priceBoost, 8);
  const huge = item({ reaction: { h1Pct: 80, asOf: now } });
  huge.marketContext = context(huge);
  assert.equal(newsMarketAttention(huge, now).total, 20);
  const quiet = item({ id: "quiet", symbol: "QUIET.TEST", importance: 85, reaction: null });
  assert.equal(featuredNews([quiet, item()], now)[0].id, "one");
});

test("rolling fallback is smaller and excludes old, future, un-timestamped and multi-company observations", () => {
  const rolling = item({ reaction: { pct: 50, asOf: now } });
  assert.equal(newsMarketAttention(rolling, now).priceBoost, 6);
  for (const story of [
    item({ reaction: { pct: 50 } }),
    item({ reaction: { pct: 50, asOf: now + 1 } }),
    item({ reaction: { pct: 50, asOf: now - 16 * 60_000 } }),
    item({ reaction: { pct: 50, asOf: now - 3 * 3600_000 } }),
    item({ ts: now - 30 * 3600_000, reaction: { pct: 50, asOf: now } }),
    item({ symbols: ["ONE.TEST", "TWO.TEST"] }),
  ]) assert.equal(newsMarketAttention(story, now).total, 0);
  // A pre-open +1h does not describe an hour of market reaction.
  assert.equal(newsMarketAttention(item({ ts: Date.parse("2026-09-08T05:00:00Z"), reaction: { h1Pct: 40, asOf: now } }), now).total, 0);
});

test("RVOL at time adds one bounded bonus, not a second bonus for daily RVOL", () => {
  const story = item();
  story.marketContext = context(story);
  assert.equal(newsMarketAttention(story, now).volumeBoost, 8);
  assert.equal(newsMarketAttention(story, now).volumeMetric, "rvolAtTime");
  story.marketContext.dailyRvol = 10000;
  assert.equal(newsMarketAttention(story, now).total, 16);
  story.marketContext.rvolAtTime = 1;
  assert.equal(newsMarketAttention(story, now).volumeBoost, 0);
});

test("volume needs an exact story, company, publication and session match plus mature liquid data", () => {
  const story = item();
  for (const change of [{ symbol: "OTHER.TEST" }, { storyId: "other" }, { publishedAt: new Date(now).toISOString() },
    { sessionDate: "2026-09-07" }, { asOf: now - 3 * 3600_000 }]) {
    story.marketContext = context(story, change);
    assert.equal(newsMarketContext(story), null);
  }
  for (const change of [{ asOf: now - 16 * 60_000 }, { asOf: now + 1 }, { baselineMature: false },
    { baselineSessionCount: 5 }, { turnover: 88_000 }, { turnover: null }, { rvolAtTime: null }]) {
    story.marketContext = context(story, change);
    assert.equal(newsMarketAttention(story, now).volumeBoost, 0);
  }
});

test("daily RVOL is a fallback only after the session close, missing reactions remain neutral", () => {
  const closed = Date.parse("2026-09-08T15:31:00Z");
  const story = item({ ts: closed - 2 * 3600_000, reaction: { h1Pct: 4, asOf: closed } });
  story.marketContext = context(story, { asOf: closed, rvolAtTime: null, dailyRvol: 2 });
  assert.equal(newsMarketAttention(story, closed).volumeMetric, "dailyRvol");
  assert.equal(newsMarketAttention(story, closed).volumeBoost, 4);
  story.reaction = null;
  assert.equal(newsMarketAttention(story, closed).total, 0);
});

test("observation refresh keeps row order and does not become a news update or accept another version", () => {
  const first = item(), next = { ...first, reaction: { pct: 6, asOf: now }, marketContext: context(first) };
  const refreshed = refreshMarketObservations([first], [next]);
  assert.equal(refreshed[0].reaction.pct, 6);
  assert.equal(refreshed[0].marketContext.rvolAtTime, 4);
  assert.equal(pendingChanges([first], refreshed).length, 0);
  assert.equal(refreshMarketObservations([first], [{ ...next, version: 2 }])[0], first);
  assert.equal(refreshMarketObservations(refreshed, [{ ...next, reaction: { pct: 1, asOf: now - 1 } }])[0].reaction.pct, 6);
});
