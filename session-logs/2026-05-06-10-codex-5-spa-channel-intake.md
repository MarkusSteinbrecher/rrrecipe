# 2026-05-06 — Codex #5: SPA channel intake offline guard

What was done (PR `codex/spa-channel-intake`, closes #5):

- Confirmed the existing wiring in `src/main.ts` already calls
  `addChannelToBacklog`, `retrieveChannelVideos`,
  `retrieveBacklogVideoTranscript`, and `processBacklogVideo` via
  `handleAction`. With the dev-server running, the four user actions
  (add channel, expand channel, open video, retrieve transcript +
  process candidate) fire correctly.
- Added an explicit offline empty state. When `hasBacklogEndpoint()`
  returns false, the YouTube panel reads "Import API offline. Start
  `npm run research:dev-api` on the workstation to add channels." and
  the pill in the section label says "import api offline" instead of
  "command fallback".
- Guarded `localDevApiBaseUrl()` in `src/importers/backlog.ts` against
  a missing `window` (vitest runs under node).
- Added `src/importers/backlog.test.ts` covering the offline path of
  `hasBacklogEndpoint()`.

Verified: `npm run typecheck` clean, `npm test` clean (tests +1),
`npm run build` clean. SPA bundle unchanged.
