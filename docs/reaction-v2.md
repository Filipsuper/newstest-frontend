# Reaction v2 implementation status

## Local display revision — not deployed

The news reader and share images now use an independent continuous absolute-price
chart for the first eligible exchange session around publication. It reads the
existing seven-day `live_ticks` cache, otherwise stored `reaction_v2_market` or
`minute_bars` candles. No retention changes, extra tick archive or provider calls.
This does not change archived Reaction v2 inputs, missing-coverage rules, fixed
+1/+5/+15/+60-minute results or exact replay. See
[the local implementation and release gates](news-data-consistency-next.md).

## Deployed calculation status

9 September 2026. **Public live beta deployed and enabled after approval**:
frontend `72a6aa1`, news backend `2c89137`, isolated v2.2 worker code `68138e1`.
The API flag defaults off in code and is explicitly enabled in production.
The worker reads existing minute data and collects bounded completed minute bars
for news-related instruments, writing only the v2 archive. Tick archiving remains off. Ranking, existing
collectors, Terminal and newsletter services are unchanged.

The implementation is in `stonks/stonks/reactions/`, with the opt-in CLI
`stonks/scripts/reactions_v2.py`. The full measurement contract, collections,
rollout/rollback commands, source references and limitations are documented in
that repository's `docs/reaction-v2.md`.

## Implemented foundation

- Per-story-version/per-company immutable event records, emitted news and separate
  AI-summary archives, conservative capture timestamps and instrument snapshots.
- Versioned minute-bar inputs and reproducible result manifests. Source corrections
  create new results; earlier results still replay against their original inputs.
- Nasdaq Stockholm main/First North equity sessions, including verified 2025–2026
  holidays, half-days and DST. Unknown venues/years fail explicitly.
- Pre-publication completed-bar baselines, timestamped +1m/+5m/+15m/+1h and
  separate session-close/next-session-close windows; next-open handling outside
  market hours, two-minute maximum sampling age and explicit missing states.
- 5/15/30-minute post-news volume against both pre-news volume and median volume
  in the same clock-time window over preceding sessions. Missing is not zero;
  provisional baselines and incomplete coverage remain visible in the contract.
- Shared chart geometry inputs through both closing windows, with explicit nulls
  across missing minutes and closed sessions. V2.1 remains available for exact
  replay; new v2.2 results preserve the original price/volume calculation rules.
- Strict story/version/publication identity and public measurement checks;
  malformed periods, stale baselines and inconsistent volume ratios fail closed.
- Resumable, leased shadow worker with retries, read-only replay/quality inspection,
  and separate opt-ins for minute collection and durable observed-tick capture.

All writes are confined to `reaction_v2_*` collections when explicitly enabled.
The service template is installed with an isolated release path and CPU/memory
limits. Existing source retention is unchanged; new v2 archive growth needs monitoring.
Implementation tests use only fictional data and isolated test databases.

Verified locally: 75 Reaction v2 tests passed against both the isolated test double
and real MongoDB, plus three existing minute-source tests. This checks persistence,
replay and calculation behavior, not current production data coverage.

## Boundaries and next steps

This is a publication event-study foundation, **not yet a tradable backtest
dataset**. Current source observations are unverified; corporate actions,
overlapping news and company matching still need qualification. Original source
receipt times cannot be invented for backfilled bars. Rejected source documents
and every raw revision/AI feature are not yet archived at ingestion time.

The approved public beta is now running. Audit coverage, lag, storage, retries and
replay over the first sessions. Reconcile independent company charts with the same
inputs and qualify the integrated personal feed against live coverage. Any migration
of ranking inputs remains a separate decision. Do not mix a v2 percentage with a legacy
chart or silently add new volume ratios to editorial ranking.

Daily/session RVOL remains separate from the post-news-window ratio. Historical
comparisons must distinguish observed association from causal attribution and
features available at the time from subsequently measured outcomes.

## Local UI review

Run the frontend dev server and visit `/designsystem/reactions`. This route uses
explicitly fictional, dated examples, not live news or market prices. Open each
row to review positive/negative moves, chart gaps, next-open timing, waiting,
missing baselines and multiple companies. No worker or database is needed.

The route is unavailable in a production build unless the test server explicitly
sets `REACTION_V2_PREVIEW=1`. Do not set this flag on the public deployment. The
fixture is never substituted into `/marknaden`, personal feeds or stock pages.

### Shared presentation

- `app/utils/reactionV2.js` validates story ID/version/publication and company,
  chooses the latest completed observation by target time (including the two
  closing windows) and bounds the chart to that period. Never choose by magnitude.
- `NewsFeedItem` uses the same period and soft signed badge as `StoryReaction`.
  The reader puts the headline and AI summary first, then one aligned three-KPI
  row (price reaction, volume vs normal, volume vs before). Only short labels,
  values and measurement periods are visible; no repeated headings/timestamps
  or period dropdown/tabs. Follow/share actions come after the reaction.
  Two/three-company stories switch with shared segmented buttons; longer lists
  use the company Select. Price, chart and facts follow that company together.
  All six price periods remain a read-only comparison inside measurement details.
  Ranking still uses existing inputs.
- `ReactionChart` preserves null gaps. Missing/short chart coverage does not
  produce a fabricated curve or borrow the old `reactionSeries`. A completed
  chart must end at the selected endpoint with the same percentage as its KPI.
- Reader volume facts sit alongside price before the chart: comparisons with the
  preceding period and normal same-clock-time volume. The three values and
  period labels stay aligned on mobile, even when KPI names wrap.
  Use the longest completed 5/15/30-minute window automatically and label it.
  Provisional comparisons have an asterisk and accessible qualification, with
  the comparison-day count in details; missing facts never appear as zero.
  Only complete and mature
  30-minute normal comparisons appear on compact feed cards.
- Reader details contain raw shares/time, comparison-day counts, refresh and
  missing-data explanations, and disclose baseline/endpoint/target/calculation times,
  minute resolution and unverified source, and association/corporate-action
  limitations. After-hours measurements say "efter öppning".
- News OG images use the same selected company/period and matching series.
- Optional-data failures retain the previous matching v2 observation with its
  timestamp, without generating a new-news count. A new story version does not
  inherit the previous version's observation. No v2 payload means legacy UI.
- An open v2 reader refreshes each minute while visible. The active live feed
  separately polls observations because the story stream does not emit v2 updates.
  Price/volume refresh in place without reshuffling accepted rows or claiming new
  news. The reaction view uses the shared v2 percentage; "Uppdatera urval" accepts
  any resulting selection/order change. Pausing stops feed refreshes.

### News API integration

The separate `newsbackend` repository adds `utils/publicReactionV2.js`, called
by the existing `readPublicNews` adapter. `REACTION_V2_UI_ENABLED=true` enables
only bounded reads of `reaction_v2_latest` and `reaction_v2_results` for stories
already selected and authorized by an existing news endpoint. The response
whitelists public measurement fields and excludes raw manifests, archive IDs,
historical sample inputs, source documents and model metadata.
Feed responses omit chart arrays; the reader/detail request loads the matching
series on demand, so a long news list does not download hundreds of unused curves.

The API flag does not start the shadow worker, change ingestion or backfill data.
If no matching results exist, real pages continue to use legacy data. The
personal-feed builder now retains the full company list, story version and
optional measurements from the shared annotated feed. Existing matching and
authorization remain intact. Independent company charts, Terminal mover ranking
and editorial ranking have not been migrated to v2.

Price observations require a pre-publication baseline, valid session/anchor and
exact period target, completed endpoint no later than the evaluation cutoff/target,
at most two-minute sampling age and a consistent return. Volume requires full
minute coverage, anchor-aligned windows and arithmetically consistent ratios;
missing data and zero comparison denominators do not become ratios. Retracted
stories cannot expose valid measurements. V2 detail caches expire after 60 seconds
even for older stories that are awaiting the next session or a correction.
Optional lookup failures leave the original news response usable. Disabling the API flag rolls back to legacy
responses on the next cache refresh without modifying stored results.

Local tests cover the contract and legacy fallback in both repositories, and
Playwright exercises shared rows, reader controls, missing/next-open states,
refresh retention, accessibility and share-image rendering with fictional data.
These tests do not establish live market-data coverage or backtest readiness.

Verified for the first local UI pass: production build, 69 frontend unit tests,
46 news-backend tests and 42 browser checks passed. Browser checks cover light/
dark themes, 320–1440px layouts, keyboard and dialog behavior. The production
build returns 404 for the fictional preview when its test flag is off.

The follow-up glance-first reader revision passed the production build, 71
frontend unit tests and 17 focused browser checks (new reader, legacy volume
and share images). These include visible volume without extra clicks, automatic
period advancement, one-click/keyboard company switching, mobile reflow and
light/dark dialog accessibility. It remains local and unreleased.

The news-first hierarchy revision passed the production build, all 71 frontend
unit tests and 37 browser checks across Reaction v2, legacy volume, newsroom and
share images. The checks assert three aligned KPI values/periods at 320px and
1440px, news → data → actions ordering, collapsed provenance, accessible
provisional qualification and company switching. Light/dark reader screenshots
were reviewed. No rollout flags, workers or production data were changed.

Frontend design push scope (8 September): includes the reader, shared chart/OG,
volume presentation, observation refresh and their tests. The separate featured
ranking selector, favicon work and sibling backend changes are excluded. The
isolated staged source passed a production build and 63 unit tests. All 37
browser cases passed after removing one test's assumption about the excluded
ranking policy and rerunning the five-case volume group. This is a Git push,
not a production deployment or API/worker activation.

### V2.2 integration verification

The scoped source (excluding unrelated editorial-selector/favicon changes)
passed a production build, **66 frontend unit tests, 51 news-backend tests,
75 calculation/persistence tests and 40 browser checks**. Persistence passed both
the isolated test double and disposable real MongoDB; three existing minute-source
tests also passed. Browser coverage includes automatic observation refresh,
stable reaction selection, personalized multi-company stories, shared reader/OG
behavior and 320–1440px light/dark layouts. Reader screenshots were reviewed.
A real calculation over fictional minute bars was passed through Python engine →
public API adapter → frontend helpers, verifying hourly and both closing endpoints,
overnight gaps and exclusion of private archive fields.

Those pre-deployment checks established code readiness, not production coverage
or backtest readiness. The subsequently approved live beta is recorded below.

### Live beta release — 8 September

- The worker runs from `/root/omxsum-reactions-v2/releases/f60fd4b`, using the
  existing Python environment and connection configuration. The unrelated dirty
  `/root/stonks` checkout is untouched. Systemd limits the worker to 25% of one CPU
  and 256 MiB memory, with five jobs and 50 source messages per 30-second cycle.
- `REACTION_V2_UI_ENABLED=true` is set in `/root/newsweb/compose.override.yaml`.
  Extra collection/tick flags are absent. New v2 archives have no automatic TTL;
  existing source retention, authentication and editorial ranking are unchanged.
- Initial capture starts with the existing last-24-hour emitted-news window.
  Three current source versions were additionally warmed through the same code
  for the release check. All three replay exactly; their public API versions,
  KPI percentages and chart endpoints agree, and the deployed readers render v2.
  Broader queue warm-up and live-data qualification are still in progress.
- Public home, Marknaden, company and company API checks pass. The fictional
  preview returns 404. Anonymous full-feed access still returns the existing
  `No token provided` error (the existing middleware uses HTTP 200 for this).
- To disable the public integration, set the override flag false and recreate
  only the backend, then reload nginx. Stop `stonks-reactions-v2` to stop archive
  writes; do not delete the archive or modify existing collectors. Previous
  frontend/backend images remain tagged for rollback. See `release-history.md`.

### Worker freshness repair — 9 September

- Approved worker release `68138e1` activated at **09:33:51 UTC**. No website,
  news backend or Terminal container was rebuilt or restarted. Existing app images
  and the unrelated dirty server checkout remain unchanged.
- Current story versions and recent news take priority. Superseded jobs stop
  automatic retries, while their archived inputs/results remain available for
  replay and explicit retry. Future outcomes for superseded versions are not
  automatically completed; do not claim full historical backtest coverage.
- Up to three supported news-stock minute fetches per cycle, before measurement;
  excess jobs wait for collection capacity. Rate limits trigger a global pause.
  Targets and missing-data retries are scheduled separately, with a bounded
  per-cycle bar cache. Tick collection is still disabled.
- Private replay manifests are compressed losslessly; the public price, chart
  and volume contract is unchanged. Old uncompressed records still replay with
  the new reader. No historical records were rewritten or deleted.
- Verified **93 reaction tests** against test-double and real disposable MongoDB,
  five minute-source tests and 13 public-adapter tests. Live checks confirmed
  current-day candles, three old and three new exact replays, and matching chart
  endpoints for all 11 completed periods in a newly updated multi-company story.
  Initial cycles had no calculation failures or worker restarts, at about 70 MiB
  memory. Backlog catch-up and reference-history accumulation remain ongoing.
  At 09:38 UTC, 30 instruments had fetched successfully, 43 current-version
  results were checked since rollout and no superseded jobs remained due.
- Unused Docker build cache older than 24 hours reclaimed **9.737 GB**; roughly
  **11.8 GB** remains free. Running and rollback images, volumes and database
  archives were preserved. The cache is rebuildable.
- Worker override now uses `--jobs 20 --interval 15 --collect-minutes
  --collections-per-cycle 3`, retaining 25% CPU and 256 MiB limits. Previous
  configuration is preserved at `/root/omxsum-reactions-v2/releases/68138e1/previous-live-beta.conf`.
  Stop only this worker to halt writes; retain the new replay reader for compact
  records even if the scheduler is rolled back. Public API rollback is unchanged.
