# rrrecipe

A private-first recipe app. Web first (Vite + TypeScript static SPA on GitHub Pages, IndexedDB local store), native iOS later. The center of the product is **hands-free cooking mode**: tap, swipe, or voice to advance steps with greasy hands. Imports (web pages, YouTube, plain text, photos/PDFs) are a secondary surface — every import produces a reviewable candidate, never an auto-saved recipe.

## Stack

- Language: TypeScript (strict)
- Framework: Vite + vanilla DOM (no UI framework — match rrradio's pattern)
- Storage: IndexedDB on the client; baseline catalog merged in at boot
- Deploy: GitHub Pages via `.github/workflows/pages.yml`
- iOS (later): SwiftUI + SwiftData/SQLite, sharing the same JSON contracts
- Backend (later, only when there's a paying customer): Cloudflare Worker for URL fetching, AI normalization, transcript providers — all behind auth + entitlement + host allowlist + rate limit

## Critical conventions

- **The static GH-Pages bundle ships only what the cooking app needs.** No research datasets, no committed YouTube backlog, no TheMealDB catalog imported into `src/`. If it's research, it lives under `tools/` or `research/` and is never `import`-ed by the SPA.
- **Recipes are append-only.** `RecipeVersion` records are immutable; saving an edit creates a new version (`docs/versioning.md`, `docs/data-model.md`). Keep `IngredientLine.raw` permanently — parsed quantity/unit/item are conveniences and will be wrong sometimes.
- **Imports never auto-save.** AI/LLM extraction always produces a `RecipeCandidate` with confidence and warnings; the user reviews before it becomes a `Recipe`. The browser never receives provider API keys.
- **Render through small modules + a harness**, not scattered `innerHTML`. Per-screen `render-*.ts` files with a typed `*Refs` interface, mirroring rrradio's pattern (`src/render-test-harness.ts`). Pure parsing/normalization logic gets unit tests before UI tests.
- **Design tokens are locked.** Yellow `#ffff00` accent, IBM Plex Sans + Mono, hairline rules, lowercase prose. Source of truth: [`internal/design_handoff_recipe_app/`](internal/design_handoff_recipe_app/). Don't dilute the accent with secondaries.

## Constraints

- **Static MVP must run with no backend.** No `dev:api` dependency in the default story. The build must not fail or behave differently when the import API is unreachable.
- **No SSRF surface.** The dev import server fetches arbitrary URLs from YouTube descriptions; that code must never ship publicly without a host allowlist + rate limits + entitlement check.
- **GitHub Pages bundle stays small.** Target `dist/` < 1 MB without images. Images that ship belong in `public/` only if they're recipe assets the seeded catalog actually displays.
- **One session log file per PR.** Add `session-logs/YYYY-MM-DD-NN-<slug>.md` (NN = sequence within the day, zero-padded). Single-file `session-log.md` was deprecated as a hot-conflict surface. See `~/Code/HQ/wiki/conventions/session-log.md` and the stub at `session-log.md`.

## Pointers

- **Wiki page:** `~/Code/HQ/wiki/projects/rrrecipe/` — synthesis, history, cross-project relationships
- **Design canon:** [`internal/design_handoff_recipe_app/README.md`](internal/design_handoff_recipe_app/README.md) — five settled screens, tokens, interactions
- **Architecture:** [`docs/architecture.md`](docs/architecture.md)
- **Data model:** [`docs/data-model.md`](docs/data-model.md)
- **Decisions:** [`design/decisions/`](design/decisions/) — ADRs (start at `0001-mvp-scope.md`)
- **Live state:** [`session-logs/`](session-logs/) and GitHub issues

## Wiki

The LLM Wiki at `~/Code/HQ/wiki/` is the persistent cross-project knowledge surface. Read its `CLAUDE.md` for conventions. This project's wiki page is at `~/Code/HQ/wiki/projects/rrrecipe/`.
