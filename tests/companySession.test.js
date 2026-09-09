import test from "node:test";
import assert from "node:assert/strict";
import { companyContextFor, companySessionFor, retainCompanyContext, sessionDateLabel } from "../app/utils/companySession.js";
import { rowReaction, legacyReactionMatches } from "../app/utils/reactionV2.js";
import { storyToItem } from "../app/utils/storyToItem.js";
import { previewStories } from "../app/designsystem/reactions/fixtures.js";
import { changedFeedItems, refreshMarketObservations, mergeFeed } from "../app/utils/newsroom.js";

const at = value => Date.parse(`2026-09-${value}`);
const close = at("08T15:30:00Z"), now = close + 60_000, nextOpen = at("09T07:00:00Z");
const field = (value, time = close, extra = {}) => ({ status: "available", value, at: time, source: "fictional_fixture", ...extra });
function fixture({ premarket = false, v2 = true } = {}) {
  const raw = previewStories()[0];
  if (premarket) {
    raw.publishedAt = "2026-09-08T04:35:00Z";
    raw.reactionV2.publishedAt = raw.publishedAt;
    raw.reactionV2.measurements[0].status = "missing_baseline";
  }
  if (!v2) delete raw.reactionV2;
  const story = storyToItem(raw);
  story.companyContext = { schemaVersion: 1, scope: "session_context", storyId: story.id,
    storyVersion: story.version ?? 1, publishedAt: raw.publishedAt, asOf: now,
    companies: [{ symbol: story.symbol, currency: "SEK", asOf: now, validUntil: nextOpen,
      relationship: "event_session", timing: premarket ? "before_open" : "during_session",
      session: { date: "2026-09-08", open: at("08T07:00:00Z"), close, exchange: "XSTO", calendarVersion: "fixture-v1" },
      fields: { price: field(112), previousClose: field(100, at("07T15:30:00Z"), { sessionDate: "2026-09-07", adjustmentBasis: "unknown" }),
        changePct: field(12), dayVolume: field(100_000), dailyRvol: field(0.5), rvolAtTime: field(2.5) },
      baselineSessionCount: 20, baselineMature: true, dailyVolumeSessionCount: 20, dailyVolumeBaselineMature: true }],
  };
  return story;
}
const company = story => story.companyContext.companies[0];

test("06:35 news uses previous close and today's price even without an exact v2 baseline", () => {
  const story = fixture({ premarket: true });
  const row = rowReaction(story, story.symbol, now);
  assert.equal(row.scope, "session"); assert.equal(row.pct, 12);
  assert.equal(row.label, "Idag · mot föregående stängning");
  assert.equal(row.period, null); assert.equal(row.asOf, close);
  assert.equal(row.companySession.fields.dailyRvol.value, 0.5);
  assert.equal(row.companySession.fields.rvolAtTime.value, 2.5);
  assert.equal(story.reaction.pct, 99); // Ranking/replay inputs are not rewritten.
});
test("intraday news keeps its exact 4.2% reaction instead of the larger daily 12%", () => {
  const story = fixture(); const row = rowReaction(story, story.symbol, now);
  assert.equal(row.scope, "event"); assert.equal(row.pct, 4.2);
  assert.equal(row.companySession.fields.changePct.value, 12);
});
test("during-session daily fallback only applies when the exact event price is unavailable", () => {
  const story = fixture(); story.reactionV2.measurements[0].status = "missing_baseline";
  assert.equal(rowReaction(story, story.symbol, now).scope, "session");
});
test("later-session context cannot turn an old story's outcome into today's move", () => {
  const story = fixture({ premarket: true }); company(story).relationship = "later_session";
  const row = rowReaction(story, story.symbol, now);
  assert.equal(row.scope, "event"); assert.equal(row.pct, null);
  assert.equal(row.companySession.fields.changePct.value, 12);
  assert.notEqual(sessionDateLabel(row.companySession, nextOpen), "Idag");
});
test("a close snapshot preceding publication cannot be labeled as trading after the news", () => {
  const story = fixture({ premarket: true }); company(story).relationship = "before_event_session";
  assert.equal(rowReaction(story, story.symbol, now).scope, "event");
});
test("volume remains independent when price is missing or stale", () => {
  for (const status of ["missing", "stale"]) {
    const story = fixture(); company(story).fields.price.status = status;
    const result = companySessionFor(story, story.symbol, now);
    assert.equal(result.fields.price.value, null); assert.equal(result.fields.changePct.value, null);
    assert.equal(result.fields.rvolAtTime.value, 2.5); assert.equal(result.fields.dayVolume.value, 100_000);
  }
});
test("missing volume cannot erase a valid price or expose detached ratios", () => {
  const story = fixture({ premarket: true }); company(story).fields.dayVolume.status = "missing";
  const result = companySessionFor(story, story.symbol, now);
  assert.equal(result.fields.changePct.value, 12);
  assert.equal(result.fields.rvolAtTime.value, null); assert.equal(result.fields.dailyRvol.value, null);
});
test("actual zero volume and ratios remain zero, not missing", () => {
  const story = fixture();
  for (const key of ["dayVolume", "dailyRvol", "rvolAtTime"]) company(story).fields[key].value = 0;
  assert.equal(companySessionFor(story, story.symbol, now).fields.dailyRvol.value, 0);
});
test("live prices and volume expire independently, without freshening from computedAt", () => {
  const story = fixture(); company(story).fields.price.at -= 16 * 60_000;
  company(story).fields.changePct.at = company(story).fields.price.at;
  const result = companySessionFor(story, story.symbol, now);
  assert.equal(result.fields.price.status, "stale"); assert.equal(result.fields.changePct.value, null);
  assert.equal(result.fields.rvolAtTime.value, 2.5);
});
test("retained closed snapshots expire exactly at the next verified market open", () => {
  const story = fixture();
  assert.equal(companySessionFor(story, story.symbol, nextOpen - 1).fields.price.value, 112);
  const result = companySessionFor(story, story.symbol, nextOpen);
  for (const value of Object.values(result.fields)) assert.equal(value.value, null);
  assert.equal(result.fields.price.reason, "session_outdated");
});
test("field timestamps may not exceed their own capsule's asOf, even if another capsule is newer", () => {
  const story = fixture(); company(story).asOf = close - 1;
  assert.equal(companySessionFor(story, story.symbol, now).fields.price.value, null);
});
test("ratios must share the cumulative-volume observation timestamp and a sufficient baseline", () => {
  const story = fixture(); company(story).fields.rvolAtTime.at -= 60_000;
  assert.equal(companySessionFor(story, story.symbol, now).fields.rvolAtTime.value, null);
  company(story).fields.rvolAtTime.at = close; company(story).baselineSessionCount = 4;
  assert.equal(companySessionFor(story, story.symbol, now).fields.rvolAtTime.value, null);
  company(story).baselineSessionCount = 7;
  const result = companySessionFor(story, story.symbol, now);
  assert.equal(result.fields.rvolAtTime.value, 2.5); assert.equal(result.baselineMature, false);
  company(story).dailyVolumeSessionCount = 19;
  assert.equal(companySessionFor(story, story.symbol, now).fields.dailyRvol.value, null);
});
test("bad identity, duplicate companies, future/unknown capsules and dates are rejected", () => {
  const checks = [
    story => { story.version = 999; }, story => { story.ts += 1; }, story => { story.status = "retracted"; },
    story => { story.companyContext.companies.push(structuredClone(company(story))); },
    story => { story.companyContext.asOf = now + 1; }, story => { delete company(story).validUntil; },
    story => { company(story).session.date = "2026-09-09"; }, story => { company(story).symbol = "OTHER.TEST"; },
  ];
  for (const mutate of checks) { const story = fixture(); mutate(story); assert.equal(companySessionFor(story, story.symbol, now), null); }
});
test("invalid previous-close pair or percentage arithmetic is unavailable", () => {
  for (const mutate of [c => c.fields.previousClose.sessionDate = c.session.date, c => c.fields.changePct.value = 500,
    c => c.fields.price.value = 0, c => c.fields.changePct.at -= 1]) {
    const story = fixture(); mutate(company(story));
    assert.equal(companySessionFor(story, story.symbol, now).fields.changePct.value, null);
  }
});
test("multi-company selection never borrows an unscoped legacy return", () => {
  const story = fixture({ v2: false }); const second = structuredClone(company(story));
  second.symbol = "SECOND.TEST"; second.fields.price.value = 80; second.fields.changePct.value = -20;
  story.companies.push({ symbol: second.symbol, name: "Second" }); story.companyContext.companies.push(second);
  assert.equal(rowReaction(story, second.symbol, now).pct, -20);
  assert.equal(rowReaction(story, second.symbol, now).scope, "session");
  story.reaction.symbol = story.symbol;
  assert.equal(rowReaction(story, story.symbol, now).pct, 99);
  assert.equal(rowReaction(story, second.symbol, now).pct, -20);
});
test("legacy company identity validation is independent of a missing rolling percentage or real fixed-window zero", () => {
  const story = fixture({ v2: false }); story.reaction = { h1Pct: 0 };
  assert.equal(legacyReactionMatches(story), true);
  assert.equal(rowReaction(story, story.symbol, now).pct, 12);
  story.companies.push({ symbol: "SECOND.TEST" });
  assert.equal(legacyReactionMatches(story), false);
  story.reaction.symbol = "SECOND.TEST";
  assert.equal(legacyReactionMatches(story), false);
  assert.equal(legacyReactionMatches(story, "SECOND.TEST"), true);
});
test("optional enrichment retention respects story versions, explicit removal and snapshot order", () => {
  const story = fixture();
  assert.deepEqual(retainCompanyContext(story, { ...story, companyContext: undefined }), companyContextFor(story));
  assert.equal(retainCompanyContext(story, { ...story, companyContext: null }), null);
  assert.equal(retainCompanyContext(story, { ...story, version: 99, companyContext: undefined }), null);
  const older = structuredClone(story); older.companyContext.asOf -= 100;
  assert.equal(retainCompanyContext(story, older).asOf, story.companyContext.asOf);
});
test("context-only refresh updates prices without raising new-news counts or reordering stories", () => {
  const story = fixture(); const incoming = structuredClone(story);
  company(incoming).fields.price.value = 115; company(incoming).fields.changePct.value = 15;
  assert.equal(changedFeedItems([story], [incoming]).length, 0);
  assert.equal(refreshMarketObservations([story], [incoming])[0].companyContext.companies[0].fields.changePct.value, 15);
  assert.equal(mergeFeed([story], [{ ...story, companyContext: undefined }])[0].companyContext.companies[0].fields.price.value, 112);
});
