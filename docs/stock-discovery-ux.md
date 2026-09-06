# Stock discovery: implementation and decision record

Status: approved and implemented, 7 September 2026. The screener's structure,
access and research radar remain intact. Deployment is explicitly user-approved.

## Implemented release

- Compact shared-token company rows replace the large legacy radar cards and
  separate news block. Removed their unused component and global CSS, retaining
  the radar styles used by research/screener.
- All three choices, search, list, sector, sort and 24-row pagination are
  URL-backed. Story dialogs and company navigation retain the source state.
- The new public `GET /api/feed/company-news` queries the fixed last 96 hours,
  groups by company before limiting and selects report context independently.
  Existing importance must be at least 60. Routine insider filings under 25M
  SEK and administrative notices are excluded; no new ranking score is invented.
- Each selection holds up to 200 companies and includes coverage/truncation
  metadata. Only identity, headline, tags, source and publication time are
  returned. No arbitrary archive cursor, source body or private AI metadata.
  Sector/list/search operate on the complete directory joined to this bounded
  selection; when capped, the UI says that the cap precedes these filters.
- One shared 60-second backend cache, concurrent request coalescing and a
  4-second database query budget. No extra SSR news cache. A missing source
  has retry/all-company recovery and is not presented as an empty news market.
- Prices remain daily quote changes, not attributed news reactions. Stockholm
  listings use SEK; unknown units and timestamps are explicit. Full AI prose
  and bullets remain in the opened reader, not in each comparison row.

Production read-only validation returned 57 selected companies and four report
companies in 39ms; those are a validation snapshot, not hard-coded counts.
The acceptance criteria below are covered by unit/browser tests and visual QA.

## What is wrong with the current experience

The live `/aktier` page was inspected at 1440px and 390px:

- Three independent news rows separate stock search from its filters/results.
  They are not filtered by the company search, sector or market-list choice.
- The first stock starts around 691px on desktop and 898px on mobile. Each
  card has a 268px minimum height, largely occupied by its radar and inset facts.
- Cards use legacy `--public-*` and `--color-*` variables, while news uses
  `--ui-*`. Changing a few hex values would leave two component systems intact.
- Default sorting is absolute day change, so extreme small-company moves lead
  the directory whether or not there is meaningful associated news.
- The screener already offers a more useful comparison grammar: aligned company
  identity and metrics, clear presets and progressively added filters.

## Give each destination one job

- Marknaden: which events matter, and what was the observed reaction?
- Aktier / Utforska: which companies should I look into or follow?
- Aktier / Screener: which companies meet my numerical criteria?
- Aktie: understand one company, its news and the underlying research.

News belongs **inside company discovery**, not as a second general feed above it.

## Page contract

Keep `Utforska | Screener` as route navigation. A compact `Aktier` heading and
stock search lead straight to a single results area. No marketing introduction.

Offer three understandable starting choices inside Utforska:

- **I nyheterna**: companies with recent material events; default discovery view.
- **Rapporter**: companies with published results/guidance, not a mixture of
  upcoming calendar entries and already published reports.
- **Alla bolag**: searchable complete directory; do not hide companies without news.

Sector and listing are secondary filters. Keep search, filters, sorting and
starting choice in the URL; retain them and scroll position after opening a
company or closing a story. Name the sort explicitly. Do not rank companies
by a composite buy/sell score or largest price movement by default.

### One compact, company-first row

`Bolag / ticker / sektor | Kurs + senaste handelsdagens % | Relevant nyhet / källa / tid | Följ`

- Aim for roughly 96–128px at desktop width, not a fixed/clipped height.
  Use new neutral surface tokens, 14px row text, 12px supporting text, 16px
  company identity and shared signed badges. Separate rows with small gaps.
- On mobile, identity/price share the first line and the news headline wraps
  beneath. Show full Swedish names/headlines and a 44px follow target. No
  horizontal table scrolling, mandatory graph or separate inset quote card.
- The company name opens its research page. The news headline opens the
  existing shareable story dialog. Follow is a separate action, never a button
  nested in an all-clickable row link.
- Use one relevant story per company, prioritizing material events over routine
  filings, with source/time. Keep full AI prose and bullets in the story reader;
  the directory is for comparing companies, not reading every story in full.
- Label the quote as today's change only on the matching Stockholm trading
  date. A separate reaction value, if included, must say "sedan publicering".
  Do not imply the latest story caused the entire day's move.
- Show no invented news, no zero for missing price, and no "inga nyheter"
  assertion when the source only supplies a limited candidate pool.

Remove the large radar from default discovery. Keep the full profile in company
research and the screener's existing compact profile. If testing supports a
directory profile option later, make it a deliberate alternate view rather
than shrinking six labels into an unreadable thumbnail.

## Data prerequisite and honest first iteration

The existing overview returns at most 100 candidates and is a public **selection**,
not a complete per-company news index. Do not silently inner-join the directory
to that pool and claim to show every company with news.

For full discovery, add a bounded public company-grouped endpoint: symbol, one
material story ID/headline/type/source/published time and truthful coverage
window. Apply sector/list filters and pagination consistently, without exposing
the paid full archive. Reuse the existing company directory for all-company
search. Do not fetch story details individually for every visible row.

A smaller first release can use the current pool if the view is explicitly
called **Bolag i nyhetsurvalet**, with the all-company directory always available.
Only claim complete news coverage once the grouped source supports it.

## Acceptance criteria

- A mobile visitor sees company results without scrolling past a separate feed.
- Search/sector/list choices affect the visible company results and context.
- Users can distinguish quote change from reaction since publication.
- A story opens/closes without losing filters or reading position.
- Follow has loading/saved/limit/error states; it does not enable delivery alerts.
- The screener retains its capabilities and Plus boundary. Terminal is unchanged.
- Verify keyboard navigation, empty/error/missing data, light/dark contrast and
  320/390px reflow using the shared UI components before release.
