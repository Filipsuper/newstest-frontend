import test from "node:test";
import assert from "node:assert/strict";
import { stockChartGeometry, stockChartPriceLabel, stockChartSourceLabel } from "../app/utils/stockChartGeometry.js";

const open = Date.parse("2026-09-09T07:00:00Z");
const minute = 60_000;
const close = open + 510 * minute;
const now = close + 30 * minute;
function fixture(points = [{ t: open, price: 100 }, { t: open + 120 * minute, price: 110 }]) {
  return {
    schemaVersion: 1, storyId: "fictional-stock-chart", storyVersion: 1, symbol: "NORD.TEST",
    scope: "stock_price", status: "available", publishedAt: open + 60 * minute,
    session: { date: "2026-09-09", open, close, exchange: "XSTO", calendarVersion: "fixture-calendar" },
    range: { start: open, end: close }, source: "live_ticks", resolution: "tick",
    points, asOf: now, observedAt: points.at(-1)?.t ?? null,
  };
}
const build = chart => stockChartGeometry(chart, 640, 220, now);
function finiteGeometry(geometry) {
  assert.ok(geometry);
  assert.doesNotMatch(geometry.path + geometry.area, /NaN|Infinity/);
  for (const point of geometry.points) {
    assert.ok(Number.isFinite(geometry.x(point.t)));
    assert.ok(Number.isFinite(geometry.y(point.price)));
  }
  for (const tick of geometry.ticks) {
    assert.ok(Number.isFinite(tick.value));
    assert.ok(Number.isFinite(tick.y));
    assert.notEqual(tick.label, "Saknas");
  }
}

test("stock charts connect real prices continuously through missing observations", () => {
  const chart = fixture([
    { t: open, price: 100 }, { t: open + minute, price: null },
    { t: open + 20 * minute, price: 101 }, { t: open + 21 * minute, price: null },
    { t: open + 120 * minute, price: 110 },
  ]);
  const geometry = build(chart);
  finiteGeometry(geometry);
  assert.equal(geometry.points.length, 3);
  assert.equal((geometry.path.match(/M/g) ?? []).length, 1);
  assert.equal((geometry.path.match(/L/g) ?? []).length, 2);
  assert.equal(geometry.singlePoint, null);
  assert.ok(geometry.area.endsWith(" Z"));
  assert.deepEqual(geometry.points.map(point => point.price), [100, 101, 110]);
});

test("timestamp distance determines x spacing, including actual empty time before the first trade", () => {
  const chart = fixture([
    { t: open + 10 * minute, price: 100 }, { t: open + 20 * minute, price: 101 },
    { t: open + 120 * minute, price: 110 },
  ]);
  const geometry = build(chart);
  finiteGeometry(geometry);
  const short = geometry.x(open + 20 * minute) - geometry.x(open + 10 * minute);
  const long = geometry.x(open + 120 * minute) - geometry.x(open + 20 * minute);
  assert.ok(Math.abs(long / short - 10) < 1e-10);
  assert.equal(geometry.start, open);
  assert.equal(geometry.end, chart.observedAt);
  assert.ok(geometry.x(chart.points[0].t) > geometry.plot.left);
  assert.equal(geometry.x(chart.observedAt), geometry.plot.right);
});

test("absolute-price geometry never introduces a zero-price or event-return baseline", () => {
  const chart = fixture();
  chart.baseline = { price: 1 };
  chart.pct = 999;
  const geometry = build(chart);
  assert.equal(geometry.min, 100);
  assert.equal(geometry.max, 110);
  assert.ok(geometry.lower > 0);
  assert.ok(geometry.lower < 100 && geometry.upper > 110);
  assert.ok(geometry.ticks.every(tick => tick.value > 0));
  assert.equal(geometry.pct, undefined);
  assert.equal(geometry.zero, undefined);
  assert.equal(geometry.baseline, undefined);
  assert.deepEqual(geometry.points, chart.points);
});

test("one actual observation has one dot and no fabricated segment or fill", () => {
  const geometry = build(fixture([{ t: open + 30 * minute, price: 7.5 }]));
  finiteGeometry(geometry);
  assert.equal(geometry.points.length, 1);
  assert.equal(geometry.area, "");
  assert.equal((geometry.path.match(/L/g) ?? []).length, 0);
  assert.deepEqual(geometry.singlePoint, { t: open + 30 * minute, price: 7.5,
    x: geometry.x(open + 30 * minute), y: geometry.y(7.5) });
});

test("a single opening observation has a finite time domain", () => {
  const geometry = build(fixture([{ t: open, price: 5 }]));
  finiteGeometry(geometry);
  assert.equal(geometry.start, open);
  assert.equal(geometry.end, open + minute);
  assert.equal(geometry.points[0].t, open);
  assert.equal(geometry.points.length, 1);
});

test("constant-price sessions use a centered finite absolute-price scale", () => {
  const geometry = build(fixture([{ t: open, price: 100 }, { t: close, price: 100 }]));
  finiteGeometry(geometry);
  assert.equal(geometry.lower, 98);
  assert.equal(geometry.upper, 102);
  assert.equal(geometry.y(100), (geometry.plot.top + geometry.plot.bottom) / 2);
  assert.equal(geometry.singlePoint, null);
});

test("publication within the plotted session has its actual timestamp marker", () => {
  const chart = fixture();
  const geometry = build(chart);
  assert.deepEqual(geometry.marker, { kind: "publication", x: geometry.x(chart.publishedAt), t: chart.publishedAt, label: "Nyhet" });
  assert.equal(geometry.marker.x, (geometry.plot.left + geometry.plot.right) / 2);
});

test("before-open publication has a text annotation, not a fake publication at the opening price", () => {
  const chart = fixture();
  chart.publishedAt = open - 145 * minute;
  const geometry = build(chart);
  assert.equal(geometry.marker.kind, "before_open");
  assert.equal(geometry.marker.t, chart.publishedAt);
  assert.equal(geometry.marker.label, "Nyhet före öppning");
  assert.equal(geometry.marker.x, geometry.plot.left);
  assert.notEqual(geometry.marker.t, chart.session.open);
});

test("unobserved or invalid publication timestamps do not become chart markers", () => {
  for (const publishedAt of ["invalid", null, undefined, now + minute, close]) {
    assert.equal(build({ ...fixture(), publishedAt }).marker, null);
  }
});

test("missing, nonpositive, and non-finite prices never become chart observations", () => {
  const chart = fixture([
    { t: open, price: 100 }, null,
    ...[null, undefined, NaN, Infinity, -Infinity, 0, -5, "102", false, [], {}].map((price, index) => ({ t: open + (index + 1) * minute, price })),
    { t: open + 120 * minute, price: 110 },
  ]);
  const geometry = build(chart);
  finiteGeometry(geometry);
  assert.deepEqual(geometry.points, [{ t: open, price: 100 }, { t: open + 120 * minute, price: 110 }]);
  assert.equal((geometry.path.match(/L/g) ?? []).length, 1);
});

test("future and out-of-session samples cannot extend the observed endpoint", () => {
  const chart = fixture();
  chart.points.push({ t: open - minute, price: 1 }, { t: now + minute, price: 1_000 },
    { t: close + minute, price: 500 }, { t: open + 130 * minute, price: 150 },
    { t: NaN, price: 2 }, { t: Infinity, price: 2 });
  const geometry = build(chart);
  finiteGeometry(geometry);
  assert.equal(geometry.points.length, 2);
  assert.equal(geometry.points.at(-1).t, chart.observedAt);
  assert.equal(geometry.points.at(-1).price, 110);
});

test("read-time freshness cannot stand in for a missing or inconsistent actual endpoint", () => {
  for (const values of [
    { observedAt: null }, { observedAt: now + minute }, { asOf: now + minute },
    { observedAt: open - minute }, { observedAt: close + minute },
    { observedAt: open + 121 * minute }, { asOf: open },
  ]) assert.equal(build({ ...fixture(), ...values }), null);
  const geometry = build(fixture());
  assert.equal(geometry.end, fixture().observedAt);
  assert.notEqual(geometry.end, now);
});

test("unordered and identical duplicate samples normalize without mutating source data", () => {
  const chart = fixture();
  chart.points = [chart.points[1], chart.points[0], { ...chart.points[1] }];
  const original = structuredClone(chart);
  const geometry = build(chart);
  finiteGeometry(geometry);
  assert.deepEqual(chart, original);
  assert.deepEqual(geometry.points, fixture().points);
  assert.equal((geometry.path.match(/L/g) ?? []).length, 1);
});

test("conflicting duplicate prices do not invent vertical trades or replace the actual endpoint", () => {
  const chart = fixture();
  chart.points.push({ t: open + 60 * minute, price: 102 }, { t: open + 60 * minute, price: 104 });
  const geometry = build(chart);
  finiteGeometry(geometry);
  assert.equal(geometry.points.length, 2);
  chart.points.push({ t: chart.observedAt, price: 111 });
  assert.equal(build(chart), null);
});

test("unavailable, pending and malformed contracts do not render a chart", () => {
  for (const chart of [null, undefined, {}, { ...fixture(), status: "pending" },
    { ...fixture(), status: "unavailable" }, { ...fixture(), scope: "reaction" },
    { ...fixture(), schemaVersion: 2 }, { ...fixture(), points: [] },
    { ...fixture(), points: {} }, { ...fixture(), session: null },
    { ...fixture(), session: { open: close, close: open } },
  ]) assert.equal(build(chart), null);
});

test("ISO session/point times and custom OG dimensions retain exact plotted prices", () => {
  const chart = fixture();
  chart.session = { ...chart.session, open: new Date(open).toISOString(), close: new Date(close).toISOString() };
  chart.points = chart.points.map(point => ({ ...point, t: new Date(point.t).toISOString() }));
  const geometry = stockChartGeometry(chart, 1080, 260, now);
  finiteGeometry(geometry);
  assert.equal(geometry.width, 1080);
  assert.equal(geometry.height, 260);
  assert.equal(geometry.x(open), 8);
  assert.equal(geometry.x(chart.observedAt), 1072);
  assert.deepEqual(geometry.points, fixture().points);
});

test("source labels distinguish ticks from minute history without claiming live verification", () => {
  assert.equal(stockChartSourceLabel({ source: "live_ticks" }), "Tickdata");
  assert.equal(stockChartSourceLabel({ source: "reaction_v2_market" }), "1 min");
  assert.equal(stockChartSourceLabel({ source: "minute_bars" }), "1 min");
  assert.equal(stockChartSourceLabel({ source: "unknown" }), null);
});

test("axis formatting keeps tiny positive prices distinguishable from zero and omits guessed units", () => {
  assert.equal(stockChartPriceLabel(100.12, 1), "100,12");
  assert.notEqual(stockChartPriceLabel(0.000000003, 0.000000001), "0");
  assert.doesNotMatch(stockChartPriceLabel(100.12), /SEK|kr|%/);
  assert.equal(stockChartPriceLabel(NaN), "Saknas");
  finiteGeometry(build(fixture([{ t: open, price: 1e308 }, { t: close, price: 1e308 }])));
});

test("invalid viewport dimensions and evaluation times never produce invalid SVG paths", () => {
  for (const [width, height, time] of [[0, 220, now], [640, 0, now], [Infinity, 220, now], [640, NaN, now], [640, 220, NaN]]) {
    assert.equal(stockChartGeometry(fixture(), width, height, time), null);
  }
});
