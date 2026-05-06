import type { IngredientLine, InstructionStep, RecipeCandidate, Source, TheMealDBRecord } from "../types";

export function createMealDbCandidate(record: TheMealDBRecord): RecipeCandidate {
  const source = createMealDbSource(record);
  const steps = parseInstructionSteps(record.instructions ?? "");
  return {
    id: createId("candidate"),
    source,
    title: record.name,
    language: "en",
    description: [record.area, record.category].filter(Boolean).join(" · ") || "Draft imported from TheMealDB.",
    ingredients: record.ingredients.map((item) => parseIngredient(item.ingredient, item.measure)),
    steps,
    notes: [
      `Imported from TheMealDB meal ${record.id}.`,
      record.sourceUrl && record.sourceUrl !== record.mealDbUrl ? `Original source: ${record.sourceUrl}` : "",
      record.youtubeUrl ? `Related video: ${record.youtubeUrl}` : "",
    ].filter(Boolean),
    tags: Array.from(
      new Set(
        ["themealdb", record.category?.toLowerCase(), record.area?.toLowerCase(), ...record.tags.map((tag) => tag.toLowerCase())].filter(
          (tag): tag is string => Boolean(tag),
        ),
      ),
    ).slice(0, 8),
    confidence: {
      overall: record.ingredients.length && steps.length ? 0.72 : 0.36,
      source: 0.88,
      ingredients: record.ingredients.length ? 0.74 : 0.1,
      steps: steps.length ? 0.68 : 0.1,
    },
    warnings: [
      "TheMealDB is an external source catalog. Review ingredients, wording, and attribution before saving.",
      "The free developer key is suitable for development; public production releases should use a supporter key.",
    ],
  };
}

export function createMealDbSource(record: TheMealDBRecord): Source {
  return {
    id: `source-themealdb-${record.id}`,
    type: "themealdb",
    url: record.mealDbUrl,
    title: record.name,
    author: "TheMealDB",
    retrievedAt: new Date().toISOString(),
    licenseNote: "TheMealDB public recipe database. Verify source attribution before production use.",
    external: {
      provider: "themealdb",
      id: record.id,
      apiUrl: record.apiUrl,
      pageUrl: record.mealDbUrl,
      sourceUrl: record.sourceUrl,
      imageUrl: record.thumbnailUrl,
      category: record.category,
      area: record.area,
    },
  };
}

function parseIngredient(ingredient: string, measure: string | undefined): IngredientLine {
  const raw = [measure, ingredient].filter(Boolean).join(" ");
  const quantityMatch = measure?.match(/^([0-9]+(?:[./][0-9]+)?|[0-9]*\.[0-9]+|[¼½¾⅓⅔⅛⅜⅝⅞]+)/);
  const unitMatch = measure?.replace(quantityMatch?.[0] ?? "", "").trim().match(/^([a-zA-Z]+)/);
  return {
    id: createId("ing"),
    raw,
    language: "en",
    quantity: quantityMatch?.[0],
    unit: unitMatch?.[1],
    item: ingredient,
    normalized: {
      quantityValue: quantityMatch ? numericQuantity(quantityMatch[0]) : undefined,
      unit: unitMatch?.[1],
      unitSystem: unitSystem(unitMatch?.[1]),
      ingredientKey: ingredient.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    },
    conversion: {
      confidence: "unknown",
    },
  };
}

function parseInstructionSteps(instructions: string): InstructionStep[] {
  return instructions
    .split(/\r?\n{2,}|\r?\n(?=step\s+\d+\b)|(?<=\.)\s+(?=(?:Preheat|Heat|Add|Mix|Stir|Cook|Bake|Serve|Remove|Place|Put|Pour|Season|Transfer)\b)/i)
    .map((line) => line.trim().replace(/^step\s+\d+\s*/i, ""))
    .filter((line) => line.length > 8)
    .slice(0, 24)
    .map((text, index) => ({
      id: createId("step"),
      position: index + 1,
      text,
      language: "en",
      timerSeconds: parseTimerSeconds(text),
      temperature: parseTemperature(text),
    }));
}

function parseTimerSeconds(text: string): number | undefined {
  const match = text.match(/\b(\d+)\s*(?:-|to)?\s*(\d+)?\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (!match) return undefined;
  const value = Number(match[2] ?? match[1]);
  const unit = match[3].toLowerCase();
  return unit.startsWith("hour") || unit.startsWith("hr") ? value * 3600 : value * 60;
}

function parseTemperature(text: string): InstructionStep["temperature"] {
  const celsius = text.match(/\b(\d{2,3})\s*C\b/i);
  if (celsius) return { value: Number(celsius[1]), unit: "c", raw: celsius[0] };
  const fahrenheit = text.match(/\b(\d{3})\s*F\b/i);
  if (fahrenheit) return { value: Number(fahrenheit[1]), unit: "f", raw: fahrenheit[0] };
  return undefined;
}

function numericQuantity(value: string): number | undefined {
  const vulgarFractions: Record<string, number> = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
  };
  if (vulgarFractions[value] !== undefined) return vulgarFractions[value];
  if (value.includes("/")) {
    const [left, right] = value.split("/").map(Number);
    return right ? left / right : undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function unitSystem(unit: string | undefined): NonNullable<IngredientLine["normalized"]>["unitSystem"] {
  if (!unit) return "unknown";
  const normalized = unit.toLowerCase();
  if (["g", "kg", "ml", "l"].includes(normalized)) return "metric";
  if (["tsp", "tbsp", "cup", "cups", "oz", "lb", "lbs"].includes(normalized)) return "us";
  return "unknown";
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
