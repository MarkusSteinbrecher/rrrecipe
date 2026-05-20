# 2026-05-20 — Claude: Guided Import Phase E — URL paste path

Phase E of #38 — the last phase. Local-only; not pushed.

What was done (same branch, `feature-guided-import-phase-a`):

**Renderer (in `src/render-import.ts`):**
- Added a second button next to the existing URL input. Layout is now
  `[input | review video | add to backlog]`.
- The new `review video` button is the primary action (yellow accent
  background via the new `.rr-add-channel-primary` CSS class).
- The existing `add source` was renamed `add to backlog` to make the
  two paths distinct — backlog flow is unchanged, just relabelled.

**Handler (in `src/main.ts`):**
- New action `import-video-from-url`:
  1. Reads `state.channelBacklogInput` and trims it. Shows a toast if
     empty.
  2. Calls `createYouTubeCandidate(input)` — fully offline-capable;
     produces a sparse candidate when no fixture matches, with a warning
     when the URL doesn't parse to a videoId.
  3. If no videoId, shows an error toast and aborts.
  4. Otherwise: sets `state.editingCandidate`, `state.reviewVideoId`,
     navigates to the review screen, and clears the input.
  5. If `hasAiImportEndpoint()` is true, fires `refineCandidateWithAi`
     as a background promise. When it resolves it swaps in the refined
     candidate — but only if the user is still on the same review
     session (guarded by `state.reviewVideoId === startedAt`). Render
     is re-triggered with `preserveScroll: true`.
  6. If the AI call rejects, a toast surfaces the error; the sparse
     candidate stays in the review screen so the user can edit by hand.
- Graceful degradation: when the dev API is offline, the toast tells
  the user "Import API offline — the candidate is sparse, fill in by
  hand." The review screen is fully editable from Phase C, so this is
  a usable path even with no backend.

**CSS (in `src/style.css`):**
- `.rr-add-channel-row` grid template now `1fr auto auto` to fit the
  second button.
- New `.rr-add-channel-primary` for the yellow accent on the primary
  CTA.

**Tests:**
- Added one render-import test asserting both buttons are present and
  labelled correctly.
- The pure `createYouTubeCandidate` function already had thorough
  coverage in `src/importers/youtube.test.ts`. The AI refinement
  helper is similarly covered.
- Total: 118 across 14 files (up from 117/14).

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean,
`npx vite build` clean.

Bundle delta: 815.06 → 816.13 KB raw (+1.07), 213.71 → 214.07 KB
gzipped (+0.36). CSS: 57.36 → 57.43 KB raw (+0.07), 10.05 → 10.06 KB
gzipped (+0.01). Tiny — most of the work was wiring existing helpers.

## #38 — all five phases complete

| Phase | Status |
|---|---|
| A — bundle demo candidates | ✅ shipped |
| B — side-by-side read-only review | ✅ shipped |
| C — editable review | ✅ shipped |
| D — save & roundtrip | ✅ shipped |
| E — URL paste path | ✅ shipped |

Acceptance criteria from #38:
- [x] List of demo videos on Import (5 bundled, 9.5 KB raw / 2.5 KB gz each).
- [x] Click a demo → review screen with embedded video + complete editable candidate.
- [x] Every RecipeVersion field and every line/step editable; add/remove/reorder work.
- [x] mediaAnchor settable per step (manual mm:ss entry).
- [x] Save creates the recipe in IndexedDB and navigates to Detail.
- [x] Saved recipe appears in Browse, opens in Detail, produces Shop view; Cooking Mode works on it.
- [x] Build under the 1 MB raw bundle target (now 816 KB raw / 214 KB gz) and works with no backend.
- [x] `npx tsc --noEmit`, `npx vitest run`, `npx vite build` all clean.
- [x] Static bundle contains no provider API keys or research-only data.

To verify the full Phase E path: `npx vite`, Import tab. Paste any
YouTube video URL (try a fresh one, not a demo) → click `review video`.
The review screen opens with at least a title + URL + source filled
in; the rest is empty and editable. If the local dev import API is
running (npm run dev:api or similar), a background refinement enriches
the candidate. Save lands you on the new recipe's Detail screen.

Issue #38 ready to close.
