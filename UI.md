# OMXsum public-site UI

## Foundation v1 — September 2026

The public-site revamp starts with a component system, not a replacement
landing page. `/designsystem` is the interactive, noindex reference. The
implementation and migration plan is in `docs/design-system.md`.

- Build new public UI from `app/components/ui`. Use **@base-ui/react** for
  behavior; use OMXsum CSS Modules for presentation. Do not import Base UI
  directly into feature pages, copy example CSS, or add another UI library.
- `app/styles/tokens.css` owns the `--ui-*` tokens. New code must use semantic
  tokens, not hard-coded colors or additions to the legacy `app/app.css`.
- The new system is opt-in. Migrate a complete component or route, then remove
  its obsolete styles once no consumer remains. Do not globally alias the old
  palette to the new one; Terminal and unfinished routes must remain stable.
- Reuse `Button`, `TextField`, `Select`, `Checkbox`, `Switch`, `Tabs`,
  `SegmentedControl`, `Menu`, `Dialog`, and `Tooltip`. Do not reimplement
  focus traps, menu keyboard navigation, or select behavior with click handlers.
- Route navigation uses real links in `NavigationTabs`, with `aria-current`.
  In-page content uses `Tabs` and connected `TabPanel`s. Single-value filters
  use `SegmentedControl`; form values use `Select`; actions use `Menu`.
- Components do not fetch data, calculate importance, or create alerts.
  Features compose them and retain the existing data/auth contracts.
- `Label` is a non-interactive content/edition label, distinct from a form
  label, a filter button, a status `Badge`, or a numeric `ChangeBadge`.
  `NewsTypeLabel` maps news vocabulary to Swedish text and a quiet icon.
  Categories stay neutral; reserve amber for editorial/plan identity and
  green/red for signed data or explicit success/error states.

### Type, space, and interaction

- Use locally served **Geist Variable** for product UI. No downloaded or
  imitated proprietary Wealthsimple fonts. Serif is for editorial content.
- Type scale: 12px metadata, 14px controls/list text, 16px reading text,
  20px subsection headings, 24px section headings, 32px page titles. Page
  titles become 24px on phones. Never shrink metadata below 12px to fit a row.
- Use 400 for body, 500–550 for labels/headings and 600 for company identity.
  Use tabular figures for prices, counts, and changes; always show units.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Use `Stack`, `Inline`, and
  `Container` instead of unrelated margins. Outer gutters: 32px desktop,
  16px phone. Maximum workspace width 1280px; reading width 672px.
- Radius scale: 8px small, 12px rows/fields, 16px panels/dialogs. Pills are for
  action buttons and segmented choices, not every box or navigation surface.
- Controls are 44px by default; 36px compact is desktop-only. Touch restores
  at least 44px. Text inputs use 16px on phones to avoid focus zoom.
- Every interactive control has a visible keyboard-focus state, a name,
  disabled behavior and, where applicable, loading and invalid states.
- Motion uses the shared 160ms duration. Respect reduced motion. No decorative
  entrance animations on market rows, hover-only actions, or animated prices.
- Portal overlays use the root theme tokens. Keep app content in an isolated
  stacking context and do not override theme tokens on a nested surface that
  needs to open portaled overlays.
- Errors say what failed and offer recovery. Preserve user input. Loading
  reserves the same row geometry. Empty, failed, and unavailable are distinct.

The public OMXsum site is a calm Swedish news-led workspace for understanding
market events and following relevant companies. The terminal shares its brand and data, but not its
desktop density or abbreviated interaction model.

## Product navigation

- Organize the public product around four jobs: `Marknaden` explains what
  matters today, `Bevakning` explains what matters to the reader, `Aktier`
  supports discovery and research, and `Breven` contains editorial reading.
- The logo is the route back to the landing page; do not spend a primary-nav
  position on a duplicate `Start` link.
- The complete chronological news feed is a URL-backed view inside
  `Marknaden`, while the screener is a URL-backed view inside `Aktier`.
  Preserve legacy route redirects, but do not expose duplicate top-level
  destinations.
- `Bevakning` covers companies, topics and keywords. It opens on useful matched
  news, with preference management as a secondary view. Account settings do
  not own personalization.
- Desktop and mobile use the same conceptual destinations. Company pages are
  contextual destinations beneath `Aktier`, not another top-level product.

## Visual hierarchy

- Separate ordinary content with space, alignment, typography, and changes in
  surface tone. Do not wrap every section in a bordered card.
- Default to no border. Borders are reserved for tables, charts, focused
  controls, form fields, and warnings where the edge communicates a real
  boundary or state.
- Never use a left border as a visual accent, callout, status marker, or
  decoration on any UI component.
- Use quiet warm-neutral surfaces, ink-colored primary actions and restrained
  OMXsum amber identity. Green and red communicate signed data or explicit
  success/error states; blue is reserved for keyboard focus.
- In dark mode, use a deep neutral canvas and slightly lighter surfaces.
  The contrast comes from surface tone and spacing rather than bright borders.
- Data marks and product screenshots may use slightly stronger contrast and
  saturation than surrounding chrome, while preserving truthful values and
  the OMXsum amber emphasis.
- Never use color alone: show a sign, readable value, or label as well.
- Keep body and metadata text comfortably readable. Comparable numbers use
  tabular numerals and align consistently.

## Public palette — new components

- The target public site uses one shared tonal system across landing pages, news,
  letters, company research, watchlists, settings, screeners, forms, and
  dialogs. `/terminal` keeps its separate product palette.
- Light: warm off-white canvas `#f6f5f1`, white surface `#ffffff`, inset
  `#eeede8`, primary text `#252620`, secondary text `#62655c`.
- Dark: charcoal canvas `#171916`, surface `#22251f`, inset `#2b2e27`, primary
  text `#f2f3ed`, secondary text `#adb3a5`.
- Primary text is warm white or near-black according to theme. Secondary text
  is neutral grey. Do not tint general body copy blue or amber.
- Amber is the OMXsum identity, not a blanket selection color. Navigation uses
  ink emphasis and local choices use a tonal selected state. Green and red are reserved for
  signed positive and negative data or explicit success and error states.
- A raised surface should be distinct without a bright outline or persistent
  shadow. Reserve shadows for overlays. Fields use a visible control boundary;
  subtle decorative dividers are not adequate input boundaries.
- Reuse the semantic color tokens instead of adding route-specific greys. A
  new surface color must represent a genuinely new elevation or state.

## Market overview and news reading

- The public site is a news-led daily workspace. Keep the landing page separate.
  The four destinations are Marknaden, Bevakning, Aktier and Breven.
- `/marknaden` has two URL-backed views: Överblick and Nyhetsflöde. The
  overview contains compact market context, 3–5 material events, a real letter
  preview, personal matches, and a chronological preview. The full feed is the
  extended reading/search destination, not another product.
- Index widgets are a compact strip, not a dominant 2×2 dashboard. Show
  OMXSPI, OMXS30 and S&P 500, honest session dates and small actual sparklines.
  Transparent market-breadth counts replace the composite Marknadston score.
- On desktop, selected news is the primary column and the letter/watchlist
  form a contextual column. On mobile the order is selected news, compact
  letter and personal context, then latest news, with a direct latest-news jump.
- Use normal document scrolling on desktop and mobile. Do not force one-screen
  dashboard height, nest vertical news-list scrollbars or hide primary regions
  behind Drivkrafter/Reaktioner tabs.
- Selected importance, chronological order, observed reaction and personal
  relevance are different concepts. A story can be important before trading
  reacts. Routine insider notices and administrative invitations must not
  fill featured slots simply because the stock moved.
- The public chronological preview is labelled as a selection. The complete
  feed keeps its existing Plus/Pro boundary; never make the preview appear to
  cover all events or bypass authorization through client-only filtering.
- All news surfaces reuse `NewsFeedItem` / `NewsRow`: signed reaction badge,
  clear headline/company, supporting source/time and optional relevance reason.
  Rows are raised surfaces separated by gaps, not dark rows inside an outer
  card. Avoid repetitive summaries and obligatory per-row charts.
- When a story has `aiSummary`, show its prose and up to three supplied bullet
  points immediately below the headline, quietly labelled AI-sammanfattning.
  Use the same `NewsSummary` in rows and the reader. Do not substitute the
  deterministic `summary`, manufacture points or fetch every story detail to
  fill a list. Missing AI copy leaves the headline/source row intact.
- Every percentage states its period. `Sedan publicering` and `idag` are not
  interchangeable. A temporal association is not proof of causation. Missing
  reaction data is not zero, and a price chart must never be fabricated.
- Show publication time, quote time and connection state separately. A quote
  timestamp at close does not mean the news feed stopped updating.
- Live lists buffer new versions behind an explicit action and offer pause.
  Keep reading position stable. URL-backed filters survive sharing/reload.
  Only show older-page navigation when the source supplies a real cursor.
- Story links use canonical `/nyhet/[id]` URLs. Normal client navigation opens
  a Base UI dialog; direct visits and reload open the full reader. Back closes
  the dialog, Forward reopens it, and returning retains the source page.
- Reader hierarchy: headline/source → concise facts → observed reaction →
  optional detailed periods/figures/source text → company/follow/related paths.
  Keep original sources easy to reach. Base UI owns focus trapping and Escape.
- Story social previews are generated from the same public event, with a
  deliberate 1200×630 composition, legible headline, source, company, and an
  explicitly labelled reaction where available. Prefer completed fixed windows.
  Rolling figures are snapshots. No personal data or invented market graphics.
- Following is a contextual action on stories and companies, with saved,
  loading, limit and error states. Topics/keywords are secondary preferences.
  Following must never silently activate notification delivery.
- Personal results explain their match. The local `Sedan sist` filter is
  a last-visit comparison, not a cross-device read/unread guarantee.
- Editorial previews show the actual title, date and short excerpt. After
  17:30 Stockholm, use today's evening letter only once published; otherwise
  retain the morning letter. Refresh candidates while the overview is open.
- Product typography is Geist and uses the shared 12/14/16/20/24/32px scale.
  Retain full headlines and 44px touch controls; remove nonessential elements
  before shrinking text. No serif data rows, decorative gradients or glass.
- The reusable Base UI Combobox belongs in `ui/`; company search adapters own
  fetching/filtering and provide an explicit handoff to news search.

## Settings and editorial reading

- Settings group account, appearance, subscription and email preferences.
  Use the shared Base UI `Switch`, never a styled button pretending to be a
  switch. Theme changes persist immediately in the existing browser preference;
  email delivery changes require an explicit save, with pending/error feedback.
- Preserve unknown saved newsletter values. An unavailable preference is not
  an unchecked preference; disable its control and offer recovery.
- Only expose delivery channels the backend actually supports. Morgonbrevet
  has an email preference; Kvällsbrevet links to its reading route. Account
  settings link to Bevakning rather than duplicating personalization.
- Articles and both edition routes share a 672px reading layout, 16px body,
  real block headings, quiet sharing controls and the existing archive URLs.
  Use actual highlights, optional saved market figures, and company links.
  No emoji sentiment dashboard or current chart inserted into an old article.
- The legacy letter quote fields are sourced from IG Sverige30. Label them as
  saved broker data, not verified cash-index data or a live price.
- Inline company previews use the shared keyboard-aware Tooltip; the company
  link remains usable by touch without opening a preview. Never put article
  headings inside paragraphs or render raw source HTML.
- Compare full Stockholm dates for edition freshness. Show the last published
  edition with an explicit date when today's edition does not exist.

## Stock directory

- `/aktier` is a discovery workspace, not a marketing hero or an alphabetical
  registry. Begin with compact search and useful market/sector filters, then
  show the matching companies immediately.
- Use company-first rows: identity/ticker/list/sector, latest quote with an
  explicit day/date, one selected headline with source/time, and a separate
  follow action. Company links and story links have different destinations.
- `I nyheterna`, `Rapporter`, and `Alla bolag` are discovery filters. Search,
  sector, listing, sort and revealed pages persist in the URL. Keep the whole
  directory accessible even when news is absent or the news source fails.
- News context belongs inside the company row, not a general feed above the
  results. Use the bounded company-grouped source and disclose its window and
  cap; never present the market overview's candidate pool as complete coverage.
- Use `--ui-*` surfaces, shared controls and CSS Modules. Desktop rows are
  roughly 112px tall and grow with content; on phones stack news beneath
  identity/quote. Keep document scrolling and full headlines. No inset quote
  cards or default directory radars. Full AI copy belongs in the opened reader.
- The public company profile uses the Terminal's underlying axis scores but a
  softer, rounded outline suited to browsing. It is a research fingerprint,
  not a recommendation or an unexplained buy/sell verdict.
- The profile remains one shared component in screener discovery and company
  research. Do not use it in news rows or the default compact directory.
- Missing profile axes remain visibly missing and never collapse to zero.
  Show profile coverage tersely so sparse source data is not mistaken for a
  complete assessment. Partial profiles retain a filled silhouette; use the
  known-axis average only to bridge the missing point geometrically, and mark
  that point as hollow while its visible score remains `–`.
- Color the profile from its average available axis score: red for a weak
  match, OMXsum yellow for a mixed profile, and green only for a strong match.
  The axis values and silhouette remain the primary explanation; color is a
  reinforcement, never a buy or sell verdict.
- Reveal directory rows in small batches. Filtering stays immediate and does
  not trigger individual story/profile requests for every visible company.

## Screener

- Keep the compact comparison table distinct from the directory's larger
  news-led rows: 14px values, 12px supporting labels, roughly 64px desktop rows.
  Company names may wrap and rows grow when needed; never shrink them to fit.
- Reuse the Aktier workspace gutters/navigation and shared buttons, fields,
  grouped Select and Dialog. Active presets have a visible selected state;
  changing their conditions clears that state. Filter chips remove a rule.
- Use neutral surfaces and neutral ratio levels; positive/negative colors
  reinforce signed changes. The small research profile uses the same tokens
  and existing axis scores, not a separate palette or a recommendation badge.
- On phones, presets and chips wrap, all controls have 44px touch targets,
  and the company column stays pinned. Only the table scrolls horizontally;
  vertical scrolling remains with the document, without a fixed table height.
- Keep the source timestamp visible in Stockholm time. Detailed methodology
  belongs in an info dialog. Empty selections, missing values, failed loads
  and retained data after a refresh failure must remain distinct.

## Company pages

- The company name is the page title. Ticker, market, segment, quote status,
  and source timestamps remain supporting information.
- The opening price chart sits directly on the page canvas. Do not wrap it in
  a raised card, outline, shadow, or rounded container.
- Navigation stays stable: Översikt, Nyheter & rapporter, Finansiellt, Estimat,
  Värdering, Insyn & ägare, Blankning, Kalender.
- The URL always retains the selected company and selected tab.
- Overview starts with company identity and recent news, then observed price
  development and deeper company research. The spider profile is secondary,
  not the main reason to visit a news-led product.
- A company page represents one company. Search replaces it rather than adding
  dashboard panels.

## Data and charts

- Historical daily data is the website default. Tick data belongs in the
  terminal.
- OMXsum yellow is the primary stock line; comparisons and moving averages are
  quieter and opt-in.
- Tooltips identify date, exact value, unit, and whether data is reported,
  derived, or estimated.
- Missing data says `Saknas`; it is never rendered as zero.
- Estimates never look like actuals. TTM/R12 must say that it is derived.
- Source and as-of information stays near the corresponding data without
  competing with the primary result.
- `Realtid` is shown only if the API explicitly reports verified realtime.

## Responsive behavior

- Desktop uses a readable main research column with a narrower contextual
  column where useful.
- Mobile is one column, with no page-level horizontal scrolling. Financial
  tables may scroll within their own region and keep metric names visible.
- Tabs may scroll horizontally. Controls remain touch-sized and do not depend
  on hover.
- Market and news workspaces use one continuous page scroll on phones and
  tablets. Story lists must not create a second vertical scroll region.
- Hide per-story sparklines on phones; preserve the reaction badge, headline,
  company, and timing that explain why the story matters.
- Market view switches use a minimum 40px touch target, and editorial previews
  size to their content instead of being clipped into fixed-height rows.

## Avoid

- Generic equal-weight dashboard-card grids
- Decorative gradients and glass effects
- Tiny uppercase metadata
- Unexplained composite scores or fair-value claims
- Mixing actual, estimated, and derived figures
- Terminal abbreviations in public explanatory copy
- Introductory prose inside dense market dashboards
