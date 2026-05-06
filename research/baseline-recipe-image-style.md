# Baseline Recipe Image Style

Selected test style: bold editorial poster cutout.

Source test sheet:

- Generated source: `/Users/markus/.codex/generated_images/019df8d0-a57f-7e72-afcc-fe1a9b9aa5e1/ig_0407b4dab278ab880169fa2e04e61881918c053a27af27a548.png`
- Project copy: `public/data/baseline-recipes/images/baseline-style-test-sheet.png`
- Cropped preview assets:
  - `public/data/baseline-recipes/images/focaccia.png`
  - `public/data/baseline-recipes/images/spaghetti-carbonara.png`
  - `public/data/baseline-recipes/images/lasagne.png`

## Prompt

```text
Use case: stylized-concept
Asset type: preview contact sheet for baseline recipe artwork
Primary request: Create a three-panel black-and-white recipe artwork test sheet with no text anywhere. Each panel is a standalone square illustration for one baseline recipe: focaccia, spaghetti carbonara, lasagne.
Style direction 3: bold editorial poster cutout. Monochrome linocut / screenprint style, strong black shapes, rough paper texture, expressive simplified forms, a little imperfect and handmade, more graphic than culinary realism. Very limited fine detail.
Composition: three equal bordered panels in a horizontal row, each food item large and centered with dramatic negative space.
Subjects: Panel 1: focaccia as a chunky rectangle with dimples, rosemary marks, salt dots. Panel 2: spaghetti carbonara as a bold spiral mound with pepper specks and cubed pork. Panel 3: lasagne as a stacked block with wavy layers and dark filling bands.
Hard constraints: no words, no letters, no numbers, no logos, no watermarks, no color, no people, no photorealism, no detailed plate setting.
```

## Working Direction

Use this as the current baseline image direction for recipe overview previews.
For production assets, generate one recipe per image rather than a contact sheet,
and keep these constraints:

- No text inside the image.
- Black-and-white only.
- Food remains easy to identify at card size.
- Strong editorial linework with rough paper texture.
- Less detail than classic engraving, but more tactile than simple icon art.
