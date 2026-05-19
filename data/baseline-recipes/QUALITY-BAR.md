# Baseline recipe quality bar

This is the explicit standard every recipe in `src/data/baseline-catalog.ts`
must meet. It is the spec every drafting agent must read before producing a
seed.

The bolognese seed in `baseline-catalog.ts` (slug `ragu-bolognese`) is the
canonical worked example. When in doubt, look at how bolognese answers the
question.

---

## What baseline recipes are

Baseline recipes are **reference dishes**, not signature recipes. They exist
so that imports (a user's YouTube video, a web page, a photo of a cookbook
page) can be matched against a stable common identity, and so the app ships
with a usable starter library for someone who has never imported anything.

- **Compiled from common knowledge.** Each baseline reflects the way the
  dish is broadly cooked, not how one named chef or one published recipe
  does it. The shared `Source.licenseNote` says exactly this — keep it
  honest.
- **Cook-from-able.** A reasonably competent home cook must be able to
  cook the dish from the recipe and get a result they would serve to
  someone from the dish's home region without embarrassment. The
  "would I serve this bolognese to an Italian" test.
- **Not the only way.** Common, defensible variations (milk vs no milk in
  bolognese, guanciale vs pancetta in carbonara, baking soda vs powder)
  live in `notes`, not as separate baselines.

## Where to find the shape

The TypeScript shape an agent emits is `BaselineSeed` in
`src/data/baseline-catalog.ts`. Don't redefine it here — read it from
source so it stays in sync.

Every seed becomes one `Recipe` + one `RecipeVariant` named "Baseline" +
one `RecipeVersion` via `makeRecipe()`. The version is stamped with
`origin: "import"`, `createdBy: "importer"`, the shared baseline `Source`,
and a default note that says it is compiled from common knowledge.

## The bar

### Identity

- **`slug`** — kebab-case, no diacritics, no cuisine prefix (use `bolognese`
  not `italian-bolognese`). Matches the `id` minus the `baseline-` prefix in
  `data/baseline-recipes/backlog.json`.
- **`title`** — the name a cook would search for. English by default. Use
  the original-language name only when it is more recognisable than any
  translation (`Shakshuka`, `Tabbouleh`, `Cacio e Pepe`).
- **`subtitle`** — one short line that disambiguates ("Olive oil flatbread
  with a crisp base and open crumb"). Not marketing copy.
- **`description`** — one to three sentences. What the dish is, what the
  technique is, what makes it succeed.

### Ingredients

- **Every canonical ingredient present.** A bolognese without milk is a
  defensible variant; a bolognese without onion or tomato is not a
  bolognese.
- **Metric quantities are primary.** Grams for solids, millilitres for
  liquids, count for whole units (eggs, cloves, lemons). US-customary units
  (tsp/tbsp/cup) are acceptable for very small amounts and for ingredients
  measured by volume in their home tradition (cup of rice, tbsp of oil).
- **Salt, pepper, and cooking fat are explicit ingredients.** Do not assume
  "salt to taste" in the steps without listing it in ingredients.
- **Sections used where the dish has them.** Sauce / pasta / garnish.
  Sponge / dough / topping. Marinade / sauce / serve. Skip sections for
  single-component dishes.
- **Optional ingredients flagged.** Set `optional: true` for ingredients
  that change the dish but are not required (herb garnishes, parmesan rind
  in soup, the rosemary on focaccia).
- **`raw` is the source of truth.** `quantity` / `unit` / `item` are
  conveniences — parsed cleanly when they exist, but the `raw` line must
  read like a real ingredient list line. `1/2 tsp fine salt` is fine; do
  not stop at `0.5 tsp salt`.
- **Stable `id`s.** Use the ingredient name itself, kebab-cased. If a recipe
  uses two olive-oil entries (sauce + finishing), name them
  `olive-oil-sauce` and `olive-oil-finish`. Ingredient `id`s are referenced
  from step `ingredientRefs`.

### Steps

- **6–14 steps.** Fewer than 6 is almost always under-described; more than
  14 is almost always over-fragmented (combine related actions into one
  step).
- **Each step is one hands-on action plus its result cue.** "Cook the
  onion in olive oil until soft and translucent, about 8 minutes." Not
  "Cook the onion" and not "Heat oil, add onion, stir occasionally, cook
  for 8 minutes."
- **Technique cues that matter.** "Until fat is clear and edges are crisp."
  "Until the sauce coats the back of a spoon." "Without browning the
  garlic." Cues let the cook judge done-ness without a timer.
- **`timerSeconds` only when the time is real.** Skip it for "until soft"
  judgement calls; include it for "rest 20 minutes" or "bake 25 minutes"
  where the time is the instruction.
- **`temperature` always for oven steps**, structured as
  `{ value, unit: "c", raw: "190 C" }`. Default to Celsius; Fahrenheit only
  when the dish is unambiguously American (cookies, brownies, classic apple
  pie). The `raw` string is what the user sees — keep it tidy.
- **`ingredientRefs` for steps that consume specific ingredients.** Lets
  Cooking Mode highlight the right line. Not required for "season with
  salt and pepper" or generic phrases.
- **Section labels match ingredient sections.** A step that builds the
  sauce gets `section: "Sauce"` if ingredients are sectioned the same way.

### Yield and times

- **`yield` reflects what the recipe makes.** "4 servings" for mains,
  "1 9x13 inch tray" for sheet bakes, "24 cookies" for drops, "1 loaf" for
  breads. The `raw` string is what the UI shows.
- **`times` are realistic.** Add up to the `totalMinutes`. A 90-minute
  lasagne is wrong. If a dish has a long passive time (dough rise,
  marination), `prepMinutes + cookMinutes < totalMinutes` is fine — that
  is how slow dishes work.

### Notes

- **At least two notes.** Candidates:
  - A common mistake and how to avoid it.
  - A recognised variation, named ("With milk, finish the simmer with
    100 ml whole milk for a softer sauce").
  - Make-ahead or storage guidance.
  - A serving suggestion that affects how the dish is finished.
- **No marketing notes.** Skip "this is the best bolognese you'll ever
  make" — it dates badly and dilutes the useful notes.

### Tags and collections

- **`tags`** are flat keywords used by search and filters. Always include
  `baseline` plus the cuisine, the meal type, and any defining technique
  (`pasta`, `baked`, `quick`, `vegan`, `vegetarian`, `gluten-free`,
  `one-pot`, `make-ahead`).
- **`collections`** drive Browse grouping. Reuse the buckets already in
  use — `Baseline`, `Baking`, `Cooking`, `Pasta`, `Bread`, `Soup`,
  `Vegetarian`, `Dessert`, `Breakfast`, `Italian`, plus the natural
  extensions (`French`, `Mexican`, `Indian`, `Curry`, `Salad`, `Rice`,
  `Cookies`, `Cake`). Do not invent a one-recipe collection.

### Tone

- **Imperative, lowercase prose** in the recipe body. Match the rest of
  the app. No exclamation marks, no chatty asides.
- **Original-language names preserved where useful.** "Soffritto" not
  "the holy trinity of onion, carrot, and celery." The cook learns the
  word once.

## Drafting workflow for agents

When you draft a batch:

1. **Read this file in full** and `src/data/baseline-catalog.ts`. The
   `BaselineSeed` type is the contract; the bolognese seed is the worked
   example.
2. **Produce only `BaselineSeed` objects.** No surrounding prose, no
   markdown — a TypeScript array literal that can be pasted into the
   `seeds` array.
3. **Self-check each seed against this bar before returning.** If any
   check fails, fix it before returning. The bar is not optional.
4. **One recipe per dish identity.** Do not draft three pancake recipes;
   draft one good one and put the variants in `notes`.
5. **If a dish does not fit the bar** (e.g. it is really a technique, not a
   dish), say so explicitly and skip it. Do not pad.

## Reviewer checklist (sponsor)

For each recipe in a PR:

- [ ] Would I cook this and serve it to someone from the dish's home region?
- [ ] Are ingredient quantities sane (no 500 g of cinnamon)?
- [ ] Are step cues real and useful, not generic?
- [ ] Do times add up and reflect reality?
- [ ] Do notes earn their place?
- [ ] Does it render correctly in Browse + Detail + Shop in the running app?
