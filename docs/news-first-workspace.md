# News-first workspace

Implementation contract for the public workspace released on 7 September 2026.
See [release history](release-history.md) for deployment evidence and
[ROADMAP.md](../ROADMAP.md) for the current backlog. Later changes still require
separate deployment approval.

## Product contract

The public experience answers “What happened?”, “How did trading react?” and
“What matters to me?”. The terminal supports deeper investigation. Keep the
marketing landing page separate. Do not optimize the public site for showing
the most widgets or the largest stock percentages.

Three destinations: Marknaden (overview, chronology and personal Bevakning),
Aktier (discovery/research, with Screener underneath), Breven (editions).
The reader is a contextual destination reachable from all news surfaces.
The navigation, automatic updates and letter-first layout below were released
on 13 September 2026 (Stockholm), frontend `5485d6b`. Verification and rollback
details are recorded in the release history.

## Architecture

- `ui/`: Base UI primitives, semantic tokens and reusable presentation.
- Shared tabs use explicit value-based IDs and keep inactive panels hidden and
  inert, preserving label/control associations through SSR and hydration.
- `newsroom.js`: normalized story data, safe URLs, event selection and merging.
- `NewsFeedItem`: one event row with company, headline, source/time and a signed
  percentage explicitly labelled “sedan publicering”. It links to a story URL.
- `/nyhet/[id]`: server metadata and canonical full-page reader.
- `@story/(.)nyhet/[id]`: intercepted reading dialog. Browser Back closes it;
  direct visits and refresh render the full route. Catch-all slot clears a
  reader when navigating to another destination.
- `StoryReader`: summary → observed reaction → optional deeper figures/source
  text → original sources and follow actions. Never claim a matched headline
  establishes causality. Reaction-series gaps remain visible.
- `/nyhet/[id]/opengraph-image`: server-rendered 1200×630 PNG with the same
  public event. Prefer a completed fixed reaction window; a rolling percentage
  is marked as a snapshot. No user data, arbitrary remote image fetches, or fake
  stock curves. Generated images deliberately use a fixed light/dark contrast
  composition matching the public semantic palette.
- `LiveNewsFeed`: used by the Plus overview and full feed. Search/category/view
  are URL-backed. Stream frames and fallback polls insert stories automatically.
  Price-only updates refresh observations without reordering; actual news changes
  refresh the selection. Pause keeps the snapshot and resume catches up.
- `useLiveScrollAnchor`: preserves the visible story's screen position when
  automatic updates insert or resize rows above it, including after reader close.
- `/marknaden/bevakning`: personal feed with URL-backed match filters. Snapshot
  polling and the overview's personal preview refresh every 30 seconds while
  visible; overlapping company/topic/keyword matches belong to each filter.
- `WatchPreferencesEditor` and `WatchPreferencesButton`: one compact editor for
  the dialog and direct manager, with three visible tabs, selected chips and
  searchable grouped topics. Legacy personal routes redirect to Marknaden.
- `letters.js`: Stockholm-local edition selection and real preview extraction.
  The latest published letter leads the contextual column for every reader,
  with its full headline, actual edition date and up to two supplied takeaways
  (word-boundary excerpt fallback). Two compact personal headlines follow it.
  Desktop context grows to 384px; at 960px the order becomes featured news,
  letter, personal preview, then latest news, all in normal document flow.
- `FollowCompanyButton`: one persistence/error/cap/login behavior; does not
  change email, push, Telegram or keyword-alert delivery preferences.

## Data and access

The public market snapshot is a selection, not the complete chronological
wire. The full feed continues to require Plus/Pro in both UI and backend.
The backend candidate pool is now 100 importance-filtered events. Frontend
selection excludes routine insider filings, invitations, old/future events,
and repeated leading companies. It does not require a price move for important
new information to appear.

The backend forwards opaque upstream pagination cursors when supplied. Category
filters apply to each returned page; a filtered page can be empty while still
having an older-page cursor. Production cursor availability must be verified
against the actual Market API. Do not infer pagination support from a mock.

Keep quote timestamps separate from latest publication and connection state.
The mean of breadth and news-price direction is not a news-sentiment score, so
the former composite Marknadston widget has been removed.

Personal catch-up is local to the account and device. It filters the fetched
48-hour personal pool relative to the previous visit, not an unlimited archive
and not a per-story read/unread tracker. Exact letter→story source links need
stable story IDs from the composer; company mentions alone are insufficient.

## Verification

- `npm test`: selection, deduplication/version handling, missing values,
  source/route safety, evening cutoff, plus the existing foundation tests.
- Backend: `OPENAI_API_KEY=test-placeholder node --test ../newsbackend/tests/*.test.js`
  from this checkout (placeholder only satisfies an unused import in pure tests).
- `npm run build`: production compilation and route generation.
- Browser: `npm run test:ui` starts and stops a fictional backend on 8100 and
  an isolated Next preview on 3111. After `npm run build`, test the production
  build with `PLAYWRIGHT_START_CMD="npm run start -- --hostname 127.0.0.1 --port 3111" npm run test:ui`.
  Browser interception routes API requests to the fixture and blocks external
  scripts. No production account, alert or subscription writes.
- Inspect 320/390px and desktop light/dark screenshots, reader focus and route
  history, connection recovery, automatic arrivals/pause, and positive/negative/missing-data
  and long-headline OG images. Automated accessibility checks are not a claim
  of full WCAG certification or a substitute for reader testing.
