# 2026-05-20 — Claude: Guided Import Phase B — side-by-side review (read-only)

Phase B of #38. Local-only; not pushed.

What was done (branch `feature-guided-import-phase-a`, continued):

- **New module `src/render-import-review.ts`** following the established
  per-screen render pattern (FRAGMENT, REF_IDS, refsFromDocument, render).
  Renders:
  - Header: back button, candidate title, source line (channel + retrieval
    metadata), confidence badges (overall + source + ingredients + steps).
  - Warning strip: visible only when the candidate has warnings.
  - Two-column grid (collapses to one on narrow viewports): YouTube
    embed iframe (via `youtube-nocookie.com` per #38 open question 1 —
    privacy-first) on the left, full candidate body on the right.
  - Body: about (description + yield + times + language), ingredients
    (grouped by section, optional flag, count), steps (grouped by section,
    counter, technique meta showing timer/temp/anchors), notes, tags.
  - No editing — read-only. Editing is Phase C.

- **`src/render-import-review.test.ts`** with 7 happy-dom tests covering:
  title + source rendering, nocookie embed URL with videoId, ingredient
  and step counts match the candidate, warnings hidden vs shown, empty
  ingredient/step hints, no-video fallback, back-button action wiring.

- **`src/render-test-harness.ts`** updated to mount the new fragment so
  test fixtures cover it.

- **`src/main.ts` wiring:**
  - Added `"import-review"` to `Screen` type and `reviewVideoId?: string`
    to `UiState`.
  - `renderScreen()` dispatches to `renderImportReviewScreen()` which uses
    `renderApp(IMPORT_REVIEW_FRAGMENT, "import")`. The app chrome stays
    on the Import tab so the back-and-forth feels in-place.
  - `renderCurrentImportReview()` resolves the candidate via
    `localCandidateForVideo(reviewVideoId)` (falls back to
    `candidateForVideo` for non-demo cases). Bounces back to the Import
    screen if the candidate cannot be resolved.
  - New action handlers: `open-import-review` (sets `reviewVideoId` +
    switches screen), `close-import-review` (clears + returns to Import).
  - `renderBacklogVideoRow()` now shows a `review` mini-button when
    `localCandidateForVideo(video.videoId)` returns a candidate — so the
    affordance only shows up where it works (currently the 5 demo videos).

- **`src/style.css` additions** for the new screen: layout grid, header,
  warning strip, video frame (with 16/9 aspect ratio), section blocks,
  ingredient list (with `is-optional` styling), step list (with leading
  `01`, `02`, …), notes, tags, and the `rr-video-review-link` button on
  the import list row.

Open-question follow-ups resolved during this phase:
- Q1 (privacy): used `youtube-nocookie.com/embed/…` — same functionality,
  no cookies set until the user actually plays.
- Q2 (currentTime from embed): not needed yet — read-only doesn't need
  the IFrame Player API. Will revisit in Phase C if user-facing anchor
  controls land in V1.

Verified: `npx tsc --noEmit` clean, `npx vitest run` clean (104 tests
across 14 files, up from 97/13), `npx vite build` clean.

Bundle delta: 792.97 → 800.12 KB raw (+7.15 KB for the new module),
209.51 → 211.29 KB gzipped (+1.78 KB). CSS: 50.10 → 53.91 KB raw
(+3.81), 8.88 → 9.55 KB gzipped (+0.67).

Unblocks Phase C (editing). The review screen is also now the natural
mount point for the eventual save handler in Phase D.

To verify visually: `npx vite`, open the Import tab, expand "manual
video backlog", click the `review` button on any demo row. The review
screen should show the YouTube video on the left and the full
read-only candidate (header, ingredients, steps, notes, tags) on the
right. The back button returns to Import.
