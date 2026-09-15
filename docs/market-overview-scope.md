# Swedish market overview and Brent oil

Implemented locally on 2026-09-15; not deployed.

## Scope

- Frontend: `site` (also staged against the current release checkout).
- Backend: `backend-market`, a clean worktree based on production `ed252c3`.
  Do not substitute the older, dirty `backend-alerts` checkout when releasing this change.
- Market API: `reaction-producer/web`.

The overview requests `market=se`. The Market API applies the listing predicate
before sorting and limiting: Swedish venue metadata, Swedish canonical symbols
or legacy .ST symbols. Mixed-company stories qualify if one listing is Swedish.
Company-less Riksbank releases remain. This is not a language or domicile filter.
The client also scopes initial data and live frames; normal news, personal
watchlists, company detail, ingestion and email qualification are unchanged.

Brent uses Yahoo Finance BZ=F (Brent Crude Oil Last Day Financial Futures), not
spot oil. The backend validates symbol, type, USD, price and quote timestamp;
change compares against the provider's previousClose. Refresh is single-flight,
cached for five minutes with a four-second timeout. Failed refreshes retain the
original timestamp and are labelled delayed. An initial failure stays missing.
This does not claim verified realtime or use the equity session calendar.

## Release order

Deploy the Market API's additive market=se support, then the backend and frontend.
The frontend defensively filters older responses too, but only the new API filter
prevents foreign stories from consuming the bounded candidate pool. Existing
unrelated insider-email changes are not part of this release.

## Verification

- Frontend unit suite: 169 passing.
- Oil adapter unit checks: valid quote, unavailable fields, identity/currency,
  future timestamp rejection, single-flight/cache and failed-refresh provenance.
- Provider smoke test: real BZ=F response accepted without inventing missing data.
- Browser checks: Swedish-only overview, foreign SSE exclusion, full-feed
  preservation, missing oil, phone/desktop layout and existing live updates.
- UI.md documents the scope and compact oil widget.
