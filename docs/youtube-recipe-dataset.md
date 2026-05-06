# YouTube Recipe Dataset Plan

## Goal

Build a file-backed research database of at least 500 YouTube recipe videos,
prioritized by view count, then use that data to drive recipe extraction and AI
normalization.

## Current Implementation

Scripts:

- `npm run youtube:collect -- --target 500`
- `npm run youtube:build-ai-inputs`
- `npm run youtube:captions -- --video-id VIDEO_ID --language en`

Files:

- `data/youtube-recipes/queries.json`
- `data/youtube-recipes/catalog.json`
- `data/youtube-recipes/README.md`

Generated/ignored directories:

- `data/youtube-recipes/raw/`
- `data/youtube-recipes/transcripts/`
- `data/youtube-recipes/ai-inputs/`

## Collection Flow

1. Search YouTube with recipe-oriented queries.
2. Use `order=viewCount` in `search.list` to discover high-view candidates.
3. Fetch details with `videos.list`.
4. Read real `statistics.viewCount`.
5. Deduplicate by `videoId`.
6. Filter likely recipe videos.
7. Sort by `viewCount` descending.
8. Store top 500 in `catalog.json`.

The collector uses the official YouTube Data API. Add this to `.dev.vars`:

```text
YOUTUBE_API_KEY=...
```

Then run:

```sh
npm run youtube:collect -- --target 500
```

Optional:

```sh
npm run youtube:collect -- --target 500 --pages-per-query 6
```

## Transcript Strategy

We should not build the core dataset around unofficial transcript scraping.
Official YouTube caption download requires OAuth authorization and permission to
edit the video. For arbitrary public recipe videos, transcript availability is
therefore provider-dependent.

Supported local inputs:

- Description from YouTube metadata.
- Manually supplied transcript files:

```text
data/youtube-recipes/transcripts/VIDEO_ID.txt
```

- Official authorized captions:

```sh
npm run youtube:captions -- --video-id VIDEO_ID --language en
```

This requires:

```text
YOUTUBE_OAUTH_TOKEN=...
```

The OAuth token must belong to a user/account with permission to edit the video.

Future providers:

- NotebookLM Enterprise/Gemini Enterprise.
- A paid transcript provider if its terms allow this use case.
- User upload/paste workflows.

## AI Input Flow

After collecting metadata and adding any allowed transcripts:

```sh
npm run youtube:build-ai-inputs
```

This writes:

```text
data/youtube-recipes/ai-inputs/youtube-recipe-ai-inputs.jsonl
```

Each record contains:

- video source metadata,
- view rank,
- transcript text if present,
- otherwise video description,
- task instruction for producing a `RecipeCandidate`.

## File Database Shape

`catalog.json` is the committed source index:

```ts
type YouTubeRecipeCatalog = {
  schemaVersion: 1;
  generatedAt: string | null;
  targetCount: number;
  sort: "viewCount_desc";
  source: string;
  records: YouTubeRecipeVideo[];
};

type YouTubeRecipeVideo = {
  rank: number;
  videoId: string;
  url: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnailUrl?: string;
  durationIso8601: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  discoveredBy: string[];
  transcript: {
    status: "not_collected" | "manual" | "authorized_caption" | "provider" | "unavailable";
    localPath: string;
    notes: string;
  };
};
```

## Production Mapping

Later production storage can map directly from this file database:

- `youtube_videos`: one row per `videoId`.
- `youtube_video_stats`: periodically refreshed view/like/comment counts.
- `transcript_sources`: provider, status, language, timestamps, retention.
- `import_jobs`: AI extraction runs and warnings.
- `recipe_candidates`: reviewable normalized candidates.

Do not store full third-party transcripts permanently unless the provider terms,
user consent, and product policy allow it.

## Current Blocker

I cannot collect the 500 live records until `YOUTUBE_API_KEY` is present in
`.dev.vars`. The code path is ready; without the key the official API cannot be
called.

Relevant official docs:

- Search endpoint quota and parameters:
  https://developers.google.com/youtube/v3/docs/search/list
- Video statistics endpoint:
  https://developers.google.com/youtube/v3/docs/videos/list
- Caption download authorization:
  https://developers.google.com/youtube/v3/docs/captions/download
