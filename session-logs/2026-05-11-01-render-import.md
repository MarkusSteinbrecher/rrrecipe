# 2026-05-11 - Codex #24: migrate import shell to render-import

What was done (PR `codex/render-import`, closes #24):

- Added `src/render-import.ts` with `IMPORT_FRAGMENT`, `IMPORT_REF_IDS`, typed `ImportRefs`, `importRefsFromDocument`, and refs-based `renderImport`.
- Added `src/render-import.test.ts` covering empty state, a single queued candidate, channel-intake offline state, and source filter chip count.
- Updated `src/render-test-harness.ts` to export and mount `IMPORT_FRAGMENT` alongside Browse.
- Wired `src/main.ts` to render the static Import shell through `render-import.ts` while keeping existing import row/detail helpers and event binding in `main.ts`.

Verified: `npm run typecheck` clean, `npm test` clean (82 tests),
`npm run build` clean. Bundle delta: built JS 134.98 kB on `main` to
138.25 kB on `codex/render-import` (+2.4%); `dist/` block size 188K on
`main` to 192K on this branch. Local smoke: existing Vite server on port 5174,
headless Chrome navigated to Import, set channel input to
`https://www.youtube.com/@testkitchen`, confirmed Import refs, filter chips,
offline/empty copy, and wrote `/private/tmp/rrrecipe-import-after.png`.
Before/after screenshot pair was not completed because port rules prevented
starting a parallel pre-change server.
