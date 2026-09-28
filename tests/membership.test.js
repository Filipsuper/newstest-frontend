import test from "node:test";
import assert from "node:assert/strict";
import {
  membershipPlans,
  memberPlan,
  checkoutDestination,
  companyLimit,
  hasTerminalPlan,
} from "../app/utils/membership.js";

test('company limits and Terminal entitlement match the new memberships', () => {
  for (const [plan, limit, terminal] of [['free', 2, false], ['plus', 20, false], ['premium', 100, true], ['unknown', 2, false]]) {
    assert.equal(companyLimit(plan), limit);
    assert.equal(hasTerminalPlan({ email: 'reader@example.test', plan }), terminal);
  }
  assert.equal(hasTerminalPlan({ email: null, plan: 'premium' }), false);
  assert.equal(hasTerminalPlan(null), false);
  assert.ok(!membershipPlans.find(plan => plan.id === 'plus').features.some(text => text.includes('Terminal')));
});

test("membership presents unchanged prices and internal plan names", () => {
  assert.deepEqual(
    membershipPlans.map(({ id, price }) => [id, price]),
    [
      ["free", 0],
      ["plus", 49],
      ["pro", 99],
    ],
  );
  assert.equal(memberPlan(null), null);
  assert.equal(memberPlan({ email: null, plan: "premium" }), null);
  for (const [plan, expected] of [
    ["free", "free"],
    ["plus", "plus"],
    ["premium", "pro"],
    ["unknown", "free"],
  ])
    assert.equal(memberPlan({ email: "reader@example.test", plan }), expected);
});

test("checkout only navigates to a successful Stripe-hosted HTTPS destination", () => {
  const url = "https://checkout.stripe.com/c/pay/cs_test_fixture";
  assert.equal(checkoutDestination({ url }), url);
  for (const response of [
    null,
    {},
    { error: "Unavailable", url },
    ...[
      "javascript:alert(1)",
      "http://checkout.stripe.com/pay",
      "https://checkout.stripe.com.evil.test/pay",
      "https://example.test/checkout.stripe.com",
      "https://checkout.stripe.com:444/pay",
      "https://reader@checkout.stripe.com/pay",
      "//checkout.stripe.com/pay",
      "/pro/klart",
    ].map((url) => ({ url })),
  ])
    assert.throws(() => checkoutDestination(response));
});
