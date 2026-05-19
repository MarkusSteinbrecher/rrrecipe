# 2026-05-19 — Claude: Phase 0 baseline reconcile

What was done (branch `baseline-phase-0-reconcile`, Phase 0 of the baseline
catalogue build-out):

- The backlog claimed 15 promoted baselines but only 7 actually existed in
  `src/data/baseline-catalog.ts`. Flipped the 11 phantom entries
  (`margherita-pizza`, `banana-bread`, `lentil-soup`, `chicken-noodle-soup`,
  `chicken-tikka-masala`, `vegetable-curry`, `beef-chili`, `ratatouille`,
  `tomato-risotto`, `pancakes`, `hummus`) back to `status: backlog`, stripped
  their `baselineRecipeId`, and reset notes to "Listed but no catalog entry
  yet — needs drafting."
- `shakshuka` existed in the catalog but was marked `status: backlog`.
  Promoted it and linked `baselineRecipeId: recipe-baseline-shakshuka`.
- `pasta-primavera` and `garlic-bread` existed in the catalog with no backlog
  entries at all. Added two new promoted backlog items.
- Normalised key order across all 103 items
  (`id, channelId, title, category, subcategory, cuisine, status, priority,
  baselineRecipeId, tags, notes, externalSources`).
- Bumped `updatedAt` to `2026-05-19T00:00:00.000Z`.

After: 7 promoted in backlog ↔ 7 recipes in catalog, IDs match exactly.

Verified: `npx vitest run` clean (90 tests, 12 files), `npx tsc --noEmit`
clean. No code paths changed — only `data/baseline-recipes/backlog.json`.

Sets up Phase 1 (drafting `ragù alla bolognese` as the quality-bar canary)
and Phase 2 (upgrading the existing 7 baselines to the new bar).
