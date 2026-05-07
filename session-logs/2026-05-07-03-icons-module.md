# 2026-05-07 - Codex #23: extract shared icon module

What was done (PR `codex/icons-module`, closes #23):

- Added `src/icons.ts` with the shared `IconName`, `icon`, and `iconElement` exports backed by one SVG path table.
- Updated `src/main.ts` to import `icon` instead of defining it inline.
- Updated `src/render-browse.ts` to reuse `icon("search")` and `iconElement("heart" | "star")` instead of carrying duplicate SVG markup.

Verified: `npm run typecheck` clean, `npm test` clean (78 tests),
`npm run build` clean. Bundle delta: built JS 135.66 kB on `main` to
134.98 kB on `codex/icons-module` (-0.5%); `dist/` block size 192K on `main`
to 188K on this branch. Local server check:
`curl -I http://127.0.0.1:5174/rrrecipe/` returned 200 OK. Manual Browser
plugin screenshot smoke was blocked because the required Node REPL browser tool
was not available in this session.
