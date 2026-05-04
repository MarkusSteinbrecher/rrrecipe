# Research Notes

Checked on 2026-05-04.

## NotebookLM

NotebookLM can import public YouTube URLs, websites, PDFs, audio files, Google
Docs, and other source types. Google documents YouTube import limits clearly:
only public YouTube videos with captions are supported, only transcript text is
imported, videos uploaded less than 72 hours earlier may not be available, and
videos without speech are unsupported.

This makes NotebookLM useful for manual exploration and a fallback workflow, but
not a stable product backend unless Google provides an official API for the
specific account type and use case.

Sources:

- https://support.google.com/notebooklm/answer/16164461
- https://support.google.com/notebooklm/answer/16215270

## YouTube

The official YouTube developer docs expose the YouTube Data API for public app
features such as metadata access. Caption download exists, but the current
official documentation says the request requires authorization and the user must
have permission to edit the video. That means third-party caption download
cannot be treated as the reliable import path for arbitrary cooking videos.

Sources:

- https://developers.google.com/youtube/documentation
- https://developers.google.com/youtube/v3/docs/captions/download

## Recipe Websites

Schema.org `Recipe` is the best first extraction target for recipe websites. It
covers core fields such as ingredients, instructions, prep/cook/total time,
yield, cuisine, category, nutrition, images, and video references.

Source:

- https://schema.org/Recipe

