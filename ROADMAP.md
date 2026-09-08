# OMXsum roadmap

Updated 8 September 2026. OMXsum 2.0's main public-site redesign is released.
This is the current planning backlog. Unreleased implementation is marked
explicitly; queued items are not committed release dates.

[Release history and rollback records](docs/release-history.md) ·
[UI rules](UI.md) · [Design system](docs/design-system.md) ·
[News-first workspace contract](docs/news-first-workspace.md)

## Direction

One Swedish-market platform, two product surfaces. The public site helps
everyday readers understand news, inspect observed stock reactions and follow
what matters to them. Company research adds depth; Terminal remains the dense
workspace for investigation and monitoring.

The entry points are the free morning letter and public market overview:
**briefing → daily news habit → company following → personal letters/research**.
The next phase is news quality and retention, not another wholesale UI redesign.

## Shipped baseline

- Shared Base UI components, semantic colors, typography, responsive layout,
  public navigation and stock search.
- OMXsum 2.0 landing page: newsletter beside the hero, real previews, wider
  section spacing and a shared, versioned site image with a news-led product
  preview and Morgonbrevet. Dedicated story/company/article images remain.
- News-led Marknaden, a labelled public selection, Plus/Pro chronological
  feed/search, buffered updates and a shared, source-linked news reader.
- Compact featured headlines with AI detail in the reader; mobile/tablet
  filters wrap without hidden options and watchlist columns fit the viewport.
- Shared news-row loaders, bounded requests and retryable errors. Update counts
  reflect visible, deduplicated content after the initial snapshot, not internal
  version/price changes, hidden candidates or AI-only changes in headline rows.
- AI summaries/bullets, labelled observed reactions including completed +1h/+1d
  windows where available, canonical story links and social images.
- Dedicated news/company share images use Geist, matching percentage badges
  and clearer spacing. News without a chart has a text-led layout; chart shares
  retain their selected period/moving averages and use readable axes.
- Bevakning for companies, topics and keywords; inline following and
  account/device-local catch-up. Personal morning-letter blocks and previews
  already exist, including a first version of indirect industry matches.
- News-led Aktier, polished screener and one scrollable company report with
  sticky contents, a flat opening chart and optional analytical depth.
- Newsletter library, shared article reading, settings, company-first signup
  and confirmation, pricing and server-verified checkout return.
- Article-styled Morgonbrevet email with reusable static components, exact
  edition links and plain-text delivery; existing paid personalization remains.
- Public Terminal gateway uses the same header, palette, type, membership
  presentation and sign-in dialog; the separate Terminal workspace is unchanged.

Latest frontend application release: `0d78fb2`; newsletter renderer: `8bd95c8`.
Detailed changes, validation
and compatible backend releases are in the release history, not pending tasks.

## Now

### 1. Improve news quality

- [ ] Evaluate a representative story sample for relevance, missing market/
  sector coverage and duplicate issuer notices; define measurable quality goals.
- [ ] Improve event linking, including translated releases with different
  upstream identities. Do not merge stories just because headlines look alike.
- [ ] Evaluate importance, observed reaction and personal relevance separately;
  expose measurement-time provenance where the source currently lacks it.
- [ ] Evaluate material insider activity relative to company size or trading
  activity. Routine notices are already filtered from featured selections;
  this is a refinement, not a new filter from scratch.
- [ ] Prefer Swedish release variants where available, review rejected wire
  stories periodically and refresh missing/new-company description translations.

Done when: an audited sample shows useful coverage and less duplication, with
clear reasons for selection and no unsupported explanation of price causality.

### 2. Connect newsletters to exact stories

- [ ] Carry stable source story IDs through generated letter blocks.
- [ ] Link supported briefing items to the existing canonical news reader,
  preserving access boundaries, original sources and observed-reaction periods.
- [ ] Keep older/unlinked letters readable; never guess a citation from a
  company mention, similar headline or keyword search.

Done when: a reader can go from a briefing item to its exact supporting event
and back, on desktop and mobile, without losing reading position.

### 3. Validate the acquisition and daily-return journey

- [ ] Test signup → confirmation → first followed company → relevant news →
  return visit with consenting test users. Onboarding itself is already shipped.
- [ ] Define privacy-aware activation/return measurements and establish a
  baseline before adding tracking or making conversion claims.
- [ ] Observe everyday readers interpreting reaction periods, finding their
  companies and returning from a story without losing feed position.
- [ ] Verify authenticated archive cursors against the deployed Market API,
  including filtered empty pages. Mock pagination is not production evidence.

Done when: the main drop-offs are understood and the feed's actual historical
coverage is documented, including any upstream limits.

## Next

- [ ] **Personal relevance:** expand the existing industry-match approach with
  shared company/story labels and visible matching reasons. Separate direct
  announcements from related industry news; do not rebuild topics/keywords.
- [ ] **Opt-in alert delivery:** decide the first channel and plan access, then
  implement explicit preferences, thresholds, quiet hours, deduplication and
  delivery feedback. Telegram is a candidate, not a shipped entitlement.
  Assess web push/email fallback against delivery capacity and user needs.
- [ ] **Shareable screener:** persist filters and sorting in the URL while
  retaining the current table, presets and access rules.
- [ ] **Targeted UX cleanup:** audit remaining legacy account/utility surfaces
  and fix demonstrated friction with shared components. Landing, settings,
  pricing and confirmation are not outstanding wholesale migrations.

## Later

Ideas to validate, not delivery commitments:

- Historical stock reactions to reports and other event types; keep historical
  observations distinct from predictions and causal claims.
- Cross-device catch-up/read state if reader testing supports it.
- Personalized evening letter using the existing block approach.
- Weekly sector, insider-activity and report-season editorial summaries.
- Topic/search-intent pages and richer company discovery after keyword research
  and a fresh assessment of search performance and available archive coverage.
- News-relevant watchlist/portfolio context, only if it improves the news job.
- Replace remaining ad-hoc letter scrapes with the owned wire once coverage
  and fail-safe behavior are sufficient.

## Reliability and maintenance

Run alongside the product backlog, with scope and release verification per change.

- [ ] **Dependencies/security:** resolve the four high-severity findings recorded
  in the 6 September audit; rerun the audit to establish current exposure.
  Keep framework/dependency upgrades separate from presentation changes.
- [ ] **Billing:** verify Stripe portal plan changes and implement an idempotent
  existing-subscription upgrade path before offering in-app Plus-to-Pro
  checkout. The current checkout creates a new subscription; retain the
  existing subscription-management handoff until this is addressed.
- [ ] **Email reliability:** shared/persistent rate limits and a durable welcome
  outbox; verify provider capacity, delivery and personal-letter job duration.
  Recheck the provider's current plan/quotas rather than using old estimates.
  Extend inbox coverage for the released newsletter design; one approved
  mockup and browser previews do not certify every Gmail/Outlook/Apple Mail variant.
- [ ] **Browser coverage:** add Safari/WebKit and Firefox CI alongside Chromium,
  and extend visual/accessibility coverage where real gaps remain.
- [ ] **Remaining foundation debt:** remove unused legacy CSS/remote fonts only
  after their consumers migrate; add primitives when a real feature needs them.
- [ ] **Local build isolation:** prevent development and production/test builds
  from sharing `.next`; preserve the working preview and existing backend.

## Data dependencies

Do not treat missing source data as a frontend implementation task.

- **Historical consensus:** report surprises, estimate revisions and historical
  outcome-versus-consensus need an as-of consensus archive. The August record
  noted estimates for 58 of 870 companies and no pre-report history; those are
  dated observations, not current coverage figures. Obtain/validate coverage
  before promising these features.
- **Ownership/reports:** expand annual-report discovery/extraction and record
  the source date. Fresher ownership data may require licensed sources; access
  and cost need a separate decision. The August 48/68 report figure is historical.
- **News archive:** if the upstream source cannot provide older-page cursors,
  document the limit and resolve source support before offering deeper history.

## Current access

Enforced access last checked 7 September 2026; no pricing changes are proposed.

| Feature | Gratis | Plus — 49 kr/month | Pro — 99 kr/month |
| --- | --- | --- | --- |
| Morning/evening letters | Yes | Yes | Yes |
| Public market selection and stock overviews | Yes | Yes | Yes |
| Full news feed and search | — | Yes | Yes |
| Screener and analytical depth | — | Yes | Yes |
| Followed companies | 5 | 10 | 100 |
| Personal morning-letter additions | — | Yes | Yes |
| Terminal access | — | Yes | Yes |

Pro currently differs on company capacity, not exclusive Terminal access.
Following a company or saving keywords is not notification opt-in. Alert
delivery is not a promised plan benefit until implemented and verified.

## Guardrails and upkeep

- Keep the free letter useful; paid value is personal relevance and depth.
- Keep selection, chronology, observed reaction and personal relevance distinct.
  Missing data is not zero, and price association is not proof of causality.
- Public copy is Swedish; preserve the API's field/tag vocabulary.
- Reuse the shared UI; keep the landing page separate from Marknaden and
  Terminal separate from the everyday public experience.
- Move completed work into [release history](docs/release-history.md), recording
  application/backend commits, local versus live verification, known limits and
  rollback details. A passed local test is not a production release.
- Add an item here only once; use dependencies and acceptance criteria instead
  of duplicate TODOs in old migration phases. Deploy only with user approval.
