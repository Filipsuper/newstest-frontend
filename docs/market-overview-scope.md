# Swedish market overview and Brent oil

Deployed and verified on 2026-09-15 at 20:11 UTC.

Runtime revisions: frontend `3082037`, backend `e4c404d`, Market API
`24870c0` applied to the exact live-compatible `5ccf702` release source.
The older dirty `/root/stonks` checkout was not replaced. The new Market API
build source and rollout logs are retained at
`/root/omxsum-market/releases/swedish-oil-20260915/`.

Production checks returned 100 Swedish-scoped overview stories and seven mover
stories; the unrestricted 100-story API sample still included 66 foreign stories.
Brent had a valid USD quote and source timestamp. Nordic Hove and Swedish Volvo
instrument reads remained available. Browser checks at 320/390/1280px passed
without horizontal overflow or page errors. All three app containers are healthy;
Mongo was not restarted and the reaction service/session timer remain active.
Rollback images are tagged `before-swedish-oil-20260915`. Only this deployment's
new intermediate build layers were removed; no existing images or data volumes
were pruned. Approximately 2.6 GiB disk space remained after release.

## Scope

Follow-up deployed on 2026-09-15 at 20:38 UTC: all four widgets share
`MarketQuote`; Brent displays real five-minute session points from the existing
provider response. Removed the market-breadth row and global quote-time footer.
Frontend `796f339` and backend `928ac7c` are live; the running Market API image
was unchanged. Session bounds follow the futures provider, including overnight
trading. Missing/invalid points are never zero-filled or fabricated.
Live checks verified 96 real Brent points, identical desktop widget geometry,
removed breadth/footer text and no page overflow/errors at 320/390/1280px.
Rollout evidence: `/root/omxsum-market/releases/brent-layout-20260915/`.
Previous frontend/backend images retain `before-brent-layout-20260915` tags.
Only this build's new intermediate layers were removed; data volumes and
pre-existing images were retained. About 2.4 GiB remained free afterward.

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
