# OMXsum roadmap

## Identity

**OMXsum is one Swedish-market data platform with two product surfaces.** The
public site is a news-led daily workspace: understand what happened, inspect
the observed market reaction, and follow what matters to you. Company research
adds depth after that first understanding. The terminal remains the dense
realtime workspace for investigation and monitoring. Both consume the same
source-attributed API; the public product is not a smaller copy of Terminal.

The funnel: **free morning letter (lead magnet) → habit → personalization
(paid) → power tools (paid)**.

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
  continuous-report iteration below supersedes its tabs and ordering locally;
  the spider profile remains secondary.
  Aktier offers news-led discovery and contextual links into reactions/reports
  and the existing screener.
- [x] Backend overview candidate pool widened from 40 / importance ≥60 to
  100 / importance ≥50. Routine insider items and administrative notices stay
  out of the featured selection; ordinary announcements plus abnormal trading
  alone no longer produce a “likely” mover classification.

### Follow-up: evidence and coverage, not another dashboard

- [ ] Verify archive cursor support against the deployed Market API. The
  proxy now forwards real cursors and filters categories per returned page;
  it does not manufacture complete history when the source offers none.
- [ ] Store stable story IDs in letter blocks so each editorial claim can
  link to the exact underlying event. Do not infer those IDs from company
  mentions or pretend a keyword search is a source citation.
- [ ] Expand and evaluate market/sector coverage: fewer duplicated issuer
  notices, stronger market-wide reporting, source attribution for synthesis.
  Never fill gaps with an unsupported “why the market moved” narrative.
- [ ] Rank independent importance, observed reaction, and personal relevance
  separately. Add measurement-time provenance from the source where absent.
- [ ] Extend indirect industry connections with visible reasons and evidence.
  Keep “related industry news” distinct from direct company announcements.
- [ ] Explicit notification delivery preferences, channels, quiet hours and
  alert deduplication. UI following is not proof that push/email/Telegram
  delivery exists or is enabled.
- [ ] Cross-device catch-up/read state if user testing supports it.
- [ ] Validate with everyday readers: identify important events, interpret
  reaction periods correctly, follow a company without visiting settings,
  and return to a feed without losing position.

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
- [ ] Migrate the remaining landing, pricing/account utility pages and
  analytical stock controls; screener presentation is the local pass below.

Verified locally: production build, 16 frontend unit tests, and 29 Chromium
browser tests passed. Browser coverage includes explicit/failed email saves,
missing preferences, theme persistence, keyboard previews, source links,
clipboard sharing, shared archive cards, and 320/390px/desktop layouts.
No real newsletter preferences, billing actions, or account data were changed.

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
- [ ] Later UX pass: URL-persisted screener filters/sort for shareable screens.
- [x] Release review and explicit publishing approval.

Verified: isolated production build, all 24 frontend unit tests and all 43
Chromium browser tests passed. Screener coverage includes both themes,
320/390px touch layouts, pinned-column/page scrolling, keyboard focus and
nested-select dismissal, presets/rules, missing values, sorting, pagination,
refresh recovery and guest/free/Plus access. Desktop/mobile screenshots were
inspected; the existing local preview returns HTTP 200. Browser data and users
are fictional. Contrast checks wait for theme transitions to finish.

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

Follow-up: translated releases with different upstream event/fact identities can
still appear separately. Keep this an event-linking/data-quality task rather than
guessing equivalence from similar headlines in the company UI.

No backend, Terminal, scoring or account mutations are part of this work.

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

Access audit: backend `feed.js` and `auth.js` grant Plus both the public
analytical tools and Terminal; `user.js` caps followed companies at 5/10/100.
Pro currently differentiates on watchlist size, not exclusive Terminal access.
Before advertising additional Pro features, decide and implement their actual
entitlements. Separately, verify Stripe portal plan-change configuration and
add an idempotent existing-subscription upgrade path before offering in-app
Plus-to-Pro checkout again. The current endpoint creates a new subscription.

Next UI scope: the landing page and remaining account utility surfaces. Keep
the free letter as the entry point and connect it to the news-led workspace;
do not turn the landing page into another market dashboard. The unchanged
landing page also needs a main landmark and clearer personal-letter access copy.

## Shipped foundation (aug 2026)

- Morgon- & kvällsbrev (AI, gratis), double opt-in signup with onboarding
- Own newswire (MFN/Cision/FI/Nasdaq/Riksbanken → events → Swedish stories),
  Market API v1 with SSE
- Marknadsnyheter live feed + per-stock pages (kurs/finanser/kalender/historik)
- **Price reaction on every news item** ("+4,1% sedan nyheten") in feed,
  modal, chart dots and hover-sparks
- Stripe billing: Plus 49 kr / Pro 99 kr
- Clickable tickers in letters with hover mini-charts

## Now / next

### Phase 2. Company-page MVP (klar aug 2026)

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

### Phase 3. Research depth (pågår)

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
- Idé senare: gör nyhetsflödets insynströskel relativ (andel av börsvärde
  eller omsättning) i stället för absoluta 50 kSEK — 50k betyder olika saker
  i Ericsson och i ett microcap.
- ✅ Ägardata ur årsredovisningarna (aug 2026): styrelsens och ledningens
  innehav per person + största ägare-tabellen, AI-extraherat med verbatim-
  validering mot de citerade sidorna (48 av 68 årsredovisningar i första
  svepet). Insyn-fliken visar största ägare, personers innehav, och
  försäljningar som ≈ andel av innehavet — alltid daterat till rapporten.
  Kvar: täckningen växer i takt med att fler årsredovisningar upptäcks;
  kommersiella källor (Holdings, Euroclear) om realtidsinnehav behövs.
- Blockerat på täckning, inte på arbete: utfall mot historiskt konsensus,
  estimatrevideringar och rapportöverraskningar. Publika estimat finns för 58
  av 870 bolag, och det saknas arkiv över vad konsensus sa före tidigare
  rapporter. Det löses av Phase 5, inte av mer frontend.

### 0. Wire → letters: use our own newsfeed in the summaries

✅ Shipped aug 2026: both letters consume the wire via `getWireStoriesText`
(newsbackend `jobs/utils/wireUtils.js`) — importance-ranked stories with
price reactions injected into the summarization prompt; the evening letter
sorts by absolute reaction ("dagens mest marknadspåverkande nyheter").
Fail-safe: any wire error returns an empty block and the letters generate
exactly as before. Windows: morning 16h back, evening 12h back — fixed
hours rather than "since last letter", which overlap rather than gap.
Long term the wire replaces the ad-hoc scrapes entirely.

### 1. Personalized letters (the big paid feature)

**Architecture: composable letter blocks — not one AI letter per user.**

- Base block = today's shared morning letter (unchanged, stays great & free)
- "Dina aktier" block: wire stories matched against the user's watchlist,
  summarized once per story (cached), assembled per user
- Topic blocks: smallcap / large cap / medtech / … mapped from the stocks
  collection (`segment`, `sector`, `industry`) — user model still needs a
  `topics` field (not there yet, despite earlier note)
- One email per user per day (base + their blocks). Cost ≈ one small
  completion per user; story summaries shared across users.

**Steps:**
1. ✅ Watchlist model + toggle API (aug 2026), per-tier caps
   (free 5 / Plus 10 / Pro 100)
2. ✅ Watchlist UI: star on stock pages, "Mina aktier" filter in the live
   feed, `/mina-aktier` page with stock picker + topics ("Ämnen":
   segments + sectors). Remaining: picker in onboarding (needs identity
   merge below)
3. ✅ Letter composer v1 (aug 2026): "Min sammanfattning" block in the
   morning letter — wire stories matched vs watchlist + topics
   (GET /api/tool/personal-blocks), real stories for Plus/Pro, locked
   teaser with real match count for free users. Fail-safe: letter sends
   unchanged if blocks unavailable.
4. ✅ Indirect impact v1 (aug 2026): stories from the same industry as a
   watched stock (importance ≥70, max 2) appended to the personal block;
   AI bullets render them as "Inom din bransch: …"
5. ✅ Onboarding upsell (aug 2026): confirm → stock/topic picker (free) →
   live preview of "Min sammanfattning" with real matched stories and
   reactions (GET /api/user/personal-preview, same matching as the letter
   composer) → "Aktivera med Plus". Preview also on /mina-aktier. The
   letter section itself stays Plus-gated — the on-site preview is the
   taste that sells it.

**Identity merge (prerequisite for step 5):** newsletter signups live in the
`mails` collection and are not accounts — but watchlists live on `users`.
The onboarding stock-picker requires merging these: newsletter signup should
create (or link to) a user identity so a fresh subscriber can pick stocks
before ever "logging in". Then confirm-email doubles as account verification
(the flows already share the double-opt-in mail).

**Stock labels → news linking (idea, underpins topic blocks + interests):**
Give every stock a label set ("industry", "small cap", "medtech", …) derived
from the stocks collection (`segment`, `sector`, `industry`) plus curated
extras. Tag wire stories with the same vocabulary so stocks and news link
through shared labels, not only ticker mentions — a story tagged
medtech+smallcap surfaces for every stock (and user) carrying those labels.
This becomes the backbone for personalized-letter "interests" the user picks,
and lets news attach to more than the company name (sector moves, regulation,
macro themes).

**Infra prerequisites:**
- Resend paid tier before rollout (free cap 100 mails/day already tight)
- Letter job moves from one send-loop to per-user rendering — keep total
  runtime < 30 min before 08:00

### 2. Reaction analytics (deepen the moat)

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
- Reaction history on stock pages: "how does this stock react to reports?"
- Honest labeling: thin trading and index moves aren't causality

### 3. Alerts

- Telegram bot (the wire was designed with a Telegram consumer in mind):
  instant watchlist alerts, no email cost. Pro feature.
- Web push later; email digest as fallback.

### 4. SEO: stable intent pages

Search Console shows impressions but almost no clicks — the site lacks
permanent pages matching non-brand intents. `/borsnyheter` (shipped) targets
"börsnyheter idag / Stockholmsbörsen nyheter / börssammanfattning": explains
the service, publish times, links the latest editions, captures signups.
Daily articles link back to it. Next candidates: per-topic pages
("småbolagsnyheter", "rapportsäsongen") and per-stock landing content once
the news archive grows. Do actual keyword research before adding more.

## Later

- Automated articles: weekly sector summaries, "veckans insynshandel",
  report-season recaps — generated from wire + reaction data
- Personalized evening letter (same block system)
- Watchlist portfolio view (only if it serves the news experience)
- Wire: prefer Swedish MFN variant when a release exists in both languages
- Re-run description translation for newly listed companies
- Periodic wire rejection audit (5-min check: `filterReason` aggregation)

## Pricing map (enforced access, checked 7 September 2026)

| | Gratis | Plus 49 kr | Pro 99 kr |
|---|---|---|---|
| Morgon-/kvällsbrev | ✓ | ✓ | ✓ |
| Marknadens nyhetsurval + aktieöversikter | ✓ | ✓ | ✓ |
| Hela nyhetsflödet + sökning | – | ✓ | ✓ |
| Screener + fördjupad bolagsanalys | – | ✓ | ✓ |
| Bevakade bolag på sajten | 5 | 10 | 100 |
| Personlig del i Morgonbrevet | – | ✓ | ✓ |
| Terminalåtkomst | – | ✓ | ✓ |

Notification delivery is not a promised plan benefit; following a company is
not an alert opt-in. This records current access rather than future pricing
aspirations. The monthly prices and billing configuration have not changed.

## Principles

- The free letter never gets worse to force upgrades — it's the acquisition
  engine. Paid = "mine, about my stocks", not "less bad".
- Everything renders in Swedish; facts/tags stay English (API contract).
- Landing page sells the letter only; paid features surface in product.
