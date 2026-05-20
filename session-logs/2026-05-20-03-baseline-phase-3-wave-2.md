# 2026-05-20 — Claude: Phase 3 wave 2 (batches 5-8, 26 recipes)

Phase 3 wave 2: four agent batches drafted in parallel. Local-only.

**Batch 5 — Stews & braises (6):**
Beef Chili (Tex-Mex ground-beef baseline), Beef Stew, Chicken Adobo
(vinegar non-stir), Pot Roast (3h oven braise), Boeuf Bourguignon
(separate garniture aromatique), Shepherd's Pie (lamb, with cottage-pie
distinction in notes).

**Batch 6 — Curries & Asian rice (8):**
Chicken Tikka Masala, Vegetable Curry, Butter Chicken, Thai Green Curry
(coconut-cream split technique), Fried Rice (day-old rice cue), Sushi Rice
(foundational technique), Kimchi Fried Rice (aged kimchi flagged), Bibimbap
(namul cooked separately, dolsot variation).

**Batch 7 — Asian noodles & stir-fry (6):**
Ramen (instant dashi baseline; long tonkotsu in notes), Pad Thai, Chow
Mein (HK crispy nest primary, Cantonese soft in notes), Teriyaki Chicken
(whole thigh, glazed pan-sear), Kung Pao Chicken (Sichuan mala),
Bulgogi.

**Batch 8 — Middle-Eastern + Gazpacho (6):**
Hummus (dried-chickpea baseline), Falafel (soaked-but-uncooked chickpea
cue), Baba Ghanoush (open-flame charred), Tabbouleh (parsley-forward
Lebanese, not bulgur-heavy Western), Chicken Shawarma, Gazpacho
(bread-emulsified Andalusian).

All 26 recipes meet the bar: sectioned ingredients, metric primary,
explicit fat/salt, 6–14 hands-on steps with technique cues,
ingredientRefs and timerSeconds where real, exactly 5 recipe-specific
notes.

Agent observations:
- Batch 5: chicken-adobo and shepherds-pie collections stay
  `["Baseline", "Cooking"]` — no `Filipino` or `British` bucket exists,
  bar forbids inventing one-off collections.
- Batch 7: ramen, pad thai, etc. stay `["Baseline", "Cooking"]` (ramen
  also `Soup`) — no dedicated `Asian` or `Noodles` bucket exists. Worth a
  separate catalog-wide decision if we want one.
- Pizza/broiler temperatures use the closest schema-expressible value
  (`broiler / 250 C`) — acceptable workaround until the data model gains
  a broiler/oven-mode field.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (90 tests),
`npx vite build` clean.

Bundle delta: 298.43 → 468.92 KB raw (+170.49 KB for 26 recipes, ~6.6
per recipe), 80.49 → 123.20 KB gzipped (+42.71 KB, ~1.6 per recipe).
Cumulative trajectory: final bundle ~780 KB raw / ~205 KB gzipped —
under 1 MB raw target.

Backlog state: 55 promoted, 48 backlog, 1 deferred.
