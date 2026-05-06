# 2026-05-06 — Session log → directory of per-entry files

What was done (PR `claude/session-logs-directory`, closes #12):

- Added `session-logs/` directory; split the existing 11 entries from
  `session-log.md` into individual files named `YYYY-MM-DD-NN-<slug>.md`
  (NN = two-digit sequence within the day). Demoted each entry's heading
  from `##` to `#` since it's now the file's title.
- Replaced `session-log.md` with a 22-line stub explaining the new layout
  and the `ls / grep` access patterns.
- Updated `AGENTS.md` §5.6 — "append session-log.md entry" became "add
  `session-logs/<date>-NN-<slug>.md` file in the same PR". §6 pointer +
  §7 checklist mirrored. CLAUDE.md, README.md, and the
  `.github/ISSUE_TEMPLATE/codex-task.md` template aligned.
- HQ wiki convention update (separate commit on the HQ repo) to permit the
  directory shape alongside the single-file shape.

What changed in the world:

- Future PRs no longer touch a shared append point. The merge-conflict
  cascade we hit on PRs #8 → #9 → #10 → #11 (three sequential rebases
  triggered by every merge) goes away. Codex / Claude / sponsor work can
  land in parallel.
- Same content, same chronology — `ls session-logs/` is the new
  `grep '^## ' session-log.md`.

Verified: `npm run typecheck` clean, `npm test` clean (75 tests),
`npm run build` clean. SPA bundle unchanged at ~204 KB.
