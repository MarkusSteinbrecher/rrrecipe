# 2026-05-06 — Workflow miss + recovery: split Codex's main work into 4 PRs

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
