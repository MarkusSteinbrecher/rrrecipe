# 2026-05-06 — Session 4: docs collapse + token audit

What was done:

- Audited `src/style.css` against the design canon at
  `internal/design_handoff_recipe_app/README.md`. Dark-theme tokens match
  exactly: `--accent: #ffff00`, `--bg: #0a0a0a`, `--bg-2: #131313`,
  `--ink: #f4f4f2` and the four ink alphas, `--line`/`--line-2` at 0.08
  and 0.14, `--accent-tint`, IBM Plex Sans + Mono. The light theme
  (`#00a040` accent on near-white) is an addition not in the canon —
  reasonable extension, not touched. No CSS changes needed.
- Collapsed docs from 15 → 7. Survivors: `architecture.md`,
  `data-model.md`, `cooking-mode.md`, `import-pipeline.md`, `versioning.md`,
  `video-steps.md`, `localization-and-units.md`. The last two stayed as
  small standalone docs covering specific concerns clearly enough that
  merging them into bigger files would reduce signal.
- Moved 4 research docs to `tools/research/docs/` with a brief index
  README: `data-gathering-process-flow.md`, `youtube-recipe-dataset.md`,
  `baseline-catalog-plan.md`, `research-notes.md`. They're research
  artifacts, not product specs.
- Deleted `local-dev-implementation-plan.md` (superseded by
  `session-log.md` + ADR 0001) and `open-decisions.md` (questions either
  answered or destined to become ADRs).
- Merged `import-backend-architecture.md` into `import-pipeline.md` as a
  brief "Future Paid-Import Surface" section, then deleted the original.
- Merged `development-setup.md` into `architecture.md` as a "Local
  development" section, then deleted the original. Also rewrote
  `architecture.md` so its source-layout reflects the actual repo
  (`tools/`, `design/decisions/`, no more `apps/web` placeholder) and
  the testing section enumerates the four contract suites that exist.
- Updated `README.md` docs list. Updated stale `docs/import-backend-architecture.md`
  references in `tools/README.md` and `tools/import-dev-server/README.md`.

What changed in the world:

- `docs/` is 1,142 lines across 7 files (was 2,728 lines across 15
  files). All path references audited — no stale links to deleted docs
  or moved scripts remain anywhere in `docs/`, `tools/`, or root files.
- `tools/research/docs/` now holds the research-side docs alongside the
  research code. Discoverability for the cooking-app side improved: a
  new contributor opening `docs/` no longer has to guess which docs are
  about the SPA vs. the data pipeline.
- Verified clean: `npm run typecheck`, `npm test` (4 files / 32 tests
  in 133 ms), `npm run build` (~200 KB bundle).

Open / next:

- Session 3b: the render-module decomposition of `src/main.ts` is still
  the biggest single piece of remaining work. The 32 contract tests
  cover the pure logic; the workbench UI in main.ts (now operating on
  empty stubs) is the natural first slice to delete.
- Session 5: lift the working YouTube transcript fetcher from
  `tools/import-dev-server/dev-server.mjs` into a clean single-purpose
  `tools/research/youtube/fetch-transcript.mjs` CLI, with fixture-based
  vitest coverage for `parseJson3CaptionSegments` / `selectCaptionTrack`.
- Visual design fidelity: the CSS tokens match the canon, but actual
  visual fidelity (yellow accent placement, hairline rules, IBM Plex
  rendering, swipe/voice/wake-lock behavior on the cook screen) needs a
  browser pass. Out of scope for this session; flag for the next time
  you can run `npm run dev` and step through the five screens.
