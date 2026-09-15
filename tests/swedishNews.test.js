import test from "node:test";
import assert from "node:assert/strict";
import { isSwedishNews } from "../app/utils/swedishNews.js";
test("overview follows Swedish listings, not the headline language", () => {
  for (const symbol of ["VOLV-B.ST", "XSTO.VOLV-B", "XSAT.TEST", "XNGM.TEST"]) {
    assert.equal(isSwedishNews({ headline: "English release", companies: [{ symbol }] }), true);
  }
  for (const symbol of ["XCSE.DSV", "XHEL.HKFOODS", "XOSL.CRNA", "DSV.CO", "AAPL", "UNKNOWN"]) {
    assert.equal(isSwedishNews({ headline: "Svensk rubrik", companies: [{ symbol }] }), false);
  }
  assert.equal(isSwedishNews({ companies: [{ symbol: "XCSE.DSV" }, { symbol: "VOLV-B.ST" }] }), true);
  assert.equal(isSwedishNews({ companies: [{ symbol: "FOO.ST", exchangeMic: "XCSE" }] }), false);
  assert.equal(isSwedishNews({ primarySource: { name: "riksbank" } }), true);
  assert.equal(isSwedishNews({ source: "riksbank", companies: [] }), true);
  assert.equal(isSwedishNews({}), false);
});
