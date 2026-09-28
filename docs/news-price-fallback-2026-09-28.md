# News percentage coverage — 2026-09-28

Status: deployed and verified **28 September 2026 at 16:54:52 UTC / 18:54 Stockholm**.

## Production release

- Frontend application `9975d6d`, backend `2429478`, scoped producer `18d8c3e`.
- Backend is a two-file overlay on the exact previously running image, based
  on production revision `8ba2d64`; unrelated local work was excluded.
- Producer uses `/opt/omxsum-company-session/releases/18d8c3e-price-check`.
  The existing two-minute-after-completion timer, calendar and coverage scope
  are unchanged. The matching module in `/root/stonks` was backed up and updated.
- Read-only dry run: 877 listings, zero writes, 11.29 seconds. The GiG/SolidX
  two-stock write passed, followed by 877 successful atomic snapshot updates
  in 13.99 seconds: 848 available prices, 853 prior closes, 574 fresh volumes
  and 565 daily RVOL values. These are dated observations, not coverage promises.
- The public 100-story sample at 16:55:19 UTC yields **97 percentages**, versus
  78 with the old reader on the same response. Fifty use labelled daily context;
  none in this post-close sample requires the verified-older-price exception.
  The remaining cases include two awaiting the next session and one without
  an eligible price/baseline. No zero or placeholder was invented.
- Candidate and live 1440px/390px checks passed in both themes: no horizontal
  overflow or page errors, compact latest rows, no `Nyhet` badge, and working
  news dialogs. Asker's real OG image renders +4.6% with the daily label and
  dated quote; its independently dated historical chart remains separate.
- Main market, news, directory, Swedish/Nordic stock and public API routes
  returned 200. Frontend/backend restart counts were zero at verification.
  Mongo, Stonks web and nginx container IDs/start times were unchanged; nginx
  was gracefully reloaded. No AI flags/budgets, email policy, source collection
  cadence or reaction archives were changed.
- Temporary candidate containers and the localhost-only tunnel were removed.
  No image/cache pruning was needed; 27 GiB remained free.

## Release evidence and rollback

Server evidence: `/root/omxsum-market/releases/news-price-20260928-9975d6d`.
It contains scoped source archives/checksums, guarded build/cutover scripts,
backend test output, dry-run/pilot counts, public snapshots and container IDs.

- Frontend `newsweb-frontend:news-price-9975d6d`:
  `sha256:d6d9e40fd03563550686028295cc5a889af6450e01233f28bd8c3844e9f477c3`.
- Backend `newsweb-backend:news-price-2429478`:
  `sha256:fe3e66edb037e41769866200547dbacb2c70b18822d1940286b5cec0a62fa6d3`.
- Rollback tags: `newsweb-frontend:before-news-price-20260928` and
  `newsweb-backend:before-news-price-20260928`. Previous producer release
  `/opt/omxsum-company-session/releases/e15b4f0` is retained, as is the original
  screener module in the release evidence directory. No rollback was needed.

This is a point-in-time record. Recheck current revisions before rolling back;
do not overwrite subsequent deployments using these historical identifiers.

## Display contract

- A completed event measurement wins, including premarket news and a real zero.
- When that measurement is unavailable, a valid company-session return may be
  shown as `Idag · mot föregående stängning` (or the actual session date). This
  also covers older stories, without rewriting their missing event measurement.
- A session preceding the news is not presented as trading after the news.
- No valid percentage means no row badge; never substitute zero or `Nyhet`.

## Older quote observations

The producer can corroborate a quote using the existing `universe_quotes`
snapshot. Require the same symbol, session and schema, a known Yahoo Spark
source, valid timestamps and price, and no conflicting value at the same time.
Persist its successful receipt as `priceCheckedAt`; preserve `priceAt`.

The API and reader accept an older observation only while that successful check
is within the existing 15-minute bound, measured through session close. The
normal next-session expiry still applies. Rows and the reader show `kurs kl.`
for such an older observation; expanded provenance includes the provider check.
A successful quote fetch is not proof of the last trade or of no trading.

An old, failed or unrelated check cannot refresh the price. Volume and RVOL
remain independently validated. No new provider requests, AI generation,
ranking rules or historical-reaction writes are introduced.

## Verification

- Producer: 22 tests passed.
- Backend: 390 passed, 2 skipped. Its existing import-time OpenAI initialization
  requires a dummy non-secret key for the pure test suite; no generation ran.
- Frontend: 264 tests passed. The affected session/chart tests also passed
  after selecting the archived chart fixture by ID instead of array position.
- Browser: 16 session/news-badge tests passed, including 320px and 1440px,
  both themes, reader switching, expiry and accessibility assertions.
- Local producer → API → reader integration preserved the old quote timestamp
  and removed the percentage when its successful check expired.
- Six share-image endpoints returned valid 1200×630 PNGs. These HTTP smoke
  checks use the real server clock; the fixed-date session quotes are expired
  there, so this does not verify the live daily-percentage image branch.

Replaying the saved 100-story public overview from 2026-09-28T10:55:45Z showed
77 percentages instead of 60, using the new daily fallback alone. This is an
offline snapshot result, not a post-deployment coverage claim. It excludes any
additional coverage from the new provider-check metadata.

## Rollout boundary

The complete improvement spans producer `stonks/company_session.py`, backend
`utils/storyCompanyContext.js`, and the frontend's shared company-session and
reaction adapters. A frontend-only release gains the labelled daily fallback
but cannot expose the new verified-older-quote path until the producer and API
provide its metadata. Unrelated briefing/pilot and financial changes in these
worktrees must remain outside this release.
