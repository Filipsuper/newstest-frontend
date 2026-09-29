import test from "node:test";
import assert from "node:assert/strict";
import { startMembershipTrial, trialEndLabel } from "../app/utils/membershipTrial.js";

test("trial start uses explicit tier only, not newsletters or card data", async () => {
  const trial = { status: "active", plan: "plus", endsAt: 1800000000000, autoRenews: false };
  const result = await startMembershipTrial("plus", { fetcher: async (url, options) => {
    assert.ok(url.endsWith("/user/trial")); assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include"); assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(options.body), { tier: "plus" }); return Response.json(trial);
  } });
  assert.deepEqual(result, trial);
  assert.ok(trialEndLabel(trial).length > 0);
  assert.equal(trialEndLabel({ endsAt: Date.parse("2026-10-06T20:52:00Z") }, { includeTime: false }), "6 oktober");
  assert.match(trialEndLabel({ endsAt: Date.parse("2026-10-06T20:52:00Z") }), /22:52/);
});
test("trial errors and unverified response never claim activation", async () => {
  await assert.rejects(startMembershipTrial("free"));
  for (const response of [Response.json({}, { status: 409 }), Response.json({}),
    Response.json({ status: "active", plan: "pro", endsAt: 1800000000000, autoRenews: false })]) {
    await assert.rejects(startMembershipTrial("plus", { fetcher: async () => response }));
  }
});
