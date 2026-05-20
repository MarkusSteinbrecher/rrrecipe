# 2026-05-20 — Claude: Phase 3 batch 1 (Italian pasta + sauce)

Phase 3 of the baseline catalogue build-out — first agent-drafted batch.
Validates the parallel-drafting workflow before launching more batches.

Branch `baseline-phase-3-batch-1-italian-pasta`. Local-only; not pushed.

What was done:

- Spawned one general-purpose agent with a self-contained brief: read
  `QUALITY-BAR.md` and the existing 8 catalogue seeds (especially bolognese)
  as reference, draft 5 BaselineSeed objects to `/tmp/phase3-batch1-italian-pasta.ts`,
  self-check against the bar. Strict instruction: do not edit project files.
- Agent produced 5 high-quality seeds:
  - **Cacio e Pepe** — 3 ingredients + pasta salt, 7 steps including pepper toast
    and the cement-paste cheese emulsion, notes covering the seize failure mode,
    fine-grate requirement, gricia variation, tonnarelli vs other shapes, and
    warm bowls.
  - **Pasta all'Amatriciana** — orthodox AIC version (no onion, no garlic),
    cold-skillet guanciale render, white wine deglaze, 9 steps, notes covering
    the no-onion controversy, guanciale vs pancetta, fat retention, no-wine
    variant, and pasta shape.
  - **Potato Gnocchi** — baked-potato method as primary technique, 10 steps
    including the test-gnoccho check and butter-sage finish, notes covering
    less-flour-than-you-think, bake-vs-boil, tomato variant, freezing, and
    gnocchi alla romana disambiguation.
  - **Pesto Genovese** — food processor method with chilled bowl, 8 steps,
    notes covering off-heat application, full mortar-and-pestle method, the
    traditional potato + green-bean accompaniment, oil-film storage, and
    substitutions.
  - **Macaroni and Cheese** — mornay-based baked American mac with panko crust,
    12 steps with off-heat cheese addition, notes covering grate-your-own
    cheese, sauce-should-look-loose, stovetop variant, Southern custard
    variant, and make-ahead.
- Reviewed all 5 against the bar — every recipe satisfies all checklist
  items (sections, metric, explicit fat/salt, 6–14 steps with cues,
  structured oven temperatures, `ingredientRefs`, exactly 5 notes,
  reused-bucket collections).
- Spliced the 5 seeds into the end of the `seeds` array in
  `src/data/baseline-catalog.ts` via a small Node script (200 lines added).
- Flipped the 5 corresponding backlog items to `status: promoted` with
  their `baselineRecipeId`s.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests, 12
files), `npx vite build` clean.

Bundle delta: 168.56 KB → 195.12 KB raw (+26.56 KB / about 5.3 KB per
recipe), 46.88 KB → 53.97 KB gzipped (+7.09 KB / about 1.4 KB per recipe).
At this rate, the remaining ~90 recipes would add ~480 KB raw and ~127 KB
gzipped, putting the JS bundle around 675 KB raw / 180 KB gzipped — well
under the 1 MB raw target.

Backlog state: 13 promoted, 90 backlog, 1 deferred.

Agent workflow validated. Next: parallel batches.
