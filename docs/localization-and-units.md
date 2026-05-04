# Localization And Units

## What To Define Now

We do not need a complete conversion engine for v1, but the data model should
make one easy to add.

Define these rules now:

- Preserve original recipe text permanently.
- Parse ingredients and temperatures into optional structured fields.
- Store user display preferences separately from recipe data.
- Treat unit conversion as a rendering layer.
- Treat translation as an additional layer, not a destructive rewrite.

## Measurement Display

Supported display modes:

- `original`: show the recipe as imported or entered.
- `metric`: prefer grams, milliliters, Celsius.
- `us`: prefer cups, teaspoons, tablespoons, ounces, Fahrenheit.
- `hybrid`: metric weights and temperatures, but keep practical spoon units.

Exact conversions are safe for unit families:

- mass: grams, kilograms, ounces, pounds
- volume: milliliters, liters, teaspoons, tablespoons, fluid ounces
- temperature: Celsius, Fahrenheit

Approximate conversions need ingredient density:

- cup flour to grams
- cup sugar to grams
- cup honey to grams
- cup chopped herbs to grams

Unknown conversions should fall back to the original ingredient line.

## Density Table

Start with a small curated table:

- all-purpose flour
- bread flour
- sugar
- brown sugar
- powdered sugar
- butter
- milk
- water
- olive oil
- honey
- rice
- oats
- cocoa powder

Each entry should include:

- canonical ingredient key
- aliases per language
- grams per US cup
- grams per metric cup where known
- confidence/source note

## Language Support

There are two language layers:

- UI language: menus, settings, buttons, empty states.
- Recipe content language: imported title, ingredients, steps, notes.

For v1, plan for English and German UI. Recipe import should preserve any source
language and mark the detected language where possible.

Recipe translations should be optional records. A user can view the original,
machine translation, or edited translation.

## Import Requirements

Importers should return:

- source language when detected
- original ingredient and step text
- parsed units and quantities where confident
- warnings for ambiguous units such as `cup`, `stick`, `can`, `packet`, `glass`
- no destructive conversion during import

## UI Requirements

The recipe screen should be able to switch display mode without editing the
saved recipe. Ingredient lines can show both forms when useful:

```text
1 cup all-purpose flour
120 g approx.
```

The editor should allow users to correct parsed units or conversion results
without changing the original source line.

