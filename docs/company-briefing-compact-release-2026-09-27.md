# Compact company briefings · 27 September 2026

Worker v4 deployed at **08:46:44 UTC**, revision
`fd053b34e188cb7532f372928b357b9b192a787c` on
`codex/company-briefing-pilot-20260926`.

## What changed

- One short headline (maximum 65 characters), 1–2 news sentences targeting
  35–45 words. Hard paragraph limits: 55 words / 420 characters; 240 characters
  per sentence. Schema constraints guide generation; application validation
  rejects overlong copy without truncation or automatic paid repair.
- Keep important qualifications and separate counterparties. The dated price
  sentence remains independently computed by the existing public UI.
- Prompt/model updates and source expiry cannot release an editorial hold.
  A genuine new/corrected source or explicit editorial review is needed.

Only `stonks/company_briefings.py` was installed on the server. The existing
newswire supervisor was restarted; no frontend/backend/database/Stonks web
container was recreated, and nginx did not need a reload. The public UI already
supports the new text. Frontend preview, tests and design rules were pushed as
`96ec9ce`; its development-only fixture is not a production fallback or cache seed.
The running frontend application revision remains `bc3429a`.

## Pilot and controls

The same ten-symbol allowlist and model remain. No daily counters, reservations,
leases or cooldowns were cleared. Limits remain ten attempts/day globally,
two/company/day, two/run, ten-minute settling and 100,000 reserved units/day.
Eight stocks are eligible for compact refresh; SBB and EQT remain withheld.
Nanexa's overnight v3 retry had succeeded before this deployment, consuming one
of today's ten attempts (1,857 input / 279 output tokens, 12,413 reserved units).

The v4 prompt key starts a normal bounded refresh. During settling/pending
generation the site uses its ordinary news fallback rather than presenting old
copy as the new compact result. No fixture or manually shortened paragraph was
inserted into production.

## Verification

- 197 worker/newswire/summary tests pass, including hold survival across prompt
  and model changes, expiry, and normal eligibility after a source correction.
- All 259 frontend tests pass. Local compact layout checks cover 320–1440px,
  both themes, source-dialog keyboard/focus and unchanged 16px typography.
- Live `/`, `/marknaden`, `/aktier`, Nanexa and the company directory API return
  200. The development-only briefing route returns 404.
- Live Nanexa fallback passes desktop/mobile checks during refresh: chart still
  renders, no overflow/page errors/browser model calls. Both held companies'
  overview APIs omit the withheld briefing.
- Installed source SHA-256:
  `cc3334bed30135fab7ded0ca86205cf9542196f5f95ffd2241f63689fc3cc46c`.
- All five existing container IDs are unchanged. Worker imports and policy
  assertions succeeded; live service is active.

## Next expansion, not enabled

A bounded read-only audit of 32 candidate symbols found four additional
companies with currently qualifying news and management context:

| Company | Material event | Why useful for the next evaluation |
| --- | --- | --- |
| H&M | 24 Sep quarterly report | Report/CEO context; distinguish one-offs from recurring results |
| Swedbank | 18 Sep non-performing-loan sale | Mixed benefits and costs; conditional completion |
| ASSA ABLOY | 16 Sep PACLOCK acquisition | Acquired-company sales must not become purchase price |
| Tele2 | 15 Sep commercial-leadership appointment | Quiet/management case; no invented catalyst or generic upside |

Recheck eligibility before activation: the 14-day window will expire for some
items soon. The other tested companies lack qualifying evidence **under the
current selector**, not necessarily all news or report data. One candidate
Freetrailer symbol did not resolve and needs identity lookup, not an empty-data
conclusion. No source thresholds, cohorts or budgets were widened in this release.

Before expanding, review actual compact outputs against original issuer text,
especially reuse of existing AI digests. Source membership alone cannot validate
financial meaning, company attribution or factual correctness. The existing
SBB/EQT holds remain examples to fix rather than bypass.

## Release files and rollback

Remote directory:
`/root/omxsum-market/releases/company-briefings-compact-20260927`.
It contains the source archive, installer, pre-release module backup,
installed checksum, container identity checks and pre-release budget snapshot.
The installer rolls back the single module if imports/restart checks fail.

To stop further generation, disable `COMPANY_BRIEFINGS_ENABLED` in the existing
newswire pilot drop-in and restart newswire. Do not reset the budget collections.
Code rollback restores `company_briefings.before.py` to the exact installed
module path and restarts newswire. Review cached results before re-enabling;
rolling back a prompt version changes evidence keys and is not a budget reset.
Public delivery can separately be disabled with `COMPANY_BRIEFINGS_PUBLIC=0`.
