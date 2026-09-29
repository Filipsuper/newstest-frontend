# Account-first onboarding — 29 September 2026

Release candidate staged on 30 September. Existing unrelated valuation and
About-page work is outside this change; already released valuation features are
retained from the latest production branch.

## Research and product decisions

Reviewed the September 28 personal-news release, landing/membership changes,
current UI rules, account and confirmation routes, company-follow actions,
Settings, personal-feed contract and the alert preference/delivery gates.

The released product now offers Mina bolag, a seven-day personal catch-up with
separate important-company selection and explicit read receipts, company
timelines, interest matching and personal newsletter additions. Free/Plus/Pro
follow limits are 2/20/100. Company-email preferences exist but production
delivery is still gated by the single-account pilot. Evening email is not built.

The old onboarding only followed newsletter confirmation. Login silently created
or reactivated a newsletter record, guest follow choices were lost, and the
preview claimed 48 hours while the new API supplies seven days. The account's
legacy newsletter array could also disagree with an unsubscribe in Mail.

## Journey

1. `/kom-igang`: create an account or sign in with an email link. No newsletter
   or company-alert consent is inferred. The existing landing newsletter form
   remains the lead magnet; an adjacent account CTA exposes this second path.
2. **Brev:** explicit per-letter switches from the server's supported catalog.
   Currently only Morgonbrevet, with an actual dated edition preview. One
   Continue saves changes; unchanged Continue makes no write. Failed loads can
   be skipped without inferring an unchecked preference.
   Kvällsbrevet links to the website, not an email toggle.
3. **Bolag:** shared stock search/suggestions and immediately saved, idempotent
   follows. A company selected before login is offered here, not silently added.
   Preserve existing choices and enforce current plan caps without deletions.
   Show visible follow suggestions and one real company-news row after a follow;
   unavailable/empty news remains honest and never blocks company selection.
   Keep three selected rows with Show all, one concise saved/count line and one
   continuation action. Optional topics are a collapsed disclosure here, not a
   fourth mandatory step: actual vocabulary, translated search, six results per
   page and immediately saved explicit choices. Topic-only readers can finish;
   topics never opt into or expand company-email delivery. Keywords stay in the
   full editor. Unknown saved IDs remain in unrelated writes (the server can
   reject outdated IDs; the UI must not silently delete them).
4. **Mejl:** when a company is followed and the feature flag is enabled, reuse
   the existing alert editor. Paid access, confirmed address, revision checking,
   suppression, quiet hours and pilot availability remain authoritative. No
   implied delivery when unavailable; no upgrade required to finish. Dirty
   email drafts use one Save and Continue action, which only advances after a
   successful write. Back requires undo/save; trial activation never opts in.
   Plus/Pro trial cards belong here, not in company selection.
   Place Continue free above both cards; remove repeated benefit kickers.
   After access is unlocked, keep the step to the explicit switch and importance
   slider. Company exceptions and matching examples stay in settings. Preserve
   existing mutes; show a settings handoff for blocked/partial company choices.
   Slider help stays below the control; hover/focus previews a level and touch
   selects it. Short importance guidance and illustrative examples replace
   overlapping tooltips, without changing the server's ranking or consent.
   Trial information follows the primary action as a quiet dated line, with
   exact time retained in settings and the final summary.
5. **Mina bolag:** important-company preview first, actual API time window,
   partial-coverage disclosure and links to full personal news, topics/keywords,
   letters and the original return destination. Precede news with authoritative
   saved companies, letter choices and actual company-email availability.
   Include selected topics. No preferences means "Du är igång" with a Market
   handoff instead of claiming a personal watchlist is ready. Unchanged off
   choices say Continue without the letter/company emails and do not write.

Newsletter-first readers still use `/bekrafta`. It consumes the token, strips it,
establishes the session and enters at Bolag. Reload continues from saved choices.
Neither setup route loads third-party scripts. Only the bounded step position
is kept per account in sessionStorage; saved choices remain server-owned and
drafts/consent are never restored from browser storage. The focused shell keeps
logo and theme controls, without competing product navigation. Returning logins
do not force the wizard again. Edit my choices restarts the view, not preferences.
Account read failures are distinct from guests: retry initial failures, preserve
known account/drafts on transient refresh failures and pause editing until
recovery. Recognize 401, /user's invalid-token 403 and its legacy missing-cookie
body as authentication rejection; other failures remain unknown.

## Consent and compatibility

Backend owner: `backend-personal-news`. Frontend: `stock-page-polish`.

- Account creation defaults to `active_newsletters: []`; login never touches
  Mail or companyAlerts. Magic login links now consume the matching hashed token
  atomically. New verification enters setup, existing accounts keep their return.
- `/user/newsletters` GET returns `{ revision, catalog, selected }`; PUT accepts
  `{ revision, selected }`. Only verified accounts may write. Reads don't create
  Mail rows; explicit opt-in can create the missing row. Unknown stored edition
  values survive edits. GET `/user` derives the legacy newsletter field for old
  clients; a failed letter lookup cannot turn the account into a guest.
- Mail is authoritative. `preferencesRevision` is incremented on explicit
  choice, confirmation and unsubscribe. Stale writes return 409. Explicit choice
  and unsubscribe invalidate pending confirmation links to prevent resurrection.
- The old POST `/user/newsletters` remains a validated compatibility adapter.
  It cannot provide a client-held revision until old clients are upgraded.
- Confirmation adds only Morgonbrevet; subscribing to another future edition
  cannot be mistaken for an existing morning subscription.
- New catalog entries require separate sender, entitlement and consent design;
  this change builds the reusable UI/API foundation, not any future delivery job.
- Following, newsletter delivery, personal newsletter enrichment and direct
  company alerts remain separate. No change to importance/ranking/send policy,
  billing, plan limits, pilot allowlist, schedulers or newsletter renderer repo.

Welcome mail uses a pure, offline-testable public-style renderer and both HTML
and plain text. No new mail is sent merely by loading or finishing setup.

## Release safety

Deploy backend before/with frontend; the new UI needs the catalog endpoint.
Old clients remain compatible with the backend. No subscription migration or
bulk opt-in is required. Rolling back the old backend would restore its implicit
account-to-newsletter coupling; retain the consent fix in any rollback.

Before release, inspect only the scoped changes. Other local valuation/About
changes must not be included accidentally. After release, the account owner
should test signup, explicit morning subscription, a follow and eligible alert
save; verify provider delivery separately. No production email was sent here.

## Validation

### Exact release tree (30 September)

- 299 frontend unit tests and 89 optimized-build browser checks passed, covering
  onboarding, alerts, Settings/editorial reading, memberships and landing.
- Backend offline suite: 428 passed, two opt-in suites skipped. Dummy provider
  keys only; no configured production credentials or provider calls.
- Isolated owned Mongo integration: all 52 checks passed, including trial expiry,
  concurrent trial/checkout requests, newsletter revisions and consent retention.
- Local standalone tracing warned about a symlinked Darwin dependency; this
  local QA output is not the deployment artifact. Production is built separately
  for ARM64 from committed source with installed production dependencies.

### Compact flow and optional topics

- Optimized production build passed. All 82 browser checks passed across
  onboarding, company-email choices, Settings/editorial reading and membership,
  including 320/390/1440px, both themes and keyboard/accessibility checks.
- Added coverage for topic-only setup, lazy/bounded vocabulary, translated
  search, saved-ID preservation, load/save retries, bounded company lists,
  empty completion, initial account failure and retained email drafts after
  transient account refresh failure. Normal guest/login behavior still works.
- Frontend unit suite passed (299 tests), including bounded private account
  requests and topic contracts. An additional cancellation regression ensures
  leaving the morning preview does not log its normal abort as a dev error.
- Visually checked the running localhost app in separate 390/1440px sessions
  with real public company/topic data, fictional account snapshots and all
  application writes blocked. No page errors, horizontal overflow or account
  writes. The human browser session, production accounts and delivery are
  unchanged. The dev server remains running for user review.

### Benefit-led UX pass

- All 20 onboarding browser scenarios passed at 320/390/1440px, with light/dark
  accessibility checks, confirmation recovery, trials independent of consent,
  failed writes, single-action email saves and account-scoped step restoration.
- Five focused existing company-email regressions passed: explicit save/stop,
  invalid quiet-hour drafts, unavailable resources, failed writes and 409 review.
- Frontend unit suite passed; eight focused onboarding/trial tests passed after
  the final preview filter/status refinements. Browser QA uses fictional accounts
  and stories, not production state. Local frontend/backend remain available for
  user review; production deployment and real delivery are unchanged.

### Inline importance slider

- All 58 company-alert/onboarding browser scenarios passed, including preview
  without selection, touch and keyboard selection, no overlap/layout jumps at
  320/390/1440px, and light/dark accessibility checks. Frontend unit suite passed.
- Visually checked the running localhost app at 390/1440px in both themes with
  an isolated fictional account and all write requests blocked. No browser
  errors, horizontal overflow or account writes. Ranking and delivery unchanged.

### Initial implementation

- Frontend unit suite: 283 passed.
- Backend offline suite: 424 passed, two opt-in integration tests skipped.
- Isolated MongoDB integration: 47 passed, including new account/no-mail,
  one-use login, concurrent subscription creation, unsubscribe conflict,
  confirmation and legacy missing-revision records. The test owns its temporary
  database and removes it; no configured/production database is used.
- Onboarding browser suite: 14 passed, including 320/390/1440px, light/dark,
  Axe accessibility, confirmation replay, failed writes, absent subscription
  state, paid alert drafts, skipped steps and remembered guest company choice.
- Optimized production build passed in `.next-onboarding-build`, using only the
  fictional API. Broader production-browser regression: 72 passed across
  onboarding, alerts, Settings/editorial reading, landing and membership.
  Theme checks wait for transitions to settle; one development-only landing
  navigation timeout did not reproduce in the optimized build.
- Welcome email rendered offline at 390px with no horizontal overflow; HTML
  and plain text checked. No real sender or production account was used.
