# Session log

Per-session entries live in [`session-logs/`](session-logs/) as individual
files named `YYYY-MM-DD-NN-<slug>.md` (NN = sequence within the day,
zero-padded). One file per session keeps the log free of merge conflicts when
multiple agents/PRs land in parallel.

```sh
ls session-logs/                    # entries in chronological order
grep -rh '^# ' session-logs/        # one-line summary per entry
cat session-logs/2026-05-06-*.md    # full content for a date
```

Format inside each file: a level-1 heading `# YYYY-MM-DD — <one-line summary>`
followed by free-form prose (typical sections: *What was done*, *What changed
in the world*, *Open / next*). End every working session with a new file.

See [`~/Code/HQ/wiki/conventions/session-log.md`](https://github.com/MarkusSteinbrecher/HQ/blob/main/wiki/conventions/session-log.md)
for the cross-project convention. This project uses the directory shape
introduced in PR #13 (closes #12) — single-file `session-log.md` was
deprecated as a hot-conflict surface.
