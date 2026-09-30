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

Final revision, image identifiers and live evidence are recorded after deployment.
