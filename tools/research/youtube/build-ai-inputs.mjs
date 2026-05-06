import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = resolve(repoRoot, "data/youtube-recipes");
const catalogPath = `${dataDir}/catalog.json`;
const transcriptDir = `${dataDir}/transcripts`;
const outputDir = `${dataDir}/ai-inputs`;
const outputJsonl = `${outputDir}/youtube-recipe-ai-inputs.jsonl`;

await mkdir(outputDir, { recursive: true });

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const records = catalog.records ?? [];
const lines = [];

for (const record of records) {
  const transcript = await readOptional(`${transcriptDir}/${record.videoId}.txt`);
  const input = buildInput(record, transcript);
  const item = {
    schemaVersion: 1,
    videoId: record.videoId,
    rank: record.rank,
    url: record.url,
    title: record.title,
    channelTitle: record.channelTitle,
    viewCount: record.viewCount,
    sourceTextKind: transcript ? "transcript" : "description",
    sourceTextPath: transcript ? `${transcriptDir}/${record.videoId}.txt` : undefined,
    input,
    expectedOutput: "RecipeCandidate",
    warnings: transcript
      ? []
      : ["No transcript file found. AI input uses YouTube metadata and description only."],
  };
  lines.push(JSON.stringify(item));
}

await writeFile(outputJsonl, `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} AI input records to ${relativeToRepo(outputJsonl)}`);

function buildInput(record, transcript) {
  const parts = [
    `YouTube URL: ${record.url}`,
    `Video title: ${record.title}`,
    `Channel: ${record.channelTitle}`,
    `Published: ${record.publishedAt}`,
    `Views: ${record.viewCount}`,
    "",
    "Task:",
    "Extract a reviewable RecipeCandidate. Preserve raw ingredient lines. Do not invent missing recipe content. Attach warnings for missing or ambiguous data.",
    "",
  ];

  if (transcript) {
    parts.push("Transcript:", transcript.trim());
  } else {
    parts.push("Description:", record.description?.trim() || "(No description available)");
  }

  return parts.join("\n");
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function relativeToRepo(path) {
  return path.replace(`${repoRoot}/`, "");
}
