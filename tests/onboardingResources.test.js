import test from "node:test";
import assert from "node:assert/strict";
import { requestAccount } from "../app/utils/accountRequest.js";
import { onboardingTopicOptions, requestOnboardingTopics } from "../app/utils/onboardingTopics.js";
import { fetchAllArticles } from "../app/utils/api.js";

test("account reads distinguish authentication rejection from unavailable and malformed accounts", async () => {
  for (const status of [401, 403]) assert.equal((await requestAccount({ fetcher: async () => new Response("", { status }) })).email, null);
  assert.equal((await requestAccount({ fetcher: async () => Response.json({ error: "No token provided" }) })).email, null);
  assert.equal((await requestAccount({ fetcher: async () => Response.json({ email: null, verified: false, plan: "free" }) })).email, null);
  assert.equal((await requestAccount({ fetcher: async () => Response.json({ email: null, plan: "free" }) })).email, null);
  await assert.rejects(requestAccount({ fetcher: async () => Response.json({ error: true }, { status: 503 }) }), error => error.status === 503);
  await assert.rejects(requestAccount({ fetcher: async () => Response.json({ error: "Failed to fetch user" }) }));
  await assert.rejects(requestAccount({ fetcher: async () => Response.json(null) }));
  await assert.rejects(requestAccount({ fetcher: async () => Response.json({ email: null }) }));
  await assert.rejects(requestAccount({ fetcher: async () => { throw new Error("offline"); } }));
});

test("account fetch is private, uncached and bounded", async () => {
  const account = { email: "reader@example.test", verified: true, plan: "plus", topics: ["ORDER"] };
  assert.deepEqual(await requestAccount({ fetcher: async (url, options) => {
    assert.match(url, /\/user$/); assert.equal(options.credentials, "include"); assert.equal(options.cache, "no-store");
    return Response.json(account);
  } }), account);
  await assert.rejects(requestAccount({ timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }) }), { name: "AbortError" });
});

test("optional topics use actual vocabulary, translated search and balanced bounded options", () => {
  const vocabulary = { events: ["EARNINGS", "ORDER", "ORDER", "GUIDANCE"], sectors: ["Technology", "Industrials"], segments: ["LARGE_CAP"] };
  assert.deepEqual(onboardingTopicOptions(vocabulary, ["ORDER", "legacy-id"]), ["EARNINGS", "Technology", "LARGE_CAP", "GUIDANCE", "Industrials"]);
  assert.deepEqual(onboardingTopicOptions(vocabulary, [], " Teknik "), ["Technology"]);
  assert.deepEqual(onboardingTopicOptions(vocabulary, [], "vinst"), ["GUIDANCE"]);
  assert.deepEqual(onboardingTopicOptions(null), []);
  assert.deepEqual(onboardingTopicOptions({ events: "bad" }), []);
});

test("topic writes retain unrelated saved IDs and errors never masquerade as saved choices", async () => {
  const topics = ["legacy-id", "Technology"];
  await requestOnboardingTopics({ topics, fetcher: async (url, options) => {
    assert.match(url, /\/user\/topics$/); assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include"); assert.deepEqual(JSON.parse(options.body), { topics });
    return Response.json({ topics });
  } });
  assert.deepEqual(await requestOnboardingTopics({ fetcher: async () => Response.json({ events: ["ORDER"] }) }), { events: ["ORDER"] });
  for (const value of [{ error: true }, {}, { events: [42] }]) await assert.rejects(requestOnboardingTopics({ fetcher: async () => Response.json(value) }));
  await assert.rejects(requestOnboardingTopics({ topics, fetcher: async () => Response.json({ error: true }, { status: 503 }) }));
  await assert.rejects(requestOnboardingTopics({ timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }) }), { name: "AbortError" });
});

test("leaving the morning preview cancels its read without a console error", async () => {
  const originalFetch = globalThis.fetch, originalLog = console.error;
  const logs = [];
  try {
    globalThis.fetch = async () => { throw new DOMException("Aborted", "AbortError"); };
    console.error = (...args) => logs.push(args);
    await assert.rejects(fetchAllArticles(), { name: "AbortError" });
    assert.deepEqual(logs, []);
  } finally { globalThis.fetch = originalFetch; console.error = originalLog; }
});
