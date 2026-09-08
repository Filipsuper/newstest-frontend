# Reaction v2 implementation status

8 September 2026. Backend foundation and the first public-site UI integration are
implemented locally, **not deployed or enabled in production**. The news API's
optional v2 read model defaults off. Ranking weights and Terminal behavior are
unchanged; no worker or new collection/retention policy has been activated.

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
- Shared chart geometry inputs with explicit nulls across gaps.
- Resumable, leased shadow worker with retries, read-only replay/quality inspection,
  and separate opt-ins for minute collection and durable observed-tick capture.

All writes are confined to `reaction_v2_*` collections when explicitly enabled.
The checked-in service is not installed. Existing source retention is unchanged.
Implementation tests use only fictional data and isolated test databases.

Verified locally: 70 Reaction v2 tests passed against both the isolated test double
and real MongoDB, plus three existing minute-source tests. This checks persistence,
replay and calculation behavior, not current production data coverage.

## Boundaries and next steps

This is a publication event-study foundation, **not yet a tradable backtest
dataset**. Current source observations are unverified; corporate actions,
overlapping news and company matching still need qualification. Original source
receipt times cannot be invented for backfilled bars. Rejected source documents
and every raw revision/AI feature are not yet archived at ingestion time.

First run an approved shadow pilot and audit coverage, lag, storage, retries and
replay. Then reconcile company charts with the same inputs and qualify personal
feed coverage. Approve activation of the optional API/UI read model separately
from any migration of ranking inputs. Do not mix a v2 percentage with a legacy
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
  produce a fabricated curve or borrow the old `reactionSeries`.
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
personal-feed builder has a separate path and has not yet been enriched; stock
charts, mover ranking and editorial ranking have not been migrated to v2.

Price observations require a pre-publication baseline, completed endpoint no
later than the evaluation cutoff/target, at most two-minute sampling age and a
consistent return. Volume requires full minute coverage; missing data and zero
comparison denominators do not become ratios. Optional lookup failures leave the
original news response usable. Disabling the API flag rolls back to legacy
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
