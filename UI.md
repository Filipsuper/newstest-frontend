# OMXsum public-site UI

The public OMXsum site is a calm Swedish research product for understanding
one company at a time. The terminal shares its brand and data, but not its
desktop density or abbreviated interaction model.

## Visual hierarchy

- Separate ordinary content with space, alignment, typography, and changes in
  surface tone. Do not wrap every section in a bordered card.
- Borders are reserved for tables, charts, focused controls, form fields, and
  warnings where the edge has meaning.
- Use the established dark/light surfaces, OMXsum yellow identity, blue for
  neutral interaction, green only for positive values, and red only for
  negative values.
- Never use color alone: show a sign, readable value, or label as well.
- Keep body and metadata text comfortably readable. Comparable numbers use
  tabular numerals and align consistently.

## Company pages

- The company name is the page title. Ticker, market, segment, quote status,
  and source timestamps remain supporting information.
- Navigation stays stable: Översikt, Finansiellt, Estimat, Värdering, Nyheter
  & rapporter, Kalender.
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

- Generic dashboard-card grids
- Decorative gradients and glass effects
- Tiny uppercase metadata
- Unexplained composite scores or fair-value claims
- Mixing actual, estimated, and derived figures
- Terminal abbreviations in public explanatory copy
