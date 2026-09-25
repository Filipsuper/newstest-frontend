# Company research and coherent Bevakning — 25 September 2026

Released and verified at 08:53 UTC (10:53 Stockholm), with final health checks
at 08:59 UTC. This is a point-in-time operational record, not a deployment script.

## Application revisions

| Service | Source | Image ID (short) |
| --- | --- | --- |
| Frontend | `b501b84f828ab1d8c44d209af264a754a1594d25` | `e5365451a89e` |
| Backend | `29d823591192153fffa083eba6e0628e4fec8a3c` | `043317c2a7259` |
| Stonks | `77b7a7ffd4b5e12b1e55ad954d843f03dbd43cbd` | `c95b6db5c2ce` |

Frontend `nextjs` and backend `main` were pushed. All three repositories also
have `codex/company-research-release-20260925`. Stonks is on that release branch
only: its old, dirty root checkout is not the deployed API source and must not
be used for a future rebuild without reconciliation.

## Shipped scope

- Direct, chronological personal-feed matching/pagination and normalized lexical
  keyword matching. One shared email editor; duplicate overview email CTA removed.
- Compact company financials, public profile, valuation panels and dedicated VD-ord.
- Correct EV/EBIT profile mapping and explicitly dated latest-available VD-ord.
- Seven-quarter qualified model contract with pinned actuals and Yahoo-only inputs.
- Reported-capex alias, complete debt components and explicit cash/debt calculations
  alongside retained provider totals. Missing inputs are not converted to zero.

No email opt-ins or delivery scope changed. No report-extractor activation,
Nordic expansion, bulk provider refresh or source-policy change was performed.
Fixtures remain local and `/designsystem/segments` returns 404 in production.

## Compatibility and rollout

The Stonks release preserves the actual deployed API from
`/root/omxsum-market/releases/feed-performance-20260921/web`, including Nordic
access gates, deferred news and reaction caching. Compatible existing Python
financial refresh/rate-limit changes were retained. The internal Terminal
financial endpoint was not replaced by the public projection.

Sequential, resource-capped production builds and isolated candidates passed
before cutover. Only frontend, backend and Stonks containers were recreated.
MongoDB and nginx container identities/start times were unchanged; nginx was
configuration-tested and reloaded. No cache/image pruning was required.

The financial and model workers were updated under their existing exclusive
locks. `normalization.py`, `financial_refresh.py` and cron schedules were
unchanged. New capex/debt metadata will populate during normal paced refresh;
deployment does not manufacture absent provider data.

## Checks

- 240 frontend unit tests, producer Python financial/source/model tests,
  producer web tests and TypeScript, backend suite and all three Linux builds passed.
- Candidate and live read-only checks passed for Yahoo source selection,
  calculation/provider-total separation, VD-ord fallback, EV/EBIT profile coverage,
  Plus/public access boundaries and the existing Nordic prices.
- Live personal-feed scan covered 633 stories, returned 20 direct matches and a
  non-overlapping older page; private/no-store preserved. This is one snapshot,
  not proof of exhaustive matching quality on every news day.
- Public routes returned 200. Chromium at 390px and 1440px verified Marknaden
  and Volvo profile without horizontal overflow or page errors; screenshots inspected.
- Final containers had zero restarts; approximately 32 GB disk remained available.

## Forecast coverage: no new forecasts qualified

The normal model refresh inspected 1,510 companies, wrote **zero** model rows,
and locked 85 existing estimates whose actual period had reported. A private
backup of all 880 pre-refresh estimate rows is retained server-side.

Active Yahoo histories: 617 companies have five quarters, 179 have six, 27 have
seven; 652 have none and 35 have two to four. All 27 seven-quarter histories
failed input qualification: 24 had missing revenue and 10 had non-positive
revenue (overlapping categories). There were no other input rejection reasons
among these 27. The API check found no unlocked qualified model rows to publish.

The seven-quarter implementation is live, but it does not yet add forecast
coverage. Next work is retaining/backfilling usable source history, not weakening
guards or silently mixing report-extracted inputs. Annual horizons, EPS and
immutable forecast revisions remain separate work. Latest-quarter capex for
NIBE/MYCR/WYLD remains genuinely absent in the audited provider data.

## Evidence and rollback

Server evidence and source archives:
`/root/omxsum-market/releases/company-research-20260925/`.
This includes build/candidate/cutover logs, source checksums, worker installation,
refresh results and rollback image references. `worker-backup/` is private;
its estimate snapshot includes manual values and must not be published.

All image repositories retain `before-research-20260925` rollback tags:
frontend `03e384334282`, backend `8ee593e77c83`, Stonks `46d28db75b10`.
Rollback must restore a compatible application set; worker files and database
locking changes are separate from container rollback. Reinspect runtime state
before any recovery action. Original local development worktrees were preserved.
