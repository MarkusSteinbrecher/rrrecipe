# 2026-05-20 — Claude: Phase 3 wave 4 (batches 13-14, 17 recipes) — Phase 3 complete

Phase 3 wave 4 — the final wave. Two agent batches in parallel, completes
the backlog. Local-only.

**Batch 13 — Salads + potato sides + vegetable (9):**
Caesar Salad (Cardini-style with raw-yolk dressing; coddling alternative
in notes), Greek Salad (horiatiki, no lettuce, block feta), Niçoise Salad
(composed not tossed), Coleslaw, Potato Salad (American mayo-based),
Mashed Potatoes (Robuchon-style, riced not processed), Roasted Potatoes
(par-boiled, shaken rough, hot fat), Gratin Dauphinois (no cheese in the
orthodox version), Ratatouille (separate-components method).

**Batch 14 — Meat & seafood mains (8):**
Roast Chicken (overnight dry brine, Zuni-style), Fried Chicken (Southern
buttermilk brine + double dredge), Pan-Seared Salmon (skin-down 80%
weighted), Meatballs (Italian-American 50/50 with panade, finished in
sauce), Burgers (smashburger primary), Fish and Chips (twice-fried chips,
beer batter), General Tso's Chicken (takeout-style sticky-sweet), Green
Bean Casserole (from-scratch mushroom sauce, fresh beans).

All 17 satisfy the bar. Introduces a new `Salad` collection bucket
(5 recipes — defensible per the no-one-off-collections rule).

Agent observations:
- Caesar uses raw egg yolk per the Cardini original; coddling alternative
  in notes.
- Roast chicken `totalMinutes` (85) excludes the overnight dry brine —
  treated as passive prep before the recipe "starts," matching the Zuni
  Café presentation convention. Inconsistent with how other recipes
  (sourdough, brioche, cinnamon rolls) include their long passive time
  in `totalMinutes`. Worth a future normalization pass.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests),
`npx vite build` clean.

Bundle delta: 641.91 → 745.62 KB raw (+103.71 KB for 17 recipes, ~6.1 KB
per recipe), 168.55 → 197.23 KB gzipped (+28.68 KB, ~1.7 KB per recipe).

## Phase 3 complete

**Final state:** 103 promoted, 0 backlog, 1 deferred (the duplicate
bolognese). The "common recipe" backlog identified at the start of the
project is now fully promoted to high-quality baseline catalogue entries.

**Final bundle:** 745.62 KB raw / 197.23 KB gzipped — well under the
1 MB raw target.

**Phase 3 totals:**
- Wave 1: 5 recipes (batch 1, Italian pasta — workflow canary)
- Wave 2: 16 recipes (batches 2-4, Italian risotto + I-A + soups)
- Wave 3: 26 recipes (batches 5-8, stews + curries + noodles + ME)
- Wave 4: 31 recipes (batches 9-12, Mexican + breakfast + baking)
- Wave 5: 17 recipes (batches 13-14, salads/sides + meat mains)
- **Total: 95 recipes drafted by 14 agent batches**

Combined with the 8 catalogue recipes from before Phase 3 (focaccia,
carbonara, lasagne, shakshuka, choc-chip cookies, primavera, garlic
bread, bolognese), the catalogue now ships **103 baseline recipes**.

## Quality observations across the full Phase 3 run

The agent workflow worked. Every batch produced recipes that met the
quality bar on first pass — no agent had to be re-run with feedback. The
canonical worked example (bolognese) plus the upgraded existing 7
provided enough reference for new agents to produce conformant work.

Where agents made judgment calls, they were defensible:
- New collection buckets introduced where 5+ recipes warranted them
  (`Mexican`, `Salad`); cuisines with 1-2 recipes (Filipino, British,
  Korean) stayed under `Cooking`.
- Dual-unit temperature notation (`190 C (375 F)`) used consistently for
  American-leaning dishes where both audiences would read the recipe.
- Dry-skillet / comal cooking surfaces given structured-temp best-guesses
  in the 200-260 C range — acceptable workaround for the schema's
  oven-centric `temperature` field.
- Roast chicken treats overnight brine as passive prep outside
  `totalMinutes` — inconsistent with how other long-passive recipes
  (bolognese, sourdough, brioche, cinnamon rolls) handle it. Flag for
  future normalisation pass.

## What's not done

- The `Pizza` collection was not invented despite Margherita being a
  reasonable anchor — pizza went under `Baking` and `Italian`. If the app
  later wants pizza as a top-level filter, this is a single-recipe edit.
- The deferred `baseline-bolognese` (duplicate of
  `baseline-ragu-bolognese`) remains deferred and is the only non-promoted,
  non-backlog item.
- No agent-driven QA across the full corpus. Sponsor reviewer pass against
  the QUALITY-BAR.md checklist is the next thing — that, plus opening
  each new recipe in the running app to confirm Browse/Detail/Shop
  rendering.
