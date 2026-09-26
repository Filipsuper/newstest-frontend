# Company briefing pilot · 26 September 2026

Frontend/backend cutover verified at **08:50:11 UTC**. The user authorized
automatic generation for ten companies. The worker started at 08:46 UTC with
the normal ten-minute settling period; no fixture was seeded into production.

## Released scope

- Approved subtle-gradient briefing beside the chart, one headline and one
  paragraph, dated AI label and source dialog.
- Cached generated news text only. The price sentence is computed separately
  from the same quote shown in the header, with previous-close reconciliation.
- Linear price, benchmark and moving-average lines; matching share-chart
  geometry, with the content OG cache version bumped to 5.
- Read-only company-overview briefing delivery, safe fallback on absent,
  withdrawn, expired or unverified records. Page requests cannot generate.
- Source-qualified worker in the existing newswire supervisor and existing
  `stonks` database. No new database, per-user synthesis or extraction backfill.

## Initial cohort and cost controls

| Company | Symbol |
| --- | --- |
| Nanexa | NANEXA.ST |
| Saab | SAAB-B.ST |
| Evolution | EVO.ST |
| SBB | SBB-B.ST |
| Freemelt | FREEM.ST |
| ABB | ABB.ST |
| AstraZeneca | AZN.ST |
| Sivers Semiconductors | SIVE.ST |
| EQT | EQT.ST |
| Alfa Laval | ALFA.ST |

All ten had qualifying recent primary-source news in the read-only audit.
Eight also had eligible dated management commentary. The Nordic candidates
checked did not pass the same source gate; requirements were not lowered.

- Ten attempts total per UTC day, at most two per company/day and two per cycle.
- Ten-minute source settling, sixty-minute spacing for repeated company attempts.
- 100,000 conservative reservation units/day, 20,000 request bytes, 1,000 output
  tokens/request. These are bounds, not a billable-token or monetary guarantee.
- Failed attempts count. Unchanged content, page visits and quote updates do not
  generate. A large input or rejected output can leave fewer than ten ready rows.
- Model remains `gpt-5.4-nano`; no automatic larger-model fallback. Prompt v3
  promotes the separately reviewed news-plus-independent-price composition.

The OpenAI Docs check retained strict structured output and explicit rejection
of refusals, incomplete responses and unsuitable copy. Schema validation does
not establish factual accuracy; see the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).

## Revisions and packaging

- Frontend `bc3429a5526a3e09e8fb2e980d51cca2af69af92`, pushed to `nextjs` and
  `codex/stock-page-polish`.
- Backend `8ba2d642dd0cc3863059910a07a917477a4e6ef6`, based on the deployed
  `29d8235`, pushed to `main` and `codex/company-briefing-release-20260926`.
- Producer `0a0df71` plus safe-diagnostic follow-up `99c48d2`,
  `codex/company-briefing-pilot-20260926`, based on `e789802`.
  Only the two briefing modules, CLI and tiny newswire hook were installed;
  unrelated dirty producer files and the Stonks web image were preserved.
- Remote release: `/root/omxsum-market/releases/company-briefings-20260926`.
- Frontend image: `sha256:ea2bc71758dba9169cea8204c54051d48512fc2d8eb8c63fda180facf6830c7d`.
- Backend image: `sha256:af79c100ce80948bdd0e7e0859f3031978b96daeb213d8bc76e12e3ef7e92d26`.

Clean Git archives were built sequentially with CPU/memory limits, then checked
in isolated loopback candidates. No `.env`, local fixtures or development build
trees were packaged. Candidate email delivery was explicitly disabled; the live
email pilot and reaction/preferences flags remained unchanged.

## Verification

- 258 frontend tests passed; 388 backend tests passed, two existing integration
  tests skipped; 193 producer/newswire/summary tests passed after the diagnostic
  and editorial-hold regression additions.
- Candidate and live checks: `/`, `/marknaden`, `/aktier`, Nanexa, Volvo, Novo,
  company directory API and Nanexa overview returned HTTP 200.
- `/designsystem/company-briefing` returned 404 in production.
- Live desktop (1440px) and mobile (390px), light/dark: straight chart paths,
  no horizontal overflow, no page errors, no browser model requests. Company
  share image returned a 1200×630 PNG. Initial fallback was verified while the
  generation worker was settling.
- Mongo, Stonks web and nginx container identities were unchanged. Only frontend,
  backend and the newswire supervisor were restarted; nginx was gracefully reloaded.

## Initial batch result

Ten attempts produced nine structurally valid records. Seven remain public:
ABB, Alfa Laval, AstraZeneca, Evolution, Freemelt, Saab and Sivers.

- Nanexa's fresh request failed application validation (`ValueError`); no result
  was published. The initial worker recorded the exception class but not its
  exact validation code, so the precise rejected constraint cannot be recovered.
  The follow-up now persists only a safe allowlist of application error codes,
  never raw provider messages. No extra request or daily-cap override was made.
  Nanexa can retry when cooldown and the next daily budget permit; repeated
  rejection of unchanged content remains bounded to two total attempts.
- SBB and EQT were set to `review_required` after editorial source review.
  SBB inherited a suspicious SAAB attribution from the earlier news digest;
  EQT added unsupported demand/lease interpretations. These exact cache versions
  remain stored but are excluded from public delivery. Unchanged worker polls
  preserve the holds without spending more. Source changes or explicit review
  are needed to replace them; no manual copy or preview fixture was substituted.
- Actual recorded use: **13,848 input tokens, 2,564 output tokens, zero cached
  input tokens**, ten attempts and 90,647 reserved budget units. The earlier
  separately authorized Nanexa prototype evaluations are not included here.
- Live generated-cache browser checks for ABB and Saab passed at 1440/390px,
  both themes, including source links, dialog keyboard/focus, briefing-level
  accessibility, range-independent price prose and linear/share charts.
- All ten companies had reconciled price sentences. Restarting the worker and
  repeated public page/API reads preserved the attempt count at ten. The normal
  news/chart fallback was verified for missing and held briefings.

## Disable and rollback

Public flag: `COMPANY_BRIEFINGS_PUBLIC: "1"` in
`/root/newsweb/compose.override.yaml`. Set to `"0"` and recreate backend to stop
server-side public delivery (existing browser/HTTP caches can persist briefly).

Worker flags/cohort: `/etc/systemd/system/stonks-newswire.service.d/company-briefing-pilot.conf`.
Set `COMPANY_BRIEFINGS_ENABLED=0`, daemon-reload and restart newswire to stop
generation. Do not delete the budget/state collections to reset spending.

Rollback images retained as `newsweb-frontend:before-briefings-20260926` and
`newsweb-backend:before-briefings-20260926`. Previous compose override and newswire
service module are backed up inside the release directory. The cutover script
restores the old images/configuration if its health checks fail. No build-cache
pruning or database deletion was needed.

## Remaining pilot work

Before expanding, tighten original-source validation when reusing an AI news
digest, remove unsupported interpretation, reduce technical jargon and qualify
dated management claims more explicitly. Evaluate quiet, report-driven and
conflicting-news cases. Automated citation membership is not semantic
verification. Do not extend eligibility to arbitrary page views or the whole
company universe without a separate spending/product decision.
