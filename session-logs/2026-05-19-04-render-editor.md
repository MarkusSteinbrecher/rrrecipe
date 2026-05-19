# 2026-05-19 — Claude #33: migrate editor shell to render-editor

What was done (PR `claude/render-editor`, closes #33):

- Added `src/render-editor.ts` with `EDITOR_FRAGMENT` (the `<form id="recipe-editor">`
  shell, cancel + save buttons, labelled inputs/textareas), `EDITOR_REF_IDS`,
  typed `EditorRefs`, `editorRefsFromDocument`, and refs-based
  `renderEditor(refs, version)` that sets `.value` on each field.
- Added `src/render-editor.test.ts` (happy-dom). Covers: title + change-note
  pre-fill, ingredient/step textareas (one raw line per item), cancel + save
  buttons wired through delegate, FormData contract (form's `data-form`,
  `title` / `changeSummary` names) the existing submit handler reads.
- Updated `src/render-test-harness.ts` to mount `EDITOR_FRAGMENT` alongside
  Browse.
- Wired `src/main.ts`: `renderEditor()` returns `renderApp(EDITOR_FRAGMENT,
  "recipe")` (or `renderMissing()`), and `render()` calls `renderCurrentEditor()`
  after the static mount.

Verified: `npm run typecheck` clean, `npm test` clean (82 tests), `npm run
build` clean. Bundle delta: built JS 134.98 kB on `main` to 135.69 kB on this
branch (+0.5%); `dist/` block size 192K on both.

Visual diff in
[`assets/2026-05-19-render-editor/`](assets/2026-05-19-render-editor/):
[`editor-before.png`](assets/2026-05-19-render-editor/editor-before.png) and
[`editor-after.png`](assets/2026-05-19-render-editor/editor-after.png) —
focaccia editor screen — byte-identical. Method: focaccia → edit on each branch.
