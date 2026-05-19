# 2026-05-11 - Codex #24: migrate import shell to render-import

What was done (PR `codex/render-import`, closes #24):

- Added `src/render-import.ts` with `IMPORT_FRAGMENT`, `IMPORT_REF_IDS`, typed `ImportRefs`, `importRefsFromDocument`, and refs-based `renderImport`.
- Added `src/render-import.test.ts` covering empty state, a single queued candidate, channel-intake offline state, and source filter chip count.
- Updated `src/render-test-harness.ts` to export and mount `IMPORT_FRAGMENT` alongside Browse.
- Wired `src/main.ts` to render the static Import shell through `render-import.ts` while keeping existing import row/detail helpers and event binding in `main.ts`.

Verified: `npm run typecheck` clean, `npm test` clean (82 tests),
`npm run build` clean. Bundle delta: built JS 134.98 kB on `main` to
138.25 kB on `codex/render-import` (+2.4%); `dist/` block size 188K on
`main` to 192K on this branch.

Visual diff captured in [`assets/2026-05-11-render-import/`](assets/2026-05-11-render-import/):
[`import-before.png`](assets/2026-05-11-render-import/import-before.png) (built from `main`)
and [`import-after.png`](assets/2026-05-11-render-import/import-after.png) (built from this
branch) are byte-identical (38,285 B each) — confirms the migration is a pure refactor.
Method: single Vite dev server on port 5174, switched git branch with no working changes,
hot-reload picked up the swap, headless Chrome navigated to Import on each branch.
