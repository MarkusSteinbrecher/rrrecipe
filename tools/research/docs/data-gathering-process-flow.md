# Data Gathering Process Flow

## Goal

Build a repeatable pipeline that turns selected YouTube recipe sources into
reviewable recipe drafts.

The pipeline has six stages:

1. Backlog maintenance.
2. Source metadata collection.
3. Linked recipe page acquisition.
4. Transcript/text acquisition.
5. Recipe candidate creation.
6. QA review and promotion.

The first implementation stores the database in repo files. Production can move
the same entities into a real database later.

## Stage 1: Backlog Maintenance

The backlog defines which YouTube channels and videos we want to process. It is
stored in:

```text
data/youtube-recipes/backlog.json
```

YouTube videos always belong to a channel, so the backlog should be maintained
channel-first:

- `channels[]` is the primary backlog list.
- `videos[]` contains upload/video entries and should include `channelId`,
  `channelTitle`, and `channelHandle` whenever we know them.
- Manual one-off videos without channel metadata remain visible in the app under
  a fallback manual group until metadata collection links them to a channel.

### Add Individual Videos

Use this for specific videos we know we want:

```sh
npm run youtube:backlog -- add-video \
  --url 'https://www.youtube.com/watch?v=VIDEO_ID' \
  --channel-id UCLxplAwE9ijOwkKyEGeoZTQ \
  --channel-title "Food Language" \
  --channel-handle @food-language \
  --priority 1 \
  --notes "great focaccia candidate"
```

Quote YouTube URLs in zsh because `?` can be interpreted as a glob pattern.

Priority:

- `1`: process soon.
- `2`: high value.
- `3`: normal.
- `4+`: later.

### Add Channels

Use this when a whole creator/channel is useful:

```sh
npm run youtube:backlog -- add-channel \
  --channel @Food-Language \
  --priority 2 \
  --max-videos 200
```

Supported channel inputs:

- `@handle`
- channel ID such as `UC...`
- channel URL such as `https://www.youtube.com/@SomeHandle`
- channel URL such as `https://www.youtube.com/channel/UC...`

During local app development, the Import page can add a video or channel through
the local API when both servers are running:

```sh
npm run research:dev-api
VITE_RRRECIPE_IMPORT_API_URL=http://localhost:8787/api/import/refine npm run dev -- --host 127.0.0.1 --port 5175
```

The static GitHub Pages build cannot write repository files. Without the local
API, the UI shows the npm command needed to persist the source.

When the user pastes a video URL, the backend:

1. Parses the video ID.
2. Calls `videos.list` to get the video's metadata and `channelId`.
3. Looks up/enriches the channel with `channels.list`.
4. Creates the channel first if it is not already in `channels[]`.
5. Checks whether the video is already in `videos[]`.
6. Adds or updates the video under that channel.

Once a channel is in the backlog, the Import page shows a `retrieve videos`
button on that channel row. In local development this calls:

```text
POST /api/backlog/channels/expand
```

The backend resolves the channel with `channels.list`, reads the uploads
playlist with `playlistItems.list`, writes upload rows into
`backlog.videos`, and links each video back to the channel with `channelId`,
`channelTitle`, and `channelHandle`. The same local API call also batches the
upload IDs through `videos.list`, so video rows are stored with title,
description, thumbnails, duration, publish date, and stats immediately. The app
should not require a separate metadata retrieval step after channel expansion.

Channel metadata is also stored on the channel backlog item:

- title,
- description,
- handle and canonical YouTube URL,
- published date and country,
- subscriber/video/view counts when public,
- remote thumbnail URL,
- local thumbnail path.

The local backend stores channel images in:

```text
public/data/youtube-recipes/images/channels/
```

The app prefers the local image path and falls back to the remote YouTube
thumbnail URL if the local copy is not available.

If older backlog rows are missing metadata, local development can still call the
legacy enrichment endpoint:

```text
POST /api/backlog/channels/videos/enrich
```

The backend batches video IDs into `videos.list` calls with up to 50 IDs per
request and updates each `backlog.videos[]` row with:

- title,
- description,
- published date,
- thumbnail URL,
- ISO duration and parsed seconds,
- view/like/comment counts,
- channel fields.

### Expand Channel Uploads

To turn a channel backlog item into video backlog items:

```sh
npm run youtube:expand-channel -- --channel @Food-Language --max-videos 200
```

This uses the official YouTube API path:

1. `channels.list` with `forHandle` or `id`.
2. Read `contentDetails.relatedPlaylists.uploads`.
3. Page through uploads with `playlistItems.list`.
4. Add each upload to `backlog.videos` with the parent channel fields.

This is possible through the official API. It is the preferred way to extract
all videos from a known channel.

References:

- `channels.list` supports `forHandle`, `id`, and `contentDetails`.
  https://developers.google.com/youtube/v3/docs/channels/list
- Channel `contentDetails.relatedPlaylists.uploads` identifies the uploads
  playlist.
  https://developers.google.com/youtube/v3/docs/channels
- `playlistItems.list` retrieves all items from a playlist, including uploads
  playlists.
  https://developers.google.com/youtube/v3/docs/playlistItems/list

## Stage 2: Source Metadata Collection

Once the backlog exists, collect all metadata we can get through the YouTube
Data API:

- title,
- channel,
- description,
- thumbnails,
- published date,
- duration,
- view/like/comment counts,
- tags,
- public status,
- source URL.

Current command for broad discovery:

```sh
npm run youtube:collect -- --target 500
```

This writes:

```text
data/youtube-recipes/catalog.json
```

The catalog is a source database, not a recipe database. A row in
`catalog.json` means "we know this video exists and have metadata." It does not
mean the recipe has been extracted.

### Backlog vs Catalog

Use `backlog.json` for intent:

- "I want this video."
- "I want this channel."
- "Process this next."

Use `catalog.json` for collected source facts:

- "This video has this title, description, duration, and view count."
- "This video currently ranks here by views."

Production mapping:

- `backlog_items`
- `youtube_videos`
- `youtube_video_stats`
- `youtube_channels`

## Stage 3: Linked Recipe Page Acquisition

For YouTube recipe videos, the first extraction step after metadata is to scan
the YouTube description for likely recipe-page URLs. These are usually more
structured and reliable than transcript text.

The local API writes parsed page records here:

```text
data/youtube-recipes/source-pages/VIDEO_ID/PAGE_SLUG.json
```

Each record stores:

- source URL,
- page title/site/description,
- extracted JSON-LD Recipe data when available,
- fallback visible-text parse when JSON-LD is missing,
- raw ingredient strings,
- raw instruction strings,
- a visible text sample for debugging.

The matching `backlog.videos[]` row gets a `sourcePages` object with status,
page URLs, local paths, ingredient/step counts, and errors.

Current local endpoint:

```text
POST /api/backlog/videos/source-pages/retrieve
```

The Import page exposes this as `retrieve recipe pages`. `create draft` also
attempts this before transcript fallback.

Important limitation: YouTube Shopping/product shelf items are not exposed as
ingredient data through the public YouTube Data API. The useful ingredient path
is the video description's linked recipe pages, then transcript, then AI review.

## Stage 4: Transcript/Text Acquisition

Text inputs can come from several places.

### Available Now

1. YouTube description from metadata.
2. Experimental YouTube caption retrieval through the local Import API:

```text
data/youtube-recipes/transcripts/VIDEO_ID.txt             # raw caption text
data/youtube-recipes/transcripts/VIDEO_ID.json            # raw timed segments
data/youtube-recipes/transcripts/VIDEO_ID.sanitized.txt   # merged readable text
data/youtube-recipes/transcripts/VIDEO_ID.blocks.json     # merged timed blocks
```

The raw files preserve YouTube caption timing. The sanitized files merge adjacent
caption fragments into sentence-like blocks and are the default input for recipe
candidate creation.

3. Manually supplied transcript files through the Import page:

```text
data/youtube-recipes/transcripts/VIDEO_ID.txt
```

When a backlog video is expanded in the Import page, paste the transcript,
caption text, description, or NotebookLM summary into the transcript field and
click `save transcript`. The local API writes the transcript file and updates
the matching `backlog.videos[]` row with:

- `transcript.status = "manual"`
- `transcript.localPath`
- `transcript.language`
- `transcript.updatedAt`

4. Authorized captions for owned/authorized videos:

```sh
npm run youtube:captions -- --video-id VIDEO_ID --language en
```

Official YouTube caption download requires OAuth and permission to edit the
video. It is not a reliable path for arbitrary public cooking videos.

### Future Providers

- NotebookLM Enterprise / Gemini Enterprise if we have access.
- A paid transcript provider if its terms allow this use case.
- User-uploaded transcript files.
- User-pasted transcript text.

Avoid building the core product around unofficial YouTube transcript scraping.

## Stage 5: Recipe Candidate Creation

From the Import page, click `create draft` on a backlog video. The local API
uses the best available text to seed the local parser in this order:

1. linked recipe page ingredients/directions,
2. YouTube title and description when it contains recipe-like text,
3. sanitized saved transcript file,
4. raw saved transcript file,
5. YouTube title and description fallback.

When AI refinement is enabled, the API sends an evidence bundle rather than a
single source. The bundle can include linked recipe-page text, YouTube API
metadata/description, and saved transcript text.

It then creates a reviewable `RecipeCandidate`, optionally sends it through the
configured AI refinement endpoint, saves it in:

```text
data/youtube-recipes/candidates/VIDEO_ID.candidate.json
```

and updates the matching `backlog.videos[]` row with:

- `candidate.status = "needs_review"`
- `candidate.localPath`
- `candidate.generatedAt`
- `candidate.model`
- `candidate.warnings`

Unreviewed candidates stay on the Import page. They do not appear in Browse
until promoted with `save recipe`.

For batch AI input generation after metadata/transcript collection:

```sh
npm run youtube:build-ai-inputs
```

This writes AI input records:

```text
data/youtube-recipes/ai-inputs/youtube-recipe-ai-inputs.jsonl
```

Each AI input record contains:

- source URL,
- video/channel metadata,
- transcript when present,
- otherwise description,
- extraction task prompt.

The AI/parser should produce a `RecipeCandidate`, not a final recipe.

Candidate requirements:

- preserve raw ingredient lines,
- preserve source URL and video ID,
- keep timestamp/source evidence when available,
- include warnings for missing or ambiguous data,
- include confidence/quality signals,
- never auto-promote to a saved recipe without review.

Production mapping:

- `import_jobs`
- `recipe_candidates`
- `candidate_evidence`

## Stage 6: QA Review And Promotion

QA decides whether a `RecipeCandidate` becomes a real saved recipe.

QA can be:

- human review by us,
- AI review pass,
- both.

### Human QA

Reviewer checks:

- title is correct,
- ingredients are complete,
- quantities/units are plausible,
- steps are complete and ordered,
- timers/temperatures are correct,
- YouTube step markers are useful,
- source attribution is preserved,
- warnings are resolved or accepted.

### AI QA

AI review should be separate from AI extraction.

AI QA can score:

- ingredient completeness,
- step coherence,
- missing timers,
- measurement ambiguity,
- transcript/description evidence alignment,
- likely hallucinated content.

AI QA output should be stored as review metadata, not as silent truth.

### Promotion

Only promoted candidates become normal app data:

- `Recipe`
- `RecipeVersion`
- `RecipeVariant`
- `Source`

In the current app, promotion happens by opening a candidate in Import and
clicking `save recipe`.

## File Database Layout

Current:

```text
data/youtube-recipes/
  backlog.json
  catalog.json
  queries.json
  raw/             # ignored generated API responses
  source-pages/    # parsed linked recipe pages
  transcripts/     # ignored local transcript text
  ai-inputs/       # ignored generated AI input records
  candidates/      # generated RecipeCandidate JSON files
```

Later:

```text
data/youtube-recipes/
  qa/              # AI/human QA reports
  promoted/        # promoted recipe version snapshots
```

## Current Commands

Backlog:

```sh
npm run youtube:backlog -- add-video --url URL --priority 1
npm run youtube:backlog -- add-channel --channel @handle --max-videos 200
npm run youtube:backlog -- list
```

Channel expansion:

```sh
npm run youtube:expand-channel -- --channel @handle --max-videos 200
```

Broad catalog collection:

```sh
npm run youtube:collect -- --target 500
```

AI input creation:

```sh
npm run youtube:build-ai-inputs
```

Authorized captions:

```sh
npm run youtube:captions -- --video-id VIDEO_ID --language en
```

Local Import page candidate flow:

```text
POST /api/backlog/videos/transcript
POST /api/backlog/videos/source-pages/retrieve
POST /api/backlog/videos/candidate
```

## Next Implementation Steps

1. Add backlog items for the first target channels/videos.
2. Test `youtube:expand-channel` with one real channel.
3. Add batch processing for linked recipe pages.
4. Add candidate JSON output per video.
5. Add QA report JSON output per candidate.
6. Add an app screen/filter for backlog/catalog/candidate status.
