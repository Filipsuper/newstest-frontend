**OMXSUM**

Repository of the webapp for https://omxsum.com

Next.js (App Router) frontend. Server-side rendered so shared links get proper
previews: every article page gets its own `<title>`, meta description, OG/Twitter
tags and a dynamically generated OG image (`/article/<slug>/opengraph-image`).
Newswire events now have the same shareability at `/nyhet/<id>` and
`/nyhet/<id>/opengraph-image`, with an intercepted in-app reader dialog.

## Development

Clone `newstest-frontend` and `newsbackend` beside each other, configure the
backend `.env`, then start the complete local stack with:

```bash
./scripts/dev-local.sh
```

The launcher installs missing dependencies, starts the Express backend on
`http://localhost:8000`, starts Next.js on `http://localhost:5173`, waits for
both services, opens the site, streams both logs, and stops both processes with
Ctrl+C.

Use a backend checkout elsewhere or change the ports when needed:

```bash
OMXSUM_BACKEND_DIR=/path/to/newsbackend FRONTEND_PORT=3000 ./scripts/dev-local.sh
```

Run `./scripts/dev-local.sh --help` for all supported overrides.

In development mode, login does not send an email. Submitting the login form
returns a localhost-only magic link and opens it immediately. The same link is
also printed in the backend log. To test actual email delivery, set
`DEV_SEND_EMAIL=1` and `RESEND_API_KEY` in the backend `.env`. Production
continues to use Resend.

## Verification

Run `npm test` for unit tests and `npm run build` for a production build.
`npm run test:ui` starts an isolated preview on port 3111 and a fictional API
on 8100, runs browser/accessibility tests, and stops both services. It does not
write to production accounts. See `docs/news-first-workspace.md` for production
preview and backend test commands.

## Environment variables

- `NEXT_PUBLIC_API_URL` — API base URL used by the browser. Baked into the
  client bundle at **build** time (set to `https://omxsum.com/api` in production
  builds, see Dockerfile).
- `API_URL` — API base URL used by the server for SSR/metadata/OG images. Read at
  **runtime**. On the VPS, point it straight at the backend
  (e.g. `http://localhost:8000/api` or `http://172.17.0.1:8000/api` from inside
  Docker) so SSR doesn't round-trip through nginx.

## Public-site information architecture

- `/` remains the editorial landing page for OMXsum and its daily letters.
- `/marknaden` is the news-first daily workspace: selected important events,
  compact market context, a briefing and watchlist preview, and latest news.
  `/marknaden/nyheter` is its Plus/Pro chronological news view with URL filters.
- `/nyhet/<id>` is the public, shareable event reader. Client navigation opens
  a Base UI dialog; direct visits/reloads render a standalone reading page.
- `/bevakning` is the signed-in reader's matched news feed, with companies,
  topics and keywords managed at `/bevakning/hantera`.
- `/aktier` is the searchable company directory and `/aktier/screener` its
  discovery tool; `/aktie/<SYMBOL>` remains the canonical company page.
- `/nyhetsbrev` is the reading library for Morgonbrevet and Kvällsbrevet. The two
  existing letter routes remain available, and `/alla-nyhetsbrev` redirects to
  the new hub.
- `/terminal` remains the separate, denser product for active monitoring.

The market overview reads the public, cached `/feed/market-overview` backend resource.
That deliberately limited response keeps the upstream Market API key on the
server while the full live news feed, movers tools and screener remain gated.
The shared news-first data/UI contract and remaining source-dependent work are
documented in `docs/news-first-workspace.md`; component/layout rules are in
`UI.md` and `docs/design-system.md`. The corresponding backend change broadens
the curated candidate pool, forwards archive cursors when provided upstream,
and provides a bounded related-company-news preview. Deploy both repositories
together; the full feed remains server-gated.

## SEO and indexing policy

Company pages are the largest crawlable surface on the site, so the rules for
them are explicit:

- **Indexable:** every symbol in the tracked listing (`/feed/companies`). The
  overview — identity, description, chart, calendar, news — is public, so the
  page a visitor from search lands on is the page Google saw. Financials,
  estimates and valuation stay behind Plus and are not part of the indexed
  content.
- **`noindex, nofollow`:** a symbol missing from the listing (delisted, or a
  hand-typed URL) and a symbol the API reports as unknown. The route streams, so
  its 200 status is committed before render and `notFound()` can no longer change
  it — the robots directive is the signal that still works.
- **Transient failures stay indexable.** A listing or backend that failed to
  answer is not evidence that a company is gone.
- **One URL per company.** `/aktie/<SYMBOL>` is canonical; the `tab`, `range` and
  `ma` parameters change the view and the share card but never the canonical URL.
  Tabs are buttons with `replaceState`, so no parameter variants are crawlable.
- **Structured data** describes the company (`Corporation` with ticker, ISIN,
  employees and description), the page and its breadcrumb. Prices and estimates
  change by the minute and are deliberately never emitted as structured facts.
- **Sitemap** lists exactly the tracked companies, so it cannot disagree with the
  per-page directive.
- **Out of the index entirely:** `/settings`, `/bevakning`, `/bekrafta` and
  `/pro/klart` — personal, token-bearing or post-checkout pages.

## Production (VPS)

```bash
docker build -t omxsum-frontend .
docker run -d -p 3000:3000 -e API_URL=http://172.17.0.1:8000/api omxsum-frontend
```

The container runs Next.js standalone on port 3000 — point the nginx server
block for omxsum.com at it (previously the react-router-serve port).
