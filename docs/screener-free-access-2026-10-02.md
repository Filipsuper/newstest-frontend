# Screener search and limited Free access — 2 October 2026

Status: implemented locally; not deployed. Previous live baseline is recorded in
`screener-release-2026-10-02.md`. Frontend and backend must be released together.

## Changes

- Replace the separate text search + closed Select with one reusable Base UI
  `SearchableSelect`. Typing opens matches immediately. Search includes labels,
  short labels, keys, categories and aliases such as RVOL, ROE and P/E, ignoring
  Swedish accents. No match shows an empty state rather than the old selection
  appearing as a result. Base UI retains keyboard/focus/selection ownership.
- Signed-in Free accounts get six actual metrics: price, daily change, market
  cap, annual revenue growth, EBIT margin and P/E. List/sector filtering, sorting,
  column selection and the profitable-growth/low-P/E presets work on the real
  universe, without arbitrary demo rows or automatic trial activation.
- All signed-in accounts keep the compact canonical company-profile diagram
  beside each company name. Only its six public axis scores are exposed in Free,
  without underlying private checks. Profile filters/columns remain Plus/Pro-only.
  Plus/Pro keep all existing metrics. Free members can discover
  advanced metrics and read their descriptions; applying conditions/columns is
  locked. Locked presets explain their constituent metrics and link to Plus.
  Eligible trial CTA wording uses the existing shared UpgradeLink, not a second
  trial workflow. Gratis pricing/landing/FAQ copy reflects the new basic access.
- Shared URLs remove paid rules, columns and sorting for Free accounts, retaining
  valid free rules and list/sector selection. A notice explains the restriction.
- Unknown account/error states do not become free access. Guests must sign in.
  Account/plan changes remount the table, so a previous account's rows/drafts do
  not remain displayed.

## API boundary

`GET /feed/screener` still requires authentication. Its dedicated access
middleware reads membership afresh; no other paid endpoint is opened. Free
payloads allowlist only company identity/quote metadata and the six basic
metrics and the public six-axis profile preview. Insider aggregates, linked-news research and technical metrics
are not present in Free JSON, including after a paid cache hit.

Keep the shared whole-universe 30-second cache server-side; redact per response.
HTTP and browser requests use no-store. Free requests warm/cache public profile
previews without starting paid insider enrichment. A subsequent paid cache hit reads/enriches canonical
research snapshots normally, even when the cache was initially warmed by Free.

No production user changes, email sends, subscription/trial mutations, database
migrations, provider calls or deployment are required to test this pass.

## Verification

- Production build succeeded with the local test API configuration. All 10
  screener browser tests passed against its standalone server. Frontend unit
  suite: 368 passed. Backend unit suite: 401 passed, 2 isolated-Mongo tests skipped.
- Unit tests cover search aliases/categories, Free URL state, strict payload
  allowlisting, fresh membership checks and missing-account/DB failure behavior.
- Route test exercises Free cold → paid cached → Free cached → paid cached,
  preserving the quote-session/currency/annual-actuals invariants.
- Browser regressions cover keyboard selection/dismissal, immediate search,
  empty results, mobile, theme/contrast, real free filtering, paid locks, guest and
  account-error handling, and shareable URLs. Browser accounts/data are fictional.
- Profile-preview follow-up: 9 targeted backend tests passed, covering public
  score redaction, company identity, missing/invalid values, no Free insider
  enrichment and both cold/cached responses. All 10 browser scenarios passed
  individually against the full local dev stack; an initial development-only
  header ID hydration warning disappeared when its scenario was rerun. Free
  radar visibility, mobile layouts and paid filter locks passed on the first run.
