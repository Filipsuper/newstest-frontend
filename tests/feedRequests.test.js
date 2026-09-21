import test from "node:test";
import assert from "node:assert/strict";
import { fetchLiveFeed, fetchPersonalFeed, fetchFeedObservations } from "../app/utils/api.js";

test("initial and catch-up news requests are bounded, uncached and retain credentials", async (t) => {
  const durations = [];
  t.mock.method(AbortSignal, "timeout", (duration) => {
    durations.push(duration);
    return new AbortController().signal;
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/feed\/news\?/);
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ items: [], nextCursor: null });
  });
  assert.deepEqual(await fetchLiveFeed(), { items: [], nextCursor: null });
  assert.deepEqual(durations, [15000]);
});

test("first page is 20 deferred stories and observation requests contain only displayed references", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(new URL(url, "http://test.local"));
    assert.equal(options.credentials, "include");
    return Response.json({ items: [] });
  });
  await fetchLiveFeed();
  assert.equal(urls[0].searchParams.get("limit"), "20");
  assert.equal(urls[0].searchParams.get("reactions"), "deferred");
  await fetchFeedObservations({ stories: [{ id: "one", version: 3 }], known: new Map([["one", "a".repeat(24)]]) });
  assert.equal(urls[1].searchParams.get("stories"), "one:3");
  assert.equal(urls[1].searchParams.get("known"), `one:${"a".repeat(24)}`);
});

test("an HTTP failure with an items array is still a failed news load", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => Response.json({ items: [] }, { status: 503 }));
  await assert.rejects(fetchLiveFeed(), /Nyheterna kunde inte hämtas/);
});

test("timeout failures stay distinct from empty news and unavailable personal data", async (t) => {
  const durations = [];
  t.mock.method(console, "error", () => {});
  t.mock.method(AbortSignal, "timeout", (duration) => {
    durations.push(duration);
    return AbortSignal.abort(new DOMException("Timed out", "TimeoutError"));
  });
  t.mock.method(globalThis, "fetch", async (_, { signal }) => {
    signal.throwIfAborted();
  });
  await assert.rejects(fetchLiveFeed(), { name: "TimeoutError" });
  assert.equal(await fetchPersonalFeed({ limit: 3 }), null);
  assert.deepEqual(durations, [15000, 15000]);
});

test("a broken personal-feed response becomes unavailable rather than an unhandled rejection", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => { throw new SyntaxError("Incomplete response"); },
  }));
  assert.equal(await fetchPersonalFeed(), null);
});
