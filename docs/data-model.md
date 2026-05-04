# Data Model

## Core Entities

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
- `type`: `web`, `youtube`, `text`, `pdf`, `image`, `manual`
- `url`
- `title`
- `author`
- `publishedAt`
- `retrievedAt`
- `licenseNote`
- `rawTextRef`
- `media`

For video sources, `media` can hold:

- `provider`: `youtube`
- `videoId`
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
