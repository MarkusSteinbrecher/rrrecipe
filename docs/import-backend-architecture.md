# Import Backend Architecture

## Current MVP Boundary

The first public MVP is a static web app hosted on GitHub Pages. It must keep
working with no backend:

- recipe browsing and cooking mode run in the browser,
- canonical seed data lives in repository files,
- local edits are stored in IndexedDB,
- YouTube import can create local drafts only from known fixtures or pasted
  description/transcript text,
- no private API keys are shipped to the browser.

The paid import feature is a later production capability. The frontend should be
prepared to call it, but the static MVP must not depend on it.

Local development now includes an experimental transcript retrieval endpoint
based on the public `jdepoix/youtube-transcript-api` approach. This endpoint is
for evaluation and data-pipeline development only; GitHub Pages still ships as a
static frontend and does not include private keys or server-side transcript
fetching.

## Production Shape

```text
GitHub Pages / Web App
  |
  | POST /api/import/youtube
  | POST /api/import/refine
  v
Import API Gateway
  |
  +-- Auth + entitlement check
  +-- Rate limits + quota
  +-- Import job creation
  |
  v
Import Worker
  |
  +-- YouTube metadata provider
  +-- Description parser
  +-- Transcript providers
  +-- AI normalization provider
  +-- Schema validation
  |
  v
RecipeCandidate response / ImportJob status
```

### Recommended Hosting

Start with Cloudflare Workers:

- fast to deploy,
- easy CORS handling for GitHub Pages,
- secrets stay server-side,
- built-in rate limiting options,
- D1/R2/Queues are available when imports become asynchronous.

If imports become long-running or require heavier media processing, split the
system:

- Cloudflare Worker remains the public API gateway,
- a queue dispatches heavy jobs,
- a separate worker/container handles long-running transcription or AI work.

## Environments

### Local Static MVP

```text
npm run dev
VITE_RRRECIPE_IMPORT_API_URL unset
```

Behavior:

- Import screen says AI/backend import is not configured.
- Known fixtures work.
- Pasted text import works.
- Arbitrary YouTube URL alone produces a source-only draft/warning.

### Local Backend Testing

```text
apps/worker
  wrangler dev --port 8787

apps/web or repo root
  VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine
  npm run dev
```

For the current single-app repo, the Vite env file can be:

```text
.env.local
VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine
```

Local worker secrets should live in `.dev.vars`, not in frontend env files:

```text
YOUTUBE_API_KEY=...
OPENAI_API_KEY=...
ALLOWED_ORIGIN=http://localhost:5174
```

### Preview/Staging

Use a separate worker and separate API keys:

```text
VITE_RRRECIPE_IMPORT_API_URL=https://staging-api.rrrecipe.org/api/import/refine
ALLOWED_ORIGIN=https://<preview-or-gh-pages-origin>
```

Staging should use:

- lower quotas,
- fixture-mode fallbacks,
- verbose import warnings,
- no production billing entitlements unless explicitly tested.

### Production

```text
Web:     https://rrrecipe.org
API:     https://api.rrrecipe.org
Worker:  rrrecipe-import-prod
```

Production requirements:

- authenticated users only for paid import endpoints,
- entitlement check before paid AI/transcript work,
- per-user and per-IP rate limits,
- request logging without storing full recipe text unless needed,
- structured error responses,
- provider timeout and retry policy,
- cost controls per user/month.

## API Contracts

### `POST /api/import/youtube`

Input:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "locale": "en-US",
  "options": {
    "useTranscript": true,
    "useAi": true
  }
}
```

Output:

```json
{
  "status": "needs_review",
  "candidate": {},
  "warnings": [],
  "jobId": "optional-for-async-imports"
}
```

Use this for the full production import path.

### `POST /api/import/refine`

Input:

```json
{
  "input": "raw URL, description, transcript, or user text",
  "candidate": {}
}
```

Output:

```json
{
  "candidate": {},
  "model": "provider/model",
  "warnings": []
}
```

Use this for the current frontend hook. It improves a local draft but does not
need to fetch external URLs.

### Async Import Jobs

Short imports can return a candidate directly. Longer imports should use:

- `POST /api/import/youtube` returns `202` with `jobId`,
- `GET /api/import/jobs/:id` returns status and candidate when ready.

Statuses:

- `queued`
- `fetching_metadata`
- `extracting_text`
- `normalizing`
- `needs_review`
- `failed`

## Provider Strategy

### YouTube Metadata Provider

Use the official YouTube Data API for:

- title,
- channel,
- description,
- thumbnail,
- duration,
- published date.

This is the reliable first production source. Many cooking channels include the
recipe in the description.

### Transcript Providers

Treat transcripts as provider-specific, not guaranteed.

Allowed providers:

- user-pasted transcript,
- uploaded transcript file,
- official YouTube captions when the user owns/authorizes the video,
- experimental local YouTube player caption-track retrieval for development,
- NotebookLM Enterprise / Gemini Enterprise if we have the required Google
  Cloud setup,
- future paid transcript provider if terms allow the use case.

Avoid making unofficial YouTube transcript retrieval a core production
dependency. It can break without notice, can be blocked by YouTube, and creates
policy/product risk.

### Experimental Local YouTube Caption Provider

The local API rebuilds the core of `jdepoix/youtube-transcript-api` in Node:

1. Fetch the YouTube watch page HTML.
2. Extract `INNERTUBE_API_KEY`.
3. Call `https://www.youtube.com/youtubei/v1/player`.
4. Read `captions.playerCaptionsTracklistRenderer.captionTracks`.
5. Fetch the selected caption track as `json3`, with XML fallback.
6. Store raw transcript text and timestamped segments in repository data files.
7. Normalize raw caption segments into readable sentence blocks.
8. Store sanitized transcript text and block metadata beside the raw files.

Local endpoint:

```text
POST /api/backlog/videos/transcript/retrieve
```

Input:

```json
{
  "videoId": "SzECOCrCSWg",
  "languages": ["en"]
}
```

Output files:

```text
data/youtube-recipes/transcripts/<videoId>.txt
data/youtube-recipes/transcripts/<videoId>.json
data/youtube-recipes/transcripts/<videoId>.sanitized.txt
data/youtube-recipes/transcripts/<videoId>.blocks.json
```

The backlog video receives:

```json
{
  "transcript": {
    "status": "provider",
    "localPath": "data/youtube-recipes/transcripts/<videoId>.txt",
    "jsonPath": "data/youtube-recipes/transcripts/<videoId>.json",
    "sanitizedPath": "data/youtube-recipes/transcripts/<videoId>.sanitized.txt",
    "blocksPath": "data/youtube-recipes/transcripts/<videoId>.blocks.json",
    "source": "youtube_internal_captions",
    "segmentCount": 52,
    "blockCount": 35,
    "isGenerated": false
  }
}
```

The Import UI can show either representation:

- raw: YouTube caption segments with original timing,
- sanitized: merged sentence blocks used for recipe parsing and AI input.

Known limitations:

- no guarantee captions exist,
- generated captions can be incomplete or inaccurate,
- cloud IPs may be blocked,
- age-restricted/private videos are not supported,
- this is not the official YouTube Data API.

### NotebookLM Enterprise Provider

NotebookLM Enterprise can be evaluated later as a provider:

1. Create notebook through API.
2. Add YouTube video source through API.
3. Ask/extract structured recipe information through the available enterprise
   query/answer path.
4. Convert the result into `RecipeCandidate`.

This requires Google Cloud/Gemini Enterprise access and should be behind the
same provider abstraction as other extraction options.

References:

- NotebookLM Enterprise overview:
  https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/overview
- NotebookLM Enterprise source API:
  https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources

### AI Normalization Provider

The AI provider receives extracted text plus source metadata and returns strict
JSON matching `RecipeCandidate`.

Rules:

- validate all AI output before returning it,
- preserve raw ingredient lines,
- preserve source references and timestamp evidence,
- attach warnings for missing/ambiguous fields,
- never auto-save AI output as a recipe without user review.

## Paid-User Model

Import endpoints should be behind an entitlement check:

```text
anonymous/free user
  - local browser import only
  - paste text manually
  - no paid backend AI

paid user
  - backend URL import
  - YouTube metadata import
  - AI normalization
  - transcript provider attempts where allowed
```

Recommended controls:

- monthly import quota,
- max video duration,
- max transcript/input size,
- per-minute rate limit,
- provider cost cap,
- abuse detection for repeated failed imports.

Authentication and payments can be decided later. The import API should only
depend on a small user context:

```ts
type RequestUser = {
  id: string;
  plan: "free" | "paid";
  quotaRemaining: number;
};
```

## Data Storage

### MVP Backend

The import backend should be stateless at first:

- fetch URL,
- generate `RecipeCandidate`,
- return it,
- browser saves after user review.

Store only operational logs and rate-limit counters.

### Production Backend

Add persistence when needed:

- D1: users, import jobs, quotas, saved server-side recipes if sync exists,
- R2: uploaded files/images/transcripts when user explicitly imports files,
- KV: short-lived cache for YouTube metadata and provider responses,
- Queues: long-running import jobs.

Retention rule:

- do not store transcripts or extracted recipe text by default unless needed for
  user-visible history, debugging with consent, or sync.

## Security

- Browser never receives provider API keys.
- CORS allowlist only known origins.
- Validate URL hosts and reject private/internal IP targets.
- Enforce body size limits.
- Validate `RecipeCandidate` schema before response.
- Redact secrets and large user text from logs.
- Keep provider errors user-readable but not secret-revealing.

## Local Implementation Milestones

1. Keep current static import flow working without backend.
2. Add `apps/worker` with one health endpoint.
3. Add `POST /api/import/refine` using mocked AI output.
4. Point Vite `.env.local` to the local worker and test the frontend button.
5. Add YouTube metadata fetch with fixture tests.
6. Add strict `RecipeCandidate` validation.
7. Add one real AI provider behind a secret.
8. Add `POST /api/import/youtube`.
9. Add experimental local caption-track retrieval for backlog videos.
10. Add auth/entitlement stub before production.
11. Add quotas, logging, and staging deployment.
