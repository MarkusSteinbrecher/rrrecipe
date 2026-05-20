# 2026-05-20 — Claude: Guided Import Phase D — save & roundtrip

Phase D of #38. Local-only; not pushed.

What was done (same branch, `feature-guided-import-phase-a`):

**Save handler (in `src/main.ts`):**
- `save-import-review` action is no longer a no-op. It now:
  1. Validates the editing candidate (title present, at least one
     ingredient or step). Shows a toast on failure.
  2. Calls the existing `buildSnapshotForCandidate(state.snapshot, candidate)`
     in `src/import-finalize.ts` — which mints stable recipe / version /
     variant / source IDs, handles the re-import case
     (matches by videoId / external-id / url), and returns the
     updated snapshot.
  3. Persists with `await saveSnapshot(state.snapshot)` (IndexedDB).
  4. Sets `state.selectedRecipeId = result.recipeId`, clears
     `state.selectedVersionId`, and navigates to the Detail screen.
  5. Clears `state.reviewVideoId` and `state.editingCandidate`.
  6. Shows a success toast — "Recipe saved from import." or
     "Recipe updated from import." for re-imports.

The pure save function (`buildSnapshotForCandidate`) already existed and
already had thorough unit coverage in
`src/import-finalize.test.ts` — Phase D leans on that.

**Renderer (in `src/render-import-review.ts`):**
- Exported new pure helper `saveDisabledReason(candidate)` returning
  `undefined` (savable) or a short reason string ("Add a recipe title
  before saving." / "Add at least one ingredient or step before
  saving.").
- `renderSaveBar(candidate)` now takes the candidate, asks for the
  reason, and either renders the save button enabled or disabled with
  the reason text as a sibling `<p class="rr-import-review-save-hint">`.
  Removed the "(phase D)" label from the button copy.

**Tests:**
- Updated the existing "save bar disabled" test to assert the button is
  *enabled* for a complete demo candidate.
- Added two new render tests covering the disabled cases (no title; no
  ingredients/steps).
- Added a small parametric suite for `saveDisabledReason` covering the
  same three states.
- Total: 117 across 14 files (up from 112/14).

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean,
`npx vite build` clean.

Bundle delta: 814.26 → 815.06 KB raw (+0.80), 213.53 → 213.71 KB
gzipped (+0.18). CSS unchanged. Most of the work was wiring; the heavy
helper already existed.

## End-to-end roundtrip now works

Static GH-Pages build, fresh tab:
1. Import tab → expand "manual video backlog" → click `review` on the
   focaccia demo.
2. Edit any field — title, ingredient quantities, step text, timers,
   anchors, tags.
3. Click `save recipe`. The recipe is persisted to IndexedDB and the
   app navigates straight to the Detail view for the new recipe.
4. The recipe appears in Browse, opens in Detail, the Shop view shows
   the ingredient list. Cooking Mode works.
5. On a second pass, the demo row shows both a `review` button and a
   `recipe` link — review re-clones the original bundled candidate;
   recipe jumps to the saved version.

Acceptance criteria from #38 (the user-facing ones) are now met for
the demo-candidate path. The remaining acceptance criterion — pasted
URL → candidate → review → save — is Phase E (URL-paste path with
dev-API integration), which is dev-only and gracefully degraded in the
static build.

Unblocks Phase E (last). After E, the issue can close.

## Known follow-up (not blocking)

- The demo row's `review` button re-clones the *original bundled
  candidate*, not the user's already-saved edits. If a user wants to
  edit a saved recipe, that's the existing edit flow (Detail → edit).
  Consider in polish: detect saved → offer "open saved recipe" instead
  of "re-review demo".
- `Source.id` on the bundled demo candidates is a generated UUID per
  file. The match-by-videoId path in `findMatchingSource` handles this,
  but the source `id` saved into IndexedDB is the candidate's source
  id, not a freshly-minted one. Re-importing the same video creates a
  new `RecipeVersion` against the existing `Recipe` — append-only as
  designed. Good.
