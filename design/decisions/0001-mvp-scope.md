---
adr: 0001
title: MVP scope is a static cooking app; imports/transcripts/AI are research tools
date: 2026-05-06
status: Accepted
scope: project
tags: [scope, architecture, build, ghpages]
---

# ADR 0001 — MVP scope is a static cooking app; imports/transcripts/AI are research tools

## Context

The repository was scaffolded with two threads tangled together:

1. **The product**: a private-first recipe app whose core flow is hands-free cooking
   (Browse → Detail → Mise → Cook → Timers), per `internal/design_handoff_recipe_app/`.
   This is what the README, the design handoff, and `docs/architecture.md` describe
   as Phase 1.
2. **A research pipeline** for harvesting YouTube recipe videos: a 1,504-video
   committed backlog, a 1.5 MB TheMealDB catalog, ~6 MB of raw paged YouTube API
   responses, source-page scrapers, JSON-LD parsers, channel expanders, an
   import-refinement endpoint that proxies OpenRouter, and a transcript fetcher.

The two threads got fused in the build:

- `src/main.ts:2-5` and `src/main.ts:200-203` import the research datasets directly;
  they are bundled into every page load.
- The import "workbench" UI in `src/main.ts` exposes channel-management, transcript
  retrieval, and source-page scraping flows that the static MVP can't honestly
  perform from a browser.
- The dev-server in `apps/worker/dev-server.mjs` (2,331 lines) mixes six concerns
  in one file and includes an SSRF surface (it fetches arbitrary URLs found in
  YouTube descriptions, no host allowlist).

Result: the cooking app — the actual product — is harder to read, slower to ship,
and dependent on infrastructure that doesn't exist yet, while the research tooling
is hard to use because it's tangled with UI code.

## Decision

**The static MVP is a cooking app for already-saved recipes. Imports, transcripts,
AI normalization, and YouTube research live in a separate research track that the
SPA build does not depend on.**

Concretely:

- The Vite build imports nothing from `data/youtube-recipes/`,
  `data/themealdb-recipes/`, or `data/baseline-recipes/` other than seed recipes
  promoted into `src/data/`.
- Research scripts and the experimental dev-server move under `tools/` (or stay
  in `scripts/` for the genuinely useful ones — see ADR 0002 when written).
- The import screen in the SPA keeps only the design-spec affordances: paste a
  URL, paste text, review the resulting `RecipeCandidate`. Channel-expansion,
  transcript-retrieval, and source-page UI come out.
- The transcript fetcher (the part of `apps/worker/dev-server.mjs` that demonstrably
  works) is preserved and lifted into `scripts/youtube/fetch-transcript.mjs` as a
  single-purpose CLI. It is a research tool, not a runtime dependency.
- A real Cloudflare Worker may exist later, when there is a paying customer, behind
  auth + entitlement + host allowlist + rate limits. `docs/import-backend-architecture.md`
  remains the design intent for that future surface.

## Alternatives considered

- **Keep the current bundling**: ship all research data with the app. Rejected:
  the bundle is ~10 MB of irrelevant data for a one-recipe demo, the SPA is
  harder to reason about, and the research data goes stale on disk anyway.
- **Promote the research pipeline to a real product surface now**: build the
  Worker, auth, rate limits, host allowlist, AI provider integration, etc.
  Rejected: the cooking app — the actual product — is not done yet. Building
  the production import path before the cooking app works is overscope.
- **Delete the research code**: the YouTube transcript fetcher and the YouTube
  Data API collector demonstrably work and have produced useful artifacts.
  Keep them, just isolate them from the SPA build.

## Consequences

Easier:

- The SPA can be reasoned about as a cooking app. `src/main.ts` shrinks; the
  bundle drops from ~10 MB to <1 MB.
- The research tools can evolve independently — no regression risk to the SPA.
- Future agents have a clean answer to "should this go in the build?" — only
  if it serves the cooking screens.

Harder:

- The import workbench UI loses some affordances. They were never spec'd by
  the design handoff anyway, but this is still removed work.
- When the Worker eventually ships, the bridging from `scripts/` to a real
  Worker is non-trivial. The transcript fetcher's HTTP plumbing will need to
  re-form into the Worker's runtime.

Follow-up work:

- Session 2 of the cleanup plan executes this decision: removes the research
  imports from `src/main.ts`, moves `apps/worker/` and research scripts under
  `tools/`, force-removes `data/youtube-recipes/raw/` from git.
- ADR 0002 will codify the boundary between `tools/` and the SPA build.

## References

- `internal/design_handoff_recipe_app/README.md` — five-screen design canon
- `docs/architecture.md` — phase plan
- `docs/import-backend-architecture.md` — the future Worker surface (not built)
- Repo audit, 2026-05-06 (see `session-log.md`)
