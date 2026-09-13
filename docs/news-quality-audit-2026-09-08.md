# Featured-news quality audit — 8 September 2026

Status: released as frontend `a22aa0c` on 13 September; deployment verification
is recorded in [release history](release-history.md). This is a first
selection-policy improvement, not a completed source-coverage or relevance evaluation.

**Follow-up:** the price-independent policy and same-snapshot results below
describe the first local iteration. Following user feedback, the current
implementation adds a capped price/volume attention bonus. See the
[reaction/volume follow-up](news-reaction-volume-2026-09-08.md) for current
weights, data safeguards and remaining source limitations. The earlier
before/after result is retained as historical audit evidence, not relabelled
as the output of the revised selector.

## Scope and evidence

Read-only snapshot of the public `/api/feed/market-overview` response, generated
at **2026-09-08 11:02:37 UTC / 13:02:37 Stockholm**. It contains 100 news rows
and 10 mover-evidence rows: 108 unique story IDs after the two pools are combined.
The existing event deduplication also leaves 108 rows.

Publication dates in Stockholm: 36 on 8 September, 54 on 7 September, four on
6 September, one on 5 September and 13 on 4 September. This is one bounded
snapshot containing several publication dates, **not** a complete archive or
historical point-in-time replay of those days. Reactions belong to this snapshot.

The backend requests `/news?limit=100&minImportance=50` and supplements that
pool with same-session mover evidence. It is therefore already a filtered
candidate set. In this sample, 42 rows have `INSIDER`, 21 `M_AND_A`, eight
`CAPITAL_RAISE`, five `ORDER`, four `CLINICAL` and two `EARNINGS` tags. Tags overlap.
No macro/rates-tagged stories are present; that does not establish that the
whole source lacks macro coverage. No paid archive or account data was accessed.

## What was going wrong

The released featured selector reused the market-movement score. A rolling
return could add up to 18 points to upstream importance; freshness removed
only 10 points per day, capped at 32. Routine issue phases already carried
upstream importance scores around 91–95. Those mechanics let large price
changes and older financing notices dominate the editorial slots.

The snapshot's five featured stories were Gigasun's subscription-period opening,
SHT's new directed issue, Image Systems' issue outcome, C100's final offer outcome
and CLS's completed issue. Four were financing stories; four were follow-ups.
SHT was a new announcement, not a routine follow-up.

## Same-snapshot comparison

| Measure, five featured slots | Released selector | New selector |
| --- | --- | --- |
| Published on 8 September | 1 | 4 |
| Financing stories | 4 | 0 |
| Routine follow-ups under the new policy | 4 | 0 |
| Topic groups | 2 | 4 |

New selection, in display order:

1. Prisma Properties — property acquisition (`story_f290dbcc3d577f86576a583806512f1a`).
2. Provide IT — corrected year-end report (`story_bd1e55ffee4c7381c4d1a842996c4f16`).
3. Concejo — first acquisition in a strategic partnership (`story_66b65c8c2cfaa9f962728e35cdb11026`).
4. Aixia — new order (`story_738e781958837bf14aa0003b7a40c5e5`).
5. Flat Capital — CEO departure (`story_98dac77e8c8e6b255bc7242662dfb5f0`).

This demonstrates a fresher, broader mix in this sample. It does not prove
market impact, establish source completeness or measure reader satisfaction.
The corrected report's substantive change and extracted figures still need
validation; a high source importance score is not an independent editorial review.

## First-iteration policy (historical comparison above)

`app/utils/featuredNewsRanking.js` owns the editorial selector used by
`featuredNews`, including Marknaden and the landing page's real news examples.
The chronological feed, personal matching, displayed reaction periods, access
rules and Terminal ranking are unchanged.

- Start with upstream importance, bounded to 0–100. Missing importance is zero.
- Subtract 0.8 points per hour of age, capped at 72; reject future/invalid dates
  and stories older than 96 hours. Strong Friday stories can remain on Monday.
- Do not add any points for rolling or fixed-window price changes.
- Subtract 30 for routine financing phases (subscription, outcome, completion,
  allotment, registration) and specifically recognized deal follow-ups.
  Recognized financing cancellations/failures are exceptions. New financing
  and acquisitions financed with shares are not automatically downgraded.
- Subtract 20 for labelled context/research/media or narrowly recognized
  promotional/adviser-appointment headlines.
- Keep existing insider materiality thresholds: routine notices are excluded;
  at least SEK 25m receives a 22-point penalty and at least SEK 100m a 10-point
  penalty. These absolute thresholds are not company-relative materiality.
- Exclude administrative invitations, recognized periodic buyback notices,
  withdrawn stories and routine executive-holdings notices even when mistagged.
- Apply an editorial floor of 45 and a soft eight-point penalty per already
  selected story in the same topic group. Five important reports remain possible;
  fewer than five stories is acceptable when the remaining candidates are weak.
- Reuse existing event deduplication; allow at most one selected row per
  associated company. Prefer reported Swedish language on equal score. Do not
  invent translations or fuzzy-merge releases based only on similar wording.

These are transparent editorial heuristics, not trained/calibrated probabilities
or claims that a particular event caused a price change. `assessFeaturedNews`
returns eligibility, topic and score penalties for offline inspection; the
interface does not expose another distracting numerical importance score.

## 13 September release

The current selector retains those editorial safeguards and adds the capped
price/volume bonus described in the follow-up. It consumes the existing legacy
`reaction` and `marketContext` fields, not `reactionV2` or `companyContext`.
V2-only stories remain eligible on editorial merit with zero market bonus.
A V2 `missing_baseline` state does not veto an independently supplied legacy
fixed-window return. Legacy baseline/endpoint provenance therefore remains a
limitation; this release is not a V2 quality-certified ranking migration.

A read-only public snapshot at **2026-09-13 08:58:33 UTC** contained 100 news and
two mover rows, leaving 100 deduplicated stories: 64 legacy reactions, 77 V2
records and 13 V2 records without legacy reactions. Twenty-seven rows qualified
for a price bonus; none qualified for an RVOL bonus with the stale weekend
observations. Missing or stale volume was not filled or treated as zero trading.

The five selected stories concerned Luotea's profit warning, Lifecare's acquisition,
Gapwaves' order, Sleep Cycle's regulatory/product launch and HMS's takeover.
This is a bounded compatibility check, not evidence of a general relevance lift.
The public snapshot was processed in memory, not retained as a wire archive.
An upstream-mistagged warrant-exercise notice also bypassed the financing-phase
penalty, though it was not selected: classification coverage still needs work.

The clean release candidate passed all 137 unit tests. Final production-build,
browser, icon and live checks belong to the dated release record; the smaller
counts below describe the original 8 September local iteration only.

## Remaining upstream and evaluation work

- **Classification:** Implantica's Capital Markets Day invitation was tagged
  `CLINICAL` with approval-related facts (`story_0f11488f688b3f0a8bec12445cd1e16b`).
  Kinda Brave's management holdings notice was tagged `M_AND_A`
  (`story_ab2cd9004920d40091169ce137813f05`). Featured headline guards avoid
  promoting these cases; source classifications elsewhere are not corrected.
- **Promotional context:** MSAB vendor recognition and XerTech's financial-adviser
  appointment had high deal importance. The local selector downgrades that
  wording; upstream event typing still needs review.
- **Translations/event identity:** Rejlers and Corem have Swedish/English releases
  with separate IDs and differently worded facts. Existing exact deduplication
  does not link them safely. Company diversity avoids repeated featured slots,
  but does not solve cross-language event identity in the full feed.
- **Language flags:** some English headlines are labelled Swedish. The selector
  cannot guarantee Swedish copy from inaccurate source metadata.
- **Extraction and corrections:** Provide IT's report has suspicious repeated
  `SEK 120` metric strings. Validate original units/figures and what the correction
  changes before using those fields for materiality or report comparisons.
- **Coverage:** sample additional sessions, report-heavy days, quiet days and
  macro-event days with contemporaneous snapshots. Review filtered-out candidates
  and source limits, not only the 100-row public pool. Define human-labelled
  relevance/duplicate/coverage targets before claiming a measured quality lift.
- **Insiders:** evaluate company-size/trading-activity-relative materiality with
  validated currency/amount provenance instead of relying solely on absolute SEK.

## Replay and validation

Save a public market-overview response and run:

```sh
node scripts/audit-featured-news.mjs /path/to/overview.json
node --test tests/*.test.js
```

The audit command is read-only: it reads a local JSON file and prints a before/
after comparison against the released `0d78fb2` selection. It makes no requests,
loads no credentials and changes no records. The capture used above remains a
temporary local artifact, not a committed wire archive. A later live response
will naturally produce different selections.

Unit regressions cover price independence, financing phases and exceptions,
misclassified administration, freshness/weekend fallback, soft breadth,
language/company diversity and localized buyback follow-ups. Local verification:
53 unit tests passed, the isolated production build passed, and 43 Chromium
checks passed across the newsroom, mobile workspace, landing, stock discovery
and site metadata suites. The favicon checks verify SVG markup, metadata URLs,
PNG dimensions, transparency and the brand color. Browser fixtures are fictional;
they verify presentation/behavior, not live news quality. None of these checks
constitutes a deployment.
