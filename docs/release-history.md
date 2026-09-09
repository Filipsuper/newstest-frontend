# OMXsum release history

Release records through 9 September 2026, newest public revisions first.
The current backlog is in [ROADMAP.md](../ROADMAP.md); implementation contracts
remain in [UI.md](../UI.md), [the design system](design-system.md) and
[the news-first workspace](news-first-workspace.md).

These are point-in-time records, not instructions to repeat a release.
Designs can be superseded by a later entry. Test counts, source coverage,
resource measurements and image/rollback availability describe their recorded
release; recheck the running environment before an operational action.
Open follow-ups have been consolidated in the roadmap.

## News reader — extracted facts paused

Frontend `79f89e7` deployed on 9 September 2026 after approval. Only the
shared reader, its regression fixtures/tests and matching UI rule shipped;
unrelated local editorial-ranking and favicon work remains uncommitted.

- Removed report figures, estimate comparisons, insider-transaction tables
  and standalone extracted amounts from both dialogs and full news pages.
- AI prose/bullets, reaction KPIs/charts, original sources and source text
  remain. Missing AI text does not restore deterministic fact blocks. Stored
  source facts and all market-reaction calculations are unchanged.
- Clean release verification: 66 unit tests, four Chromium checks covering
  320/1440px readers, AI-present/absent cases and dialog/history navigation,
  plus the resource-capped production build. Local example servers were not
  used as production API endpoints.
- The reported Acconeer story `story_657a4f01b0922c295b9655ec589f2a41` returns
  HTTP 200 without the extracted-facts headings. Its AI summary, three
  reaction KPIs and sources were verified in live HTML and Chromium; the
  public API still carries its source facts. Home, Marknaden, Aktier, an
  Ericsson page and the company API return 200. Fictional reaction preview
  remains 404. No baked `.env` or local API addresses in runtime assets.

Frontend image `8e839a6b468d`, started `2026-09-09T14:07:31Z`, zero restarts.
Rollback retains `42538e6e7c8c`. Backend `1503217c6735`, Terminal `276a76647520`
and the isolated reaction worker retained their start times and zero restarts.
Post-release capacity: ~754 MB available memory, ~2 GB free swap, ~11 GB disk.

The unchanged dependency set reports three high and one critical package
finding in `npm audit --omit=dev`, including Next.js 15.5.22 advisories. This
UI-only release does not remediate those findings; dependency patching and
validation remain a separate security follow-up. No exploit testing was run.

## Reaction v2.2 — public live beta

Frontend `72a6aa1`, news backend `2c89137` and isolated worker code `f60fd4b`
deployed on 8 September 2026 after explicit approval to try v2 live. This is
an initial beta, not full data-coverage qualification or backtest readiness.

- The reader is news-first with three aligned price/volume KPIs, automatic
  measurement selection and shared company controls. Rows, readers and news
  share images use matching periods and chart inputs through both closing
  windows. V2.1 calculations remain available for exact archived replay.
- Personal-feed shaping preserves story version and all companies. Visible
  observations refresh without false news banners or automatic reshuffling.
  Strict identity, price-window and volume arithmetic checks fail closed.
- API read flag enabled via `/root/newsweb/compose.override.yaml`. The worker
  uses existing minute data only: no extra provider collection, tick archiving,
  source TTL changes or editorial/Terminal ranking migration. Its new v2 archive
  has no automatic TTL; monitor growth and processing lag.
- The worker runs from `/root/omxsum-reactions-v2/releases/f60fd4b` with a systemd
  override: 25% CPU quota, 256 MiB memory cap, five jobs/50 messages per cycle.
  The unrelated dirty production market-data checkout is untouched; its status
  fingerprint and existing collector start times were unchanged after release.

Pre-deployment verification: scoped production build, 66 frontend unit tests,
51 news-backend tests, 75 calculation/persistence tests on both the test double
and disposable real MongoDB, three existing minute-source tests and 40 browser
checks. A fictional three-layer engine/API/frontend contract also passed.

Production build succeeded using the established CPU/memory-capped fallback
because local Docker did not respond. Home, Marknaden, company and company API
return HTTP 200; the fictional preview returns 404. Anonymous full-feed access
still returns `No token provided` (existing middleware uses HTTP 200 for this).
No accounts, sessions, checkout, subscriptions or email delivery were changed.

Initial real results replayed exactly. Three current source versions were warmed
through the same v2 code: SynAct, Saniona and Gapwaves. Public versions, selected
percentages and chart endpoints agree, including next-session close, session close
and +15m where later samples are stale. Their public readers render the v2 KPIs.
Two live news share images return valid 1200×630 PNGs. The public overview now
includes v2 measurements and correctly omits unused chart arrays from its list.
The wider last-24-hour processing queue is still warming up; these samples are
not an estimate of market-wide coverage.

Frontend image `42538e6e7c8c`, started `2026-09-08T21:35:36Z`; backend image
`1503217c6735`, restarted with the flag at `2026-09-08T21:37:18Z`; both had zero
automatic restarts. Worker active since `21:33:45Z`, about 52 MiB memory and zero
restarts/processing errors at the initial checks. Terminal image `3d06a2667e10`
and its start time remain unchanged. Newsletter service was not restarted.

Rollback images retained: frontend `7618f1a6824c`, backend `190981d060c9`.
To disable v2, set the override flag false, recreate only the backend and reload
nginx; stop the new worker to stop archive writes. Preserve archived data and
existing collectors. At 21:41 UTC: load ~0.5, ~926 MB available memory, ~2.4 GB
free swap and ~3.8 GB free disk. Existing four high-severity dependency findings
remain in the maintenance backlog; no dependency upgrade was included.

## Dashboard loaders and news update counts — released

Frontend `0d78fb2` deployed on 8 September 2026 after approval.

- Live buffering begins after the initial snapshot resolves, including when
  filters change. Counts follow the rendered, deduplicated events and visible
  content within the active filter/preview limit. Internal version, price and
  ranking changes do not announce new news; headline-only selections ignore
  AI-only enrichment. Replayed event copies do not reappear in the queue.
- Shared news-row skeletons replace solid blocks in the live feed and watch
  preview, retaining tonal surfaces, headline/metadata shapes and 8px gaps.
  Feed/personal requests have a 15-second timeout; failures offer recovery.
  Public overview and letter refreshes are bounded as well.
- Verified exact application source with an isolated production build, 45
  unit tests and 36 focused Chromium tests. These cover slow loads in both
  themes, real request timeout, duplicate replay, actual new stories, AI
  enrichment, filters, pause, older pages, reader navigation and mobile reflow.

Production build and homepage/company/API health checks passed. Fresh anonymous
browser checks at 1440px light and 320px dark confirm the live `/marknaden`, new
watch skeletons, 8px gaps, successful loading completion and no page overflow
or runtime errors. Only the browser's genuine anonymous account response was
delayed to inspect loading; no fake membership, protected-feed access, account
mutation or email send. Live screenshots inspected. Paid queue scenarios were
validated with fictional local fixtures, not a production signed-in account.

Frontend image `7618f1a6824c`, started `2026-09-08T10:49:57Z`, zero restarts;
rollback `a534b8a54b97` retained. Backend `190981d060c9` and Terminal
`3d06a2667e10` retained their pre-deployment image/start times and zero restarts.
Newsletter service was not redeployed or restarted. Post-release available
memory ~353 MB, free swap ~2.1 GB and free disk ~4.0 GB. Existing dependency
findings remain in the maintenance backlog.

## Terminal preview screenshot — released

Frontend `4bf3590` deployed on 8 September 2026 after approval.

- The public `/terminal` preview uses the supplied, unmodified 2940×1592
  screenshot. A static import supplies its dimensions and a content-hashed URL
  shared by the optimized preview and full-size link. The old asset remains
  available for existing links; gateway layout and access rules are unchanged.
- Verified with an isolated production build and nine focused browser tests,
  including responsive themes and guest/free/Plus/Pro access states.
- Live desktop (1440px light) and mobile (320px dark) checks passed, with
  screenshots inspected and no horizontal overflow or runtime errors. The
  full-size link returns the exact supplied PNG, verified by dimensions and
  SHA-256 `79d501c53084a7cf32db3af9463a6c27f15f6aec2115a54794cda230594feb7c`.
  Homepage, company page and company API health checks return HTTP 200.

Frontend image `a534b8a54b97`, started `2026-09-08T09:11:40Z`, zero restarts;
rollback `7e76196cb7f5` retained. Backend `190981d060c9` and Terminal
`3d06a2667e10` retained their pre-deployment images, start times and zero
restarts. The newsletter service was not redeployed or restarted. No account
changes, checkout or email sends occurred during verification.

Post-release capacity: ~848 MB available memory, ~1.9 GB free swap and ~4.0 GB
free disk. Existing dependency findings remain in the maintenance backlog.

## Terminal gateway and newsletter email — released

Frontend `2caa269` and newsletter scheduler `8bd95c8` deployed on 7 September
2026 after approval. This is a public paywall refresh, not a Terminal rewrite.

- `/terminal` now uses the public header, semantic colors, Geist type scale,
  shared membership presentation, buttons and Base UI sign-in dialog. The
  existing product screenshot is explicitly non-live. Mobile has one document
  scroll, readable controls and no clipped content in both themes.
- Prices come from the shared plan presentation. Guests sign in with return
  path `/terminal`; free readers visit pricing. Plus/Pro retain the existing
  authenticated session handoff without an upsell. No new checkout or plan rules.
- Morgonbrevet email follows the article design with a real intro, three supplied
  highlights, source-labelled saved IG data, exact-edition links and existing
  paid personal content. Shared static email components add fallback fonts,
  dark-mode styles and a plain-text alternative without exposing paid copy to
  free recipients. Subscription filtering, sender and schedules are unchanged.

Validation: production frontend build, 38 unit tests and 28 scoped Chromium
checks for the gateway, membership and shared components. Browser checks cover
320/768/1440px, both themes, accessibility, dialog focus and guest/free/Plus/Pro
states with mocked login/session endpoints. Newsletter: 13 unit tests on local
Node 22 and server Node 18, plus 38 offline browser layouts. One separately
authorized fictional mockup was reported delivered and approved by the user;
this is not a claim of exhaustive email-client support.

Live verification: homepage, company page and company API return HTTP 200.
Fresh-browser `/terminal` checks at 1440px light and 320px dark confirm the new
heading, plan/action links, Geist, screenshot and no overflow/runtime errors;
live screenshots inspected. No real login, checkout or new email was triggered.

Frontend image `7e76196cb7f5`, started `2026-09-07T21:02:50Z`, zero restarts;
rollback image `5da5ccf60e3c` retained. Both bundled Geist fonts are present and
no `.env` is baked into the runtime. Backend `190981d060c9` and Terminal
`3d06a2667e10` retained their pre-deployment image/start times and zero restarts.
Terminal had been updated independently at 20:53 UTC, before this release.

Newsletter production checkout `/root/news-test/news-test` was clean and
fast-forwarded from `c1cce4e` to `8bd95c8`. Only PM2 `main` (ID 0, existing
`npm run start`) restarted; production mode, watch disabled and active morning,
evening-generation and analytics schedules were verified. PM2 restart count
increased once, 382 → 383; it stayed online and the error log was unchanged
since 20 August. No subscriber batch ran during deployment. The next scheduled
Morgonbrevet uses the new design; evening generation still does not send mail.
Newsletter rollback source is `c1cce4e`; the older local checkout's unrelated
`src/utils/utils.js` edit remains untouched.

Post-release capacity: ~903 MB available memory, ~2.1 GB free swap and ~4.0 GB
free disk. The four existing high-severity dependency findings remain in the
maintenance backlog; no dependency upgrade was bundled into this release.

## News and stock sharing images — released

Frontend `d3f3405` deployed to omxsum.com on 7 September 2026 after explicit
approval. Backend and Terminal were not redeployed.

- Dedicated news images have full-width, larger Geist headlines, soft signed
  percentage badges and an optional real reaction chart beneath the headline.
  No dark side panel or reserved empty chart block. A known reaction still
  gets its period-labelled badge when its series is unavailable.
- Company/chart images use the same typography, badge formatter and semantic
  dark palette, with a flat chart, clearer spacing, readable fractional price
  ticks, quote time and the existing selected period/moving averages. Solid
  strokes also render straight/flat series correctly in the image renderer.
- Shared `CONTENT_OG_VERSION=3` keeps preview/download URLs and crawler images
  aligned. Canonical story/company routes and the generic site artwork remain
  unchanged. No news calculations, authorization or notification changes.

Verified locally: isolated production build, 38 unit tests and 86 Chromium
browser tests. Saved 1200×630 and 600×315 previews cover positive/negative/zero
reactions, absent charts, long headlines/company names, fractional quotes,
intraday, moving averages and flat series. Metadata checks preserve canonical
URLs and the selected chart period; missing news still returns 404/503.

Production verification: homepage, Marknaden, Aktier, Breven, company page and
company API return HTTP 200. Two public news stories and Ericsson's 1-year
(MA50/MA200) and intraday shares return new versioned 1200×630 PNGs; both Open
Graph and Twitter metadata match. Live images inspected. Generic site PNG is
unchanged and matches the verified local render. Checks used GET requests only.

Frontend image `5da5ccf60e3c`, started `2026-09-07T19:05:44Z`, zero restarts.
Rollback retains the previous running frontend `53d6e20cd080`. Backend
`190981d060c9` and Terminal `09a836319b8e` retain their pre-deployment start
times and zero restarts. Terminal had been updated independently before this
deployment. The frontend has both bundled Geist fonts, no baked `.env`, and
no local API addresses in browser assets. Post-release available memory
~786 MB, free swap ~2.1 GB and free disk ~4.3 GB. Existing four high-severity
dependency findings remain in the maintenance backlog.

## Site sharing image and mobile news layouts — released

Frontend `6525c83` deployed to omxsum.com on 7 September 2026 after explicit
approval. Backend and Terminal were not redeployed.

- New 1200×630 generic sharing image: clear news benefit, angled dark product
  preview and prominent free Morgonbrevet card. Composition informed by
  [Unhidden's sharing image](https://unhidden.so/og-image.png), with OMXsum's own
  type, colors, artwork and public news snapshot. No copied third-party assets.
- Shared, versioned `SITE_OG_IMAGE` replaces the old generic JPG references on
  the homepage, root layout, Marknaden and About. Dedicated story, stock and
  article previews remain intact. Old image URLs remain readable.
- Bundled Geist TrueType fonts and license; static generation has no remote
  font/news dependency. `app/og/home/preview.json` preserves source URLs,
  publication/quote times and the 7 September public capture. The image visibly
  dates the preview and labels reactions since publication, not live quotes.
- Mobile/tablet segmented filters wrap at readable 44px targets. Watchlist
  columns fit the viewport. Featured `Viktigast just nu` rows omit AI prose and
  bullets while the modal/full reader retains them; other feed views are unchanged.
- Roadmap cleanup separates the actionable backlog from these release records.

Verified locally: isolated production build, 34 unit tests and all 83 Chromium
browser tests. Checks cover 320/390/600/768/820px controls, light/dark screenshots,
reader content/focus/history, default and dedicated sharing metadata, and
JavaScript-free Facebook/Twitter crawler responses. Sharing image inspected at
1200×630. No backend, account, billing or Terminal implementation changes.

Production verification: homepage, Marknaden, Aktier, Breven and About return
HTTP 200 with the new generic Open Graph/Twitter image in crawler HTML.
`/og/home?v=20260907-news` returns a 1200×630 PNG whose SHA-256 matches the
visually verified local render:
`a42eab57e5a5b1cb42893abae88fda3ea90c599a036990ce124f909a2ed82e9a`.
Live Chromium checks at 320/390/768/1440px confirm compact featured news,
unclipped controls and no page overflow in both themes. The initialized client
opens/closes the story modal and returns focus correctly. An early test click
before hydration used the valid full-reader fallback; verification was repeated
after client initialization. No runtime errors or production writes were made.
Screenshots inspected. Homepage, a company page and the company API also passed
the deployment script's health checks.

Frontend image `53d6e20cd080`; rollback is the prior running frontend
`336df5f3acbb`. Backend `190981d060c9` and Terminal `c3c948e5af24` retain their
pre-deployment start times and zero restarts. The image excludes `.env`, and
browser assets contain no local API addresses. Post-release available memory
~640 MB, free swap ~2.3 GB and free disk ~4.7 GB. Existing four high-severity
dependency audit findings remain in the maintenance backlog; no dependencies
were upgraded in this presentation release.

## OMXsum 2.0 landing page — released

Status: frontend `b614361` deployed to omxsum.com on 7 September 2026 after
explicit approval. Backend and Terminal were not deployed.
This updates the earlier letter-only landing-page principle, not the product's
access model. The free letter remains the easy entry point, while visitors can
also try the news-led workspace without creating an account.

- [x] Benefit-led homepage: understand news, put stock reactions in context,
  and follow companies/topics/keywords. Shared typography, buttons, labels and
  responsive spacing; one main landmark and normal document scrolling.
- [x] OMXsum 2.0 launch identity in the public shell, homepage metadata and
  1200×630 sharing image. Stable URLs and Terminal branding are unchanged.
- [x] Two real public news examples using the existing material-news selection
  and shared reader; no full paid-feed request or fabricated market data.
  AI copy, sources and observed-reaction periods keep their existing meaning.
- [x] Published morning/evening letter preview using the existing Stockholm
  cutoff, separate loading/failure recovery and a path to the letter archive.
- [x] Landing refinement: newsletter preview beside the hero as the lead
  magnet, news examples lower down, and wider 112px/64px section spacing.
  Mobile places the letter immediately after signup; no duplicate previews.
- [x] Guest signup reuses the confirmed-email onboarding flow. Returning users
  get Marknaden or Bevakning actions; signup remains available because account
  membership does not prove newsletter subscription.
- [x] Replace ticking clock, hard-coded demo blocks and repetitive feature
  catalogue. Clarify free overview/letters, five followed companies and Plus
  access to the full feed, research and personal letter additions.
- [x] User review and explicit publishing approval.
- [x] Production rollout and post-release checks.

Verified: isolated production build, all 32 frontend unit tests and all 74
Chromium browser tests pass. Landing coverage includes guest/returning-user
actions, unchanged signup confirmation, reader history/focus, metadata and OG,
320/390px/desktop layouts and automated light/dark accessibility checks.
Screenshots and the sharing image were inspected. Separate local outage checks
verify independent preview failure, dual HTTP failures, retry recovery and
genuine empty states while signup remains usable. All test users and stories
are fictional; this is not a production upstream or release check.
No backend, billing, account, notification-delivery or Terminal changes.

Production verification: homepage, Marknaden, Aktier, Breven, pricing and the
company API return HTTP 200. Live browser checks at 1440/390/320px confirm
the OMXsum 2.0 title/header, today's published letter in the hero, working
letter link, 112px/64px section gaps, no horizontal overflow in light/dark
mode, signup-anchor focus and no runtime errors. The homepage sharing image
returns a 1200×630 PNG. No account, email, following or checkout submissions.
Screenshots inspected. The running image excludes `.env` and its browser
assets contain no local API addresses.

Frontend image `336df5f3acbb`; previous frontend `0e806c7000b7` retained as
rollback. Backend stays `190981d060c9`, Terminal stays `c3c948e5af24`, all
without restarts. Post-release available memory ~743 MB, free swap ~2.3 GB
and free disk ~4.7 GB. The existing local development server was left running.

## Membership UX — released 7 September 2026

- [x] `/pro`: shared components/tokens, explicit 0/49/99 kr monthly prices,
  news-first benefits, current/included plan states and mobile stacked plans.
- [x] Base UI sign-in with focus return; no checkout before account loading
  or automatic purchase after login. One pending checkout, local retryable
  failure and an allowlisted Stripe-hosted destination.
- [x] Existing paid readers go to subscription management instead of creating
  another subscription. Stripe APIs, prices and entitlements are unchanged.
- [x] `/pro/klart`: server-confirmed access, bounded polling, retry/sign-in
  and support recovery. News feed and company following are the next steps.
- [x] Focused verification: production build, 28 frontend unit tests and nine
  membership browser tests; inspected desktop/mobile screenshots in both
  themes, keyboard login and automated accessibility checks.
- [x] Full isolated regression: all 67 Chromium tests pass, including the
  completed onboarding, settings, company research and news-reader flows.
- [x] User review and explicit push/deployment approval on 7 September 2026.
- [x] Production rollout and smoke checks, including the earlier onboarding work.

Release: frontend application commit `7e3b5ed`, backend `fb5a6f2`, deployed
backend first on 7 September 2026. Frontend image `0e806c7000b7`, backend image
`190981d060c9`; previous images `e862d29c82a0` / `7dc1f7d8e282` retained for
rollback. Terminal remained on its preflight image `c3c948e5af24`.

Production verification: HTTP 200 for pricing/return/confirmation, homepage,
Marknaden, Aktier, Ericsson's company report, settings and Morgonbrevet.
Isolated browser checks pass at 1440/390/320px, including guest login focus
return, no false payment confirmation, and confirmation privacy metadata with
no third-party script requests. Screenshots inspected. No account, email or
checkout submissions were made. All 12 injected onboarding tests also pass
inside the deployed backend; its image excludes `.env`, and the frontend
bundle contains no local API URLs. The legacy authentication middleware returns
HTTP 200 with an error object for missing cookies; it still blocks guest access.

Access audit at release: backend `feed.js` and `auth.js` granted Plus both the
public analytical tools and Terminal; `user.js` capped followed companies at
5/10/100. Pro differentiated on watchlist size, not exclusive Terminal access.
The checkout endpoint created a new subscription, so existing paid readers
were sent to subscription management. Portal plan-change configuration and
an idempotent in-app upgrade path were not verified as part of this release.

## Company-first onboarding — released 7 September 2026

- [x] Shared signup field and one confirmation dialog with edit, resend,
  cooldown, existing-subscriber sign-in and honest delivery feedback.
- [x] `/bekrafta`: confirmation first, optional company selection, saved-state
  feedback, three actual matched news rows and a direct Bevakning handoff.
  Skip to Morgonbrevet; topics/keywords remain secondary management choices.
- [x] Shared AI copy/reactions, normal mobile page scrolling, no forced upsell
  or notification opt-in. Existing plans, preferences and billing are preserved.
- [x] Confirmation retries prepare the account/session before atomic token
  consumption. Invalid/replayed links cannot authenticate. Welcome delivery
  cannot turn a completed confirmation into an error. Pending resends retain
  their token; resubscribing requires email proof instead of an anonymous write.
- [x] Explicit, idempotent follow-state endpoint with atomic membership/cap
  checks. Existing toggle endpoint retained for older clients.
- [x] Token-free success URL, authenticated subscription status for reload,
  no-referrer metadata and no third-party scripts on `/bekrafta`.
- [x] Final regression and visual verification: isolated production build,
  26 frontend unit tests, 31 backend unit tests and all 58 Chromium browser
  tests pass. Inspected desktop/mobile light/dark screenshots; axe checks pass
  on the onboarding document and signup dialog. Visual review moved the primary
  action above the compact news preview so it stays reachable on phones.
- [x] User review and explicit frontend/backend deployment approval on
  7 September 2026. Backend-first release completed and verified.

Scope includes `newsbackend`: the compatible backend was released before the
frontend (new POST confirmation, status and PUT following endpoints). Existing
GET confirmation and toggle clients remain supported. No production emails,
real account writes, billing changes, backfills or Terminal deployment are part
of local verification. Rate limits are process-local (one-minute address
cooldown plus five accepted attempts per IP/hour); shared persistence and a
durable welcome-email outbox remain separate infrastructure work.

## Continuous company report — released

Status: frontend `d853488` deployed on 7 September 2026 after explicit approval.
Production desktop/mobile navigation, story-reader return and health checks
passed. Backend and Terminal were unchanged.

Approved direction: one scrollable `/aktie/<SYMBOL>` report, not a tab-switched
dashboard. The chart introduces the company; news is the first research section.

- [x] Sticky desktop contents and compact mobile contents sheet, using shared
  foundation type, tokens, controls, Base UI dialogs and section links.
- [x] Flat top chart, compact persistent company/quote context, and a source-linked
  material event beside the chart when available on a wide screen.
- [x] Chronological, event-deduplicated news with genuine AI summary/bullets,
  observed reactions, six initial rows and explicit expansion. Reports, letters,
  company description and financial statements use progressive disclosure.
- [x] Anchor navigation, scroll highlighting, legacy `?tab=` support, preserved
  chart/share parameters and canonical company URL.
- [x] Near-viewport/explicit-selection research mounting, retained section state
  and unchanged server-resolved Plus access. No synthetic intraday loading curve.
- [x] Complete responsive, keyboard, reader-return and regression verification.
- [x] User review and push approval on 7 September 2026.
- [x] Explicit deployment approval and company-page production release.

Verified on 7 September: isolated production build, 26 unit tests and all 50
Chromium browser tests pass. New coverage includes persistent sections, legacy
links and reload, stable lazy-section jumps, news-reader Back/Forward with focus
and scroll restoration, bounded/deduplicated news, chart settings/sharing,
320/390/820px layouts, empty/error states, public summaries and Plus boundaries.
Automated accessibility checks cover the report in both themes. The shared
checkbox now labels its control separately from its description.

Light/dark desktop and mobile screenshots were inspected, including a separate
preview reading real public company data without account mutations. That
preview had no runtime errors or page overflow at 320/390px. The ordinary local
preview's backend was offline during validation; it was not restarted or changed.
Public financial highlights and the optional public spider remain outside Plus;
the spider's data is requested only when its disclosure is opened.

No backend, Terminal, scoring or account mutations are part of this work.

## Screener polish — released

Status: frontend commit `084d69f` pushed and deployed on 7 September 2026 after
explicit approval. Backend, Terminal and account data stayed unchanged.

- [x] Shared stock-workspace navigation, Geist type, neutral light/dark
  surfaces, compact comparison rows and meaningful signed-change colors.
- [x] Base UI buttons, grouped metric select, labelled numeric field and
  accessible filter dialog. Active rules can be removed inside or outside the
  dialog; modifying a preset clears its selected state.
- [x] Mobile touch controls, wrapping filter chips, pinned company identity,
  and horizontal table scrolling without a nested vertical scroll area.
- [x] Keep all columns, metric calculations, preset thresholds, sorting,
  50-row pagination, refresh and Plus access. Retain the compact profile and
  its scores; opt only the screener profile into the shared palette.
- [x] Visible Stockholm data timestamp, methodology dialog and separate
  loading/empty/error states. Failed refreshes retain prior data with a notice.
- [x] Replace obsolete global screener rules with a scoped CSS Module.
- [x] Release review and explicit publishing approval.

Verified: isolated production build, all 24 frontend unit tests and all 43
Chromium browser tests passed. Screener coverage includes both themes,
320/390px touch layouts, pinned-column/page scrolling, keyboard focus and
nested-select dismissal, presets/rules, missing values, sorting, pagination,
refresh recovery and guest/free/Plus access. Desktop/mobile screenshots were
inspected; the existing local preview returns HTTP 200. Browser data and users
are fictional. Contrast checks wait for theme transitions to finish.

## Approved release: AI descriptions and company-first discovery

Status: public frontend `7b0f86b` and backend `14452f4` deployed. The compatible
Market API serializer patch `7527a09` was pushed separately; Terminal was not
rebuilt or deployed. The public compatibility bridge remains in use.

- [x] Shared `NewsSummary` beneath row/reader headlines: AI prose and up to
  three real bullet points, labelled as AI. No deterministic-description fallback.
- [x] Preserve AI fields through the public Market API and personalized proxy;
  social descriptions use AI prose when available. No generation/ranking changes.
- [x] Same-version AI enrichment is recognized when fetched/received and queued
  for explicit feed acceptance; ordinary price updates do not create a queue.
- [x] Implement the approved `/aktier` direction with compact company/quote/news
  rows, contextual follow controls and shared neutral surfaces. Remove the
  separate discovery feed and obsolete directory CSS; keep screener unchanged.
- [x] URL-backed I nyheterna / Rapporter / Alla bolag, search, sector/list,
  explicit sorting and pagination. Return from stories/companies without losing
  filters. Missing prices, empty selections and source failures stay distinct.
- [x] Bounded company-grouped news endpoint: fixed 96-hour window, importance
  threshold 60, routine-insider/admin filtering, separate report selection,
  200-company caps with explicit truncation, one shared cache and query timeout.
- [x] Public API compatibility bridge reads only AI text/bullets for already
  selected/authorized story IDs, in one version-matched batch. This makes the
  release independent of a simultaneous Terminal rebuild.

Release scope: the user approved pushing all three scoped repository changes
and deploying the public frontend/backend. The compatible `stonks` serializer
patch is isolated on top of current upstream; the live Terminal checkout also
has unrelated unfinished work, so do not rebuild or alter it for this release.
The public API bridge delivers AI copy now and skips the lookup once the upstream
serializer supplies it. No notification delivery or AI-generation changes.

Verified: fresh isolated production build, 24 frontend unit tests, 19 backend
unit tests, two Market API serialization tests and its TypeScript check; all
37 Chromium browser tests passed with fictional data. Desktop/mobile reader
and directory screenshots were inspected. The production discovery query was
validated read-only in 39ms. A concurrent local `next dev` preview on port 5173
shares `.next` with root-checkout production builds and causes SSR module errors
when it rewrites them. Run production verification in an isolated copy while
that preview is active. The affected local preview was restored through its
existing launcher after scoped approval. Account/notification writes are not
part of this release; tests use fictional identities.

## Editorial/account migration — released

Status: shipped with approval on 7 September 2026, including the subsequent
AI-description and company-discovery work below (frontend `7b0f86b`, public
backend `14452f4`). The earlier local-only status is superseded.

- [x] Reusable `Label` and `NewsTypeLabel`, neutral category icons, gallery
  examples, integration with news rows/readers and edition labels.
- [x] Settings: shared controls, accessible theme/email switches, subscription
  portal, explicit save/revert, retryable errors and preserved newsletter values.
- [x] One reading layout for articles, morning and evening editions; safe source
  links, actual section headings, company previews and canonical sharing links.
- [x] Shared lightweight letter cards for the archive and existing landing-page
  previews; reader-only code no longer loads through the legacy preview parser.
- [x] Full Stockholm-date checks instead of weekday-only edition matching.
  Missing content and unavailable preferences are distinct from empty values.
- [x] Release review and public frontend/backend deployment.

Verified locally: production build, 16 frontend unit tests, and 29 Chromium
browser tests passed. Browser coverage includes explicit/failed email saves,
missing preferences, theme persistence, keyboard previews, source links,
clipboard sharing, shared archive cards, and 320/390px/desktop layouts.
No real newsletter preferences, billing actions, or account data were changed.

## News-first public workspace — September 2026

Status: deployed to omxsum.com on 7 September 2026 (Stockholm), frontend
`a50f173` and backend `c387973`. This section supersedes earlier
public-navigation and dashboard-layout assumptions.
Use `UI.md`, `docs/design-system.md`, and `docs/news-first-workspace.md` for the
implementation contract. Do not interpret the historical “shipped” notes below
as verification that a new feature has been deployed.

### Implemented in this revision

- [x] Four shared destinations: Marknaden, Bevakning, Aktier, Breven. Compact
  public shell and Base UI stock search; an explicit search-in-news handoff.
  Terminal remains separate and the landing page remains a landing page.
- [x] `/marknaden`: compact index/breadth strip, 3–5 material events, a real
  letter preview, personal matches, and chronological news on the overview.
  Document scrolling replaces dashboard-height and nested-list constraints.
- [x] Public readers see a labelled chronological **selection**; Plus/Pro see
  the full live feed. Existing subscription/access boundaries are preserved.
- [x] One event-row grammar and canonical `/nyhet/[id]` reader. Client links
  open an accessible Base UI dialog; direct visits and refresh open a reading
  page. Back/Forward, original sources, company follow and copy/native share.
- [x] Per-story 1200×630 social images and Open Graph/Twitter metadata. Use
  actual headlines, sources, available price curves and labelled reaction
  periods. Missing data gets a text-led variant, never an invented graph.
- [x] Shared feed with URL-backed search/category/reaction views, explicit new
  version queue, pause/resume, connection status, and older-page controls when
  the upstream API provides an opaque cursor. No fabricated archive cursors.
- [x] Inline company following with plan-cap/error handling and visible saved
  state. Topics/keywords are secondary management choices, not prerequisites
  for seeing useful news. Following does not enable notification delivery.
- [x] Bevakning refreshes with explicit new-story acceptance and a local,
  account-scoped “Sedan sist” filter. This is a last-visit marker for the current
  device, not cross-device read receipts or a claim that each story was read.
- [x] `/nyhetsbrev` is a briefing library with morning/evening filters, older
  editions, real previews and the existing opt-in subscription flow. Market
  overview refreshes letter candidates and switches to today's evening edition
  after 17:30 Stockholm only once that edition exists.
- [x] Initial company-news preview shipped ahead of the chart controls. The
  later continuous-report release superseded its tabs and ordering;
  the spider profile remains secondary.
  Aktier offers news-led discovery and contextual links into reactions/reports
  and the existing screener.
- [x] Backend overview candidate pool widened from 40 / importance ≥60 to
  100 / importance ≥50. Routine insider items and administrative notices stay
  out of the featured selection; ordinary announcements plus abnormal trading
  alone no longer produce a “likely” mover classification.

Release includes frontend **and** `newsbackend` changes, deployed after explicit
publishing approval. No account upgrades, billing changes, or production
backfills were performed.

Local verification: production build passed; 12 frontend and 13 backend unit
tests passed; 21 Chromium browser tests passed against fictional data, including
mobile/light/dark layouts, keyboard/focus/history, clipboard links, OG variants,
access boundaries, and failed preference saves. These checks do not verify the
production upstream archive or replace user testing and post-release checks.

Production verification: capped sequential builds completed, both containers
are running without restarts, and homepage/company/API health checks passed.
The market workspace, full-feed entry point, watchlist, letter library and
component gallery returned HTTP 200. A public story returned canonical and
social metadata, its image returned a 1200×630 PNG, and related stories loaded.
The overview returns 100 candidates; anonymous full-feed access remains denied.
Previous running images are retained for rollback. Authenticated archive
pagination still needs verification against the upstream API.

## Shipped foundation (aug 2026)

- Morgon- & kvällsbrev (AI, gratis), double opt-in signup with onboarding
- Own newswire (MFN/Cision/FI/Nasdaq/Riksbanken → events → Swedish stories),
  Market API v1 with SSE
- Marknadsnyheter live feed + per-stock pages (kurs/finanser/kalender/historik)
- Price reactions where available in the feed, modal, chart dots and
  hover-sparks; missing reaction data is not zero
- Stripe billing: Plus 49 kr / Pro 99 kr
- Clickable tickers in letters with hover mini-charts

## August 2026 product records

These implementation notes predate the September public-site redesign.
Original routes and layouts below are historical, not additional navigation
destinations. Coverage figures are August observations, not a fresh audit.

### Company research foundation

- ✅ Stable company URLs and single-company search
- ✅ Company identity, performance, source-aware quote status, daily chart,
  OMXSPI comparison, and opt-in MA50/MA200
- ✅ First financial view with annual, quarterly, and derived R12 periods
- ✅ Actual/estimate financial chart with sourced striped consensus periods
- ✅ Structured CEO summary with outlook, risks, key figures, and expandable
  source text
- ✅ Report/calendar/news context from the shared Market API
- ✅ Händelsemarkeringar i kursgrafen: rapport (R), utdelning (U) och
  väsentlig nyhet (N) från bolagskalendern och wire-stories, med händelserna i
  grafens tooltip och nyhetsmarkeringen länkad till primärkällan
- ✅ Strukturerad data (`Corporation` + `WebPage` + brödsmulor) och en
  uttalad indexeringspolicy — översikt/nyheter/kalender är publika och
  indexeras, finansiellt/estimat/värdering ligger kvar bakom Plus
  (se README "SEO and indexing policy")

### Research depth

- ✅ Värderingshistorik (aug 2026): P/E, P/S, EV/EBIT och EV/S mot bolagets
  eget spann, med percentil, normalspann och ett "Så räknas"-underlag som
  visar varje rapporterad siffra och från vilket datum den var offentlig.
- ✅ Valutakonvertering (aug 2026): bolag som rapporterar i EUR/USD/GBP
  (Evolution, AstraZeneca m.fl.) får riktiga multiplar omräknade med daglig
  lagrad växelkurs. Resultatmultiplar nära nollresultat markeras "ej
  meningsfulla" i stället för att förstöra spannet, och felregistrerade
  R12-rader rensas ur API:et (även Finansiellt och översikten).
- ✅ Fullständig finansiell vy (aug 2026): Finansiellt visar resultat,
  marginaler och avkastning (ROE/ROIC), balans och skuldsättning, kassaflöde
  och tillväxt, grupperat som en årsredovisning. Härlett centralt i API:et.
- ✅ Rapportskrapning (aug 2026): tre grundorsaker till att hälften av alla
  rapport-PDF:er saknade VD-ord är fixade; lagrade missar omprocessas.
- ✅ Insynsvy (aug 2026): ny Insyn-flik på bolagssidorna med varje
  transaktion ur FI:s insynsregister — utan beloppsgräns, för mönstret är
  signalen. Köpt/sålt/netto över 3 och 12 mån, varje rad länkad till FI:s
  anmälan. 24 månader backfyllt, hålls aktuellt av wiren.
- ✅ Ägardata ur årsredovisningarna (aug 2026): styrelsens och ledningens
  innehav per person + största ägare-tabellen, AI-extraherat med verbatim-
  validering mot de citerade sidorna (48 av 68 årsredovisningar i första
  svepet). Insyn-fliken visar största ägare, personers innehav, och
  försäljningar som ≈ andel av innehavet — alltid daterat till rapporten.

### Wire stories in both letters

✅ Shipped aug 2026: both letters consume the wire via `getWireStoriesText`
(newsbackend `jobs/utils/wireUtils.js`) — importance-ranked stories with
price reactions injected into the summarization prompt; the evening letter
sorts by absolute reaction ("dagens mest marknadspåverkande nyheter").
Fail-safe: any wire error returns an empty block and the letters generate
exactly as before. Windows: morning 16h back, evening 12h back — fixed
hours rather than "since last letter", which overlap rather than gap.

### Personalized morning letter v1

- A shared free base letter plus composable personal blocks, not a separately
  generated full letter per user. Story summaries are cached and reused.
- Watchlists, topic selection and per-tier company caps (5/10/100).
- `Min sammanfattning`: stories matched against followed companies and topics,
  assembled through `GET /api/tool/personal-blocks`. Plus/Pro receive the real
  personal block; the shared free letter remains useful on its own.
- Indirect industry matches v1: importance ≥70, at most two, explicitly
  labelled as industry-related rather than direct company announcements.
- On-site personal preview through `GET /api/user/personal-preview`, using
  the same matching as the composer. Missing personal data does not prevent
  the ordinary letter from being sent.
- The early `/mina-aktier` preview and onboarding upsell were superseded by
  September's Bevakning and company-first confirmation flow. The old
  "add topics / merge identity / build the onboarding picker" TODOs are no
  longer pending; see the onboarding release above.

### Reaction analytics

- ✅ Screener (aug 2026): `/screener` movers table where each move carries
  its explaining wire story + label ("Rapport", "Order", …). Replaced the
  movers panel on Marknadsnyheter.
- ✅ "Störst reaktion" sort toggle in the live feed (aug 2026); reaction
  sorting already feeds the evening letter
- ✅ Wire management coverage (aug 2026, from rejection audit): widened
  `management` event patterns (wire-12) — passive "utses till ny VD",
  ledningsförändringar, koncernchef/COO, interim. Rejected backlog
  reprocessed surgically (9 stories rescued incl. ASSA ABLOY/Gunnebo M&A).
- ✅ Fixed reaction windows (aug 2026): +1h and +1d beside "sedan
  publicering", computed against the same baseline, reported only once the
  window has closed (final numbers, never ticking). Minute bars where the
  rolling cache reaches, daily-close fallback for older stories. Shown in
  the news modal; `h1Pct`/`d1Pct` on the news resource for other consumers.
- Honest labeling: thin trading and index moves aren't causality

### Search discovery

`/borsnyheter` shipped as a stable Swedish search-intent page explaining the
service and publication times, linking the editions and offering signup.
Topic pages and broader search acquisition were proposals, not shipped pages.
