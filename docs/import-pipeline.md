# Import Pipeline

## Principle

Every import should produce a reviewable `RecipeCandidate` with:

- normalized recipe fields,
- source URL and source type,
- evidence snippets or transcript segments,
- confidence per major field,
- warnings for missing or ambiguous data.

The app should never silently save a low-confidence AI extraction as if it were
ground truth.

## Source Types

### Recipe Websites

Preferred path:

1. Worker fetches the URL.
2. Extract `application/ld+json`.
3. Find Schema.org `Recipe` objects.
4. Normalize ingredients, instructions, times, yield, author, image, and tags.
5. Return a high-confidence candidate.

Fallback path:

1. Extract readable text from the page.
2. Ask an LLM to produce strict JSON matching our schema.
3. Attach evidence snippets and lower confidence.
4. Require review before saving.

### YouTube

Use YouTube as a source, but be careful about transcript access.

MVP implementation status:

1. `src/importers/youtube.ts` parses normal YouTube, youtu.be, shorts, embed,
   and raw video IDs.
2. The browser creates a reviewable `RecipeCandidate`; it does not silently save
   the import.
3. The candidate preserves the YouTube `Source`, thumbnail URL, canonical URL,
   and step-level `mediaAnchors`.
4. The first known fixture is
   `https://www.youtube.com/watch?v=SzECOCrCSWg`, used to validate the end-to-end
   recipe save path.
5. Unknown videos can still produce a low-confidence draft when the user pastes
   the video description, transcript, or NotebookLM output under the URL.
6. For research and import-pipeline development, the local
   `npm run research:youtube:fetch-transcript -- --video-id <id>` CLI fetches a
   transcript via the public player API and writes raw / sanitized / blocks files
   under `data/youtube-recipes/transcripts/`. Same code path as the dev server's
   `/api/backlog/videos/transcript/retrieve`. Not part of the SPA build; not a
   public production surface — see [`tools/README.md`](../tools/README.md).

Reliable path:

1. Parse the video ID from the URL.
2. Fetch video title, channel, description, thumbnail, and duration through the
   official YouTube Data API.
3. Extract likely recipe page links from the description and fetch/parse those
   pages first. Prefer JSON-LD `Recipe` data when a page provides it.
4. Look for recipe-like structure in the description if no linked recipe page is
   available.
5. If timestamps or chapters exist in the description, convert them into
   step/media anchor candidates.
6. If transcript text is available, normalize it through the same LLM pipeline
   and estimate step timestamps where confidence is high enough.

Allowed transcript paths:

- User pastes transcript text.
- User imports a transcript file.
- The user is the video owner and grants OAuth access to caption tracks.
- Manual NotebookLM workflow: user imports the YouTube URL into NotebookLM,
  asks it for a structured recipe, then pastes/exports the result into the app.

Avoid as a product dependency:

- Scraping unofficial YouTube transcript endpoints.
- Downloading YouTube audio for transcription without rights.
- Depending on NotebookLM automation unless an official API is available for the
  account and use case.

YouTube imports should preserve the video as a source even when the recipe text
comes from a linked recipe page, the description, or a transcript. The saved
recipe can then link individual steps back to video timestamps.

### Plain Text

1. User pastes text.
2. App runs local heuristics for title/ingredients/instructions.
3. LLM normalization runs if the structure is unclear.
4. User reviews and saves.

### PDFs, Photos, Screenshots

Phase 2+:

1. Upload file to Worker.
2. OCR/transcribe where needed.
3. Normalize into `RecipeCandidate`.
4. Preserve the original file reference if storage is enabled.

## Candidate JSON Shape

```json
{
  "title": "Example Recipe",
  "source": {
    "type": "youtube",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Original video title",
    "author": "Channel name"
  },
  "yield": { "quantity": 4, "unit": "servings", "raw": "Serves 4" },
  "times": {
    "prepMinutes": 20,
    "cookMinutes": 35,
    "totalMinutes": 55
  },
  "ingredients": [
    {
      "raw": "2 tbsp olive oil",
      "quantity": 2,
      "unit": "tbsp",
      "item": "olive oil"
    }
  ],
  "steps": [
    {
      "text": "Heat the oil in a large pan.",
      "timerSeconds": null
    }
  ],
  "tags": ["dinner"],
  "confidence": {
    "overall": 0.84,
    "ingredients": 0.9,
    "steps": 0.78
  },
  "warnings": []
}
```

## First Fixtures To Collect

- 5 recipe blogs with Schema.org JSON-LD.
- 5 recipe sites with messy or partial structured data.
- 5 YouTube videos whose descriptions contain ingredients.
- 5 YouTube videos where the recipe is only spoken.
- 3 PDFs or photographed recipes.
- 3 pasted family recipes with loose formatting.

## Future Paid-Import Surface

Per [`design/decisions/0001-mvp-scope.md`](../design/decisions/0001-mvp-scope.md),
the static MVP runs with no backend. The paid import surface is a later
production capability — the frontend should be prepared to call it, but the
build must not depend on it.

When that capability ships:

- **Hosting:** Cloudflare Worker. Easy CORS for GitHub Pages, secrets stay
  server-side, built-in rate limiting, D1/R2/Queues available for async jobs.
- **API surface:**
  - `POST /api/import/youtube` — full path (URL → metadata → transcript →
    candidate). Returns `202 + jobId` for long-running imports;
    `GET /api/import/jobs/:id` polls for status.
  - `POST /api/import/refine` — improves a local draft from raw text without
    fetching external URLs. Used by the frontend's "refine with AI" button.
- **Provider strategy:**
  - YouTube Data API for metadata (title, channel, description, thumbnail,
    duration, published date).
  - Transcripts only from allowed sources: user-pasted, uploaded file,
    creator-owned OAuth captions, NotebookLM Enterprise (if access exists).
    No unofficial transcript scraping as a product dependency.
  - One AI normalization provider behind a strict-JSON contract; validate all
    output before returning; preserve raw ingredient lines and timestamp
    evidence.
- **Required controls before public launch:** auth + entitlement check; per-user
  monthly import quota; per-IP rate limit; provider cost cap; URL host allowlist
  (reject private/internal IPs); body-size limits; redaction of secrets and
  large user text from logs.
- **The browser never receives provider API keys.** The Worker is the only
  place those keys live.

The verified-working YouTube transcript fetcher in
[`tools/import-dev-server/dev-server.mjs`](../tools/import-dev-server/dev-server.mjs)
is the prototype for the transcript-provider piece. Lifting it into a real
Worker is a separate, post-MVP project — it requires the controls above before
it can be exposed publicly.
