# OMXsum public-site UI

The public OMXsum site is a calm Swedish research product for understanding
one company at a time. The terminal shares its brand and data, but not its
desktop density or abbreviated interaction model.

## Visual hierarchy

- Separate ordinary content with space, alignment, typography, and changes in
  surface tone. Do not wrap every section in a bordered card.
- Default to no border. Borders are reserved for tables, charts, focused
  controls, form fields, and warnings where the edge communicates a real
  boundary or state.
- Never use a left border as a visual accent, callout, status marker, or
  decoration on any UI component.
- Use the established dark/light surfaces, OMXsum yellow identity, blue for
  neutral interaction, green only for positive values, and red only for
  negative values.
- In dark mode, use a lighter charcoal page canvas with deeper neutral inset
  surfaces for charts, financial tables, and source-backed narrative blocks.
  The contrast comes from surface tone and spacing rather than bright borders.
- Data marks and product screenshots may use slightly stronger contrast and
  saturation than surrounding chrome, while preserving truthful values and
  the OMXsum amber emphasis.
- Never use color alone: show a sign, readable value, or label as well.
- Keep body and metadata text comfortably readable. Comparable numbers use
  tabular numerals and align consistently.

## Public palette

- The public site uses one shared tonal system across landing pages, news,
  letters, company research, watchlists, settings, screeners, forms, and
  dialogs. `/terminal` keeps its separate product palette.
- Dark canvas: near-black `#151616`; raised panel: charcoal `#202121`; inset
  control: `#141515`; quiet divider: translucent warm white.
- Light canvas: cool grey `#E7E9EC`; raised panel: white; inset control:
  `#EEF0F2`; quiet divider: translucent near-black.
- Primary text is warm white or near-black according to theme. Secondary text
  is neutral grey. Do not tint general body copy blue or amber.
- Amber is the OMXsum identity and active-navigation color. Blue is reserved
  for neutral links and interactive focus. Green and red are reserved for
  signed positive and negative data or explicit success and error states.
- A raised surface should be visibly distinct from the canvas without a bright
  outline. Nested controls use the inset tone; selected nested controls use an
  even deeper tone in dark mode and a slightly stronger grey in light mode.
- Reuse the semantic color tokens instead of adding route-specific greys. A
  new surface color must represent a genuinely new elevation or state.

## Market overview and dense data surfaces

- `/marknaden` is a compact market workspace, not a landing page. It opens on
  the current market picture without a hero, introduction, or explanatory
  marketing copy.
- News events are the primary objects on `/marknaden`; price, volume, breadth,
  and index direction are evidence attached to those events.
- OMXSPI, OMXS30, and S&P 500 appear as small daily-change widgets with compact
  session sparklines. If an exchange has not opened, label and preserve its
  latest completed session; historical index charts never occupy the primary
  workspace by default.
- The top data row pairs a four-cell KPI block with the latest morning letter.
  Arrange `Marknadston` and the three indices as a 2×2 grid; market breadth is
  evidence inside `Marknadston`, never a duplicate standalone KPI.
- The dominant panel ranks material stories by importance and measured market
  reaction. A chronological feed remains available as a secondary view.
- Price language describes sequence, not automatic causality: use `sedan
  publicering` and avoid claiming that a matched headline caused the move.
- `Rörelser med förklaring` follows the Terminal's `News movers` definition:
  require company news for the same trading session, require at least 1%
  absolute daily movement, and rank by absolute movement. Never backfill this
  panel with unmatched gainers or losers; show an honest empty state instead.
- News and mover rows reuse the same visual grammar: a signed reaction badge,
  clear company identity, and an inline headline or narrative. Their section
  headers sit directly on the page canvas; each row is its own raised panel.
  Never nest darker rows inside another panel. Separate rows with gaps instead
  of divider lines.
- Keep ranked news rows scannable. The company and headline are primary;
  category and time are supporting metadata, while summary paragraphs stay in
  the news detail view.
- A company news row may carry a compact price trace as evidence. Before the
  Stockholm session it shows the latest trading week; during the session it
  shows today's path so far; after close it preserves the completed day. Label
  the window, mark the story time only when it falls inside that window, and
  never present the trace as proof that the story caused the move.
- Routine insider transactions are supporting news, not default market
  drivers. De-prioritize them, avoid repeated filings for the same company in
  the overview, and let only exceptional size or a clear measured reaction
  restore prominence. Keep the complete set in the chronological news feed.
- `Marknaden` and `Mina aktier` reuse the same information architecture. The
  watchlist is a relevance filter over news and movers, not a separate
  portfolio dashboard.
- The latest morning letter is an editorial preview within the workspace, with
  its real title and a short excerpt. Do not reduce it to a thin link strip or
  let it replace the ranked news as the primary region.
- `Marknadston` is a plain-language summary supported by visible breadth and
  news-reaction evidence. Do not expose an unexplained numeric sentiment score.
- Use an asymmetric dashboard composition: the compact KPI block and editorial
  preview share the top row, followed by one dominant analytical panel and one
  narrower companion panel. Avoid loose columns of equally weighted cards.
- Desktop should fit the useful overview within one viewport, with internal
  scrolling in ranked news and mover panels when the candidate set is larger
  than the visible area. Do not truncate useful rows merely to avoid a panel
  scrollbar. On smaller screens, switch between primary regions with tabs
  instead of stacking the full dashboard into a long page.
- On phones, do not force the complete workspace into one viewport. Give the
  active news or mover list enough height to show several useful rows, allow
  the page to grow, and keep compact market-summary widgets readable through
  horizontal scrolling rather than squeezing their labels.
- Density comes from 8–16px internal spacing, short labels, aligned values, and
  compact rows. Page titles remain modest; data values carry the strongest
  typographic emphasis.
- Dense product views use the sans-serif family for headings and rows. Reserve
  the serif family for editorial reading rather than repeatedly styling data
  panels with it.
- Give data workspaces stronger tonal contrast than editorial pages. In dark
  mode use a near-black canvas, raised charcoal panels, and deeper inset
  controls. In light mode use the equivalent cool-grey canvas, white panels,
  and pale-grey inset controls.
- Separate major tasks with panel surfaces and generous outer gutters, not
  bright outlines. Within a panel, use quiet rules or spacing to organize rows.
- KPI bands show a short label, a prominent tabular value, and at most one line
  of context. Related KPI cells align to the same baseline.
- Top-level tabs use a restrained amber underline. Local view switches use a
  darker filled state so navigation levels are visually distinct.
- Charts should occupy most of their panel and may use a restrained solid area
  fill to improve data contrast. Decorative gradients remain prohibited.
- Market provenance is terse: keep only the relevant time, period, and source
  beside the data. Longer methodology belongs in contextual help.

## Stock directory

- `/aktier` is a discovery workspace, not a marketing hero or an alphabetical
  registry. Begin with compact search and useful market/sector filters, then
  show the matching companies immediately.
- Company cards combine identity with the small set of facts needed to choose
  the next company: ticker, latest available price, daily move, list, sector,
  and the canonical six-axis company profile.
- The public company profile uses the Terminal's underlying axis scores but a
  softer, rounded outline suited to browsing. It is a research fingerprint,
  not a recommendation or an unexplained buy/sell verdict.
- Missing profile axes remain visibly missing and never collapse to zero.
  Show profile coverage tersely so sparse source data is not mistaken for a
  complete assessment.
- Load profiles only for the currently visible page of cards and reveal more
  companies in small batches. Filtering the directory must stay immediate.
- Prefer borderless tonal cards, inset fact groups, tight typography, and a
  responsive grid over rows divided by prominent outlines.

## Company pages

- The company name is the page title. Ticker, market, segment, quote status,
  and source timestamps remain supporting information.
- The opening price chart sits directly on the page canvas. Do not wrap it in
  a raised card, outline, shadow, or rounded container.
- Navigation stays stable: Översikt, Finansiellt, Estimat, Värdering,
  Insyn & ägare, Blankning, Nyheter & rapporter, Kalender.
- The URL always retains the selected company and selected tab.
- Overview answers questions in reading order: how has the stock performed,
  what does the company do, what does it earn, what happens next, and what is
  the latest material news.
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

## Avoid

- Generic equal-weight dashboard-card grids
- Decorative gradients and glass effects
- Tiny uppercase metadata
- Unexplained composite scores or fair-value claims
- Mixing actual, estimated, and derived figures
- Terminal abbreviations in public explanatory copy
- Introductory prose inside dense market dashboards
