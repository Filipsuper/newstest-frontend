# Personal news experience: implementation sequence

Local work, not a release record. Existing unrelated ROADMAP edits are preserved.

## 1. Important personal selection — first slice implemented

Mina bolag precedes Nyhetsflöde, retaining existing routes. Marknaden's personal
entry now sits below the index strip. Direct company matches with importance
≥75 qualify; routine notices/insider filings do not. No quota filling, new AI
calls, email changes or price-only promotion. Only existing summaries are used.

The catch-up API now requests seven days. Important candidates use a separate
company-scoped upstream query (importance >=75), before the chronological page
limit. Routine notices are excluded and exact event IDs deduplicated. The top
20 candidates are returned separately from the timeline; the UI shows up to
three unread candidates. A candidate cap or incomplete scan is disclosed.
Neither AI generation nor newsletter selection/delivery changes in this slice.

## 2. Company-led catch-up — local implementation

Important developments → expandable company timelines → other interests.
Exact identities/event IDs; no new fuzzy grouping. `Olästa` replaces the local
last-visit baseline. Individual explicit read actions use signed, account-scoped
receipts over source headline/summary/company identity. Reading a page does not
write. AI/price/importance/transport version changes do not reset read state;
changed source copy does. Old acknowledgements cannot mark changed copy read.

Backend implementation lives in the clean `../backend-personal-news` worktree,
branch `codex/personal-news-continuation`, based on deployed `2429478`.
Mongo collection `personal_news_reads` in the existing account database stores
hashed receipt identities with 30-day TTL; signed receipts expire after seven
days. No new database. Store failure preserves news and exposes unavailable
read state; old backend compatibility is retained. Local unit/router/browser
checks cover isolation, tampering, retries, source changes and read-only visits.
Actual Mongo persistence still needs staging verification before deployment.

Seven-day scans remain bounded to 25 source pages / 5,000 rows / 12 seconds per
window; hitting a bound is partial coverage, never proof of complete catch-up.
The company pool uses exact followed symbols (up to 100), independent of broad
topic/keyword traffic. Both windows use short caching and in-flight coalescing;
only page/featured candidates receive summary/price enrichment. Chronological
cursors never include the separate editorial pool. Older backends still show
their reported 48-hour window, not a fabricated seven-day claim.
Remaining deployment checks: real source coverage/latency and Mongo read-state
persistence. No live coverage guarantee has been validated yet.

## 3. Smarter full feed — local implementation

URL-backed Urval/Alla, chronological in both, plus Mina bolag scope. Backend
applies importance/company scope upstream of the source page, then excludes
routine notices. Source cursors remain authoritative: filtering may leave an
empty page with older pages available. Client applies the same inclusion to
live frames. Plus/Pro guards remain. `Med kursdata` preserves chronological
order instead of comparing daily changes and different event-return windows.
The tiny inclusion policy is mirrored across repositories and has contract
examples in both; keep copies aligned when policy changes.
Existing event deduplication was not redesigned in this slice.

## 4. Email consistency — preview implemented; delivery work pending

An explicit preview button under the importance slider uses the real server
content-eligibility function with draft level/company mutes. No writes, sends,
AI calls, retrospective sends or claims about actual email counts. Partial
coverage is disclosed. Changing draft inputs hides stale examples.
Delivery, consent, quiet hours, suppression, caps and pilot settings are intact.
First newsletter alignment is now implemented locally: daily candidates reuse
Urval's inclusion policy, prioritize followed companies then explicit keywords
and topics, exclude inferred industry-only matches, and deduplicate exact events.
Price size no longer orders the personal newsletter. The live personal-preview
endpoint uses the same selection. Existing daily window, paid access and AI
bullet generation remain; no seven-day resend or alert-slider crossover.
HTML/plain text retain story links even with AI bullets and link directly to
Mina bolag. Partial scan coverage is passed through and disclosed for paid readers.
Renderer lives in `../newsletter-personal`, branch
`codex/personal-newsletter-continuity`, based on cached scheduler main `9b90e70`.
The original scheduler checkout and its unrelated edit were left untouched.
Validation: 14 email tests, 38 browser layouts; backend 407 passed/two skipped.
Fictional mobile/light and desktop/dark previews inspected; no sends/deployment.
Remaining: integration against the deployed scheduler/source versions and any
separately consented topic/keyword digest. Templates belong to Filipsuper/news-test.

## 5. Saved searches and feedback — keyword handoff/preview implemented

Search → Bevaka sökord prefills the shared keyword editor. Read-only examples use
the exact lexical matcher from real personal feeds and explain headline vs
source-summary matches. Only an explicit Add saves the keyword, using existing
limits; the UI states that category/company filters are not saved. No new email
consent. Exclusions and a reversible first feedback UI are now implemented:
After user feedback, both per-story preference actions were removed. Interests
are managed in the shared editor. Markera som läst appears on desktop row hover
or keyboard focus, and remains visible on touch devices and while saving.
Its space stays reserved to prevent layout shifts. Word exclusions
are tucked under `Avancerade undantag`. Up to ten lexical
words/phrases suppress only topic/keyword matches (also in the daily personal
newsletter); direct company matches always survive. User-scoped atomic add/remove
operations avoid bulk-overwrite conflicts. The full feed, alerts and consent are
unchanged. Active exclusions are visible from Mina bolag and removable under
Nyckelord. Real Mongo concurrency still needs integration verification.
Remaining: complete saved-filter combinations and any learned relevance model.
No semantic matching, behavioral profiling or new analytics were introduced.
Validation: 10 browser checks passed, backend 411 passed/two skipped; fictional
demo supports the actual pure exclusion matcher with in-memory preferences.

## Interactive demo

Port 3112 uses the fictional API at 8101, never production. The fixture can load
the pure matching/email-preview helpers from `NEWS_DEMO_BACKEND_DIR`; no database,
AI provider or mailer is imported. Its read receipts/preferences are in memory
and reset on restart. The email UI flag is enabled only in this demo process;
delivery always remains unavailable. Port 3111's live-API configuration is unchanged.

## Local verification — 28 September

- Frontend unit suite: 269 passed; focused personal selection checks also passed
  after excluding acknowledged stories from the important selection.
- Backend suite: 400 passed, two skipped, no failures.
- Final newsroom/personal-live/catch-up browser run: 35 passed. Email preference
  tests and the draft email-preview check also passed in the broader run.
- Desktop personal overview and 390px feed screenshots inspected; mobile feed
  has no horizontal overflow.
- Both worktrees pass `git diff --check`. No deployment or real email sends.
- Real Mongo persistence remains unverified; local demo receipts use memory.

Catch-up continuation: 16 focused backend tests and eight browser tests passed,
including a five-day-old company story outside the latest page, read actions on
that story, coverage warnings and preserved filters behind story modals.
Full unit rerun: frontend 269 passed; backend 403 passed, two skipped. Refreshed
3112 demo visually verified with a clearly fictional five-day-old company story.
