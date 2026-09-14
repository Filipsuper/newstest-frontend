# Company chart timeframes

Implemented locally after the 14 September Nordic-price release. Not deployed.

`app/utils/companyChartRanges.js` defines the same periods for the company
chart, metadata and generated share image. The existing one-year default and
longer ranges remain. New options:

- `2d`: all available intraday observations from the latest two stored trading
  sessions, including the full previous session. The current session may still
  be open. No empty weekend candles or fabricated prices are inserted.
- `1w`: the latest five stored daily bars.
- `1m`: the latest 22 stored daily bars.

Daily windows retain the existing historical-price contract, rather than
combining a partial quote with a completed daily candle. Header daily change
and selected-period share return remain distinctly labelled.

The backend adds `previousFull` to `/feed/company/:symbol/intraday`; its existing
`previous` tail, current observations, quote, currency and baseline are retained.
This reuses the bounded 1,800-minute API read and requires no new collection,
provider calls, database or Stonks change. Deploy the compatible backend before
the frontend. If full prior-session data is absent, the UI says so and the
two-day OG card does not invent a two-day return from the one-day context tail.

The 1d/2d switch reuses the active snapshot/stream without reconnecting. Nordic
five-minute polling stays separate from Swedish SSE. Session rollover retains
the previous full series, and incoming live observations no longer trim away
the morning once a 700-point tail is reached. Stored OHLC/volume is not rewritten.

The Base UI controls use a 4×2 layout on phones and existing desktop styling.
The price plot and matching OG image are grid-free; axes, volume and the
intraday session divider remain. Other financial-chart grids are unchanged.
Intraday labels show venue-local time; two-day labels also include dates. Native
currencies are preserved in tooltips and share images, with Yahoo attribution.
No access, alerts, registry, reaction or RVOL behavior changes.

## Verification

- 165 frontend unit tests and 340 backend tests passed (two optional backend
  integrations skipped). The additive backend contract has a weekend/full-session
  regression while retaining the old one-day context and daily-close baseline.
- Five new Chromium cases passed: 320/390/1440px, range/data counts, reload and
  metadata, share PNGs, stream reuse and empty Nordic data. The three existing
  Nordic cases also passed. Screenshots and 600×315 share previews inspected.
- Broader company/share run: 20 passed, one unrelated failure. The existing
  desktop report test expects exactly one insiders request but observed two
  in development. The same assertion failed on clean baseline `1108712` in
  `/private/tmp/omxsum-timeframes-baseline.oWYUZj`; it was not changed here.
- No production build, push, deployment, collector or production-data write.
