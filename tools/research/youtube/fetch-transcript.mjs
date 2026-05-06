#!/usr/bin/env node
// Single-purpose CLI: fetch a YouTube video's transcript via the public player
// API (HTML scrape -> INNERTUBE_API_KEY -> youtubei/v1/player -> caption track ->
// json3/XML), normalize segments to sentence blocks, and write four files under
// data/youtube-recipes/transcripts/<videoId>.* matching the dev-server output.
//
// Usage:
//   node tools/research/youtube/fetch-transcript.mjs --video-id SzECOCrCSWg
//   node tools/research/youtube/fetch-transcript.mjs --video-id SzECOCrCSWg --languages en,de
//   node tools/research/youtube/fetch-transcript.mjs --url 'https://youtu.be/SzECOCrCSWg'
//   node tools/research/youtube/fetch-transcript.mjs --video-id ... --out-dir custom/path
//
// Outputs:
//   <out-dir>/<videoId>.txt              raw caption text, one segment per line
//   <out-dir>/<videoId>.json             { segments, blocks, language, ... }
//   <out-dir>/<videoId>.sanitized.txt    normalized sentence blocks, one per line
//   <out-dir>/<videoId>.blocks.json      block array with timestamps
//
// Default <out-dir>: data/youtube-recipes/transcripts/
//
// Limitations match the dev-server's transcript path: not all videos have
// captions, generated captions can be incomplete, cloud IPs may be blocked,
// age-restricted videos require auth. This is not the official YouTube Data API.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTranscriptSegments, transcriptBlocksToText } from "../../lib/transcripts.mjs";
import { fetchYouTubeTranscript } from "../../lib/youtube-transcript.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const videoId = args.videoId ?? extractVideoId(args.url);
if (!videoId) {
  console.error("Missing --video-id or --url. Use --help for usage.");
  process.exit(2);
}

const languages = (args.languages ?? "en")
  .split(",")
  .map((language) => language.trim())
  .filter(Boolean);

const outDir = resolve(repoRoot, args.outDir ?? "data/youtube-recipes/transcripts");

try {
  console.error(`Fetching transcript for ${videoId} (languages: ${languages.join(", ")})...`);
  const result = await fetchYouTubeTranscript(videoId, languages);

  const blocks = normalizeTranscriptSegments(result.segments);
  const sanitized = transcriptBlocksToText(blocks);
  await mkdir(outDir, { recursive: true });

  const base = resolve(outDir, videoId);
  const outputs = {
    txt: `${base}.txt`,
    json: `${base}.json`,
    sanitized: `${base}.sanitized.txt`,
    blocks: `${base}.blocks.json`,
  };

  const generatedAt = new Date().toISOString();
  await Promise.all([
    writeFile(outputs.txt, `${result.text}\n`),
    writeFile(
      outputs.json,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt,
          videoId,
          language: result.language,
          languageCode: result.languageCode,
          isGenerated: result.isGenerated,
          isTranslatable: result.isTranslatable,
          translationLanguages: result.translationLanguages,
          warning: result.warning,
          segmentCount: result.segments.length,
          blockCount: blocks.length,
          segments: result.segments,
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(outputs.sanitized, `${sanitized}\n`),
    writeFile(
      outputs.blocks,
      // Match the envelope written by tools/import-dev-server/dev-server.mjs so
      // the two writers produce interchangeable files.
      `${JSON.stringify(
        {
          schemaVersion: 1,
          sourceTranscriptPath: outputs.json.replace(`${repoRoot}/`, ""),
          generatedAt,
          videoId,
          language: result.language,
          languageCode: result.languageCode,
          isGenerated: result.isGenerated,
          rawSegmentCount: result.segments.length,
          blockCount: blocks.length,
          blocks,
          text: sanitized,
        },
        null,
        2,
      )}\n`,
    ),
  ]);

  const relative = (path) => path.replace(`${repoRoot}/`, "");
  console.log(JSON.stringify(
    {
      videoId,
      language: result.language,
      languageCode: result.languageCode,
      isGenerated: result.isGenerated,
      segmentCount: result.segments.length,
      blockCount: blocks.length,
      paths: {
        txt: relative(outputs.txt),
        json: relative(outputs.json),
        sanitized: relative(outputs.sanitized),
        blocks: relative(outputs.blocks),
      },
    },
    null,
    2,
  ));
} catch (error) {
  console.error(`fetch-transcript failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }
    const match = token.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!match) continue;
    const [, rawName, inline] = match;
    const name = camelCase(rawName);
    const value = inline ?? argv[i + 1];
    if (inline === undefined) i += 1;
    result[name] = value;
  }
  return result;
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function extractVideoId(input) {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed.match(/https?:\/\/\S+/)?.[0] ?? trimmed);
    if (url.hostname.includes("youtu.be")) return cleanVideoId(url.pathname.slice(1));
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return cleanVideoId(url.searchParams.get("v") ?? "");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return cleanVideoId(url.pathname.split("/")[2] ?? "");
      }
    }
  } catch {
    return cleanVideoId(trimmed);
  }
  return undefined;
}

function cleanVideoId(value) {
  const trimmed = String(value).trim();
  return /^[a-zA-Z0-9_-]{6,}$/.test(trimmed) ? trimmed : undefined;
}

function usage() {
  return [
    "rrrecipe — fetch-transcript",
    "",
    "Fetches a YouTube video's caption track via the public player API and writes",
    "raw, sanitized, and block-normalized transcript files.",
    "",
    "Usage:",
    "  node tools/research/youtube/fetch-transcript.mjs --video-id <id> [--languages en,de] [--out-dir <path>]",
    "  node tools/research/youtube/fetch-transcript.mjs --url <youtube-url>     [--languages en,de]",
    "",
    "Defaults:",
    "  --languages   en",
    "  --out-dir     data/youtube-recipes/transcripts (resolved against the repo root)",
    "",
    "Limits: only public videos with captions; generated captions may be incomplete;",
    "age-restricted videos require auth (not supported); cloud IPs are sometimes blocked.",
    "",
  ].join("\n");
}
