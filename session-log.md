# Session log

Append-only, dated summaries of significant work. PMO reads these across projects.
Format: `## YYYY-MM-DD — <one-line summary>`. End every working session with an entry.
See `~/Code/HQ/wiki/conventions/session-log.md`.

## 2026-05-06 — Repo audit and HQ scaffolding

What was done:

- Audited the repo created by Codex against the stated objective and the rrradio
  reference. Findings: monolithic 3,291-line `src/main.ts` with no tests; 2,331-line
  `apps/worker/dev-server.mjs` mixing 6 services; ~10 MB of research data
  (TheMealDB, 1,504-video YouTube backlog, raw API dumps, baseline images) bundled
  into the static GH-Pages build for an MVP that ships one Shakshuka recipe; no
  HQ artifacts (no `CLAUDE.md`, no session log, no decisions, no wiki page).
- Confirmed the YouTube transcript fetcher in `apps/worker/dev-server.mjs:1156-1366`
  works (8 transcript outputs in `data/youtube-recipes/transcripts/`); plan to
  lift it into a clean `scripts/youtube/fetch-transcript.mjs` CLI later.
- Drafted a five-session cleanup plan: HQ scaffolding → scope reset (cut bundle) →
  modularize main.ts + tests → restore design fidelity → lift transcript CLI.
- Landed Session 1: this `session-log.md`, root `CLAUDE.md` per the
  `wiki/conventions/project-claude-md.md` template, wiki project page at
  `~/Code/HQ/wiki/projects/rrrecipe/`, and `design/decisions/0001-mvp-scope.md`.

What changed in the world:

- Root `CLAUDE.md`, `session-log.md`, `design/decisions/0001-mvp-scope.md`,
  and `~/Code/HQ/wiki/projects/rrrecipe/README.md` all now exist.
- Future agents opening this project inherit the operating manual and the
  scope decision from the start.

Open / next:

- Session 3: decompose `src/main.ts` into focused render modules (`render-browse`,
  `render-detail`, `render-mise`, `render-cook`, `render-timers`) plus
  `cook-session`, `voice`, `wake-lock`, `timer`, `ingredient-scale`. Add vitest
  with first tests on `parseYouTubeVideoId`, `parseQuantity`/`formatScaledQuantity`,
  `withBaselineCatalog` merge, and the transcript block normalizer. Pattern
  mirror: rrradio's `render-*.ts` + `*Refs` interface + `render-test-harness.ts`.
- Session 4: design fidelity audit against `internal/design_handoff_recipe_app/`
  + collapse docs (17 files → 5) and prune `docs/open-decisions.md` into ADRs.
- Session 5: lift the working YouTube transcript fetcher from
  `tools/import-dev-server/dev-server.mjs:1156-1366` into a single-purpose
  `tools/research/youtube/fetch-transcript.mjs` CLI.

## 2026-05-06 — Session 2: scope reset, bundle dropped from 9.7 MB to 200 KB

What was done:

- Removed the four research-data imports from `src/main.ts:2-5`
  (`baselineBacklog`, `mealDbCatalogUrl`, `youtubeBacklog`, `youtubeCatalog`)
  and the four Vite globs over `data/youtube-recipes/{transcripts,candidates,
  source-pages}`. Replaced with empty inline stubs typed against
  `YouTubeRecipeBacklog`/`YouTubeRecipeCatalog`/`BaselineRecipeBacklog`/
  `TheMealDBCatalog`. The workbench UI still exists but renders against
  empty data; full UI strip deferred to Session 3 / 4.
- Dropped `loadMealDbCatalog` and the `mealDbCatalogUrl` runtime fetch.
- Dropped `baselineRecipeImageSlugs` and the baseline image lookup in
  `recipeVisualUrl()`. The design canon uses striped placeholders intentionally
  ("Imagery: none in this design").
- Removed `public/data/` entirely (was 5.9 MB: 4 baseline PNGs + 8 channel
  avatar/banner images, none referenced by the design-spec UI).
- Moved `apps/worker/` → `tools/import-dev-server/`.
- Moved `scripts/lib/` → `tools/lib/`, `scripts/youtube/` → `tools/research/youtube/`,
  `scripts/themealdb/` → `tools/research/themealdb/`. Updated the dev-server's
  import path for `tools/lib/transcripts.mjs`.
- Renamed npm scripts under a `research:` prefix (`research:dev-api`,
  `research:youtube:*`, `research:themealdb:*`). The default story is
  `npm run dev` / `npm run build`; nothing in the build path touches
  research code.
- Updated `vite.config.ts` watch ignore list to `**/data/**`, `**/research/**`,
  `**/tools/**`.
- Wrote `tools/README.md` documenting the boundary, the verified-working
  YouTube transcript fetcher, and the SSRF warning on the source-page
  extractor in `dev-server.mjs`.
- Updated `README.md` to point at `CLAUDE.md`, ADR 0001, and `session-log.md`
  instead of the now-irrelevant `data/baseline-recipes/` and `data/themealdb-recipes/`
  references.

What changed in the world:

- `dist/` is now 200 KB (was 9.7 MB). JS chunk: 147 KB (38.88 KB gzip);
  CSS: 50 KB (8.88 KB gzip). Verified: `npm run typecheck` and
  `npm run build` both pass clean.
- The static MVP no longer depends on any research data to build or run.
- `data/youtube-recipes/raw/` was already gitignored — verified zero
  files tracked there; nothing to force-remove.

Open / next:

- Session 3 still unchanged: decompose `src/main.ts` (3,287 lines after
  stub edits) into focused modules + add vitest. The workbench code is
  the natural first slice to remove since it now operates on empty data.
- Three docs still reference `apps/worker/` and `scripts/{youtube,themealdb}`:
  `docs/development-setup.md`, `docs/local-dev-implementation-plan.md`,
  `docs/import-backend-architecture.md`. Will be addressed in Session 4
  during the docs collapse.
