import test from "node:test";
import assert from "node:assert/strict";
import { directoryQuote, discoverStocks, stockFilters, stockFiltersHref, stockSegment } from "../app/utils/stockDiscovery.js";

const companies = [
  { symbol: "A.ST", name: "Älvsjö", sector: "Teknik", segment: "LARGE_CAP", changePct: 1 },
  { symbol: "B.ST", name: "Berg", sector: "Industri", segment: "MID_CAP", changePct: -2 },
  { symbol: "C.ST", name: "Celsius", sector: "Teknik", market: "first_north", changePct: null },
];
const story = (id, publishedAt) => ({ id, title: id, publishedAt });
const snapshot = {
  news: [{ symbol: "a.st", story: story("order-a", "2026-09-07T09:00:00Z") }, { symbol: "B.ST", story: story("order-b", "2026-09-07T10:00:00Z") }],
  reports: [{ symbol: "A.ST", story: story("report-a", "2026-09-06T09:00:00Z") }],
};
test("news and reports group by company; all-company search keeps companies without news", () => {
  const defaults = stockFilters();
  assert.deepEqual(discoverStocks(companies, snapshot, defaults).map(row => row.symbol), ["B.ST", "A.ST"]);
  assert.equal(discoverStocks(companies, snapshot, { ...defaults, view: "reports" })[0].story.id, "report-a");
  assert.equal(discoverStocks(companies, snapshot, { ...defaults, q: "alvsjo", sector: "Teknik", segment: "large" })[0].symbol, "A.ST");
  assert.equal(discoverStocks(companies, snapshot, { ...defaults, sector: "Industri", segment: "large" }).length, 0);
  assert.equal(discoverStocks(companies, snapshot, { ...defaults, view: "all", q: "Celsius" })[0].story, null);
  assert.equal(discoverStocks([...companies, companies[0]], snapshot, { ...defaults, view: "all" }).length, 3);
  assert.equal(stockSegment(companies[2]), "first_north");
});
test("missing quotes sort last in either direction and invalid story links cannot enter selection", () => {
  for (const sort of ["gainers", "losers"]) {
    const rows = discoverStocks(companies, snapshot, { ...stockFilters(), view: "all", sort });
    assert.equal(rows.at(-1).symbol, "C.ST");
    assert.equal(rows[0].symbol, sort === "gainers" ? "A.ST" : "B.ST");
  }
  assert.deepEqual(discoverStocks(companies, { news: [{ symbol: "A.ST", story: story("../../bad", "2026-09-07") }] }, stockFilters()), []);
});
test("URL state is bounded and roundtrips all filters and pagination", () => {
  const input = new URLSearchParams("view=all&q=Älvsjö&list=large&sector=Teknik&sort=losers&page=3");
  assert.deepEqual(stockFilters(new URL(stockFiltersHref(stockFilters(input)), "https://example.test").searchParams), stockFilters(input));
  assert.equal(stockFilters(new URLSearchParams("view=bogus&sort=bogus&page=-9")).page, 1);
  assert.equal(stockFilters(new URLSearchParams("view=all")).sort, "name");
  assert.equal(stockFilters(new URLSearchParams("page=Infinity")).page, 100);
});
test("quote dates use Stockholm, do not imply causality, and never invent a missing value", () => {
  const now = Date.parse("2026-09-07T22:30:00Z"); // 8 September locally
  const current = directoryQuote({ symbol: "A.ST", price: 0.3, changePct: -1, quoteTime: now - 60_000 }, now);
  assert.equal(current.period, "Idag");
  assert.match(current.price, /kr$/);
  assert.equal(current.change, -1);
  const older = directoryQuote({ symbol: "A.ST", price: null, quoteTime: "2026-09-07T17:30:00Z" }, now);
  assert.match(older.period, /7 sep.*2026/);
  assert.equal(older.price, "Kurs saknas");
  assert.equal(older.change, null);
  assert.equal(directoryQuote({ quoteTime: now + 1 }, now).period, "Kurstid saknas");
  assert.equal(directoryQuote({ symbol: "UNKNOWN", price: 1 }, now).currencyMissing, true);
  assert.match(directoryQuote({ symbol: "US", currency: "USD", price: 1 }, now).price, /USD$/);
});
