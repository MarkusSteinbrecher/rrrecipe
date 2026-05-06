# 2026-05-06 — Session 2: scope reset, bundle dropped from 9.7 MB to 200 KB

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
