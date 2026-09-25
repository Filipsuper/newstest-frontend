# Company signals: proposed backend v1

Status: proposal, 25 September 2026. The perimeter labels are implemented locally;
the rule system below is not implemented or enabled. Current local Risker /
Möjligheter examples are fictional report excerpts, not calculated findings.

## Product decision

Build a small, deterministic company-signals service in Stonks, beside the
existing company-profile calculation. Reuse qualified facts, not radar scores.
One named rule produces one explainable finding; AI does not decide whether a
numerical threshold was crossed. No new database or separate scoring vendor.

Keep two explicit kinds of evidence:

- `calculated`: losses, liquidity, cash conversion, leverage, dilution and
  volatility, calculated from timestamped financial/market facts.
- `report_excerpt`: management's statements about customer concentration,
  markets, supply chains or opportunities, linked to a specific report page.

Report statements are attributed statements, not independently verified
predictions. Neither kind is a buy/sell recommendation. Absence of flags is
not proof that a company is safe.

## What exists and what must change

Inspected locally:

- `../producer/web/lib/company-profile.ts`: named checks, thresholds, nullable
  results and six axes already exist. It reads financial periods, valuation,
  insider transactions, ownership, shorting and dividends. This is a useful
  starting point, not a ready risk catalogue.
- Some current checks combine latest annual and TTM fallbacks. The health
  denominator can fall back from EBITDA to EBIT; source descriptions are broad
  strings and some displayed amounts assume SEK. New public signals must use
  qualified periods, actual reporting currency and exact metric definitions.
- The current shorting check treats an absent aggregate as a positive outcome.
  Missing Nordic registry coverage must not become either a positive signal or
  a risk. Do not reuse that interpretation in this service.
- `../producer/stonks/report_financials.py`: extraction targets include cash,
  net income, operating/free cash flow, debt, EBITDA and period-end shares.
  Having a field definition does not establish accurate coverage for every issuer.
- `../producer/stonks/nordic_prices.py`: daily adjusted-close and split metadata
  are present in the Nordic collector. Cross-market adjustment quality and
  daily coverage still require validation before volatility signals.
- `../backend/routes/feed.js`: the public profile projection returns only
  symbol/version/coverage/axis scores, with a six-hour cache. It intentionally
  omits checks. Add an explicit public signals projection; never spread the
  internal research payload or treat cache age as source freshness.

## First catalogue

The thresholds below are starting hypotheses for review, not deployed policy.
Rules have their own applicability and completeness checks; banks, insurers,
investment companies and property businesses need sector-specific treatment.

| Category | Reader-facing finding | Required calculation / gate |
| --- | --- | --- |
| Profitability | Förlust de senaste 12 månaderna | Negative consolidated net income for four complete, non-overlapping fiscal quarters. An annual fallback must say the actual fiscal year, not “senaste 12 månaderna”. |
| Cash generation | Negativt operativt kassaflöde | Same qualified annual/TTM window; preserve currency and cash-flow definition. Positive cash generation can be a strength, not an automatic growth forecast. |
| Liquidity | Kassa motsvarande cirka X månaders historisk förbrukning | Usable cash at the window end divided by monthly historical negative FCF. FCF must reconcile to operating cash flow less capex. No operating-CF substitution under the same rule ID. Proposed flag below 12 months. No result for positive FCF; do not call it infinite runway. |
| Cash conversion | Kassaflödet är svagt i förhållande till vinsten | Positive, material net income and OCF from the same complete window. Candidate OCF/net income threshold below 0.5, with materiality and repeated-period review before launch. Do not divide by losses or near-zero profit. |
| Leverage | Nettoskuld på X gånger EBITDA | Same-date cash/debt and verified annual/TTM EBITDA. Never substitute EBIT; nonpositive EBITDA makes this ratio unavailable. Candidate threshold above 3× only for eligible non-financial operating companies. |
| Dilution | Antalet utestående aktier har ökat X % på ett år | Comparable point-in-time outstanding ordinary shares, split-adjusted, with consistent share-class/treasury scope. Not weighted-average EPS shares or potential convertible dilution. Candidate threshold above 10%, pending calibration. |
| Volatility | Stora kurssvängningar de senaste tre månaderna | Daily returns over roughly 63 exchange sessions, validated corporate-action adjustment, sufficient real observations and liquidity. Benchmark and threshold must be calibrated; a split or stale price must not create a warning. |

These are not seven independent warnings to show at once. Short runway can
subsume a negative-FCF flag; sustained losses and cash conversion need separate
applicability. Deduplicate overlapping evidence and avoid double-counting it.

Runway is a scenario based on historical burn, not a prediction of insolvency.
Restricted cash, seasonal cash flow, acquisitions and financing after the report
date can invalidate the estimate. Keep it dated and suppress it when a known
material cash event makes the balance obsolete; do not silently update cash
using an unverified amount extracted from a headline.

“High non-cash earnings” needs identified non-cash gains / unusual items from
the accounts, including their signs and earnings impact. A gap between net
income and operating cash flow alone cannot support that claim: working-capital
timing can explain it. Ship cash conversion first and add unusual-item rules
when the extractor supplies qualified item-level evidence.

## Facts and output contract

Normalize facts once, with strict company/issuer identity, consolidated scope,
metric definition, value/unit/currency, fiscal start/end, duration versus
point-in-time basis, reported/derived basis, and exact source references.
Quarter derivation from cumulative YTD values needs explicit lineage. Do not
mix standalone quarters, YTD totals, currencies or report revisions in TTM.

Each evaluation should include:

- Stable `ruleId`, `ruleVersion`, category, applicability and named threshold.
- `status`: `triggered`, `not_triggered`, `insufficient_data`, `stale`, or
  `not_applicable`. Unknown input never means a passing check.
- A translation key with typed parameters, not opaque AI-written conclusions.
- Exact inputs, calculation, result, units and measurement period.
- Source report ID/revision/hash/page (or market-series version), source
  publication time, first-observed time, calculation time and quality reasons.
- `kind: calculated | report_excerpt`, polarity and independently defined
  priority. Do not derive severity from the radar's average color.

The frontend formats the approved result; it does not recalculate it. Use the
same evaluation for the compact list and its expanded calculation. An upstream
failure retains a visibly dated snapshot or shows unavailable, never silently
turns into “no risks”. Coverage belongs to this rule catalogue, not the radar's
existing percentage of evaluable checks.

## Storage and refresh

Use the existing Stonks MongoDB database with a latest projection and append-only
evaluation history. Idempotency comes from issuer/rule version/input versions.
Recompute affected financial rules on accepted report revisions or material
fact updates, and market rules after a verified exchange close. Refresh stale
status even when no new report arrives. Public delivery is a bounded per-company
request with an allowlisted schema and source-aware cache invalidation.

Keep reporting period, published-at, observed-at and evaluated-at separate.
Preserve the exact input snapshot so future backtests can reconstruct what was
known then. A report correction creates a new evaluation; it must not rewrite
the original historical result or claim it was known on the fiscal period end.
Historical calculations without known-at evidence are research reconstructions,
not point-in-time backtest data.

## UI

Retain the clean Risker / Möjligheter lists. For quantitative positives, consider
the more factual heading Styrkor; do not describe positive historical results as
future opportunities. Show at most three distinct material findings per side,
with “Visa alla” for depth and no quota requiring fabricated positive content.

A row states one fact and its relevant period/value. Keep citations out of
resting rows. A single disclosure exposes each finding's kind, exact calculation,
threshold, report date and source page. Keep report excerpts visually distinct
from calculated findings inside that detail. No red/yellow severity scale until
its meaning is defined and tested. Missing coverage gets a concise disclosure,
not a green “no risks” badge.

Later, retain changes between versions: “Kassaflödet blev positivt i Q2” links to
the report/news event and the relevant financial chart. This connects the stock
profile to OMXsum's news strength. A news association is not proof of price
causality, and following a company is not automatic email-alert consent.

## Delivery order and acceptance

1. Audit a small, mixed issuer sample and qualify period, currency, provenance
   and missing-data handling. Keep this read-only; extraction coverage is not
   established by the NORD.TEST fixture.
2. Build the fact adapter, typed catalogue and pure evaluators. Start with
   profitability and cash generation, then qualified net cash / debt. Run in
   shadow mode and review every flagged example against issuer reports.
3. Add stable latest/history persistence and the intentional public projection.
   Test revisions, duplicate jobs, stale inputs and exact-company matching.
4. Integrate one bounded signals request into Bolagsprofil, preserving current
   public access. Test source disclosure, unknown/partial coverage and mobile.
   Roll out a reviewed pilot before expanding company coverage.
5. Add runway, cash conversion, dilution and volatility only as their input
   gates pass. Later add report-specific risks/opportunities and change tracking.

Required tests include exact threshold boundaries, missing versus zero,
negative/near-zero denominators, currency/unit mismatches, financial-sector
exclusions, non-calendar fiscal years, incomplete/overlapping quarters, YTD
normalization, revised reports, split-only share changes, genuine issuance,
missing/stale trading days, post-report financing and point-in-time replay.

## Reference, not a copied model

Simply Wall St documents named checks, including cash runway and share-count
changes, with different health checks for financial institutions. That supports
the catalogue approach, not copying its labels, thresholds or scores wholesale:

- [Financial health methodology](https://support.simplywall.st/hc/en-us/articles/9812782597135-Understanding-The-Financial-Health-Section)
- [Management and ownership methodology](https://support.simplywall.st/hc/en-us/articles/8787431138831-Understanding-The-Management-and-Ownership-Sections)
- [Past performance and earnings quality](https://support.simplywall.st/hc/en-us/articles/9092894930831-Understanding-The-Past-Performance-Section)
