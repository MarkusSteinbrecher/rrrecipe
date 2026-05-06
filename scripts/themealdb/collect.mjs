import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = resolve(repoRoot, "data/themealdb-recipes/catalog.json");
const apiBase = "https://www.themealdb.com/api/json/v1/1";

const letters = "abcdefghijklmnopqrstuvwxyz".split("");
const recordsById = new Map();

for (const letter of letters) {
  const payload = await getJson(`${apiBase}/search.php?f=${letter}`);
  for (const meal of payload.meals ?? []) {
    recordsById.set(meal.idMeal, normalizeMeal(meal));
  }
}

const records = [...recordsById.values()].sort((a, b) => a.name.localeCompare(b.name));
const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "TheMealDB API v1 search.php?f=LETTER",
  sourceUrl: "https://www.themealdb.com/api.php",
  apiBase,
  apiKey: "developer-test-key-1",
  productionNote: "TheMealDB documents key 1 for development or educational use. Public production releases should use a supporter key.",
  recordCount: records.length,
  records,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${records.length} TheMealDB records to ${outputPath}`);

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TheMealDB request failed ${response.status}: ${url}`);
  return response.json();
}

function normalizeMeal(meal) {
  const ingredients = [];
  for (let index = 1; index <= 20; index += 1) {
    const ingredient = clean(meal[`strIngredient${index}`]);
    const measure = clean(meal[`strMeasure${index}`]);
    if (!ingredient) continue;
    ingredients.push({ ingredient, measure });
  }

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    drinkAlternate: clean(meal.strDrinkAlternate),
    category: clean(meal.strCategory),
    area: clean(meal.strArea),
    tags: clean(meal.strTags)?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
    instructions: clean(meal.strInstructions),
    thumbnailUrl: clean(meal.strMealThumb),
    youtubeUrl: clean(meal.strYoutube),
    sourceUrl: clean(meal.strSource) ?? `https://www.themealdb.com/meal/${meal.idMeal}`,
    mealDbUrl: `https://www.themealdb.com/meal/${meal.idMeal}`,
    apiUrl: `${apiBase}/lookup.php?i=${meal.idMeal}`,
    ingredients,
    imageSource: clean(meal.strImageSource),
    creativeCommonsConfirmed: clean(meal.strCreativeCommonsConfirmed),
    dateModified: clean(meal.dateModified),
  };
}

function clean(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}
