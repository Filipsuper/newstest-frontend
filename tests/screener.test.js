import test from "node:test";
import assert from "node:assert/strict";
import { SCREENER_METRICS, DEFAULT_COLUMNS, FREE_METRICS, matchesMetricSearch, restrictScreenerState, finite, screenerValue, matchesFilter, validFilter, readScreenerQuery, writeScreenerQuery } from "../app/utils/screener.js";

test("every available metric has shared metadata; old default columns remain", () => {
    assert.ok(Object.keys(SCREENER_METRICS).length > 40);
    assert.equal(DEFAULT_COLUMNS.length, 10);
    for (const column of DEFAULT_COLUMNS) assert.ok(SCREENER_METRICS[column]);
    for (const metric of Object.values(SCREENER_METRICS)) assert.ok(metric.label && metric.group && metric.description);
});
test("metric search supports abbreviations, categories, accents and multiword queries", () => {
    for (const [key, query] of [["rvolAtTime", "RVOL"], ["rvolAtTime", "rvol at time"], ["roePct", "ROE"], ["pe", "pe"], ["pe", "P/E"],
        ["profile_health", "halsa"], ["freeCashFlowMarginPct", "fcf"], ["insider_buyValue90d", "insyn 90"], ["pe", "vardering"]])
        assert.equal(matchesMetricSearch(key, query), true, `${key}: ${query}`);
    assert.equal(matchesMetricSearch("revenueGrowthPct", "RVOL"), false);
    assert.equal(Object.keys(SCREENER_METRICS).some(key => matchesMetricSearch(key, "nonexistent")), false);
});
test("free state keeps six real metrics, removing paid URL rules, columns and sort", () => {
    const state = readScreenerQuery(writeScreenerQuery("", { filters: [{ metric: "pe", operator: "lt", value: 15 }, { metric: "rvolAtTime", operator: "gt", value: 2 }],
        columns: ["pe", "profile_health"], sort: { key: "rvolAtTime", direction: "desc" }, segment: "SMALL_CAP", sector: "Teknik" }));
    const free = restrictScreenerState(state, false);
    assert.equal(free.restricted, true);
    assert.deepEqual(free.filters, [state.filters[0]]);
    assert.deepEqual(free.columns, ["pe"]);
    assert.equal(free.sort.key, "marketCap");
    assert.equal(free.segment, "SMALL_CAP");
    assert.deepEqual(restrictScreenerState(state, true), { ...state, restricted: false });
    assert.deepEqual(restrictScreenerState(readScreenerQuery(""), false).columns, FREE_METRICS);
    assert.equal(restrictScreenerState(readScreenerQuery(""), false).restricted, false);
});
test("missing values do not become zero; profile and insider data are not visible-page dependent", () => {
    for (const input of [null, undefined, "", " ", false, [], {}, Infinity]) assert.equal(finite(input), null);
    const row = { profile: { axes: [{ key: "health", score: 0 }], coveragePct: 75 }, insiders: { netValue90d: 1.5 }, metrics: { turnover: 2e6 } };
    assert.equal(screenerValue(row, "profile_health"), 0);
    assert.equal(screenerValue(row, "profile_growth"), null);
    assert.equal(screenerValue(row, "profileCoverage"), 75);
    assert.equal(screenerValue(row, "insider_netValue90d"), 1.5);
    assert.equal(screenerValue(row, "turnover"), 2);
    assert.equal(matchesFilter(row, { metric: "profile_health", operator: "between", value: 0, upper: 2 }), true);
    assert.equal(matchesFilter(row, { metric: "profile_growth", operator: "lt", value: 5 }), false);
});
test("typed rules support inclusive ranges and enums, rejecting invalid URL conditions", () => {
    assert.equal(matchesFilter({ metrics: { openingRangePosition: "above" } }, { metric: "openingRangePosition", operator: "eq", value: "above" }), true);
    assert.equal(matchesFilter({ fundamentals: { netMarginPct: -3 } }, { metric: "netMarginPct", operator: "between", value: -3, upper: 0 }), true);
    for (const filter of [
        { metric: "profile_health", operator: "gt", value: 6 },
        { metric: "price", operator: "between", value: 3, upper: 2 },
        { metric: "price", operator: "eq", value: 3 },
        { metric: "openingRangePosition", operator: "eq", value: "unknown" },
        { metric: "madeUp", operator: "gt", value: 1 },
    ]) assert.equal(validFilter(filter), false);
});
test("URL roundtrip retains range/enum rules, columns, source-page parameters and safe sort", () => {
    const state = { filters: [{ metric: "profile_health", operator: "between", value: 2, upper: 5 }, { metric: "openingRangePosition", operator: "eq", value: "below" }],
        segment: "SMALL_CAP", sector: "Teknik", columns: ["price", "profile_health"], sort: { key: "profile_health", direction: "asc" } };
    const query = writeScreenerQuery("utm_source=test", state);
    assert.equal(new URLSearchParams(query).get("utm_source"), "test");
    assert.deepEqual(readScreenerQuery(query), state);
    assert.deepEqual(readScreenerQuery("rules=invalid&columns=price,madeUp,price&sort=bad").columns, ["price"]);
    assert.equal(readScreenerQuery("rules={}").filters.length, 0);
});
