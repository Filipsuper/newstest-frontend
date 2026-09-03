import test from "node:test";
import assert from "node:assert/strict";
import {
    curateMarketNews,
    impactScore,
    insiderMateriality,
    uniqueNews,
} from "../app/utils/marketNewsRanking.js";

const story = (overrides = {}) => ({
    id: "story-1",
    eventId: "event-1",
    eventType: "m_and_a",
    ts: Date.parse("2026-09-03T07:00:00Z"),
    title: "Bolaget förvärvar Target AB",
    symbol: "TEST.ST",
    symbols: ["TEST.ST"],
    labels: ["M_AND_A"],
    importance: 90,
    facts: { direction: "acquisition", target: "Target AB" },
    reaction: { pct: 2 },
    language: "sv",
    sourceKind: "issuer_release",
    sourceNames: ["mfn"],
    sourceCount: 1,
    ...overrides,
});

test("a small insider transaction remains routine despite a large share move", () => {
    const insider = story({
        labels: ["INSIDER", "ACQUISITION"],
        importance: 90,
        facts: { grossValue: 105_357 },
        reaction: { pct: -18 },
    });
    assert.equal(insiderMateriality(insider), "routine");
    assert.equal(curateMarketNews([insider]).length, 0);
    assert.equal(impactScore(insider), 45);
});

test("duplicate language versions of the same factual event become one item", () => {
    const english = story({
        id: "story-en",
        eventId: "event-en",
        language: "en",
        title: "Company acquires Target AB",
        sourceNames: ["mfn"],
    });
    const swedish = story({
        id: "story-sv",
        eventId: "event-sv",
        language: "sv",
        sourceNames: ["cision"],
    });
    const result = uniqueNews([english, swedish]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "story-sv");
    assert.deepEqual(result[0].sourceNames.sort(), ["cision", "mfn"]);
    assert.equal(result[0].sourceCount, 2);
});

test("generic events with different ids are not accidentally collapsed", () => {
    const first = story({ id: "first", eventId: "event-a", facts: { kind: "unclassified" } });
    const second = story({ id: "second", eventId: "event-b", facts: { kind: "unclassified" } });
    assert.equal(uniqueNews([first, second]).length, 2);
});

