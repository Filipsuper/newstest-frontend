# Company briefing · Nanexa prototype

Local review, 25 September 2026. Not deployed and not an automated analysis service.

## Cached integration · 26 September

The approved gradient now applies to qualified saved `mode: generated` briefings
as well as the explicitly supplied local prototype. `/aktie/[symbol]` consumes
the existing overview API's optional `briefing`; no new endpoint, page-triggered
generation or mutation was added. The backend's public flag remains off.
Unknown modes and prototype records received through the ordinary API cannot
bypass generated-record validation. Expiry is rechecked when its deadline is
reached and on tab return; absent/expired data restores the existing news context.

The production price sentence is composed from the same quote used in the
company header, not the prototype's fixed number or a field in the model cache.
It retains source timestamp, currency and listing timezone and verifies the
previous close against the quote's reported daily change. Missing/old/future,
wrong-company, missing-currency or inconsistent-adjustment inputs omit only
that sentence. It never sends quote changes to a model. One-week versus intraday
chart selection cannot redefine the sentence as a period return. Source and
baseline details remain behind the existing dialog.

Company chart lines now use linear segments, including intraday, comparison
and moving-average series. The company OG renderer uses the matching tested
linear path helper, retaining null gaps and actual points. Financial charts and
profile-diagram geometry are unchanged.

For local end-to-end QA, the snapshot API can run with
`COMPANY_BRIEFING_REPLAY=1`. It replays the saved approved model response through
the actual backend reader, using an in-memory database double and the frozen
review-time verification clock. This is not a running worker, a production
Mongo record, or evidence of live freshness. It enables testing the ordinary
`/aktie/NANEXA.ST?range=1w` route without a new model call or database write.
The default snapshot API and explicit design-system prototype remain separate.

Regression coverage includes saved-reader cold/cache hits, withdrawn/expired
fallbacks, no write/model paths, quote reconciliation, Nordic currency/timezone,
and straight share geometry. Public activation and deployment remain separate.

Validation for this integration: 258 frontend tests pass; 388 backend tests pass
with two existing integration tests skipped (offline placeholder API key used
only to construct the existing mocked client). The real company route passes
desktop/mobile checks in both themes, including daily/intraday/2-day, comparison,
moving-average paths, source dialog and price-text consistency across ranges.
An accelerated browser-clock check verifies the news fallback when a cached
briefing expires while the company page is already open.
The company OG route returns a valid 1200×630 PNG. The explicit prototype also
passes its 320/390/820/1440px checks. No production build/deploy was performed
in this integration pass.

26 September update: two real Nanexa model requests were evaluated separately.
The first used 1,696 input / 483 output tokens and failed the length gate at
133 words. The revised prompt used 1,940 input / 307 output tokens and passed
structure at 81 words. Its development-target qualifications and separation of
independent agreements still need editorial improvement, so neither response
was published. A third news-plus-price draft was subsequently approved for
local UI review; it is now the default visual prototype described below.

## Gradient and price prototype · 26 September

The local route now shows the approved 92-word composition: three generated
news sentences followed by one code-composed, dated daily-change sentence.
`nanexa-price.json` retains the exact approved news prose and separate quote
inputs; the original `nanexa.json` remains as the earlier reviewed draft.
The prototype UI recomputes the percentage from the saved price and previous close,
formats the observation time in Stockholm, and omits the price sentence if
its inputs are unavailable or invalid. The cached integration above uses the
independent header quote instead; the generated text contract is unchanged.

The container has a static amber radial gradient, strongest at the upper-right
corner (16% brand accent mixed into the existing surface), fading into the
normal card. This is a user-requested, company-briefing exception to the usual
flat surfaces. Shared typography, 16px radius, padding, source button and Base
UI dialog remain. No extra kicker, badge, border, glow or animation. Light and
dark modes use their existing semantic tokens; forced-colors mode removes
the gradient. It does not change color with stock performance.

Price provenance and the previous-close basis live in the source dialog rather
than adding explanations to the card. The dated snapshot is not labelled live
or a closing quote, and does not attribute the move to the news. No new model
request, backend write, push or deployment was made for this visual pass.

## What the prototype tests

Replace the latest-headline panel beside the price chart with a short, sourced company briefing. The chart and quote remain independently sourced; the text does not claim to explain a percentage of the price movement.

- One headline and one continuous description, incorporating deal economics and manufacturing progress without separate subheadings or lists.
- No “Nästa rapport” row or additional kicker. The dated calendar context remains in the sources dialog and the existing company calendar.
- One “Källor & bakgrund” dialog for primary-source links and the older management context.
- A local “Nuvarande vy” toggle to compare with the existing page.

The panel uses the shared typography, spacing, surfaces, buttons and Base UI dialog. It sits beside the company heading, quote and chart on desktop, and follows the chart in normal document flow on smaller screens. No nested scrolling list is introduced.

## Evidence and selection

Read-only Nanexa overview, prices, financials, reports and news were captured at 2026-09-25 19:15:42 UTC. The external snapshot stays outside this frontend repository. The checked-in draft contains public-source paraphrases and claim-level source references only.

1. Nanexa’s 24 September Novo announcement: signed global licence/collaboration, up to five PharmaShell programmes. The maximum EUR 1.165bn is conditional. EUR 615m combines upfront and development/regulatory milestones; the announcement does not disclose the upfront amount separately.
2. Nanexa’s 22 September Forge Nano announcement: development of manufacturing capability, not an already-completed production facility, and not described as exclusive to the Novo programmes.
3. Q2 report published 27 August, CEO commentary: advanced active licence negotiations and formulation development. The report does not name the negotiating counterparty. It is dated background, not proof that Novo was identified then.
4. Issuer calendar carried by MFN: Q3 report on 5 November. Calendar observation time is separate from a publication date.

The original draft's URLs are in `app/designsystem/company-briefing/nanexa.json`.
The new default, `nanexa-price.json`, cites the two news sources used in its
prose and exposes them in the same dialog alongside independent price context.
Link-only third-party articles were not used as synthesis inputs. Older cash-runway statements were not promoted into current facts after a later agreement. Generic macro context was omitted because no specific supported connection added value here.

## Boundaries

The preview is a manually reviewed AI-authored draft over an actual data snapshot. It demonstrates presentation and editorial usefulness, not production generation quality or fresh analysis. The next local slice now implements a disabled-by-default producer worker, read-only backend delivery and optional company-page consumption. The separate paid evaluations above did not enable a scheduled summarizer, write the production database, change provider collections or accounts, push or deploy.

The preview route requires `NODE_ENV=development` and an explicit server-side `COMPANY_BRIEFING_SNAPSHOT` path. Production always returns 404. `/aktie/[symbol]` never imports the prototype or snapshot. Its CompanyPage can now consume an optional saved API `briefing`; without that record it retains the existing news context. The presentation validator rejects missing/orphaned sources, unsafe links, malformed records, expired generated briefings and mismatched company symbols. The generated variant is labelled AI-sammanfattning, never as a manually reviewed draft.

## Local review

Preview: `http://127.0.0.1:3112/designsystem/company-briefing`

The isolated preview API on port 8102 serves only captured data, rejects writes and marks its quote update mode as a snapshot. The existing preview on 3111 was left alone. The dev server uses `NEXT_DIST_DIR=.next-briefing-dev`; use `.next-briefing-build` for independent production checks.

Verification: 253 frontend unit tests pass. Browser checks pass at 320, 390, 820 and 1440px: one heading and one description with the approved dated price sentence, actual chart render, no horizontal overflow, light/dark briefing accessibility, source-dialog accessibility, 44px source control, Escape/focus return, forced-colors fallback and current-view comparison. Source controls have scroll margins to stay clear of the sticky mobile navigation during programmatic/focus scrolling.

Production compilation and page generation completed (exit 0). A local standalone trace-copy warning reported EPERM for Sharp's `versions.json`; this local artifact is not a validated deployment package. A separate local production-mode server returned HTTP 404 for the prototype even with the snapshot environment variable configured, with no draft headline in the response. That temporary server was then stopped.

## Recommendation after review

The synthesis gives this example substantially more context than a latest headline: what changed, what the headline payment means, and how an adjacent operational announcement fits. It should remain a short overview, not a substitute for the news feed or a confident attribution of price causality.

Before making this automatic, test contrasting cases (quiet company, conflicting announcements, old management commentary, report-driven move). Then build a source-qualified backend contract with exact company identity, bounded freshness, claim-level citations, explicit publication/observation dates, material-update invalidation and a safe no-briefing fallback. Keep quotes outside the model text and include macro only with specific documented company exposure. Do not treat this one reviewed draft as validation of a model pipeline.
