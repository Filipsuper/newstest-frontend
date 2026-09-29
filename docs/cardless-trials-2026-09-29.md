# Seven-day cardless trials

Local only; not deployed. Builds on the account-first onboarding change.

## Contract

An eligible verified Free account chooses Plus or Pro explicitly. One seven-day
period across both plans; no restart, switching to reset time, or implicit trial
on registration. Accounts with a prior trial, existing Stripe customer/subscription,
pending checkout or paid history are excluded. Manual paid accounts stay paid.
Trial start changes only the plan and `membershipTrial`; no Mail, following,
company-alert consent, Stripe customer, subscription or payment write.

POST `/api/user/trial` accepts only `tier: plus | pro`. The server owns epoch-ms
start/end times. `/api/user` exposes a bounded `trial` resource and hides internal
trial/checkout records. Same-plan retries return the original trial period.
Cross-plan/concurrent requests use the account compare-and-set fence.

`membershipTrial` remains stored after expiry to prevent repeats. Native expiry
sets plan Free, marks the trial expired and reconciles company-alert safety in
one conditional write. It never deletes excess follows or changes newsletter
subscriptions. Restoring paid access cannot silently re-enable paused alerts.

## Expiry and conversion

Reconcile due trials before the HTTP server starts, every 30 seconds afterward,
and before authenticated/optional-auth requests. Database failures fail closed
for authenticated reads rather than leaking stale paid access. Queue/send-time
alert checks and personal-newsletter blocks independently evaluate expiry, even
before the database sweep. Keep the backend running; do not rely on a browser
being open or on Mongo TTL (which would erase the repeat-trial guard).

Trial users may explicitly buy either paid plan in Stripe. Pricing says payment
starts immediately when completing checkout; unused trial days are not credited.
Checkout reserves the account before Stripe writes and retries use the same
idempotency key. Existing subscriptions must be managed, not duplicated. There
is at most one pending tier per account; another tier waits for that reservation
to expire. An abandoned Stripe customer currently makes a Free account ineligible
for a trial; this conservative policy can be improved after observing usage.

Signed webhooks retrieve the current Stripe subscription instead of granting
access from an old event payload. Known price lookup keys define entitlements;
unknown prices never default to Pro. Paid conversion marks a native trial
converted in the same account write, so its old expiry cannot revoke payment.
Failed handlers return 503 for provider retry. Old subscription cancellations
cannot revoke another current subscription. Checkout success does not treat
an active native trial as proof of payment.

## UI and release

Shared `MembershipTrial` offers compact Plus/Pro cards in onboarding's email
step (not the company picker) and on pricing. Activation unlocks the email
editor in place, without opting in. Settings shows a Stockholm end date and no automatic charge.
Free continuation remains available even if trial activation fails. The feature
does not broaden the private company-email delivery pilot.

Ship backend and frontend together. Existing price lookup keys are reused;
no Stripe trial products or billing configuration are needed. Keep the existing
signed Checkout/subscription webhooks and add subscription.created if absent
(completed/updated remain supported). No production mutations were performed.

Validation uses fictional browser accounts, mocked Stripe and an isolated,
owned local MongoDB. Before accepting real payment, verify checkout, signed
webhook retry and conversion with Stripe test-mode credentials; those external
integration checks are not claimed by mocked tests.

## Local validation

- Frontend: 285 unit tests passed; production compilation/static generation and
  standalone dependency tracing completed in `.next-trial-release`.
- Backend: 428 unit tests passed, two opt-in suites skipped in the ordinary run.
- Separate owned Mongo run: 52 checks passed, including competing trial starts,
  no-consent mutation, expiry without login, excess-follow preservation, paused
  alerts, paid conversion, checkout retries and expired reservation recovery.
- Browser coverage: 70 onboarding/membership/settings/email checks. Three
  environment-related navigation/timeouts in the broad run passed a targeted
  single-worker rerun; all trial tests passed. Trial screenshots and accessibility
  audits covered 320/390/1440px in light/dark themes.
- No production database, live Stripe session, outbound email or deployment.
