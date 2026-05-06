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
      notes: ["Baseline recipe for matching imports. It is not copied from a single published recipe."],
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
    subtitle: "Olive oil flatbread with a crisp base and open crumb",
    description: "A simple high-hydration Italian bread built around time, olive oil, and a well-oiled pan.",
    yield: { quantity: 1, unit: "tray", raw: "1 9 x 13 inch tray" },
    times: { prepMinutes: 25, cookMinutes: 25, totalMinutes: 240 },
    ingredients: [
      { id: "bread-flour", raw: "500 g bread flour", quantity: "500", unit: "g", item: "bread flour" },
      { id: "water", raw: "400 g lukewarm water", quantity: "400", unit: "g", item: "lukewarm water" },
      { id: "yeast", raw: "7 g instant yeast", quantity: "7", unit: "g", item: "instant yeast" },
      { id: "salt", raw: "12 g fine salt", quantity: "12", unit: "g", item: "fine salt" },
      { id: "olive-oil", raw: "60 ml olive oil, divided", quantity: "60", unit: "ml", item: "olive oil" },
      { id: "flaky-salt", raw: "flaky salt, for finishing", item: "flaky salt" },
      { id: "rosemary", raw: "1 tbsp rosemary leaves, optional", quantity: "1", unit: "tbsp", item: "rosemary leaves", optional: true },
    ],
    steps: [
      { id: "mix", text: "Mix flour, water, yeast, and fine salt until no dry flour remains. Cover and rest for 20 minutes.", timerSeconds: 1200 },
      { id: "fold", text: "Oil your hands and fold the dough over itself several times. Cover and let rise until doubled.", timerSeconds: 5400 },
      { id: "pan", text: "Oil a baking tray generously. Transfer the dough, turn it to coat, and rest until relaxed and puffy.", timerSeconds: 3600 },
      { id: "dimple", text: "Press fingertips through the dough to make deep dimples. Drizzle with remaining olive oil and add flaky salt and rosemary." },
      { id: "bake", text: "Bake until deeply golden on top and crisp underneath.", timerSeconds: 1500, temperature: { value: 220, unit: "c", raw: "220 C" } },
      { id: "cool", text: "Cool on a rack for at least 10 minutes before slicing.", timerSeconds: 600 },
    ],
    tags: ["baseline", "baking", "bread", "italian", "vegetarian"],
    collections: ["Baseline", "Baking", "Bread", "Italian"],
  },
  {
    slug: "spaghetti-carbonara",
    title: "Spaghetti Carbonara",
    subtitle: "Pasta with eggs, pecorino, black pepper, and crisp cured pork",
    description: "A Roman-style pasta where starchy pasta water turns eggs and cheese into a glossy sauce.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 },
    ingredients: [
      { id: "spaghetti", raw: "400 g spaghetti", quantity: "400", unit: "g", item: "spaghetti" },
      { id: "guanciale", raw: "150 g guanciale or pancetta, diced", quantity: "150", unit: "g", item: "guanciale or pancetta, diced" },
      { id: "eggs", raw: "3 large eggs plus 1 yolk", quantity: "3", unit: "large", item: "eggs" },
      { id: "pecorino", raw: "90 g pecorino romano, finely grated", quantity: "90", unit: "g", item: "pecorino romano, finely grated" },
      { id: "pepper", raw: "2 tsp freshly ground black pepper", quantity: "2", unit: "tsp", item: "freshly ground black pepper" },
      { id: "salt", raw: "salt, for pasta water", item: "salt" },
    ],
    steps: [
      { id: "boil", text: "Bring a large pot of salted water to a boil and cook spaghetti until just shy of al dente." },
      { id: "render", text: "Render guanciale in a skillet over medium heat until the fat is clear and the edges are crisp.", timerSeconds: 480 },
      { id: "sauce", text: "Whisk eggs, yolk, pecorino, and black pepper in a bowl until thick." },
      { id: "combine", text: "Transfer hot pasta to the skillet off the heat. Toss with guanciale fat, then add the egg mixture and a splash of pasta water." },
      { id: "emulsify", text: "Toss vigorously until glossy and loose, adding pasta water a spoonful at a time as needed." },
      { id: "serve", text: "Serve immediately with more pecorino and black pepper." },
    ],
    tags: ["baseline", "cooking", "pasta", "italian", "quick"],
    collections: ["Baseline", "Cooking", "Pasta", "Italian"],
  },
  {
    slug: "lasagne",
    title: "Lasagne",
    subtitle: "Layered pasta with ragu, bechamel, and parmesan",
    description: "A baked pasta baseline with slow meat sauce, white sauce, and tender pasta sheets.",
    yield: { quantity: 8, unit: "servings", raw: "8 servings" },
    times: { prepMinutes: 45, cookMinutes: 120, totalMinutes: 165 },
    ingredients: [
      { id: "lasagne-sheets", raw: "300 g lasagne sheets", quantity: "300", unit: "g", item: "lasagne sheets" },
      { id: "beef", raw: "500 g ground beef", quantity: "500", unit: "g", item: "ground beef" },
      { id: "onion", raw: "1 onion, finely diced", quantity: "1", unit: "", item: "onion, finely diced" },
      { id: "carrot", raw: "1 carrot, finely diced", quantity: "1", unit: "", item: "carrot, finely diced" },
      { id: "celery", raw: "1 celery stalk, finely diced", quantity: "1", unit: "", item: "celery stalk, finely diced" },
      { id: "tomato", raw: "700 ml tomato passata", quantity: "700", unit: "ml", item: "tomato passata" },
      { id: "milk", raw: "700 ml milk", quantity: "700", unit: "ml", item: "milk" },
      { id: "butter", raw: "60 g butter", quantity: "60", unit: "g", item: "butter" },
      { id: "flour", raw: "60 g flour", quantity: "60", unit: "g", item: "flour" },
      { id: "parmesan", raw: "100 g parmesan, grated", quantity: "100", unit: "g", item: "parmesan, grated" },
    ],
    steps: [
      { id: "soffritto", text: "Cook onion, carrot, and celery in olive oil until soft and sweet.", timerSeconds: 600 },
      { id: "ragu", text: "Add beef and brown well. Stir in passata, season, and simmer until thick.", timerSeconds: 5400 },
      { id: "bechamel", text: "Cook butter and flour for 2 minutes, then whisk in milk gradually and simmer until smooth.", timerSeconds: 600 },
      { id: "layer", text: "Layer ragu, pasta sheets, bechamel, and parmesan in a baking dish, finishing with bechamel and cheese." },
      { id: "bake", text: "Bake until bubbling and browned on top.", timerSeconds: 2700, temperature: { value: 190, unit: "c", raw: "190 C" } },
      { id: "rest", text: "Rest for 15 minutes before cutting so the layers hold.", timerSeconds: 900 },
    ],
    tags: ["baseline", "cooking", "pasta", "italian", "baked"],
    collections: ["Baseline", "Cooking", "Pasta", "Italian"],
  },
  {
    slug: "shakshuka",
    title: "Shakshuka",
    subtitle: "Eggs poached in spiced tomato and pepper sauce",
    description: "A skillet dish with a peppery tomato base, gently set eggs, and herbs for serving.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 10, cookMinutes: 25, totalMinutes: 35 },
    ingredients: [
      { id: "olive-oil", raw: "2 tbsp olive oil", quantity: "2", unit: "tbsp", item: "olive oil" },
      { id: "onion", raw: "1 medium onion, diced", quantity: "1", unit: "medium", item: "onion, diced" },
      { id: "bell-pepper", raw: "1 red bell pepper, diced", quantity: "1", unit: "medium", item: "red bell pepper, diced" },
      { id: "garlic", raw: "3 cloves garlic, minced", quantity: "3", unit: "cloves", item: "garlic, minced" },
      { id: "cumin", raw: "1 tsp ground cumin", quantity: "1", unit: "tsp", item: "ground cumin" },
      { id: "paprika", raw: "1 tsp smoked paprika", quantity: "1", unit: "tsp", item: "smoked paprika" },
      { id: "tomatoes", raw: "800 g crushed tomatoes", quantity: "800", unit: "g", item: "crushed tomatoes" },
      { id: "eggs", raw: "6 large eggs", quantity: "6", unit: "large", item: "eggs" },
    ],
    steps: [
      { id: "soften", text: "Cook onion and bell pepper in olive oil until soft and starting to sweeten.", timerSeconds: 480 },
      { id: "spice", text: "Add garlic, cumin, paprika, salt, and pepper. Stir until fragrant.", timerSeconds: 60 },
      { id: "simmer", text: "Add crushed tomatoes and simmer until the sauce is thick enough to hold shallow wells.", timerSeconds: 900 },
      { id: "eggs", text: "Make wells in the sauce, crack in the eggs, and season the tops lightly." },
      { id: "poach", text: "Cover and cook until the whites are set and yolks are still soft.", timerSeconds: 420 },
    ],
    tags: ["baseline", "cooking", "quick", "vegetarian", "breakfast"],
    collections: ["Baseline", "Cooking", "Vegetarian", "Breakfast"],
  },
  {
    slug: "chocolate-chip-cookies",
    title: "Chocolate Chip Cookies",
    subtitle: "Chewy cookies with crisp edges",
    description: "A classic drop cookie with brown sugar, vanilla, and chopped chocolate or chips.",
    yield: { quantity: 24, unit: "cookies", raw: "24 cookies" },
    times: { prepMinutes: 20, cookMinutes: 12, totalMinutes: 62 },
    ingredients: [
      { id: "butter", raw: "225 g unsalted butter, softened", quantity: "225", unit: "g", item: "unsalted butter, softened" },
      { id: "brown-sugar", raw: "200 g brown sugar", quantity: "200", unit: "g", item: "brown sugar" },
      { id: "white-sugar", raw: "100 g white sugar", quantity: "100", unit: "g", item: "white sugar" },
      { id: "eggs", raw: "2 large eggs", quantity: "2", unit: "large", item: "eggs" },
      { id: "vanilla", raw: "2 tsp vanilla extract", quantity: "2", unit: "tsp", item: "vanilla extract" },
      { id: "flour", raw: "300 g all-purpose flour", quantity: "300", unit: "g", item: "all-purpose flour" },
      { id: "baking-soda", raw: "1 tsp baking soda", quantity: "1", unit: "tsp", item: "baking soda" },
      { id: "salt", raw: "1 tsp salt", quantity: "1", unit: "tsp", item: "salt" },
      { id: "chocolate", raw: "300 g chocolate chips", quantity: "300", unit: "g", item: "chocolate chips" },
    ],
    steps: [
      { id: "cream", text: "Cream butter and both sugars until lighter and smooth.", timerSeconds: 180 },
      { id: "eggs", text: "Beat in eggs one at a time, then vanilla." },
      { id: "dry", text: "Mix in flour, baking soda, and salt until just combined, then fold in chocolate." },
      { id: "chill", text: "Chill the dough so the cookies bake thick instead of spreading flat.", timerSeconds: 1800 },
      { id: "scoop", text: "Scoop onto lined trays with space between each cookie." },
      { id: "bake", text: "Bake until edges are set and centers still look soft.", timerSeconds: 720, temperature: { value: 180, unit: "c", raw: "180 C" } },
    ],
    tags: ["baseline", "baking", "dessert", "cookies", "vegetarian"],
    collections: ["Baseline", "Baking", "Dessert"],
  },
  {
    slug: "pasta-primavera",
    title: "Pasta Primavera",
    subtitle: "Pasta with quick-cooked spring vegetables",
    description: "A flexible vegetable pasta where crisp-tender vegetables are finished with pasta water, lemon, and parmesan.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 15, cookMinutes: 15, totalMinutes: 30 },
    ingredients: [
      { id: "pasta", raw: "360 g short pasta", quantity: "360", unit: "g", item: "short pasta" },
      { id: "olive-oil", raw: "3 tbsp olive oil", quantity: "3", unit: "tbsp", item: "olive oil" },
      { id: "zucchini", raw: "2 small zucchini, sliced", quantity: "2", unit: "small", item: "zucchini, sliced" },
      { id: "asparagus", raw: "250 g asparagus, trimmed", quantity: "250", unit: "g", item: "asparagus, trimmed" },
      { id: "peas", raw: "150 g peas", quantity: "150", unit: "g", item: "peas" },
      { id: "parmesan", raw: "70 g parmesan, grated", quantity: "70", unit: "g", item: "parmesan, grated" },
      { id: "lemon", raw: "1 lemon, zested and juiced", quantity: "1", unit: "large", item: "lemon, zested and juiced" },
    ],
    steps: [
      { id: "boil", text: "Cook pasta in salted boiling water until just shy of al dente. Reserve a mug of pasta water." },
      { id: "zucchini", text: "Cook zucchini and asparagus in olive oil until crisp-tender.", timerSeconds: 420 },
      { id: "peas", text: "Add peas and cook until bright green.", timerSeconds: 90 },
      { id: "toss", text: "Add pasta, parmesan, lemon zest, lemon juice, and enough pasta water to make a glossy sauce." },
      { id: "serve", text: "Season with salt and pepper, then serve immediately with more parmesan." },
    ],
    tags: ["baseline", "cooking", "pasta", "quick", "vegetarian"],
    collections: ["Baseline", "Cooking", "Pasta", "Vegetarian"],
  },
  {
    slug: "garlic-bread",
    title: "Garlic Bread",
    subtitle: "Crisp bread with garlic butter and parsley",
    description: "A quick bread side that exercises oven timing, butter mixing, and crisp finishing.",
    yield: { quantity: 8, unit: "slices", raw: "8 slices" },
    times: { prepMinutes: 10, cookMinutes: 12, totalMinutes: 22 },
    ingredients: [
      { id: "baguette", raw: "1 baguette, split lengthwise", quantity: "1", unit: "large", item: "baguette, split lengthwise" },
      { id: "butter", raw: "100 g unsalted butter, softened", quantity: "100", unit: "g", item: "unsalted butter, softened" },
      { id: "garlic", raw: "4 cloves garlic, grated", quantity: "4", unit: "cloves", item: "garlic, grated" },
      { id: "parsley", raw: "2 tbsp parsley, chopped", quantity: "2", unit: "tbsp", item: "parsley, chopped" },
      { id: "salt", raw: "1/2 tsp fine salt", quantity: "0.5", unit: "tsp", item: "fine salt" },
      { id: "parmesan", raw: "30 g parmesan, grated, optional", quantity: "30", unit: "g", item: "parmesan, grated", optional: true },
    ],
    steps: [
      { id: "heat", text: "Heat the oven and line a tray.", temperature: { value: 200, unit: "c", raw: "200 C" } },
      { id: "butter", text: "Mix butter, garlic, parsley, salt, and parmesan until evenly combined." },
      { id: "spread", text: "Spread the garlic butter over the cut sides of the bread and place on the tray." },
      { id: "bake", text: "Bake until the edges are crisp and the butter has melted into the bread.", timerSeconds: 600 },
      { id: "finish", text: "Slice while warm and serve before the crust softens.", timerSeconds: 60 },
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
