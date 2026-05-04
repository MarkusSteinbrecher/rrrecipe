# Architecture Plan

## Baseline Approach

Mirror the parts of `rrradio.org` that fit:

- **Web first:** Vite + TypeScript, minimal dependencies, mobile-first UI.
- **Native iOS second:** SwiftUI client that consumes the same published JSON
  contracts and API endpoints.
- **Small backend:** Cloudflare Worker for imports, CORS, API keys, rate limits,
  and future sync.
- **Generated/shared artifacts:** schema fixtures, test data, and import results
  are committed as stable examples so regressions are easy to see.
- **Tests around contracts:** pure parsing and normalization logic should be
  heavily tested before UI tests.

## Proposed Source Layout

```text
rrrecipe/
  apps/
    web/                  # Vite + TypeScript web app
    worker/               # Cloudflare Worker import/sync API
    ios/                  # SwiftUI app once Phase 4 starts
  packages/
    schema/               # JSON schemas and TypeScript types
    importers/            # pure extraction/normalization helpers
    fixtures/             # saved HTML/transcripts/import examples
  docs/
    architecture.md
    data-model.md
    import-pipeline.md
    development-setup.md
    open-decisions.md
```

Start with a single package if that is faster, but keep this boundary in mind:
UI, import extraction, and backend IO should not become one tangled module.

## Storage Strategy

### MVP

- Web stores recipes locally in IndexedDB.
- Worker stores no user recipes at first; it only returns import candidates.
- Export/import JSON is available from day one.

### Sync Version

- Worker owns canonical recipe records in Cloudflare D1 or another small SQL
  database.
- R2 stores user-uploaded images and extracted thumbnails.
- Clients keep a local cache and sync on launch/resume.

This avoids forcing account design into the MVP while leaving room for real
multi-device sync later.

## Client Responsibilities

### Web

- Recipe library, search, tags, collections.
- Recipe editor and import review.
- Cooking mode with step focus, timers, scaling, notes.
- Offline read access to saved recipes.

### Worker

- Fetch external URLs server-side.
- Parse Schema.org Recipe JSON-LD and basic metadata.
- Call model providers for unstructured extraction.
- Track import job status for longer operations.
- Hide API keys and enforce source allow/deny rules.

### iOS

- Native library, search, cooking mode, timers.
- Share extension: "Import to rrrecipe" from Safari/YouTube.
- Offline cache.
- Later: camera/photo import and Siri/Shortcuts hooks.

## Test Strategy

- Unit tests for recipe schema validation, ingredient parsing, URL parsing, and
  import normalization.
- Fixture tests for each import source class.
- Worker tests with mocked fetch and model calls.
- Web smoke tests for library, editor, import review, and cooking mode.
- iOS XCTest for schema decoding and search parity when the native client starts.
