# News-first feed loading — September 21, 2026

Deployed and verified on September 21, 2026 at 14:02 UTC.

## Request contract

- `/api/feed/news?limit=20&reactions=deferred`: canonical headlines, supplied AI
  copy and cursor, without legacy reaction calculations or V2/session reads.
  Categories are forwarded before upstream pagination. `streamSince` is the
  server timestamp captured before querying the initial snapshot.
- `/api/feed/stream?since=…&lastEventId=…`: existing authenticated Plus/Pro SSE,
  now including story/context/pulse lanes. Start replay before bootstrap; keep
  event IDs across reconnect/pause/visibility changes. No snapshot on open.
  A 20-row fallback snapshot runs every 60 seconds only when disconnected.
- `/api/feed/news/observations?stories=id:version,…&known=id:fingerprint,…`:
  Plus/Pro-only, at most 20 displayed references. The backend revalidates
  canonical active stories upstream on every request. Metrics are returned
  only when their fingerprint changed; same-version AI-summary completion is
  included as a small delta because it uses a separate notification topic.
  Content revisions and withdrawals have
  separate version-checked update/removal responses. `private, no-store`.
- Observation refresh is independent of the news stream and searches: on first
  paint, a changed membership/version, scrolling to other rows, and every
  30 seconds while visible. Optional failure leaves headlines and observed
  timestamps intact. Quote updates do not reshuffle visible rows.

## Cache boundaries

Market API legacy reaction calculations use a bounded 15-second in-memory cache
(2000 entries), keyed by story ID, version, publication and companies. Concurrent
misses share batch work; failures are not cached. Missing data expires and can
be retried. The existing fixed-window caches now include revision/identity and
do not permanently store missing baselines. This is display caching only; no
Reaction V2 archival calculations, source data or backtest records change.

Backend observation enrichment has its own 15-second bounded cache (1000
entries), behind authorization and canonical selection. Cache hits never change
source timestamps. Absent enrichment is distinct from explicit unavailable data.
There are no per-row history/chart calls.

## Rollout and verification

Deploy Market API first (the `reactions=none` and bounded `ids` query additions),
backend second, frontend last. Terminal's default response still includes legacy
reactions. Public overview ranking and private watchlist matching are unchanged.
Do not ship only the frontend: the new observation endpoint requires the backend.

Verify initial request limit, no duplicate on SSE open, old-page cursor,
disconnected fallback, pause/replay, category-before-pagination, delayed metrics,
revision/withdrawal races, price timestamps, and mobile reading-position stability.
Baseline production measurements before changes were 2.8–4.1 seconds for 100
upstream stories versus 0.8 seconds for 12. Post-deploy latency must be measured
again; local fixture tests are not production performance measurements.

Isolated release verification: 172 frontend unit tests; 352 backend tests passed, two
opt-in integration tests skipped; 41 Market API/cache tests; 13 Chromium
interaction tests including 390px/1440px scroll preservation. Market API
TypeScript check passed. Backend tests use a fictional unused OpenAI key for
the existing module-initialization requirement, not a live provider key.

## Production release

- Frontend: `c7adcf77e9835db88693fa0f891daa24f5f0c1d0`.
- Backend: `29b425d266c6f90919c3d86eab5b9a550fbe60b0`.
- Market API: `e789802008ba9f1530837d3f8270aeaf15ed0faa` applied to
  the existing Swedish/oil compatible source. Retained its financial-source
  selection; did not build from the unrelated working Terminal checkout.
- Release artifacts and rollback IDs:
  `/root/omxsum-market/releases/feed-performance-20260921`.
  Current images were tagged `before-feed-performance-20260921` before rollout.

Measured server-local HTTP samples (not browser end-to-end page timings):

- Before: legacy 100-story Market API request 2598 ms; 20 stories 832–962 ms.
- After: 20 deferred Market API stories 76–145 ms. Default reaction-bearing
  request 613 ms cold, 82 ms warm; default clients remain compatible.
- Authenticated frontend feed endpoint: 20 headlines in 99 ms; next page
  169 ms, 20 distinct older stories.
- Observation endpoint: 20 story observations in 74 ms, all with metric/context
  data. Repeat with fingerprints: 33 ms, zero changed observations.
- Unauthorized observation access was rejected. Public authenticated SSE
  connected and delivered bytes. Homepage, market, news, directory and company
  listing returned HTTP 200. Three application containers had zero restarts;
  MongoDB retained its container identity and start time.

Builds ran sequentially with CPU/memory limits. About 36 GB remained free;
no build-cache pruning, database changes or account changes were made.
Existing backend dependency audit findings (19: four moderate, 12 high,
three critical) remain a separate security-maintenance follow-up; dependencies
were not changed by this release.
