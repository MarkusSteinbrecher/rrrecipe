# Development Setup

## Recommended Stack

### Web

- Vite
- TypeScript
- CSS modules or plain CSS to start
- IndexedDB wrapper for local recipe storage
- Vitest
- Playwright smoke tests

### Worker

- Cloudflare Workers
- Vitest with mocked `fetch`
- Optional D1/R2 only after sync or file storage is actually needed
- Model provider abstraction so import logic is not tied to one vendor

### iOS

- SwiftUI
- SwiftData or SQLite local cache
- XCTest
- XcodeGen project file, matching the `rrradio` pattern

## Initial Commands Once Ready To Scaffold

```sh
cd /Users/markus/Code/rrrecipe
npm create vite@latest apps/web -- --template vanilla-ts
cd apps/web
npm install
npm run dev
```

Worker scaffold can come after the web shell and schema fixtures exist:

```sh
cd /Users/markus/Code/rrrecipe
npm create cloudflare@latest apps/worker
```

Do not install dependencies until the repo structure and app name are confirmed.

## First Development Milestones

1. Create shared schema package with `Recipe`, `RecipeCandidate`, `Source`, and
   `ImportJob` types.
2. Add fixture-based tests for JSON-LD recipe extraction.
3. Build a local web recipe library using fixture data.
4. Add manual recipe editor.
5. Add import review screen.
6. Add Worker endpoint: `POST /api/import/url`.
7. Add YouTube metadata-only import.
8. Add transcript paste/import.
9. Add export/import JSON.
10. Start SwiftUI client once the JSON contracts are stable.

## Local Quality Gates

Expected once scaffolding exists:

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

For iOS later:

```sh
cd apps/ios
xcodegen
xcodebuild test -project RecipeApp.xcodeproj -scheme RecipeApp -destination 'platform=iOS Simulator,name=iPhone 16'
```
