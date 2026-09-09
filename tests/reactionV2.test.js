import test from "node:test";
import assert from "node:assert/strict";
import { previewStories } from "../app/designsystem/reactions/fixtures.js";
import { storyToItem } from "../app/utils/storyToItem.js";
import { reactionV2For, rowReaction, reactionSeriesFor, retainReactionV2, preferredReactionPeriod, preferredVolumePeriod } from "../app/utils/reactionV2.js";
import { reactionGeometry } from "../app/utils/reactionGeometry.js";
import { changedFeedItems, mergeFeed, refreshMarketObservations, personalStoryToItem } from "../app/utils/newsroom.js";

test("v2 rows use a completed consistent period, not the legacy 99%", () => {
  const item = storyToItem(previewStories()[0]);
  assert.equal(rowReaction(item).pct, 4.2);
  assert.equal(rowReaction(item).label, "1 tim efter nyheten");
  assert.equal(item.reaction.pct, 99); // Ranking inputs weren't mutated.
});
test("default measurement advances chronologically through close and next close, not by size", () => {
  const item = storyToItem(previewStories()[0]);
  const measurement = item.reactionV2.measurements[0];
  measurement.windows.h1.status = "pending";
  assert.equal(preferredReactionPeriod(measurement), "m15");
  measurement.windows.h1.status = "complete";
  assert.equal(preferredReactionPeriod(measurement), "h1");
  for (const key of ["session_close", "next_session_close"]) {
    const window = measurement.windows[key];
    Object.assign(window, { status: "complete", pct: 0, endpoint: { price: 100, priceAt: window.targetAt } });
    assert.equal(preferredReactionPeriod(measurement), key);
    assert.equal(rowReaction(item).pct, 0);
    assert.equal(rowReaction(item).period, key);
  }
});
test("visible volume facts use the latest complete window and preserve real zero", () => {
  const measurement = previewStories()[0].reactionV2.measurements[0];
  assert.equal(preferredVolumePeriod(measurement), "m30");
  measurement.volume.m30.post.status = "pending";
  assert.equal(preferredVolumePeriod(measurement), "m15");
  measurement.volume.m15.post.status = "incomplete_coverage";
  measurement.volume.m5.post.volume = 0;
  assert.equal(preferredVolumePeriod(measurement), "m5");
  measurement.volume.m5.post.volume = null;
  assert.equal(preferredVolumePeriod(measurement), "m5");
});
test("missing v2 observation is not zero and does not borrow a legacy percentage", () => {
  assert.equal(rowReaction(storyToItem(previewStories()[4])).pct, null);
  assert.equal(rowReaction(storyToItem(previewStories()[3])).status, "Inväntar börsöppning");
});
test("older APIs keep their existing presentation", () => {
  const story = storyToItem(previewStories()[0]); delete story.reactionV2;
  assert.deepEqual(rowReaction(story), { version: 1, scope: "event", companySession: null, pct: 99, label: "Sedan publicering" });
});
test("mismatched story version or publication is rejected", () => {
  const story = storyToItem(previewStories()[0]);
  assert.equal(reactionV2For({ ...story, version: 2 }), null);
  assert.equal(reactionV2For({ ...story, ts: story.ts + 1 }), null);
  assert.equal(reactionV2For({ ...story, id: "other" }), null);
});
test("multi-company rows never borrow a second company's stronger move", () => {
  const story = storyToItem(previewStories()[5]);
  story.reactionV2.measurements[1].windows.h1.pct = 80;
  assert.equal(rowReaction(story).pct, 1.7);
  story.reactionV2.measurements.shift();
  assert.equal(rowReaction(story).pct, null);
});
test("next-opening measurements say opening, not publication", () => {
  assert.equal(rowReaction(storyToItem(previewStories()[2])).label, "1 tim efter öppning");
});
test("selected periods keep explicit chart gaps and exclude later prices", () => {
  const measurement = previewStories()[1].reactionV2.measurements[0];
  const series = reactionSeriesFor(measurement, "h1");
  assert.equal(reactionGeometry(series, measurement.anchorAt).path.match(/M/g).length, 2);
  const short = reactionSeriesFor(measurement, "m15");
  assert.equal(short.points.at(-1).t, Date.parse(measurement.windows.m15.targetAt));
});
test("completed periods without corresponding chart coverage have no graph", () => {
  const measurement = previewStories()[0].reactionV2.measurements[0];
  measurement.series.points = measurement.series.points.slice(0, 50);
  assert.equal(reactionSeriesFor(measurement, "h1"), null);
});
test("an optional lookup outage or stale observation retains the previous matching measurement", () => {
  const item = storyToItem(previewStories()[0]);
  assert.equal(retainReactionV2(item, { ...item, reactionV2: undefined }).asOf, item.reactionV2.asOf);
  assert.equal(retainReactionV2(item, { ...item, reactionV2: { ...item.reactionV2, asOf: 1 } }).asOf, item.reactionV2.asOf);
  assert.equal(retainReactionV2(item, { ...item, version: 2, reactionV2: undefined }), undefined);
  const raw = previewStories()[0]; delete raw.reactionV2;
  assert.equal(retainReactionV2(item, raw).asOf, item.reactionV2.asOf);
});
test("v2-only refreshes update observations without raising new-news counts", () => {
  const item = storyToItem(previewStories()[0]);
  const next = structuredClone(item);
  next.reactionV2.asOf += 60_000;
  next.reactionV2.measurements[0].windows.h1.pct = 5;
  assert.equal(changedFeedItems([item], [next]).length, 0);
  assert.equal(rowReaction(refreshMarketObservations([item], [next])[0]).pct, 5);
  assert.equal(rowReaction(mergeFeed([item], [{ ...item, reactionV2: undefined }])[0]).pct, 4.2);
});

test("an inconsistent chart endpoint is not paired with a valid KPI", () => {
  const measurement = previewStories()[0].reactionV2.measurements[0];
  measurement.series.points.at(-1).pct = 99;
  assert.equal(reactionSeriesFor(measurement, "h1"), null);
});

test("a blocked measurement cannot expose leftover returns or a chart", () => {
  const item = storyToItem(previewStories()[0]);
  item.reactionV2.measurements[0].status = "retracted";
  assert.equal(rowReaction(item).pct, null);
  assert.equal(reactionSeriesFor(item.reactionV2.measurements[0], "h1"), null);
});

test("personal stories retain their version and second-company measurements", () => {
  const story = previewStories()[5];
  story.version = story.reactionV2.storyVersion = 3;
  const item = personalStoryToItem(story);
  assert.equal(item.version, 3);
  assert.equal(reactionV2For(item).measurements.length, 2);
  assert.equal(item.companies[1].symbol, "SKAR.TEST");
});
