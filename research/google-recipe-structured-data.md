# Google Recipe Structured Data Research

Source: https://developers.google.com/search/docs/appearance/structured-data/recipe

Google Search Central documents the Google-specific subset of Schema.org recipe
markup that can make recipe pages eligible for rich results in Google Search and
Google Images. This is separate from the broader Schema.org `Recipe` vocabulary:
Schema.org describes the general model, while this Google page describes what
Google currently supports and validates for search appearance.

Source page last observed: 2026-05-05  
Google page last updated: 2025-12-10 UTC

## Why This Matters

If rrrecipe eventually publishes public recipe pages, baseline recipe pages, or
recipe collection pages, this source will matter for:

- Search result eligibility.
- Google Images recipe badges.
- Recipe gallery or host carousel eligibility.
- Step-level deep links from search results.
- Validation through Google's Rich Results Test and Search Console.

## Google-Specific Requirements

Google says recipe rich-result eligibility depends on required properties and
structured-data guidelines.

For `Recipe`, the core required properties are:

- `name`: the dish name.
- `image`: image of the completed dish.

Image guidance is important:

- Images must be crawlable and indexable.
- Images must represent the marked-up recipe.
- Images must use Google-supported image formats.
- Google recommends multiple high-resolution images in `16x9`, `4x3`, and `1x1`
  aspect ratios.

Implication for rrrecipe:

- Our current `imageIds` field is not enough for search export unless it can
  resolve to crawlable public URLs.
- Baseline recipes need a finished-dish image before they can be strong public
  search pages.
- Imported source thumbnails are useful for UI context, but we should verify
  whether they are legally and technically suitable for public structured data.

## Recommended Recipe Properties

Google recommends including richer metadata where available:

- `author`
- `datePublished`
- `description`
- `keywords`
- `prepTime`
- `cookTime`
- `totalTime`
- `recipeCategory`
- `recipeCuisine`
- `recipeIngredient`
- `recipeInstructions`
- `recipeYield`
- `nutrition.calories`
- `aggregateRating`
- `video`

Implication for rrrecipe:

- Our existing `RecipeVersion.description`, `yield`, `times`, `ingredients`,
  `steps`, `tags`, and source attribution already map well to Google export.
- We should distinguish `recipeCategory`, `recipeCuisine`, and `keywords`
  instead of treating all tags as one flat bucket.
- We should add or derive publish/update dates if pages become public.
- Nutrition and ratings should remain optional; adding fake or inferred ratings
  would be harmful.

## Ingredient Guidance

Google expects `recipeIngredient` to contain only ingredient text needed to make
the recipe.

Implication for rrrecipe:

- Preserve `IngredientLine.raw` for export.
- Keep definitions, shopping notes, and substitutions out of exported
  `recipeIngredient`.
- Continue parsing quantities and units internally, but export clean human
  ingredient lines.

## Instruction Guidance

Google recommends using `HowToStep` for `recipeInstructions`. `HowToSection` can
be used when a recipe has real instruction sections, such as dough, filling, or
assembly.

Google's step guidance matters for our current page model:

- Step text should contain only the instruction itself.
- Do not include labels like "Step 1", "Directions", or "Watch the video" inside
  the structured step text.
- Step `name` should be a short descriptive phrase, not a numbered label.
- Step `url` can point to a fragment anchor for that step.
- Step `image` can represent that exact step.
- Step `video` can reference a `VideoObject` or `Clip` for that step.

Implication for rrrecipe:

- Our `InstructionStep.position` is UI/navigation metadata; export should not
  include it inside `HowToStep.text`.
- Our detail page should use stable section/step anchors if we want Google
  step-level links later.
- Existing YouTube timestamp anchors can map well to step-level video clips,
  but only if the public page also has valid video structured data.
- The current `shop`, `prep`, `cook`, and `overview` UI sections should not be
  exported blindly as `HowToSection`. Only actual cooking-method groups should
  become `HowToSection`.

## Recipe Collections And Carousels

Google supports recipe host carousel eligibility through `ItemList` structured
data on list/gallery pages. The list items need positions and canonical URLs.

Implication for rrrecipe:

- Baseline catalogue pages could later expose `ItemList` markup.
- Source/group/filter pages should have canonical URLs before we attempt
  carousel markup.
- A list page should point to individual recipe pages, not just in-app state.

## Validation And Release Process

Google recommends this release flow:

- Add required properties.
- Follow structured-data guidelines.
- Validate with the Rich Results Test.
- Deploy a small number of pages first.
- Use URL Inspection to confirm Google can access the pages.
- Submit or update sitemaps.
- Monitor Search Console rich-result reports.

Implication for rrrecipe:

- Add an export/preview test that produces JSON-LD from a `RecipeVersion`.
- Add fixture recipes for baseline, imported web, imported YouTube, and
  TheMealDB-backed recipes.
- Validate generated JSON-LD before publishing public recipe pages.
- Treat Search Console feedback as a backlog source for improving the public
  recipe data model.

## Mapping To rrrecipe

| Google property | rrrecipe source | Notes |
| --- | --- | --- |
| `name` | `RecipeVersion.title` | Required for Google rich result eligibility. |
| `image` | `RecipeVersion.imageIds`, source image metadata | Must become crawlable public URLs. |
| `description` | `RecipeVersion.description` | Keep concise. |
| `prepTime` | `RecipeVersion.times.prepMinutes` | Export as ISO 8601 duration. |
| `cookTime` | `RecipeVersion.times.cookMinutes` | Export as ISO 8601 duration. |
| `totalTime` | `RecipeVersion.times.totalMinutes` | Export as ISO 8601 duration. |
| `recipeYield` | `RecipeVersion.yield` | Export both numeric servings and raw yield when useful. |
| `recipeIngredient` | `IngredientLine.raw` | Export clean ingredient text only. |
| `recipeInstructions` | `InstructionStep[]` | Prefer `HowToStep`; use `HowToSection` only for real method sections. |
| `recipeCategory` | category/tag metadata | Needs a stronger field than generic tags. |
| `recipeCuisine` | cuisine/tag metadata | Needs a stronger field than generic tags. |
| `keywords` | remaining tags/collections | Do not duplicate category or cuisine here. |
| `video` | YouTube source metadata, step media anchors | Needs valid `VideoObject` or `Clip` export. |
| `author` | source author or rrrecipe baseline author | Needed for public attribution. |
| `datePublished` | source date or publish date | Needed if pages are public. |

## Product Backlog Ideas

- Add a `recipeSeoMetadata` or export-only mapper for Google JSON-LD.
- Add first-class `category`, `cuisine`, and `keywords` fields instead of using
  only flat tags.
- Add public media asset handling for completed-dish images with required aspect
  ratios.
- Add stable public URLs and step anchors for recipe pages.
- Add JSON-LD snapshot tests for representative recipes.
- Add a Rich Results Test checklist to the release workflow.
- Add `ItemList` JSON-LD for baseline catalogue pages once public URLs exist.
