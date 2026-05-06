# Session log

Append-only, dated summaries of significant work. PMO reads these across projects.
Format: `## YYYY-MM-DD — <one-line summary>`. End every working session with an entry.
See `~/Code/HQ/wiki/conventions/session-log.md`.

## 2026-05-06 — Repo audit and HQ scaffolding

What was done:

- Audited the repo created by Codex against the stated objective and the rrradio
  reference. Findings: monolithic 3,291-line `src/main.ts` with no tests; 2,331-line
  `apps/worker/dev-server.mjs` mixing 6 services; ~10 MB of research data
  (TheMealDB, 1,504-video YouTube backlog, raw API dumps, baseline images) bundled
  into the static GH-Pages build for an MVP that ships one Shakshuka recipe; no
  HQ artifacts (no `CLAUDE.md`, no session log, no decisions, no wiki page).
- Confirmed the YouTube transcript fetcher in `apps/worker/dev-server.mjs:1156-1366`
  works (8 transcript outputs in `data/youtube-recipes/transcripts/`); plan to
  lift it into a clean `scripts/youtube/fetch-transcript.mjs` CLI later.
- Drafted a five-session cleanup plan: HQ scaffolding → scope reset (cut bundle) →
  modularize main.ts + tests → restore design fidelity → lift transcript CLI.
- Landed Session 1: this `session-log.md`, root `CLAUDE.md` per the
  `wiki/conventions/project-claude-md.md` template, wiki project page at
  `~/Code/HQ/wiki/projects/rrrecipe/`, and `design/decisions/0001-mvp-scope.md`.

What changed in the world:

- Root `CLAUDE.md`, `session-log.md`, `design/decisions/0001-mvp-scope.md`,
  and `~/Code/HQ/wiki/projects/rrrecipe/README.md` all now exist.
- Future agents opening this project inherit the operating manual and the
  scope decision from the start.

Open / next:

- Session 3: decompose `src/main.ts` into focused render modules (`render-browse`,
  `render-detail`, `render-mise`, `render-cook`, `render-timers`) plus
  `cook-session`, `voice`, `wake-lock`, `timer`, `ingredient-scale`. Add vitest
  with first tests on `parseYouTubeVideoId`, `parseQuantity`/`formatScaledQuantity`,
  `withBaselineCatalog` merge, and the transcript block normalizer. Pattern
  mirror: rrradio's `render-*.ts` + `*Refs` interface + `render-test-harness.ts`.
- Session 4: design fidelity audit against `internal/design_handoff_recipe_app/`
  + collapse docs (17 files → 5) and prune `docs/open-decisions.md` into ADRs.
- Session 5: lift the working YouTube transcript fetcher from
  `tools/import-dev-server/dev-server.mjs:1156-1366` into a single-purpose
  `tools/research/youtube/fetch-transcript.mjs` CLI.

## 2026-05-06 — Session 2: scope reset, bundle dropped from 9.7 MB to 200 KB

What was done:

- Removed the four research-data imports from `src/main.ts:2-5`
  (`baselineBacklog`, `mealDbCatalogUrl`, `youtubeBacklog`, `youtubeCatalog`)
  and the four Vite globs over `data/youtube-recipes/{transcripts,candidates,
  source-pages}`. Replaced with empty inline stubs typed against
  `YouTubeRecipeBacklog`/`YouTubeRecipeCatalog`/`BaselineRecipeBacklog`/
  `TheMealDBCatalog`. The workbench UI still exists but renders against
  empty data; full UI strip deferred to Session 3 / 4.
- Dropped `loadMealDbCatalog` and the `mealDbCatalogUrl` runtime fetch.
- Dropped `baselineRecipeImageSlugs` and the baseline image lookup in
  `recipeVisualUrl()`. The design canon uses striped placeholders intentionally
  ("Imagery: none in this design").
- Removed `public/data/` entirely (was 5.9 MB: 4 baseline PNGs + 8 channel
  avatar/banner images, none referenced by the design-spec UI).
- Moved `apps/worker/` → `tools/import-dev-server/`.
- Moved `scripts/lib/` → `tools/lib/`, `scripts/youtube/` → `tools/research/youtube/`,
  `scripts/themealdb/` → `tools/research/themealdb/`. Updated the dev-server's
  import path for `tools/lib/transcripts.mjs`.
- Renamed npm scripts under a `research:` prefix (`research:dev-api`,
  `research:youtube:*`, `research:themealdb:*`). The default story is
  `npm run dev` / `npm run build`; nothing in the build path touches
  research code.
- Updated `vite.config.ts` watch ignore list to `**/data/**`, `**/research/**`,
  `**/tools/**`.
- Wrote `tools/README.md` documenting the boundary, the verified-working
  YouTube transcript fetcher, and the SSRF warning on the source-page
  extractor in `dev-server.mjs`.
- Updated `README.md` to point at `CLAUDE.md`, ADR 0001, and `session-log.md`
  instead of the now-irrelevant `data/baseline-recipes/` and `data/themealdb-recipes/`
  references.

What changed in the world:

- `dist/` is now 200 KB (was 9.7 MB). JS chunk: 147 KB (38.88 KB gzip);
  CSS: 50 KB (8.88 KB gzip). Verified: `npm run typecheck` and
  `npm run build` both pass clean.
- The static MVP no longer depends on any research data to build or run.
- `data/youtube-recipes/raw/` was already gitignored — verified zero
  files tracked there; nothing to force-remove.

Open / next:

- Session 3 still unchanged: decompose `src/main.ts` (3,287 lines after
  stub edits) into focused modules + add vitest. The workbench code is
  the natural first slice to remove since it now operates on empty data.
- Three docs still reference `apps/worker/` and `scripts/{youtube,themealdb}`:
  `docs/development-setup.md`, `docs/local-dev-implementation-plan.md`,
  `docs/import-backend-architecture.md`. Will be addressed in Session 4
  during the docs collapse.

## 2026-05-06 — Session 3a: vitest + first contract tests

What was done:

- Added `vitest` as a devDependency. Wired `npm test` (run-once) and
  `npm run test:watch`. `vitest.config.ts` includes `src/**/*.test.ts`
  and `tools/**/*.test.mjs`.
- Extracted `parseQuantity` / `formatQuantity` / `formatScaledQuantity`
  from `src/main.ts` into `src/ingredient-scale.ts`. Added a fix for
  integer-plus-fraction inputs (`"1 1/2"`) — the inline version returned
  NaN for that case. Tests cover plain, decimal, fraction, integer-plus-
  fraction, unparseable, and the unit-preservation behaviors.
- Extracted the pure baseline-merge logic out of `src/storage.ts` into
  `src/snapshot-merge.ts` as `mergeBaselineCatalog(snapshot, baseline)` —
  parameterized on the baseline so tests don't depend on the real
  baseline-catalog import. `storage.ts` now calls it. Tests cover
  empty-snapshot append, idempotent merge, sourceId merge into existing
  versions without dropping user-added ones, immutability of the input,
  and the changed=false path.
- Added `src/importers/youtube.test.ts` covering `parseYouTubeVideoId`
  for canonical / youtu.be / shorts / embed / bare-id / pasted-text
  inputs (including dashes/underscores like `-__qVqib9Pw` from the
  research backlog).
- Added `tools/lib/transcripts.test.mjs` covering
  `normalizeTranscriptSegments` and `transcriptBlocksToText`: empty input,
  contiguous merging, sentence-boundary splits, gap-based splits,
  maxBlockChars splits, empty-caption handling, and timestamp rounding.

What changed in the world:

- 4 test files / 32 tests / all passing in 144 ms.
- `npm run typecheck` and `npm run build` clean. Bundle unchanged at
  ~200 KB (147 KB JS + 50 KB CSS).
- `src/main.ts` shrank from 3,289 → 3,254 lines as the ingredient helpers
  moved out.

Open / next:

- Session 3b (deferred): the bigger render-module decomposition
  (`render-browse`, `render-detail`, `render-mise`, `render-cook`,
  `render-timers`, `cook-session`, `voice`, `wake-lock`, `timer`).
  Better done after Session 4 (design fidelity) so we don't refactor
  twice. The 32 contract tests landed today are the safety net.
- Session 4 still on deck: design fidelity audit + docs collapse.
- Session 5 still on deck: lift the working YouTube transcript fetcher
  into a clean `tools/research/youtube/fetch-transcript.mjs` CLI.

## 2026-05-06 — Session 4: docs collapse + token audit

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

## 2026-05-06 — Session 5: lift YouTube transcript fetcher into a CLI

What was done:

- Lifted the verified-working transcript fetcher from
  `tools/import-dev-server/dev-server.mjs` (lines 1156–1366) into
  `tools/lib/youtube-transcript.mjs` (219 lines): `fetchYouTubeTranscript`
  plus the pure helpers (`extractInnertubeApiKey`, `selectCaptionTrack`,
  `parseJson3CaptionSegments`, `parseXmlCaptionSegments`, `captionUrl`,
  `captionTrackName`, `assertYouTubePlayable`).
- Refactored `tools/import-dev-server/dev-server.mjs` to import
  `fetchYouTubeTranscript` from the new lib instead of duplicating the
  211-line implementation. Dev-server: 2,332 → 2,121 lines. The two
  call sites (CLI + dev-server) now share one code path.
- Added `tools/research/youtube/fetch-transcript.mjs` — a single-purpose
  CLI. Args: `--video-id <id>` or `--url <youtube-url>`; optional
  `--languages en,de` and `--out-dir`. Writes the four files the dev-server
  writes (`<id>.txt`, `.json`, `.sanitized.txt`, `.blocks.json`) under
  `data/youtube-recipes/transcripts/` by default. Block envelope matches
  the dev-server's exactly so the two writers produce interchangeable
  files. Includes a `--help` panel and clear error messages.
- Wired `npm run research:youtube:fetch-transcript`.
- Added `tools/lib/youtube-transcript.test.mjs` — 26 tests covering the
  pure helpers with realistic JSON3 / XML / player-response fixtures
  (manual-vs-asr track preference, language-list ordering, fallback
  selection, fmt= replacement, HTML entity unescape, bot-check / age-
  restricted / unavailable error mapping).
- Updated `tools/README.md` and `docs/import-pipeline.md` to point at
  the new CLI.

What changed in the world:

- Total test count: 5 files / 32 tests → 6 files / 58 tests (all in 139
  ms). Build: clean at ~200 KB. typecheck: clean.
- **Live smoke test**: ran the CLI against `SzECOCrCSWg` (the known-
  working focaccia video). Result: 52 segments / 35 blocks, identical
  to the committed reference output in
  `data/youtube-recipes/transcripts/` modulo the `generatedAt`
  timestamp. End-to-end verified.

Open / next:

- Session 3b is now the last meaningful chunk: decompose `src/main.ts`
  into per-screen render modules (`render-browse`, `render-detail`,
  `render-mise`, `render-cook`, `render-timers`, plus `cook-session`,
  `voice`, `wake-lock`, `timer`). The 58 contract tests are the safety
  net. Best done after a browser-side design fidelity pass so the UI
  doesn't get refactored twice.
- Visual design fidelity pass (browser-side, not done in this Claude
  session): step through the five screens with `npm run dev`, verify
  yellow accent placement, hairline rules, IBM Plex rendering, and the
  cook-screen tap/swipe/voice/wake-lock behavior against
  `internal/design_handoff_recipe_app/README.md`.
- The committed `data/youtube-recipes/transcripts/*.blocks.json` files
  predate the lifted-CLI envelope but match it structurally — no
  rewrite needed.

## 2026-05-06 — Workflow: agent task issues + first MVP batch

What was done:

- Sponsor named the MVP target: *upload a YouTube channel → pick a video →
  extract everything → create the recipe → cook on the iPad with guidance.*
- Added `.github/ISSUE_TEMPLATE/codex-task.md` — a single template for
  `agent:codex` / `agent:claude` / `agent:human` tasks. Each issue has Why /
  Scope / Non-goals / Acceptance criteria (incl. tests + session-log entry) /
  Implementation notes / PR instructions. Reviewer (Claude or sponsor) checks
  the criteria before merge.
- Created 10 GitHub labels: `agent:codex`, `agent:claude`, `agent:human`,
  `kind:test|refactor|feature|bug|docs|tooling`, `mvp:channel-to-cook`.
- Filed the first batch of 7 issues, all on the `mvp:channel-to-cook` track:

  - **#1** Replace hallucinated OpenRouter model — `agent:codex`. Blocks #5,#6.
  - **#2** SSRF host allowlist on the source-page extractor — `agent:codex`.
  - **#3** Seed 5–7 baseline recipes — `agent:codex`. Lets Browse screen
    feel real even before YouTube import works.
  - **#4** End-to-end smoke test on iPad — `agent:human`, assigned to
    MarkusSteinbrecher. Sponsor walk; outputs new issues.
  - **#5** Re-enable channel intake in the SPA against the dev-server —
    `agent:codex`. Wires the empty-stub workbench to call the dev-server.
  - **#6** Save candidate as recipe + appear in Browse — `agent:codex`.
    Pulls `finalizeImportCandidate` apart so the candidate→snapshot logic
    is unit-testable.
  - **#7** Cooking-mode polish (wake-lock / swipe / voice / timer ring)
    — `agent:claude`, unassigned until #4 reports findings.

What changed in the world:

- Repo now has a structured handoff path: I file packaged issues,
  Codex executes against them, I review for scope+convention drift
  before sponsor merges. ADR/convention links in the template pull
  agents into HQ ways of working from the first read.
- `.github/ISSUE_TEMPLATE/codex-task.md` committed in `8354d0f`.

Open / next:

- Wait for Codex to pick up #1, #2, #3 (they're independent).
- Sponsor walks through #4 when convenient and files findings; I convert
  into Codex tasks.
- Session 3b (decompose `src/main.ts`) deferred until #4's findings
  shape the cooking-mode work in #7.

## 2026-05-06 — Workflow miss + recovery: split Codex's main work into 4 PRs

What happened:

- Codex picked up issues #1, #2, #5, #6 and worked all four directly on
  `main` in the working tree — no branches, no commits, no PRs. Session
  log got a single Codex-authored entry covering all four. The work
  itself was mostly correct (typecheck + 75 tests + build clean), but
  the workflow set up the day before (one-issue-per-PR, review gate
  before merge, `Closes #N` in PR body) was bypassed entirely.
- Two regressions slipped in:
  - `data/youtube-recipes/backlog.json` had a 2,046-line diff (research
    data Codex re-ran during testing).
  - `public/data/youtube-recipes/images/channels/...` came back (two
    channel images we deleted in Session 2 per ADR 0001).

Recovery:

- Dropped both regressions before splitting.
- Reset to clean `main` and reconstructed four per-issue branches:
  - `codex/openrouter-model` (PR #8, closes #1) — model name fix.
  - `codex/ssrf-host-allowlist` (PR #9, closes #2) — `tools/lib/url-safety.mjs`.
  - `codex/spa-channel-intake` (PR #10, closes #5) — offline-state UI
    + `localDevApiBaseUrl` node guard + offline test.
  - `codex/save-candidate-as-recipe` (PR #11, closes #6) —
    `src/import-finalize.ts` + 5 tests.
- Each PR ran the full gate set on its own branch and got its own
  session-log entry.

To prevent recurrence:

- Wrote `AGENTS.md` at the repo root as the universal operating manual
  for any automated agent. Section 5 is a hard list of workflow rules:
  branch first, one issue per PR, don't touch out-of-scope files, run
  gates before commit, append session-log entry, PR body must include
  `Closes #N` + gate output + test-plan checklist. Issue 5.10 is
  explicit: don't claim a manual smoke test you didn't do.
- The next Codex prompt for any new issue starts with "Read AGENTS.md
  before you begin."

Open / next:

- Once PRs #8–#11 are reviewed and merged, ping Codex on issue #3 (seed
  baseline recipes) — only remaining `agent:codex` MVP-track issue.
- #4 (sponsor's iPad smoke test) and #7 (cook-mode polish, depends on
  #4) still in queue.

## 2026-05-06 — Codex #1: real OpenRouter model

What was done (PR `codex/openrouter-model`, closes #1):

- `openRouterModel` default: `openrouter/free` → `openrouter/owl-alpha`.
  Verified via the live OpenRouter API: model exists, prompt+completion
  pricing both `0`, 1M context, supports `response_format`,
  `structured_outputs`, `tools`, `seed` — exactly what's needed for
  strict-JSON recipe extraction.
- Updated `.env.example` to match.
- Updated `tools/import-dev-server/README.md`: model name + stale
  `npm run dev:api` references → `npm run research:dev-api` (the
  command was renamed in Session 2 but the doc didn't follow).
- Updated `tools/research/docs/data-gathering-process-flow.md` for the
  same `dev:api` → `research:dev-api` rename.

Verified: `npm run typecheck` clean, `npm test` clean (58 tests),
`npm run build` clean (~200 KB bundle).
## 2026-05-06 — Codex #2: SSRF host allowlist on the source-page extractor

What was done (PR `codex/ssrf-host-allowlist`, closes #2):

- Added `tools/lib/url-safety.mjs` exporting `validateExternalUrl(url)`
  and `readResponseTextWithLimit(response, maxBytes)`. The validator:
  rejects non-http/https schemes, embedded credentials, and a default
  deny set (`localhost`); resolves the hostname via
  `node:dns/promises`; rejects every IPv4 private/loopback/link-local
  family + `0.0.0.0`, IPv6 `::`/`::1`/`fe80::/10`/`fc00::/7`, and
  IPv4-mapped-IPv6 addresses (`::ffff:127.0.0.1` and the hex form).
  Body-size cap requires a `content-length` header and aborts mid-stream
  if the cap is exceeded.
- Applied the validator at both call sites that fetch user-supplied URLs
  in `tools/import-dev-server/dev-server.mjs`:
  `fetchAndStoreRecipeSourcePage` (linked recipe pages found in YouTube
  descriptions — capped at 2 MB) and `downloadChannelImage` (channel
  avatars/banners from the YouTube Data API).
- Added `tools/lib/url-safety.test.mjs` covering: http/https accepted,
  ftp/file/javascript rejected, credentials rejected, every IPv4 private
  family rejected, public IPv4 accepted, malformed input rejected,
  body-size cap behavior.

Verified: `npm run typecheck` clean, `npm test` clean (existing tests +
the new url-safety suite), `npm run build` clean. No SPA bundle change.
