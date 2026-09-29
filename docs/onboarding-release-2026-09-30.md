# Account onboarding and cardless trials — production release

Verified **2026-09-29 22:28:34 UTC**, **30 September 00:28:34 Stockholm**.

## Revisions and scope

- Frontend `0fb64cc`: account-first `/kom-igang`, optional letters, followed
  companies and topics, compact email importance UI, saved-choice completion,
  retry/skip/free paths and optional seven-day Plus/Pro cards.
- Backend `277d685`: account login separate from newsletter consent, authoritative
  revision-checked letter catalog, native trial activation/expiry and current
  entitlement checks across auth, personal letters and company-email delivery.
- Based on frontend `998097e`; retained the already released valuation estimate-year
  selector. Unrelated local About/valuation/briefing work was not included.
- Existing prices, follow limits, private email pilot, provider configuration,
  newsletter scheduler, Mongo and stonks services were not changed or recreated.

## Build and rollback

- Clean committed archives; frontend ARM64 build capped at one CPU, 1400 MB
  RAM / 2 GB including swap. Existing public API and alerts UI flag retained.
  No local environment, localhost API, fixture build or dependency symlink shipped.
- Backend overlays only scoped production modules onto the exact previously
  running image, retaining its dependencies and other deployed modules.
- Frontend image `sha256:e911dd0f670dd87a52274d78b6c4b55e2c6fbe98a8543817d6731fe046bfc968`.
- Backend image `sha256:b9290de5e28213483a87420ec98d227110dc8c448ed45ca2c6ba403d2a370a19`.
- Rollback tags: `newsweb-frontend:before-onboarding-20260930` and
  `newsweb-backend:before-onboarding-20260930`. After trials are used, backend
  rollback must preserve expiry/entitlement fences and explicit newsletter consent.
- Evidence: `/root/omxsum-market/releases/onboarding-20260930-0fb64cc`, containing
  sources/checksums, scripts, build/tests, cutover and container/config checks.
- Backend before frontend; normal initial connection-reset retries during restart
  succeeded. Final public checks all passed. No rollback was needed.
- Runtime `.env`/compose checksums unchanged; Mongo, nginx and stonks container
  identities preserved. Nginx configuration checked and reloaded only.
- Temporary frontend candidate stopped and removed; rollback images retained.

## Verification and remaining checks

- 299 frontend unit tests, 428 backend tests and 52 isolated owned-Mongo checks
  passed. Backend image repeated all 428 offline tests with network disabled.
- Optimized local build: all 89 onboarding/alerts/settings/membership/landing
  browser checks passed, including both themes, keyboard and mobile layouts.
- Public live HTTP 200 for onboarding, confirmation, pricing, settings, market,
  personal-feed landing, stock directory, Swedish/Nordic company pages and
  company/market/topic APIs. Anonymous newsletter access returns the legacy
  missing-token rejection; Terminal authority returns 401; briefing fixture 404.
- Separate anonymous live Chromium checks at 320/390/1440px for `/kom-igang`,
  `/pro` and `/settings`: no page errors or horizontal overflow. All writes were
  blocked; none attempted. Screenshots reviewed. No user browser/session used.
- Trial-expiry runtime and prior valuation selector confirmed in deployed images.
  Both services running with restart count zero. Root disk 68%, about 24 GB free.
- No production account, real checkout or test email used. The account owner
  still needs to test signup, explicit newsletter/follow/email saves and native
  trial activation. Actual Stripe conversion/retry remains a test-mode integration
  check, not a claim supported by mocks or these anonymous production probes.
