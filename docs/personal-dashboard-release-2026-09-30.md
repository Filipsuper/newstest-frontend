# Personal overview and mobile market cards — 30 September 2026

## Scope

Built on production frontend `01ceba7`, retaining its onboarding, compact trial
labels, annual estimates and qualified profit-publication policy. This release
changes only the personal dashboard, market widgets, related regression tests,
local server-data preview tooling and their documentation. Pending unrelated
About and reviewed-share-basis work stays out of the release.

- Mina bolag: four paged followed-company quote widgets, important company news,
  and a live chronological feed with all/unread/company/topic/keyword filters.
- No company comparison, personal letter, quote info button or quote date footer.
- Source timestamps and history periods remain in data and accessible labels.
- Mobile graphs are visible and edge-to-edge; value sits under the name in muted
  metadata typography. Desktop keeps compact right-hand curves.
- Quote and curve tone share the daily reference; zero and unavailable are neutral.
- Independent errors, retries and partial-coverage qualifications are preserved.

## Deployment contract

- Backend `277d685` already provides the separate important-candidate pool and read
  decoration. No backend, producer, Mongo, newsletter-worker or collector restart.
- Fresh ARM64 frontend build with production public API and existing alerts flag;
  no local environment, dependency symlink, fixture build or secrets in the image.
- Preserve the exact running frontend image as rollback before cutover; verify a
  candidate before switching, use `--no-deps`, then check/reload nginx.
- Do not edit runtime environment, compose configuration or production user data.
- Live verification is read-only; no newsletter consent, trial, mail or billing write.

## Deployment result

- Runtime source: `0b90969c152a419e360e87f82bc975cf1aab8843`, pushed to
  `Filipsuper/newstest-frontend`, branch `nextjs`, with explicit public-repository
  publication approval.
- Image: `newsweb-frontend:personal-dashboard-20260930-4pnkdh`,
  `sha256:254bf6ec23c70bf93d9149de95836012c6f16d0310b33a04797c86c93cd83be0`.
- Verification: 328 unit tests, optimized production build, 59 browser regressions;
  candidate and live checks at 320, 390 and 1440 px. Both quote strips render four
  actual public-data curves, with edge-to-edge mobile graphs and no page overflow
  or page errors. Personal visual checks use an isolated example watchlist, not a
  production login or a claim about any specific user's private feed.
- Live HTTP 200 checks: landing page, market overview, personal dashboard, news
  feed, onboarding, plans, settings, stocks, SAAB stock page, market overview API
  and company directory API.
- Cutover on 30 September 2026: only the frontend container was replaced. Backend,
  Mongo, nginx and stonks container identities/start times were unchanged; runtime
  configuration hashes were unchanged. Nginx configuration checked and reloaded.
- Exact prior frontend image retained under
  `newsweb-frontend:before-personal-dashboard-20260930-4pnkdh`. The temporary
  candidate container was removed after successful verification.
- Evidence on VPS:
  `/root/omxsum-market/releases/personal-dashboard-20260930-4pnkdh/`.
  No production account writes, mail sends, billing writes or worker restarts.
