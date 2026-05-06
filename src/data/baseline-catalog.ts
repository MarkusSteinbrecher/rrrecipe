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
  themealdb?: {
    id: string;
    category?: string;
    area?: string;
    sourceUrl?: string;
    thumbnailUrl?: string;
  };
};

const baselineSource: Source = {
  id: sourceId,
  type: "manual",
  title: "rrrecipe baseline catalogue",
  author: "rrrecipe",
  retrievedAt: createdAt,
};

function mealDbSource(seed: BaselineSeed): Source | undefined {
  if (!seed.themealdb) return undefined;
  return {
    id: `source-themealdb-${seed.themealdb.id}`,
    type: "themealdb",
    url: `https://www.themealdb.com/meal/${seed.themealdb.id}`,
    title: seed.title,
    author: "TheMealDB",
    retrievedAt: createdAt,
    licenseNote: "TheMealDB public recipe database. Verify source attribution before production use.",
    external: {
      provider: "themealdb",
      id: seed.themealdb.id,
      apiUrl: `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${seed.themealdb.id}`,
      pageUrl: `https://www.themealdb.com/meal/${seed.themealdb.id}`,
      sourceUrl: seed.themealdb.sourceUrl,
      imageUrl: seed.themealdb.thumbnailUrl,
      category: seed.themealdb.category,
      area: seed.themealdb.area,
    },
  };
}

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
      sourceIds: [sourceId, seed.themealdb ? `source-themealdb-${seed.themealdb.id}` : undefined].filter(Boolean) as string[],
      imageIds: [],
      yield: seed.yield,
      times: seed.times,
      ingredients: seed.ingredients.map(ingredient),
      steps: seed.steps.map(step),
      notes: ["Baseline recipe for matching imports. It is not copied from a single published recipe."],
      tags: seed.tags,
      collections: seed.collections,
      changeSummary: "Created baseline catalogue entry",
      origin: "manual_edit",
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
    themealdb: {
      id: "52844",
      category: "Pasta",
      area: "Italian",
      sourceUrl: "https://www.bbcgoodfood.com/recipes/classic-lasagne",
    },
  },
  {
    slug: "margherita-pizza",
    title: "Margherita Pizza",
    subtitle: "Thin pizza with tomato, mozzarella, and basil",
    description: "A reference pizza built from a lean dough, bright tomato, fresh cheese, and high heat.",
    yield: { quantity: 2, unit: "pizzas", raw: "2 pizzas" },
    times: { prepMinutes: 30, cookMinutes: 12, totalMinutes: 180 },
    ingredients: [
      { id: "flour", raw: "500 g bread flour", quantity: "500", unit: "g", item: "bread flour" },
      { id: "water", raw: "325 g water", quantity: "325", unit: "g", item: "water" },
      { id: "yeast", raw: "5 g instant yeast", quantity: "5", unit: "g", item: "instant yeast" },
      { id: "salt", raw: "10 g salt", quantity: "10", unit: "g", item: "salt" },
      { id: "tomato", raw: "250 g crushed tomatoes", quantity: "250", unit: "g", item: "crushed tomatoes" },
      { id: "mozzarella", raw: "250 g mozzarella, torn", quantity: "250", unit: "g", item: "mozzarella, torn" },
      { id: "basil", raw: "fresh basil leaves", item: "fresh basil leaves" },
      { id: "olive-oil", raw: "olive oil, for finishing", item: "olive oil" },
    ],
    steps: [
      { id: "dough", text: "Mix flour, water, yeast, and salt into a smooth dough. Cover and rise until doubled.", timerSeconds: 5400 },
      { id: "divide", text: "Divide into two balls and rest until relaxed and easy to stretch.", timerSeconds: 1800 },
      { id: "heat", text: "Heat oven and baking steel or stone as hot as possible.", timerSeconds: 2700, temperature: { value: 250, unit: "c", raw: "250 C or hotter" } },
      { id: "shape", text: "Stretch each dough ball, leaving a raised rim. Add tomato, mozzarella, and a light drizzle of oil." },
      { id: "bake", text: "Bake until the crust is spotted and the cheese is melted.", timerSeconds: 420 },
      { id: "finish", text: "Finish with basil and another small drizzle of olive oil." },
    ],
    tags: ["baseline", "baking", "pizza", "italian", "vegetarian"],
    collections: ["Baseline", "Baking", "Pizza", "Italian"],
  },
  {
    slug: "banana-bread",
    title: "Banana Bread",
    subtitle: "Moist loaf cake with ripe banana",
    description: "A forgiving quick bread for overripe bananas, built with melted butter and a tender crumb.",
    yield: { quantity: 1, unit: "loaf", raw: "1 loaf" },
    times: { prepMinutes: 15, cookMinutes: 60, totalMinutes: 75 },
    ingredients: [
      { id: "banana", raw: "3 very ripe bananas, mashed", quantity: "3", unit: "", item: "very ripe bananas, mashed" },
      { id: "butter", raw: "115 g melted butter", quantity: "115", unit: "g", item: "melted butter" },
      { id: "sugar", raw: "150 g brown sugar", quantity: "150", unit: "g", item: "brown sugar" },
      { id: "eggs", raw: "2 large eggs", quantity: "2", unit: "large", item: "eggs" },
      { id: "flour", raw: "220 g all-purpose flour", quantity: "220", unit: "g", item: "all-purpose flour" },
      { id: "baking-soda", raw: "1 tsp baking soda", quantity: "1", unit: "tsp", item: "baking soda" },
      { id: "salt", raw: "1/2 tsp salt", quantity: "0.5", unit: "tsp", item: "salt" },
      { id: "vanilla", raw: "1 tsp vanilla extract", quantity: "1", unit: "tsp", item: "vanilla extract" },
    ],
    steps: [
      { id: "prep", text: "Grease and line a loaf pan. Heat the oven.", temperature: { value: 175, unit: "c", raw: "175 C" } },
      { id: "wet", text: "Whisk mashed bananas, melted butter, sugar, eggs, and vanilla until combined." },
      { id: "dry", text: "Fold in flour, baking soda, and salt just until no dry patches remain." },
      { id: "pan", text: "Scrape into the loaf pan and smooth the top." },
      { id: "bake", text: "Bake until a skewer comes out clean from the center.", timerSeconds: 3600 },
      { id: "cool", text: "Cool in the pan for 10 minutes, then finish cooling on a rack.", timerSeconds: 600 },
    ],
    tags: ["baseline", "baking", "dessert", "breakfast", "vegetarian"],
    collections: ["Baseline", "Baking", "Dessert", "Breakfast"],
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
    slug: "lentil-soup",
    title: "Lentil Soup",
    subtitle: "Hearty lentils with vegetables and herbs",
    description: "A flexible one-pot soup baseline with brown or green lentils, aromatic vegetables, and a lemon finish.",
    yield: { quantity: 6, unit: "servings", raw: "6 servings" },
    times: { prepMinutes: 15, cookMinutes: 40, totalMinutes: 55 },
    ingredients: [
      { id: "olive-oil", raw: "2 tbsp olive oil", quantity: "2", unit: "tbsp", item: "olive oil" },
      { id: "onion", raw: "1 onion, diced", quantity: "1", unit: "", item: "onion, diced" },
      { id: "carrots", raw: "2 carrots, diced", quantity: "2", unit: "", item: "carrots, diced" },
      { id: "celery", raw: "2 celery stalks, diced", quantity: "2", unit: "", item: "celery stalks, diced" },
      { id: "garlic", raw: "3 cloves garlic, minced", quantity: "3", unit: "cloves", item: "garlic, minced" },
      { id: "lentils", raw: "300 g brown or green lentils", quantity: "300", unit: "g", item: "brown or green lentils" },
      { id: "stock", raw: "1.5 l vegetable stock", quantity: "1.5", unit: "l", item: "vegetable stock" },
      { id: "tomato", raw: "1 can chopped tomatoes", quantity: "1", unit: "can", item: "chopped tomatoes" },
      { id: "lemon", raw: "1 lemon, juiced", quantity: "1", unit: "", item: "lemon, juiced" },
    ],
    steps: [
      { id: "aromatics", text: "Cook onion, carrots, and celery in olive oil until softened.", timerSeconds: 480 },
      { id: "garlic", text: "Add garlic and cook until fragrant.", timerSeconds: 60 },
      { id: "simmer", text: "Add lentils, stock, and tomatoes. Simmer until lentils are tender.", timerSeconds: 2100 },
      { id: "texture", text: "Blend a small portion of the soup if a thicker texture is desired." },
      { id: "finish", text: "Season with salt, pepper, and lemon juice before serving." },
    ],
    tags: ["baseline", "cooking", "soup", "vegetarian", "vegan"],
    collections: ["Baseline", "Cooking", "Soup", "Vegetarian"],
  },
  {
    slug: "chicken-noodle-soup",
    title: "Chicken Noodle Soup",
    subtitle: "Clear broth with chicken, noodles, and vegetables",
    description: "A comfort soup baseline built from tender chicken, aromatic vegetables, and egg noodles.",
    yield: { quantity: 6, unit: "servings", raw: "6 servings" },
    times: { prepMinutes: 20, cookMinutes: 55, totalMinutes: 75 },
    ingredients: [
      { id: "chicken", raw: "700 g bone-in chicken pieces", quantity: "700", unit: "g", item: "bone-in chicken pieces" },
      { id: "stock", raw: "2 l chicken stock", quantity: "2", unit: "l", item: "chicken stock" },
      { id: "onion", raw: "1 onion, quartered", quantity: "1", unit: "", item: "onion, quartered" },
      { id: "carrots", raw: "3 carrots, sliced", quantity: "3", unit: "", item: "carrots, sliced" },
      { id: "celery", raw: "3 celery stalks, sliced", quantity: "3", unit: "", item: "celery stalks, sliced" },
      { id: "noodles", raw: "180 g egg noodles", quantity: "180", unit: "g", item: "egg noodles" },
      { id: "parsley", raw: "2 tbsp parsley, chopped", quantity: "2", unit: "tbsp", item: "parsley, chopped" },
      { id: "lemon", raw: "lemon juice, to taste", item: "lemon juice" },
    ],
    steps: [
      { id: "poach", text: "Simmer chicken in stock with onion until the meat is cooked through and tender.", timerSeconds: 2100 },
      { id: "shred", text: "Remove chicken, discard bones and skin, and shred the meat." },
      { id: "veg", text: "Add carrots and celery to the broth and simmer until just tender.", timerSeconds: 720 },
      { id: "noodles", text: "Add noodles and cook until tender.", timerSeconds: 480 },
      { id: "finish", text: "Return shredded chicken to the pot. Season with salt, parsley, and lemon." },
    ],
    tags: ["baseline", "cooking", "soup", "comfort", "dinner"],
    collections: ["Baseline", "Cooking", "Soup"],
  },
  {
    slug: "chicken-tikka-masala",
    title: "Chicken Tikka Masala",
    subtitle: "Spiced chicken in a creamy tomato sauce",
    description: "A weeknight-friendly curry baseline with yogurt-marinated chicken and a rich tomato gravy.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 25, cookMinutes: 35, totalMinutes: 60 },
    ingredients: [
      { id: "chicken", raw: "700 g boneless chicken thighs, bite-size pieces", quantity: "700", unit: "g", item: "boneless chicken thighs, bite-size pieces" },
      { id: "yogurt", raw: "120 g plain yogurt", quantity: "120", unit: "g", item: "plain yogurt" },
      { id: "garam", raw: "2 tbsp garam masala", quantity: "2", unit: "tbsp", item: "garam masala" },
      { id: "ginger", raw: "1 tbsp grated ginger", quantity: "1", unit: "tbsp", item: "grated ginger" },
      { id: "garlic", raw: "4 cloves garlic, minced", quantity: "4", unit: "cloves", item: "garlic, minced" },
      { id: "tomato", raw: "400 g crushed tomatoes", quantity: "400", unit: "g", item: "crushed tomatoes" },
      { id: "cream", raw: "150 ml cream", quantity: "150", unit: "ml", item: "cream" },
      { id: "butter", raw: "30 g butter", quantity: "30", unit: "g", item: "butter" },
      { id: "cilantro", raw: "cilantro, for serving", item: "cilantro" },
    ],
    steps: [
      { id: "marinate", text: "Mix chicken with yogurt, half the garam masala, ginger, garlic, and salt. Rest while preparing the sauce.", timerSeconds: 1200 },
      { id: "sear", text: "Sear chicken in batches until browned outside. It does not need to be fully cooked yet.", timerSeconds: 600 },
      { id: "sauce", text: "Cook remaining spices in butter, then add tomatoes and simmer until darker and thick.", timerSeconds: 900 },
      { id: "simmer", text: "Add chicken and simmer until cooked through.", timerSeconds: 720 },
      { id: "finish", text: "Stir in cream, adjust salt, and finish with cilantro." },
    ],
    tags: ["baseline", "cooking", "curry", "indian", "dinner"],
    collections: ["Baseline", "Cooking", "Curry", "Indian"],
  },
  {
    slug: "vegetable-curry",
    title: "Vegetable Curry",
    subtitle: "Coconut vegetable curry with chickpeas",
    description: "A flexible curry baseline for mixed vegetables, chickpeas, coconut milk, and warm spices.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 20, cookMinutes: 30, totalMinutes: 50 },
    ingredients: [
      { id: "oil", raw: "2 tbsp neutral oil", quantity: "2", unit: "tbsp", item: "neutral oil" },
      { id: "onion", raw: "1 onion, sliced", quantity: "1", unit: "", item: "onion, sliced" },
      { id: "garlic", raw: "3 cloves garlic, minced", quantity: "3", unit: "cloves", item: "garlic, minced" },
      { id: "curry-powder", raw: "2 tbsp curry powder", quantity: "2", unit: "tbsp", item: "curry powder" },
      { id: "vegetables", raw: "600 g mixed vegetables, bite-size pieces", quantity: "600", unit: "g", item: "mixed vegetables, bite-size pieces" },
      { id: "chickpeas", raw: "1 can chickpeas, drained", quantity: "1", unit: "can", item: "chickpeas, drained" },
      { id: "coconut-milk", raw: "400 ml coconut milk", quantity: "400", unit: "ml", item: "coconut milk" },
      { id: "lime", raw: "1 lime, juiced", quantity: "1", unit: "", item: "lime, juiced" },
    ],
    steps: [
      { id: "aromatics", text: "Cook onion in oil until soft, then add garlic and curry powder.", timerSeconds: 420 },
      { id: "veg", text: "Add firm vegetables first and cook until they start to soften.", timerSeconds: 480 },
      { id: "simmer", text: "Add chickpeas and coconut milk. Simmer until all vegetables are tender.", timerSeconds: 900 },
      { id: "finish", text: "Season with salt and lime juice. Serve with rice or flatbread." },
    ],
    tags: ["baseline", "cooking", "curry", "vegetarian", "vegan"],
    collections: ["Baseline", "Cooking", "Curry", "Vegetarian"],
  },
  {
    slug: "beef-chili",
    title: "Beef Chili",
    subtitle: "Tomato beef chili with beans and warm spices",
    description: "A one-pot chili baseline designed for batch cooking and easy variation.",
    yield: { quantity: 6, unit: "servings", raw: "6 servings" },
    times: { prepMinutes: 20, cookMinutes: 75, totalMinutes: 95 },
    ingredients: [
      { id: "oil", raw: "2 tbsp neutral oil", quantity: "2", unit: "tbsp", item: "neutral oil" },
      { id: "beef", raw: "700 g ground beef", quantity: "700", unit: "g", item: "ground beef" },
      { id: "onion", raw: "1 onion, diced", quantity: "1", unit: "", item: "onion, diced" },
      { id: "garlic", raw: "4 cloves garlic, minced", quantity: "4", unit: "cloves", item: "garlic, minced" },
      { id: "chili-powder", raw: "3 tbsp chili powder", quantity: "3", unit: "tbsp", item: "chili powder" },
      { id: "cumin", raw: "2 tsp ground cumin", quantity: "2", unit: "tsp", item: "ground cumin" },
      { id: "tomato", raw: "800 g crushed tomatoes", quantity: "800", unit: "g", item: "crushed tomatoes" },
      { id: "beans", raw: "2 cans kidney beans, drained", quantity: "2", unit: "cans", item: "kidney beans, drained" },
    ],
    steps: [
      { id: "brown", text: "Brown beef well in oil, breaking it into small pieces.", timerSeconds: 600 },
      { id: "aromatics", text: "Add onion and cook until soft, then add garlic, chili powder, and cumin.", timerSeconds: 420 },
      { id: "simmer", text: "Add tomatoes and beans. Simmer until thick and cohesive.", timerSeconds: 3600 },
      { id: "season", text: "Season with salt and adjust heat with cayenne or hot sauce if desired." },
      { id: "serve", text: "Serve with rice, cornbread, sour cream, cheese, or scallions." },
    ],
    tags: ["baseline", "cooking", "stew", "batch", "dinner"],
    collections: ["Baseline", "Cooking", "Stew"],
  },
  {
    slug: "ratatouille",
    title: "Ratatouille",
    subtitle: "Stewed summer vegetables with olive oil and herbs",
    description: "A vegetable baseline where eggplant, zucchini, peppers, and tomato cook down into a soft stew.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 25, cookMinutes: 45, totalMinutes: 70 },
    ingredients: [
      { id: "eggplant", raw: "1 eggplant, diced", quantity: "1", unit: "", item: "eggplant, diced" },
      { id: "zucchini", raw: "2 zucchini, diced", quantity: "2", unit: "", item: "zucchini, diced" },
      { id: "pepper", raw: "2 bell peppers, diced", quantity: "2", unit: "", item: "bell peppers, diced" },
      { id: "onion", raw: "1 onion, diced", quantity: "1", unit: "", item: "onion, diced" },
      { id: "garlic", raw: "4 cloves garlic, sliced", quantity: "4", unit: "cloves", item: "garlic, sliced" },
      { id: "tomato", raw: "500 g ripe tomatoes, chopped", quantity: "500", unit: "g", item: "ripe tomatoes, chopped" },
      { id: "olive-oil", raw: "80 ml olive oil", quantity: "80", unit: "ml", item: "olive oil" },
      { id: "herbs", raw: "1 tbsp thyme or herbes de Provence", quantity: "1", unit: "tbsp", item: "thyme or herbes de Provence" },
    ],
    steps: [
      { id: "eggplant", text: "Cook eggplant in olive oil until browned and softened. Remove to a bowl.", timerSeconds: 600 },
      { id: "zucchini", text: "Cook zucchini and peppers until lightly browned. Add to the bowl.", timerSeconds: 600 },
      { id: "base", text: "Cook onion and garlic until soft, then add tomatoes and herbs.", timerSeconds: 600 },
      { id: "stew", text: "Return vegetables to the pot and simmer gently until silky but not mushy.", timerSeconds: 1500 },
      { id: "finish", text: "Season with salt, pepper, and a final drizzle of olive oil." },
    ],
    tags: ["baseline", "cooking", "vegetarian", "french", "vegan"],
    collections: ["Baseline", "Cooking", "Vegetarian", "French"],
    themealdb: {
      id: "52908",
      category: "Vegetarian",
      area: "France",
      sourceUrl: "https://www.bbcgoodfood.com/recipes/2903/ratatouille",
    },
  },
  {
    slug: "tomato-risotto",
    title: "Tomato Risotto",
    subtitle: "Creamy rice with tomato, parmesan, and basil",
    description: "A risotto baseline focused on gradual stock addition, steady stirring, and a creamy finish.",
    yield: { quantity: 4, unit: "servings", raw: "4 servings" },
    times: { prepMinutes: 10, cookMinutes: 30, totalMinutes: 40 },
    ingredients: [
      { id: "rice", raw: "320 g arborio rice", quantity: "320", unit: "g", item: "arborio rice" },
      { id: "stock", raw: "1 l vegetable stock, hot", quantity: "1", unit: "l", item: "vegetable stock, hot" },
      { id: "tomato", raw: "300 g crushed tomatoes", quantity: "300", unit: "g", item: "crushed tomatoes" },
      { id: "onion", raw: "1 small onion, finely diced", quantity: "1", unit: "small", item: "onion, finely diced" },
      { id: "wine", raw: "120 ml white wine", quantity: "120", unit: "ml", item: "white wine" },
      { id: "butter", raw: "40 g butter", quantity: "40", unit: "g", item: "butter" },
      { id: "parmesan", raw: "70 g parmesan, grated", quantity: "70", unit: "g", item: "parmesan, grated" },
      { id: "basil", raw: "fresh basil leaves", item: "fresh basil leaves" },
    ],
    steps: [
      { id: "onion", text: "Cook onion in a little butter until translucent.", timerSeconds: 300 },
      { id: "toast", text: "Add rice and toast until the grains are hot and lightly translucent at the edges.", timerSeconds: 180 },
      { id: "wine", text: "Add wine and stir until mostly absorbed.", timerSeconds: 180 },
      { id: "stock", text: "Add hot stock a ladle at a time, stirring often and waiting until each addition is absorbed.", timerSeconds: 1080 },
      { id: "tomato", text: "Stir in tomatoes partway through cooking so the rice finishes creamy and tender.", timerSeconds: 420 },
      { id: "finish", text: "Beat in butter and parmesan off the heat. Rest briefly and serve with basil.", timerSeconds: 120 },
    ],
    tags: ["baseline", "cooking", "rice", "italian", "vegetarian"],
    collections: ["Baseline", "Cooking", "Rice", "Italian"],
  },
  {
    slug: "pancakes",
    title: "Pancakes",
    subtitle: "Fluffy skillet pancakes for breakfast",
    description: "A basic batter baseline with just enough mixing to keep the pancakes tender.",
    yield: { quantity: 12, unit: "pancakes", raw: "12 pancakes" },
    times: { prepMinutes: 10, cookMinutes: 20, totalMinutes: 30 },
    ingredients: [
      { id: "flour", raw: "220 g all-purpose flour", quantity: "220", unit: "g", item: "all-purpose flour" },
      { id: "sugar", raw: "2 tbsp sugar", quantity: "2", unit: "tbsp", item: "sugar" },
      { id: "baking-powder", raw: "2 tsp baking powder", quantity: "2", unit: "tsp", item: "baking powder" },
      { id: "salt", raw: "1/2 tsp salt", quantity: "0.5", unit: "tsp", item: "salt" },
      { id: "milk", raw: "300 ml milk", quantity: "300", unit: "ml", item: "milk" },
      { id: "eggs", raw: "2 large eggs", quantity: "2", unit: "large", item: "eggs" },
      { id: "butter", raw: "40 g melted butter", quantity: "40", unit: "g", item: "melted butter" },
      { id: "vanilla", raw: "1 tsp vanilla extract, optional", quantity: "1", unit: "tsp", item: "vanilla extract", optional: true },
    ],
    steps: [
      { id: "dry", text: "Whisk flour, sugar, baking powder, and salt in a bowl." },
      { id: "wet", text: "Whisk milk, eggs, melted butter, and vanilla in a second bowl." },
      { id: "mix", text: "Fold wet into dry just until combined. A few lumps are fine.", timerSeconds: 60 },
      { id: "rest", text: "Rest batter while heating a lightly greased skillet.", timerSeconds: 300 },
      { id: "cook", text: "Cook scoops of batter until bubbles form, then flip and cook the second side.", timerSeconds: 180 },
      { id: "serve", text: "Serve warm with butter, syrup, fruit, or yogurt." },
    ],
    tags: ["baseline", "cooking", "breakfast", "quick", "vegetarian"],
    collections: ["Baseline", "Cooking", "Breakfast"],
    themealdb: {
      id: "52854",
      category: "Dessert",
      area: "United States",
      sourceUrl: "https://www.bbcgoodfood.com/recipes/2907669/easy-pancakes",
    },
  },
  {
    slug: "hummus",
    title: "Hummus",
    subtitle: "Creamy chickpea and tahini dip",
    description: "A pantry mezze baseline with chickpeas, tahini, lemon, garlic, and olive oil.",
    yield: { quantity: 6, unit: "servings", raw: "6 servings" },
    times: { prepMinutes: 15, cookMinutes: 0, totalMinutes: 15 },
    ingredients: [
      { id: "chickpeas", raw: "2 cans chickpeas, drained", quantity: "2", unit: "cans", item: "chickpeas, drained" },
      { id: "tahini", raw: "120 g tahini", quantity: "120", unit: "g", item: "tahini" },
      { id: "lemon", raw: "1 lemon, juiced", quantity: "1", unit: "", item: "lemon, juiced" },
      { id: "garlic", raw: "1 clove garlic", quantity: "1", unit: "clove", item: "garlic" },
      { id: "cumin", raw: "1/2 tsp ground cumin", quantity: "0.5", unit: "tsp", item: "ground cumin" },
      { id: "olive-oil", raw: "3 tbsp olive oil", quantity: "3", unit: "tbsp", item: "olive oil" },
      { id: "water", raw: "cold water, as needed", item: "cold water" },
      { id: "salt", raw: "salt, to taste", item: "salt" },
    ],
    steps: [
      { id: "tahini", text: "Blend tahini, lemon juice, garlic, cumin, and salt until pale and thick." },
      { id: "chickpeas", text: "Add chickpeas and blend until smooth, scraping down the bowl as needed." },
      { id: "loosen", text: "Stream in cold water until the hummus is light and creamy." },
      { id: "finish", text: "Taste for salt and lemon. Serve with olive oil on top." },
    ],
    tags: ["baseline", "cooking", "mezze", "quick", "vegan"],
    collections: ["Baseline", "Cooking", "Mezze", "Vegan"],
    themealdb: {
      id: "53269",
      category: "Side",
      area: "Turkish",
      sourceUrl: "https://www.bbcgoodfood.com/recipes/easy-hummus-recipe",
    },
  },
];

const entries = seeds.map(makeRecipe);
const mealDbSources = seeds.map(mealDbSource).filter((source): source is Source => Boolean(source));

export const baselineCatalog: BaselineCatalog = {
  sources: [baselineSource, ...mealDbSources],
  recipes: entries.map((entry) => entry.recipe),
  variants: entries.map((entry) => entry.variant),
  versions: entries.map((entry) => entry.version),
};
