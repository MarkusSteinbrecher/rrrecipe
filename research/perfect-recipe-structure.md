# Perfect Recipe Structure Reference

Source image: `research/Writing the prefect recipe.jpg`

This note captures the recipe-writing structure from the reference image and
translates it into guidance for rrrecipe baseline recipes, imported recipes, and
future recipe-normalization work.

## Core Structure

Every normalized recipe should be easy to scan while cooking. The minimum useful
reader-facing structure is:

1. Title
2. Short introduction
3. Ingredients
4. Measurements
5. Directions
6. Tips and substitutions
7. Optional glossary or clarification notes
8. Optional visuals

## Title And Introduction

Start with a clear recipe title and a brief introduction. The introduction should
explain what the recipe is, why it is useful, and any essential context, but it
should not delay the cook from reaching the actionable recipe.

For rrrecipe:

- Keep `RecipeVersion.title` concise and canonical.
- Keep `RecipeVersion.description` short enough to scan.
- Avoid long blog-style introductions in baseline recipes.
- Imported recipes may preserve long source text separately, but the normalized
  recipe should use a concise summary.

## Ingredients

Ingredients should be listed in order of use. If a recipe has multiple parts,
ingredients should be grouped under subheads so the cook can understand the
information hierarchy.

For rrrecipe:

- Preserve ingredient order as a cooking sequence, not alphabetically.
- Use ingredient groups for compound recipes, such as dough, sauce, filling,
  garnish, topping, or dressing.
- Include ingredient state when it matters, such as melted butter, diced onion,
  rinsed rice, or room-temperature eggs.
- Prefer parsed ingredient fields, but always preserve the original raw line.
- Add image references for ingredients only when they clarify unfamiliar items.

## Measurements

Measurements should be explicit, consistent, and easy to convert. The reference
recommends spelling out units instead of relying only on abbreviations.

For rrrecipe:

- Store structured quantity and unit fields where possible.
- Preserve raw measurement text for source fidelity.
- Normalize common abbreviations during import, such as tablespoon, teaspoon,
  gram, kilogram, milliliter, liter, ounce, pound, cup, and pinch.
- Support unit conversion, but keep the source measurement available.
- Add conversion notes only where the conversion affects outcome or ambiguity.

## Directions

Directions should be numbered step by step so users can keep their place while
cooking. Each step should use precise, clear language and avoid large paragraphs.
Complex terms should be explained directly or in a short glossary.

For rrrecipe:

- Each `InstructionStep` should represent one meaningful cooking action or small
  cluster of tightly related actions.
- Steps should have stable positions for navigation and video linking.
- Capture timers, temperatures, target cues, and equipment requirements inside
  the relevant step when possible.
- Avoid overlong instruction paragraphs; split steps when a user would naturally
  pause, wait, or move to a new technique.
- Add glossary notes for specialized baking or cooking terms.

## Tips And Substitutions

Recipes should include practical tips for substitutions, dietary preferences,
and scaling.

For rrrecipe:

- Store substitution notes separately from the main directions.
- Include dietary substitutions when common, such as dairy-free, gluten-free,
  vegetarian, vegan, nut-free, or alcohol-free alternatives.
- Include scaling notes, especially where halving or doubling changes pan size,
  cook time, proofing behavior, or seasoning balance.
- Keep these notes attached to the recipe or relevant ingredient/step instead of
  mixing them into the core instructions.

## Visuals

The reference recommends visualizing information where possible because readers
respond better to visual support.

For rrrecipe:

- Prefer actual dish, ingredient, or technique images over decorative images.
- Link imported videos and images to specific steps when the source supports it.
- For baseline recipes, images are optional but should be structured as recipe,
  ingredient, or step media rather than free-form decoration.
- Use visuals to clarify state changes: dough texture, browning level, sauce
  thickness, knife cuts, assembly order, and finished plating.

## Data Model Implications

The current rrrecipe data model should continue to treat the recipe as structured
workflow data rather than article content.

Useful fields to preserve or add:

- `title`: concise canonical recipe name.
- `description`: short reader-facing summary.
- `yield`: quantity and unit.
- `times`: prep, cook, and total time.
- `ingredients`: ordered lines with raw text, quantity, unit, item, and optional
  group/state.
- `steps`: ordered instructions with timer, temperature, equipment, cues, media,
  and source references where available.
- `tips`: substitutions, scaling notes, troubleshooting, and dietary variants.
- `glossary`: short definitions for uncommon techniques or terms.
- `media`: recipe-level, ingredient-level, and step-level references.
- `sources`: baseline, YouTube, TheMealDB, web page, cookbook, or manual source
  attribution.

## Baseline Catalogue Standard

Baseline recipes should follow this checklist:

- One canonical title.
- One short description.
- Ingredients ordered by use.
- Ingredient groups for multi-part recipes.
- Measurements normalized and parseable.
- Numbered steps with clear action boundaries.
- Timers, temperatures, and doneness cues captured in steps.
- Common substitutions and scaling notes captured as tips.
- Source metadata attached even for manually authored baseline entries.

## Import Normalization Standard

Imported recipes should be normalized into the same structure:

- Strip long non-recipe prose from the normalized recipe description.
- Keep original source text in source/evidence data when needed.
- Parse ingredients into structured fields while preserving raw lines.
- Split instructions into navigable steps.
- Extract timers, temperatures, equipment, and visual cues.
- Attach video timestamps, images, or source URLs to the relevant step where
  possible.
- Preserve attribution and source confidence.
