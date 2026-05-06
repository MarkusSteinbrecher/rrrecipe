# 2026-05-06 — Codex #6: extract candidate finalization into a pure helper

What was done (PR `codex/save-candidate-as-recipe`, closes #6):

- Extracted the candidate→snapshot logic out of `finalizeImportCandidate`
  in `src/main.ts` into `src/import-finalize.ts` as
  `buildSnapshotForCandidate(snapshot, candidate, now?)`. Pure: takes a
  snapshot, returns a new one + the new recipe/version/source ids, plus
  an `updatedExistingRecipe` flag. `main.ts` now calls it and writes
  through `saveSnapshot`.
- `buildSnapshotForCandidate` matches existing imports by source id,
  YouTube `videoId`, external provider+id, or url; reuses ids on update;
  immutable input (works on `structuredClone` of the snapshot).
- ID patterns: `recipe-import-<uuid>`, `variant-import-<uuid>-original`,
  `version-import-<uuid>` — distinguishable from manual / baseline ids.
- 5 new tests in `src/import-finalize.test.ts` cover: required fields
  propagate, ids follow the pattern, `RecipeVariant.name` is "Original",
  origin is `import` and `createdBy` is `importer`, source is added once
  even when re-imported, an existing import update bumps the recipe's
  `currentVersionId` instead of creating a duplicate recipe.

Verified: `npm run typecheck` clean, `npm test` 63 / 63, `npm run build`
clean. SPA bundle: 147.94 KB (was 147.19 KB; ~+800 bytes for the new
helper module).
