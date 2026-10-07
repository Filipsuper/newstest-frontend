import test from "node:test";
import assert from "node:assert/strict";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive, primaryNavigationHref, navigationPathname, canonicalWatchHref } from "../app/utils/navigation.js";
import robots from "../app/robots.js";

test("the five everyday destinations are visible, distinct and preserve their canonical routes", () => {
  assert.deepEqual(PRIMARY_NAVIGATION, [
    { href: "/marknaden", label: "Marknaden" },
    { href: "/marknaden/bevakning", label: "Mina bolag" },
    { href: "/aktier", label: "Aktier" },
    { href: "/aktier/screener", label: "Screener" },
    { href: "/nyhetsbrev", label: "Breven" },
  ]);
});

test("market, chronological news and Stories stay in one editorial destination", () => {
  for (const route of [
    "/marknaden", "/marknaden/nyheter", "/marknaden/stories",
    "/nyhet/story-1", "/story/report-1", "/marknadsnyheter",
  ]) {
    assert.deepEqual(
      PRIMARY_NAVIGATION.filter(({ href }) => isPrimaryNavigationActive(route, href))
        .map(({ label }) => label),
      ["Marknaden"],
      route,
    );
  }
  assert.equal(isPrimaryNavigationActive("/marknaden-extra", "/marknaden"), false);
  assert.equal(isPrimaryNavigationActive("/bevakning-extra", "/marknaden"), false);
});

test("nested personal and screener routes never also activate their parent destination", () => {
  for (const [route, label] of [
    ["/marknaden/bevakning", "Mina bolag"],
    ["/marknaden/bevakning/hantera", "Mina bolag"],
    ["/bevakning", "Mina bolag"],
    ["/bevakning/hantera", "Mina bolag"],
    ["/mina-aktier", "Mina bolag"],
    ["/aktier/screener", "Screener"],
    ["/aktier/screener/saved", "Screener"],
    ["/screener", "Screener"],
  ]) {
    assert.deepEqual(
      PRIMARY_NAVIGATION.filter(({ href }) => isPrimaryNavigationActive(route, href))
        .map(({ label }) => label),
      [label],
      route,
    );
  }
  assert.equal(primaryNavigationHref("/marknaden/bevakning-extra"), "/marknaden");
  assert.equal(primaryNavigationHref("/aktier/screener-extra"), "/aktier");
});

test("intercepted news preserves the mounted source, while direct/shared articles use their own route", () => {
  const news = "/nyhet/a-report~story-1";
  assert.equal(navigationPathname(news, ["marknaden", "bevakning"], ["(.)nyhet", "a-report~story-1"]), "/marknaden/bevakning");
  assert.equal(navigationPathname(news, ["aktier", "screener"], ["(.)nyhet", "a-report~story-1"]), "/aktier/screener");
  assert.equal(navigationPathname(news, ["(workspace)", "aktie", "NORD.TEST"], ["(.)nyhet", "a-report~story-1"]), "/aktie/NORD.TEST");
  assert.equal(navigationPathname(news, ["nyhet", "a-report~story-1"], []), news);
  assert.equal(navigationPathname(news, null, null), news);
  assert.equal(navigationPathname("/story/report-1", ["story", "report-1"], []), "/story/report-1");
});

test("company and letter context keep their primary destination while Terminal stays secondary", () => {
  for (const [route, label] of [
    ["/aktier", "Aktier"], ["/aktie/NORD.TEST", "Aktier"],
    ["/article/edition-1", "Breven"], ["/morgonbrevet", "Breven"],
    ["/kvallsbrevet", "Breven"],
  ]) {
    assert.deepEqual(
      PRIMARY_NAVIGATION.filter(({ href }) => isPrimaryNavigationActive(route, href))
        .map((link) => link.label),
      [label],
    );
  }
  for (const route of ["/", "/terminal", "/terminal/workspace", "/settings", "/pro", "/kom-igang"])
    assert.equal(PRIMARY_NAVIGATION.some(({ href }) => isPrimaryNavigationActive(route, href)), false);
  assert.equal(primaryNavigationHref(), null);
});

test("legacy watch URLs retain filter and repeated query values at a fixed local destination", () => {
  const params = {
    filter: "topics", topic: ["Rapporter", "Räntor & valuta"],
    redirectTo: "https://example.test/elsewhere", absent: undefined,
  };
  for (const manage of [false, true]) {
    const result = new URL(canonicalWatchHref(params, manage), "https://omxsum.com");
    assert.equal(result.origin, "https://omxsum.com");
    assert.equal(result.pathname, `/marknaden/bevakning${manage ? "/hantera" : ""}`);
    assert.equal(result.searchParams.get("filter"), "topics");
    assert.deepEqual(result.searchParams.getAll("topic"), ["Rapporter", "Räntor & valuta"]);
    assert.equal(result.searchParams.has("absent"), false);
  }
  assert.equal(canonicalWatchHref(), "/marknaden/bevakning");
  assert.equal(canonicalWatchHref({}, true), "/marknaden/bevakning/hantera");
});

test("canonical personal workspace remains excluded from indexing", () => {
  assert.ok(robots().rules.disallow.includes("/marknaden/bevakning"));
  assert.ok(!robots().rules.disallow.includes("/marknaden"));
});
