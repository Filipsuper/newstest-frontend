# Company research — section-by-section pass

25 September 2026. Local implementation on `codex/stock-page-polish`, based on the deployed company-research release. Backend coverage work has been deployed separately. This UI pass is not a new scoring or extraction system.

## Plan

| Section | Reader's question | Implementation |
| --- | --- | --- |
| Page structure | Where am I, and what can I explore next? | Keep continuous scrolling, sticky desktop contents and mobile contents sheet. Group desktop links by research task and add quiet next-section links. |
| Overview | What does this company do and what is happening? | Keep the flat price chart. Remove generic introductory copy; show a concise business description and available identity facts. Retain source/time and material news. |
| News | What happened, and how did the stock react? | Keep canonical news reader and real reaction labels. Add all-news / report filters over the loaded company stories with explicit counts, no new ranking or implied complete feed. |
| Profile | What stands out? | Preserve the centered six-axis diagram and report-evidenced risk/opportunity lists. Move the business description here from the news footer; keep sources collapsed. No generated risk claims. |
| Financials | Is the business growing, profitable and generating cash? | Retain revenue/EBIT/margin, cash-flow and net-debt waterfalls, earnings/cash-flow comparison and qualified segment/geography charts. Improve the transition into full statements, not their calculations. |
| Management | What does management say? | Reading-first summary, icon-led outlook/change lists, clear report period and AI label, original text and source one step away. No sentiment score. |
| Estimates | What might the next reporting period look like? | Actuals and qualified forecasts in bar charts for revenue, EBIT and EPS. Same consensus-first/model-fallback resolver as valuation; separate metric sources. Striped forecasts, precise fiscal period, no annualisation. Compact absence/failure states. |
| Valuation | How does the multiple compare with history? | Retain existing paired charts and metric control. Improve small-screen labels and accessible chart summaries. Avoid fair-value or target-price claims. |
| Insiders & owners | Who owns it, and who has traded? | Same-period buy/sell bars, selected 3/12-month summary, owner percentage bars with explicit capital/vote basis. Latest transactions first; reveal more in batches. Source definitions and person holdings remain available. |
| Short interest | What short positions are disclosed? | Clearly separate FI aggregate and named positions. Disclosed-position step chart independent of price history; dated holder bars, not an unexplained second price scale. Never label the aggregate all market shorting or infer small positions from mismatched dates. |
| Calendar | What should I watch next? | Upcoming dated agenda first, next report emphasized. Full month view becomes optional rather than the main content. Preserve original event types, fiscal periods and known dates; no invented confidence or reminders. |

## Acceptance

- Existing access gates, symbol matching, anchor/reader return and chart URL state preserved.
- Actual, forecast, reported and derived figures remain distinct; missing is never zero.
- No new provider calls per row; analytical fetches stay deferred, bounded and retryable.
- Shared foundation components, semantic colors, Geist and 44px touch targets.
- Document scroll only; test 320/390/820/1440px and both themes.
- Unit tests for new data adapters; browser tests for charts, filters, sources, retry, access and navigation; production build.
- Existing financial/profile/valuation regression tests remain part of validation.

## Backend dependencies deliberately deferred

Qualified report-extracted risks/opportunities, segment/geography delivery, richer consensus coverage, Nordic ownership/short-register support and stronger report extraction. Empty states must not masquerade as absence of economic risk.

## Delivered locally

All rows above have been addressed. The already-reviewed financial/profile/valuation
visuals are retained; the remaining research sections now follow their component,
spacing and progressive-disclosure patterns. No new dependency, entitlement,
forecast calculation or report-extraction feature is introduced.

- `CompanyPage` now composes separate estimates, ownership, short-interest and
  calendar components instead of four large tab implementations.
- Shared research pieces cover bounded requests, retry/loading states, compact
  statistics, percentage bars and legible two-line fiscal-period chart labels.
- Unsupported registers, missing observations, rejected company identities and
  failed requests have distinct states. Shorts no longer disappear when daily
  price history is absent.
- Existing financial and valuation data qualification remains the source of
  truth. The new charts do not increase underlying company coverage.

## Review entry points

The local preview uses **fictional test data**, not live company research:

- `/aktie/NORD.TEST#profile` — business profile and report-evidenced perspectives.
- `/aktie/NORD.TEST#financials` — existing financial visualisations and statements.
- `/aktie/NORD.TEST#management` — revised management reading hierarchy.
- `/aktie/NORD.TEST#insiders` — ownership, buy/sell summary and expandable trades.
- `/aktie/NORD.TEST#shorts` — disclosed-position history and holder comparison.
- `/aktie/NORD.TEST#calendar` — upcoming agenda and optional month grid.
- `/aktie/VALUE.TEST#estimates` — reported/forecast charts with mixed qualified
  consensus and model sources; `/aktie/VALUE-ANNUAL.TEST#valuation` shows annual
  forecasts alongside valuation.
- `/aktie/FREE.TEST` — unchanged public/Plus boundary.
- `/aktie/VALUE-FAIL.TEST#estimates` — retrieval failure, distinct from the
  successful empty estimate response at `/aktie/NORD.TEST#estimates`.

Run `node tests/fixtures/news-backend.mjs` on port 8100, and the frontend with
`API_URL=http://127.0.0.1:8100/api` and
`NEXT_PUBLIC_API_URL=http://127.0.0.1:8100/api` on port 3111. Use Node 22.
For an optimized preview, build with those values before `npm run start`.
**Rebuild with production configuration before any future deployment; do not
ship the fixture-configured local build.** The new UI is not pushed or deployed.

## Remaining product work

1. Review this version against a few real companies before public rollout;
   fixture tests demonstrate UI behavior, not provider coverage or extraction quality.
2. Finish the source-backed signals/report-extractor contracts already on the
   roadmap; only then expand report-derived risks, opportunities and key markets.
3. Continue qualified forecast-history recovery and immutable forecast revisions.
   Annual forecasts and EPS must not be synthesized from the existing quarterly model.

## Verification — 25 September 2026

- 247 unit tests passed (`npm test`).
- 58 browser checks passed against the optimized production build: company
  report, valuation, coverage fixes and the ten new research-section tests.
- An earlier broader development run passed all 71 checks, including the
  development-only segment/geography design-system examples.
- New sections checked at 320, 390, 820 and 1440px in light and dark themes, with
  automated WCAG A/AA checks and manual screenshot review. Keyboard disclosures,
  chart-query-preserving next-section links, retry, wrong-symbol and unsupported
  registry cases covered. This is not a claim of full assistive-technology audit.
- Production build and `git diff --check` passed. No production services or
  database records were changed by this UI pass.
- The running preview was also smoke-tested without API-response interception:
  ownership, short history and forecast data loaded from the fixture service;
  no browser runtime errors or failed local requests were observed.
