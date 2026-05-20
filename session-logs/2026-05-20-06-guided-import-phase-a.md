# 2026-05-20 — Claude: Guided Import Phase A — bundle demo candidates

Phase A of #38 (Guided recipe creation from a video source). Local-only;
not pushed.

What was done (branch `feature-guided-import-phase-a`):

- Created `src/data/demo-candidates/` with 5 curated YouTube candidate
  JSONs copied from `data/youtube-recipes/candidates/`:
  - **SzECOCrCSWg** — How to Bake the Best Focaccia Bread (6 ing / 12 st, 0.62 conf) — canonical fixture per `docs/import-pipeline.md`
  - **-__qVqib9Pw** — Lasagna Better Than Your Mums (20 ing / 14 st, 0.88 conf) — highest confidence
  - **GJnQvXqRtdE** — S'mores Blondie with Torched Marshmallow (23 ing / 21 st, 0.82 conf) — dessert / large
  - **7SeMTPzWbx4** — Caramelised White Chocolate & Pecan Flapjacks (9 ing / 4 st, 0.70 conf) — medium baking
  - **yz3mSclK5kk** — 4-Ingredient Daily Bread (2 ing / 14 st, 0.70 conf) — simple
- Created `src/data/demo-candidates.ts` that:
  - Imports the 5 JSON wrappers
  - Exports `demoCandidates: RecipeCandidate[]`
  - Exports `demoCandidatesByPath` keyed as `demo/candidates/<videoId>.candidate.json` so the existing path-suffix lookup in `localCandidateForVideo` / `localCandidateFileExists` matches without code changes
  - Exports `demoCandidatesAsBacklogVideos()` which synthesises `YouTubeBacklogVideo` rows from each candidate (video title, channel, thumbnail, duration, candidate.status = "needs_review")
- Wired `src/main.ts`:
  - `localCandidateModules` now points at `demoCandidatesByPath`
  - `localCandidateFiles` now lists those paths
  - Added `seedDemoBacklogVideos()` called from `boot()` after snapshot load — merges the synthesised videos into `state.localBacklogVideos`, skipping any the user has already deleted

- Wrote `src/data/demo-candidates.test.ts` with 7 tests covering: shape, count, source type, confidence range, path-key format, backlog-video synthesis, and channel metadata preservation.

The existing `backlogChannelGroups()` logic in main.ts puts videos with
no associated channel under a "manual video backlog" group, so the demo
videos appear naturally without inventing a new section.

The candidate review pane still uses the legacy summary HTML
(`renderImportCandidate`) — the side-by-side review screen is Phase B.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (97 tests
across 13 files, up from 90/12), `npx vite build` clean. All 5 demo
titles confirmed present in `dist/assets/index-*.js`.

Bundle delta: 745.62 → 792.97 KB raw (+47.35 KB), 197.23 → 209.51 KB
gzipped (+12.28 KB). About 9.5 KB raw / 2.5 KB gzipped per demo
candidate. Bundle still well under the 1 MB raw target.

Unblocks Phase B: side-by-side video player + read-only candidate review.
