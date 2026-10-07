# Screener sharing image

`/og/screener` is a static 1200×630 PNG for `/aktier/screener`.
`SCREENER_OG_IMAGE` owns its versioned URL and alt text; both Open Graph and
Twitter use this image. Generic pages keep `/og/home`, and company/story/letter
images remain unchanged. `/screener` still redirects to the canonical route.

The composition follows the existing site artwork: warm canvas, bundled Geist,
brand lockup, large benefit headline, tilted dark product view and a small white
benefit card. Results show canonical rounded profile geometry and one comparable
metric, not a fictional full-market ranking or an interactive filter.

The three FY2025 examples reuse `LANDING_SCREENER_EXAMPLE`, with genuine zero
profile scores and public provenance retained there. The visible caption states
the fiscal year and capture date; the product view is labelled Exempel. These
are dated marketing examples, not live data or an investment recommendation.
Rendering needs no market/API/account calls or remote font requests.

Build with an isolated `NEXT_DIST_DIR`. Inspect
`server/app/og/screener.body` inside that build and the 600×315 thumbnail saved
by `tests/browser/screener-og.spec.js`. Check legibility, filled profiles and
all three margins before updating the artwork/version.
