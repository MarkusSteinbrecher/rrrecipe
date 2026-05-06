# Research docs

Operating notes for the research / data-collection side of the project.
**Nothing referenced here ships with the SPA build** — see
[`../../../design/decisions/0001-mvp-scope.md`](../../../design/decisions/0001-mvp-scope.md).

- [`youtube-recipe-dataset.md`](youtube-recipe-dataset.md) — YouTube Data API
  collector pipeline (`tools/research/youtube/collect-recipes.mjs`).
- [`data-gathering-process-flow.md`](data-gathering-process-flow.md) — end-to-end
  backlog → catalog → candidate → QA process for harvesting cooking videos.
- [`baseline-catalog-plan.md`](baseline-catalog-plan.md) — promotion plan from
  the baseline backlog into `src/data/baseline-catalog.ts`.
- [`research-notes.md`](research-notes.md) — external API findings (NotebookLM,
  YouTube Data API limits, Schema.org Recipe).
