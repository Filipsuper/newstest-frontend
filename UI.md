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
- Reuse `Button`, `TextField`, `Select`, `Checkbox`, `Switch`, `Slider`, `Tabs`,
  `SegmentedControl`, `Menu`, `Dialog`, and `Tooltip`. Do not reimplement
  focus traps, menu keyboard navigation, or select behavior with click handlers.
- Route navigation uses real links in `NavigationTabs`, with `aria-current`.
  In-page content uses `Tabs` and connected `TabPanel`s. Single-value filters
  use `SegmentedControl`; form values use `Select`; actions use `Menu`.
- Components do not fetch data, calculate importance, or create alerts.
  Features compose them and retain the existing data/auth contracts.
- Discrete importance choices use the shared Base UI Slider with named stops,
  keyboard support and clickable 44px labels; never imply predicted price impact.
  Company-email levels use a filled track and a short, reserved inline help area
  below the labels, never an overlay covering the track. Hover/focus previews a
  level without selecting or saving; click/touch/arrow keys select explicitly.
  Explain relative news importance with illustrative examples, not promised send
  counts or category guarantees. The thumb's accessible description stays tied
  to the selected level even while another level is previewed.
- Email preferences live in a separate section below the interest tabs in the
  shared Bevakning editor, including company exceptions and quiet hours.
  Settings opens this same editor. Keep drafts across refreshes and tabs, save
  explicitly and require review after revision conflicts. Closing a dirty dialog
  must offer continue/discard, never silently save or discard email consent.
  Following and newsletter choices stay separate. Free accounts get a quiet
  plan explanation. Do not imply topic/keyword email delivery until it exists.
- Saved email preferences are not active delivery. While delivery is unavailable,
  say `Mejlval sparade` / `Inga mejl skickas ännu`; never show `Mejl på`.
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
- On phones/tablets, segmented filters wrap into visible rows with 44px targets.
  Keep full labels and the final choice accessible without a sideways swipe;
  check the control's own overflow, not only the document width. Mobile
  workspace columns stretch to their container instead of their content width.
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

- Organize the public product around three destinations: `Marknaden` explains
  what matters today and to the reader, `Aktier` supports discovery and research,
  and `Breven` contains editorial reading.
- The logo is the route back to the landing page; do not spend a primary-nav
  position on a duplicate `Start` link.
- The complete chronological news feed is a URL-backed view inside
  `Marknaden`, while the screener is a URL-backed view inside `Aktier`.
  Preserve legacy route redirects, but do not expose duplicate top-level
  destinations.
- `Bevakning` is a URL-backed view inside `Marknaden`, alongside `Överblick`
  and `Nyhetsflöde`. It opens on matched news, not settings. A shared compact
  editor exposes `Bolag`, `Ämnen` and `Nyckelord` as always-visible tabs, with
  selected chips first and searchable, bounded topic results. Open it in a
  Base UI dialog from the overview or personal feed; keep the direct manager
  route and legacy redirects. Account settings do not own personalization.
- Keep existing free/Plus/Pro access rules. Personalization previews must not
  invent private stories, imply enabled alerts or introduce a new client-only
  paywall. The published letter leads the overview's supporting column for
  everyone. A compact personal entry below the index strip links to Mina bolag
  and the shared preference editor.
- Desktop and mobile use the same conceptual destinations. Company pages are
  contextual destinations beneath `Aktier`, not another top-level product.

## OMXsum 2.0 landing page

- Explain the complete journey: news and reactions → catch up on your companies
  and interests → understand financial performance and VD-ord → discover companies
  in the screener. Keep the current letter beside the hero as the lead magnet.
  Public copy only describes implemented features. Qualify report/data coverage;
  do not claim extracted risk/geography data or AI briefings exist for every stock.
  Terminal is the advanced Pro workspace, not necessary for everyday analysis.
  Give the public-site screener and Terminal separate landing sections with
  their own headings and actions, not two columns beneath a shared tools heading.
  Landing and Terminal gateway reuse TerminalPreview with the user-supplied
  September 28 trading/financial screenshots. Trading is the default; shared
  Tabs expose Bolagsanalys and the full-size link follows the selected image.
  Keep capture date visible and never imply the screenshots are live data.

### Membership contract — September 28

- Free: 2 followed companies, public market selection, company overviews, interest
  matching and the existing letters. Plus: 20 followed companies and the normal
  site's paid news, screener, financial research, VD-ord and personal newsletter.
  Pro (stored as `premium`): 100 companies and exclusive Terminal access.
- Prices remain 0 / 49 / 99 SEK monthly. Eligible verified Free accounts can
  explicitly try Plus or Pro once for seven days, without a card or automatic
  billing. The native trial ends at Gratis; Stripe is used only for an explicit
  paid subscription. Make the end date and free continuation available from
  Settings' trial label through hover, keyboard focus or tap;
  the completion screen only needs plan, time remaining and a plan link. Existing
  billing relationships are not eligible. Newsletter consent is unchanged.
  Backend Terminal checks and follow limits are authoritative;
  frontend pricing, gateway, onboarding and preference counts mirror them.
- Preserve saved follows for accounts above a new limit. Block new additions
  until below the cap; allow removals and idempotent retries. Do not bulk-delete
  interests or silently change subscriptions. Separate newsletter personalization
  from independently consented alerts. No promise of data for every company.

### Landing layout

- `/` explains the product's benefits: less searching, context around observed
  stock reactions, and news relevant to the reader's own companies. It is not
  a duplicate of `/marknaden` or a catalogue of analytical tools.
- Use the shared `brand.js` launch identity in the public header, homepage and
  homepage sharing image. Keep canonical URLs, organization identity and
  Terminal branding unchanged. The version is a quiet label, not a new logo.
- Browser/app icons use a plain yellow circle in the brand accent, with SVG,
  32px PNG fallback and 180px touch icon. Keep icon metadata in `SITE_ICONS`
  and version the URLs when changing the artwork. Favicons are separate from
  the detailed social previews; do not shrink those previews into tab icons.
- Generic social previews use the shared versioned `SITE_OG_IMAGE`, including
  Marknaden and routes inheriting the root metadata. Keep the dedicated story,
  letter and company images. The 1200×630 site composition pairs a clear news
  benefit with an angled product view and Morgonbrevet; use bundled Geist and
  foundation colors. Any preview news/figures must have saved public provenance
  and a visible snapshot date, never appear to be live, and need no runtime API.
- Guests get the existing free Morgonbrevet signup plus an account-free path
  to Marknaden. Returning readers get a direct workspace action; an account
  alone does not prove newsletter subscription, so signup remains available.
- Demonstrate value with at most two real, material news examples and one
  published letter. Reuse `NewsFeedItem`, AI descriptions, reaction-period
  labels, the canonical reader and `LetterCard`. Do not invent example prices,
  testimonials, user counts or live-update promises.
- The newsletter is the lead magnet: the current published edition sits beside
  the hero signup on desktop and directly beneath it on mobile. News examples
  belong further down. Keep the actual edition/date visible rather than calling
  an older fallback today's letter. Landing section gaps are 112px desktop
  (64 + 48 from shared tokens) and 64px mobile; internal rows stay compact.
- News and letter previews load independently, with bounded requests and
  distinct loading, empty and unavailable states. A failed preview must not
  prevent reading the benefit copy, navigating or signing up.
- Keep the free/Plus boundary explicit: public overview and letters, free
  company following, paid full feed/research and personal letter additions.
  Following is not notification opt-in. Preserve the confirmed-email flow.
- Use normal document scrolling, shared type/space tokens and flat benefit
  sections. Keep phone controls readable; no oversized serif hero, dashboard
  charts, clipped letter overlays or nested preview scroll areas.

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
  The three destinations are Marknaden, Aktier and Breven.
- `/marknaden` has three URL-backed views: Överblick, Nyhetsflöde and Bevakning. The
  overview contains compact market context, 3–5 material events, a real letter
  preview, personal matches, and a chronological preview. The full feed is the
  extended reading/search destination, not another product.
- Index widgets are a compact strip, not a dominant 2×2 dashboard. Show
  OMXSPI, OMXS30 and S&P 500, honest session dates and small actual sparklines.
  Brent futures share the strip with an absolute USD/fat price, provider quote
  time and previous-close change. All four reuse MarketQuote: name and secondary
  value/date, change badge, actual intraday sparkline. Brent's curve uses the
  provider's futures session and five-minute closes, not the Swedish equity day.
  Quote source/time is available on the widget; never call it spot or realtime.
  Four compact widgets wrap into two columns on phones. Do not show the separate
  market-breadth block or a strip-wide "Kurser per" footer.
  Overview selections and the latest-news preview use Swedish-listed companies
  (including cross-border stories) plus unassigned Riksbank releases, not a
  headline-language test. Apply scope before the API limit and to live frames.
  Full news, personal watchlists, company pages and ingestion stay unchanged.
- On desktop, selected news is the primary column and the letter forms a
  contextual column. A compact personal entry precedes this grid. On mobile
  continue with selected news, compact letter, then latest news, with a direct latest-news jump.
  Let the contextual column grow to 384px on wider screens and switch to one
  column at 960px. The letter's edition/icon/date share one row; retain the actual full headline
  and at most two supplied takeaways, falling back to a short word-boundary
  excerpt. Never clip a letter or its actions into a fixed-height container.
- Use normal document scrolling on desktop and mobile. Do not force one-screen
  dashboard height, nest vertical news-list scrollbars or hide primary regions
  behind Drivkrafter/Reaktioner tabs.
- Selected importance, chronological order, observed reaction and personal
  relevance are different concepts. A story can be important before trading
  reacts. Routine insider notices and administrative invitations must not
  fill featured slots simply because the stock moved.
- Featured selection uses editorial importance and freshness, with a penalty
  for routine financing/deal follow-ups and promotional context. A capped
  market-attention bonus may use timestamped post-publication price movement
  and reliable volume context; never equate this with price causality.
  Prefer topical breadth softly, not through
  fixed quotas; avoid repeating a company and allow fewer than five stories
  when candidates do not meet the quality floor. Keep this policy separate
  from chronological feeds, personal matching and Terminal mover ranking.
  Audit decisions with `assessFeaturedNews`; weights are editorial heuristics,
  not a measured probability of a story moving a stock.
- Daily RVOL and RVOL at time are different comparison periods and must not
  earn two bonuses for the same volume. Prefer mature, same-time RVOL; daily
  RVOL is a ranking fallback only at session close. Company/session context
  requires an exact story/company/date match, and is not event-generated volume.
  Show one quiet volume label in rows. Independently validated company-session
  context can use both methods as the reader's two volume KPIs, with its date;
  exact event-window volume then remains in expandable details.
- Before/after news volume compares equal complete windows, excludes the
  publication-straddling candle and stays unavailable with incomplete minute
  coverage. Never substitute full-session RVOL for this event-window comparison.
  Price/volume refreshes keep visible row order and are not new-news alerts.
  Recompute editorial/reaction order on content or membership changes, or an
  explicit view change; never require an `Uppdatera urval` acceptance step.
- The public chronological preview is labelled as a selection. The complete
  feed keeps its existing Plus/Pro boundary; never make the preview appear to
  cover all events or bypass authorization through client-only filtering.
- All news surfaces reuse `NewsFeedItem` / `NewsRow`: signed reaction badge,
  clear headline/company, supporting source/time and optional relevance reason.
  Rows are raised surfaces separated by gaps, not dark rows inside an outer
  card. Avoid repetitive summaries and obligatory per-row charts.
  Only render a reaction badge for a finite percentage, including a real zero.
  Without a percentage, a verified publication-session label may take its
  place: orange sun / Före öppning, blue moon / Efter stängning. These use the
  exact story/version/company reaction timing, not current time or guessed
  exchange hours. With a percentage, retain the percentage and put the session
  label in metadata. Holidays/unknown timing do not imply before/after hours.
  Otherwise omit the badge and its leading space entirely; do not
  substitute `Nyhet`, `Saknas` or a dash. Keep timing/status in metadata and
  measurement details in the reader. Other data widgets keep their own states.
- `Viktigast just nu` is the explanatory selection: when a story has
  `aiSummary`, show its full supplied prose and up to three supplied bullet
  points below the headline, quietly labelled AI-sammanfattning. Reuse
  `NewsSummary` and the same row typography, surfaces and spacing as elsewhere.
  Do not substitute the deterministic `summary`, manufacture points or fetch
  every story detail to fill the selection. Missing AI copy leaves the
  headline/source row intact; it does not affect selection or importance.
- Ordinary market news stays scannable: `Senaste nytt` (public and member
  views), the full chronological/reaction feed and Bevakning show the headline,
  company, reaction and supporting metadata without AI prose or bullets.
  Full summaries remain in the opened reader for every story that has them.
  This is presentation, not a change to ranking, access or AI generation.
  Enrichment updates featured copy in place without reshuffling its selection;
  hidden enrichment must not reorder ordinary feed rows either.
- The personal sidebar uses the compact variant of the same news row: two
  full headlines, signed reaction with its period, publication time, source
  and match reason. Leave AI summaries to the reader; type labels, repeated
  ticker links and extra volume context belong in the full feed/reader. Do not truncate headlines
  or shrink type to make this preview fit.
- Every percentage states its period. `Sedan publicering` and `idag` are not
  interchangeable. A temporal association is not proof of causation. Missing
  reaction data is not zero, and a price chart must never be fabricated.
- Show publication time, quote time and connection state separately. A quote
  timestamp at close does not mean the news feed stopped updating.
- Live lists apply incoming stories and content changes automatically, after
  deduplication and version checks. Do not require `Visa nya` or a counted
  acceptance button. Preserve the visible story's screen position when rows
  arrive above it, and leave an open reader undisturbed. Offer pause/resume;
  resuming catches up automatically without discarding the visible snapshot.
  The full feed loads 20 stories (12 displayed in the overview preview), then
  requests metrics independently for up to 20 visible rows. Headlines never
  wait for price calculations. Observation deltas refresh every 30 seconds
  while visible; a short server cache preserves exact versions/source times.
  Initial stream replay starts before the snapshot; opening a connection does
  not trigger a duplicate snapshot. Poll a small news batch only while the
  stream is disconnected. Keep existing rows visible while filters load.
  The full feed uses streaming plus fallback polling; overview and personal
  snapshots refresh every 30 seconds while visible. Do not imply browser push
  delivery or instantaneous streaming on snapshot-only surfaces.
  News loaders reuse row surfaces, gaps and headline/metadata placeholders;
  bounded requests end in a retryable error, not endless solid blocks.
  Keep reading position stable. URL-backed filters survive sharing/reload.
  Only show older-page navigation when the source supplies a real cursor.
- Story links use canonical `/nyhet/<headline>~<id>` URLs, retaining the stable
  ID while legacy ID-only and outdated headline links redirect. Normal client navigation opens
  a Base UI dialog; direct visits and reload open the full reader. Back closes
  the dialog, Forward reopens it, and returning retains the source page.
- Reader hierarchy: headline/source → AI summary → aligned reaction KPIs/chart →
  company/follow/share actions → source text/related paths.
  Keep original sources easy to reach. Base UI owns focus trapping and Escape.
- Extracted key facts are paused in the news reader: no report metrics,
  estimate comparisons, insider-transaction tables or standalone extracted
  amounts. This also applies when an AI summary is missing; do not substitute
  deterministic facts. Market-reaction KPIs and original source text remain.
- Reaction v2 is an optional, exact story-version/company/publication contract.
  News rows, the reader and share images use the latest completed measurement
  by target time, including session-close and next-close—not the biggest move.
  Never pair a v2 percentage with a legacy curve or another company's measurement.
  Open the reader with news first, then one aligned row of three KPIs:
  "Kursreaktion", "Volym / normalt", "Volym / före". Show only a short label,
  value and measurement period per KPI, with no extra section heading,
  repeated timestamp, period dropdown or tabs. Two/three-company stories use one-click shared
  SegmentedControl buttons; longer company lists use Select. The company choice
  updates price, curve and volume together. Earlier price measurements are
  a read-only comparison under "Mätpunkter & underlag", not separate views.
  A fixed reaction remains valid even when independent stock history is missing.
- The news reader and OG use a separate absolute-price stock chart, not the
  archived event-return series. Show the first eligible trading session around
  publication, with its date and an accurate publication marker. The curve joins
  real price observations continuously at their real timestamps. It is display
  context, never an input to reaction percentages, volume or backtest outcomes.
  Do not add zero prices, filled-in candles or fabricated trades between points.
  A genuinely single observation remains a dot; absent history stays text-only.
  Prefer existing stream ticks while the entire session is within the seven-day
  cache; use stored minute candles afterward or when ticks are unavailable.
  Show a quiet `Tickdata` / `1 min` source label. Do not extend tick retention or
  create a tick archive just for a news chart. Fetch only inside an open reader
  or when generating its share image; never one history request per feed row.
  Refresh visible observations in place without a new-news count or moving rows
  while reading; let the user accept changed reaction selection/order explicitly.
  Personal rows retain the same story version and company choices as the reader.
- Keep v2 cards headline-first. Show a short measurement-period label; show a
  30-minute normal-volume comparison only with complete, mature data. In the
  reader, keep the price badge and both neutral volume badges on one row,
  above the chart, including on mobile. Volume compares with normal same-time
  activity and the equal preceding period. Automatically use the longest complete
  5/15/30-minute window and label it explicitly. Provisional ratios stay visibly
  qualified with a small asterisk and an accessible label; explain the asterisk
  and comparison-day count in "Mätpunkter & underlag". Pending and unavailable
  facts never look like zero. Raw share counts, exact timestamps/coverage,
  refresh controls, other price periods and methodology remain expandable.
  Session RVOL and post-news-window
  relative volume are different measures and must not share an ambiguous label.
  After-hours periods say "efter öppning". Waiting, missing and incomplete data
  are explicit. Missing measurement coverage remains missing in calculations,
  independently of the visually continuous stock-price chart.
  Local fictional examples live at `/designsystem/reactions`, gated off by
  default in production, and must never enter real feeds or company pages.
- Company/session context is separate from archived event reactions. Prefer the
  latest completed event measurement, including real zero and before-open news.
  Without one, news may show `Aktien idag` against the exact previous session
  close, including a later trading day for older stories. Explicitly label this
  `Idag · mot föregående stängning` (or its actual date), never a news return.
  A snapshot preceding the first event session stays in context detail only.
  Older stories keep any valid archived outcome ahead of the daily fallback.
  One company selector changes all metrics.
  Use one aligned row: price, `RVOL vid samma tid`, `RVOL mot heldag` when session
  volume is available. Never borrow another company's legacy percentage.
- Context prices and volume retain independent source timestamps, availability
  and freshness; a newer snapshot timestamp cannot freshen an old field. Ratios
  share their cumulative-volume timestamp. Retained snapshots expire at the next
  verified exchange open. Exact source times, prior-close date, baseline maturity
  and unknown adjustment basis belong under `Mätpunkter & underlag`.
  An older price may remain visible only when a recent successful per-symbol
  provider snapshot corroborates it; preserve its original observation time.
  Rows and the reader show `kurs kl. HH:mm` beside that daily percentage; provider
  check time belongs in details. This is not proof of real-time trading or of
  an inactive stock. A process heartbeat, a new calculation or fresh volume is
  not a price check. Expired checks still hide the value; volume rules do not
  inherit the price exception. Never revive unqualified legacy percentages.
- A session percentage and an absolute-price chart have their own explicit
  periods; never imply the chart's full-session range is a fixed news-return
  window. Earlier reaction measurements remain in details, not extra charts.
  Rows, reader and news share images use the same company/metric selection. The local
  `/designsystem/sessions` examples are fictional and gated off in production.
- Story social previews are generated from the same public event, with a
  deliberate 1200×630 composition, legible headline, source, company, and an
  explicitly labelled reaction where available. Prefer completed fixed windows.
  Rolling figures are snapshots. No personal data or invented market graphics.
- News and chart share images use bundled Geist, the public semantic colors
  and the same signed formatter/soft ChangeBadge treatment as the UI. Scale
  type for a 1200×630 image; verify it again at 600×315. News headlines span
  the canvas, with an optional real chart beneath, never a dark side panel or
  an empty chart placeholder. Without a series, use a text-led composition.
  Company shares keep a flat chart, clear company/price/period hierarchy and
  readable axes; do not use serif branding or plain detached percentages.
- Following is a contextual action on stories and companies, with saved,
  loading, limit and error states. Topics/keywords are secondary preferences.
  Following must never silently activate notification delivery.
- Personal results explain their match. `Olästa` uses account-backed explicit
  read actions inside the news card's metadata row, aligned to the trailing
  edge and wrapping naturally on mobile—not detached beneath the card. Use
  the shared ghost button with a visible label and touch-sized target. Reveal
  it on row hover or keyboard focus on desktop, reserving space to avoid shifts.
  Keep it visible on touch devices and while saving. No per-row unfollow action;
  manage interests in the shared preference editor.
  Read state uses
  read receipts, never an automatic visit timestamp. Mark only the selected
  source-copy snapshot: changed headlines/ground text can become unread again;
  price, AI and transport-version refreshes cannot. Unknown/failed read state
  is not unread or caught-up. Keep news accessible if the read store fails.
  Keep all personal filter tabs mounted while requests change; loading or
  unavailable read state belongs in the results, not a disappearing Olästa tab.
  Intercepted story modals keep the background feed's query filters and rows
  intact. The canonical story URL must not reset the mounted feed to defaults;
  closing and browser Back/Forward restore the same selection.
- The personal destination is `Mina bolag`, before Nyhetsflöde in market
  navigation. Its overview leads with important direct-company developments,
  followed by expandable company timelines and separate topic/keyword matches.
  Existing AI context belongs to important developments, not every row.
  Marknaden links into this experience below the index strip. Selection from
  bounded fetched results must disclose pagination/partial coverage. Show the
  API's declared window (seven days on the catch-up API, 48 hours on older
  backends), never imply complete catch-up from a capped scan. Important
  company candidates are a separate server selection before timeline pagination;
  keep its completeness/candidate-cap notice and never merge it into chronological
  pages. Acknowledge individual shown
  rows, not unseen pages or collapsed timelines. Existing old backends without
  read-state support remain usable, but cannot offer persisted read actions.
- The full feed has URL-backed `Urval` / `Alla` and `Hela marknaden` / `Mina bolag`.
  Urval removes routine notices and requires importance 60; it remains
  chronological, not a second featured ranking. Preserve real source cursors
  when filtering leaves an empty page. `Med kursdata` also stays chronological:
  daily changes and fixed event returns are not a comparable ranking.
- Read-only keyword and email examples require an explicit preview request,
  retain coverage qualifications and never save preferences or enable delivery.
  Email examples reuse server content eligibility for draft level/company mutes;
  they do not predict send counts or bypass consent, suppression or quiet hours.
  `Bevaka sökord` prefills the shared keyword editor; only the lexical term is
  saved explicitly, not the feed's company/category filters.
  Keep preference-management actions out of individual news rows.
  Word exclusions are secondary, under `Avancerade undantag` in Nyckelord,
  never the primary per-story feedback action. Exclusions match source headlines/ground text using
  the same lexical rules, before personal pagination and newsletter selection.
  Direct followed-company news is protected; the full feed and alert settings
  stay unchanged. Store at most ten words/phrases with atomic add/remove actions.
  Keep removals available under Nyckelord and show active exception count on
  Mina bolag. Opening or closing the dialog never saves an exclusion.
- Personal feeds match the paginated source window before applying the result
  limit and interest filter. Direct company/topic/keyword matches sort newest
  first; inferred industry suggestions must not displace explicit interests.
  Only complete coverage can support an empty-period claim. Interrupted/capped
  scans disclose partial coverage and offer retry. Older-page reading pauses
  automatic refresh until the reader resumes; filter changes start a new view.
- Keywords are lexical, case-insensitive, punctuation-normalized matches in
  headline and deterministic summary. Short words match whole tokens; longer
  standalone words also match compound prefixes. Do not promise body search,
  translations or semantic/AI matching. Explain this on demand in the editor.
- Editorial previews show the actual title, date and short excerpt. After
  17:30 Stockholm, use today's evening letter only once published; otherwise
  retain the morning letter. Refresh candidates while the overview is open.
- Product typography is Geist and uses the shared 12/14/16/20/24/32px scale.
  Retain full headlines and 44px touch controls; remove nonessential elements
  before shrinking text. No serif data rows, decorative gradients or glass.
  One explicitly approved exception: the company-briefing
  panel uses a static, subtle amber-to-surface gradient to distinguish the
  synthesis from ordinary data cards. Keep normal text contrast, shared radii
  and spacing; no glow, animation, performance-color tint or application to other cards.
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
- Newsletter share images use the same warm canvas, Geist, brand lockup and
  signed change badges as news sharing. Keep the actual edition and Stockholm
  publication date visible; saved IG figures retain their source label. Missing
  figures stay absent. Version the artwork URL without changing article links.
- Inline company previews use the shared keyboard-aware Tooltip; the company
  link remains usable by touch without opening a preview. Never put article
  headings inside paragraphs or render raw source HTML.
- Compare full Stockholm dates for edition freshness. Show the last published
  edition with an explicit date when today's edition does not exist.

## Newsletter email

- Match the public article, not a separate promotional theme: edition/date,
  headline, actual introduction, “I korthet”, full-article action and personal
  section. Do not invent a summary or use an arbitrary body excerpt as an intro.
- Email uses static equivalents of shared components: semantic color tokens,
  Geist with Arial/Helvetica fallbacks, 32px/24px title, 20px section headings,
  16px intro, 14px briefing and 12px metadata. Use a 672px shell, 32px desktop
  gutters and 16px phone gutters. Avoid a second outer card or serif headings.
- Keep baseline styles inline and layout tables presentational. Optional fonts,
  rounded corners and dark-mode CSS must not be required to read or act.
- Link the precise edition, retain unsubscribe/settings, and keep paid content
  out of free HTML, hidden previews and plain-text alternatives. A follow choice
  is not a notification opt-in. Missing data stays missing; saved IG figures
  and observed stock-reaction periods retain their source/time labels.
- The live newsletter template belongs to `Filipsuper/news-test`, not this
  frontend or the backend's account-email templates. See
  [email ownership and validation](docs/newsletter-email.md). Render fictional
  previews offline; inbox tests and deployment need separate authorization.

## Signup and confirmation

- `/kom-igang` is the optional account-first setup: Konto → Brev → Bolag →
  Mejl, ending at Mina bolag. Use one compact, single-column step at a time,
  shared controls and a wrapping progress list. No mandatory tour or checkout.
- After account verification, show Morgonbrevet → Dina bolag → Mejl as the
  progress list. Lead each step with its benefit/question, not settings language.
  The morning step previews the latest actual morning edition with its date;
  one Continue saves explicit changes, while unavailable choices can be skipped.
  Company selection offers visible follow actions and one genuine direct-company
  news preview. Do not use navigation arrows for follows or invent preview news.
  Keep saved company lists to three rows with an explicit Show all action. Empty
  selections need one skip action, not two equivalent Continue/Skip buttons.
  Offer topics as a collapsed, optional "Följ även ämnen" below companies, using
  actual server vocabulary, Swedish labels, search and six results per page.
  Topics affect news selection, not company-email scope; keywords stay in the
  full editor. Preserve existing IDs on unrelated edits, including unknown IDs.
  Quiet the surrounding shell: logo/theme, no product navigation, search or dock.
  Store only the bounded step position per account in sessionStorage; never
  consent, authorization or unsaved drafts. Restore from authoritative choices.
- In the email step, offer the optional no-card trial using two compact
  shared Plus/Pro surfaces, not during company selection. Unlock the email
  editor in place after activation. Put `Fortsätt gratis` before the plan cards.
  Remove duplicate benefit kickers; retain prices and the no-card/no-auto-payment
  terms. A trial is not newsletter or
  company-email consent, and does not expand the private email pilot. Settings
  exposes the exact Stockholm end date and no-auto-payment terms on demand. Paid
  checkout during a trial explicitly starts a paid subscription immediately.
- Login/account creation must not subscribe, resubscribe or verify newsletter
  delivery. New accounts start with no letters. Returning logins retain their
  intended destination; first verification offers setup. Company intent survives
  the login link but is saved only after an explicit follow action.
- Newsletter choices come from the server catalog and authoritative Mail
  subscription state, shared with Settings. Save explicitly with revision checks;
  a failed/unknown load is not an unchecked preference. Future editions need
  implemented senders before becoming selectable, and never become opted in
  automatically. Keep the existing newsletter lead magnet and confirmation path.
- Signup uses the shared email field and a single Base UI confirmation dialog.
  Show the submitted address, edit/resend actions and server-backed cooldowns.
  Never claim a message was sent when the provider rejected it. Existing
  subscribers get a sign-in path, not another promotional wizard.
- `/bekrafta` confirms first, then enters the same setup at Bolag with the
  letter step already completed. Topics are optional in the company step;
  full topic/keyword management remains in the shared editor. Existing choices,
  plans and independent consents survive.
  One company is sufficient; every optional step can be skipped without a write.
- Company emails reuse CompanyAlertPreferences and its existing server gate,
  explicit save, revision conflicts, suppression and delivery-availability states.
  The onboarding variant shows a simple switch with followed-company count,
  and the importance slider with short labels and concise inline explanations.
  Company exceptions, matching examples and quiet hours remain in settings;
  existing exceptions survive unchanged, with a settings handoff if they block
  activation. Active-trial status is a quiet plan/time-remaining label after the
  primary action, not a block between the heading and the choices. Full terms
  stay in the trial offer and Settings. Do not repeat
  a dirty-draft paragraph when the Save and Continue action already names saving.
  Onboarding uses one Save and Continue action,
  advancing only after a successful revision-checked write; unchanged Continue
  performs no write. Never go back over dirty email drafts.
  Free users can continue without upgrading. Missing delivery still says no
  emails are being sent; this flow does not activate or expand the private pilot.
- At completion, show up to three real matching news rows, preferring the
  separate important-company selection. Use the API's declared window and
  coverage, including candidate caps. AI copy belongs to important stories.
  Incomplete coverage cannot support an empty-period claim. Errors are retryable
  and distinct from no matches. Personalized letter additions require Plus/Pro.
  Finish with a calm next-steps screen, not only a settings receipt. Put the
  active Plus/Pro trial and remaining time above the primary personal-news
  handoff, with a link to the plan in Settings. Do not repeat end-date, free
  continuation or payment terms here. In Settings, replace the ordinary plan
  label with one shared accent Label: "Plus · Provperiod · 7 d kvar" (actual
  remaining time; under one day stays qualified). Do not add a duplicate trial
  block or end-date paragraph. On Settings and the plan page, expose the exact
  end date and "När provperioden är slut fortsätter du med gratisversionen.
  Ingen automatisk betalning." in the shared touchable Tooltip, with an explicit
  keyboard-accessible trigger. Never silently start or extend a trial.
  Show at most three actual followed-company
  shortcuts (name/ticker and a direct stock-page action), never example follows
  or invented quotes. Missing directory names fall back to saved symbols.
  Offer a few plan-appropriate actions: the letter and company discovery for
  Free, Screener for Plus/Pro, Terminal for Pro only. Saved companies, authoritative
  letter selections and company-email delivery status remain in a secondary
  saved-choice summary. Unknown is not Off; a paused
  delivery remains paused even when preferences are enabled. Offer Edit my choices
  without resetting any saved selections, trial eligibility or consents.
  Without companies, topics or keywords, finish with "Du är igång" and a
  "Till Marknaden" handoff, not a claim that personalized news is ready.
  Show selected topics in the saved summary. Unchanged off email/letter choices
  use explicit Continue without wording and make no write.
- Outside the focused setup routes, an active trial has a compact, amber-tinted
  header link to Settings' plan section. Its visible child is the exact shared
  Label (12px type, standard padding and 8px radius), not a pill-shaped Button.
  Keep the surrounding transparent link/tooltip trigger at least 44px high
  without inflating the visible label. Do not label unused, expired, converted
  or malformed trials as active. The countdown is presentation, not authorization;
  backend entitlement remains authoritative. On mobile keep the badge on its own
  row rather than squeezing search/account controls. Measure the shell's header
  height for sticky report navigation, watch-editor tabs and anchor offsets so
  the extra row cannot cover content. Keep the setup header quiet.
- Save explicit follow/unfollow state, not a toggle that can reverse on retry.
  Show pending/error/saved feedback and respect server-enforced plan limits.
- Confirmation, account session, delivery and news-loading states are separate.
  Failed account reads offer Retry, not an account-creation form. A temporary
  refresh failure preserves the known account and mounted drafts; pause editing
  until retry succeeds. Only explicit authentication rejection means signed out.
  A consumed/invalid link cannot establish a new session. After success strip
  the token from the URL; reload verifies newsletter status with the server.
  Do not load third-party embeds or analytics on confirmation or account setup.
- Welcome mail uses the public reading palette and sans-serif hierarchy,
  one primary follow-companies action, plain text, settings and unsubscribe.
  Authentication emails remain simple single-action messages.
- Use a narrow, single-column reading container, normal page scrolling and
  shared type/spacing tokens. No oversized celebration screen or nested cards.

## Membership and checkout

- `/pro` uses the shared neutral surfaces, typography, buttons and Base UI
  login dialog. Keep prices and cadence explicit; no artificial savings,
  unverified popularity labels or invented plan-exclusive features.
- Copy follows enforced access: public letters, selected news and company
  overviews stay free. Plus includes the full feed, screener, analytical depth
  and Terminal; Pro currently increases followed companies from 10 to 100.
  Free accounts can follow five. Do not describe Pro as unlimited.
- Account loading is not a guest or a free-plan result. Disable purchase
  actions until resolved; login returns to pricing without auto-purchasing.
  Only one checkout request can be pending; errors stay beside the action.
- Existing paid accounts go to subscription management, not a second
  subscription checkout. Prices, Stripe lookup keys and backend authorization
  are outside this presentation layer.
- `/pro/klart` is not proof of payment. Render only server-confirmed account
  access, with bounded refresh, manual retry and sign-in/support recovery.
  The main handoff is the news feed, then following companies—not Terminal.

## Terminal gateway

- `/terminal` is the public membership gateway. Use the same public header,
  palette, Geist typography, semantic surfaces, buttons and login dialog as
  `/pro`. The separately hosted Terminal workspace keeps its own dense UI.
- State that Terminal is included in Plus and Pro; derive displayed prices
  from the shared membership presentation. Send readers to `/pro`, not a
  duplicate checkout. Offer the free market overview as an alternative.
- Account loading is not a paywall. Plus/Pro keep the existing authenticated
  session handoff, without flashing purchase actions. Guest login returns to
  `/terminal`; Base UI handles keyboard focus, Escape and dialog dismissal.
- Use the real product screenshot with an explicit non-live caption, not fake
  or blurred data. Keep mobile content in normal document flow and every
  action touch-sized. Do not promise unverified realtime or price causality.

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
  known-axis average only to bridge the missing point geometrically. Compact
  screener profiles retain hollow missing points. The point-free company-page
  view names missing axes below the chart and retains exact scores in its detail.
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
- Keep the price plot and matching share image grid-free. Retain price/date
  axes, volume and meaningful session dividers; other analytical charts are separate.
- Company price lines use straight segments between observed values, including
  intraday, comparison, moving averages and the share image. No smoothing or
  interpolation of missing prices. Other analytical charts are unchanged.
- A qualified cached company briefing replaces the chart-side latest-news
  context. Use the approved gradient panel, one title and one paragraph, with
  sources behind the shared dialog. On desktop, place the card to the right of
  the chart, top-aligned with the chart row below the share/comparison/settings
  controls. The company header and controls span the full overview width;
  the card must not occupy or span their rows. Keep its text left-aligned.
  On narrower layouts it follows the chart in normal full-width document flow.
  Page views only read saved text; never
  generate on demand. Missing/expired/mismatched briefings keep the news fallback.
  Keep new copy compact: a headline up to 65 characters and 1–2 news sentences,
  targeting 35–45 words as guidance, with a shared 420-character budget before
  the price sentence. Generation and validation share a derived 209-character
  per-sentence limit, including room for the joining space, not a second hard
  word-count gate. Preserve meaningful conditions and separate counterparties. Match
  news-card typography: shared 14px item heading and summary, 12px metadata,
  with a medium-weight title. Keep 20px subsection headings and 16px reading
  text inside the sources dialog. Do not clamp/truncate cached text to fit.
  Compose a dated daily-change sentence from the same quote as the header,
  independently of the AI text and selected chart range. Require a matching
  company, explicit timestamp/currency/source and a prior close reconciling with
  the quote's change; omit only the sentence when those inputs fail. It is not
  a news-attributed return. Calculation details remain in the source dialog.
- One continuous document contains Översikt, Nyheter & reaktioner, Bolagsprofil,
  Finansiellt, VD-ord, Estimat, Värdering, Insyn & ägare, Blankning and Kalender. Desktop contents
  stay sticky on the left; mobile uses a sticky, touch-sized contents sheet.
  These are anchor links, not tabs that replace the page content.
- Section anchors preserve the company, chart range and moving-average state.
  Translate legacy `?tab=` links to sections. Scroll highlighting must not
  rewrite a story-reader URL or reset the reading position when it closes.
- Company identity and a flat chart introduce the report; a material recent
  event can sit beside it on desktop. News with AI copy and observed reactions
  follows directly. Compact company/quote context remains in the contents area,
  not a permanently pinned chart.
- Start with six chronological, event-deduplicated stories and explicit “Visa
  fler”. No nested news scrolling, automatic insertion or deterministic copy
  masquerading as AI. Reports and letter mentions are progressive detail.
- Defer analytical sections until nearby or explicitly selected, then keep
  their state mounted. Preserve server-resolved Plus access. Show useful
  financial charts first, with the full statement as optional depth;
  their calculations, score thresholds and source distinctions stay unchanged.
- Bolagsprofil is an open, public section before financials, with its own anchor.
  Use a substantial, point-free shared radar with readable, upright tangent
  labels around its perimeter: Värdering, Tillväxt, Historik, Hälsa, Insyn and
  Utdelning. Retain these six axes, not a competitor's scoring vocabulary.
  Center the plot itself in its desktop column, balancing the caption below
  rather than centering chart and caption as one block. Mobile stays compact.
  Keep coverage and missing-axis names visible below it. The six numeric scores
  belong in the expandable methodology, not tiny perimeter values or generic
  explanatory blocks alongside the chart. Zero scores and missing axes differ.
  Pair the chart with compact icon-led lists: Risker above Möjligheter, shared
  20px headings and 16px reading text. Use a consistent warning icon for risks
  and star for opportunities, with semantic negative/positive colors as category
  cues—not invented severity levels or investment ratings. Text headings keep
  meaning independent of color. No borders, per-row panels or inline citations.
  Use neutral surfaces and normal mobile stacking.
  These are independently sourced report excerpts, never inferred from scores,
  missing data or unsorted VD-ord outlook/changes text. Keep report title/period
  and each claim's exact PDF-page link in one collapsed Källor disclosure below
  the lists, not a metadata line above them or a citation under each resting row.
  Source links stay 14px with touch-sized targets. Keep a concise unavailable state when no qualified
  excerpts exist. Local examples are explicitly fictional; public delivery and
  extraction remain future work. The public API currently supplies no underlying check
  values, so never imply those are available or expose private checks. Do not add a
  new Plus gate, sticky profile panel or frontend-generated scores. Load once
  nearby with a bounded request; transport errors offer retry, absent data stays
  absent, and responses must match the requested company.
- A company page represents one company. Search replaces it rather than adding
  dashboard panels.
- Financial overview charts answer growth, profit, cash generation and financing
  questions with available actuals. Keep estimates separate, preserve missing
  values and report each series' actual source—not generic coverage metadata.
  Source-linked tables remain available below the charts. Do not combine raw
  amounts across reporting currencies or call provider fallback issuer extraction.
- Group the financial overview into compact Resultat, Kassaflöde and Finansiell
  ställning surfaces. Revenue, EBIT and EBIT margin share one metric row.
  Revenue and EBIT are grouped (never stacked) bars on one amount axis; a distinct
  EBIT-margin line uses the right percentage axis, without a margin switch.
  Net margin remains available in source/statement detail, using same-period
  net income, never EBIT as a substitute. Ratios require finite inputs and positive revenue;
  missing periods break the margin line. Keep both units, a shared tooltip and
  raw values/derived percentages in the source table. The shared Kvartal / År
  control defaults to available quarterly
  actuals and changes all overview charts and the detailed statement together.
  Show the latest selected period as quiet text, not a report dropdown. Keep R12
  in statement detail (or explicitly labelled when it is the only data available).
  Changes compare the same fiscal quarter last year or the previous fiscal year;
  missing/zero/negative percentage baselines remain absent. Margin changes use
  percentage points. Retain the public summary for free/missing-history states,
  but do not repeat it above an available member overview.
- Cash flow prioritizes the latest free-cash-flow value and a compact waterfall:
  operating cash flow minus capex equals free cash flow. Use all three finite
  values from the same selected period; normalize capex to an outflow only when
  the bridge reconciles with the supplied total (floating-point tolerance only).
  Yahoo's explicit CapitalExpenditureReported may fill a missing standard capex
  field; retain its source field. A named API calculation may show OCF minus
  that capex independently of provider FCF, labelled Beräknat, with both totals
  in details. Never back-solve missing capex, add an invented "other" step, or subtract tax,
  interest or debt again. Preserve zero/negative totals. If missing or inconsistent,
  keep available figures and a short explanation instead of a misleading chart.
  Keep history, methodology and source links under Historik och beräkning.
- Finansiell ställning leads with net debt, or a positive Nettokassa headline
  when cash exceeds debt. Reuse the cash-flow panel's three-step vertical waterfall
  component: debt minus cash equals signed net debt. Keep the same bar styling,
  labels, value row, spacing and connectors; negative net debt extends below zero.
  History lives under Historik och beräkning in both panels, not beside or below
  the visible waterfall. It plots signed net debt, with zero visible and negative
  values explicitly meaning net cash. Keep the shared quarter/year selection;
  these are period-end balances, not sums across a reporting period.
  Derive only from finite, nonnegative same-period debt and cash. Reconcile any
  supplied net-debt total for legacy/unknown definitions; allow floating-point
  noise only. A named API debt-minus-cash calculation is an explicitly labelled
  OMXsum figure, independent of provider net debt. Retain the provider total
  and cash/debt definitions in details; never add an invented adjustment.
  Only join history with the same cash/debt definition. Source-only totals stay visible without a fabricated
  breakdown. History gaps stay missing. Exact inputs, source/period end, calculated
  versus supplied totals and cash-definition caveats live in Historik och beräkning.
  Cash can include short-term investments. Do not introduce net debt/EBITDA until
  its annual/R12 denominator and period basis have been verified.
- Vinst och kassaflöde sits below the waterfalls as a compact historical
  comparison. Reuse the grouped-bar renderer for nettoresultat and operativt
  kassaflöde, on one signed amount axis with zero visible. Keep the shared
  quarter/year selection, same-period actuals, source drilldown and series labels.
  Show it only if at least one selected period has both values. Other missing
  observations stay absent; the latest headline must not borrow an older value.
  Preserve losses and real zeros. Do not add a conversion ratio, quality score
  or explanatory paragraph to the resting card; methodology belongs in the
  source disclosure. Segment-revenue charts require a verified extractor
  contract and should be omitted when unavailable, not shown as empty cards.
- Omsättning per affärsområde uses the shared DonutChart for up to six rows,
  with total revenue, unit and fiscal year in the center. Keep original segment
  labels, amounts and shares always visible in the adjacent breakdown, stacked
  below a smaller donut on narrow cards. Use the theme-aware categorical
  `--ui-chart-1` through `--ui-chart-6` tokens for matching arcs and legend marks;
  these encode identity, not positive/negative performance. No shadows, gradients,
  slice labels, hover-only values or entrance animation. More than six rows use
  horizontal bars rather than recycled colors or a fabricated Other category.
  Zero remains in the breakdown without an arc; tiny slices are not inflated.
  Donut geometry uses reported shares: leave a rounding shortfall unfilled,
  clip a tolerated excess at one turn, and keep the exact shares unchanged.
  Keep fiscal year and currency/unit on the card; never imply a quarterly view
  when only annual segment data exists. External customer revenue must reconcile
  with the group's external total. Preserve reported corporate rows separately
  in the contract, real zeroes and bounded rounding differences; never create
  an Other allocation or normalize incomplete inputs to 100%. Put source links,
  denominator and rounding detail under Rapportkälla. Links target the actual
  PDF page; labels use printed pages. Use the shared surface, type, spacing and
  accent tokens, and hide the component when the data contract is unqualified.
  On `/aktie`, place revenue breakdowns together beneath the historical charts:
  Affärsområden and Länder (or Regioner) share a two-column row on wider layouts
  and stack on mobile. A lone breakdown stays half-width on desktop, including
  when there is no financial history. Do not stretch it across the whole section.
  Keep it inside the existing Plus boundary, from optional `financials.segmentRevenue`.
  Match the record and any supplied financials symbol to the requested company;
  never guess share-class aliases or fall back to design-system snapshots.
  Keep it visible when changing quarter/year charts, with its own annual label.
  It can stand alone without financial history; then omit empty period controls.
  Missing, invalid or wrong-company records render no card. The design-system
  route remains a historical reference; live upstream segment delivery is pending.
- Omsättning per land / region reuses the exact revenue-breakdown card, donut,
  legend and source disclosure. Read optional `financials.geographicRevenue`,
  not operating-segment labels, headquarters or asset location. Require a
  source-evidenced customer-location basis, matching company and reconciled
  external group revenue. Use the source's declared country/region dimension
  for the heading; never relabel regions as countries, manufacture an Other row
  or infer missing country amounts. Each card keeps its own annual period/unit.
  More than six geographic rows use the same bar fallback. Missing/invalid
  geography leaves no placeholder. The NORD.TEST country example is fictional;
  real geographic extraction/materialization/API delivery is not implemented yet.
- Värdering uses one shared P/E / EV/EBIT / P/S / EV/S control for two adjacent
  charts: historical multiple/band and its reported/estimated denominator.
  Stack panels on mobile; wrap narrow controls into two rows. Bars start at zero,
  use solid reported values and striped estimates, and preserve negative values.
  Keep period, unit and estimate source visible. No forecast price curve or
  implied fair-value band. Sources/calculations belong in one disclosure.
  Resolve consensus/model by exact metric, fiscal period, currency and basis;
  never substitute a positive model for a valid consensus loss. One quarter
  cannot become a forward annual multiple. EPS needs an explicit share basis.
  Unknown data and upstream failures are distinct from confirmed absence.
  Historical publication lag is assumed, not a verified disclosure timestamp.
  Multiple qualified annual estimates expose a shared Estimatår segmented
  control. Default to the nearest year; explicitly chosen years update the
  dotted reference, never the historical curve or statistics. Keep the choice
  between metrics where available, visibly fall back when missing, and reset
  for another company. A selected loss keeps its year but has no connector.
  Hide the selector for a single period or quarterly R12E. Never manufacture
  annual forecasts from quarters.
- VD-ord has its own anchor and navigation entry, using the shared reading
  type and controls. Separate labelled AI interpretation from expandable original
  text; show the actual report period, source link and supplied PDF page range.
  If the latest report has no readable statement, show the latest available
  company-matched statement with its own period, publication date and source,
  labelled Senaste tillgängliga VD-ord. Never borrow newer report metadata.
  Processing, extraction failure, no identified section, and locked access are
  different states. Do not revive the unqualified extracted key-figures tiles.
  New report-derived markets/risks and period comparisons need qualified extractor
  contracts; they must not be generated ad hoc in the frontend.

### Company research continuity — local v2 pass

- Keep grouped desktop contents compact and reachable on short displays. Mobile
  still uses the contents sheet, not an overflowing horizontal tab row. Quiet
  next-section links preserve the chart query parameters and focus the destination.
- The flat quote header links to the next supplied report date. Old quotes show
  their actual date instead of an unconditional Idag. Business description and
  identity facts belong in Bolagsprofil, not the news footer.
- Company news filters operate on the loaded, event-deduplicated selection:
  Alla nyheter / Rapporter. State that count's scope; it is not a complete-history
  promise or a new importance algorithm.
- Estimat uses the same qualified consensus-first, model-fallback adapter as
  Värdering. Revenue, EBIT and basis-qualified EPS show zero-based actual/forecast
  bars, with stripes and an E suffix for forecasts. Each panel keeps its own
  period, currency and source; do not replace losses or annualise quarterly data.
  No qualifying forecast means a concise empty state, not three empty charts.
- Insyn & ägare leads with 90/365-day SEK buy/sell summaries and true 0–100 %
  capital-share bars. Never substitute voting share in a capital chart or invent
  an Other slice. Show six recent trades, then explicit batches; retain source
  links, original instrument/currency and available person/owner tables in detail.
- Blankning separates the FI aggregate from named positions. The step chart uses
  disclosed history directly, even without price bars. Keep dates visible and do
  not subtract differently dated series to infer undisclosed positions. Holder
  bars compare disclosed positions, not fractions of all market shorting.
  Unsupported markets, absent observations and transport failures are different.
- Kalender leads with an agenda and date tiles. A month grid is optional detail;
  no empty full-size calendar when upcoming dates are absent. Preserve fiscal
  period and event type; supplied dates are not a guarantee or an alert opt-in.
- Registry requests remain deferred, cancelable and time-bounded, with retry and
  exact-symbol response checks. Do not fetch private data for free readers.

## Data and charts

- Historical daily data remains the company-page default. News stock charts may
  use the existing seven-day tick cache for their publication session, with
  stored minute candles as fallback. Advanced tick controls remain in Terminal.
- Company chart periods share one definition with URL metadata and OG images:
  1 day, 2 days, 1 week, 1 month, 6 months, 1/3/5 years. The 2-day view uses all
  stored observations from the latest two trading sessions, not the 1-day
  view's short previous-session context. Week/month use 5/22 stored daily bars.
  Show missing previous-session data explicitly; never fabricate candles.
  On phones, keep the eight full labels in a four-column, two-row shared
  SegmentedControl with 44px targets. Two-day intraday axes include the date.
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
