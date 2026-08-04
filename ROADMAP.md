# OMXsum roadmap

## Identity

**OMXsum is a news product.** The edge is synthesis: taking everything that
happens on the Swedish market and turning it into something a busy person can
absorb in three minutes — and showing how the market *reacted* to it.
Charts, financials and the terminal are supporting utilities, not the product.
Brokers have data; OMXsum has the story.

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

### 0. Wire → letters: use our own newsfeed in the summaries

The morgon-/kvällsbrev generation should consume the OMXsum wire as a
first-class source alongside the existing scrapes: top stories since the last
letter (importance-ranked, Swedish, deduplicated, **with price reactions**)
go into the summarization prompt. The evening letter especially benefits:
"dagens mest marknadspåverkande nyheter" comes straight from reaction data.
Additive and fail-safe — if the wire is unreachable the letters generate
exactly as before. Long term the wire replaces the ad-hoc scrapes entirely.

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
1. ✅ Watchlist model (`user.watchlist`, cap 30) + toggle API (aug 2026).
   Per-tier caps (Plus ~10 / Pro unlimited) still todo
2. ✅ Watchlist UI: star on stock pages, "Mina aktier" filter in the live
   feed, `/mina-aktier` page with stock picker + topics ("Ämnen":
   segments + sectors). Remaining: picker in onboarding (needs identity
   merge below)
3. ✅ Letter composer v1 (aug 2026): "Min sammanfattning" block in the
   morning letter — wire stories matched vs watchlist + topics
   (GET /api/tool/personal-blocks), real stories for Plus/Pro, locked
   teaser with real match count for free users. Fail-safe: letter sends
   unchanged if blocks unavailable.
4. Indirect impact v1: same-industry stories flagged "påverkar din bransch";
   AI relevance check only on high-importance stories (cost control)
5. Onboarding upsell: after e-mail confirm → pick stocks + topics free →
   preview the personalized section with real stories → "aktivera med Plus"

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

- "Dagens mest marknadspåverkande nyheter": feed sorting by |reaction|;
  also feeds the evening letter
- Reaction measured at fixed windows (+1h, +1d) besides "since publish"
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
