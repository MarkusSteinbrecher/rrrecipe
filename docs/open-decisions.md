# Open Decisions

## Product

- Is this a personal/private app first, or should it eventually support shared
  family libraries?
- Should recipes sync across devices in v1, or can v1 be local-first with JSON
  export/import?
- Should imported images be stored, hotlinked, or omitted by default?
- Is nutrition calculation in scope, or should it be deferred?
- Should the app support German and English from the start?

## Import

- Which model provider should run unstructured extraction?
- Do we want an OCR path for photos/PDFs in the first release?
- Should YouTube spoken-only recipes be supported via manual transcript first,
  or is automated transcription worth the legal/product complexity?
- How strict should the app be about source attribution and copyright notes?

## Technical

- Single repo with `apps/*` and `packages/*`, or start as one Vite app and split
  after the first importer works?
- Cloudflare D1/R2 for sync/storage, or another backend if collaboration becomes
  important?
- Auth strategy: private admin token for early development, passkeys, Sign in
  with Apple, Google, or email magic links?
- IndexedDB wrapper choice.
- Ingredient parser: simple local parser first, or adopt a specialized parser?

