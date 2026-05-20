# 2026-05-20 — Claude: Guided Import Phase C — editable review

Phase C of #38. Local-only; not pushed.

What was done (same branch, `feature-guided-import-phase-a`):

**State (in `src/main.ts`):**
- Added `editingCandidate?: RecipeCandidate` to `UiState`.
- `open-import-review` action now deep-clones the source candidate into
  `state.editingCandidate` (via `JSON.parse(JSON.stringify(...))`).
- `close-import-review` clears it.
- `renderCurrentImportReview()` reads from `editingCandidate` (was
  resolving from `reviewVideoId` directly). Bounces back to Import if
  the editing copy is missing — protects against stale screen state.

**Renderer (in `src/render-import-review.ts`):**
Rewrote `renderCandidateBody` to render a full editable form. Every
field carries a `data-action` so `bindActionElements()` can dispatch
it. Sections:
- **about** — title, description, yield (raw + qty + unit), times
  (prep/cook/total minutes), language. Text inputs and textareas.
- **ingredients** — per-row controls: reorder up/down, optional editable
  section field, raw text, optional checkbox, remove. List footer:
  "+ add ingredient" and "+ add section header".
- **steps** — per-row controls: reorder up/down, position number,
  optional section, multiline text, timer (seconds), temperature (value
  + unit select), `mediaAnchors` chip list with a manual MM:SS / seconds
  add control, remove. List footer: "+ add step".
- **notes** — editable textarea per note + remove. List footer:
  "+ add note".
- **tags** — chips with remove + a new-tag input and add button.
- **save bar** — `discard` (closes review) and `save recipe (phase D)`,
  which is rendered disabled. Phase D wires the save.

Also exported `parseAnchorInput(value: string)` from the module — accepts
`mm:ss`, `hh:mm:ss`, or raw seconds; rejects empty, negative, and
non-numeric input.

**Handlers (in `src/main.ts`):**
Added all the editing actions. Conventions:
- Text inputs (`edit-candidate-title`, `edit-step-text`,
  `edit-ingredient-raw`, etc.) mutate `editingCandidate` and `return`
  early so no re-render happens — preserves focus and cursor.
- Structural actions (`add-*`, `remove-*`, `move-*-up`, `move-*-down`,
  toggle-optional, change-temp-unit) fall through to the bottom-of-
  handler `render()` so the new structure paints.
- `add-step-anchor` reads the sibling input via
  `document.querySelector('[data-step-anchor-input][data-step-id="…"]')`,
  parses with `parseAnchorInput`, and appends to the step with
  `sourceId: editingCandidate.source.id` and `confidence: "manual"`.
- `save-import-review` is wired to a no-op `return` so the visible
  disabled button can't accidentally trigger anything.

Small helpers landed alongside: `cloneCandidate`,
`moveById<T extends { id: string }>`, `renumberSteps`,
`updateStepTemperature`, `cssEscape`, `refreshImportReviewHeader` (only
re-syncs the title in the header strip after a title edit, without
re-rendering the body — preserves focus).

**CSS (in `src/style.css`):**
Editable form styling — inputs, textareas, the three-column row layout
(yield + qty + unit, prep + cook + total), edit-row layout (controls /
fields / remove), step number, anchor chips, tag chips, save bar,
disabled-button state, and rotated chevrons for the up/down move
buttons.

**Tests:**
Updated 2 existing tests that asserted old class names / empty-state
copy; added 6 new tests covering header editors, per-ingredient
controls, per-step controls (including anchor input and temperature
unit), save bar disabled state, and a parametric suite for
`parseAnchorInput`. Total: 112 across 14 files (up from 104/14).

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean,
`npx vite build` clean.

Bundle delta: 800.12 → 814.26 KB raw (+14.14), 211.29 → 213.53 KB
gzipped (+2.24). CSS: 53.91 → 57.36 KB raw (+3.45), 9.55 → 10.05 KB
gzipped (+0.50). Still well under the 1 MB raw target.

To verify visually: `npx vite`, Import tab → expand "manual video
backlog" → click `review` on any demo row. Every field is editable.
Add/remove/reorder ingredients and steps; set timers, temperatures,
and anchor timestamps; edit notes and tags. The save bar at the bottom
shows a disabled "save recipe (phase D)" button next to a working
discard. Phase D wires save.

Unblocks Phase D (`import-finalize.ts` extension + save handler) and
Phase E (URL-paste path with dev-API integration).
