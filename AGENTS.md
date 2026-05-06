# AGENTS.md — Operating manual for automated agents

> Read this **before** you touch the codebase. Codex, Claude, and any other
> agent works here under the same rules. The PR workflow is non-negotiable.
> Companion to [`CLAUDE.md`](CLAUDE.md), which Claude Code's harness loads
> automatically; the content overlap is intentional — both files are
> authoritative.

---

## 1. What this project is

A private-first recipe app. Web first (Vite + TypeScript static SPA on GitHub
Pages, IndexedDB local store), native iOS later. The center of the product is
**hands-free cooking mode**: tap, swipe, or voice to advance steps with greasy
hands.

Imports (web pages, YouTube, plain text, photos/PDFs) are a secondary surface —
every import produces a reviewable candidate, never an auto-saved recipe.

The design canon is at [`internal/design_handoff_recipe_app/README.md`](internal/design_handoff_recipe_app/README.md).
That's the source of truth for the five SPA screens (Browse → Detail → Mise →
Cook → Timers), tokens, and interactions. Don't drift from it without an ADR.

## 2. Stack

- TypeScript (strict), Vite, vanilla DOM (no UI framework — match rrradio).
- IndexedDB on the client; baseline catalog merged in at boot.
- Vitest for unit/contract tests.
- Deploy: GitHub Pages via `.github/workflows/pages.yml`.
- iOS (later): SwiftUI + SwiftData/SQLite.
- Backend (later, only when there's a paying customer): Cloudflare Worker
  behind auth + entitlement + host allowlist + rate limit.

## 3. Critical conventions

- **The static GH-Pages bundle ships only what the cooking app needs.** No
  research datasets, no committed YouTube backlog, no TheMealDB catalog
  imported into `src/`. Research lives under `tools/` or `data/` and is never
  `import`-ed by the SPA. See [ADR 0001](design/decisions/0001-mvp-scope.md).
- **Recipes are append-only.** `RecipeVersion` records are immutable; saving
  an edit creates a new version. Keep `IngredientLine.raw` permanently —
  parsed quantity/unit/item are conveniences and will be wrong sometimes.
  See [`docs/data-model.md`](docs/data-model.md), [`docs/versioning.md`](docs/versioning.md).
- **Imports never auto-save.** AI/LLM extraction always produces a
  `RecipeCandidate` with confidence and warnings; the user reviews before it
  becomes a `Recipe`. The browser never receives provider API keys.
- **Render through small modules + a harness**, not scattered `innerHTML`.
  Per-screen `render-*.ts` modules with a typed `*Refs` interface, mirroring
  rrradio's pattern. Pure parsing/normalization logic gets unit tests before
  UI tests.
- **Design tokens are locked.** Yellow `#ffff00` accent, IBM Plex Sans + Mono,
  hairline rules, lowercase prose. Don't dilute the accent with secondaries.

## 4. Constraints

- **Static MVP must run with no backend.** No `dev:api` dependency in the
  default story. The build must not fail or behave differently when the
  import API is unreachable.
- **No SSRF surface.** Any code that fetches user-supplied URLs must use
  [`tools/lib/url-safety.mjs`](tools/lib/url-safety.mjs) (`validateExternalUrl`,
  `readResponseTextWithLimit`). Don't add new fetch call sites without it.
- **GitHub Pages bundle stays small.** Target `dist/` < 1 MB without images.
  Verify with `du -sh dist/`. Note the delta in your PR body.
- **No secrets in the SPA.** API keys live in `.dev.vars` (gitignored) on the
  workstation. The browser must never see them.

## 5. Workflow rules — non-negotiable

These rules exist because Codex's first pass at issues #1, #2, #5, #6 wrote
directly to `main` in the working tree, no branches, no PRs. The split-up
afterwards lost a day. Don't repeat that.

### 5.1 Pick up work via a labeled GitHub issue

- Look at issues labeled `agent:codex` (or `agent:claude` if you're Claude).
- Read the **whole** issue: Why, Scope, Non-goals, Acceptance criteria,
  Implementation notes, PR instructions. The Non-goals section exists to keep
  PRs small — respect it. If you find related fixes outside scope, file a
  follow-up issue rather than expanding this PR.
- Read [`CLAUDE.md`](CLAUDE.md) and the relevant ADRs in
  [`design/decisions/`](design/decisions/) before you start. The conventions
  there override your defaults.

### 5.2 Branch first, always

```sh
git checkout main
git pull
git checkout -b <agent>/<short-slug>     # e.g. codex/seed-baseline-recipes
```

**Never commit directly to `main`.** Even one commit on `main` breaks the PR
review trail.

### 5.3 One issue per branch / PR

Don't bundle four issues into one set of working-tree changes. If issue #X
turns out to need a prerequisite, file the prerequisite as its own issue and
PR. The reviewer (Claude or the sponsor) checks each PR against its issue's
acceptance criteria — interleaved work makes that impossible.

### 5.4 Don't touch files outside the issue's stated scope

The Scope section lists files. Stick to it. In particular, leave these alone
unless the issue explicitly says otherwise:

- `data/` — research artifacts. Not part of the build. Don't regenerate.
- `public/data/` — must stay empty. The design uses striped placeholders
  intentionally; channel banners and recipe photos do not ship.
- `internal/design_handoff_recipe_app/` — design canon. Read-only for agents.
- `~/Code/HQ/wiki/` — sponsor-curated. Only the wiki-curator agent edits it.
- `.dev.vars` — local secrets, gitignored. Never read or echo their values.

### 5.5 Run all gates before committing

```sh
npm run typecheck     # must be clean
npm test              # must be 100% passing
npm run build         # must succeed
du -sh dist/          # note the delta vs. main in the PR body
```

If any gate fails, fix it before committing. Don't push red.

### 5.6 Append a session-log entry in the same commit

[`session-log.md`](session-log.md) is append-only, dated, and the canonical
record of what changed. Format:

```markdown
## YYYY-MM-DD — Codex #N: <one-line summary>

What was done (PR `<branch>`, closes #N):

- Bullet points of concrete changes, file paths included.

Verified: `npm run typecheck` clean, `npm test` clean (X tests),
`npm run build` clean. Bundle delta: ...
```

See [`~/Code/HQ/wiki/conventions/session-log.md`](https://github.com/MarkusSteinbrecher/HQ/blob/main/wiki/conventions/session-log.md)
for the full convention.

### 5.7 Commit format

- Imperative subject line < 70 chars.
- Body explains the why, not the what (the diff already shows the what).
- End every commit with both Co-Author trailers when the agent collaborated
  with another agent or with the sponsor:

```
Co-Authored-By: Codex <noreply@openai.com>
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- Never use `--amend` after a hook fails. Fix and create a new commit.
- Never `--no-verify` or `--no-gpg-sign`.
- Never force-push to `main`.

### 5.8 Push, then open a PR that closes the issue

```sh
git push -u origin <branch>
gh pr create --base main --title "<title> (#N)" --body "Closes #N. ..."
```

The PR body must include:

- `Closes #N` so merging closes the issue automatically.
- A short summary of what changed.
- The output (or a paste of failures) of `npm run typecheck`, `npm test`,
  `npm run build`.
- The bundle-size delta from `du -sh dist/` if the SPA could change.
- A test plan checklist mirroring the issue's acceptance criteria.

### 5.9 Wait for review

A maintainer (Claude or the sponsor) reviews against the acceptance criteria
before merge. If review asks for changes, push more commits to the same
branch — don't open a new PR. Squash-on-merge is the maintainer's call.

### 5.10 If you can't satisfy a criterion

Don't ship a half-done PR claiming success. Either:

1. Cut the scope (note in the PR body what was deferred and link a follow-up
   issue), or
2. Mark the PR as a draft and explain the blocker.

In particular: *"I can't manually walk through this on an iPad"* is fine.
Say so. Don't claim a manual smoke test you didn't do.

## 6. Pointers

- **Operating manual:** [`CLAUDE.md`](CLAUDE.md) (the Claude-loaded copy of
  this content; same rules, slightly different framing).
- **Design canon:** [`internal/design_handoff_recipe_app/README.md`](internal/design_handoff_recipe_app/README.md)
- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Data model:** [`docs/data-model.md`](docs/data-model.md)
- **Cooking mode:** [`docs/cooking-mode.md`](docs/cooking-mode.md)
- **Import pipeline:** [`docs/import-pipeline.md`](docs/import-pipeline.md)
- **Versioning:** [`docs/versioning.md`](docs/versioning.md)
- **Decisions:** [`design/decisions/`](design/decisions/) — ADRs.
- **Live state:** [`session-log.md`](session-log.md) and GitHub issues.
- **Issue template:** [`.github/ISSUE_TEMPLATE/codex-task.md`](.github/ISSUE_TEMPLATE/codex-task.md).
- **Wiki (cross-project):** `~/Code/HQ/wiki/` — read-only for agents working
  in this project. The wiki page for this project is at
  `~/Code/HQ/wiki/projects/rrrecipe/`.

## 7. Checklist before opening a PR

- [ ] Work is on a feature branch named `<agent>/<short-slug>`, not `main`.
- [ ] Only one issue's worth of changes is on the branch.
- [ ] Files outside the issue's Scope are untouched.
- [ ] `data/` and `public/data/` are unchanged.
- [ ] `npm run typecheck`, `npm test`, `npm run build` all clean.
- [ ] Bundle-size delta from `du -sh dist/` known and acceptable.
- [ ] No secrets, no API keys, no `.dev.vars` content in the diff.
- [ ] Tests added for any new pure logic.
- [ ] `session-log.md` entry appended.
- [ ] Commit message has the Co-Author trailer(s).
- [ ] PR body includes `Closes #N`, gate output, and a test-plan checklist
      mirroring the issue's acceptance criteria.

If every box is checked: open the PR. Otherwise: don't.
