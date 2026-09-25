# Valuation UI and forward estimates

Status: first delivery deployed on 25 September 2026. See the
[release and live coverage record](company-research-release-2026-09-25.md).
The company-risk backend remains deferred.

## Delivered

- `/aktie` now uses `CompanyValuation` and shared controls, surfaces, typography,
  labels and loading/error states. Two coordinated charts replace the old
  full-width band and explanatory text blocks. Financial bars start at zero;
  estimates are hatched. Mobile stacks the panels and narrow controls wrap into
  two rows. Sources stay beside forecasts; calculations and source tables live
  in one disclosure.
- The adapter selects consensus first per metric/period/currency, preserves
  losses, rejects adjusted/scoped values and ambiguous EPS, and only uses the
  new qualified model contract. Consensus freshness is 90 days; model freshness
  is 30 days. Already reported targets are suppressed.
- The producer pins seven to eight consecutive same-currency reported quarters to new
  model records. Its authenticated estimates API allowlists model-only fields,
  compares those inputs with current financials, and withholds stale, revised,
  locked or wrong-company values. Manual Terminal estimates remain private.
  The website proxy distinguishes failed estimate reads from absence.
- Annual forward ratios require a dated price/capitalization and compatible
  annual denominator. Quarterly forecasts remain quarterly, without a ratio.
  There is no fabricated EPS or quarter-times-four extrapolation.
- Local examples: `/aktie/VALUE.TEST#valuation` (next-quarter model/consensus),
  `/aktie/VALUE-ANNUAL.TEST#valuation` (fictional annual contract example).
  Both require the local fixture server. Never deploy the fixture environment
  or treat these numbers as live company coverage.

### Rollout / remaining work

1. Completed: producer, backend, frontend and model worker deployed. The normal
   model refresh inspected 1,510 companies and wrote zero forecasts. All 27
   seven-quarter histories had missing or non-positive revenue. Legacy rows
   intentionally remain unpublished; no new qualified forecasts were available.
2. Retain/backfill usable history and remeasure coverage. Public
   qualification requires at least seven quarters and a latest input less than 180 days
   old. Input revisions require a fresh model run.
   Yahoo remains the default financial source. Missing Yahoo histories never
   borrow extracted report inputs. Seven quarters provide three year-on-year
   comparisons; eight provide four. The active audit found only 27 listings
   with seven stored quarters, before qualification: do not promise universal
   fallback coverage. Retain/backfill history independently of report extraction.
3. Expand the engine to full-year horizons and qualified EPS separately. It
   still forecasts one quarter; current consensus ingestion is also primarily
   quarterly. Annual examples demonstrate contract support, not a new model.
4. Add immutable forecast revisions before point-in-time backtesting. Existing
   model overwrite/lock behavior has not changed.

### Local verification (before deployment)

Frontend unit suite and production build passed. All 17 focused browser checks
passed against the production build: valuation controls, source precedence in
the UI, zero-baseline bars, 320/390/820/1440px layouts, both themes, accessibility,
retry, wrong-company rejection, existing navigation and Plus access boundaries.
The producer TypeScript check, model-input Python tests and public-projection
tests passed. The backend suite passed with its test-only OpenAI placeholder
key; seven added route tests cover success, absence, timeout, malformed/error
responses, identity mismatch and the public access boundary. No production
database refresh, live coverage claim, push or deployment was performed during
that local test phase. Subsequent deployment and refresh are recorded above.

## One section, two clearly different questions

- Historical valuation: how the selected multiple compares with the company's
  own reported annual history. One shared P/E / EV/EBIT / P/S / EV/S selector,
  compact latest/median/range figures and a historical chart. The middle-50%
  band is historical context, not fair value or a forecast interval.
- Forward valuation: what that multiple would be using a qualified future
  financial period and a stated price/capitalization snapshot. Keep a compact
  forward row beneath the chart, always visible when supported, rather than
  hiding it behind another tab or extending the historical line as a stock-price
  prediction. Show exact fiscal periods such as 2026E, never invent extra years.

The selected multiple controls both. Forecasts never enter the historical
median, range or percentile. Keep the full methodology and input table under
one Beräkning & underlag disclosure. Available periods are data-driven, not an
empty dropdown. On mobile, wrap the four metric controls into a 2×2 layout.

### Graph-led layout proposal

Use two coordinated, compact surfaces side by side on wide screens and stacked
on phones. The larger left chart is the selected historical multiple with a
quiet median/band. The right chart shows its financial denominator over actual
and qualified estimated periods: EPS for P/E, EBIT for EV/EBIT, revenue for P/S
and EV/S. Use grouped single-period bars, solid for reported values and a
distinct striped estimate treatment, with values/units visible. Period source
labels distinguish consensus from OMXsum model values; color alone is not enough.

Below the financial bars, show the corresponding forward multiples by exact
fiscal period, with the price/enterprise-value assumption. Keep source and
formula details expandable. Do not add a decorative price-target curve or
unsupported uncertainty band. The inline design example uses fictional annual
forecasts to demonstrate this future layout; it does not establish current
annual-model capability. With only a qualified next-quarter estimate, the
production UI must use quarter-labelled financial bars and omit annual multiples.

## Source preference requested by the user

For the same company, metric definition, reporting currency and fiscal period:

1. Use a qualified, current consensus estimate.
2. If that metric/period lacks usable consensus, use a qualified OMXsum model
   estimate with a visible OMXsum-estimat label.
3. Otherwise show unavailable. Do not fabricate an estimate in the browser.

Keep source and snapshot date per value. Never average model and consensus or
give a mixed-origin row a blanket Konsensus label. A valid consensus loss is
not missing data: preserve it and mark P/E as not meaningful, rather than
substituting a more positive model output. An upstream request failure does
not prove consensus is absent; distinguish that state. Manual Terminal
estimates must not enter the public fallback.

Show simple Konsensus / OMXsum-estimat labels and fiscal period in the resting
UI. Publisher, contributor count when supplied, refresh date, model method,
coverage and assumptions belong in details. Do not invent confidence bands or
describe the current statistical baseline as analyst research or AI judgement.

## Verified code and current limitations

- `../producer/stonks/house_estimates.py` already calculates the next
  unreported quarter's revenue, EBIT, EBITDA and net income. Revenue uses last
  year's same quarter and median recent year-on-year growth; profit metrics
  use a blend of seasonal and recent margins. It requires historical inputs.
  This is a seasonal extrapolation, not a multi-year forecast engine.
- The internal `../producer/web/app/api/financials/route.ts` exposes a model
  estimate, but the public v1 instrument-estimates route previously returned
  consensus snapshots and revisions only. The website's backend consumes that
  public v1 route. This delivery adds a qualified model-only API extension; do not
  expose the internal endpoint wholesale because it also serves manual values.
- Stored model records need qualified currency, input provenance/periods,
  version, freshness and exact-company matching before public use. Inspect real
  coverage before claiming that every company has a fallback.
- The model does not currently supply forecast EPS, annual forecasts or a
  complete next-twelve-month denominator. One quarterly forecast cannot be
  multiplied by four and called a forward annual multiple.
- Existing valuation uses annual reported figures and an assumed publication
  lag. Label this basis honestly; do not claim verified publication dates or
  use it as proof of point-in-time backtest accuracy.

## Smallest honest first delivery

1. Build the shared historical valuation panel and explicit forecast contract.
2. Add a bounded, authenticated upstream model-only read through the existing
   member API, retaining access rules. Resolve source precedence by metric and
   period, with actual-versus-forecast lifecycle checks and freshness reasons.
3. Display available next-quarter expectations with their source/period. Where
   only quarterly figures exist, show the financial forecast, not annual P/E.
4. Enable forward annual multiples only with a complete qualified denominator:
   a supplied annual estimate, or an explicitly labelled annual combination of
   reported quarters plus estimates for every remaining quarter. Extending the
   OMXsum model to all remaining fiscal quarters is a separate, small forecasting
   work item—not part of the deferred company-risk service. Preserve seasonality;
   do not recursively treat predicted quarters as reported observations.

Forward P/E additionally needs compatible forecast EPS or attributable earnings
and an explicit share-count basis. Group net income divided by an arbitrary
share count is not automatically diluted EPS. EV-based forward metrics use a
dated capitalization/net-debt assumption; do not imply forecast debt or future
share prices. Currency, reported/adjusted definitions and period lengths must
match. Negative/zero earnings and unsupported financial sectors need explicit
not-meaningful states, not zero multiples.

## Verification

Test consensus-only, model-only, mixed metric availability, valid consensus
losses, upstream failure, stale snapshots, reported-period suppression, missing
currency, adjusted-versus-reported mismatches, incomplete annual periods and
manual-row exclusion. Verify mobile controls, source labels, keyboard interaction,
retry, both themes and that forecasts cannot alter historical statistics.

Any later historical forecast comparisons require immutable as-of snapshots.
Current unlocked house-model rows are overwritten on refresh; locking them once
actuals exist does not preserve the full revision history or prove the last
forecast preceded publication.
