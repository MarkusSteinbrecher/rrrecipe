# Baseline Recipe Backlog

This directory tracks common recipe identities that should become baseline
recipes or matching targets.

`backlog.json` is intentionally separate from the YouTube backlog. YouTube
records are media sources; baseline records are dish identities. A YouTube import
can later point to a promoted baseline recipe such as
`recipe-baseline-spaghetti-carbonara`.

Current statuses:

- `backlog`: queued common recipe identity.
- `drafted`: local baseline draft exists and needs review.
- `promoted`: stable baseline recipe exists in `src/data/baseline-catalog.ts`.
- `deferred`: not suitable for the common baseline pass.

The first channel is `baseline-common-recipes`, which functions like a virtual
source channel for common recipes.

Items can include `externalSources`. The first supported external source is
`themealdb`, which lets a backlog item open a TheMealDB draft from the import
page before being promoted into `src/data/baseline-catalog.ts`.
