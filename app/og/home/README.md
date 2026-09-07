# Site sharing image

The static `/og/home` PNG is the default image for generic public pages.
`SITE_OG_IMAGE` in `app/utils/brand.js` owns its versioned URL, dimensions and alt
text. Change the version whenever the artwork changes; keep the base route and
legacy `public/omxsum_og.jpg` available for existing links.

## Design

Original OMXsum composition inspired by the benefit/product split and angled
product view in https://unhidden.so/og-image.png, inspected 7 September 2026.
No Unhidden assets are bundled. Geist fonts are locally bundled under SIL OFL
in `public/fonts/`; the illustration uses the public site's exact light/dark
palette and shared percentage formatter. Story-specific OG routes are separate.

## Data and updates

`preview.json` is a small snapshot of two real, public issuer stories captured
from `/api/feed/market-overview` on 7 September 2026. It keeps the original
headline, public source, publication time, observed reaction and quote time.
The image labels the snapshot date and the since-publication reaction period.
It is a product illustration, not an automatically updating market report.

To refresh it, explicitly capture new public examples with their provenance,
retain missing values rather than inventing figures, and inspect the render
for long headlines and clipping. Do not add private watchlists, account data,
fictional company results or an API call during image rendering.

Run the unit/browser tests and an **isolated** production build. The generated
PNG is `.next/server/app/og/home.body`; inspect it directly or request `/og/home`.
Tests verify public fallback metadata, crawler HTML, dimensions, provenance,
font assets and preservation of the dedicated story/company/article images.
