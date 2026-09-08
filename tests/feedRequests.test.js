import test from "node:test";
import assert from "node:assert/strict";
import { fetchLiveFeed, fetchPersonalFeed } from "../app/utils/api.js";

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
  assert.deepEqual(await fetchLiveFeed({ limit: 100 }), { items: [], nextCursor: null });
  assert.deepEqual(durations, [15000]);
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
