# Screener company drawer — local, 2 October 2026

Not deployed. No backend, production data, membership or billing changes.

## Interaction

- Normal company-name clicks open a right-side Base UI Dialog drawer on the
  existing screener. Canonical links remain available for modifier/new-tab clicks.
- `company` joins the existing URL-backed rules/list/sector/column/sort state.
  Back/Forward closes/reopens; direct links work without navigating away on close.
- Previous/next use the complete filtered/sorted result, including rows beyond
  the first 50. Navigation does not reset the underlying table.
- Mobile uses the full viewport, a persistent header and a single content scroll.
  Closing restores the originating link's focus and the screener's scroll.
- The existing intercepted news reader opens above the drawer. It owns focus and
  dismissal until closed; the company and its reading position remain underneath.
- Entrance is 360ms, exit 160ms; reduced motion disables both. Mount the lazy
  Dialog root closed before opening (otherwise its initial entrance is skipped).
  Focus the heading without scrolling and clip the viewport rather than creating
  an overflow-hidden scroll container: native focus scrolling previously offset
  the slide transform, making it jump. Frame-sampled regression tests cover cold
  and cached openings at 320/390/1440px, fixed width, monotonic translation and
  zero viewport scroll.

## Contents and loading

The shared company chart has an opt-in compact layout (240px plot). Its period
controls do not modify screener query parameters. Latest news uses shared brief
rows, followed by up to six selected comparison metrics and the canonical public
profile already present on the screener row. No frontend profile calculation or
additional per-row profile requests. Follow-company and full company-page actions
remain available; the business description is collapsed.

Load the drawer code only when first opened. Successful overview responses use a
30-second, 12-entry in-memory cache owned by the mounted account/plan-scoped
screener. Superseded requests abort; response identity must match the selected
company. Missing/error states remain explicit with retry. There is no background
all-company prefetch or durable private browser cache.

## Verification

- 371 frontend unit tests pass, including URL preservation, identity validation,
  bounded cache and shared metric formatting.
- Production build succeeds in an isolated build directory.
- 25 browser tests pass against the production build with fictional data/accounts:
  mobile 320/390px, light/dark,
  keyboard/accessibility, filter/sort continuity, Back/Forward, revisits without
  another completed overview read, mismatched responses, aborting old responses,
  reader layering and the existing company chart/page access boundaries.
- Keep the normal local dev stack running for review; a separate production
  preview is used only for regression testing. No emails, account writes or
  production deployment are performed by these checks.
