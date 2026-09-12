import test from "node:test";
import assert from "node:assert/strict";
import { currentLetter, letterExcerpt, letterTakeaways } from "../app/utils/letters.js";

test("preview takes at most two supplied newsletter points in editorial order", () => {
  const article = {
    introText: "En generell introduktion till dagens brev.",
    bulletPoints: "\n - &&Industrin&& höjer prognosen.\n\n• [Bolaget](https://example.test) får en order.\n* Den tredje punkten finns i brevet.",
  };
  assert.deepEqual(letterTakeaways(article), [
    "Industrin höjer prognosen.",
    "Bolaget får en order.",
  ]);
  assert.equal(letterTakeaways(article).includes(article.introText), false);
});

test("bullet parsing preserves emphasis, signed figures and complete supplied text", () => {
  assert.deepEqual(letterTakeaways({ bulletPoints: "**Bolaget** föll med -1,2 procent.\n2. /green/Stark orderingång/green/." }), [
    "Bolaget föll med -1,2 procent.",
    "Stark orderingång.",
  ]);
  assert.deepEqual(letterTakeaways({ bulletPoints: [" - Första punkten.", null, {}, "Andra punkten.", "Tredje."] }), [
    "Första punkten.", "Andra punkten.",
  ]);
});

test("absent or empty bullets never manufacture takeaways from intro or body", () => {
  const prose = { introText: "Introduktion.", summary: "- En lista i brödtexten." };
  assert.deepEqual(letterTakeaways(prose), []);
  assert.deepEqual(letterTakeaways({ ...prose, bulletPoints: "\n - \n • \n" }), []);
  assert.deepEqual(letterTakeaways({ ...prose, bulletPoints: {} }), []);
  assert.deepEqual(letterTakeaways(null), []);
});

test("fallback excerpt uses supplied intro, then a supplied point, then summary", () => {
  assert.equal(letterExcerpt({ introText: " **Inledning**. ", summary: "Brödtext." }), "Inledning.");
  assert.equal(letterExcerpt({ introText: "  ", bulletPoints: "- En levererad punkt.", summary: "Brödtext." }), "En levererad punkt.");
  assert.equal(letterExcerpt({ summary: "[Bolaget](https://example.test) växer." }), "Bolaget växer.");
  assert.equal(letterExcerpt(null), "");
});

test("shortened fallback ends on a complete word and leaves short copy unchanged", () => {
  assert.equal(letterExcerpt({ introText: "Bolaget höjer helårsprognosen efter rapporten." }, 20), "Bolaget höjer…");
  assert.equal(letterExcerpt({ introText: "Kort besked." }, 20), "Kort besked.");
  assert.equal(letterExcerpt({ introText: "Helårsprognosen höjs." }, 8), "Helårsprognosen…");
  assert.equal(letterExcerpt({ introText: "Helårsprognosen" }, 8), "Helårsprognosen");
});

test("preview changes retain the published morning/evening cutoff and actual edition", () => {
  const morning = { title: "Morgonens faktiska rubrik", createdAt: "2026-09-11T05:00:00Z", isEveningLetter: false };
  const evening = { title: "Kvällens faktiska rubrik", createdAt: "2026-09-11T15:00:00Z", isEveningLetter: true };
  assert.equal(currentLetter([morning, evening], "2026-09-11T15:29:00Z"), morning);
  assert.equal(currentLetter([morning, evening], "2026-09-11T15:30:00Z"), evening);
  assert.equal(currentLetter([morning, evening], "2026-09-13T16:00:00Z"), morning);
  assert.equal(morning.createdAt, "2026-09-11T05:00:00Z");
});
