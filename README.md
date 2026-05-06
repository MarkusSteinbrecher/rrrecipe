# rrrecipe

Planning and development prep for a private-first recipe app for web and iOS.

The intended shape is close to `rrradio.org`: a fast web app first, a native
SwiftUI iOS client next, shared data contracts, small backend surfaces only
where the browser or mobile clients should not hold secrets or perform brittle
imports.

Canonical recipe data starts in [src/data/app-snapshot.json](src/data/app-snapshot.json).
The baseline recipe catalogue lives in [src/data/baseline-catalog.ts](src/data/baseline-catalog.ts)
and uses the same recipe/version/source structure as imported recipes. The web
app merges those baseline records into IndexedDB for local runtime edits.

Research artifacts (YouTube backlogs, TheMealDB collections, transcript pulls)
live under [`data/`](data/) and [`tools/research/`](tools/research/) but are
**not bundled into the SPA** — see [`design/decisions/0001-mvp-scope.md`](design/decisions/0001-mvp-scope.md).
Operating manual: [`CLAUDE.md`](CLAUDE.md). Live state: [`session-log.md`](session-log.md).

## Goals

- Save, search, cook, annotate, and organize personal recipes.
- Import recipes from recipe websites, plain text, photos/PDFs, and YouTube.
- Preserve source attribution and extraction confidence for every import.
- Work well on mobile web immediately; support native iOS later.
- Keep the app quiet, utilitarian, and fast instead of building a social feed.

## Proposed Phases

1. **Phase 0: Product and data model**
   - Lock the recipe schema, import result schema, and source attribution model.
   - Collect 20-30 real import examples: blogs, YouTube videos, PDFs, pasted text,
     screenshots, and hand-written recipes.
   - Build importer fixtures before building UI polish.

2. **Phase 1: Web MVP**
   - Vite + TypeScript single-page app.
   - Local-first storage in IndexedDB.
   - Manual recipe editor, search, tags, source links, cooking mode.
   - Import from structured recipe web pages via server-side fetch and JSON-LD.

3. **Phase 2: Import service**
   - Cloudflare Worker API for URL fetching, CORS handling, API-key shielding,
     and import jobs.
   - Extract recipe candidates from Schema.org Recipe JSON-LD first.
   - Fall back to text extraction plus LLM normalization.
   - Require user review before saving uncertain imports.

4. **Phase 3: YouTube imports**
   - Fetch public YouTube metadata through the official YouTube Data API.
   - Accept captions/transcripts only from allowed sources:
     user-pasted transcript, creator-owned OAuth caption access, or manual export.
   - Use NotebookLM as an optional manual research helper, not as the backend API.
   - Feed transcript text into the same LLM normalization pipeline.

5. **Phase 4: Native iOS**
   - SwiftUI app sharing the same JSON contracts.
   - SwiftData or SQLite local cache.
   - Import share extension for URLs and text.
   - Native cooking mode, timers, and offline recipe access.

6. **Phase 5: Sync and accounts**
   - Add auth only when multi-device sync is needed.
   - Sync recipes, tags, edits, and import job results through the Worker API.
   - Keep export/import of all user data as a first-class escape hatch.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — stack, source layout,
  storage, testing, local development.
- [`docs/data-model.md`](docs/data-model.md) — Recipe / Version / Variant /
  Source / IngredientLine / InstructionStep contracts.
- [`docs/cooking-mode.md`](docs/cooking-mode.md) — hands-free cooking flow,
  command model, voice/touch/visual inputs.
- [`docs/import-pipeline.md`](docs/import-pipeline.md) — candidate-review
  contract, source-type playbooks, future paid-import surface.
- [`docs/versioning.md`](docs/versioning.md) — append-only edits, variants,
  drafts, sync conflict model.
- [`docs/video-steps.md`](docs/video-steps.md) — step↔video timestamp anchors.
- [`docs/localization-and-units.md`](docs/localization-and-units.md) —
  measurement display, density table, language layers.
- [`design/decisions/`](design/decisions/) — ADRs.
- [`internal/design_handoff_recipe_app/README.md`](internal/design_handoff_recipe_app/README.md)
  — high-fidelity design canon for the five SPA screens.
- [`tools/README.md`](tools/README.md) — research and dev-only tooling
  (not bundled in the SPA).
