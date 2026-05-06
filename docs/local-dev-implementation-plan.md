# Local Dev Implementation Plan

## Purpose

This document is the handoff point for local development across sessions. It
tracks what exists now, how to run it, and what to build next.

## Current State

### Web App

- Vite + TypeScript app at repo root.
- Runs as a static GitHub Pages-compatible app.
- Local recipe state is stored in IndexedDB.
- Import screen supports:
  - known YouTube fixture draft,
  - pasted text draft,
  - optional backend refinement when `VITE_RRRECIPE_IMPORT_API_URL` is set.

### Local Import API

- Implemented at `apps/worker/dev-server.mjs`.
- Runs with no extra dependencies.
- Started through `npm run dev:api`.
- Loads `.dev.vars` automatically when present.
- Provides a local mock for:
  - `GET /health`
  - `POST /api/import/refine`
  - `POST /api/import/youtube`
- Does not call YouTube, NotebookLM, transcripts, or a real AI provider yet.
- Can call OpenRouter when `AI_PROVIDER=openrouter` and
  `OPENROUTER_API_KEY` are configured.
- Falls back to local mock parsing when OpenRouter is unavailable or rate
  limited.
- Exists to test the frontend/backend contract.

## Local Run Modes

### Static MVP Mode

Use this when working on the GitHub Pages app behavior.

```sh
npm run dev
```

Expected app behavior:

- Import screen says AI refinement is not configured.
- Known fixture and pasted text imports still work.
- Arbitrary YouTube URL alone cannot extract a transcript.

### Backend Contract Mode

Use this when working on the future paid import feature locally.

Terminal 1:

```sh
npm run dev:api
```

Terminal 2:

```sh
VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine npm run dev -- --port 5175
```

Open:

```text
http://localhost:5175/rrrecipe/
```

Expected app behavior:

- Import screen says AI refinement is available.
- Create a local draft.
- Click `refine with ai`.
- If OpenRouter is configured, the backend tries OpenRouter first.
- If OpenRouter is unavailable/rate-limited, the local mock returns an
  improved/confirmed candidate with a warning.

Local `.dev.vars`:

```text
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

The pinned Gemma free model is the default local experiment model because it is
more repeatable than `openrouter/free`. It is still not stable enough for
production and may return rate-limit errors depending on OpenRouter availability.

## Local API Smoke Checks

Health:

```sh
curl http://localhost:8787/health
```

Refine:

```sh
curl -X POST http://localhost:8787/api/import/refine \
  -H 'content-type: application/json' \
  -d '{
    "input": "Ingredients:\n500 g flour\n400 ml water\nSteps:\n1. Mix flour and water.",
    "candidate": {
      "id": "candidate-test",
      "source": {
        "id": "source-test",
        "type": "youtube",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "retrievedAt": "2026-05-04T00:00:00.000Z"
      },
      "title": "YouTube recipe import",
      "language": "en",
      "ingredients": [],
      "steps": [],
      "notes": [],
      "tags": ["youtube"],
      "confidence": {
        "overall": 0.1,
        "source": 0.9,
        "ingredients": 0.1,
        "steps": 0.1
      },
      "warnings": []
    }
  }'
```

## Implementation Phases

### Phase 1: Contract Mock

Status: started.

- [x] Add local API process with no dependencies.
- [x] Add `npm run dev:api`.
- [x] Add `/health`.
- [x] Add `/api/import/refine` mock.
- [x] Add `/api/import/youtube` stub.
- [x] Add frontend env example.
- [x] Add `.dev.vars` loading.
- [x] Add OpenRouter provider attempt with local fallback.
- [ ] Add automated Playwright smoke test for backend refinement mode.

### Phase 2: Shared Schema

Goal: make frontend and backend validate the same `RecipeCandidate` contract.

- Move shared types/schema toward `packages/schema` or keep a generated copy
  until the repo is split.
- Add runtime validation for API input/output.
- Reject invalid AI/provider output before the frontend sees it.
- Add fixture JSON for known-good and known-bad import candidates.

### Phase 3: YouTube Metadata Provider

Goal: backend can fetch public metadata and descriptions.

- Add Cloudflare Worker scaffold or keep the dev server API-compatible.
- Add `YOUTUBE_API_KEY` in worker secrets only.
- Implement video ID parsing server-side.
- Fetch title, channel, description, thumbnail, duration, published date.
- Parse recipe-like description blocks.
- Return description-only candidates with clear warnings.

### Phase 4: AI Normalization Provider

Goal: backend can normalize extracted text into `RecipeCandidate`.

- Add provider abstraction.
- Add one real provider behind a secret.
- Force strict JSON response.
- Validate response.
- Preserve raw ingredient lines and evidence/timestamp notes.
- Attach confidence and warnings.

### Phase 5: Transcript Providers

Goal: support transcripts only through allowed providers.

- User-pasted transcript.
- Uploaded transcript file.
- Official YouTube captions for owned/authorized videos.
- NotebookLM Enterprise/Gemini Enterprise provider if access exists.
- Do not rely on unofficial scraping as a product dependency.

### Phase 6: Paid Production Gate

Goal: only paying users can spend backend/AI quota.

- Add auth provider decision.
- Add entitlement check.
- Add per-user import quota.
- Add per-IP rate limit.
- Add cost cap.
- Add production logs with redaction.

## Open Decisions

- Auth/payment provider.
- Whether production import jobs are synchronous or queued from day one.
- First real AI provider.
- Whether NotebookLM Enterprise access is available.
- Where server-side recipe sync starts: Cloudflare D1, Supabase, or another DB.

## Resume Notes

If picking this up later:

1. Run `npm run build` to check the web app.
2. Run `npm run dev:api` to start the local import API.
3. Start Vite with `VITE_RRRECIPE_IMPORT_API_URL` to test backend refinement.
4. Continue with Phase 1 automated smoke test or Phase 2 shared schema.

## YouTube Dataset Work

The programmatic recipe research pipeline is documented in
`docs/youtube-recipe-dataset.md`.
The end-to-end backlog, catalog, candidate, and QA process is documented in
`docs/data-gathering-process-flow.md`.

Current scripts:

- `npm run youtube:backlog -- add-video --url URL --priority 1`
- `npm run youtube:backlog -- add-channel --channel @handle --max-videos 200`
- `npm run youtube:expand-channel -- --channel @handle --max-videos 200`
- `npm run youtube:collect -- --target 500`
- `npm run youtube:build-ai-inputs`
- `npm run youtube:captions -- --video-id VIDEO_ID --language en`

The collector requires `YOUTUBE_API_KEY` in `.dev.vars`. Transcript extraction
through the official captions API requires `YOUTUBE_OAUTH_TOKEN` and permission
to edit the video. Arbitrary public-video transcript scraping is not part of the
core implementation.
