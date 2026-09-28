# News percentage coverage — 2026-09-28

Status: implemented locally; not deployed.

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
