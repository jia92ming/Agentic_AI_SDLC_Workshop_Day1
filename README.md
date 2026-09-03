# Snip Backend

A tiny URL shortener backend built with Bun, zero npm dependencies.

## Setup

```bash
bun install
bun start
```

The server runs on port 3000 by default (configurable via `PORT` env var).

## API

### Create a short link
```
POST /api/links
{ "url": "https://example.com/very/long/path" }
→ 201 { code, url, shortUrl, hits, createdAt }
→ 400 on invalid JSON or non-http(s) URL
```

### Get all links
```
GET /api/links
→ 200 [ { code, url, shortUrl, hits, createdAt }, ... ]
```

### Redirect to original URL
```
GET /:code
→ 302 Location: [original URL] (increments hits)
→ 404 if code not found
```

## Environment Variables

- `PORT` (default: 3000) — Server port
- `BASE_URL` — Base URL for short links (auto-detected if not set)
- `RAILWAY_PUBLIC_DOMAIN` — Fallback domain when deployed
- `PUBLIC_DIR` — Optional: serve static files from this directory
