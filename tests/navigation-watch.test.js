import test from "node:test";
import assert from "node:assert/strict";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive, canonicalWatchHref } from "../app/utils/navigation.js";
import robots from "../app/robots.js";

test("watch, market and story routes belong to the same primary destination", () => {
  for (const route of [
    "/marknaden", "/marknaden/nyheter", "/marknaden/bevakning",
    "/marknaden/bevakning/hantera", "/nyhet/story-1", "/bevakning",
    "/bevakning/hantera", "/mina-aktier",
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

test("company and letter context keep their primary destination while Terminal stays secondary", () => {
  for (const [route, label] of [
    ["/aktie/NORD.TEST", "Aktier"], ["/aktier/screener", "Aktier"],
    ["/article/edition-1", "Breven"], ["/morgonbrevet", "Breven"],
    ["/kvallsbrevet", "Breven"],
  ]) {
    assert.deepEqual(
      PRIMARY_NAVIGATION.filter(({ href }) => isPrimaryNavigationActive(route, href))
        .map((link) => link.label),
      [label],
    );
  }
  for (const route of ["/", "/terminal", "/terminal/workspace"])
    assert.equal(PRIMARY_NAVIGATION.some(({ href }) => isPrimaryNavigationActive(route, href)), false);
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
