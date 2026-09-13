# Company email alerts — implementation plan

13 September 2026. **Preferences deployed; delivery is not implemented or enabled.
No real alert sends.** Frontend `1edbcf2` and backend `f7e4f70` are live;
see the [release record](release-history.md). A pure, fixture-only policy foundation is also
present; this is not completion of the event/outbox or delivery phases. The broader
news audit remains on hold. This release does not authorize provider activation,
historical backfills or a real mailing test.

## Implementation and release status

The backend work is isolated in the new `backend-alerts` checkout, branch
`codex/company-email-alerts`, based on clean revision `f321110`. It does not adopt
the unrelated dirty feed/serializer work from the originally inspected checkout.
The release used clean candidates preserving live frontend `37eb829` and backend
`0a31aaa` fixes. Development worktrees remain separate and were not reset.
The [local verification record](company-email-alerts-verification.md) describes
the isolated build, fixture tests, flags and preview prerequisites.

- [x] **Phase 1 — released preferences API/model:** authenticated GET/PUT
  `/api/user/company-alerts`, explicit opt-in, defaults off/`important`, company
  mutes, validated quiet-hour/time-zone preferences and fixed two-minute/five-minute
  batching metadata. Account verification and server-side Plus/Pro entitlement
  enforce 10/100 unmuted followed-company limits; `premium` maps to public Pro.
  Compare-and-set revisions protect concurrent saves, account/follow changes and
  billing-webhook plan changes. Stored consent/address bindings, prospective
  eligibility boundaries and safety pauses require explicit resumption after
  verification/entitlement/over-cap recovery. They do not create a send queue.
- [x] **Phase 1 — released frontend:** compact email status/action in the existing
  Bevakning editor, shared Base UI three-stop `Slider`, company mutes, quiet-hour
  details and explicit `Spara mejlval` with conflict/error handling. Settings uses
  the same resource; follows and Morgonbrevet remain separate. Saved preferences
  are presented as saved choices, not active delivery: the API always returns
  `delivery.available: false`, and the UI explains that no emails are sent yet.
- [x] **Phase 2 — pure foundation only:** `utils/companyAlertPolicy.js` assesses
  supplied material-news evidence before monotonic `relevant`/`important`/`major`
  thresholds and returns reasons plus policy version `company-material-news-v1`.
  It validates identities, status, publication/expiry and direct company
  associations; the matching helper returns all direct followed-symbol matches
  under one event identity. Price/RVOL, ranking scores and AI copy do not establish
  eligibility. Every result is labelled `qualification: fixture_only`.
- [ ] **Remaining phase 2:** trusted source/status/alias qualification and policy
  calibration, durable source cursor/checkpoints, event/recipient ledger, outbox,
  persistent deduplication, cutover enforcement and batching. A returned event key
  is not durable deduplication, and a policy result is not recipient authorization.
- [ ] **Phases 3–4:** alert renderer, provider/fake-transport boundary, scoped
  unsubscribe and suppression, quiet-hour/DST scheduling, shared sending budgets,
  retries/unknown-outcome reconciliation and separately approved release/canary.

`NEXT_PUBLIC_COMPANY_ALERTS_ENABLED` and `COMPANY_ALERTS_PREFERENCES_ENABLED` both
default off in code and require the literal value `true` to expose their
UI/API. Both are enabled for production preferences. Future frontend image
builds must retain `--build-arg NEXT_PUBLIC_COMPANY_ALERTS_ENABLED=true`.
Enabling preferences does not enable delivery; no alert worker, transport
or provider call is implemented. Quiet hours and batching are saved/displayed
settings, not a running scheduler. Local implementation and fixture verification
must not be described as a shipped plan benefit or end-to-end delivery acceptance.

The policy's internal 60/75/90 importance cutoffs and relative-size/dilution checks
are fictional-fixture choices, not production-calibrated thresholds. Conservative
Swedish/English text rules can miss other wording, truncated summaries and report
amounts with the unit before the number. Source replay, identity/price-only update
semantics and actual editorial coverage still require qualification. The sections
below retain the complete target contract, including work not yet implemented.

## Product contract

An eligible Plus or Pro account can explicitly request email about its followed
companies. Following a company continues to personalize Bevakning without
enabling email. Morgonbrevet subscription remains independent. Start with direct
company matches; topics, keywords, industry matches, Telegram and web push are
outside this first release.

**Decided access: Plus and Pro only.** Sending has an ongoing cost; there is no
free alert allowance in v1. Retain the existing 5/10/100 followed-company caps,
with alerts available for Plus's 10 or Pro's 100 followed companies. Both paid
plans get the same importance controls and delivery policy; do not invent a
separate Pro speed tier. Map the current internal `premium` plan to public Pro
through server-side entitlement checks, not client labels or newsletter status.
This is a planned benefit, not a claim that email alerts have shipped. Existing
free Bevakning access, newsletter access and plan prices remain unchanged.

Proposed first defaults, to confirm before enabling delivery:

- `Mejl om mina bolag`: off until the reader explicitly saves it on.
- A three-stop importance slider: `Fler relevanta nyheter`, `Viktiga nyheter`
  (default), `Bara det viktigaste`. Routine notices are excluded at every stop;
  there is no all-news mode.
- Optional mute for each followed company. Removing a company cancels its queued
  matches; muting email does not remove the company from Bevakning.
- A two-minute collection window, capped at five minutes from the first eligible
  event during active hours. Several companies/events can share one message.
- Quiet hours default to 22:00–07:00, Europe/Stockholm, editable or disabled.
  Accumulated eligible events form a short batch after quiet hours. Store an IANA
  time zone and test both daylight-saving transitions; never hard-code a UTC offset.
- Events expire 24 hours after their eligible publication/update time. A restart,
  fresh opt-in or newly followed company never triggers a historical backfill.

The slider controls editorial selectivity, not frequency or predicted stock-price
impact. Broader selection does not promise instant or unlimited email. Keep the
selected quiet-hour/batching behavior available next to the email controls; do
not bury eligibility or imply that Plus/Pro bypasses the shared sending budget.

## Evidence and ownership

The original planning findings below are from local source and the repository's
release records, not a fresh production inspection. The preference implementation
now uses the clean backend baseline recorded above. Later source/transport work
must still verify its actual released contracts and must not carry unrelated
edits from the originally inspected backend checkout into the work.

| Existing piece | Evidence | Reuse / limitation |
| --- | --- | --- |
| Watch preferences | `site/app/components/WatchPreferencesEditor.jsx`; `newsbackend/models/user.js`, `routes/user.js`, `utils/subscriptionStore.js` | Reuse normalized symbols, account ownership and explicit PUT follow/unfollow with atomic plan-cap checks. Existing follows do not carry alert opt-in. |
| Newsletter settings | `site/app/components/SettingsPage.jsx`; backend `active_newsletters` and `Mail.subscribed` | Reuse shared Switch and explicit save/revert/error behavior. Do not store alerts as another value in `active_newsletters`: the current newsletter endpoint also changes `Mail.subscribed`. |
| Email verification | Backend `User.verified`, `Mail.verified`, confirmation/auth routes | Reuse proven account-email verification, after reconciling the separate account/newsletter models. Newsletter membership is not an alert eligibility requirement. |
| Personal matching | Backend `jobs/personalBlocks.js` | Reuse direct `story.companies[].symbol` matching concepts. The current cache reads at most 100 stories, adds topic/keyword/industry matches and ranks/truncates results. It is not a durable alert source or a complete recipient selector. |
| Newsletter HTML/plain text | `news-test` commit `8bd95c8`, `src/services/emailUi.js`, `mailHtml.js` | Reuse pure static rendering, escaping, typography, surfaces and buttons. The shell and tracking currently identify Morgonbrevet; parameterize these for an alert template without changing newsletter defaults. |
| Newsletter delivery | `news-test` commit `8bd95c8`, `src/services/mail.js`, `src/main.js` | Existing weekday newsletter job queries verified subscribed newsletter records and sends sequentially with a two-second pause. It has no durable per-recipient outbox or demonstrated unknown-outcome reconciliation. Do not extend its subscriber loop into alert delivery. |
| Story navigation | `site/app/utils/storyUrls.js` | Use the tested canonical `storyHref(id, headline)` contract, including its immutable ID and legacy compatibility. The local SEO helper must be confirmed released before relying on new slug routes in email. |

The original plan inspected backend `fb5a6f2` with unrelated dirty feed/serializer changes;
[release history](release-history.md) records later backend releases, including
`bdc2809`. Its local source does not establish today's deployed serializer behavior.
The former newsletter temp worktree has empty source directories. The renderer
and sender above were instead read with `git show 8bd95c8:…` from the linked
newsletter repository, matching the [released email ownership record](newsletter-email.md).
No scheduler module was imported or run, and no configuration secrets were read.

Proposed ownership: `newsbackend` owns authenticated preferences, policy, durable
event/recipient state and a separately started alert worker. `news-test` continues
to own email presentation components. Add a pure `buildCompanyAlertEmail` renderer
there and consume a pinned, tested artifact/module from the worker; decide the
small cross-repository packaging contract before implementing. Importing a pure
renderer must never import `mail.js`, connect to MongoDB or start a cron job.

## Bevakning integration and discovery

Keep Bevakning news-first and Bolag / Ämnen / Nyckelord intact. Add one compact
envelope/status action beside its existing `Anpassa` control. It opens the email
section of the same editor, not a separate notification destination or nested
dialog. Place `Mejl om mina bolag` near the top of the Bolag pane, before the
potentially long company list. Keep delivery opt-in separate from follows and
keep it out of the topic/keyword panes, which are not supported alert sources yet.
Settings links to this same resource; it does not duplicate the watchlist.

Use the effective server state for a small, truthful status:

| Reader state | Bevakning treatment |
| --- | --- |
| Plus/Pro, off, has companies | Quiet `Aktivera mejl` action; opening settings alone never enables delivery. |
| Plus/Pro, on | `Mejl på · Viktiga nyheter` using the saved level, with `Ändra`. Keep this to one status line in the compact overview preview. |
| Free | One benefit line, `Viktiga nyheter om dina bolag, direkt i mejlen`, a small `Plus` label and `Se Plus` link. Explain `Ingår i Plus och Pro` in the details. No unusable switch disguised as an available feature. |
| Signed out | Keep the existing sign-in/follow journey primary; show the Plus/Pro requirement when email setup is requested. Signing in or creating a free account does not unlock sending. |
| No followed companies | `Följ ett bolag för att välja mejlbevakning` with the existing add-company action. Do not add a competing full-size upgrade card or allow an empty first activation. |
| All followed companies muted / none remain after activation | `Inga bolag får mejl just nu` with an edit action. Preserve preferences, but do not present delivery as active for any company. |
| Unverified / address changed | Show verification recovery; delivery stays paused pending verification and explicit resumption. |
| Downgraded to free | `Mejl pausade · Kräver Plus eller Pro`. Preserve settings and free Bevakning; cancel pending unauthorized sends. |
| Pro-to-Plus with more than 10 unmuted followed companies | `Välj upp till 10 bolag för mejl` with an edit action. Pause sending until the reader reduces the alert set and explicitly resumes; never silently select companies or delete follows. |
| Preferences or entitlement loading / unavailable | Neutral loading or a retryable error, not an off state or a flashing upgrade pitch. |
| Suppressed / service paused | A concise, distinct paused status with the relevant recovery/help path; never claim `Mejl på` implies deliverability. |

Introduce the feature contextually after the first successful company follow,
once per account where possible, with device-local dismissal as the guest
fallback. Use an inline hint, not an automatic modal, toast on every follow or
repeated prompt across visits. The persistent Bevakning action remains available
after dismissal. A reader/company follow confirmation may link to this same
setup, without inventing another alert editor or repeating an upgrade on every
news item. Never blur or remove existing free watchlist news to promote email.

Do not crowd the overview's letter and two personal headlines with a second
marketing card. Advertise email on pricing/onboarding only once it is released
for that audience; a disabled feature flag or plan document is not a live benefit.
This plan does not authorize a promotional email campaign or new analytics.

## Importance slider and preference API

Use one account-level, discrete three-stop slider, left to right from broader
material news to the most selective level. Selecting a stop updates one short
description below it; do not show a permanent explanation for every level.

| Stored level | Swedish label | Short selected-level explanation |
| --- | --- | --- |
| `relevant` | Fler relevanta nyheter | Fler affärsnyheter om dina bolag. Rutinmeddelanden filtreras bort. |
| `important` (default) | Viktiga nyheter | Rapporter och andra tydligt betydande bolagshändelser. |
| `major` | Bara det viktigaste | De mest betydande beskeden, som vinstvarningar och stora affärer. |

Treat these as editorial thresholds, not three unrelated category checklists:
the most selective set must be a subset of the middle set, itself a subset of
the broader set. Reports and deals still need materiality qualification; being
an issuer release is neither an automatic inclusion nor an automatic exclusion.
Never expose an arbitrary 0–100 score, suggest a probability of a price move or
promise a number of emails per day. Version and calibrate the internal thresholds
against labelled fixtures before launch instead of treating an unreviewed score
as ground truth. Company-specific importance sliders are outside v1; use mutes.

Build the control through a shared Base UI Slider wrapper in `components/ui`,
with semantic tokens, a neutral track and an ink/brand accent. Green/red would
imply a positive/negative market signal and are not the slider scale. Provide
three visible stops, a visible selected label, Swedish `aria-valuetext`, keyboard
arrows/Home/End and 44px touch targets. Labels may wrap on 320px screens; do not
shrink below the type scale or depend on drag/hover to discover a level. Keep
selection provisional until `Spara mejlval`. Policy and data fetching stay in
the feature layer, not in the shared UI component.

An optional collapsed `Se exempel` can later show up to two actual, authorized
headlines qualified by the same policy and current company choices. Label it
`Exempel från senaste urvalet` with the sample period; a bounded sample is not
complete history, a delivery log or a future mail-count forecast. No fabricated
stories or reaction numbers. If none qualify, show an honest empty state without
relaxing the selected threshold. This preview is secondary to the working opt-in
and delivery path and need not block the first release.

Reuse the shared Switch and other Base UI wrappers. Display the verified
destination address; do not add an arbitrary recipient-address field. Require
explicit `Spara mejlval`; retain unsaved input on errors and distinguish unavailable
preferences from off. Keep quiet hours and company mutes in compact expandable
details. Offer verification recovery when the account address is unverified.
Saving follows must never also save a pending email change: the existing
`Dina val sparas direkt` message applies to follows only, not this email section.

Authenticated GET/PUT `/api/user/company-alerts` is implemented locally for
preference storage, validation, account authorization and revision/cutover
metadata. The enqueue/send, queue cancellation and scoped-unsubscribe requirements
below remain part of the future delivery contract:

- `enabled`, `importanceLevel: relevant | important | major`, `mutedSymbols`
  (validated company symbols), `quietHours`, `timeZone`, and the supported batching
  configuration. Reject unknown levels; missing records remain off with the middle
  level as the unsaved UI default.
- Server-managed `revision`, `enabledAt`, `addressVerifiedAt`/verification binding,
  `consentVersion`, policy version and effective delivery status/reason.
- Use revision checks to reject conflicting edits instead of silently overwriting
  another tab. Authenticate the account from the session; ignore client-supplied
  account IDs, plan/access claims and destination addresses. Reject free/unknown
  plan activation on the server even if the client submits a forged request.
  Allow disabling and scoped unsubscribe regardless of current plan.
- Missing preference records resolve to disabled. No bulk migration opts existing
  accounts in. Maintain a per-company eligibility boundary when a company is newly
  followed or re-followed while alerts are enabled.
- Disabling alerts, muting/unfollowing, an address change or loss of access updates
  eligibility immediately. A saved preference is not proof of provider delivery.
- Plus-to-Pro retains an existing opt-in. Pro-to-Plus retains it only when at most
  10 followed companies are unmuted for email. Existing follow caps restrict
  additions, so do not assume a downgrade has already trimmed a saved watchlist.
  If over the new alert cap, pause sending, cancel not-yet-submitted attempts and
  let the reader mute/unfollow down to 10 before explicitly resuming. Do not
  choose an arbitrary ten or delete their follows. Enforce alert-company caps
  server-side at activation, follow/unmute changes, enqueue and send.
- Loss of paid entitlement stops sending and cancels queued attempts not already
  submitted. Keep settings for recovery, but upgrading later does not opt in or
  silently resume a paused subscription: require explicit resume and establish a
  fresh eligibility boundary. This also applies after an over-cap pause.
- Importance changes apply to not-yet-submitted batches using the latest saved
  revision. Increasing selectivity removes newly ineligible queued events;
  broadening it never replays events published before the change. Persist the
  preference revision and effective time with each eligibility decision.

For mutes, reuse the selected companies in a compact expandable list of named
Switch controls. Explain whether newly followed companies receive alerts: proposed
behavior is yes, after following, while the account-wide setting is enabled and
the company is not muted. Preserve stored mutes across unfollow/re-follow; only
currently followed companies can be newly muted/unmuted in the UI. Re-following
sets a fresh eligibility boundary and cannot replay missed events.

## Source, eligibility and important-news policy

Use a server-side source with stable story/event IDs, version/update information,
company associations, publication time and withdrawal/correction status. Consume
its durable change cursor or ingest outbox once for all recipients. Reuse an
authenticated upstream stream only if replay, gap detection and cursor retention
are verified sufficient; the current browser SSE replay is not that guarantee.
If the upstream cannot supply recoverable changes, resolve that source dependency
before promising reliable alerts. Repeated personal-feed/top-100 snapshots cannot
prove that no news was missed.

Persist the event before advancing its source checkpoint. Use a transaction where
supported, or idempotent event upsert followed by checkpoint advancement, so a
crash may repeat work without losing it. Backpressure must preserve recoverable
source progress and expose a gap when recovery is no longer possible.

Match every directly associated company against enabled, unmuted follows using
indexed server-side data. An event matching several followed companies produces
one recipient event with all match reasons. Do not use the global featured top
five, company-diversity suppression or `buildPersonalBlocks` truncation as an alert
selector. Do not wait for a price reaction or use price/volume updates as sends;
the V2 ranking migration is independent of this delivery path.

Apply a common material-news gate before any slider threshold. At **every level**
exclude routine meeting invitations/reminders, shares/votes/calendar notices,
recurring buyback reports, ordinary insider/holdings transactions, routine financing
or deal-administration follow-ups, promotional reminders, duplicates, withdrawals
and price-only updates. A high upstream importance score or large unrelated price
move must never override these exclusions. Routine news can remain in the normal
feed; exclusion from email does not delete it from Bevakning.

Do not blacklist the whole `Bolagsnytt` category or all company press releases:
reports, changed guidance, significant orders/deals, regulatory/clinical decisions
and substantive management/capital events may be exactly the news a reader needs.
A normally routine event type may qualify only when the actual content supplies a
separately evidenced material event, not merely an exciting headline, event tag or
large raw transaction amount. For example, a substantial changed outlook is not
the same event as a standard invitation to the results presentation. If materiality
cannot be established, withhold the alert rather than lowering the bar to fill it.

After this gate, apply the saved level's separately versioned editorial threshold.
Upstream importance is one input; validate it against the event content/status.
Do not reuse the featured-feed score: personalization, price/RVOL and diversity
bonuses serve browsing, not permission to spend a reader's attention with an email.
Price/RVOL can later add qualified context, but missing trading data must not delay
a material story and a quote update must not become a new email. Keep explicit
inclusion/exclusion reasons and the policy version for targeted fixture/release
review. This is feature qualification, not a restart of the held broad news audit.

For new-event delivery, publication must be on or after the latest of the feature
cutover, account opt-in and company-follow eligibility boundary, and still inside
the delivery TTL. A delayed ingestion of an older story does not override these
boundaries. Re-enabling after a pause establishes a new boundary. Broadening an
importance level, unmuting or regaining plan eligibility is not a historical replay
request; establish the corresponding cutover for newly eligible events. Explicit
corrections to events already delivered have their own update-time rule below.

## Deduplication, corrections and durable delivery

Create an event ledger, recipient-event decisions, batches and delivery attempts
in durable storage. Keep source IDs/version, policy/content revision, matched
symbols, eligibility reason, due/expiry times and status. Avoid storing a duplicate
wire archive or raw recipient addresses in operational logs.

- Deduplicate by stable upstream event identity when supplied, otherwise by stable
  story ID. Apply translation/alias merges only from a trusted source identity;
  never merge unrelated releases using approximate headlines. Record unresolved
  cross-language duplicates as a known source limitation.
- A unique recipient/event/notification-kind key prevents multiple companies or
  repeated ingestion from generating several initial alerts. Price-only versions
  and metadata refreshes do not create another notification.
- Before a batch is submitted, coalesce content changes into the latest supported
  story version. Withdrawn pending stories are cancelled. Recheck every member
  before render/send and discard empty batches.
- After delivery, send at most one explicitly labelled correction for each new
  material correction revision; a retraction is an explicit correction event.
  Require source correction semantics or a reviewed material-change rule. Cosmetic
  edits, translations and quote updates do not qualify. Correction keys include
  the correction revision and reference the original recipient event; normal
  opt-out, entitlement, quiet-hour and suppression checks still apply.
- Freeze the rendered payload/hash, recipient and idempotency key before the
  provider call. Use atomic claims with leases, attempt records and unique indexes.
  Recover worker crashes and lease expiry without generating a new logical send.
- Retry known transient rejections with bounded exponential backoff/jitter and
  provider retry guidance, within the event TTL and a configured attempt budget.
  Authentication, malformed requests and permanent delivery failures go to a
  stopped/dead-letter state instead of hot retry loops.
- A timeout or disconnect after submission is `unknown`, not `failed`. Reconcile
  using a persisted provider message ID, webhook or supported idempotency/status
  contract. Reuse the same logical key within its verified retention window.
  Without a reliable resolution mechanism, hold for operator review; never blindly
  retry an ambiguous send under a new key. Do not promise end-to-end exactly-once
  email where the provider cannot guarantee it.
- Separate `queued`, `suppressed/cancelled`, `submitted`, `accepted`, `delivered`,
  `bounced`, `failed` and `unknown`. API acceptance is not inbox delivery. Authenticate
  webhooks and make duplicate/out-of-order status processing idempotent.

Authorization runs when recipients are selected **and immediately before provider
submission**: current account exists, address verification matches the destination,
alerts remain enabled, company remains followed/unmuted, the current server-verified
plan is Plus or Pro, the alert set fits that plan's company cap, the event still
meets the saved importance level and each story/content field is allowed. An email remains readable after
a later downgrade, so never render content based only on stale enqueue-time access.
HTML, plain text, subjects and preheaders all use the same authorized model.
Fence new send attempts against the latest preference revision. Once opt-out is
acknowledged, no new attempt may be authorized; a provider request already in
flight can still complete and cannot be recalled. Keep that attempt's outcome
record rather than falsely reporting it cancelled.

## Email, unsubscribe and rate budget

Build a short Swedish email: `Din bevakning`, matched company names, full supplied
headline, source/publication time, an optional supplied authorized summary, and
`Läs nyheten`. Multi-event batches repeat compact rows with canonical story links.
No fabricated summary, price-causality claim or reaction-wait dependency; omit
reaction figures in v1. Use the existing static email colors, typography, escaping,
responsive shell and plain-text equivalent, with alert-specific labels/tracking.
Absolute links use the configured canonical site origin plus the tested story URL
contract. Test changed headlines, Swedish characters, multi-company stories,
legacy IDs and invalid IDs; an invalid target cannot fall back to an unrelated story.

Include `Hantera mejlbevakning`, `Pausa mejl om detta bolag` where unambiguous and
`Avsluta mejlbevakning`. Use opaque, purpose-scoped, verifiable tokens bound to the
alert subscription; no email address in the query string and no account session
required to unsubscribe. Invalid/replayed requests must be safe and idempotent.
The existing newsletter unsubscribe endpoint changes `Mail.subscribed` and is not
the alert unsubscribe implementation. Unsubscribing alerts must preserve follows
and Morgonbrevet; stopping Morgonbrevet must not silently enable/disable alerts.

Provide supported list-unsubscribe behavior and process hard bounces/complaints
into an address-level suppression store. Check suppressions before every send;
turning a switch back on does not silently clear a complaint or hard bounce.
Verify how the existing newsletter sender and provider suppressions coexist so
the two products cannot bypass an address-level stop.

Use persistent global/per-recipient token buckets, message/event limits and TTLs.
Proposed pilot guardrails: at most six messages/hour and twenty/day per recipient,
with batching and a bounded per-message event count. Review these as product limits
before exposure; the broader importance level may require more batching rather
than more messages. Pro's higher company cap does not multiply the message budget.
Overflow stays eligible for a later bounded batch, then expires with a reason; it
must not create an unlimited catch-up burst or silently claim complete delivery.

The global budget must be based on verified current provider capacity, measured
volume and reserved room for transactional mail and Morgonbrevet. The current
newsletter's two-second delay is not proof of available quota. Coordinate the
shared budget across processes/services; an alert worker's local counter alone
cannot protect another sender. Provider capacity and supported idempotency/webhook
semantics require a later implementation check; none was researched for this plan.

## Phases and acceptance tests

| Phase | Local status | Deliverable | Required acceptance |
| --- | --- | --- | --- |
| 0. Contract and clean baseline | Partial: clean preference baseline/access mapping established; source/provider decisions remain. | Verify Plus/Pro server entitlement mapping; settle delivery defaults, source replay/cursor guarantees, renderer packaging and provider budget; branch from verified released repos. | Written decisions; source gaps are explicit; no adoption of unrelated dirty changes; no new collection/retention assumptions. |
| 1. Preferences, disabled delivery | Implemented locally behind default-off flags; not deployed. | Authenticated resource/model, shared three-stop Slider and compact Bevakning/settings controls behind flags. | Defaults off/middle; free activation rejected; no upgrade auto-opt-in; loading/unavailable/empty/muted/paused states; verified address; explicit save/revert and conflicts; follows and newsletter unchanged; contextual hint dismissal; 320/390px keyboard/touch checks. |
| 2. Pure policy and event/outbox path | Partial: pure fixture-only policy/matching; no durable event/outbox path or source calibration. | Companies-only matching, common exclusions, versioned importance levels, checkpoints, dedup, batches and deterministic test clock. | Routine notices rejected at every level even with inflated scores; monotonic thresholds; high-impact issuer releases retained; over 100 source stories, cursor gaps, multiple companies, translations/aliases, withdrawn/corrected versions, no price-only sends, preference cutovers, restarts and no historical replay. |
| 3. Renderer and transport boundary | Not implemented. | Pure HTML/plain-text renderer, fake provider adapter and durable worker state machine. | Plus/Pro eligibility and free/unknown-plan rejection at enqueue and send; canonical/legacy links; long/missing copy; mobile/dark/fontless rendering; duplicate claims, crashes before/after submission, unknown outcomes and idempotency retention expiry. |
| 4. Controlled delivery qualification | Not started; no deployment or real sends. | Flags-off deployment, then approved dry-run/shadow evaluation and explicit canary. | Quiet hours/DST, retry/TTL/rate limits, importance change/downgrade/address change/opt-out before send, Pro-to-Plus over-cap pause without deleting follows, no automatic resumption after a pause requiring consent, suppression/webhook races, unsubscribe, provider rejection vs acceptance vs delivery and kill-switch recovery. |

For all tests before an approved canary, use fictional accounts/events and a fake
transport that cannot instantiate the live provider. Preview commands must not
load secrets, connect to production databases or import scheduler entry points.
Tests that exercise storage use an isolated test database and deterministic clocks.

## Operational and release gates

1. Deploy only after separate approval. The current local UI/API flags are
   `NEXT_PUBLIC_COMPANY_ALERTS_ENABLED=false` and
   `COMPANY_ALERTS_PREFERENCES_ENABLED=false` by default. Future ingest/send gates
   remain proposed: `COMPANY_ALERTS_INGEST_ENABLED=false`,
   `COMPANY_ALERTS_SEND_ENABLED=false` and a non-sending transport mode. No alert
   worker/transport exists yet; setting those future variables cannot enable one.
   Missing flags/configuration must fail closed. Worker startup/import cannot send mail.
2. First run fixture dry-runs. Any later production shadow run needs explicit
   authorization, redacted aggregate output and disabled transport; a shadow
   result is not a delivered-email test. Preserve the source cutover and distinguish
   opt-in state from canary allowlisting.
3. Before a canary, verify indexes/leases, measured provider budget, suppression
   path, unsubscribe, server authorization and an emergency send switch. Prepare
   the exact sender, fictional sample email, recipient allowlist, maximum volume,
   run window and success/stop conditions for **explicit canary approval**. The
   current request grants none of those live sends.
4. Monitor source lag/gaps, decision reasons, queue age, expired events, duplicate
   prevention, attempts, accepted/delivered/unknown outcomes, bounces/complaints and
   budget consumption. Keep recipient IDs hashed in metrics and secrets/tokens out
   of logs. Set numeric release thresholds from the verified service budget; do
   not invent provider safety limits. Any unintended recipient, duplicate send,
   access leak or new attempt authorized after acknowledged opt-out stops the
   canary immediately.
5. Widen only after observed canary delivery and reviewed metrics, with a separate
   rollout decision. Pause sending independently from preference management;
   disabling/re-enabling must preserve dedup history and must not replay expired
   batches. Retain audit/attempt state needed to resolve `unknown` outcomes during
   rollback; never clear the queue ledger just to restart a worker.

Completion means an explicitly opted-in Plus/Pro reader receives material company
notifications meeting their saved importance level within the stated batching/
quiet-hour policy, can stop them reliably, and receives no routine, duplicate,
replayed or unauthorized email. A passing frontend test, an accepted provider
request or an existing morning-letter subscription is not proof that this alert
product has shipped.
