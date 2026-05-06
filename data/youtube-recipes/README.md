# YouTube Recipe Dataset

This directory is the file-backed seed database for YouTube recipe research.

## Goals

- Collect at least 500 YouTube recipe videos.
- Prioritize by view count.
- Store stable source links and metadata in the repo.
- Prepare clean AI input files from metadata, descriptions, and allowed
  transcript providers.
- Avoid committing third-party full transcripts by default.

## Files

```text
queries.json              Search query set for collection.
catalog.json              Deduplicated ranked catalog.
raw/                      Raw API pages, ignored by git.
transcripts/              Local transcript text files, ignored by git.
ai-inputs/                Generated AI input JSONL/JSON files.
```

`catalog.json` is intended to be committed. It stores source metadata and links,
not full transcripts.

## Why Transcripts Are Separate

YouTube caption download through the official API requires authorization and the
user must have permission to edit the video. For arbitrary public recipe videos,
we should not build the core product around unofficial transcript scraping.

Allowed transcript inputs:

- user-pasted transcript,
- manually exported transcript file,
- official caption download for owned/authorized videos,
- future NotebookLM Enterprise/Gemini Enterprise provider if available,
- future paid transcript provider if terms allow our use case.

## Local Collection

Add a YouTube API key to `.dev.vars`:

```text
YOUTUBE_API_KEY=...
```

Collect metadata:

```sh
npm run youtube:collect -- --target 500
```

This uses:

- `search.list` with `order=viewCount` to discover candidates,
- `videos.list` to fetch statistics/content details,
- local de-duplication across queries,
- final ranking by `viewCount`.

## Transcript/AI Input Prep

Put allowed transcript text files here:

```text
data/youtube-recipes/transcripts/VIDEO_ID.txt
```

Then generate AI input:

```sh
npm run youtube:build-ai-inputs
```

The AI input prefers transcript text when present, otherwise it falls back to
video description and metadata.

## Production Database Later

The file shape maps directly to a later production database:

- `videoId` becomes primary key,
- metadata moves to SQL/D1/Postgres,
- transcript/provider status becomes a separate table,
- AI extraction jobs become import jobs,
- generated `RecipeCandidate` records stay versioned and reviewable.
