# TheMealDB Recipe Catalog

This directory stores a local snapshot of TheMealDB as a third recipe source
next to:

- `src/data/baseline-catalog.ts`: our own stable baseline recipes.
- `data/youtube-recipes/`: YouTube source backlog and candidates.

The catalog is generated with:

```sh
npm run themealdb:collect
```

The collector reads TheMealDB v1 `search.php?f=LETTER` endpoints with the public
developer test key `1`, normalizes the meal records, and writes
`catalog.json`.

TheMealDB documents key `1` for development or educational use. Public
production releases should use a supporter key.

Each record keeps source attribution fields:

- `id`
- `mealDbUrl`
- `apiUrl`
- `sourceUrl`
- `youtubeUrl`
- `thumbnailUrl`
- `category`
- `area`

The import page can load these records as reviewable recipe drafts.
