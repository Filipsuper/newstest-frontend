# Company email alerts — local phase 1 verification

## Release preparation — 13 September 2026

Deployment of preferences only was subsequently approved. The clean candidate
preserves frontend `37eb829` (with documentation baseline `72cf04c`) and the
already-running backend fixes through `0a31aaa`; it does not overwrite them with
the older development baselines below. The local-only bind-host change is excluded.

Rebased checks: 154 frontend unit tests, 282 backend tests (one opt-in Mongo test
skipped), 52 Chromium checks and zero dependency-audit findings. Local disk-full
failures were resolved by clearing approved temporary build output, then rerunning
all 52 checks successfully. Source repositories/databases were not removed.

The production build can opt in with the new Docker build argument
`NEXT_PUBLIC_COMPANY_ALERTS_ENABLED=true`; its default remains false. The backend
preference flag is independent, and actual alert delivery remains hard-disabled.
The [release history](release-history.md) records the final deployed revisions
and live checks once deployment succeeds. The following is the original local
implementation verification record, not a claim that the old baseline is deployed.

13 September 2026. Local implementation only. Nothing committed, pushed,
deployed, activated for production or sent to a real email address in this work.
See the [full plan and remaining work](company-email-alerts.md).

## Scope and ownership

- Frontend: `site`, based on `e6dae5d` (release documentation after `a22aa0c`).
  Existing unrelated SEO/archive/ranking edits were preserved. They were **not**
  copied into the isolated alert build described below.
- Backend: separate clean `backend-alerts` checkout, branch
  `codex/company-email-alerts`, based on `f321110` (documentation after `bdc2809`).
  The original dirty `newsbackend` checkout was not changed. No backend `.env`
  or production credentials were copied into this checkout.
- The user's full local development script and its local Mongo process were
  stopped. Checks use separately owned temporary fixture servers/databases;
  they are not the user's development services.

## Implemented contract

The shared Bevakning editor contains a collapsed email section, with a compact
entry from the personal feed, overview preview and account settings. The email
section precedes the potentially long followed-company list. Existing Bolag /
Ämnen / Nyckelord tabs remain unchanged in purpose.

Plus and Pro readers can save an explicit opt-in, one of three importance levels,
per-company email mutes and quiet hours. These are separate from following and
Morgonbrevet. The shared Base UI Slider supports arrow/Home/End keys and clickable
labels with 44px targets. The shared Switch uses its visible label for its
accessible name. The first-follow introduction is once per account/device in
the mounted personal-feed journey, not a cross-device onboarding guarantee.

The backend authenticates preferences by session identity and validates its own
plan/verified address/followed-company limits. Writable fields are allowlisted;
email, plan, consent timestamps and cutovers are not client-authoritative.
Compare-and-set protects changes against follows, verification and billing plan
updates. Downgrades, over-cap changes and address changes fence an existing
opt-in; recovery requires explicit resumption. Legacy toggle cap responses retain
their upgrade flag/hint. Existing newsletter/billing mappings are not replaced.

The editor preserves dirty drafts on refresh failures, follow changes and tab or
section switches. A changed saved revision needs explicit review. The hook never
replaces an accepted revision with an older GET/PUT response, and a stale save
response cannot reset the draft to older choices. Account changes invalidate
pending work and cached resource identity.

## Gates and local preview

Both flags require the exact value `true` and default off:

| Owner | Flag | Effect |
| --- | --- | --- |
| Frontend build/dev process | `NEXT_PUBLIC_COMPANY_ALERTS_ENABLED` | Exposes preferences UI; no email sends. |
| Backend process | `COMPANY_ALERTS_PREFERENCES_ENABLED` | Exposes authenticated preferences GET/PUT; no email sends. |

The backend always returns `delivery.available: false`. There is no alert worker
or transport to activate. The UI says `Mejlval sparade` / `Inga mejl skickas ännu`
and describes the free-plan benefit as being prepared, not shipped. Quiet hours
and batching metadata are preferences, not a running scheduler.

Browser tests provide fictional users and API state without login emails or a
real database:

```sh
NEXT_PUBLIC_COMPANY_ALERTS_ENABLED=true \
NEXT_PUBLIC_API_URL=http://127.0.0.1:8100/api \
npm run test:ui -- tests/browser/company-alerts.spec.js
```

For a later real local application preview, use the full `scripts/dev-local.sh`
with `OMXSUM_BACKEND_DIR` pointing to the new `backend-alerts` checkout and both
flags set. First prepare **local-only** backend configuration/database explicitly;
the clean checkout intentionally has no `.env`. Do not copy a production `.env`
or silently point the script at the old backend, which lacks this API. No new
authentication bypass or synthetic production membership was added.

## Verification

- Frontend unit suite in the current workspace: **192 passed**. This includes
  unrelated existing local tests; it is not an isolated release assertion.
- Backend full suite on the clean candidate: **267 passed, 1 skipped**. The skip
  is the opt-in Mongo integration test. A literal fictional OpenAI key was used
  only because an existing unrelated test imports a module that initializes its
  client; no real provider request was made.
- Actual Mongo integration: **8 passed**, using its own temporary directory,
  random loopback port and fictional users. This tests schema persistence, CAS,
  follows/cutovers and entitlement/resumption behavior. It cleans up its process
  and data; it never reads an existing Mongo config or database.
- Isolated frontend production build: **passed**. A `git archive` of `e6dae5d`
  received only the alert integration/components/hook/helper, shared Slider and
  Switch fix, gallery example and alert tests. No unrelated dirty application
  changes or configuration were copied. It was built with the UI flag enabled
  and the fictional loopback API.
- Final packaged standalone browser run: **52 passed** across email preferences,
  design system, editorial/settings, personal live feed and mobile workspace.
  Includes 21 new preference tests, Plus over-cap recovery, both-theme preference
  and foundation accessibility, no overflow at 320/390px, and existing workspace
  coverage through 820px. The earlier production run also passed 50 tests.
- Mobile and desktop screenshots were inspected; the controls wrap without
  clipping and retain ordinary document scrolling. Fixed mobile navigation is
  expected to appear across full-page screenshots; no extra inner scroller was
  introduced by the email editor.

An earlier development-server regression run timed out while cold-compiling a
company page; another run captured an unlabelled browser `Event`. Neither is
claimed as a passing run. The same bounded suites passed against the isolated
production candidate without those development-server symptoms.
The added theme contrast test initially sampled an intermediate transition
color; it now waits for the actual theme animations to finish before auditing.
The settled light and dark themes pass without changing or suppressing any Axe
rules. At completion, ports 3000/5173/8000/27017 and fixture ports 3111/8100 had
no listeners; the user's localhost remains stopped.

## Deliberately not complete

The pure policy has **148 fixture tests**, is labelled `fixture_only`, and is not
a production-calibrated importance model. Its SV/EN material-news rules and
60/75/90 thresholds are preparatory, not an authorization to send. Price, RVOL
and AI copy cannot establish alert eligibility. Returning an event identity is
not persistent deduplication.

Next: qualify the trusted source/replay contract; build durable event/recipient
state and an outbox; enforce cutovers again at send time; implement batching,
quiet-hour/DST scheduling, a pure alert renderer, scoped unsubscribe/suppression,
provider budgets and unknown-outcome reconciliation. Use a fake transport first.
Production canary/activation and real mail tests require separate approval.
