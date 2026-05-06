# 2026-05-06 — Codex #2: SSRF host allowlist on the source-page extractor

What was done (PR `codex/ssrf-host-allowlist`, closes #2):

- Added `tools/lib/url-safety.mjs` exporting `validateExternalUrl(url)`
  and `readResponseTextWithLimit(response, maxBytes)`. The validator:
  rejects non-http/https schemes, embedded credentials, and a default
  deny set (`localhost`); resolves the hostname via
  `node:dns/promises`; rejects every IPv4 private/loopback/link-local
  family + `0.0.0.0`, IPv6 `::`/`::1`/`fe80::/10`/`fc00::/7`, and
  IPv4-mapped-IPv6 addresses (`::ffff:127.0.0.1` and the hex form).
  Body-size cap requires a `content-length` header and aborts mid-stream
  if the cap is exceeded.
- Applied the validator at both call sites that fetch user-supplied URLs
  in `tools/import-dev-server/dev-server.mjs`:
  `fetchAndStoreRecipeSourcePage` (linked recipe pages found in YouTube
  descriptions — capped at 2 MB) and `downloadChannelImage` (channel
  avatars/banners from the YouTube Data API).
- Added `tools/lib/url-safety.test.mjs` covering: http/https accepted,
  ftp/file/javascript rejected, credentials rejected, every IPv4 private
  family rejected, public IPv4 accepted, malformed input rejected,
  body-size cap behavior.

Verified: `npm run typecheck` clean, `npm test` clean (existing tests +
the new url-safety suite), `npm run build` clean. No SPA bundle change.
