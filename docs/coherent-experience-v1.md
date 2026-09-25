# Coherent experience v1 — 24 September 2026

Deployed on 25 September 2026; see the
[release and validation record](company-research-release-2026-09-25.md).
Preserve the public design system, navigation,
server-resolved memberships and separate Terminal. This follows the approved
23 September product/UX audit; it is the first implementation slice, not completion
of the full retention/report-extraction roadmap.

## Delivered

- Personal site feed scans real Market API cursors through its 48-hour window,
  with 200-row pages, a 25-page cap and a 12-second candidate deadline. Caps,
  failures and cursor errors explicitly produce partial coverage. Complete scans
  cache for three minutes, partial scans for 15 seconds, with shared in-flight
  requests. Filtering is server-side before a 20-row UI page limit.
- Existing legacy reaction fallback is fetched only for selected rows in batches
  of at most 20, bounded to four seconds, then V2/context enrichment runs. Version,
  publication time and primary company must match; metric failures retain news.
- Feed order is chronological; the site shows explicit interests only. The
  newsletter retains its separate relevance ordering and indirect-industry block.
  Its candidate window also follows source cursors. Keywords use the same lexical
  matcher. Company alert selection/delivery policy is unchanged.
- Keywords normalize Unicode/punctuation. Short terms match tokens; a standalone
  term of four or more characters may match a word prefix for Swedish compounds.
  Phrases use exact adjacent normalized tokens. No translation, AI-only or full-body
  matching is implied. Returned matches include the matched headline/summary field.
- Feed cursors use publication time and ID, preserving equal-time stories. Older
  pages pause polling; resuming refreshes the first page. Since-last-visit remains
  local-device context, not cross-device unread state.
- One email editor owns optional delivery, level, company exceptions and quiet
  hours. Settings opens that editor. Explicit save, revision-conflict handling,
  entitlement/verification/suppression fences remain. A dirty dialog must be
  continued or explicitly discarded; closing never opts anyone in.
- Overview personal preview retains counts and edit/full-feed links, without
  the duplicate email CTA.
- Company research groups Resultat (revenue, EBIT, margin), Kassaflöde and
  Finansiell ställning into three compact surfaces. Kvartal / År is shared by all
  charts and the statement, defaulting to available quarterly actuals. The latest
  period is text, not a dropdown. Revenue/EBIT share grouped bars on one amount
  axis, with a fixed EBIT-margin line on a separate percentage axis; no margin
  switch. Net margin remains in source/statement detail and uses actual net
  income. Missing margin inputs break the line rather than becoming zero.
  growth compares the same fiscal quarter/year, with no ratio for absent,
  zero or negative baselines. R12 stays available inside statement detail.
  Cash flow uses a same-period operating-flow → capex → free-cash-flow waterfall,
  with free cash flow and comparable growth above it; history is expandable.
  All three finite values must reconcile (floating-point noise only). Missing
  and non-reconciling inputs keep available values, without fabricated deductions.
  Finansiell ställning leads with net debt/net cash and reuses Kassaflöde's
  three-step vertical waterfall. Signed net-debt history is expandable under
  Historik och beräkning. Source totals are retained when components are
  missing or inconsistent; only reconciled/fully calculable periods enter the
  history. Calculation detail separates exact source and derived amounts and
  explains the cash definition, including possible short-term investments.
  A compact Vinst och kassaflöde chart below the waterfalls compares net income
  with operating cash flow using the same grouped-bar renderer and period switch.
  It requires at least one paired period; missing values, zeros and losses stay
  distinct. Exact source-table columns are deduplicated across chart groups.
  Missing fields are not zero;
  different currencies and estimates are not combined. A source table and the
  complete statement remain available. Existing public financial highlights keep
  their own source attribution and access boundary, without duplication above
  an available paid overview.
- Bolagsprofil is an always-expanded public section between news and financials,
  with an anchor, shared radar, six scores, perspective labels and coverage.
  Methodology remains expandable. The public API only returns scores/coverage,
  not underlying research checks; this change preserves that contract.
  Loading is deferred until nearby;
  failed requests have a retry and missing data does not become a zero score.
- VD-ord is its own company anchor, with period/date, labelled AI summary,
  existing outlook/changes, expandable original text, source link and PDF pages.
  No new generated facts, key-figure tiles or fabricated comparisons. Missing,
  processing, extraction failure and membership states are distinguished.

## Deployment boundary

Release the additive backend contract first (`coverage`, `nextCursor`, `filter`,
`cursor`, `after`, company-resource `availability`), then the frontend. Frontend
controls remain usable with absent optional fields, but complete personal
pagination requires the backend. No new MongoDB collection, provider, production
credential, mail recipient, consent scope or sender activation is introduced.

The source-body keyword index, live matching qualification, broader email scope,
numerical-meaning news safeguards, extractor improvements and report-derived key
markets/risks remain separate work. Existing AI summaries are not certified as
accurate merely by this UI update.

## Verification

Use backend unit tests for cursor exhaustion, repeated/missing cursors, deadlines,
partial failures, keywords, exact-version retention and filter-before-limit.
Use frontend unit tests and fictional-account browser tests for save/discard,
quiet hours, conflict recovery, pagination, source links, paid access, mobile
overflow and accessibility. Browser fixtures never send mail or write real users.
Build and live qualification results must be recorded separately; local fixtures
are not evidence of current production coverage.

### Local results

- Frontend unit suite: 175 passed.
- Backend unit suite: 366 passed, two existing integration tests skipped.
- Production Next.js build: passed.
- Targeted Chromium suites: 61 passed against the production build. Includes
  320/390/820/1440px layouts, light/dark controls, automated accessibility,
  company anchor navigation, matching filters/paging, and no silent email writes.
- Inspected fictional financial/VD-ord screenshots on phone and desktop.

The development-server trial exposed test expectations for the old layout and
reload-related failures. Updated assertions and a production-server rerun passed;
the production build avoids development hot-reload state during verification.

### Compact financial overview follow-up

- Frontend unit suite: 179 passed, including fiscal-year/quarter comparisons,
  missing and nonpositive baselines, currency/frequency separation and sorting.
- Production Next.js build: passed.
- Company-page Chromium suite: 12 passed against the production build,
  including 320/390/820/1440px, both themes, accessibility, shared quarter/year
  switching, source tables, R12 detail, paid boundaries and section navigation.
- Visually checked compact charts on desktop and phone. No deployment.

### Cash-flow waterfall follow-up

- Frontend unit suite: 183 passed. Covers both capex sign conventions,
  floating-point reconciliation, missing/estimated inputs, negative and zero
  cash flows, and year-over-year free-cash-flow comparisons.
- Production build and 16 company-page Chromium tests passed. Includes waterfall
  rendering, quarter/year switching, expandable history, source links, honest
  missing/mismatch fallbacks, mobile layouts, both themes and accessibility.
- Preview uses fictional data only. No extractor, provider, backend or production
  data changes; no deployment.

### Combined result chart and open company profile

- Frontend unit suite: 187 passed. Added exact same-period net-margin derivation,
  missing/zero/negative input handling, comparable margin changes and bounded
  profile transport with distinct missing/failure outcomes.
- Production build and 22 company-page Chromium tests passed. Includes grouped
  revenue/EBIT bars, one selectable margin line, missing net income, shared
  quarter/year changes, source tables, public profile access, loading/retry,
  wrong-company responses, section anchors and existing cash-flow behavior.
- Both themes and 320/390/820/1440px layouts passed automated accessibility and
  overflow checks. Visually inspected the combined chart and open profile.
- The missing-margin browser case initially lacked financial history in the
  fictional API allowlist. Corrected the fixture and reran all 22 tests.
- Public profile scores/coverage remain unchanged; no underlying private checks
  are exposed. No backend/provider/extractor changes in this follow-up. Local
  preview remains fictional, and nothing has been deployed.

### Fixed EBIT margin follow-up

- Removed the EBIT/net-margin switch. The combined result chart and KPI always
  show EBIT margin; net margin remains in source/statement detail. The shared
  quarter/year control is unchanged.
- 187 unit tests and five targeted Chromium tests passed against the local dev
  server, covering 320/390/820/1440px, both themes, accessibility, quarter/year
  switching and EBIT-margin independence from missing net income.
- Finansiell ställning remains unchanged pending the proposed net-debt/net-cash
  breakdown. Before implementation, reconcile cash/debt/declared net debt and
  make the cash definition explicit (Yahoo may include short-term investments).
  Any leverage ratio needs a verified full-year/R12 denominator, not quarter
  EBITDA. No deployment.

### Net-debt / net-cash follow-up

- Replaced the separate cash/debt history bars with a Nettoskuld/Nettokassa
  headline, two compact subtraction bars, and signed net-debt history with an
  explicit zero tick. Reversing the subtraction for net cash keeps the headline
  positive without changing the signed history definition.
- Same-period finite, nonnegative components are required. A supplied total
  must reconcile (floating-point noise only); inconsistent or incomplete inputs
  keep their source value without a fabricated breakdown/history point. Source
  and calculated totals are separate in the exact-value table and disclosure.
- Net debt/EBITDA is deliberately not added: validate its full-year/R12 basis
  before using it. No provider, API, extractor or production-data changes.
- 192 frontend unit tests, the production build, and all 30 company-page
  Chromium tests passed. Coverage includes net cash/debt, all-zero history,
  missing/invalid components, source-only and conflicting totals, history gaps,
  quarter/year switching, public/paid boundaries, both themes and
  320/390/820/1440px layouts. Visually checked phone and desktop.
- The first accessibility pass caught nested definition-list grouping in the
  breakdown. Fixed the semantic structure and reran the complete suite cleanly.
- Preview data is fictional. Nothing has been deployed.

Suggested next visualization: reported diluted EPS with share-count context,
after qualifying split adjustments and coverage. Do not derive EPS from ending
shares. Earnings-versus-operating-cash-flow could improve the existing cash
history; report-backed segment/geography views depend on the later extractor
contract. These are recommendations, not newly implemented charts.

### Matching waterfall correction

- Replaced the horizontal debt/cash bars with the same shared vertical waterfall
  component used by Kassaflöde: räntebärande skuld − kassa = nettoskuld.
  Values, rounded bars, connectors, dimensions and labels now follow one renderer.
  Negative net debt remains signed in the chart and appears as positive Nettokassa
  in the headline. No calculation, provenance or missing-data rules were relaxed.
- Moved net-debt history into Historik och beräkning, matching the cash-flow
  panel. Removed the obsolete horizontal-bar styles. No API or production changes.
- Verified: 194 unit tests, production build and all 30 company-page browser
  tests pass. Desktop/mobile and both themes were visually checked; browser
  coverage also verifies matching chart geometry and signed/zero/fallback states.

### Earnings / operating-cash-flow comparison

- Added the same-period historical comparison under the two existing waterfall
  panels, reusing FinancialChart and the common amount scale and period control.
  Two series share one signed axis; there is no ratio, score or extra control.
- Latest metrics use the actual latest selected period, including missing values.
  The card is omitted if no period has both inputs. A supplied zero is not missing;
  losses and cash outflows are plotted below zero. Estimates and other currencies
  continue to be filtered before availability checks.
- No API, extractor or production changes. Local examples use fictional data.
- Verified: 198 frontend unit tests, production build and all 33 company-page
  browser tests pass. Checked desktop/mobile in both themes, paired bar geometry,
  one signed axis, zero/missing/negative values, missing-pair hiding, quarter/year
  switching, exact tooltip values, source-column uniqueness and accessibility.
- Next: pilot segment revenue on 3–5 reports. Require original segment labels,
  fiscal period/currency, source URL/page, external versus internal revenue and
  explicit eliminations/reconciliation. Do not invent an Other category or divide
  internal-inclusive segment sales by group external revenue. Only show shares
  for a reconciled, consistent basis and growth for comparable segment definitions.
  Hide the section until qualified data exists; the live UI is not implemented yet.

### Business-area revenue: local reviewed-report pilot

- Added an isolated producer worktree, `codex/segment-revenue-pilot`, with a
  versioned external-revenue contract and an offline PDF parser. Its three
  reviewed layouts are pinned to exact document hashes; unknown PDF revisions
  fail closed. This is not a generalized segment extractor or a collection job.
- Validated Atlas Copco 2025 (PDF 119 / printed 117), Epiroc 2025 (168 / 167),
  and Alfa Laval 2024 (60 / 118) against rendered source pages. The Alfa Laval
  example is intentionally historical. Original labels, period/unit, source
  URL/hash, raw cell text and page/bounding-box evidence are retained.
- External customer revenue is separate from internal-inclusive segment sales.
  Corporate rows retain their role. Printed dashes stay null, zero stays zero;
  no invented Other. Alfa Laval's −1 MSEK rounding difference is retained, with
  a half-reported-unit-per-number reconciliation bound and the original group
  denominator, rather than normalized shares.
- Added the reusable CompanySegmentRevenue card: compact horizontal bars,
  visible amounts/shares and expandable Rapportkälla. Its defensive adapter
  revalidates evidence/basis/totals and recomputes shares; unqualified records
  render nothing. Shared type, layout and palette tokens are reused.
- At this pilot step, `/designsystem/segments` was the only consumer. It imports reviewed
  historical snapshots, not fictional allocations or live stock API data. The
  development/SEGMENT_REVENUE_PREVIEW gate returns 404 with the production flag
  off; verified that response does not contain the pilot's revenue rows.
- Verified: 12 producer tests (including all three real PDFs against manually
  transcribed golden values), 205 frontend unit tests, production build and all
  37 company/segment Chromium tests. The frontend snapshots exactly match fresh
  extractor output. Tested 320/390/820/1440px, both themes, accessibility, source
  links, zero bars, corporate rows and rounding disclosure; visually inspected
  desktop and mobile. Fixed a missing main landmark caught on the first run.
- No API, MongoDB, production data, report collection, access or deployment
  changes. Next: versioned materialization in the existing report store, an
  optional qualified financials API field with issuer/access checks, then the
  live `/aktie` card. Broader layouts and comparable segment history follow.

### Segment-revenue donut follow-up

- Replaced the pilot's small-segment bar view with a shared, static DonutChart
  primitive. Total revenue, unit and fiscal year sit in the center; original
  names, amounts and shares remain in the always-visible breakdown. No tooltips,
  client state, new dependencies, gradients, shadows or entrance animation.
- Wider cards place the 176px chart beside the breakdown; narrow cards stack a
  160px chart above it. The preview uses two columns at desktop width to preserve
  readable labels. More than six rows retain the bar view rather than recycling
  category colors or inventing an Other category.
- Added six categorical tokens per theme; the first aliases the existing amber
  accent. They are independent of positive/negative performance colors. Matching
  legend dots supplement, rather than replace, visible text and figures.
- No changes to extractor output, validation, source links or production gates.
  Zero remains a visible row without a slice, tiny nonzero slices retain their
  true size, and a rounding shortfall is not filled. A tolerated rounding excess
  is clipped at one turn geometrically; displayed amounts/shares stay unchanged.
- UI.md, foundation documentation and the roadmap now describe this pattern.
  This is still local preview work, not live `/aktie` integration or deployment.
- Verified: 211 unit tests, production build and all 37 company/segment Chromium
  tests pass. Checked both themes and 320/390/820/1440px layouts, accessibility,
  matching legend/slice colors, tiny/zero shares, rounding, original source links
  and the existing financial charts. All six categorical tokens meet 3:1 contrast
  against their chart surface in both themes. Visually inspected the final mobile
  and desktop composition. No production changes.

### Stock-page segment integration

- `/aktie/[symbol]` now consumes optional `financials.segmentRevenue` from the
  existing overview response. No new request, hard-coded company mapping or
  design-system JSON import is added to production UI code. The backend already
  forwards the financials payload; the producer API does not supply this field
  yet. Materialization and upstream API delivery remain a separate roadmap item.
- Match the requested symbol, record symbol and any supplied financials-envelope
  symbol before rendering. Do not infer share-class aliases. Reuse the existing
  source/evidence/reconciliation validator and the same CompanySegmentRevenue
  component. Missing or unqualified data renders no card or empty placeholder.
- Pair it with Vinst och kassaflöde on wide layouts and stack it beneath on
  mobile (or use a full row when that comparison is absent), before source/statement
  drilldowns, inside the existing server-resolved Plus boundary. Keep its own
  annual period, reporting unit and currency independent of the other charts'
  quarter/year selection. A segment-only payload remains useful without history;
  omit the disabled period control and irrelevant empty-history text in that case.
- Local fixture API examples now include the three reviewed companies at
  `/aktie/ATCO-A.ST`, `/aktie/EPI-A.ST` and `/aktie/ALFA.ST`. These contain only
  their reviewed segment report data—no fabricated quotes or financial history.
  `/aktie/NORD.TEST#financials` shows the full layout with explicitly fictional
  financial and segment values. Neither fixture module is imported by app code.
- No producer API, database, access-plan or production changes; not deployed.
- Verified: 215 frontend unit tests, production build and all 44 company/segment
  Chromium tests pass. Checked 320/390/820/1440px, both themes, accessibility,
  company matching, missing/rejected data, Plus gating, annual-period independence,
  seven-segment fallback and original report source links. Visually reviewed the
  paired desktop financial cards and stacked mobile donut/breakdown.

### Paired business-area and geographic revenue

- Revenue breakdowns now have their own two-column row below the historical
  charts. The business-area card never expands to full desktop width when alone,
  even for segment-only reports; narrow layouts still stack. Vinst och kassaflöde
  retains the full-width historical comparison above the pair.
- CompanyRevenueBreakdown centralizes the existing donut/legend/source UI for
  business areas and geography. Optional `financials.geographicRevenue` uses the
  existing overview request and Plus boundary. Country records say Omsättning
  per land; region records say Omsättning per region. Preserve the supplied labels,
  annual period and currency; more than six rows retain the bar fallback.
- The geographic contract shares schemaVersion/status/annual/source/cell evidence
  and group reconciliation with the segment pilot, but declares dimension
  `country` or `region`, `geographicBasis: customer_location`, and
  `geographicBasisEvidence: { text, pdfPage }` on the source page. Rows use
  `geography` and one `group` role. Missing location evidence, wrong-company data,
  incomplete totals and non-customer-location bases are not displayed.
- NORD.TEST now demonstrates both cards with fictional data. Additional local
  GEO-* fixtures cover region, geography-only, many-row and rejection states.
  The three reviewed real-company previews still contain only their verified
  business-area data. No geographic extractor or live API delivery was added;
  that remains separate roadmap work. No production data changes or deployment.
- Verified: 220 unit tests, production build and all 48 company/segment Chromium
  tests pass. Checked paired and lone-card widths, 320/390/820/1440px layouts,
  both themes, source disclosures, accessibility, country/region labels,
  annual-period independence, many-country fallback and access/rejection states.
  Visually inspected the complete desktop financial grid and stacked mobile cards.

### Bolagsprofil hierarchy and report perspectives

- Enlarge the actual radar plot with its existing compact viewBox and a research-
  only point-free option; preserve scoring, fill and other consumers' defaults.
  Remove peripheral SVG labels and the six generic side explanations. Coverage
  and missing-axis names remain visible, while exact scores, clockwise mapping
  and geometric interpolation disclosure live under the existing methodology.
- Replace the generic side text with Möjligheter/Risker using shared 20px headings,
  16px reading text and 14px source links. A responsive chart-plus-perspectives
  layout stacks on narrower cards and uses normal document scrolling.
- Optional `profile.insights` accepts only exact-company reviewed report excerpts:
  available status, `kind: report_excerpts`, fiscalPeriod, PDF URL/hash/title,
  `verification.method: reviewed_report_excerpts` and separate opportunities/risks
  arrays of text and pdfPage. Keep supplied wording/category/period and source
  pages; malformed or absent records never become score-derived claims. Empty
  categories say report material is unavailable, not that the company has no risk.
- The real public endpoint still only returns scores/coverage. No backend
  allowlist, private checks, access boundary, report extractor or production data
  changed. NORD.TEST uses explicitly fictional report excerpts; FREE.TEST checks
  the unchanged public profile with absent insights. Extraction and intentional
  public delivery are separate roadmap work. Not deployed.
- Verified: 225 unit tests, production build and all 56 company-report, revenue-
  breakdown and screener Chromium tests pass. Checked 320/390/820/1440px, both
  themes, exact 20px/16px typography, no research edge points/labels, visible
  missing-axis disclosure, expandable zero/missing scores, source links and
  missing/invalid/partial excerpt states. Screener radar defaults and access
  remain unchanged. Corrected two test-navigation races before the final pass;
  visually inspected desktop and mobile profile compositions.

### Cleaner profile lists and progressive citations

- Replace the two side-by-side text columns with Risker then Möjligheter as
  compact icon-led lists beside the radar. Reuse the existing icons and semantic
  colors: one consistent warning style and one star style, without manufactured
  severity levels. Keep the 20px/16px typography, full wrapped text and mobile stack.
- Remove the report metadata line and per-row citations from the resting card.
  One native Källor disclosure below the lists retains report title/year and all
  claim-to-PDF-page links, with keyboard operation and 44px link targets. Fixture
  provenance stays in that source detail; the NORD.TEST examples remain fictional.
- No changes to data, scoring, source validation, access, extraction or deployment.
- Verified: 225 unit tests, production build and nine focused profile browser
  tests pass. Checked both themes and 320/390/820/1440px, uncluttered resting lists,
  source disclosure by keyboard and touch, exact page links, wrapped source detail,
  accessibility and unchanged empty/error/missing-score states. Visually inspected
  desktop and mobile; no report metadata or per-row citations in the resting view.

### Perimeter labels and proposed company signals

- Add research-only tangent labels around all six radar axes. Keep the lower
  labels upright, use shared Geist and theme-aware text color, and leave dots
  and numeric perimeter scores out. Coverage/missing axes and expandable exact
  scores remain unchanged; screener defaults retain their existing geometry.
- Verified: 225 unit tests and 15 focused profile/screener browser tests pass.
  Checked rendered label size, clipping, theme colors, accessibility, source
  disclosure and existing data/error/access states at 320/390/820/1440px.
  Visually inspected the desktop dark and mobile light compositions. No new
  production build or deployment in this pass; dev server remains available.
- Audited existing Stonks profile checks, financial extraction field definitions
  and public API projection. Added `docs/company-signals-v1.md` and a roadmap
  item for a deterministic backend catalogue, qualified input facts, explicit
  public delivery and versioned evidence. Calculated flags stay distinct from
  reviewed report excerpts. This is a proposal, not an implemented backend;
  no production data, access rules or existing scoring changed.

### Profile centering and remaining stock-page UI

- Center the plot itself vertically beside the perspectives, with balanced
  space for the coverage caption. Explicitly center it within its column;
  the mobile stack has no extra balancing space.
- Added alignment/caption-containment assertions. All four responsive cases
  (320/390/820/1440px, both themes and accessibility) pass across reruns. The
  initial run hit disk exhaustion while saving traces; reran with traces off.
  A mobile interaction retry now scrolls the source disclosure clear of fixed
  navigation before a real click. No force-click or layout assertion bypass.
- Roadmap now prioritizes valuation, VD-ord refinement, estimates, ownership /
  shorting, and calendar / whole-page mobile review before company-signals
  backend work. Existing data only; extraction and historical comparisons wait.
- Local only, not deployed. No backend changes or file cleanup performed.
