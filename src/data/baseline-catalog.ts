import type { AppSnapshot, IngredientLine, InstructionStep, Recipe, RecipeVariant, RecipeVersion, Source } from "../types";

const createdAt = "2026-05-05T00:00:00.000Z";
const sourceId = "source-baseline-common-knowledge";

type BaselineCatalog = Pick<AppSnapshot, "recipes" | "versions" | "variants" | "sources">;

type IngredientSeed = {
  id: string;
  raw: string;
  quantity?: string;
  unit?: string;
  item?: string;
  section?: string;
  optional?: boolean;
};

type StepSeed = {
  id: string;
  text: string;
  section?: string;
  timerSeconds?: number;
  temperature?: {
    value: number;
    unit: "c" | "f";
    raw: string;
  };
  ingredientRefs?: string[];
};

type BaselineSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  yield: {
    quantity: number;
    unit: string;
    raw: string;
  };
  times: NonNullable<RecipeVersion["times"]>;
  ingredients: IngredientSeed[];
  steps: StepSeed[];
  notes?: string[];
  tags: string[];
  collections: string[];
};

const baselineSource: Source = {
  id: sourceId,
  type: "manual",
  title: "rrrecipe baseline catalogue",
  author: "rrrecipe",
  licenseNote: "Compiled from common dish knowledge for local app testing; not copied from a single published recipe.",
  retrievedAt: createdAt,
};

const metricUnits = new Set(["g", "kg", "ml", "l"]);
const usUnits = new Set(["tsp", "tbsp", "cup", "cups"]);
const countUnits = new Set(["clove", "cloves", "large", "medium", "small", "slice", "slices", "can", "cans"]);

function unitSystem(unit: string | undefined): NonNullable<IngredientLine["normalized"]>["unitSystem"] {
  if (!unit) return "unknown";
  if (metricUnits.has(unit)) return "metric";
  if (usUnits.has(unit)) return "us";
  if (countUnits.has(unit)) return "count";
  return "unknown";
}

function ingredient(seed: IngredientSeed): IngredientLine {
  return {
    id: seed.id,
    section: seed.section,
    raw: seed.raw,
    language: "en",
    quantity: seed.quantity,
    unit: seed.unit,
    item: seed.item,
    optional: seed.optional,
    normalized: {
      quantityValue: seed.quantity && Number.isFinite(Number(seed.quantity)) ? Number(seed.quantity) : undefined,
      unit: seed.unit,
      unitSystem: unitSystem(seed.unit),
      ingredientKey: seed.item?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    },
    conversion: {
      confidence: "unknown",
    },
  };
}

function step(seed: StepSeed, index: number): InstructionStep {
  return {
    id: seed.id,
    section: seed.section,
    position: index + 1,
    text: seed.text,
    language: "en",
    timerSeconds: seed.timerSeconds,
    temperature: seed.temperature,
    ingredientRefs: seed.ingredientRefs,
  };
}

function makeRecipe(seed: BaselineSeed): { recipe: Recipe; variant: RecipeVariant; version: RecipeVersion } {
  const recipeId = `recipe-baseline-${seed.slug}`;
  const variantId = `variant-baseline-${seed.slug}-original`;
  const versionId = `version-baseline-${seed.slug}-v1`;

  return {
    recipe: {
      id: recipeId,
      currentVersionId: versionId,
      defaultVariantId: variantId,
      createdAt,
      updatedAt: createdAt,
    },
    variant: {
      id: variantId,
      recipeId,
      name: "Baseline",
      baseVersionId: versionId,
      currentVersionId: versionId,
      description: "Reference recipe for matching imported videos.",
      createdAt,
    },
    version: {
      id: versionId,
      recipeId,
      variantId,
      title: seed.title,
      language: "en",
      subtitle: seed.subtitle,
      description: seed.description,
      sourceIds: [sourceId],
      imageIds: [],
      yield: seed.yield,
      times: seed.times,
      ingredients: seed.ingredients.map(ingredient),
      steps: seed.steps.map(step),
      notes: [
        "Baseline recipe for matching imports. It is not copied from a single published recipe.",
        ...(seed.notes ?? []),
      ],
      tags: seed.tags,
      collections: seed.collections,
      changeSummary: "Created baseline catalogue entry",
      origin: "import",
      createdAt,
      createdBy: "importer",
    },
  };
}

const seeds: BaselineSeed[] = [
  {
    slug: "focaccia",
    title: "Focaccia",
    subtitle: "High-hydration Italian flatbread with a crisp, oil-rich base and an open crumb",
    description: "A Ligurian-style bread that relies on time and olive oil. Mix the dough quickly, let yeast and long rests do the work, then bake hard in a well-oiled tray so the bottom crisps and the dimples pool with oil.",
    yield: { quantity: 1, unit: "tray", raw: "1 9x13 inch (23x33 cm) tray, about 12 squares" },
    times: { prepMinutes: 25, cookMinutes: 25, totalMinutes: 240 },
    ingredients: [
      { id: "bread-flour", raw: "500 g bread flour", quantity: "500", unit: "g", item: "bread flour", section: "Dough" },
      { id: "water", raw: "400 g lukewarm water (about 30 C)", quantity: "400", unit: "g", item: "lukewarm water", section: "Dough" },
      { id: "yeast", raw: "7 g instant yeast (or 20 g fresh)", quantity: "7", unit: "g", item: "instant yeast", section: "Dough" },
      { id: "salt", raw: "12 g fine salt", quantity: "12", unit: "g", item: "fine salt", section: "Dough" },
      { id: "olive-oil-dough", raw: "20 ml olive oil, for the dough", quantity: "20", unit: "ml", item: "olive oil", section: "Dough" },
      { id: "olive-oil-pan", raw: "40 ml olive oil, for the pan and finishing", quantity: "40", unit: "ml", item: "olive oil", section: "Topping" },
      { id: "flaky-salt", raw: "flaky salt, for finishing", item: "flaky salt", section: "Topping" },
      { id: "rosemary", raw: "1 tbsp rosemary leaves, optional", quantity: "1", unit: "tbsp", item: "rosemary leaves", optional: true, section: "Topping" },
    ],
    steps: [
      { id: "mix", section: "Dough", text: "Combine the flour, water, yeast, fine salt, and the dough-portion olive oil in a large bowl. Stir with a wooden spoon or wet hands until no dry flour remains — the dough will be very wet and shaggy.", timerSeconds: 180, ingredientRefs: ["bread-flour", "water", "yeast", "salt", "olive-oil-dough"] },
      { id: "rest", section: "Dough", text: "Cover and rest for 20 minutes so the flour fully hydrates.", timerSeconds: 1200 },
      { id: "fold", section: "Dough", text: "Wet your hands, reach under one edge of the dough, stretch it up, and fold it over the centre. Rotate the bowl a quarter turn and repeat three more times. The dough should feel tighter after the four folds.", timerSeconds: 120 },
      { id: "bulk", section: "Dough", text: "Cover and bulk ferment at warm room temperature until visibly doubled, with bubbles on the surface.", timerSeconds: 5400 },
      { id: "pan", section: "Topping", text: "Pour half the pan oil into the baking tray and spread it across the base and up the sides. Tip the dough in, turn it once to coat both sides, and gently stretch it toward the corners as far as it will go without tearing.", ingredientRefs: ["olive-oil-pan"] },
      { id: "proof", section: "Topping", text: "Rest in the pan until the dough has relaxed enough to fill the corners and looks puffy and bubbled.", timerSeconds: 3600 },
      { id: "dimple", section: "Topping", text: "Drizzle the remaining pan oil over the surface. Press your fingertips straight down to the bottom of the tray, making deep dimples all over. Scatter flaky salt and rosemary across the top.", ingredientRefs: ["olive-oil-pan", "flaky-salt", "rosemary"] },
      { id: "bake", section: "Topping", text: "Bake until the top is a deep, even gold and the bottom is crisp when you lift the bread with a spatula.", timerSeconds: 1500, temperature: { value: 220, unit: "c", raw: "220 C" } },
      { id: "cool", section: "Topping", text: "Lift the focaccia onto a rack so the bottom stays crisp. Rest for at least 10 minutes before slicing.", timerSeconds: 600 },
    ],
    notes: [
      "Hydration matters. The dough should feel uncomfortably wet — that is what gives the open, bubbly crumb. Wet hands and a spatula are easier than dry hands and a spoon.",
      "Overnight cold ferment. After the four folds, refrigerate the bowl for 12–24 hours instead of bulking at room temperature. Bring back to room temperature in the pan before dimpling. The flavour is deeper and the timing is friendlier.",
      "Brine on top. Instead of plain oil over the dimples, whisk 30 ml water with 30 ml olive oil and a generous pinch of salt and pour that into the dimples before baking. It crisps the top differently and salts more evenly.",
      "Toppings. Halved cherry tomatoes pressed into the dimples, thinly sliced potato, olives, or sliced red onion all work. Add fresh herbs after baking so they do not scorch.",
      "Storage. Best the day it is baked. Wrap leftovers in paper and reheat at 180 C for 5 minutes to crisp the bottom again — the microwave makes it leathery.",
    ],
    tags: ["baseline", "baking", "bread", "italian", "vegetarian"],
    collections: ["Baseline", "Baking", "Bread", "Italian"],
  },
  {
    slug: "spaghetti-carbonara",
    title: "Spaghetti Carbonara",
    subtitle: "Roman pasta with eggs, pecorino, black pepper, and crisp guanciale",
    description: "Spaghetti dressed off the heat with raw egg yolks, sharp pecorino, and the rendered fat of crisp guanciale. The starch from the pasta water and the heat of the pasta itself emulsify everything into a glossy sauce — no cream, no garlic, no panic.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 },
    ingredients: [
      { id: "spaghetti", raw: "400 g spaghetti", quantity: "400", unit: "g", item: "spaghetti", section: "Pasta and pork" },
      { id: "guanciale", raw: "150 g guanciale, sliced into 5 mm batons", quantity: "150", unit: "g", item: "guanciale", section: "Pasta and pork" },
      { id: "pasta-salt", raw: "coarse salt, for the pasta water", item: "coarse salt", section: "Pasta and pork" },
      { id: "yolks", raw: "4 large egg yolks", quantity: "4", unit: "large", item: "egg yolks", section: "Sauce" },
      { id: "egg", raw: "1 large whole egg", quantity: "1", unit: "large", item: "whole egg", section: "Sauce" },
      { id: "pecorino", raw: "90 g pecorino romano, finely grated, plus more to serve", quantity: "90", unit: "g", item: "pecorino romano, finely grated", section: "Sauce" },
      { id: "pepper", raw: "2 tsp freshly cracked black pepper, plus more to serve", quantity: "2", unit: "tsp", item: "freshly cracked black pepper", section: "Sauce" },
    ],
    steps: [
      { id: "water", section: "Pasta and pork", text: "Bring a large pot of well-salted water to a rolling boil.", ingredientRefs: ["pasta-salt"] },
      { id: "render", section: "Pasta and pork", text: "Put the guanciale in a wide cold skillet and set over medium-low heat. Cook slowly, stirring once or twice, until the fat has fully rendered, the pieces are deep gold, and the edges are crisp. Take the skillet off the heat and leave the fat in the pan.", timerSeconds: 540, ingredientRefs: ["guanciale"] },
      { id: "sauce", section: "Sauce", text: "While the guanciale cooks, whisk the yolks, whole egg, three-quarters of the pecorino, and the black pepper in a heatproof bowl until thick and pale. The mixture should fall in a slow ribbon from the whisk.", ingredientRefs: ["yolks", "egg", "pecorino", "pepper"] },
      { id: "boil", section: "Pasta and pork", text: "Cook the spaghetti until just shy of al dente — a minute under the package time. Reserve a generous mug of starchy pasta water before draining.", ingredientRefs: ["spaghetti"] },
      { id: "warm", section: "Finishing", text: "Tip the drained pasta into the skillet with the guanciale and rendered fat. Toss over the lowest heat for ten seconds so every strand picks up the fat, then take the pan off the heat completely." },
      { id: "temper", section: "Finishing", text: "Spoon two tablespoons of pasta water into the egg mixture, whisking, to loosen and warm it." },
      { id: "combine", section: "Finishing", text: "Pour the egg mixture over the pasta and toss vigorously with tongs. The residual heat will thicken the eggs into a glossy sauce — keep moving so they cannot scramble. Add pasta water a spoonful at a time until the sauce is loose enough to coat every strand without pooling." },
      { id: "serve", section: "Finishing", text: "Plate immediately. Top with the remaining pecorino and another grind of black pepper.", ingredientRefs: ["pecorino", "pepper"] },
    ],
    notes: [
      "No cream. The sauce is emulsified egg yolk and starchy pasta water — cream is a different dish (and an insult in Rome).",
      "Off the heat. The most common failure is scrambling the eggs. Take the skillet off the stove before the eggs ever touch the pasta, and keep tossing. If the sauce looks too tight, more pasta water; if it looks too loose, the warm pasta will thicken it as you toss.",
      "Guanciale vs pancetta vs bacon. Guanciale (cured pork cheek) is canonical — sweeter and richer than pancetta (cured belly). Pancetta is a fine substitute. Streaky bacon will work for a smokier, less authentic version.",
      "Cheese. Pecorino romano is sharp and salty. Some Roman cooks use 50/50 pecorino and parmigiano for a milder finish — go that way if your pecorino is very assertive.",
      "Serve in warmed bowls. Carbonara cools fast and tightens up almost immediately. Warm the bowls under hot tap water and dry them while the pasta is cooking.",
    ],
    tags: ["baseline", "cooking", "pasta", "italian", "quick"],
    collections: ["Baseline", "Cooking", "Pasta", "Italian"],
  },
  {
    slug: "lasagne",
    title: "Lasagne alla Bolognese",
    subtitle: "Baked layers of pasta, slow ragù, bechamel, and parmigiano",
    description: "A baked pasta where thin sheets, a deep meat ragù, and a milky bechamel collapse together in the oven into a sliceable, savoury custard. The point is many thin layers, not few thick ones.",
    yield: { quantity: 8, unit: "servings", raw: "8 servings (one deep 23 x 33 cm dish)" },
    times: { prepMinutes: 45, cookMinutes: 150, totalMinutes: 195 },
    ingredients: [
      { id: "olive-oil", raw: "2 tbsp olive oil", quantity: "2", unit: "tbsp", item: "olive oil", section: "Ragù" },
      { id: "onion", raw: "1 medium onion, finely diced", quantity: "1", unit: "medium", item: "onion, finely diced", section: "Ragù" },
      { id: "carrot", raw: "1 medium carrot, finely diced", quantity: "1", unit: "medium", item: "carrot, finely diced", section: "Ragù" },
      { id: "celery", raw: "1 celery stalk, finely diced", quantity: "1", unit: "medium", item: "celery stalk, finely diced", section: "Ragù" },
      { id: "beef", raw: "500 g ground beef (not too lean)", quantity: "500", unit: "g", item: "ground beef", section: "Ragù" },
      { id: "pork", raw: "200 g ground pork", quantity: "200", unit: "g", item: "ground pork", section: "Ragù" },
      { id: "wine", raw: "150 ml dry white wine", quantity: "150", unit: "ml", item: "dry white wine", section: "Ragù" },
      { id: "tomato-paste", raw: "1 tbsp tomato paste", quantity: "1", unit: "tbsp", item: "tomato paste", section: "Ragù" },
      { id: "passata", raw: "700 ml tomato passata", quantity: "700", unit: "ml", item: "tomato passata", section: "Ragù" },
      { id: "ragu-salt", raw: "salt and pepper, to taste", item: "salt and pepper", section: "Ragù" },
      { id: "butter", raw: "60 g unsalted butter", quantity: "60", unit: "g", item: "unsalted butter", section: "Bechamel" },
      { id: "flour", raw: "60 g all-purpose flour", quantity: "60", unit: "g", item: "all-purpose flour", section: "Bechamel" },
      { id: "milk", raw: "700 ml whole milk, warm", quantity: "700", unit: "ml", item: "whole milk, warm", section: "Bechamel" },
      { id: "nutmeg", raw: "1 pinch freshly grated nutmeg", item: "freshly grated nutmeg", section: "Bechamel" },
      { id: "bechamel-salt", raw: "fine salt, to taste", item: "fine salt", section: "Bechamel" },
      { id: "sheets", raw: "300 g dried lasagne sheets (or 400 g fresh)", quantity: "300", unit: "g", item: "lasagne sheets", section: "Assembly" },
      { id: "parmesan", raw: "120 g parmigiano reggiano, finely grated", quantity: "120", unit: "g", item: "parmigiano reggiano, finely grated", section: "Assembly" },
      { id: "top-butter", raw: "20 g unsalted butter, in small cubes, for the top", quantity: "20", unit: "g", item: "unsalted butter, in small cubes", section: "Assembly" },
    ],
    steps: [
      { id: "soffritto", section: "Ragù", text: "Warm the olive oil in a heavy pot over medium-low heat. Add the onion, carrot, and celery and cook gently, stirring often, until soft and sweet but not coloured.", timerSeconds: 600, ingredientRefs: ["olive-oil", "onion", "carrot", "celery"] },
      { id: "brown", section: "Ragù", text: "Raise the heat and add the beef and pork. Break the meat apart and brown deeply — wait until the liquid the meat releases has cooked off and the pieces are sizzling in fat.", timerSeconds: 720, ingredientRefs: ["beef", "pork"] },
      { id: "deglaze", section: "Ragù", text: "Pour in the wine and let it bubble until the alcohol smell is gone and the bottom of the pot is almost dry.", timerSeconds: 240, ingredientRefs: ["wine"] },
      { id: "simmer", section: "Ragù", text: "Stir in the tomato paste, cook for a minute, then add the passata. Season with salt and pepper, partially cover, and simmer at the laziest bubble you can hold until thick and glossy. Stir occasionally and add a splash of water if it tightens too much.", timerSeconds: 5400, ingredientRefs: ["tomato-paste", "passata", "ragu-salt"] },
      { id: "roux", section: "Bechamel", text: "Melt the butter in a saucepan over medium heat. Whisk in the flour and cook until it smells nutty but has not coloured.", timerSeconds: 120, ingredientRefs: ["butter", "flour"] },
      { id: "bechamel", section: "Bechamel", text: "Add the warm milk in three additions, whisking smooth after each. Simmer, stirring, until thick enough to coat the back of a spoon. Season with salt and a pinch of nutmeg.", timerSeconds: 480, ingredientRefs: ["milk", "bechamel-salt", "nutmeg"] },
      { id: "preheat", section: "Assembly", text: "Heat the oven and lightly butter a deep baking dish.", temperature: { value: 190, unit: "c", raw: "190 C" } },
      { id: "layer", section: "Assembly", text: "Spread a thin smear of bechamel on the bottom of the dish, then build five layers: pasta, ragù, bechamel, a scatter of parmesan, repeat. Finish with bechamel and parmesan on top — no exposed pasta or it will dry out.", ingredientRefs: ["sheets", "parmesan"] },
      { id: "top", section: "Assembly", text: "Dot the top with cubes of butter for a deeper colour as it bakes.", ingredientRefs: ["top-butter"] },
      { id: "bake", section: "Assembly", text: "Bake until the top is bubbling and richly browned in patches and the sides pull slightly away from the dish.", timerSeconds: 2700, temperature: { value: 190, unit: "c", raw: "190 C" } },
      { id: "rest", section: "Assembly", text: "Rest at least 15 minutes before cutting. This is what makes the layers hold together on the plate instead of collapsing into a stew.", timerSeconds: 900 },
    ],
    notes: [
      "Many thin layers, not few thick ones. Five layers in a deep dish is the target. A thick pile of ragù and pasta sets like a brick; thin layers stay tender.",
      "Pasta sheets. Dried sheets need no pre-boiling if the ragù and bechamel are both well-hydrated — the layers borrow liquid as they bake. If your sauces are tight, parboil the sheets for 1 minute first. Fresh pasta is the original; it makes a more tender lasagne.",
      "Make-ahead. Both the ragù and the bechamel can be made a day ahead and refrigerated. Assemble cold and add 10 minutes to the bake. The whole assembled lasagne also keeps in the fridge for a day before baking — bring close to room temperature first.",
      "Variation — lasagne verdi. Use spinach pasta sheets for the Bolognese-style green lasagne. The flavour difference is small; the visual is striking.",
      "Crisp top. For the burnished, almost-burnt patches that make lasagne, give it the last 5 minutes uncovered under a hot broiler.",
    ],
    tags: ["baseline", "cooking", "pasta", "italian", "baked"],
    collections: ["Baseline", "Cooking", "Pasta", "Italian"],
  },
  {
    slug: "ragu-bolognese",
    title: "Ragù alla Bolognese",
    subtitle: "Slow-cooked meat sauce from Bologna, served on tagliatelle",
    description: "A long-simmered meat sauce built on soffritto, two cuts of pork and beef, white wine, and milk. Tomato is a seasoning, not the base — the finished sauce is glossy and brown-orange, not red. Tagliatelle is the canonical pasta; the ribbon's rough surface is what carries the ragù.",
    yield: { quantity: 6, unit: "servings", raw: "6 servings (sauce; toss with 500 g tagliatelle)" },
    times: { prepMinutes: 25, cookMinutes: 180, totalMinutes: 205 },
    ingredients: [
      { id: "pancetta", raw: "100 g pancetta, finely diced", quantity: "100", unit: "g", item: "pancetta, finely diced", section: "Soffritto and meat" },
      { id: "olive-oil", raw: "2 tbsp olive oil", quantity: "2", unit: "tbsp", item: "olive oil", section: "Soffritto and meat" },
      { id: "butter", raw: "30 g unsalted butter", quantity: "30", unit: "g", item: "unsalted butter", section: "Soffritto and meat" },
      { id: "onion", raw: "1 medium onion (about 100 g), finely diced", quantity: "1", unit: "medium", item: "onion, finely diced", section: "Soffritto and meat" },
      { id: "carrot", raw: "1 medium carrot (about 100 g), finely diced", quantity: "1", unit: "medium", item: "carrot, finely diced", section: "Soffritto and meat" },
      { id: "celery", raw: "1 celery stalk (about 100 g), finely diced", quantity: "1", unit: "medium", item: "celery stalk, finely diced", section: "Soffritto and meat" },
      { id: "ground-beef", raw: "400 g ground beef (chuck), not too lean", quantity: "400", unit: "g", item: "ground beef (chuck)", section: "Soffritto and meat" },
      { id: "ground-pork", raw: "200 g ground pork", quantity: "200", unit: "g", item: "ground pork", section: "Soffritto and meat" },
      { id: "white-wine", raw: "200 ml dry white wine", quantity: "200", unit: "ml", item: "dry white wine", section: "Sauce" },
      { id: "tomato-paste", raw: "2 tbsp tomato paste", quantity: "2", unit: "tbsp", item: "tomato paste", section: "Sauce" },
      { id: "passata", raw: "300 ml tomato passata", quantity: "300", unit: "ml", item: "tomato passata", section: "Sauce" },
      { id: "broth", raw: "500 ml beef or chicken broth, warm, plus more as needed", quantity: "500", unit: "ml", item: "beef or chicken broth, warm", section: "Sauce" },
      { id: "milk", raw: "250 ml whole milk", quantity: "250", unit: "ml", item: "whole milk", section: "Sauce" },
      { id: "bay-leaf", raw: "1 bay leaf", quantity: "1", unit: "", item: "bay leaf", section: "Sauce" },
      { id: "nutmeg", raw: "1 pinch freshly grated nutmeg", item: "freshly grated nutmeg", section: "Sauce" },
      { id: "salt", raw: "fine salt, to taste", item: "fine salt", section: "Sauce" },
      { id: "pepper", raw: "freshly ground black pepper, to taste", item: "freshly ground black pepper", section: "Sauce" },
      { id: "tagliatelle", raw: "500 g fresh or dried tagliatelle", quantity: "500", unit: "g", item: "tagliatelle", section: "To serve" },
      { id: "pasta-salt", raw: "coarse salt, for the pasta water", item: "coarse salt", section: "To serve" },
      { id: "parmesan", raw: "60 g parmigiano reggiano, finely grated, plus more to serve", quantity: "60", unit: "g", item: "parmigiano reggiano, finely grated", section: "To serve" },
    ],
    steps: [
      { id: "render-pancetta", section: "Soffritto and meat", text: "Render the pancetta in a heavy pot with the olive oil and butter over medium-low heat until the fat is clear and the pieces are pale gold.", timerSeconds: 420, ingredientRefs: ["pancetta", "olive-oil", "butter"] },
      { id: "soffritto", section: "Soffritto and meat", text: "Add the onion, carrot, and celery. Cook gently, stirring often, until the vegetables are soft and sweet but not coloured.", timerSeconds: 600, ingredientRefs: ["onion", "carrot", "celery"] },
      { id: "brown-meat", section: "Soffritto and meat", text: "Raise the heat to medium-high and add the beef and pork. Break the meat apart and cook until every bit has lost its raw colour and the liquid the meat releases has cooked off — the meat should sizzle in fat, not steam.", timerSeconds: 720, ingredientRefs: ["ground-beef", "ground-pork"] },
      { id: "season", section: "Soffritto and meat", text: "Season generously with salt, pepper, and a pinch of nutmeg.", ingredientRefs: ["salt", "pepper", "nutmeg"] },
      { id: "wine", section: "Sauce", text: "Pour in the white wine and let it bubble briskly until the alcohol smell is gone and the bottom of the pot is almost dry.", timerSeconds: 240, ingredientRefs: ["white-wine"] },
      { id: "tomato", section: "Sauce", text: "Stir in the tomato paste and cook for a minute to take the raw edge off, then add the passata and bay leaf.", timerSeconds: 60, ingredientRefs: ["tomato-paste", "passata", "bay-leaf"] },
      { id: "broth-simmer", section: "Sauce", text: "Pour in enough warm broth to just cover the meat. Bring to a bare simmer, partially cover, and cook at the laziest bubble you can hold — top up with more broth whenever the surface looks dry.", timerSeconds: 7200, ingredientRefs: ["broth"] },
      { id: "milk", section: "Sauce", text: "Add the milk and continue to simmer uncovered until the sauce is thick, glossy, and a deep brown-orange. Taste and adjust salt.", timerSeconds: 2400, ingredientRefs: ["milk", "salt"] },
      { id: "rest-sauce", section: "Sauce", text: "Pull off the heat and let the sauce settle while you cook the pasta. Skim any pooled fat from the surface if you like." },
      { id: "boil-pasta", section: "To serve", text: "Bring a large pot of well-salted water to a rolling boil and cook the tagliatelle until just shy of al dente. Reserve a mug of pasta water before draining.", ingredientRefs: ["tagliatelle", "pasta-salt"] },
      { id: "toss", section: "To serve", text: "Return the sauce to low heat, lift the pasta straight into it, and toss with a splash of pasta water until every ribbon is coated and the sauce clings.", ingredientRefs: ["tagliatelle"] },
      { id: "finish", section: "To serve", text: "Off the heat, fold in half the parmesan. Serve immediately with the rest of the parmesan at the table.", ingredientRefs: ["parmesan"] },
    ],
    notes: [
      "Tagliatelle is the canonical pasta for ragù in Bologna — the rough ribbon surface holds the sauce. Spaghetti is not traditional. Pappardelle is fine; short pasta with ridges (rigatoni, mezze maniche) also works.",
      "Brown the meat properly. If it steams in its own juice you will end up with grey crumbles and a thin sauce. Use a wide heavy pot, give the meat space, and walk away from it until it has actually browned.",
      "Variation — wine. White wine is traditional in Bologna and gives a cleaner finish. Red wine is common in modern cooking and gives a deeper colour and a heartier sauce. Use what you would drink.",
      "Variation — milk. Adding milk near the end softens the acidity and gives a velvety texture. Some traditions add it at the start with the wine instead. Both work; do not skip it entirely.",
      "Make ahead. Ragù tastes better the next day. Cool quickly, refrigerate up to 4 days, freeze up to 3 months. Reheat gently with a splash of broth or water.",
    ],
    tags: ["baseline", "cooking", "pasta", "italian", "meat", "slow"],
    collections: ["Baseline", "Cooking", "Pasta", "Italian"],
  },
  {
    slug: "shakshuka",
    title: "Shakshuka",
    subtitle: "Eggs poached in a spiced tomato and pepper sauce",
    description: "A skillet dish from the Maghreb, now eaten across the Middle East. Build a deep, peppery tomato base, make wells, crack in the eggs, and let the residual heat set the whites while the yolks stay runny. Serve straight from the pan with bread.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings (one 26 cm skillet)" },
    times: { prepMinutes: 10, cookMinutes: 30, totalMinutes: 40 },
    ingredients: [
      { id: "olive-oil", raw: "3 tbsp olive oil", quantity: "3", unit: "tbsp", item: "olive oil", section: "Sauce" },
      { id: "onion", raw: "1 medium onion, finely diced", quantity: "1", unit: "medium", item: "onion, finely diced", section: "Sauce" },
      { id: "bell-pepper", raw: "1 red bell pepper, finely diced", quantity: "1", unit: "medium", item: "red bell pepper, finely diced", section: "Sauce" },
      { id: "garlic", raw: "3 cloves garlic, thinly sliced", quantity: "3", unit: "cloves", item: "garlic, thinly sliced", section: "Sauce" },
      { id: "cumin", raw: "1 tsp ground cumin", quantity: "1", unit: "tsp", item: "ground cumin", section: "Sauce" },
      { id: "paprika", raw: "1 tsp sweet paprika", quantity: "1", unit: "tsp", item: "sweet paprika", section: "Sauce" },
      { id: "chili", raw: "1/2 tsp chili flakes or 1 tsp harissa, optional", quantity: "0.5", unit: "tsp", item: "chili flakes or harissa", optional: true, section: "Sauce" },
      { id: "tomato-paste", raw: "1 tbsp tomato paste", quantity: "1", unit: "tbsp", item: "tomato paste", section: "Sauce" },
      { id: "tomatoes", raw: "800 g crushed tomatoes", quantity: "800", unit: "g", item: "crushed tomatoes", section: "Sauce" },
      { id: "salt", raw: "fine salt, to taste", item: "fine salt", section: "Sauce" },
      { id: "pepper", raw: "freshly ground black pepper, to taste", item: "freshly ground black pepper", section: "Sauce" },
      { id: "eggs", raw: "6 large eggs", quantity: "6", unit: "large", item: "eggs", section: "To finish" },
      { id: "feta", raw: "80 g feta, crumbled, optional", quantity: "80", unit: "g", item: "feta, crumbled", optional: true, section: "To finish" },
      { id: "herbs", raw: "small handful parsley or cilantro, chopped", item: "parsley or cilantro, chopped", section: "To finish" },
      { id: "bread", raw: "crusty bread or pita, to serve", item: "crusty bread or pita", section: "To finish" },
    ],
    steps: [
      { id: "soften", section: "Sauce", text: "Warm the olive oil in a wide ovenproof skillet over medium heat. Add the onion and bell pepper with a pinch of salt and cook, stirring occasionally, until soft and starting to caramelise at the edges.", timerSeconds: 600, ingredientRefs: ["olive-oil", "onion", "bell-pepper", "salt"] },
      { id: "spice", section: "Sauce", text: "Add the garlic, cumin, paprika, and chili if using. Stir for a minute until fragrant — do not let the garlic colour.", timerSeconds: 60, ingredientRefs: ["garlic", "cumin", "paprika", "chili"] },
      { id: "paste", section: "Sauce", text: "Stir in the tomato paste and let it cook for another minute to take off the raw edge.", timerSeconds: 60, ingredientRefs: ["tomato-paste"] },
      { id: "simmer", section: "Sauce", text: "Add the crushed tomatoes, season generously with salt and pepper, and simmer until the sauce is thick enough to leave a clean trail when you drag a spoon across the pan. Taste and adjust seasoning — it should be sharp and well-salted.", timerSeconds: 900, ingredientRefs: ["tomatoes", "salt", "pepper"] },
      { id: "wells", section: "To finish", text: "Make six shallow wells in the sauce with the back of a spoon. Crack one egg into each well and season the tops lightly with salt.", ingredientRefs: ["eggs", "salt"] },
      { id: "poach", section: "To finish", text: "Cover the skillet and cook over medium-low heat until the whites are just set and the yolks are still soft when you nudge them. Check at five minutes — the line between runny and overcooked is short.", timerSeconds: 420 },
      { id: "finish", section: "To finish", text: "Scatter the feta and herbs over the top. Serve directly from the pan with bread for dipping.", ingredientRefs: ["feta", "herbs", "bread"] },
    ],
    notes: [
      "Watch the eggs closely. Six to eight minutes is the usual range — pull the pan off the heat when the whites are barely set, because they will keep cooking in the hot sauce. A glass lid helps.",
      "Sauce consistency matters. A thin, watery sauce will not hold the wells and the eggs will sink. Reduce until a spoon dragged across the pan leaves a clean trail.",
      "Variation — green shakshuka. Replace the tomatoes with a soffritto of spinach, chard, and herbs cooked down in stock. Same egg technique.",
      "Variation — harissa heat. Stir a tablespoon of harissa into the sauce with the tomato paste for a Tunisian-leaning version. Skip the sweet paprika if you do.",
      "Bread is the utensil. Pita, ciabatta, or sourdough — anything that can scoop. Plates and forks are fine but a less interesting meal.",
    ],
    tags: ["baseline", "cooking", "quick", "vegetarian", "breakfast", "middle-eastern"],
    collections: ["Baseline", "Cooking", "Vegetarian", "Breakfast"],
  },
  {
    slug: "chocolate-chip-cookies",
    title: "Chocolate Chip Cookies",
    subtitle: "Brown-sugar forward cookies with crisp edges and a chewy centre",
    description: "A drop cookie built on creamed butter and two sugars. Brown sugar gives the chew and the toffee flavour; resting the dough deepens both. Pull them from the oven when the edges are set and the centres look slightly underdone — they finish on the tray.",
    yield: { quantity: 20, unit: "cookies", raw: "about 20 cookies" },
    times: { prepMinutes: 20, cookMinutes: 12, totalMinutes: 62 },
    ingredients: [
      { id: "butter", raw: "225 g unsalted butter, softened to cool room temperature", quantity: "225", unit: "g", item: "unsalted butter, softened", section: "Dough" },
      { id: "brown-sugar", raw: "200 g light brown sugar, packed", quantity: "200", unit: "g", item: "light brown sugar, packed", section: "Dough" },
      { id: "white-sugar", raw: "100 g granulated sugar", quantity: "100", unit: "g", item: "granulated sugar", section: "Dough" },
      { id: "eggs", raw: "2 large eggs, at room temperature", quantity: "2", unit: "large", item: "eggs, at room temperature", section: "Dough" },
      { id: "vanilla", raw: "2 tsp vanilla extract", quantity: "2", unit: "tsp", item: "vanilla extract", section: "Dough" },
      { id: "flour", raw: "320 g all-purpose flour", quantity: "320", unit: "g", item: "all-purpose flour", section: "Dough" },
      { id: "baking-soda", raw: "1 tsp baking soda", quantity: "1", unit: "tsp", item: "baking soda", section: "Dough" },
      { id: "salt", raw: "1 tsp fine salt", quantity: "1", unit: "tsp", item: "fine salt", section: "Dough" },
      { id: "chocolate", raw: "300 g dark chocolate chips or chopped chocolate (60–70% cacao)", quantity: "300", unit: "g", item: "dark chocolate chips or chopped chocolate", section: "Dough" },
      { id: "flaky-salt", raw: "flaky sea salt, for finishing, optional", item: "flaky sea salt", optional: true, section: "To finish" },
    ],
    steps: [
      { id: "cream", section: "Dough", text: "Beat the butter and both sugars in a stand mixer or large bowl until pale and lighter in texture but not airy.", timerSeconds: 180, ingredientRefs: ["butter", "brown-sugar", "white-sugar"] },
      { id: "eggs", section: "Dough", text: "Beat in the eggs one at a time, scraping down the bowl, then beat in the vanilla until smooth.", ingredientRefs: ["eggs", "vanilla"] },
      { id: "dry", section: "Dough", text: "Whisk the flour, baking soda, and salt in a separate bowl, then add to the wet mixture. Mix on low or fold by hand until just combined — stop the moment the streaks of flour disappear.", ingredientRefs: ["flour", "baking-soda", "salt"] },
      { id: "fold-chocolate", section: "Dough", text: "Fold in the chocolate until evenly distributed.", ingredientRefs: ["chocolate"] },
      { id: "chill", section: "Dough", text: "Cover the dough and chill. A 30-minute rest is the minimum; 24 hours gives a noticeably deeper flavour and a thicker cookie.", timerSeconds: 1800 },
      { id: "preheat", section: "To finish", text: "Heat the oven and line two trays with parchment.", temperature: { value: 350, unit: "f", raw: "350 F (175 C)" } },
      { id: "scoop", section: "To finish", text: "Scoop the dough in 50 g balls (about 2 tbsp) onto the trays, leaving a good 5 cm between cookies so they can spread." },
      { id: "bake", section: "To finish", text: "Bake one tray at a time on the middle rack until the edges are set and lightly golden but the centres still look slightly underdone and shiny.", timerSeconds: 720, temperature: { value: 350, unit: "f", raw: "350 F (175 C)" } },
      { id: "rest", section: "To finish", text: "Pull the tray and immediately sprinkle the cookies with flaky salt if using. Rest on the tray for 5 minutes — they finish setting here — then move to a rack.", timerSeconds: 300, ingredientRefs: ["flaky-salt"] },
    ],
    notes: [
      "Rest the dough. A 24–48 hour rest in the fridge dehydrates the surface slightly and lets the flour fully hydrate. The cookies bake thicker, chewier, and taste of caramel rather than raw sugar. If you have time, do it.",
      "Pull early. The single most common mistake is over-baking. The centres should look underdone when you pull the tray — they keep cooking from the residual heat. A pale, soft-looking cookie at 12 minutes is perfect at 15.",
      "Chocolate. Chopped chocolate gives variable pockets and shards; chips give uniform texture. Both work; chopped is more interesting.",
      "Variation — brown butter. Brown 180 g of the butter until nutty and amber, then chill until soft-but-cold before creaming. Use 200 g brown sugar and 100 g white as before. Adds a deep toffee note.",
      "Storage. Best the day they bake. Keep in an airtight tin for up to 3 days. Frozen dough balls bake straight from frozen — add 2 minutes to the time.",
    ],
    tags: ["baseline", "baking", "dessert", "cookies", "vegetarian"],
    collections: ["Baseline", "Baking", "Dessert"],
  },
  {
    slug: "pasta-primavera",
    title: "Pasta Primavera",
    subtitle: "Pasta with quick-cooked spring vegetables, lemon, and parmesan",
    description: "A bright vegetable pasta where crisp-tender vegetables are tossed with pasta and pasta water to make a glossy, broth-light sauce. Lemon and parmesan tie everything together at the end. Treat the vegetable list as a guide — use what is in season.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 15, cookMinutes: 15, totalMinutes: 30 },
    ingredients: [
      { id: "pasta", raw: "360 g short pasta (penne, fusilli, or farfalle)", quantity: "360", unit: "g", item: "short pasta", section: "Pasta" },
      { id: "pasta-salt", raw: "coarse salt, for the pasta water", item: "coarse salt", section: "Pasta" },
      { id: "olive-oil", raw: "3 tbsp olive oil", quantity: "3", unit: "tbsp", item: "olive oil", section: "Vegetables" },
      { id: "shallot", raw: "1 small shallot, finely diced", quantity: "1", unit: "small", item: "shallot, finely diced", section: "Vegetables" },
      { id: "garlic", raw: "2 cloves garlic, thinly sliced", quantity: "2", unit: "cloves", item: "garlic, thinly sliced", section: "Vegetables" },
      { id: "asparagus", raw: "250 g asparagus, trimmed and cut into 4 cm pieces", quantity: "250", unit: "g", item: "asparagus, trimmed and cut into 4 cm pieces", section: "Vegetables" },
      { id: "zucchini", raw: "2 small zucchini, halved lengthwise and sliced", quantity: "2", unit: "small", item: "zucchini, halved lengthwise and sliced", section: "Vegetables" },
      { id: "peas", raw: "150 g peas (fresh or frozen)", quantity: "150", unit: "g", item: "peas", section: "Vegetables" },
      { id: "salt", raw: "fine salt, to taste", item: "fine salt", section: "Vegetables" },
      { id: "pepper", raw: "freshly ground black pepper, to taste", item: "freshly ground black pepper", section: "Vegetables" },
      { id: "butter", raw: "30 g unsalted butter", quantity: "30", unit: "g", item: "unsalted butter", section: "To finish" },
      { id: "lemon", raw: "1 lemon, zested and juiced", quantity: "1", unit: "medium", item: "lemon, zested and juiced", section: "To finish" },
      { id: "parmesan", raw: "70 g parmigiano reggiano, finely grated", quantity: "70", unit: "g", item: "parmigiano reggiano, finely grated", section: "To finish" },
      { id: "basil", raw: "small handful basil leaves, torn, optional", item: "basil leaves, torn", optional: true, section: "To finish" },
    ],
    steps: [
      { id: "boil", section: "Pasta", text: "Bring a large pot of well-salted water to a boil and cook the pasta until just shy of al dente. Reserve a generous mug of pasta water before draining.", ingredientRefs: ["pasta", "pasta-salt"] },
      { id: "soften", section: "Vegetables", text: "While the pasta cooks, warm the olive oil in a wide skillet over medium heat. Add the shallot with a pinch of salt and cook until translucent.", timerSeconds: 180, ingredientRefs: ["olive-oil", "shallot", "salt"] },
      { id: "garlic", section: "Vegetables", text: "Add the garlic and stir for 30 seconds until fragrant — do not brown.", timerSeconds: 30, ingredientRefs: ["garlic"] },
      { id: "asparagus", section: "Vegetables", text: "Add the asparagus and zucchini. Cook, stirring occasionally, until they pick up a little colour but are still crisp.", timerSeconds: 300, ingredientRefs: ["asparagus", "zucchini"] },
      { id: "peas", section: "Vegetables", text: "Add the peas and a splash of pasta water and cook until the peas are bright green and just tender.", timerSeconds: 90, ingredientRefs: ["peas"] },
      { id: "toss", section: "To finish", text: "Add the drained pasta to the skillet along with the butter and another splash of pasta water. Toss vigorously until the butter melts into a glossy emulsion that coats the pasta and vegetables.", ingredientRefs: ["butter"] },
      { id: "finish", section: "To finish", text: "Off the heat, add the lemon zest, lemon juice, and most of the parmesan. Toss again, taste, and adjust salt, pepper, and lemon. Loosen with more pasta water if it tightens.", ingredientRefs: ["lemon", "parmesan", "salt", "pepper"] },
      { id: "serve", section: "To finish", text: "Serve in warm bowls and finish with the remaining parmesan and torn basil.", ingredientRefs: ["parmesan", "basil"] },
    ],
    notes: [
      "Vegetables are a guideline. Spring: asparagus, peas, fava beans, spring onions. Summer: zucchini, green beans, cherry tomatoes, corn. Autumn: broccoli, kale, mushrooms (cook longer and add first). Aim for 600 g total raw vegetables in a mix of textures.",
      "Pasta water is the sauce. There is no separate sauce here — the starch from the pasta water, the olive oil, and the butter emulsify into a light coating. Be generous and confident with the pasta water.",
      "Variation — creamy. The 1976 Le Cirque original finished with a touch of cream. Add 60 ml heavy cream with the butter for a richer, more nostalgic version.",
      "Variation — protein. Pan-seared shrimp or shredded poached chicken added with the lemon turns this into a one-bowl meal.",
      "Serve immediately. This dish goes from glossy to tight in a few minutes. Warm the bowls and have everyone at the table.",
    ],
    tags: ["baseline", "cooking", "pasta", "quick", "vegetarian"],
    collections: ["Baseline", "Cooking", "Pasta", "Vegetarian"],
  },
  {
    slug: "garlic-bread",
    title: "Garlic Bread",
    subtitle: "Crisp baguette with garlic butter and parsley",
    description: "A side that sounds simple and is mostly about ratios — generous butter, more garlic than you think, salt, and a hot oven. The butter should soak partway into the crumb and the crust should crackle.",
    yield: { quantity: 8, unit: "slices", raw: "8 slices (1 baguette)" },
    times: { prepMinutes: 10, cookMinutes: 12, totalMinutes: 22 },
    ingredients: [
      { id: "baguette", raw: "1 day-old baguette, split lengthwise", quantity: "1", unit: "large", item: "baguette, split lengthwise", section: "Bread" },
      { id: "butter", raw: "120 g unsalted butter, softened", quantity: "120", unit: "g", item: "unsalted butter, softened", section: "Garlic butter" },
      { id: "garlic", raw: "5 cloves garlic, grated on a microplane", quantity: "5", unit: "cloves", item: "garlic, grated", section: "Garlic butter" },
      { id: "parsley", raw: "3 tbsp parsley, finely chopped", quantity: "3", unit: "tbsp", item: "parsley, finely chopped", section: "Garlic butter" },
      { id: "salt", raw: "1/2 tsp fine salt", quantity: "0.5", unit: "tsp", item: "fine salt", section: "Garlic butter" },
      { id: "pepper", raw: "freshly ground black pepper, to taste", item: "freshly ground black pepper", section: "Garlic butter" },
      { id: "lemon", raw: "1/2 tsp lemon zest, optional", quantity: "0.5", unit: "tsp", item: "lemon zest", optional: true, section: "Garlic butter" },
      { id: "parmesan", raw: "30 g parmesan, finely grated, optional", quantity: "30", unit: "g", item: "parmesan, finely grated", optional: true, section: "Garlic butter" },
    ],
    steps: [
      { id: "heat", section: "Bread", text: "Heat the oven and line a tray with parchment.", temperature: { value: 200, unit: "c", raw: "200 C" } },
      { id: "butter", section: "Garlic butter", text: "In a small bowl, mash the softened butter with the garlic, parsley, salt, pepper, and the lemon zest and parmesan if using, until evenly combined. The mixture should look pale green and smell like a steakhouse kitchen.", ingredientRefs: ["butter", "garlic", "parsley", "salt", "pepper", "lemon", "parmesan"] },
      { id: "spread", section: "Bread", text: "Place the baguette halves cut-side up on the tray. Spread the garlic butter thickly across both surfaces, all the way to the edges — any uncovered bread will go dry.", ingredientRefs: ["baguette"] },
      { id: "bake", section: "Bread", text: "Bake on the middle rack until the butter has melted into the crumb and the edges of the crust are deep gold.", timerSeconds: 600 },
      { id: "broil", section: "Bread", text: "Switch to the broiler (or top heat) for the last minute to crisp the surface to a darker, blistered finish. Watch closely — it burns in seconds.", timerSeconds: 60 },
      { id: "slice", section: "Bread", text: "Slice on the bias into 8 pieces and serve while the butter is still glossy and the crust is loud.", timerSeconds: 60 },
    ],
    notes: [
      "More garlic than you think. Five cloves on a microplane gives a forward, almost spicy garlic flavour that survives the oven. If you only use two, you cannot taste any garlic at all — the butter swallows it.",
      "Softened butter, not melted. Melted butter pools off the bread and pulls the garlic with it. Truly softened butter (room temp, gives easily under a spoon) clings.",
      "Day-old bread. A fresh baguette goes soggy under the butter. One that has firmed up overnight crisps better. If your bread is too fresh, dry the cut sides in the oven for 3 minutes first.",
      "Variation — cheesy garlic bread. Top the buttered halves with 100 g grated low-moisture mozzarella before baking. Add 2–3 minutes to the bake time.",
      "Variation — herb butter. Swap parsley for a mix of parsley, chives, and a tiny amount of thyme. Skip the lemon and parmesan for a more classic finish.",
    ],
    tags: ["baseline", "baking", "bread", "quick", "vegetarian"],
    collections: ["Baseline", "Baking", "Bread", "Vegetarian"],
  },
];

const entries = seeds.map(makeRecipe);

export const baselineCatalog: BaselineCatalog = {
  sources: [baselineSource],
  recipes: entries.map((entry) => entry.recipe),
  variants: entries.map((entry) => entry.variant),
  versions: entries.map((entry) => entry.version),
};
