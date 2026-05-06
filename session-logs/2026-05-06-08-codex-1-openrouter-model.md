# 2026-05-06 — Codex #1: real OpenRouter model

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
