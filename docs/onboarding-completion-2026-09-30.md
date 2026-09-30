# Onboarding completion and trial visibility — 30 September 2026

Frontend implementation **deployed and verified on 30 September at 13:58 CEST**. Extends the released
account-first flow without changing account creation, billing, trial eligibility,
newsletter subscriptions or company-email consent/delivery.

## Completion

- Keep `/kom-igang` and newsletter confirmation's shared final step. Use the
  reading-width container, shared Stack/Inline, typography, buttons, labels and
  list rows; normal page scrolling, no nested panels or celebration animation.
- Put active Plus/Pro access above the primary personal-news action: remaining
  time, actual unlocked capabilities and a Settings handoff. Do not repeat
  expiry/free-continuation/payment copy on this welcome screen or offer/start
  another trial. The email step keeps a compact plan/time-remaining label.
  Settings replaces the regular plan label with the same single trial label;
  no duplicate trial block. Settings and pricing expose the exact end date and
  clearer terms in a shared tooltip available by hover, keyboard focus and tap:
  "När provperioden är slut fortsätter du med gratisversionen. Ingen automatisk
  betalning." The explicit no-card offer remains unchanged.
- Show up to three saved follows in their existing order, with real directory
  names/tickers and encoded `/aktie/<symbol>` links. Missing names fall back to
  the saved symbol; no per-company quote/profile calls or invented market data.
- Follow with the morning letter and discovery/Screener; Terminal only for Pro.
  Actual matching news and the existing truthful letter/email summary remain.
  The no-preference route goes to Marknaden, not a supposedly personalized feed.
  Editing keeps preferences and trial eligibility intact.

## Persistent status

- A small trial badge appears in normal public navigation, linked to
  `/settings#plan`; account setup retains its focused header.
- Trial labels use the unchanged shared Label typography, padding and radius.
  Header links and Settings tooltip buttons remain transparent 44px hit targets
  around the label, not enlarged/pill-shaped yellow controls. The displayed
  countdown is actual time remaining; less than a day never reads as zero.
- Validate the active status, known plan and finite future end date before
  showing it. Countdown updates once a minute/on visibility; server account and
  expiry logic continue to own authorization. Hide the header badge on unknown
  account refresh, expired/converted trial or normal paid membership.
- At mobile widths the badge occupies a separate header row. The shell exposes
  its measured `--ui-header-height`; company contents, financial table header,
  watch-editor tabs and Settings anchors stay below it. Report scroll-spy and
  tests read resolved CSS lengths rather than parsing unresolved `calc()`.

## Verification

- Offline unit tests cover follow ordering/bounds, missing names, route encoding,
  countdown boundaries and inactive/malformed/expired states.
- Isolated browser fixtures cover explicit trial activation through completion,
  independent newsletter/email consent, reload, Free/Plus/Pro/expired variants,
  bounded long names at 320px, Settings handoff and sticky stock navigation.
- Both themes, mobile widths, overflow, keyboard/focus and accessibility are
  checked with fictional accounts. No production account or real sender is used.
- All 306 frontend unit tests and the optimized local build passed. The broader
  121-case browser run passed 117 initially; three development-server fixture/
  timing failures and an overly strict desktop-only test assertion were followed
  up. The desktop assertion was corrected (side navigation is alongside, not
  above, the reading area). All eight targeted checks passed on the optimized
  build, covering the four initial failures and all trial/completion widths.
  The fixture-configured build is for local verification, not deployment.
- After simplifying trial copy, all 306 unit tests and the three full trial
  flows at 320/390/1440px passed again. They check the quieter welcome screen,
  compact email-step status, exact Settings end date, clearer Settings/pricing
  terms and unchanged independent consents, plus both themes/accessibility.
- The compact-label pass passed all 306 unit tests and seven focused browser
  checks, including matching the header/Settings label geometry to the standard
  brand label, 44px transparent targets, keyboard/click tooltip details, Axe
  checks, sticky navigation and converted/expired states. One initial fixture
  seeded the final stage before setup had finished and lost it to initialization;
  both completion-state fixtures now seed sessionStorage before page load.
  Final run: seven passed. The user’s full localhost stack remains running.
- Deployment must stage the scoped changes on the latest frontend release,
  retaining already deployed valuation features and excluding unrelated local
  valuation/About work. No backend deployment is required for this change.

## Production release

- Source revision: `61de68daf97ce88c47e9d3b13948106a5417b24e`, pushed to
  `origin/nextjs`. Preserved the already deployed annual-estimates baseline and
  the concurrently completed model-profit policy; unrelated local work excluded.
- Final combination: 317 unit tests, seven onboarding/browser checks and eight
  estimate regression/browser checks passed. ARM64 production image built on
  the server with production API URL and the existing alerts flag.
- Verified isolated candidate before replacing frontend only. Public homepage,
  setup, confirmation, plans, settings, Terminal, market/watch/news, stocks and
  Nanexa routes returned 200; company/market APIs returned 200; unauthorized
  Terminal API remained 401; development briefing route remained 404.
- Live image: `sha256:1b95b6a5f8face36889c30e3152f5622e35fa6869c58fa09d68cd5145b163f21`.
  Container running with zero restarts; image revision matches the source.
- Backend, stonks-web, MongoDB and nginx container identities/start times stayed
  unchanged. nginx configuration was tested and reloaded only. Backend environment
  and Compose checksums unchanged. No account, email, worker or database writes.
- Exact prior frontend image retained as rollback. Removed only this release's
  temporary candidate container; no images, build caches or user data pruned.
- Server evidence: `/root/omxsum-market/releases/trial-labels-20260930-70db946/`
  (`candidate.verified`, `live.verified`, source checksum, protected fingerprints,
  config checksums, build/cutover logs). Directory name reflects the initial UI
  revision; the actual final source/image revision is `61de68d`.
