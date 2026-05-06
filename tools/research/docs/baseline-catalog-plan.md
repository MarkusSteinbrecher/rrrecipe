# Baseline Catalogue Plan

## Goal

Create a broad baseline recipe catalogue that covers the common recipe identities
people expect to find or import: everyday cooking, baking, common restaurant
dishes, major home-cooking classics, and common global staples.

The catalogue is not meant to copy a chef's signature recipe. It is a stable
matching layer: YouTube imports, web imports, and manual entries can point to a
baseline recipe identity when they are recognizably the same dish.

## Definition of Common

A recipe belongs in the baseline catalogue when most of these are true:

- The dish name is widely recognized outside a single restaurant, chef, or viral
  video.
- The dish has many independent examples across cookbooks, websites, videos, or
  household cooking.
- The ingredient and technique envelope is stable enough to define a useful
  reference recipe.
- A user would reasonably search for it by name.

Examples: focaccia, spaghetti carbonara, lasagne, roast chicken, fried rice,
banana bread, hummus.

Non-goals: chef signature dishes, branded restaurant recreations, obscure
hyperlocal specialties, and one-off viral variants. Those can still exist as
imports and may remain unlinked.

## Backlog

The baseline backlog lives in:

```text
data/baseline-recipes/backlog.json
```

It uses a channel-style structure so baseline work can appear next to import
workflows conceptually:

- `channels[]`: source queues, currently `baseline-common-recipes`.
- `items[]`: recipe identities to draft, review, promote, or defer.
- `status`: `backlog`, `drafted`, `promoted`, or `deferred`.
- `baselineRecipeId`: populated once an item has a stable recipe in
  `src/data/baseline-catalog.ts`.

## Coverage Strategy

Build the catalogue in passes, not alphabetically.

1. High-frequency matching targets:
   pasta, bread, pizza, chicken, soup, breakfast, desserts, salads, rice/noodles,
   curries, tacos, and common side dishes.
2. Cuisine anchors:
   Italian, American, French, Mexican, Indian, Chinese, Japanese, Korean, Thai,
   Middle Eastern, Spanish, Greek, British, and broadly Mediterranean dishes.
3. Technique families:
   roast, braise, stew, stir fry, soup, salad, casserole, flatbread, yeasted
   bread, quick bread, cake, cookie, custard, sauce.
4. Variant splits:
   Keep one baseline where variants are minor. Split when users would search for
   distinct recipes, such as ramen styles, pizza styles, curry styles, or bread
   types.

## Data Sources

Use public/open sources for discovery and cross-checking names, not for copying
recipe prose:

- Wikidata and Wikipedia category/list pages for dish discovery.
- Wikibooks Cookbook for open recipe references where license compatibility is
  acceptable and attribution is captured.
- Public-domain or permissively licensed government/extension recipe material
  for basic techniques.
- Our own YouTube/web import backlog as demand signals.

Baseline recipe instructions should be newly written in the app's own concise
style unless a source license is explicitly compatible and attribution is stored
in `Source`.

## Promotion Workflow

For each backlog item:

1. Confirm it is common and not a duplicate of an existing baseline.
2. Decide whether it is a standalone baseline or a variant under another
   baseline.
3. Draft a concise recipe using the existing `RecipeVersion` structure:
   ingredients, steps, times, yield, tags, collections.
4. Set source to manual/common-knowledge unless using an explicit open source.
5. Add stable IDs:
   `recipe-baseline-SLUG`, `variant-baseline-SLUG-original`,
   `version-baseline-SLUG-v1`.
6. Mark the backlog item as `drafted`.
7. Review for ingredient completeness, sensible timers, category tags, and
   duplicate coverage.
8. Mark it `promoted` and set `baselineRecipeId`.

## Matching Workflow

When importing from YouTube or the web:

1. Extract a recipe candidate as usual.
2. Normalize title, aliases, tags, key ingredients, and technique signals.
3. Compare against baseline backlog and promoted baseline recipes.
4. If confidence is high, store a link to the baseline recipe id.
5. If confidence is medium, present suggested links for review.
6. If no match is found, leave it unlinked and optionally create a baseline
   backlog item if the dish appears common.

## Initial Coverage Metrics

Track coverage with simple counts first:

- promoted baseline recipes,
- backlog items by priority,
- backlog items by category,
- unmatched imports that appear common,
- duplicate or deferred identities.

Once the catalogue is large, add aliases and ingredient-key matching so
`spag bol`, `bolognese`, and `ragu alla bolognese` point to the same identity.
