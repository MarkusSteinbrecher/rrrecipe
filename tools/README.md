# tools/

Research and dev-only tooling. **Nothing under `tools/` ships in the SPA build.**
See [`design/decisions/0001-mvp-scope.md`](../design/decisions/0001-mvp-scope.md).

## Layout

- `import-dev-server/` — local Node HTTP server that prototypes the future Cloudflare
  Worker import surface (refine, YouTube metadata, transcript retrieval, source-page
  extraction). Run with `npm run research:dev-api`. Requires `.dev.vars` at the repo
  root for `YOUTUBE_API_KEY`, `OPENROUTER_API_KEY`, etc.
- `research/youtube/` — Node CLI scripts that drive the YouTube Data API to build
  the research catalog and backlog under `data/youtube-recipes/`. None of these
  outputs are imported by the SPA.
- `research/themealdb/` — collector for TheMealDB sample recipes. Output is research
  data only; not bundled.
- `lib/` — shared utilities used by both the dev server and research scripts
  (`env.mjs`, `transcripts.mjs` — segment-to-block normalizer).

## What works (verified)

- **YouTube transcript retrieval** in `import-dev-server/dev-server.mjs`. HTML
  scrape → `INNERTUBE_API_KEY` → `youtubei/v1/player` → caption track → JSON3/XML.
  Eight verified outputs in `data/youtube-recipes/transcripts/`. Planned: lift the
  core into a single-purpose `research/youtube/fetch-transcript.mjs` CLI.
- **YouTube Data API collector** at `research/youtube/collect-recipes.mjs` —
  search + videos.list, deduped, sorted by view count.

## SSRF warning

`import-dev-server/dev-server.mjs` blindly fetches arbitrary URLs found in
YouTube descriptions (the source-page extractor). Acceptable for local dev; **never
expose this on the public internet without a host allowlist + rate limits +
entitlement check.** When this code eventually lifts into a real Cloudflare Worker,
those controls are mandatory — see [`docs/import-pipeline.md`](../docs/import-pipeline.md) §"Future Paid-Import Surface".
