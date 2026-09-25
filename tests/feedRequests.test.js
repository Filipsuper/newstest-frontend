import test from "node:test";
import assert from "node:assert/strict";
import { fetchLiveFeed, fetchPersonalFeed, fetchFeedObservations, fetchInsiders, fetchShorts } from "../app/utils/api.js";

test('registry requests keep credentials, combine cancellation with a timeout, and reject failures', async t => {
  const signals = [], durations = [];
  t.mock.method(AbortSignal, 'timeout', duration => { durations.push(duration); return new AbortController().signal; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /\/feed\/company\/NORD.TEST\/(insiders|shorts)$/);
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
    signals.push(options.signal);
    return Response.json({ symbol: 'NORD.TEST', available: false, status: 'unsupported' });
  });
  const controller = new AbortController();
  await fetchInsiders('NORD.TEST', { signal: controller.signal });
  await fetchShorts('NORD.TEST', { signal: controller.signal });
  assert.deepEqual(durations, [12000, 12000]);
  controller.abort();
  assert.ok(signals.every(signal => signal.aborted));
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unavailable' }, { status: 503 }));
  await assert.rejects(fetchShorts('NORD.TEST'), /Unavailable/);
  await assert.rejects(fetchInsiders('NORD.TEST'), /Unavailable/);
});

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
  assert.deepEqual(durations, [15000, 25000]);
});

test("a broken personal-feed response becomes unavailable rather than an unhandled rejection", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => { throw new SyntaxError("Incomplete response"); },
  }));
  assert.equal(await fetchPersonalFeed(), null);
});
