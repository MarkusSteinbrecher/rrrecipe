# 2026-05-19 — Claude #27: migrate detail shell to render-detail

What was done (PR `claude/render-detail`, closes #27):

- Added `src/render-detail.ts` with `DETAIL_FRAGMENT`, `DETAIL_REF_IDS`, typed
  `DetailRefs`, `DetailViewState`, `detailRefsFromDocument`, and refs-based
  `renderDetail(refs, snapshot, recipe, version, view)`. Pulled the four
  Detail-only workflow helpers in with it: `renderWorkflowRow`,
  `renderWorkflowOverview`, `renderWorkflowShop`, `renderWorkflowPrep`,
  `renderWorkflowCook`. Also brought across `renderInlineCookStep`,
  `renderVersionItem`, and `recipeVisualUrl` (all Detail-only).
- Added `src/render-detail.test.ts` (happy-dom). Covers: titlebar + four
  workflow row counts + begin-cooking CTA, servings multiplier on the shop row,
  step count + per-step rendering on the cook row, version history list.
- Updated `src/render-test-harness.ts` to export and mount `DETAIL_FRAGMENT`
  alongside Browse (the import branch will add `IMPORT_FRAGMENT` on merge).
- Wired `src/main.ts`: `renderDetail()` now returns
  `renderApp(DETAIL_FRAGMENT, "recipe")` (or `renderMissing()` when no
  recipe/version), and `render()` calls `renderCurrentDetail(snapshot)` after
  mounting. `currentDetailView()` derives the view slice from global state.
- Removed the moved helpers (and the now-orphan `servingsLabel`) from main.ts.
  `renderIngredientRow` / `renderIngredient` / `stepLabel` stay because Shop,
  Mise, Cook, and the import candidate review still use them — duplicated
  inside render-detail for now; future shared-format extraction can DRY.

Verified: `npm run typecheck` clean, `npm test` clean (82 tests), `npm run
build` clean. Bundle delta: built JS 134.98 kB on `main` to 137.04 kB on this
branch (+1.5%); `dist/` block size 192K on both.

Visual diff captured in
[`assets/2026-05-19-render-detail/`](assets/2026-05-19-render-detail/):
[`detail-before.png`](assets/2026-05-19-render-detail/detail-before.png)
(focaccia on `main`) and
[`detail-after.png`](assets/2026-05-19-render-detail/detail-after.png)
(focaccia on this branch) are byte-identical (52,408 B each) — confirms a
pure refactor. Method: single Vite dev server on port 5174, branch swap via
git checkout, hot-reload picked up the new module, headless Chrome navigated
to the focaccia detail page on each branch.

Note on Non-goals: kept `bindEvents` in main.ts (all data-action contracts —
`go-library`, `start-cooking`, `toggle-workflow-section`, `servings-minus/plus`,
`select-cook-step`, `select-version`, `toggle-mise`, `edit-recipe`,
`reset-demo` — unchanged). Did not touch `renderRecipeWorkflow` (the
recipe-mode chrome wrapper) or any of Shop/Mise/Editor/Cook renders.
