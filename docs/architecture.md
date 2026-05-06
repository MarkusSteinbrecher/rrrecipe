# Architecture

> Companion to [`../CLAUDE.md`](../CLAUDE.md). The CLAUDE.md sets the operating
> rules; this doc describes what's actually here and how it's organized.

## Stack

- **Web (Phase 1):** Vite + TypeScript, vanilla DOM, mobile-first. Static MVP
  on GitHub Pages, no backend. IndexedDB for local recipe storage.
- **iOS (Phase 2, later):** SwiftUI + SwiftData/SQLite. Mirrors the web UX and
  consumes the same JSON contracts. xcodegen project layout, matching the
  `rrradio` pattern.
- **Backend (Phase 3+, later):** Cloudflare Worker behind the import endpoints
  in [`import-pipeline.md`](import-pipeline.md). The static MVP must run with
  the Worker absent or unreachable.

## Source layout

```text
rrrecipe/
  src/                        # Vite SPA
    main.ts                   # SPA entry; render loop and event bus
    style.css                 # design-canon tokens + per-screen styles
    storage.ts                # IndexedDB + baseline merge wrapper
    snapshot-merge.ts         # pure baseline-catalog merge (testable)
    ingredient-scale.ts       # parseQuantity / formatQuantity / scaling
    format.ts                 # uid, timestamps, speakStep helpers
    types.ts                  # AppSnapshot, Recipe, RecipeVersion, ...
    importers/                # YouTube id parsing, candidate construction
    data/                     # baseline-catalog.ts + app-snapshot.json
  internal/design_handoff_recipe_app/
                              # design canon (5 screens, tokens, interactions)
  design/decisions/           # ADRs (NNNN-slug.md)
  docs/                       # this directory — architecture, data-model,
                              # cooking-mode, import-pipeline, versioning,
                              # plus localization-and-units, video-steps
  data/                       # research datasets — not bundled into the SPA
  tools/                      # research and dev-only tooling — not bundled
    import-dev-server/        # local Node prototype of the future Worker
    research/                 # YouTube + TheMealDB collectors and docs
    lib/                      # transcripts.mjs (segment-to-block normalizer)
  public/                     # static assets that ship with the SPA
  .github/workflows/          # GitHub Pages deploy
```

UI, import extraction, and any future backend IO must stay separate modules.
The render loop in `main.ts` will decompose into per-screen `render-*.ts` modules
+ a render harness (rrradio's pattern) in a future session.

## Storage

**MVP:** the SPA stores recipes locally in IndexedDB (`storage.ts`).
Export/import JSON is a first-class escape hatch from day one.

**Future sync:** when sync ships, the Worker owns canonical recipe records (D1
or another small SQL DB), R2 stores user-uploaded images, and clients keep a
local cache they reconcile on launch/resume. Account design is deferred until
sync is needed — see [`versioning.md`](versioning.md) for the conflict model.

## Client responsibilities

### Web

- Library / Browse / Detail / Mise en place / Cook / Timers (per the design
  canon at `internal/design_handoff_recipe_app/`).
- Recipe editor, source links, tags, search.
- Hands-free cooking mode (tap/swipe/voice) — see [`cooking-mode.md`](cooking-mode.md).
- Offline read access to saved recipes.

### Worker (later)

- Fetch external URLs server-side with a host allowlist.
- Parse Schema.org Recipe JSON-LD and basic metadata.
- Call model providers for unstructured extraction; never expose keys to the
  browser.
- Track async import job status.
- Enforce CORS, auth, entitlement, rate limits.

### iOS (later)

- Native Browse / Cook flow.
- Share extension: "Import to rrrecipe" from Safari/YouTube.
- Offline cache.
- Later: camera/photo import and Siri/Shortcuts hooks.

## Testing

The pure-logic contracts get unit-tested first (vitest); UI smoke tests come
later. Initial coverage:

- `parseYouTubeVideoId` — URL forms, bare IDs, embedded-in-text.
- `parseQuantity` / `formatQuantity` / `formatScaledQuantity` — ingredient
  scaling math.
- `mergeBaselineCatalog` — append-without-duplicate, sourceId merge,
  immutability of input.
- `normalizeTranscriptSegments` — gap/sentence splits, maxBlockChars,
  timestamp rounding.

Run with `npm test` (one-shot) or `npm run test:watch`. Future:
- Worker tests with mocked fetch and model calls (when the Worker exists).
- Web smoke tests for library, editor, import review, and cooking mode.
- iOS XCTest for schema decoding and search parity.

## Local development

```sh
npm install
npm run dev              # Vite dev server on port 5174
npm run typecheck        # tsc --noEmit
npm test                 # vitest run
npm run build            # tsc + vite build → dist/
```

### Port allocation

Pin to these so multiple agents / sessions don't fight for ports or duplicate
servers. Mirror of `AGENTS.md` §4.1.

| Port | What runs there | Start command |
|---|---|---|
| 5173 | (Vite default — avoid, not used here) | — |
| **5174** | Primary Vite dev server. iPad URL `http://<mac-ip>:5174/rrrecipe/`. | `npm run dev` |
| **5175** | Secondary Vite — when also running the dev-api locally. | `VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine npm run dev -- --port 5175` |
| **8787** | Local dev import API (channel intake, transcript retrieval, candidate generation). | `npm run research:dev-api` |

The dev server binds `0.0.0.0` so a phone on the same Wi-Fi can hit it at
`http://<mac-ip>:5174/rrrecipe/`. Useful for testing cooking mode on real
hardware. If a port is already in use, run `lsof -i :<port>` first — don't
silently start a parallel server on a different port.

The optional research/import dev-API runs separately:

```sh
npm run research:dev-api   # node tools/import-dev-server/dev-server.mjs
```

Secrets for the dev-API live in `.dev.vars` at the repo root (gitignored):

```text
YOUTUBE_API_KEY=...
OPENROUTER_API_KEY=...
ALLOWED_ORIGIN=http://localhost:5174
```

Pointing the SPA at the dev-API:

```sh
VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine npm run dev -- --port 5175
```

## Quality gates

Expected on every change:

```sh
npm run typecheck
npm test
npm run build
```

For iOS later:

```sh
cd apps/ios
xcodegen
xcodebuild test -project RecipeApp.xcodeproj -scheme RecipeApp \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```
