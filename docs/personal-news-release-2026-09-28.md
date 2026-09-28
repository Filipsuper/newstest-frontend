# Personal news, landing and memberships — production release

Verified live at **2026-09-28 21:50:26 UTC**.

## Published revisions

- Frontend `519e5ec` on `nextjs`: personal catch-up/read UI, selected chronological feed, email/keyword previews, market-session labels, expanded landing, separated screener/Terminal sections, current Trading and Bolagsanalys screenshots, clearer pricing.
- Backend `b1d3984` on `main`: personal read receipts, company-scoped important catch-up, keyword exclusions/previews, aligned newsletter selection and authoritative membership limits.
- Newsletter renderer `8f23438` on `main`: source story links and continuation into Mina bolag. Existing scheduler restarted; no manual sends.

Free follows two companies, Plus twenty, Pro (`premium`) one hundred. Terminal now requires Pro on both the gateway and backend authorization endpoints. Existing saved follows are retained; no account plans, subscriptions, Stripe prices, consent, AI budgets or alert pilot settings were changed.

## Build and rollback evidence

- Clean committed frontend archive, ARM64 build limited to one CPU and 1400 MB memory / 2 GB including swap. Existing public API and alerts UI flag retained; no localhost API or fixture build shipped.
- Backend layers only this revision's changed files onto the exact previous production image, retaining prior deployed modules and installed dependencies. No baked `.env`.
- Frontend image: `sha256:8f8e49fe2b4c9ea53e67df92cc84c96025de00d56eba94481878adcc473b4588`.
- Backend image: `sha256:f5c653de76fa902e138ec77f8423f0149f3035a5bfab4d8e601c64e36081055d`.
- Retained rollback tags: `newsweb-frontend:before-personal-20260928`, `newsweb-backend:before-personal-20260928`. Previous newsletter renderer saved as `mailHtml.before.js` in the release directory.
- Server evidence: `/root/omxsum-market/releases/personal-news-20260928-519e5ec` (archives, build/test logs, scripts, config checksums, cutover and verification records).
- Two initial cutovers automatically restored the previous version because a new health probe assumed a loopback listener. This deployment binds Next.js to the container hostname, not loopback. The corrected probe was verified against that hostname before the final successful cutover. Brief 502 responses occurred during container restarts; subsequent checks returned 200.
- Mongo, nginx and stonks containers were not recreated; runtime configuration checksums remained unchanged.

## Verification

- Backend image suite: 415 passed, two opt-in integration tests skipped.
- Separate local isolated Mongo integration: 43 tests passed.
- Additional real isolated Mongo check: read receipts survive reconnect, isolate accounts, reflect source-copy changes, have a TTL index, and concurrent keyword updates enforce the limit while preserving follows.
- Newsletter renderer on production host: 14 tests passed, using pure render modules only.
- Prior frontend suite: 272 tests passed; landing, membership, preferences and Terminal browser checks passed before release.
- Live public HTTP 200: landing, pricing, Terminal gateway, market, personal landing, full news feed, stock directory, Nanexa, Novo Nordisk, company/market APIs and both screenshot assets.
- Unauthenticated Terminal authority returns 401. Design-system briefing fixture returns 404.
- Real live Chromium at 1440px and 390px: separated landing sections, both screenshot tabs/images, correct plan limits/Terminal entitlement copy, no horizontal overflow and no page errors.
- Newsletter PM2 process online; frontend/backend restart count zero after successful cutover.

Private production-account smoke testing was **not performed**: the safety reviewer rejected a proposed authenticated read of a real user's personal feed. No token was generated and no private data was read by that probe. Local fictional-account browser and isolated persistence tests cover those interactions; actual personalized production source coverage/latency remains unverified.

Unrelated company-briefing roadmap changes and the briefing expansion document were deliberately excluded.
