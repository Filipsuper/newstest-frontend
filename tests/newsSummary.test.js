import test from "node:test";
import assert from "node:assert/strict";
import { newsSummary } from "../app/utils/newsSummary.js";
import { storyToItem } from "../app/utils/storyToItem.js";
import { normalizeStory, personalStoryToItem, pendingChanges, mergeFeed } from "../app/utils/newsroom.js";

const aiSummary = { text: "AI-text", bullets: ["Punkt ett", "Punkt två"] };
const story = { id: "story-1", headline: "Rubrik", publishedAt: "2026-09-07T08:00:00Z",
  summary: "Deterministisk text", aiSummary, importance: 75, version: 2, status: "flash" };

test("AI copy survives feed, reader and personal adapters without changing ranking input", () => {
  for (const value of [storyToItem(story), normalizeStory(story), personalStoryToItem(story)]) {
    assert.deepEqual(value.aiSummary, aiSummary);
    assert.equal(value.summary, "Deterministisk text");
    assert.equal(value.importance, 75);
  }
  assert.equal(storyToItem({ ...story, aiSummary: undefined }).aiSummary, null);
});

test("AI presentation ignores invalid fields, trims/deduplicates bullets and caps at three", () => {
  assert.deepEqual(newsSummary({ text: " AI-text ", bullets: [null, 0, {}, " A ", "A", "", "B", "C", "D"] }),
    { text: "AI-text", bullets: ["A", "B", "C"] });
  for (const value of [null, {}, "Template", { text: {}, bullets: "Template" }])
    assert.equal(newsSummary(value), null);
  assert.deepEqual(newsSummary({ text: "", bullets: ["Punkt"] }), { text: "", bullets: ["Punkt"] });
});

test("same-version AI enrichment is queued but price-only changes are not", () => {
  const current = storyToItem({ ...story, aiSummary: null });
  const enriched = storyToItem(story);
  assert.equal(pendingChanges([current], [enriched]).length, 1);
  assert.equal(pendingChanges([enriched], [{ ...enriched, reaction: { pct: 8 } }]).length, 0);
  assert.equal(pendingChanges([enriched], [{ ...enriched, version: 1, aiSummary: { text: "Old" } }]).length, 0);
  assert.equal(pendingChanges([enriched], [current]).length, 0);
});

test("wire refreshes cannot erase same-version AI copy, but a new story version clears old copy", () => {
  const enriched = storyToItem(story);
  const wireOnly = storyToItem({ ...story, aiSummary: undefined });
  assert.deepEqual(mergeFeed([enriched], [wireOnly])[0].aiSummary, aiSummary);
  assert.equal(mergeFeed([enriched], [{ ...wireOnly, version: 3 }])[0].aiSummary, null);
});
