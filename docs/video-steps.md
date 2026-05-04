# Video Step Markers

## Goal

A recipe imported from YouTube should keep a usable connection to the original
video. Users should be able to jump from a recipe step to the relevant moment in
the video, and optionally add or adjust those markers themselves.

## Core Behavior

- Store the YouTube video as a `Source`.
- Store step-level `mediaAnchors` with timestamps.
- Let the recipe screen open the video at the selected step.
- Let cooking mode move through steps and update the video position.
- Let users add, edit, or remove markers manually.

## Data Shape

```json
{
  "sourceId": "src_youtube_123",
  "startSeconds": 312,
  "endSeconds": 384,
  "label": "Fold the dough",
  "confidence": "manual"
}
```

Confidence values:

- `manual`: user-created or user-confirmed.
- `imported`: came from video chapters, description timestamps, or source data.
- `estimated`: inferred from transcript or model output.

## YouTube URL Format

For opening outside the app:

```text
https://www.youtube.com/watch?v=VIDEO_ID&t=312s
```

For embedded web playback, use the YouTube IFrame Player API and seek to the
step timestamp.

For iOS, use a `WKWebView`/YouTube embed or open the YouTube app/browser at the
timestamp. Native playback should respect YouTube's platform terms.

## Import Sources For Markers

Possible marker sources:

- YouTube chapters.
- Timestamps in the video description.
- Timestamps in pinned comments if available later.
- User-pasted transcript with timestamps.
- LLM-estimated alignment between transcript and recipe steps.
- Manual user markers while watching.

The app should treat imported and estimated markers as editable suggestions.

## MVP UI

Recipe view:

- A small video button next to a step when a marker exists.
- Tapping opens/seeks the video at that timestamp.

Edit mode:

- "Set video marker" on each step.
- Current video time can be attached to the selected step.
- Marker labels default to the step title or first words of the step.

Cooking mode:

- Step navigation can seek the video when enabled.
- A setting controls whether moving to a step auto-seeks or only shows a jump
  button.
- Voice, gesture, or button commands such as "next step" and "repeat this step"
  should operate on the same cooking-mode command model.

## Open Questions

- Should web embed YouTube inline or always open a side panel?
- Should iOS open the YouTube app, Safari, or an in-app web view by default?
- Should markers support multiple source videos for one recipe?
- Should markers be versioned with steps? Recommendation: yes, because changing
  recipe steps can invalidate timestamps.
