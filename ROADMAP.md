# OMXsum roadmap

## Identity

**OMXsum is one Swedish-market data platform with two product surfaces.** News
and the daily letters remain the acquisition and synthesis edge. The public
site is the calmer company-research product for longer horizons; the terminal
is the dense realtime workspace. Both consume the same source-attributed API.

The funnel: **free morning letter (lead magnet) → habit → personalization
(paid) → power tools (paid)**.

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
