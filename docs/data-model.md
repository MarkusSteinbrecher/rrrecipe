# Data Model

## Core Entities

Related research: [`research/schema-org-recipe.md`](../research/schema-org-recipe.md)

Canonical recipe data lives in repository files. The current MVP source file is
`src/data/app-snapshot.json`, which contains an `AppSnapshot` with recipes,
versions, variants, sources, and default settings.

Baseline catalogue recipes live in `src/data/baseline-catalog.ts`. They use the
same `Recipe`, `RecipeVersion`, `RecipeVariant`, `Source`, `IngredientLine`, and
`InstructionStep` shapes as user/imported recipes, but are marked with the
`baseline` tag and grouped through `collections` such as `Baking`, `Cooking`,
`Pasta`, `Bread`, `Soup`, and `Vegetarian`.

Baseline catalogue planning and promotion state lives in
`data/baseline-recipes/backlog.json`. It tracks common recipe identities under a
virtual `baseline-common-recipes` channel, with items moving from `backlog` to
`drafted` to `promoted` as they become stable records in
`src/data/baseline-catalog.ts`.

TheMealDB is tracked as a separate external source in
`data/themealdb-recipes/catalog.json`. Its records can be loaded as import drafts
and saved as recipes with `Source.type = "themealdb"`. The `Source.external`
object stores the MealDB id, API URL, page URL, original source URL, image URL,
category, and area.

At runtime the browser copies that snapshot into IndexedDB. User edits are saved
there as local working state until we add an explicit file import/export or dev
write-back workflow.

When the app loads, it adds any missing baseline catalogue records into the
IndexedDB snapshot without replacing existing user edits or imported YouTube
recipes.

YouTube imports should remain separate recipe records unless the user chooses to
save them as an edit or variant. Future YouTube matching can store a reference to
the stable baseline recipe id, for example `recipe-baseline-focaccia`, while
leaving unmatched videos unlinked.

### Recipe

- `id`
- `currentVersionId`
- `defaultVariantId`
- `createdAt`
- `updatedAt`
- `archivedAt`

Recipe is the stable identity. Recipe content lives in immutable
`RecipeVersion` records so users can preserve history and variants.

### RecipeVersion

- `id`
- `recipeId`
- `parentVersionId`
- `variantId`
- `title`
- `language`
- `subtitle`
- `description`
- `sourceIds`
- `imageIds`
- `yield`
- `times`
- `ingredients`
- `steps`
- `notes`
- `tags`
- `collections`
- `changeSummary`
- `origin`: `import`, `manual_edit`, `translation`, `scaled`, `forked_variant`
- `createdAt`
- `createdBy`

Once saved, versions are immutable. Editing creates a new version.

Recipe text should preserve the imported or manually entered original language.
Translations are stored separately so changing display language never destroys
the source recipe.

### RecipeVariant

- `id`
- `recipeId`
- `name`
- `baseVersionId`
- `currentVersionId`
- `description`
- `createdAt`

Variants are named branches such as `Original`, `Vegan`, `Less sugar`, or
`Double batch`.

### RecipeDraft

- `id`
- `recipeId`
- `baseVersionId`
- `variantId`
- `content`
- `updatedAt`

Drafts are temporary mutable edit buffers. Saving a draft creates a new
immutable `RecipeVersion`.

### Source

- `id`
- `type`: `web`, `youtube`, `themealdb`, `text`, `pdf`, `image`, `manual`
- `url`
- `title`
- `author`
- `publishedAt`
- `retrievedAt`
- `licenseNote`
- `external`
- `rawTextRef`
- `media`

For video sources, `media` can hold:

- `provider`: `youtube`
- `videoId`
- `channelId`
- `channelTitle`
- `channelHandle`
- `channelUrl`
- `durationSeconds`
- `thumbnailUrl`
- `canonicalUrl`

### IngredientLine

- `id`
- `section`
- `raw`
- `language`
- `quantity`
- `unit`
- `item`
- `preparation`
- `optional`
- `normalized`
- `conversion`

Keep `raw` permanently. Parsed quantity/unit/item are conveniences and will be
wrong sometimes.

`normalized` is the app's best structured representation for conversion and
scaling. Example fields:

- `quantityValue`
- `quantityMin`
- `quantityMax`
- `unit`
- `unitSystem`: `metric`, `us`, `imperial`, `count`, `unknown`
- `ingredientKey`

`conversion` records whether we can safely convert the line:

- `confidence`: `exact`, `approximate`, `unknown`
- `canonicalGrams`
- `canonicalMilliliters`
- `canonicalCount`
- `notes`

Volume-to-weight conversion must be ingredient-aware. `1 cup flour` and
`1 cup honey` should not use the same gram value.

### InstructionStep

- `id`
- `section`
- `position`
- `text`
- `language`
- `timerSeconds`
- `mediaAnchors`
- `temperature`
- `ingredientRefs`
- `mediaRefs`

Temperatures should be parsed into a structured value when possible, but the
original text remains canonical.

`mediaAnchors` links a recipe step to one or more source media timestamps:

- `sourceId`
- `startSeconds`
- `endSeconds`
- `label`
- `confidence`: `manual`, `imported`, `estimated`

This supports "jump to this step in the YouTube video" without making YouTube a
special case in the step model.

### ImportJob

- `id`
- `sourceType`
- `input`
- `status`: `queued`, `fetching`, `extracting`, `needs_review`, `saved`,
  `failed`
- `candidate`
- `errors`
- `createdAt`
- `updatedAt`

### YouTubeBacklogVideo.sourcePages

Local YouTube ingestion stores linked recipe page extraction separately from
transcripts and candidates:

- `status`: `not_started`, `found`, `retrieved`, `unavailable`, `failed`
- `pages[]`
- `pages[].url`
- `pages[].title`
- `pages[].siteName`
- `pages[].status`
- `pages[].localPath`
- `pages[].ingredientCount`
- `pages[].stepCount`
- `updatedAt`

Parsed page records live in:

```text
data/youtube-recipes/source-pages/VIDEO_ID/PAGE_SLUG.json
```

## MVP Search Fields

- title
- ingredient raw text
- tags
- source author/channel
- notes

## User Settings

Settings affect display, not saved recipe data:

- `appLanguage`: UI language, e.g. `en`, `de`, `de-CH`
- `recipeLanguageMode`: `original`, `translated`, or a target locale
- `measurementSystem`: `original`, `metric`, `us`, `hybrid`
- `temperatureUnit`: `c`, `f`, `original`
- `theme`: `dark`, `light`
- `numberLocale`: e.g. `en-US`, `de-CH`
- `cookingMode`: readback, video auto-seek, and command-input preferences

The app can render the same saved recipe differently depending on these
settings.

## Translations

Store translations as additional records keyed by recipe field and locale:

- `id`
- `recipeId`
- `locale`
- `field`: `title`, `description`, `ingredient`, `step`, `note`
- `targetId`
- `text`
- `provider`
- `model`
- `reviewStatus`: `machine`, `reviewed`, `edited`

This keeps UI translation, recipe translation, and measurement conversion as
separate concerns.

## Later Search Fields

- cuisine
- diet labels
- total time
- season
- "cook this week" / meal-plan status
- pantry match

## Versioning

Recipe edits should be append-only:

- Preserve source candidate separately from the saved recipe.
- Store each saved edit as a new immutable `RecipeVersion`.
- Use `parentVersionId` to support history, variants, and future sync conflicts.
- See [versioning.md](versioning.md).
