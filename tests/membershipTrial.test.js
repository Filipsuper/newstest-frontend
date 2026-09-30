import test from "node:test";
import assert from "node:assert/strict";
import { activeTrialPresentation, startMembershipTrial, trialEndLabel } from "../app/utils/membershipTrial.js";

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

test("trial presentation never labels an expired, paid, unused or malformed trial as active", () => {
  const now = Date.parse("2026-09-30T12:00:00Z");
  const trial = { status: "active", plan: "plus", endsAt: now + 7 * 86400000 };
  assert.deepEqual(activeTrialPresentation(trial, now), { name: "Plus", remainingLabel: "7 dagar kvar", shortRemainingLabel: "7 d kvar" });
  assert.deepEqual(activeTrialPresentation({ ...trial, plan: "pro", endsAt: now + 86400000 }, now), { name: "Pro", remainingLabel: "1 dag kvar", shortRemainingLabel: "1 d kvar" });
  assert.equal(activeTrialPresentation({ ...trial, endsAt: now + 3600000 }, now).remainingLabel, "Mindre än en dag kvar");
  assert.equal(activeTrialPresentation({ ...trial, endsAt: now + 3600000 }, now).shortRemainingLabel, "<1 d kvar");
  assert.equal(activeTrialPresentation({ ...trial, endsAt: now + 86400001 }, now).shortRemainingLabel, "2 d kvar");
  for (const value of [undefined, { ...trial, status: "unused" }, { ...trial, status: "expired" },
    { ...trial, status: "converted" }, { ...trial, plan: "unknown" }, { ...trial, endsAt: "tomorrow" },
    { ...trial, endsAt: 1e18 }, { ...trial, endsAt: now }, { ...trial, endsAt: now - 1 }]) assert.equal(activeTrialPresentation(value, now), null);
  assert.equal(trialEndLabel({ endsAt: 1e18 }), "");
});
