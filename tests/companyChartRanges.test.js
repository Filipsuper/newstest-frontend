import test from "node:test";
import assert from "node:assert/strict";
import { COMPANY_CHART_RANGES, companyChartRange, companyRangeDisabled, companyIntradayRows, companyIntradayBaseline, companyIntradayTick } from "../app/utils/companyChartRanges.js";

const at = date => Date.parse(date + "Z");
const previousFull = [7, 10, 14].map(hour => ({ time: at(`2026-09-11T${String(hour).padStart(2, "0")}:00:00`), close: 98 + hour, volume: 10 }));
const current = [7, 10].map(hour => ({ time: at(`2026-09-14T${String(hour).padStart(2, "0")}:00:00`), close: 105 + hour, volume: null }));
const payload = { previous: previousFull.slice(-1), previousFull, current, previousClose: 112 };

test("chart, shared URL and OG have the same eight periods and named default", () => {
  assert.deepEqual(COMPANY_CHART_RANGES.map(r => r.id), ["1d", "2d", "1w", "1m", "6m", "1y", "3y", "5y"]);
  assert.equal(companyChartRange("invalid").id, "1y");
  assert.equal(companyChartRange(undefined).id, "1y");
  assert.equal(companyChartRange("1w").sessions, 5);
  assert.equal(companyChartRange("1m").sessions, 22);
});

test("short historical ranges do not become enabled by a negative availability threshold", () => {
  for (const range of COMPANY_CHART_RANGES.filter(r => !r.intraday)) {
    assert.equal(companyRangeDisabled(range, 0), true);
    assert.equal(companyRangeDisabled(range, 1), true);
    assert.equal(companyRangeDisabled(range, range.sessions), false);
  }
  for (const id of ["1d", "2d"]) {
    assert.equal(companyRangeDisabled(companyChartRange(id), 0, { minute: { status: "unverified" } }), true);
    assert.equal(companyRangeDisabled(companyChartRange(id), 0, { minute: { status: "supported" } }), false);
    assert.equal(companyRangeDisabled(companyChartRange(id), 0), false);
  }
});

test("two days includes the full previous trading session across a weekend without fabricated points", () => {
  const rows = companyIntradayRows(payload, "2d");
  assert.deepEqual(rows.map(r => r.time), [...previousFull, ...current].map(r => r.time));
  assert.equal(rows.length, 5);
  assert.equal(rows.every(r => r.currentPrice === r.close && r.previousPrice === null), true);
  assert.equal(rows.at(-1).volume, null);
  assert.equal(companyIntradayBaseline(payload, "2d"), previousFull[0].close);
});

test("one-day context and daily-close baseline stay unchanged", () => {
  const rows = companyIntradayRows(payload, "1d");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].previousPrice, payload.previous[0].close);
  assert.equal(rows[0].currentPrice, null);
  assert.equal(companyIntradayBaseline(payload, "1d"), 112);
});

test("missing full-session data never borrows a quarter-session tail for a two-day return", () => {
  const incomplete = { ...payload, previousFull: undefined };
  assert.equal(companyIntradayRows(incomplete, "2d").length, current.length);
  assert.equal(companyIntradayBaseline(incomplete, "2d"), null);
  assert.equal(companyIntradayBaseline({ ...payload, current: [] }, "2d"), null);
  assert.deepEqual(companyIntradayRows(null, "2d"), []);
});

test("invalid prices are filtered and two-day axis labels include date and exchange-local time", () => {
  const rows = companyIntradayRows({ current: [...current, { time: null, close: 100 }, { time: current[0].time, close: null }] }, "2d");
  assert.equal(rows.length, 2);
  assert.match(companyIntradayTick(current[0].time, "2d", "Europe/Helsinki"), /14.*sep.*10:00/);
  assert.equal(companyIntradayTick(current[0].time, "1d", "Europe/Oslo"), "09:00");
});
