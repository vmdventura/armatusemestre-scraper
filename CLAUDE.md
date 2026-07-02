# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is a Dominican Republic data scraper project. It started as a UASD university schedule scraper ("arma tu semestre" = build your semester), pivoted through a Caribbean Cinemas billboard scraper, and is now focused on **Deportes DO** — a Dominican Republic sports data scraper.

## Runtime & Tooling

- **Node.js v20**, plain ESM (`.mjs` files), native `fetch` — no build step, no TypeScript, no bundler
- No `package.json` exists yet; add one only when a dependency is actually needed
- Scripts are run directly: `node <script>.mjs`

## Data Output Convention

All scraped data follows this envelope schema (established in prior work):

```json
{
  "updated_at": "<ISO timestamp>",
  "source": "<source domain>",
  "country": "DO",
  "total": <integer>,
  "<entity>": [...]
}
```

Scraped data files live in `data/`.

## Scraping Approach

Prior scrapers used direct HTTP POST to JSON APIs with browser-mimicking headers — no browser automation. Key headers used:

```js
{
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': '<Chrome UA string>'
}
```

If a target site returns non-200 or non-JSON, that signals IP blocking and the script should `process.exit(1)` with a clear message.

## GitHub Actions

Use `workflow_dispatch` (manual trigger) for CI scripts when verifying whether GitHub Actions runner IPs can reach a target API — this was the pattern used to probe the UASD API.

## Conventions

- Commit messages are written in **Spanish**
- Country code is always `DO` (Dominican Republic)
- Branches named `claude/<task>-<id>` are Claude-authored feature branches
