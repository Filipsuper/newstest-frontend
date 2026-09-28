# News presentation — production release

Verified **28 September 2026 at 10:21:22 UTC / 12:21 Stockholm**.
Application revision: `c5a849cb5660fd5e992b2a3f47fd18a42f6dbac3`.

## Scope

- `Viktigast just nu` shows available AI prose and supplied bullet points.
- Ordinary latest, chronological/reaction and watchlist rows remain compact;
  complete AI context stays in the opened reader. Hidden enrichment does not
  reorder ordinary rows; featured enrichment updates its existing selection.
- Shared news rows omit unavailable reaction badges and their leading space.
  No generic `Nyhet`, dash or missing-data label replaces the percentage.
  Valid zero remains visible, and timing/status remains in metadata.
- Includes the previously approved company briefing typography and placement:
  beside the chart below full-width quote/actions, stacked after it on mobile.

Only the frontend container was recreated. Nginx was tested and gracefully
reloaded. Backend, Stonks web, Mongo and nginx container IDs and start times
were unchanged across cutover. No worker module, AI-generation flag, pilot
allowlist, budget, ranking logic, email policy or database record was changed
by this deployment. Pending producer length/selector work is not included.

## Verification

- 261 unit tests pass.
- 49 browser cases pass across the full affected suites. Two mobile cases
  initially exhausted the 30-second cold-development-server timeout while
  navigating to a stock fixture; both passed on rerun with a 90-second test
  budget. No product code changed for the rerun.
- Resource-capped ARM64 production build from a clean Git archive. No local
  environment files, development API URLs or review data entered the image.
  The public API URL and existing company-alert UI flag were preserved.
- Loopback-only candidate passed HTTP checks before the live swap, including
  a 404 for the development-only briefing route.
- Candidate and public browser checks at 1440px and 390px, in both themes,
  found four featured AI summaries, twelve compact latest rows, and six rows
  without a leading badge. No generic `Nyhet` badges, horizontal overflow,
  localhost API requests or page errors. The real story dialog opened/closed
  correctly and retained its AI summary; Nanexa's chart rendered correctly.
- Nanexa had no qualified briefing in these public checks, so live briefing
  placement was not exercised; it has the prior local fixture/layout coverage.
- `/`, `/marknaden`, `/marknaden/nyheter`, `/aktier`, Nanexa, Novo and the
  company-directory API returned 200 after cutover. Frontend restart count: 0.

## Image and rollback

- Image: `newsweb-frontend:news-ui-c5a849c`.
- Image ID: `sha256:fb81f27bae3c0c2d4ba57d4e9b9ec14aa31a0c8066f073be32efc99f1bf9b3e6`.
- Previous image retained as `newsweb-frontend:before-news-ui-20260928`:
  `sha256:ea2bc71758dba9169cea8204c54051d48512fc2d8eb8c63fda180facf6830c7d`.
- Server evidence: `/root/omxsum-market/releases/news-ui-20260928-c5a849c`.
  Includes source checksum, guarded build/cutover scripts, health checks and
  before/after container identities. Cutover automatically restores the previous
  image on a failed health check. No rollback was necessary.
- Candidate container and temporary local preview connection were removed
  after verification. No build-cache pruning was necessary.

This is a point-in-time deployment record, not an instruction to rerun scripts.
For any later rollback, recheck the running revision and preserve newer work.
