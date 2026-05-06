import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTranscriptSegments, transcriptBlocksToText } from "../lib/transcripts.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const transcriptDir = resolve(repoRoot, "data/youtube-recipes/transcripts");
const args = parseArgs(process.argv.slice(2));
const files = args.videoId
  ? [`${safeFilename(args.videoId)}.json`]
  : (await readdir(transcriptDir)).filter((file) => file.endsWith(".json") && !file.endsWith(".blocks.json"));

let written = 0;
for (const file of files) {
  const inputPath = resolve(transcriptDir, file);
  const transcript = JSON.parse(await readFile(inputPath, "utf8"));
  const segments = transcript.segments ?? [];
  if (!segments.length) {
    console.log(`Skipped ${file}: no segments`);
    continue;
  }

  const blocks = normalizeTranscriptSegments(segments, {
    maxGapSeconds: args.maxGapSeconds,
    maxBlockChars: args.maxBlockChars,
  });
  const videoId = transcript.videoId ?? basename(file, ".json");
  const output = {
    schemaVersion: 1,
    sourceTranscriptPath: relativeToRepo(inputPath),
    generatedAt: new Date().toISOString(),
    videoId,
    language: transcript.language,
    languageCode: transcript.languageCode,
    isGenerated: transcript.isGenerated,
    rawSegmentCount: segments.length,
    blockCount: blocks.length,
    blocks,
    text: transcriptBlocksToText(blocks),
  };

  const outputPath = resolve(transcriptDir, `${safeFilename(videoId)}.blocks.json`);
  const textOutputPath = resolve(transcriptDir, `${safeFilename(videoId)}.sanitized.txt`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(textOutputPath, `${output.text}\n`);
  written += 1;
  console.log(`Wrote ${blocks.length} blocks from ${segments.length} segments to ${relativeToRepo(outputPath)} and ${relativeToRepo(textOutputPath)}`);
}

if (!written) console.log("No transcript block files written.");

function parseArgs(values) {
  const parsed = {
    maxGapSeconds: 1.2,
    maxBlockChars: 420,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--video-id") parsed.videoId = values[++index];
    if (value === "--max-gap-seconds") parsed.maxGapSeconds = Number(values[++index]);
    if (value === "--max-block-chars") parsed.maxBlockChars = Number(values[++index]);
  }
  return parsed;
}

function safeFilename(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, "_");
}

function relativeToRepo(path) {
  return path.replace(`${repoRoot}/`, "");
}
