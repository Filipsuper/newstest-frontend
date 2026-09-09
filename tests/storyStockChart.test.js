import test from "node:test";
import assert from "node:assert/strict";
import { storyStockChartFor } from "../app/utils/storyStockChart.js";
import { sessionPreviewStories, SESSION_PREVIEW_NOW } from "../app/designsystem/sessions/fixtures.js";
import { storyToItem } from "../app/utils/storyToItem.js";

const now = Date.parse(SESSION_PREVIEW_NOW);
const fixture = () => {
  const raw = sessionPreviewStories()[0], story = storyToItem(raw);
  return { story, chart: raw.previewCharts[story.symbol] };
};
test("an independent premarket price chart is valid without an event baseline", () => {
  const { story, chart } = fixture();
  assert.equal(story.reactionV2.measurements[0].baseline, null);
  assert.equal(storyStockChartFor(story, story.symbol, chart, now).points.at(-1).price, 11);
});
test("exact story, version, publication and company scope are required", () => {
  const { story, chart } = fixture();
  for (const change of [{ storyId: "different" }, { storyVersion: 2 }, { publishedAt: chart.publishedAt + 1 },
    { symbol: "OTHER.TEST" }, { schemaVersion: 2 }, { scope: "event" }]) {
    assert.equal(storyStockChartFor(story, story.symbol, { ...chart, ...change }, now), null);
  }
  assert.equal(storyStockChartFor(story, "OTHER.TEST", { ...chart, symbol: "OTHER.TEST" }, now), null);
});
test("the plot never accepts a fresh read time in place of a real endpoint", () => {
  const { story, chart } = fixture();
  for (const change of [{ asOf: now + 60_001 }, { observedAt: chart.asOf },
    { points: [...chart.points, { t: now + 1, price: 12 }] }]) {
    assert.equal(storyStockChartFor(story, story.symbol, { ...chart, ...change }, now), null);
  }
});
test("small server read-clock skew is allowed without accepting a future trade", () => {
  const { story, chart } = fixture();
  for (const skew of [100, 60_000]) {
    const result = storyStockChartFor(story, story.symbol, { ...chart, asOf: now + skew }, now);
    assert.deepEqual(result.points, chart.points);
    assert.equal(result.observedAt, chart.observedAt);
  }
  assert.equal(storyStockChartFor(story, story.symbol, { ...chart, asOf: now + 60_001 }, now), null);
  // This future trade is still inside the exchange session and before server
  // read time, so only the strict client observation-time check can reject it.
  const duringSession = chart.session.close - 60_000;
  const past = chart.points.filter(point => point.t <= duringSession);
  const live = { ...chart, asOf: duringSession + 100, points: past, observedAt: past.at(-1).t };
  assert.ok(storyStockChartFor(story, story.symbol, live, duringSession));
  const future = { t: duringSession + 1, price: 12 };
  assert.equal(storyStockChartFor(story, story.symbol, { ...live, points: [...past, future] }, duringSession), null);
  assert.equal(storyStockChartFor(story, story.symbol, { ...live, points: [...past, future], observedAt: future.t }, duringSession), null);
});
test("invalid, unordered, duplicate and out-of-session observations fail closed", () => {
  const { story, chart } = fixture();
  for (const points of [[], [...chart.points].reverse(), [...chart.points, chart.points.at(-1)],
    [{ t: chart.session.open - 1, price: 10 }, ...chart.points],
    chart.points.map((point, i) => i ? point : { ...point, price: -1 }),
    chart.points.map((point, i) => i ? point : { ...point, price: "10" })]) {
    assert.equal(storyStockChartFor(story, story.symbol, { ...chart, points }, now), null);
  }
});
test("source, resolution, session date and chart range must agree", () => {
  const { story, chart } = fixture();
  for (const change of [{ source: "invented" }, { resolution: "1m" },
    { session: { ...chart.session, date: "2026-09-08" } },
    { session: { ...chart.session, exchange: "OTHER" } },
    { range: { start: chart.session.open + 60_000, end: chart.session.close } }]) {
    assert.equal(storyStockChartFor(story, story.symbol, { ...chart, ...change }, now), null);
  }
});
test("the tick cache expires for a whole session; stored minute prices stay valid", () => {
  const { story, chart } = fixture();
  const future = chart.session.open + 7 * 86_400_000 + 1;
  assert.equal(storyStockChartFor(story, story.symbol, chart, future), null);
  assert.ok(storyStockChartFor(story, story.symbol, { ...chart, source: "minute_bars", resolution: "1m" }, future));
  const old = sessionPreviewStories().at(-1), symbol = old.companies[0].symbol;
  assert.ok(storyStockChartFor(old, symbol, old.previewCharts[symbol], now));
});
test("pending and unavailable responses cannot leak points from an older result", () => {
  const { story, chart } = fixture();
  for (const status of ["pending", "unavailable"]) {
    assert.deepEqual(storyStockChartFor(story, story.symbol, { ...chart, status }, now).points, []);
    assert.deepEqual(storyStockChartFor(story, story.symbol, { ...chart, status, asOf: now + 100 }, now).points, []);
    assert.equal(storyStockChartFor(story, story.symbol, { ...chart, status, storyId: "other", asOf: now + 100 }, now), null);
  }
});
