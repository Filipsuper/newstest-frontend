**OMXSUM**

Repository of the webapp for https://omxsum.com

Next.js (App Router) frontend. Server-side rendered so shared links get proper
previews: every article page gets its own `<title>`, meta description, OG/Twitter
tags and a dynamically generated OG image (`/article/<slug>/opengraph-image`).

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

## Environment variables

- `NEXT_PUBLIC_API_URL` — API base URL used by the browser. Baked into the
  client bundle at **build** time (set to `https://omxsum.com/api` in production
  builds, see Dockerfile).
- `API_URL` — API base URL used by the server for SSR/metadata/OG images. Read at
  **runtime**. On the VPS, point it straight at the backend
  (e.g. `http://localhost:8000/api` or `http://172.17.0.1:8000/api` from inside
  Docker) so SSR doesn't round-trip through nginx.

## Production (VPS)

```bash
docker build -t omxsum-frontend .
docker run -d -p 3000:3000 -e API_URL=http://172.17.0.1:8000/api omxsum-frontend
```

The container runs Next.js standalone on port 3000 — point the nginx server
block for omxsum.com at it (previously the react-router-serve port).
