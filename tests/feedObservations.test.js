import test from "node:test";
import assert from "node:assert/strict";
import { feedStoryToItem, matchingObservations } from "../app/utils/feedObservations.js";
import { refreshMarketObservations, mergeFeed } from "../app/utils/newsroom.js";
const story = { id: "one", version: 1, publishedAt: "2026-09-21T08:00:00Z", headline: "Original news", companies: [{ symbol: "ONE.ST" }], reaction: { pct: 2, asOf: 123 } };
test("deferred headlines preserve observed metrics and their source time", () => {
    const before = feedStoryToItem(story);
    const { reaction, ...deferred } = story;
    assert.equal(feedStoryToItem(deferred).reaction, undefined);
    assert.equal(mergeFeed([before], [feedStoryToItem(deferred)])[0].reaction.asOf, 123);
    assert.equal(refreshMarketObservations([before], [feedStoryToItem(deferred)])[0].reaction.asOf, 123);
    assert.equal(refreshMarketObservations([before], [feedStoryToItem({ ...story, reaction: null })])[0].reaction, null);
});
test("metrics cannot change copy, order, story revision, company or publication timestamp", () => {
    const current = [feedStoryToItem(story)];
    for (const change of [{ version: 2 }, { publishedAt: "2026-09-20T08:00:00Z" }, { companies: [{ symbol: "TWO.ST" }] }])
        assert.deepEqual(matchingObservations(current, [{ ...story, ...change }]), []);
    const incoming = matchingObservations(current, [{ ...story, headline: "Must not replace news", reaction: { pct: 5, asOf: 124 } }]);
    const updated = refreshMarketObservations(current, incoming.map(feedStoryToItem));
    assert.equal(updated[0].title, story.headline); assert.equal(updated[0].reaction.pct, 5);
});
