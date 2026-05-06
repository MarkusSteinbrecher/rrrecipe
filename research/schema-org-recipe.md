# Schema.org Recipe Research

Date: 2026-05-05

Source:

- https://schema.org/Recipe
- https://schema.org/NutritionInformation
- https://schema.org/HowToStep
- https://schema.org/HowToSection
- https://schema.org/HowToSupply
- https://schema.org/HowToTool

## Summary

Schema.org `Recipe` is useful as an import/export compatibility layer, not as a
replacement for our internal model.

Our current model is already close to the important pieces:

- `RecipeVersion.title` maps to Schema.org `name`.
- `RecipeVersion.description` maps to `description`.
- `RecipeVersion.yield` maps to `recipeYield`.
- `RecipeVersion.times.prepMinutes`, `cookMinutes`, and `totalMinutes` map to
  `prepTime`, `cookTime`, and `totalTime`.
- `RecipeVersion.ingredients[].raw` maps to `recipeIngredient`.
- `RecipeVersion.steps[]` maps to `recipeInstructions` as `HowToStep` or
  `HowToSection`.
- `RecipeVersion.tags` and `collections` partially map to `keywords`,
  `recipeCategory`, and `recipeCuisine`.
- `Source.author`, `Source.url`, and `Source.retrievedAt` partially map to
  CreativeWork fields such as `author`, `url`, and date fields.

The main gaps are:

- Explicit cuisine/category fields.
- Nutrition.
- Tools and non-ingredient supplies.
- Raw Schema.org source preservation.
- Stronger external identifiers and source page metadata.
- Better structured step sections.

## Useful Schema.org Fields

### Recipe

Schema.org `Recipe` extends `HowTo`. It defines recipe-specific properties:

- `cookTime`
- `cookingMethod`
- `nutrition`
- `recipeCategory`
- `recipeCuisine`
- `recipeIngredient`
- `recipeInstructions`
- `recipeYield`
- `suitableForDiet`

It also inherits useful `HowTo` fields:

- `prepTime`
- `performTime`
- `totalTime`
- `step`
- `supply`
- `tool`
- `yield`
- `estimatedCost`

And useful `CreativeWork`/`Thing` fields:

- `name`
- `description`
- `image`
- `author`
- `publisher`
- `datePublished`
- `dateModified`
- `keywords`
- `license`
- `isBasedOn`
- `sameAs`
- `url`
- `identifier`
- `aggregateRating`

## Recommended Internal Additions

These are worth adding to our model when we next revise `RecipeVersion` and
`Source`.

### RecipeVersion.metadata

Add a structured metadata object:

```ts
type RecipeMetadata = {
  category?: string;
  cuisine?: string;
  cookingMethods?: string[];
  suitableForDiet?: string[];
  keywords?: string[];
  difficulty?: "easy" | "medium" | "hard" | string;
  estimatedCost?: string;
};
```

Reason:

- `tags` and `collections` are useful UI primitives, but they mix category,
  cuisine, dietary labels, workflow labels, and arbitrary tags.
- Schema.org separates `recipeCategory`, `recipeCuisine`,
  `cookingMethod`, `suitableForDiet`, and `keywords`.
- Matching YouTube/web imports to baseline recipes will be easier if cuisine and
  category are first-class fields.

### RecipeVersion.nutrition

Add optional nutrition:

```ts
type NutritionFacts = {
  servingSize?: string;
  calories?: string;
  carbohydrateContent?: string;
  cholesterolContent?: string;
  fatContent?: string;
  fiberContent?: string;
  proteinContent?: string;
  saturatedFatContent?: string;
  sodiumContent?: string;
  sugarContent?: string;
  transFatContent?: string;
  unsaturatedFatContent?: string;
  sourceId?: string;
  confidence?: "imported" | "estimated" | "unknown";
};
```

Reason:

- Schema.org `NutritionInformation` has a pragmatic recipe-oriented field set.
- We should store imported nutrition separately from calculated nutrition.
- Nutrition should always carry source/confidence because calculation quality can
  vary substantially.

### RecipeVersion.tools And Supplies

Add optional tools/supplies:

```ts
type RecipeEquipment = {
  id: string;
  raw: string;
  item?: string;
  quantity?: string;
  optional?: boolean;
};

type RecipeSupply = {
  id: string;
  raw: string;
  item?: string;
  quantity?: string;
  optional?: boolean;
};
```

Reason:

- Schema.org distinguishes `tool` from `supply`.
- Our ingredients cover consumed food items, but not equipment such as Dutch
  oven, stand mixer, loaf pan, thermometer, blender, or baking steel.
- This will improve mise en place and cooking-mode prep.

### Source.schemaOrg

Preserve the raw and normalized Schema.org record on import:

```ts
type SourceSchemaOrg = {
  type: "Recipe";
  rawJsonLd?: unknown;
  normalized?: Record<string, unknown>;
  extractedAt: string;
  parserVersion: string;
};
```

Reason:

- Many recipe sites expose JSON-LD. We should not discard source data that our
  current model does not yet understand.
- Keeping raw JSON-LD makes importer debugging and future remapping easier.
- This is especially useful for fields we do not yet render, such as ratings,
  nutrition, publisher, license, and images.

### Source.external

We already started this for TheMealDB. Generalize it:

```ts
type ExternalSourceRef = {
  provider: "schema.org" | "themealdb" | "youtube" | string;
  id?: string;
  url?: string;
  apiUrl?: string;
  pageUrl?: string;
  sourceUrl?: string;
  sameAs?: string[];
};
```

Reason:

- Schema.org has `identifier`, `url`, and `sameAs`.
- TheMealDB and future sources need durable external references.
- Baseline matching should be able to say: this baseline recipe is equivalent
  to, derived from, or merely cross-referenced with an external source.

### InstructionStep Enhancements

Our `InstructionStep` already has `section`, `position`, `timerSeconds`,
`temperature`, ingredient references, and media anchors. Schema.org suggests
two additional ideas:

- Treat `HowToSection` as a first-class grouping when imported.
- Preserve the original step URL/image/video when present.

Possible addition:

```ts
type InstructionStep = {
  // existing fields...
  name?: string;
  url?: string;
  imageIds?: string[];
  sourceStepId?: string;
};
```

Reason:

- Some Schema.org recipes provide named steps or sectioned instructions.
- The `section` string is enough for display, but `sourceStepId` and `url` help
  trace imported JSON-LD back to the source.

## Mapping Table

| Schema.org | Current field | Recommendation |
| --- | --- | --- |
| `name` | `RecipeVersion.title` | Keep |
| `description` | `RecipeVersion.description` | Keep |
| `image` | `RecipeVersion.imageIds` | Keep, add imported image source metadata |
| `author` | `Source.author` | Keep |
| `recipeYield` | `RecipeVersion.yield` | Keep |
| `prepTime` | `times.prepMinutes` | Keep, parse ISO 8601 duration |
| `cookTime` | `times.cookMinutes` | Keep, parse ISO 8601 duration |
| `totalTime` | `times.totalMinutes` | Keep, parse ISO 8601 duration |
| `recipeIngredient` | `IngredientLine.raw` | Keep raw, parse into quantity/unit/item |
| `recipeInstructions` | `InstructionStep[]` | Keep, support `HowToSection` import |
| `recipeCategory` | `tags`/`collections` | Add `metadata.category` |
| `recipeCuisine` | `tags`/`collections` | Add `metadata.cuisine` |
| `cookingMethod` | `tags`/step text | Add `metadata.cookingMethods` |
| `suitableForDiet` | `tags` | Add `metadata.suitableForDiet` |
| `keywords` | `tags` | Keep tags, also store imported keywords |
| `nutrition` | none | Add `nutrition` |
| `tool` | none | Add equipment/tools |
| `supply` | ingredients-ish | Add supplies only for non-food consumables |
| `license` | `Source.licenseNote` | Keep note, add URL field later |
| `identifier`, `sameAs`, `url` | `Source.external` | Generalize external refs |
| raw JSON-LD | none | Add `Source.schemaOrg` |

## Importer Implications

For web imports, preferred order:

1. Extract JSON-LD blocks.
2. Find `@type: Recipe`, including arrays and graph nodes.
3. Store raw JSON-LD in `Source.schemaOrg.rawJsonLd`.
4. Normalize fields into `RecipeCandidate`.
5. Keep unhandled fields in `Source.schemaOrg.normalized`.
6. Require user review before saving.

For TheMealDB:

- It is not Schema.org JSON-LD, but many fields map cleanly to Schema.org-style
  concepts: name, category, area/cuisine, ingredients, instructions, image,
  source URL, and YouTube URL.
- Store TheMealDB fields in `Source.external`.
- Do not pretend TheMealDB is Schema.org; treat it as a separate provider.

For baseline recipes:

- Add `metadata.category` and `metadata.cuisine` before the catalogue grows much
  larger.
- Continue using `tags` for UI filtering.
- Use `sameAs`/external refs for cross-links to TheMealDB, Wikidata, Wikipedia,
  or other open references.

## Decision

Do not make the app's core model exactly Schema.org. The app needs local-first
editing, versioning, variants, source confidence, media anchors, timers, and
measurement parsing that Schema.org does not model deeply enough.

Do use Schema.org as:

- the primary web import target,
- a compatibility/export format,
- a checklist for missing fields,
- a source preservation format for raw JSON-LD.

Recommended next schema change:

1. Add `RecipeVersion.metadata`.
2. Add `RecipeVersion.nutrition`.
3. Add `RecipeVersion.tools`.
4. Add `Source.schemaOrg`.
5. Generalize `Source.external` beyond TheMealDB.
