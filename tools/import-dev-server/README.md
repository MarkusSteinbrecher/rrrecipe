# rrrecipe Local Import API

This directory currently contains a dependency-free local backend mock. It is
not the production Cloudflare Worker yet. Its job is to let the web app exercise
the backend contract while the GitHub Pages MVP remains static.

## Run Locally

Terminal 1:

```sh
npm run research:dev-api
```

Terminal 2:

```sh
VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine npm run dev -- --port 5175
```

Then open:

```text
http://localhost:5175/rrrecipe/
```

The Import screen should say AI refinement is available. It is available only as
a local mock unless `.dev.vars` configures a provider.

## Local AI Provider

Create `.dev.vars` at the repo root:

```text
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/owl-alpha
```

`npm run research:dev-api` loads `.dev.vars` automatically.

`openrouter/owl-alpha` is the default because OpenRouter lists it as a free
model with `response_format` and structured-output support as of 2026-05-06.
Free models can still be temporarily unavailable or rate-limited. When that
happens, the local API falls back to the deterministic mock parser and returns
a warning.

## Endpoints

### `GET /health`

Returns a health payload for local checks.

### `POST /api/import/refine`

Accepts the frontend refinement payload:

```json
{
  "input": "raw pasted text",
  "candidate": {}
}
```

Returns:

```json
{
  "candidate": {},
  "model": "local-mock/refine-v0",
  "warnings": []
}
```

When OpenRouter is configured, this endpoint first tries OpenRouter structured
outputs. If OpenRouter fails, the endpoint falls back to local mock parsing so
frontend testing can continue.

### `POST /api/import/youtube`

Early contract stub for the future full YouTube import endpoint. It does not
call YouTube, transcripts, or AI yet.

## Production Direction

Replace this mock with a Cloudflare Worker that:

- validates user auth and paid entitlement,
- fetches YouTube metadata server-side,
- attempts allowed transcript providers,
- calls an AI normalization provider,
- validates and returns a `RecipeCandidate`.

See `docs/import-pipeline.md` §"Future Paid-Import Surface".
