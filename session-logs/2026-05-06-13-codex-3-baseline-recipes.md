# 2026-05-06 — Codex #3: seed baseline recipes

What was done (PR `codex/seed-baseline-recipes`, closes #3):

- Updated `src/data/baseline-catalog.ts` so the baseline catalog has exactly
  seven recipes: the existing focaccia, spaghetti carbonara, and lasagne seeds,
  plus shakshuka, chocolate chip cookies, pasta primavera, and garlic bread.
- Kept the baseline source manual-only with a common-knowledge license note.
- Set generated baseline `RecipeVersion.origin` to `import` with
  `createdBy: "importer"`.
- Covered Browse filter chips through recipe tags: `baking`, `pasta`, `bread`,
  `vegetarian`, and `quick`.

Verified: `npm run typecheck` clean, `npm test -- src/snapshot-merge` clean
(5 tests), `npm test` clean (75 tests), `npm run build` clean. Bundle size:
`du -sh dist` reports 188K. Local dev server launched at
`http://127.0.0.1:5175/rrrecipe/`; browser smoke could not be completed in this
session because the Browser Node REPL, Playwright, and Puppeteer were unavailable.
