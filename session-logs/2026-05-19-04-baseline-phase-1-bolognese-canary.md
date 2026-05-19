# 2026-05-19 — Claude: Phase 1 quality bar + bolognese canary

Stacked on `baseline-phase-0-reconcile` (PR #35). Phase 1 of the baseline
catalogue build-out — defines the new quality bar and ships its worked
example.

What was done (branch `baseline-phase-1-bolognese-canary`):

- Wrote `data/baseline-recipes/QUALITY-BAR.md`. Explicit standard for every
  baseline: identity rules, ingredient rules (metric primary, salt/oil
  explicit, sections used, `raw` is source of truth), step rules (6-14
  hands-on steps with real cues, timers only when real, structured oven
  temps), yield/times realism, "at least two notes," tag/collection reuse,
  imperative-lowercase tone. Includes the drafting workflow for agents and
  the sponsor reviewer checklist.
- Extended `BaselineSeed` in `src/data/baseline-catalog.ts` with an optional
  `notes?: string[]`. `makeRecipe()` now appends recipe-specific notes
  after the shared "compiled from common knowledge" provenance note.
- Drafted **Ragù alla Bolognese** as the canonical worked example.
  Sections: Soffritto and meat / Sauce / To serve. 20 ingredients with
  metric quantities and `section` labels. 12 steps with `ingredientRefs`,
  real timers (rendering pancetta, soffritto, meat browning, wine reduce,
  long simmer 2h, milk-finish 40min), and technique cues
  ("sizzle in fat, not steam"; "laziest bubble you can hold"). Five
  recipe-specific notes covering pasta choice, browning failure mode,
  white vs red wine, milk timing, make-ahead.
- Added the corresponding `baseline-ragu-bolognese` entry to
  `data/baseline-recipes/backlog.json` as `status: promoted`, priority 1,
  flagged in notes as the quality-bar canary.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests, 12
files), `npx vite build` clean. Bundle delta: 135.81 KB on `main` → 147.89
KB on this branch (+12 KB raw, +3.5 KB gzipped for one full-quality recipe).
Gzipped JS now 40.70 KB. Well under the 1 MB raw target and well under the
wire-time budget.

Bolognese verified present in `dist/assets/index-*.js` (build output) by
`grep -c 'Bolognese\|ragu-bolognese'` returning 2 matches.

This is the structure every agent-drafted recipe in Phase 3 must match.
Phase 2 (upgrading the existing 7 baselines to the new bar) is the next
step, gated on sponsor sign-off of this canary.
