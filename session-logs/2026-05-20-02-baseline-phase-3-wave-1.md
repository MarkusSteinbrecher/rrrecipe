# 2026-05-20 — Claude: Phase 3 wave 1 (batches 2-4, 16 recipes)

Phase 3 wave 1: three agent batches drafted in parallel, integrated
together. Local-only; not pushed.

What was done:

- Launched 3 general-purpose agents in parallel, each with a
  self-contained brief, QUALITY-BAR.md as the contract, the existing
  catalog seeds as reference, and a strict /tmp/ output target.

**Batch 2 — Italian risotto + dessert (5 recipes):**
- *Tomato Risotto* — classic technique with passata, mantecatura with cold
  butter, notes covering all'onda test, carnaroli vs arborio, arancini
  use-case for leftovers.
- *Risotto alla Milanese* — saffron-steeped broth, optional bone marrow,
  notes covering osso-buco pairing and Milanese tradition.
- *Tiramisu* — mascarpone + zabaglione cream, espresso-soaked savoiardi,
  no cream or gelatine in the orthodox version, overnight chill mandatory.
- *Panna Cotta* — barely-set gelatine target, notes on the rubber failure
  mode and unmolding technique.
- *Minestrone* — flexible vegetable soup with soffritto, beans, parmesan
  rind, small pasta.

**Batch 3 — Italian-American + pizza (4 recipes):**
- *Margherita Pizza* — Neapolitan baseline with 24-hour cold ferment,
  home-oven pizza-steel + broiler workaround, fior di latte vs bufala
  guidance.
- *Chicken Parmesan* — two-stage fry-then-bake, sauce in the centre only
  to preserve crisp edges, served beside spaghetti per Italian-American
  convention.
- *Chicken Piccata* — mounted-butter pan sauce with cold cubes off the
  heat, the failure mode being a broken emulsion.
- *Shrimp Scampi* — linguine version with the "just opaque" rule as the
  headline failure mode.

**Batch 4 — Soups (7 recipes):**
- *Lentil Soup* — Mediterranean style with brown/green lentils, finished
  with olive oil and lemon.
- *Chicken Noodle Soup* — proper broth from skin-on bone-in chicken,
  shredded and returned at the end, not boiled to death.
- *Miso Soup* — canonical kombu + bonito dashi, miso whisked in off the
  heat (never boiled), instant dashi in notes.
- *Tomato Soup* — roasted-with-basil as primary, American cream-of-tomato
  variant in notes.
- *French Onion Soup* — 45+ minute onion caramelisation, gruyère
  gratinée under broiler.
- *Butternut Squash Soup* — roasted-squash method for depth, optional
  garnishes.
- *Clam Chowder* — New England style with canned clams + bottled juice,
  Manhattan and Rhode Island clear variants noted.

Reviewed every recipe against the bar — all 16 meet the checklist.

Two agent observations worth noting:
- Long passive times (overnight ferments, chills) produce big
  `totalMinutes` values. This is correct per the bar — `prepMinutes +
  cookMinutes < totalMinutes` is allowed and expected for slow dishes.
- French Onion's broiler step uses
  `temperature: { value: 250, unit: "c", raw: "broiler / 250 C" }` as the
  closest schema-expressible representation of "broiler" — acceptable
  workaround until the data model adds a broiler/oven-mode field.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests, 12
files), `npx vite build` clean.

Bundle delta: 195.12 KB → 298.43 KB raw (+103.31 KB for 16 recipes,
~6.5 KB per recipe), 53.97 KB → 80.49 KB gzipped (+26.52 KB, ~1.7 KB per
recipe). Cumulative rate suggests final bundle around 780 KB raw / 210 KB
gzipped — under the 1 MB raw target.

Backlog state: 29 promoted, 74 backlog, 1 deferred.
