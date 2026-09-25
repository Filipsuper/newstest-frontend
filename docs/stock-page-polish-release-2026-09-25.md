# Company research section polish — production release

Verified 25 September 2026 at **16:03:14 UTC / 18:03 Stockholm**.

## Scope

The user approved the current design **as-is** after reviewing real companies.
Application revision: `629c13cfef23e7ba3d99f2d9852ddd7e79e21b1f`.
Pushed to `codex/stock-page-polish` and `nextjs`; subsequent release-documentation
commits do not change the application image.

- Live image: `newsweb-frontend:stock-page-polish-629c13c`.
- Image ID: `sha256:b8fbe08c0731b6e757765e1bbc431ea4a88e629131c23158990d564fa4c3baee`.
- Rollback: `newsweb-frontend:before-stock-page-20260925`, image
  `sha256:e5365451a89ebe50ca37c35c630ea52c9239099d4e9798421570a7068d76bfb8`.
- Server release evidence: `/root/omxsum-market/releases/stock-page-polish-20260925-629c13c`.

Only the frontend container was recreated. Nginx configuration was tested and
gracefully reloaded; backend, Stonks, Mongo and nginx container IDs/start times
were verified unchanged. No collector jobs, account changes, extraction activation
or database writes were part of this release.

## Build and verification

- Clean `git archive` of the approved revision; isolated, resource-capped ARM64
  production build on the existing server. No local `.next`, environment files,
  node_modules symlink or real-company snapshot data entered the image.
- Client API: `https://omxsum.com/api`; existing company-alert UI flag preserved
  as true. Runtime API: `http://backend:8000/api`. Email delivery policy unchanged.
- Bundle checks found the production API and new components, no local API URL,
  environment file or review-fixture marker. An initial Unicode grep false
  negative was corrected in verification tooling, not application code.
- 247 unit tests passed again before deployment. The exact revision had also
  passed 58 optimized-build browser checks and the eight-company local review.
- An isolated loopback-only candidate passed homepage, market, stock directory,
  Volvo and LEVEL HTTP checks before cutover. Candidate removed afterward.
- Live `/`, `/marknaden`, `/aktier`, Volvo, LEVEL, Novo and `/api/feed/companies`
  returned 200. Production `/designsystem/segments` returned 404.
- Live browser checks at 390px and 1440px confirmed new news controls, Volvo
  profile and LEVEL agenda, no document overflow, no localhost API calls and
  no guest requests to gated valuation/insider/short endpoints. Profile
  screenshots were visually reviewed. This was not authenticated Plus QA.
- Browser checks recorded recoverable React #418 text hydration warnings on
  LEVEL and Novo (and intermittently Volvo in an earlier run). The affected
  pages rendered and controls remained present. **This was not a zero-error
  browser run.** Diagnose server/client formatting and initial data agreement
  in a follow-up; no application patch was added to this as-is release.
- Frontend startup was healthy with zero restarts; 31,183 MiB disk free after
  release. No cache pruning was necessary.

## Known review findings deliberately left open

1. Multi-company news rows can use the first company's reaction instead of the
   stock being viewed (including Novo/Nanexa and Volvo share-class examples).
   Bind row and reader context to the selected company; never substitute another
   company's price/volume measurement for a missing one.
2. Large financial axis labels can clip; narrow transaction badges can wrap;
   two forecast charts leave a spare third column.
3. Recent short-history ranges are relative to the last observation, which can
   be years old. Named position lists and histories need aligned as-of semantics.
4. Nordic research coverage is sparse; loss-making companies need a meaningful
   available default valuation metric; banks need appropriate financial framing.
5. Old management commentary needs more restrained presentation. Unsupported
   transaction classifications must not imply no insider activity.
6. Report-derived segments, geography and profile risks/opportunities are still
   absent in the reviewed production sample. Forecast EPS is not supplied by
   the current model; the visual redesign does not create new coverage.

The real-company review covered eight companies and 160 section renders. It
was not a numerical reconciliation against issuer reports. The next work is
the targeted correctness/coverage pass above, followed by the report-data pilot
and evidence-backed company signals already on the roadmap.
