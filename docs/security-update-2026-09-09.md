# Frontend dependency security update

9 September 2026. Scoped frontend security patch; production release status is
recorded in [the release history](release-history.md). Keep this patch separate
from news-data changes and the pending editorial/favicon work.

## Dependency changes

| Package | Released lockfile | Patched lockfile |
| --- | --- | --- |
| Next.js | 15.5.22 | 15.5.25 |
| Sharp | 0.34.5 | 0.35.4 |
| Next's PostCSS | 8.4.31 | 8.5.28 |
| nanoid | 3.3.16 | 3.3.18 |

The direct PostCSS version also advances from 8.5.25 to 8.5.28. Next remains
on its 15.5 patch line. Scoped overrides make Next reuse the patched PostCSS
and prevent Sharp from resolving back to the vulnerable 0.34 line. Next
15.5.25 explicitly accepts Sharp 0.35.4. No application rendering, news
ranking, account, billing, collector or database logic changes are included.

## Advisory basis

- [Next image-optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
  identifies AVIF processing as a possible remote-code-execution path.
- [The Windows-specific Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
  does not describe the Linux production host, but is covered by the same patch.
- [Sharp's advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)
  specifies 0.35.4 or newer for the affected bundled image dependencies.
- [Next 15.5.25](https://github.com/vercel/next.js/releases/tag/v15.5.25)
  restores AVIF optimization when a newer, patched Sharp is installed.

The pre-update audit reported three high and one critical package finding.
Both the full and production-only patched audits report zero known findings
as of this check. This is dependency-advisory coverage, not a claim that the
application is vulnerability-free. No exploit payloads or production attack
tests were used.

## Verification and release gate

Passed: 69 unit tests and all 121 Chromium browser tests on the isolated
production standalone build. The full working checkout also passes 77 unit
tests, including its unrelated, unreleased ranking tests. Full and runtime-only
audits report zero known vulnerabilities. The Linux container check below is
still a release gate, not something the macOS tests have established.

- Clean checkout based on released application source, with only this patch.
- Production compilation/standalone tracing and local runtime verification.
- Regression tests enforce known vulnerable-version floors, ARM64/musl lockfile
  entries, and Next's actual Sharp path using tiny, trusted PNG/AVIF inputs.
- Browser regression covers news dialogs, company pages, account boundaries,
  mobile layouts, optimized Terminal images and all three social-image types.
- `npm run test:security` repeats the advisory audit and fails on high/critical
  findings. Unit version floors complement this command; they do not replace it.

Before a separately approved deployment, build the production image using the
existing capped release procedure. Confirm Node >=20.9 and musl >=1.2.5 in the
ARM64 Alpine runtime, and smoke-test the optimized Terminal image and OG routes
from the built image. macOS native tests and ARM64 lock entries do not substitute
for running the final Linux native libraries. Rebuild with the production API
URL; never ship the local fixture-backed test build. Retain the running image
as rollback and verify public routes after the swap.

The first Linux candidate was stopped before swapping: standalone tracing omitted
Sharp's `@img/sharp-libvips-*/versions.json`. Next correctly kept AVIF decoding
disabled because it could not establish the bundled libheif version. The scoped
`outputFileTracingIncludes` entry retains the actual package metadata; no safety
checks are bypassed and no versions are fabricated. `npm run test:standalone-images`
now exercises PNG/AVIF decoding from the built standalone tree, not development
dependencies. See [Next's tracing guidance](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output).

Test-only cleanup during the broad regression: the no-AI fixture has distinct
facts so it cannot collapse into another story in the company deduper; a legacy
company-link test waits for streamed markup to settle before asserting section
content. No production deduplication or access-control behavior was changed.
