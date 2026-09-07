import test from "node:test";
import assert from "node:assert/strict";
import {
  membershipPlans,
  memberPlan,
  checkoutDestination,
} from "../app/utils/membership.js";

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
