# Import Pipeline

## Principle

Every import should produce a reviewable `RecipeCandidate` with:

- normalized recipe fields,
- source URL and source type,
- evidence snippets or transcript segments,
- confidence per major field,
- warnings for missing or ambiguous data.

The app should never silently save a low-confidence AI extraction as if it were
ground truth.

## Source Types

### Recipe Websites

Preferred path:

1. Worker fetches the URL.
2. Extract `application/ld+json`.
3. Find Schema.org `Recipe` objects.
4. Normalize ingredients, instructions, times, yield, author, image, and tags.
5. Return a high-confidence candidate.

Fallback path:

1. Extract readable text from the page.
2. Ask an LLM to produce strict JSON matching our schema.
3. Attach evidence snippets and lower confidence.
4. Require review before saving.

### YouTube

Use YouTube as a source, but be careful about transcript access.

Reliable path:

1. Parse the video ID from the URL.
2. Fetch video title, channel, description, thumbnail, and duration through the
   official YouTube Data API.
3. Look for recipe-like structure in the description first.
4. If timestamps or chapters exist in the description, convert them into
   step/media anchor candidates.
5. If the user provides a transcript, normalize it through the same LLM pipeline
   and estimate step timestamps where confidence is high enough.

Allowed transcript paths:

- User pastes transcript text.
- User imports a transcript file.
- The user is the video owner and grants OAuth access to caption tracks.
- Manual NotebookLM workflow: user imports the YouTube URL into NotebookLM,
  asks it for a structured recipe, then pastes/exports the result into the app.

Avoid as a product dependency:

- Scraping unofficial YouTube transcript endpoints.
- Downloading YouTube audio for transcription without rights.
- Depending on NotebookLM automation unless an official API is available for the
  account and use case.

YouTube imports should preserve the video as a source even when the recipe text
comes from the description or a pasted transcript. The saved recipe can then
link individual steps back to video timestamps.

### Plain Text

1. User pastes text.
2. App runs local heuristics for title/ingredients/instructions.
3. LLM normalization runs if the structure is unclear.
4. User reviews and saves.

### PDFs, Photos, Screenshots

Phase 2+:

1. Upload file to Worker.
2. OCR/transcribe where needed.
3. Normalize into `RecipeCandidate`.
4. Preserve the original file reference if storage is enabled.

## Candidate JSON Shape

```json
{
  "title": "Example Recipe",
  "source": {
    "type": "youtube",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Original video title",
    "author": "Channel name"
  },
  "yield": { "quantity": 4, "unit": "servings", "raw": "Serves 4" },
  "times": {
    "prepMinutes": 20,
    "cookMinutes": 35,
    "totalMinutes": 55
  },
  "ingredients": [
    {
      "raw": "2 tbsp olive oil",
      "quantity": 2,
      "unit": "tbsp",
      "item": "olive oil"
    }
  ],
  "steps": [
    {
      "text": "Heat the oil in a large pan.",
      "timerSeconds": null
    }
  ],
  "tags": ["dinner"],
  "confidence": {
    "overall": 0.84,
    "ingredients": 0.9,
    "steps": 0.78
  },
  "warnings": []
}
```

## First Fixtures To Collect

- 5 recipe blogs with Schema.org JSON-LD.
- 5 recipe sites with messy or partial structured data.
- 5 YouTube videos whose descriptions contain ingredients.
- 5 YouTube videos where the recipe is only spoken.
- 3 PDFs or photographed recipes.
- 3 pasted family recipes with loose formatting.
