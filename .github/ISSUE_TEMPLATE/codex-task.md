---
name: Agent task (codex / claude / human)
about: A bounded, verifiable unit of work for an automated agent or a human.
title: "<short imperative title>"
labels: ["agent:codex"]
assignees: []
---

> Read [`CLAUDE.md`](../../CLAUDE.md) and [`design/decisions/`](../../design/decisions/)
> first. End every PR by adding a file under [`session-logs/`](../../session-logs/)
> named `YYYY-MM-DD-NN-<slug>.md` per
> [`~/Code/HQ/wiki/conventions/session-log.md`](https://github.com/MarkusSteinbrecher/HQ/blob/main/wiki/conventions/session-log.md).

## Why
<!-- One paragraph. Link the ADR / design doc / session-logs/ entry that motivates this. -->

## Scope
<!-- What's in. Bounded list of files and acceptance criteria. -->

## Non-goals
<!-- What's out. Important to keep PRs small. -->

## Acceptance criteria
- [ ] Tests added or updated; list paths and what they cover.
- [ ] `npm run typecheck` clean.
- [ ] `npm test` clean.
- [ ] `npm run build` clean; bundle size delta noted in the PR body.
- [ ] No new permission, SSRF, or secret surface introduced.
- [ ] Conventions followed: link the relevant ADR or `wiki/conventions/*` page.
- [ ] `session-logs/<date>-NN-<slug>.md` added in the same PR.

## Implementation notes
<!-- Pointers to existing code patterns to mirror, files expected to change,
     traps to avoid. Be concrete: `src/foo.ts:42`. -->

## PR instructions
- Branch: `<agent>/<short-slug>` (e.g. `codex/seed-baseline-recipes`).
- One commit per logical step is fine; squash on review.
- PR title mirrors this issue title.
- PR body must include:
  - "Closes #<this-issue>".
  - Short summary of what changed.
  - Output of `npm run typecheck`, `npm test`, `npm run build` (or a paste of any failures).
  - `du -sh dist/` before and after if the bundle could change.
- Co-author trailer for the agent that did the work.

## Out-of-band review
A maintainer (Claude or human) reviews against these acceptance criteria
before merge. Expect requests for missing tests or scope cuts.
