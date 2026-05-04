# Recipe Versioning

## Goal

Users should be able to adjust a recipe, keep the original, compare changes, and
branch into variants such as "less sugar", "vegan", "double batch", or
"air-fryer version".

This should feel lightweight in the UI, but the data model should behave more
like version control than a single mutable document.

## Core Concepts

### Recipe

The stable identity of the recipe.

- `id`
- `currentVersionId`
- `defaultVariantId`
- `createdAt`
- `updatedAt`
- `archivedAt`

### RecipeVersion

An immutable snapshot of a recipe at a point in time.

- `id`
- `recipeId`
- `parentVersionId`
- `variantId`
- `title`
- `language`
- `description`
- `yield`
- `times`
- `ingredients`
- `steps`
- `notes`
- `tags`
- `sourceIds`
- `imageIds`
- `changeSummary`
- `createdAt`
- `createdBy`
- `origin`: `import`, `manual_edit`, `translation`, `scaled`, `forked_variant`

Once created, a `RecipeVersion` should not be edited. A new edit creates a new
version.

### RecipeVariant

A named branch of a recipe.

- `id`
- `recipeId`
- `name`
- `baseVersionId`
- `currentVersionId`
- `description`
- `createdAt`

Examples:

- Original
- Weeknight version
- Vegan
- Gluten-free
- Larger batch
- Tested 2026

### RecipeDraft

A temporary mutable edit buffer.

- `id`
- `recipeId`
- `baseVersionId`
- `variantId`
- `content`
- `updatedAt`

Drafts are local until saved. Saving a draft creates a new immutable
`RecipeVersion`.

## Why Not Store Only Diffs?

Full snapshots are simpler for v1:

- easier offline rendering,
- easier export/import,
- easier iOS parity,
- fewer migration risks,
- simpler conflict recovery.

We can compute diffs on demand for compare views. If storage becomes a real
problem later, we can add patch compression internally without changing the UI
model.

## Version Tree

Each version has a `parentVersionId`, so history forms a tree:

```text
Imported original
  -> edited after first cook
      -> less sugar variant
      -> metric-tested variant
  -> translated to German
```

The UI does not need to expose this as "git". It can show:

- History
- Compare
- Restore
- Save as variant
- Merge manually by copying useful parts

## Versioned Fields

Version these fields:

- title
- subtitle/description
- yield
- times
- ingredients
- steps
- notes
- tags
- images selected for the recipe
- source references
- language

Do not version these as recipe content:

- app language
- measurement display preference
- current search filters
- last opened/cooked timestamp
- local UI state

## Imports And Versions

The first import creates:

- a `Source`
- an `ImportJob`
- a `Recipe`
- an initial `RecipeVersion` with `origin: import`
- a default `RecipeVariant` named `Original`

If the same source is re-imported later, create a candidate version instead of
silently replacing the existing recipe. The user can compare and accept changes.

## Scaling And Conversion

Changing display units does not create a version.

Scaling can be either temporary or saved:

- Temporary scaling: render-only, no version.
- Saved scaling: create a new version or variant, e.g. "Double batch".

Unit corrections made by the user should create a new version if they change the
recipe's saved structured fields.

## Translation

Machine translations are separate records by default, not recipe versions.

If a user edits a translated recipe as its own cookable recipe, save that as a
new version or variant with `origin: translation`.

## Sync And Conflict Handling

The version model gives us a clean sync story later:

- Each client edits from a known `baseVersionId`.
- Saving creates a new child version.
- If two devices save from the same base, both versions can exist.
- The app can ask the user which version should be current.

This avoids destructive last-write-wins behavior.

## MVP UI

Minimum useful versioning UI:

- Save edits as a new version.
- Add a short change note.
- View version history.
- Restore an older version as current.
- Save current version as a named variant.

Later:

- Visual diff for ingredients and steps.
- Compare two variants side by side.
- Mark versions as tested/favorite.
- Merge selected ingredient/step changes from another version.

