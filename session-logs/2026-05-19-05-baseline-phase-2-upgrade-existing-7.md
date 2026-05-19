# 2026-05-19 — Claude: Phase 2 upgrade existing 7 baselines

Phase 2 of the baseline catalogue build-out. Upgrades the 7 pre-existing
baselines to the quality bar set by the bolognese canary in #36.

Branch `baseline-phase-2-upgrade-existing-7`, single PR for the batch.

What was done:

- **Focaccia** — added Dough / Topping sections, split olive oil into dough
  and pan-and-finishing portions, expanded mix into autolyse + stretch-and-fold
  + bulk + pan + proof + dimple + bake + cool (9 steps with refs), added
  5 notes (hydration, cold ferment, brine, toppings, storage).
- **Spaghetti Carbonara** — added Pasta and pork / Sauce / Finishing sections,
  shifted to canonical 4 yolks + 1 whole egg, dropped to coarse pasta-water salt,
  expanded into 8 steps with the cold-skillet rendering technique and the
  off-the-heat tempering, added 5 notes (no cream, off-heat, guanciale vs
  alternatives, cheese choice, warm bowls).
- **Lasagne** — renamed to *Lasagne alla Bolognese*, sectioned as Ragù /
  Bechamel / Assembly, added missing olive oil, wine, tomato paste,
  nutmeg, top butter; expanded into 11 steps (soffritto, brown, deglaze,
  long simmer, roux, bechamel, preheat, layer, top, bake, rest), added
  5 notes (thin layers, sheet handling, make-ahead, lasagne verdi, broiler
  crisp).
- **Shakshuka** — added Sauce / To finish sections, made salt/pepper
  explicit, added optional chili/harissa, tomato paste, optional feta,
  herbs, bread for serving; expanded to 7 steps (soften, spice, paste,
  simmer, wells, poach, finish), added 5 notes (egg timing, sauce
  consistency, green variant, harissa variant, bread as utensil).
- **Chocolate Chip Cookies** — added Dough / To finish sections, switched
  oven to Fahrenheit (350 F / 175 C) per the quality bar's unambiguously-American
  carve-out, added optional flaky sea salt, expanded to 9 steps with the
  pull-early-from-oven cue and 5-min tray rest, added 5 notes (rest the
  dough, pull early, chocolate, brown-butter variation, storage).
- **Pasta Primavera** — added Pasta / Vegetables / To finish sections,
  added shallot, garlic, butter for emulsion, optional basil; expanded to
  8 steps with the pasta-water-emulsion cue, added 5 notes (vegetables as
  guideline, pasta water is the sauce, Le Cirque creamy variant, protein
  variant, serve immediately).
- **Garlic Bread** — added Bread / Garlic butter sections, upped garlic from
  4 to 5 cloves, added optional lemon zest and parmesan, expanded into 6
  steps including a final broiler crisp, added 5 notes (more garlic than
  you think, softened butter, day-old bread, cheesy variant, herb butter).

Each upgraded recipe now satisfies the bar: sections used where it matters,
metric quantities, salt/pepper/oil/fat explicit, 6–14 hands-on steps with
real technique cues and `ingredientRefs`, structured `temperature` for oven
steps, at least 2 recipe-specific notes (delivered 5 each), realistic
yields and times.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests, 12
files), `npx vite build` clean.

Bundle delta: **147.89 KB → 168.56 KB raw (+20.67 KB), 40.70 KB → 46.88
KB gzipped (+6.18 KB)** for 7 recipe upgrades. About 3 KB raw / 0.9 KB
gzipped per upgrade — smaller than a fresh recipe because we are replacing,
not adding. Confirmed in `dist/assets/index-*.js`.

Unblocks Phase 3 (parallel agent batches for the ~95 remaining backlog
items). The 8 catalogue recipes now constitute the reference set every
Phase 3 agent will be pointed at.
