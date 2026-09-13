import test from "node:test";
import assert from "node:assert/strict";
import { assessFeaturedNews, selectFeaturedNews } from "../app/utils/featuredNewsRanking.js";

const now = Date.parse("2026-09-08T11:02:37.228Z");
const story = (id, overrides = {}) => ({
  id, eventId: id, title: `Bolaget ${id} får en ny order`,
  symbol: `${id}.TEST`, labels: ["ORDER"], importance: 80,
  ts: now - 3600_000, language: "sv", ...overrides,
});

test("un-timestamped price figures cannot change featured priority", () => {
  const news = [story("a", { importance: 90 }), story("b"), story("c", { importance: 85 })];
  const expected = selectFeaturedNews(news, now).map((item) => item.id);
  const changed = news.map((item, index) => ({ ...item, reaction: { pct: index * 100 - 90, h1Pct: 80 } }));
  assert.deepEqual(selectFeaturedNews(changed, now).map((item) => item.id), expected);
  assert.equal(assessFeaturedNews(news[0], now).score, assessFeaturedNews(changed[0], now).score);
});

test("routine issue phases cannot crowd out new business news", () => {
  const phases = ["subscription", "outcome", "completed", "registration", "allotment"];
  const notices = phases.map((phase) => story(phase, {
    eventType: "capital_raise", labels: ["CAPITAL_RAISE"],
    title: "Bolaget uppdaterar emissionen", importance: 95, facts: { phase },
    reaction: { pct: 70 },
  }));
  const news = [
    story("acquisition", { labels: ["M_AND_A"], importance: 90 }),
    story("report", { labels: ["EARNINGS"], importance: 95 }),
    story("order"),
    story("leadership", { labels: ["MANAGEMENT"], importance: 75 }),
    story("trial", { labels: ["CLINICAL"], importance: 86 }),
  ];
  assert.deepEqual(new Set(selectFeaturedNews([...notices, ...news], now).map((item) => item.id)), new Set(news.map((item) => item.id)));
  for (const notice of notices) assert.equal(assessFeaturedNews(notice, now).followUpPenalty, 30);
});

test("new financing and material setbacks remain eligible, including acquisition financing", () => {
  for (const item of [
    story("new", { labels: ["CAPITAL_RAISE"], title: "Bolaget beslutar om ny riktad emission", importance: 95 }),
    story("failed", { labels: ["CAPITAL_RAISE"], title: "Bolaget avbryter emissionen", importance: 95, facts: { phase: "outcome" } }),
    story("deal", { labels: ["CAPITAL_RAISE", "M_AND_A"], eventType: "m_and_a", title: "Bolaget förvärvar en verksamhet", importance: 95, facts: { phase: "completed" } }),
  ]) {
    assert.equal(assessFeaturedNews(item, now).followUpPenalty, 0);
    assert.equal(selectFeaturedNews([item], now)[0].id, item.id);
  }
});

test("invitation and holdings copy cannot become major events through incorrect tags", () => {
  for (const item of [
    story("invitation", { title: "Bolaget to host Capital Markets Day in Stockholm", labels: ["CLINICAL"], importance: 100 }),
    story("holdings", { title: "Styrelseordförande, VD och CFO ökar sina aktieinnehav", labels: ["M_AND_A"], importance: 100 }),
    story("withdrawn", { status: "withdrawn", importance: 100 }),
  ]) assert.equal(selectFeaturedNews([item], now).length, 0);
  const report = story("report", { title: "Bolaget presenterar kvartalsrapport", labels: ["EARNINGS"], importance: 98 });
  assert.equal(selectFeaturedNews([report], now).length, 1);
});

test("fresh announcements outrank old routine updates without forcing same-day-only results", () => {
  const fresh = story("fresh", { importance: 80 });
  const older = story("older", { importance: 95, ts: now - 48 * 3600_000 });
  assert.equal(selectFeaturedNews([older, fresh], now)[0].id, "fresh");
  // Last Friday is still reachable on a quiet Monday; do not manufacture filler.
  const monday = Date.parse("2026-09-07T05:00:00Z");
  const friday = story("friday", { importance: 95, ts: Date.parse("2026-09-04T16:00:00Z") });
  assert.equal(selectFeaturedNews([friday], monday).length, 1);
  assert.equal(selectFeaturedNews([story("old", { ts: now - 97 * 3600_000 }), story("future", { ts: now + 1 })], now).length, 0);
});

test("selection has soft topical breadth but can still show five important reports", () => {
  const reports = Array.from({ length: 5 }, (_, i) => story(`report-${i}`, { labels: ["EARNINGS"], importance: 100 }));
  assert.equal(selectFeaturedNews(reports, now).length, 5);
  const mix = [...reports, story("macro", { labels: ["MACRO"], importance: 96 }), story("deal", { labels: ["M_AND_A"], importance: 95 })];
  const selected = selectFeaturedNews(mix, now);
  assert.ok(selected.some((item) => item.id === "macro"));
  assert.ok(selected.some((item) => item.id === "deal"));
  assert.equal(selectFeaturedNews([story("weak", { importance: 20 })], now).length, 0);
});

test("prefer Swedish at equal priority and avoid repeating any associated company", () => {
  const english = story("en", { symbol: "BOTH.TEST", language: "en" });
  const swedish = story("sv", { symbol: "BOTH.TEST" });
  assert.deepEqual(selectFeaturedNews([english, swedish], now).map((item) => item.id), ["sv"]);
  const multi = story("joint", { symbols: ["ONE.TEST", "TWO.TEST"], importance: 95 });
  assert.deepEqual(selectFeaturedNews([multi, story("copy", { symbol: "TWO.TEST" })], now).map((item) => item.id), ["joint"]);
});

test("completed buyback notices are follow-ups in both English spellings and Swedish", () => {
  for (const title of ["Company completed its buyback program", "Company completed its buyback programme", "Bolaget har slutfört sitt återköpsprogram"]) {
    const item = story("buyback", { title, labels: ["M_AND_A"], importance: 95 });
    assert.equal(assessFeaturedNews(item, now).followUpPenalty, 30);
  }
});
