# 2026-05-06 — Document local server port allocation

What was done (PR `claude/document-dev-ports`, closes #14):

- Two Vite dev servers ended up running concurrently (5174 from an
  earlier session, 5175 started by Codex). Both work — the friction
  was that no single doc said "5174 is the default." `tools/import-dev-server/README.md`
  documents 5175 (when also running the dev-api), so Codex correctly
  picked it; the 5174 default was undocumented.
- Added a "Local servers" port table to `AGENTS.md` (new §4.1) and
  mirrored it in `docs/architecture.md` §"Local development". Table
  pins 5173 (avoid), **5174** (primary `npm run dev`, iPad-facing),
  **5175** (Vite when also running the dev-api), **8787** (dev-api).
- Added a rule: if a port is in use, run `lsof -i :<port>` and ask
  before killing — don't silently start a parallel server on a
  different port.

What changed in the world:

- Future agents pick the documented port instead of inventing one,
  so the running-server inventory stays predictable across sessions.
- The two existing servers (PID 83738 on 5174, PID 6318 on 5175)
  remain — Codex is using 5175 for in-flight #3 work.

Verified: `npm run typecheck` clean, `npm test` clean (75 tests),
`npm run build` clean. No code changes — SPA bundle unaffected.
