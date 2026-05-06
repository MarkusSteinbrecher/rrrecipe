# 2026-05-06 — Workflow: agent task issues + first MVP batch

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
