# News attention, volume and reaction-data audit

8 September 2026. Implemented locally, **not deployed**. Requires the frontend
and `newsbackend` changes together for volume enrichment; older APIs remain
readable without the optional fields. No Terminal/collector edits, manual
production database changes, account changes, commits or deployments were performed.

## Current ranking

Editorial importance minus the existing freshness/follow-up/context penalties,
plus a bounded market-attention bonus. Routine insiders and administrative
notices stay excluded. This replaces the first price-independent local iteration.

- One explicitly associated company and a finite, post-publication reaction
  timestamp are required. Missing signals add zero, not a negative score.
- Prefer the reported completed +1h window, then +15m, within the regular
  Stockholm session. Use `2 × abs(returnPct)`, capped at 12 points. Do not choose
  whichever reaction period is largest. The source still lacks per-window
  baseline/endpoint provenance; these are reported observations, not independently
  quality-certified measurements.
- If those windows are absent, a same-day rolling return spanning at most four
  hours can contribute up to six points, only when its quote is at most 15 minutes
  old. Multi-day, missing-time and future observations do not qualify.
- With at least 1% observed movement, an exact same-story/company/publication/
  session volume context, a snapshot at most 15 minutes old and turnover of at
  least SEK 1m, add `min(8, 4 × log2(ratio))` above a ratio of 1.
- Prefer RVOL at time with a mature baseline of at least 20 prior sessions.
  Use daily RVOL only as a fallback at/after session close. Never add both.
- Total market-attention bonus is capped at 20. These starting weights and
  liquidity/freshness cutoffs are editorial heuristics, not validated predictions.

News without market data can still qualify on editorial importance. Company-wide
session volume indicates attention, not volume attributable to one headline.

## Volume contract and UI

`newsbackend/utils/storyMarketContext.js` enriches only stories already selected
and authorized upstream, with one bounded `screener_current` lookup per response.
It exposes a small whitelist, not raw screener documents or additional stories.
At most 200 company symbols are queried; optional-query errors leave news readable.

`marketContext` carries story ID, single company symbol, publication time,
session date, observation time, scope `session_context`, daily RVOL, RVOL at time,
turnover and baseline maturity/count. Multiple-company stories and different-day
snapshots are deliberately not enriched. The frontend rechecks this association.
This contract does not pretend to be a per-event volume attribution model.

The underlying collector's methods are:

| Measure | Numerator | Reference |
| --- | --- | --- |
| Daily RVOL | Today's cumulative shares so far | Average volume of 20 completed daily sessions |
| RVOL at time | Today's cumulative shares so far | Median cumulative volume at the same session minute |
| Before/after comparison | Shares in 30 complete minutes after publication | Shares in 30 complete minutes before publication |

Time-adjusted RVOL is provisional with fewer than 20 prior intraday sessions.
The production source supplies a distinct maturity flag. Daily RVOL must not
be described as a completed day's ratio while the current session is still open.
For the general time-adjusted concept see [TradingView's methodology](https://www.tradingview.com/support/solutions/43000705489-relative-volume-at-time/);
OMXsum uses its own median-based implementation, not TradingView data/formulas.

Rows show one quiet mature time-adjusted volume label. The reader's
`Handelsvolym` details show both RVOL methods, their observation time and
provisional status, then the separate before/after comparison.

The before/after calculation reads at most 62 minute bars on a single detail
request, bounded to those windows. It excludes the candle straddling publication,
requires all 30 explicit minute observations on each side, and never converts
missing candles to zero. A zero pre-window yields no ratio, not infinity. Pending,
outside-session, incomplete-coverage and source-error states remain distinct.
It does not bridge overnight/weekend windows or claim causal volume attribution.
It is detail-only and does not generate another per-row query or ranking bonus.

`Uppdatera data` reloads reader observations. Browser fetches no longer force
cached detail; recent backend detail snapshots cache for 60 seconds rather than
five minutes. Older detail remains cached for one hour. On Marknaden, same-version
observations can refresh without accepting new text or rearranging visible rows;
pure selection changes use `Uppdatera urval`, not a new-news count. Full-feed SSE
quote refresh behavior is not redesigned in this pass.

## How prices currently reach news

```text
Story's first company + publication time
  → latest stored minute close before publication (daily-close fallback)
  → latest live quote or minute close; fixed +1m/+5m/+15m/+1h/+24h cutoffs
  → Market API reaction + optional minute-based reactionSeries
  → newsbackend response/cache
  → row's rolling percentage / reader's chart and fixed-window details
```

Inspected functions in `stonks/web/app/api/v1/[[...path]]/route.ts`:
`storyBaseline`, `windowPrice`, `storyWindows`, `attachReactions`, `reactionSeries`.
That checkout contains unrelated work in progress; it was inspected only, not
edited or treated as a newly deployed release.

Confirmed code risks to address next:

1. **Identity:** only the first company supplies the reaction. No per-company
   reaction map or measurement-symbol field accompanies the result.
2. **Baseline provenance:** the minute baseline has no age bound; daily fallback
   is not disclosed to the frontend. Cached baselines include missing results,
   which can remain missing until process/cache reset even if data arrives later.
3. **Bar timing:** a minute's timestamp may mark its start, while its close belongs
   later. Selecting `ts < publishedAt` can use a candle that straddles publication.
   Confirm stored timestamp semantics before defining a corrected baseline.
4. **Fixed windows:** calendar-time cutoffs, minute lookup and daily fallbacks do
   not expose actual endpoint time/source or gap tolerance. An available number
   is not proof of a precisely sampled +15m reaction. Cached values can preserve
   a fallback even after better observations arrive.
5. **Chart range:** the series queries publication −30m to +4h using minute bars
   and requires three points. After-close news can have no next-session trades
   in that wall-clock range. Older stories can also outlive retained minute data.
6. **Frontend freshness:** rows used only rolling `pct`; fixed windows were hidden
   in reader details. Accepted dashboard snapshots could freeze observations until
   a content update was accepted. This pass updates dashboard observations and
   adds explicit reader refresh; it does not repair underlying bars/baselines.
7. **Interpretation:** rolling returns can span several sessions; corporate actions,
   unrelated announcements and thin trading can distort an apparent reaction.
   The existing response has no baseline-quality/corporate-action flags to filter.

## Live public evidence (bounded, read-only)

Snapshot `/api/feed/market-overview`, generated **2026-09-08T14:03:14.276Z**
(16:03 Stockholm): 100 regular +12 mover rows, **107 unique story IDs**.

- 49 unique stories were published on 8 September.
- 47 of those 49 had a rolling reaction, but **zero had +15m or +1h values**.
- Among the 12 mover rows, 11 had RVOL at time and all 12 had daily RVOL.

Additional public detail responses for Heba
(`story_dc2a0f3e9fea6af7d65d3a6965cdd0d5`) and Prisma
(`story_f290dbcc3d577f86576a583806512f1a`) had rolling/tick reactions but null
minute-window values and null `reactionSeries`. The previous evening's Provide IT
report (`story_bd1e55ffee4c7381c4d1a842996c4f16`) had neither a reaction nor a series.

This confirms missing data before rendering. The exact reason for each missing
field still needs collector/bar-freshness and baseline-store diagnostics; the
public payload alone cannot establish which source/query failed. Prisma's public
company intraday response separately returned 40 current-session points, while
the news response had no series. The company bars route calls `ensureMinuteBars`;
the news-series query does not. Different retrieval/refresh paths and caches
therefore need to be reconciled, not simply treated as identical data sources.
This later response alone does not establish the earlier database contents.
A stricter
complete-window volume comparison will also remain unavailable where minute data
is missing. Do not market it as universal coverage.

## Next discussion / implementation boundary

Agree on trading-time semantics before rebuilding the reaction engine:
an explicit measurement company; last valid pre-event trade with source/time/age;
next-open handling for out-of-hours stories; fixed windows with actual endpoints
and coverage; separate rolling session context; and missing/pending/stale states.
Investigate why current-day minute windows are absent before changing chart design.
Persist auditable event windows so historical observations do not depend on a
short-lived minute cache. Add corporate-action flags before treating large
unadjusted moves as reliable attention signals.

## Local verification

- 59 frontend and 37 backend unit tests passed, including exact context matching,
  bonus caps, missing/stale observations, volume-window completeness and a stalled
  optional DB lookup. Backend syntax and both worktree whitespace checks passed.
- Isolated production build passed without sharing the development `.next`.
- 48 Chromium checks passed across volume, newsroom, mobile workspace, landing,
  stock discovery and site metadata. Native 320px/1440px light/dark volume views
  were captured and inspected. Ranking-only changes wait for `Uppdatera urval`;
  same-version volume/quote changes do not raise a new-news count.
- Fixtures use fictional companies/data, not production accounts. These checks
  validate behavior and calculation contracts, not live completeness of minute
  volume data. A live release still needs separate approval and verification.
