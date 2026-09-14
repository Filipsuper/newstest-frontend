# Nordic company prices — deployed 14 September 2026

Uses the same company page, Base UI range controls, flat chart, ChangeBadge,
Geist typography and source metadata as Swedish stocks. No new chart component
or alternate layout. The Terminal is unchanged.

- The API's `priceCapabilities` identifies the isolated pilot. Approved minute
  snapshots poll through the existing public company/intraday route every five
  minutes while visible; they never open a tick stream. Hidden tabs skip requests
  and returning tabs catch up. Refresh failures retain the last snapshot.
- Polling runs on daily-history views too, keeping the headline price current
  without refreshing the entire page or pretending the daily chart is intraday.
- The chart/header use the native trading currency ahead of financial reporting
  currency. The compact report navigation receives that same currency.
- Source and quote time remain visible: Yahoo Finance, with a quiet potential-
  delay label for snapshots. Poll time is never shown as the last trade.
- The bridge retains the exact daily-close reference, recognizes the first quote
  of a new session and marks appended quotes as observations, not OHLC candles.
- Missing/revoked prices stay missing and empty intraday data ends loading.

Verified with 159 frontend unit tests and three new Chromium cases at 390px and
1440px: snapshot refresh, no Nordic stream attempts, attribution/currency,
no page overflow, explicit empty state and preserved Swedish stream setup.
The browser cases use fictional fixtures; screenshots were visually inspected.

Deployed and verified at 13:01 UTC, with all four display policies enabled after
the attribution-capable frontend was live. Public summary, daily, intraday and
stock-page checks passed for each pilot; Hove's rendered daily/intraday UI was
also checked. See [release history](release-history.md#nordic-company-prices--released).
Production collection remains unchanged. The owner confirmed attribution-based
Yahoo use; the stored rights status remains unverified, not independently certified.
Freetrailer, Nordic RVOL and event reactions remain outside the display rollout.
