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

Status: implemented locally, pending release verification and deployment. This
section supersedes earlier public-navigation and dashboard-layout assumptions.
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
- [x] Company overview surfaces recent news before the main chart controls;
  Nyheter is the second company tab and the spider profile is secondary.
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

Release includes frontend **and** `newsbackend` changes. No deployment, account
upgrades, billing changes, or production backfills are part of this revision.

Local verification: production build passed; 12 frontend and 13 backend unit
tests passed; 21 Chromium browser tests passed against fictional data, including
mobile/light/dark layouts, keyboard/focus/history, clipboard links, OG variants,
access boundaries, and failed preference saves. These checks do not verify the
production upstream archive or replace user testing and post-release checks.

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

## Pricing map (current thinking)

| | Gratis | Plus 49 kr | Pro 99 kr |
|---|---|---|---|
| Morgon-/kvällsbrev | ✓ | ✓ | ✓ |
| Marknadsnyheter live + reaktioner | – | ✓ | ✓ |
| Aktieöversikter | – | ✓ | ✓ |
| Personaliserat brev + watchlist | – | ✓ (cap ~10 aktier) | ✓ (obegränsat) |
| Telegram-alerts | – | – | ✓ |
| Terminalen fullt ut | – | – | ✓ |

## Principles

- The free letter never gets worse to force upgrades — it's the acquisition
  engine. Paid = "mine, about my stocks", not "less bad".
- Everything renders in Swedish; facts/tags stay English (API contract).
- Landing page sells the letter only; paid features surface in product.
