import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url));
const preview = read("../app/components/TerminalPreview.jsx").toString();

for (const view of ["trading", "financials"]) {
  test(`terminal ${view} preview uses the complete October 6 screenshot`, () => {
    const filename = `terminal-${view}-2026-10-06.png`;
    const image = read(`../public/images/${filename}`);
    assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(image.readUInt32BE(16), 2940);
    assert.equal(image.readUInt32BE(20), 1598);
    assert.ok(preview.includes(`../../public/images/${filename}`));
  });
}

test("terminal screenshots retain a dated, non-live disclosure and accurate descriptions", () => {
  assert.match(preview, /Skärmbild 6 okt\. 2026\. Visar inte aktuella kurser\./);
  assert.match(preview, /Better Collectives kursgraf/);
  assert.match(preview, /bolags- och marknadsnyheter, screener, observerade ticks och market tape/);
  assert.match(preview, /Swecos finansiella graf och rapporttabell/);
  assert.doesNotMatch(preview, /terminal-(?:trading|financials)-2026-09-28|Cibus|CombinedX|avslutsflöde/);
});

test("landing and terminal gateway share the versioned screenshot component", () => {
  assert.match(read("../app/components/HomePage.jsx").toString(), /<TerminalPreview\s*\/>/);
  assert.match(read("../app/components/TerminalShowcase.jsx").toString(), /<TerminalPreview\s*\/>/);
  assert.match(read("../app/components/TerminalGateway.jsx").toString(), /<TerminalShowcase\s*\/>/);
});
