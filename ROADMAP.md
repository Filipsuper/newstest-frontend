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

### 1. Personalized letters (the big paid feature)

**Architecture: composable letter blocks — not one AI letter per user.**

- Base block = today's shared morning letter (unchanged, stays great & free)
- "Dina aktier" block: wire stories matched against the user's watchlist,
  summarized once per story (cached), assembled per user
- Topic blocks: smallcap / large cap / medtech / … mapped from the stocks
  collection (`segment`, `sector`, `industry`) — user model already has a
  `topics` field
- One email per user per day (base + their blocks). Cost ≈ one small
  completion per user; story summaries shared across users.

**Steps:**
1. Watchlist model (`user.watchlist: [symbol]`, cap per tier) + API
2. Watchlist UI: star on stock pages, "Mina aktier" page, picker in onboarding
3. Letter composer in the letter job: fetch per-user blocks, render email
4. Indirect impact v1: same-industry stories flagged "påverkar din bransch";
   AI relevance check only on high-importance stories (cost control)
5. Onboarding upsell: after e-mail confirm → pick stocks + topics free →
   preview the personalized section with real stories → "aktivera med Plus"

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
