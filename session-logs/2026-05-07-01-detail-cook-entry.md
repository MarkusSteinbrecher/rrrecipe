# 2026-05-07 — Detail screen primary CTA: "begin cooking"

What was done (PR `claude/detail-cook-entry`, closes #18):

- Surfaced during sponsor's iPad smoke test (#4): from Detail there was
  no clickable path into Mise / Cook. The phase nav (`renderRecipeWorkflow`)
  is conditionally rendered only when `recipePhase` is set, and Detail
  passes `undefined`, so the only emitters of `start-shop` / `start-mise` /
  `start-cooking` were hidden. None of the four collapsible workflow rows
  on Detail (overview / shop / prep / cook) had CTAs either — tapping a
  step row only fires `select-cook-step`, which highlights but doesn't
  navigate.
- Design canon
  ([`internal/design_handoff_recipe_app/README.md:49`](../blob/main/internal/design_handoff_recipe_app/README.md))
  is explicit: Detail has a "full-width yellow button 'begin cooking'
  with flame icon" as the primary CTA. The current implementation had
  drifted from canon.
- Added the CTA at the bottom of `renderDetail`'s scroll content,
  between the workflow rows and the version history
  (`src/main.ts:1743`). Reuses `rr-action rr-action-flush` (already
  full-width yellow per `src/style.css:922-942`) and the existing
  `flame` icon glyph (`src/main.ts:381`).
- The `start-cooking` action handler (`src/main.ts:2798`) already sets
  `state.screen = "cook"`, resets the step timer, and requests wake
  lock — no new wiring needed.

What changed in the world:

- Smoke test #4 can proceed past Detail: tap a recipe → tap "begin
  cooking" → enter Cook screen.
- Drift from design canon on Detail screen #2 reduced.

Verified: `npm run typecheck` clean, `npm test` clean (75 tests),
`npm run build` clean (`dist/assets/index-*.js` 134 KB,
`dist/assets/index-*.css` 50 KB — bundle well under 1 MB target).
Manual iPad walkthrough deferred to the sponsor as the next step of #4.

Open / next:

- Sponsor reloads `http://192.168.42.60:5174/rrrecipe/` on the iPad,
  continues smoke-test #4 from Detail → Cook → Timers, files
  per-screen findings.
- Symmetry follow-up (not in this PR): the `shop` and `prep` workflow
  rows still lack CTAs. Canon makes Mise the bottom-CTA screen
  (`README.md:61`), so the absence might be intentional once you can
  reach Mise via the phase nav — but the phase nav is still hidden on
  Detail. Worth a separate issue if smoke test surfaces friction.
