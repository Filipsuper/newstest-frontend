# Continuous stock charts and optional company/session readers

9 September 2026. **Release candidate; charts and optional context readers only.
Producer activation is not included.** This candidate is not yet committed,
pushed or deployed and follows the separately released dependency-security patch.
It deploys the read-only chart API and compatible frontend/optional-context
readers, not new snapshot writers, baseline rebuilds, scheduled refreshes or data
collection. Absent or unverified company-context capsules remain unavailable;
this release does not promise new live price/RVOL coverage. Archived reaction
engines and replay data remain unchanged.

## Implemented components and release boundary

- Producer follow-up, **outside this release candidate**: an atomic
  `screener_current.companySessionSnapshot`, independent
  price/volume source times, exact previous-session close, explicit field states
  and coverage-aware RVOL baselines. Existing incremental updates cannot mix new
  prices into an older snapshot. A bounded stored-input-only refresh command
  defaults to dry-run; a two-minute service/timer is opt-in, not installed.
- Backend: one existing bounded lookup attaches optional `companyContext` to
  authorized stories, including all matched companies. Every field validates
  independently; each snapshot has a calendar-derived `validUntil` so retained
  data expires at the next exchange open. Authorization and ranking are unchanged.
- Frontend: pre-market stories can use previous close → current-session price
  without requiring an exact v2 minute baseline. During-session news keeps its
  valid fixed event return. Session RVOL is independently visible; event-window
  comparisons remain available in details. A company switch changes all metrics.
  Older stories never relabel today's price as their original outcome.
- Rows, reader and share images share metric selection. New observations refresh
  in place, not as new-news notifications.
- Updated after continuity feedback: the reader and OG use an independent,
  continuous **absolute stock-price chart**, not the sparse archived event curve.
  `GET /api/feed/news/:storyId/chart?symbol=…` first authorizes the canonical public
  story and validates company membership. It reads the first eligible XSTO session
  around publication: existing stream ticks while the full session is within the
  seven-day cache, otherwise one stored minute-candle source. The line connects
  real observations at their actual times; no fabricated prices or volume.
- Chart loading is on demand, bounded to 600 display points, cached/single-flight,
  and abortable on company changes. Fresh `asOf` cannot freshen the actual
  `observedAt` endpoint. Missing chart data never hides valid reaction/RVOL KPIs.
  Full-session date, price scale and source resolution are separate from the
  fixed reaction period. Earlier measurements stay in details without extra curves.
- **No extra tick archive, retention changes, provider calls or source writes**
  for these charts. Existing stored 1-minute candles can supply older charts;
  this does not promise complete historical coverage or persist new 5/15-minute
  aggregations. The saved +1/+5/+15/+60-minute reactions are outcomes, not candles.

Preview: `/designsystem/sessions` uses five **fictional**, fixed 9 September
examples, including pre-market, intraday, volume-only without v2, two companies,
and an older story. `/designsystem/reactions` retains existing v2 examples.
Both are gated off by default in production. Daily-context fixture timestamps
expire at the next verified open; historical stock charts remain valid. Browser
tests freeze the example clock.

Implementation checkouts:

- Frontend release candidate: `/private/tmp/omxsum-chart-release.Zx3dmZ/frontend`.
  Unrelated editorial/favicon work and superseded sparse-event chart changes
  remain outside this selective checkout.
- Producer: `/private/tmp/omxsum-session-context.O1Ap4L/stonks`, based on deployed
  producer `0b3f7bb`; details in its `docs/company-session-context-v1.md`.
- API: `/private/tmp/omxsum-session-context.O1Ap4L/newsbackend`, based on `8f03da8`
  (documentation above deployed `2c89137`); details in its
  `docs/news-company-session-context.md`.

Keep these changes isolated from the older dirty sibling checkouts during release.

## Continuous-chart revision verification

Scoped release candidate (9 September): **113 frontend unit tests, 132 Chromium
tests and 99 backend tests passed**. The clean frontend build and standalone
PNG/AVIF checks passed. Unlike the broader local-worktree counts below, this
candidate excludes editorial ranking, favicon and obsolete sparse-event-renderer
changes. Share-image URL expectations now use the central version constant.

Backend `bdc2809` passed isolated image checks and was released at 21:18 UTC.
Public checks verified 381 Freemelt points for 9 September and 251 Wyld points
for 8 September from `live_ticks`; Wyld's 28 August report returned 270 stored
minute-candle points through 17:30 Stockholm. Identity and timestamp ordering
passed; unrelated-company requests return 403. Indexed source reads and actual
chart responses were bounded and fast. These samples do not establish complete
market-wide coverage. Frontend traffic has not yet switched at this record.

The results below record the prior combined local implementation, not verification
of this narrower release candidate. The selective candidate must be rebuilt and
tested independently before deployment; its expected test counts exclude the
unreleased editorial/favicon work and superseded sparse-event geometry tests.

- Frontend: **137 unit tests passed**. Isolated production build and standalone
  PNG/AVIF → WebP checks passed. Final production-mode Chromium suite: **133 tests
  passed**, covering both themes, 320px/desktop, accessibility, no per-row chart
  fetching, canceled company requests, dated historical candles, independent
  reaction-window updates and OG output.
- Backend: **99 tests passed**, including 19 history-source/calendar cases and
  14 bounded route/cache cases, with an offline real Express route roundtrip.
  Coverage includes tick-cache expiry, source provenance, equal-timestamp
  conflicts and selecting the fullest single candle source without mixing arrays.
- Inspected desktop/mobile reader and share-image screenshots. The first browser
  run had two old-chart assertion failures; those tests and an after-hours
  fictional fixture were corrected before the final all-green run.
- No producer changes were needed for the chart revision. The prior producer
  validation below remains applicable. No real tick-coverage audit, production
  database access, collector change or deployment is claimed.

Current logs: `frontend-unit-continuous-final.log`,
`frontend-build-continuous.log`, `frontend-browser-continuous-final.log` under
`/private/tmp/omxsum-session-context.O1Ap4L/`. Companion API details are in
`newsbackend/docs/story-stock-chart.md` in that directory.

## Verification before the continuous-chart revision

- Producer: **779 tests passed** (69 focused provenance/refresh/writer checks).
- Backend: **66 tests passed**, including the bounded multi-company adapter.
- Frontend: **111 unit tests passed**. Final production-mode Chromium run:
  **131 tests passed**, including nine new session-context cases, 320px/desktop
  layouts, both themes, accessibility, company switching, expiry, independent
  volume and share images. These are the combined local-worktree tests, not a
  claim that unrelated unpublished editorial/favicon changes were released.
- Isolated `next build` passed without touching the active dev server's `.next`.
  The built standalone runtime passed trusted PNG/AVIF → WebP checks with patched
  libheif 1.23.2. Mobile/desktop previews and generated share images were visually
  inspected; daily quotes have no unrelated event curve or empty chart box.
- Actual Python-generated fictional input → Mongo projection → backend adapter →
  frontend selection passed. It produces +10% from 11 versus 10, cumulative 400
  shares, daily RVOL 0.4 and same-time RVOL 2, preserving observation timestamps.
- Review fixes cover partial updates overwriting valid volume, stale provider-time
  flags hiding a new price, another company's legacy percentage, retained session
  expiry and a legacy zero-percent share-image regression. The initial dev-mode
  suite was not green; the final production-mode suite passes all assertions.

Verification logs and screenshots are under
`/private/tmp/omxsum-session-context.O1Ap4L/`; the final browser log is
`frontend-browser-production-final.log`. No production requests for new provider
data, snapshot writes, timer changes or deployment were performed.

## Release candidate gates

1. Verify the selective diff, rebuild it and run its unit/browser/image checks.
   The release excludes editorial ranking, favicon artwork and producer activation.
2. Deploy the compatible read-only API before the frontend, capture rollback
   revisions and verify real story charts, company selection and share images.
   Existing missing-data states remain valid; no extra collection or archive is
   introduced. Keep fictional previews disabled in production.
3. Inspect actual `observedAt` values and source/session labels, not just HTTP
   health or fresh request timestamps. Do not claim complete historical charts
   or newly populated company-context/RVOL fields without a separate live audit.

## Separate producer activation gates — outside this release

1. Qualify the provenance-aware writers and rebuild the existing historical
   baseline profiles once with `screener-build --baselines-only`. Legacy profiles
   do not qualify as safe same-time denominators; daily RVOL remains independent.
2. Benchmark a full **read-only** capsule refresh using existing production
   inputs. Queries and batches are bounded, but unit tests do not establish VPS
   memory, index or runtime capacity. Actual production refresh cadence remains
   unconfirmed; the repository's documented nightly snapshot is insufficient.
3. After separate activation approval, deploy the qualified source revision and
   explicitly enable its refresh cadence. Capture rollback revisions and verify
   observation ages, not just HTTP health or newly written `computedAt` values.
4. Audit real coverage, company identity and missing/stale reasons across a broad
   sample, including Freemelt/Wyld. Do not promise complete volume coverage when
   the stored source has gaps or infer price causality from temporal association.

Historical backtesting still requires archived source snapshots, receipt times,
baseline membership and versioned methods. This mutable context is not that archive.

## Confirmed mechanisms

The read-only audit used the deployed-source backend `2c89137` and worker
`68138e1`, not the older, dirty sibling checkouts. The ordinary `newsbackend`
and `stonks` working directories do not currently represent those revisions.
Start implementation from the deployed revisions and preserve unrelated work.

1. `engine_v21.py` still supplies v2.2's measurement rules. Before-open stories
   require a prior-session minute-bar close within two minutes of session close;
   daily closes and live quotes are intentionally not fallback inputs. In a
   fictional 06:35 case, a final prior bar at 17:24 blocks the baseline despite
   valid current-session bars; changing that bar to 17:29 permits measurement.
   This demonstrates the mechanism, not a fresh live diagnosis of Freemelt.
2. `app/utils/reactionV2.js` selects fixed completed windows. A +1h result does
   not mean the latest move several hours into the session.
3. `StoryReader` chooses either `StoryReaction` or legacy `StoryVolume`.
   Therefore session RVOL can be present in `marketContext` but hidden by v2.
   News rows apply the same legacy-only volume restriction.
4. Backend `utils/storyMarketContext.js` accepts only one company and the same
   calendar day as publication. It drops the whole block without a volume ratio,
   and its projection omits price and previous close. It cannot cover the next
   trading session after evening/weekend news or company switching.
5. Missing minute bars become explicit chart gaps. Isolated observations render
   as invisible single SVG move commands. Strict event-volume windows need every
   minute; cumulative screener RVOL has different coverage requirements.

## First implementation boundary

Keep useful company/session context separate from reproducible event outcomes.
Do not weaken archived v2 sampling rules or substitute a daily move into a
fixed post-news percentage. Leave the current ranking contract unchanged.

### A. Fix provenance at the source

Use the existing screener inputs, but add field-specific timestamps and sources
before presenting them as fresh. `intraday_screener.py` currently prefers a quote
from the target date even when a newer bar exists, while its aggregate `dataAsOf`
can come from that newer bar. The selected price must have its own `priceAt`;
volume must have its own observation timestamp. Choose the latest eligible
completed observation without using unfinished bars.

Carry the actual previous-close row's session date and provider/source through
the snapshot. Validate it against the exchange calendar. Do not describe an
unverified provider close as an official exchange close, and do not hide an
unknown corporate-action/adjustment basis.

### B. Add a separate, versioned context contract

Attach a bounded per-company company/session context alongside `reactionV2`.
Include symbol/instrument identity, session date, observation scope, price,
previous close with its date/source, daily change, cumulative shares, daily RVOL,
same-time RVOL and baseline count/maturity. Give each field an availability
state and timestamp: missing price must not erase valid volume, or vice versa.

Reuse one authorized, bounded bulk lookup; no per-row provider fetching. Use the
real trading calendar for before-open, after-close, weekends, holidays and
half-days. Relate the story to its first eligible session explicitly; separately
label any current-session context for older stories. Never equate that current
session with the historic event's measurement period.

### C. Present matching data without increasing reader clutter

- Keep headline/AI summary first and reuse the existing shared components.
- Surface company/session figures even when an exact v2 window is unavailable.
  Labels such as `Aktien idag` and `RVOL vid samma tid` identify their scope.
- For pre-market news in its first session, previous close to the latest valid
  price supplies the expected daily view. During-session post-news reaction still
  uses an eligible pre-publication baseline, not the day's previous close.
- The independent chart must share the selected company and identify its own
  session and absolute price axis. It is not a percentage-return curve and must
  not imply the selected fixed measurement spans its whole trading day. Missing
  chart coverage need not suppress a valid standalone quote or volume figure.
- Preserve the shared company selector, fixed event-window details and source
  access. Rows, reader and share cards use the same metric selection contract.
- Connect stock-price observations continuously at real timestamps. This is
  display interpolation, not new observations. Missing trades/data must not
  become fabricated zero-volume candles or inputs to archived calculations.

### D. Protect historical research

Company/session context is a mutable live read model, not an as-known backtest
feature. Archive source snapshots, receipt times, baseline membership and method
versions before using it for historical strategy evaluation. Adding daily-close
or rolling measurements to the event engine requires a new calculation version
with archived inputs; existing v2.1/v2.2 results must replay unchanged.

## Acceptance cases

- 06:35 story, no valid prior close-proxy minute, but valid session close/price/
  volume: useful session context is visible; missing exact event data stays honest.
- Price-only, volume-only, missing baseline, real zero volume and stale/future
  timestamps remain distinct. A newer volume timestamp cannot freshen an old price.
- Company switching never borrows another instrument's data.
- Friday evening to Monday, exchange holidays, half-days and DST use the right
  session and previous close. Old stories never imply today's move is their outcome.
- Sparse stock-price observations form one continuous line; a single point stays
  a dot. No synthetic points or missing volume enter calculations.
- Same-version refreshes update observations without false new-news banners.
- Reader/feed/share agree on company, baseline, endpoint and metric scope.
- Fixed event calculations and archived replay stay unchanged.

Use Freemelt and Wyld as live acceptance examples after fictional contract tests,
then audit a broader story sample. Do not equate passing examples with complete
market coverage or evidence that a headline caused the observed trading.
