import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevVars } from "../lib/env.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadDevVars(resolve(repoRoot, ".dev.vars"));

const apiKey = process.env.YOUTUBE_API_KEY;
const dataDir = resolve(repoRoot, "data/youtube-recipes");
const backlogPath = `${dataDir}/backlog.json`;
const outputDir = `${dataDir}/api-samples`;
const samplePath = `${outputDir}/youtube-video-api-sample.json`;
const inventoryPath = `${outputDir}/youtube-video-api-field-inventory.md`;

const publicVideoParts = [
  "snippet",
  "contentDetails",
  "statistics",
  "status",
  "topicDetails",
  "recordingDetails",
  "player",
  "localizations",
  "liveStreamingDetails",
  "paidProductPlacementDetails",
];

if (!apiKey) {
  console.error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before probing YouTube API data.");
  process.exit(1);
}

const backlog = JSON.parse(await readFile(backlogPath, "utf8"));
const selected = [
  ...selectChannelVideos("Andy Cooks", 5),
  ...selectChannelVideos("CupcakeJemma", 5),
];
const ids = selected.map((video) => video.videoId);
const response = await youtubeGet("https://www.googleapis.com/youtube/v3/videos", {
  part: publicVideoParts.join(","),
  id: ids.join(","),
  maxResults: "50",
});

const byId = new Map((response.items ?? []).map((item) => [item.id, item]));
const records = selected.map((source) => {
  const item = byId.get(source.videoId);
  return {
    selection: source,
    api: item ?? null,
    inventory: item ? inventoryForItem(item) : { presentParts: [], fieldPaths: [] },
    recipeSignals: item ? recipeSignals(item) : {},
  };
});

const sample = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "YouTube Data API videos.list",
  request: {
    part: publicVideoParts,
    ids,
    omittedOwnerOnlyParts: ["fileDetails", "processingDetails", "suggestions"],
  },
  notes: [
    "This is public API-key data only.",
    "The official YouTube Data API does not return arbitrary public video transcripts.",
    "Some requested parts only appear when applicable, for example liveStreamingDetails or localizations.",
  ],
  records,
};

await mkdir(outputDir, { recursive: true });
await writeFile(samplePath, `${JSON.stringify(sample, null, 2)}\n`);
await writeFile(inventoryPath, renderInventory(sample));

console.log(`Selected ${records.length} videos`);
console.log(`Wrote ${relativeToRepo(samplePath)}`);
console.log(`Wrote ${relativeToRepo(inventoryPath)}`);

function selectChannelVideos(channelTitle, count) {
  const videos = backlog.videos
    .filter((video) => video.channelTitle === channelTitle)
    .sort((a, b) => {
      const viewDelta = (b.viewCount ?? -1) - (a.viewCount ?? -1);
      if (viewDelta) return viewDelta;
      return a.addedAt.localeCompare(b.addedAt);
    });
  return videos.slice(0, count).map((video) => ({
    channelTitle,
    videoId: video.videoId,
    backlogTitle: video.title ?? null,
    backlogDescriptionLength: (video.description ?? "").length,
    backlogViewCount: video.viewCount ?? null,
    backlogDurationSeconds: video.durationSeconds ?? null,
    url: video.url,
  }));
}

async function youtubeGet(base, params) {
  const url = new URL(base);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function inventoryForItem(item) {
  const presentParts = publicVideoParts.filter((part) => item[part] !== undefined);
  return {
    presentParts,
    fieldPaths: collectPaths(item),
  };
}

function recipeSignals(item) {
  const description = item.snippet?.description ?? "";
  const tags = item.snippet?.tags ?? [];
  return {
    title: item.snippet?.title ?? "",
    channelTitle: item.snippet?.channelTitle ?? "",
    descriptionLength: description.length,
    descriptionHasIngredientsHeader: /\bingredients?\b/i.test(description),
    descriptionHasMethodHeader: /\b(method|instructions?|directions?|steps?)\b/i.test(description),
    tagCount: tags.length,
    durationIso8601: item.contentDetails?.duration,
    captionFlag: item.contentDetails?.caption,
    viewCount: numberOrNull(item.statistics?.viewCount),
    likeCount: numberOrNull(item.statistics?.likeCount),
    commentCount: numberOrNull(item.statistics?.commentCount),
  };
}

function collectPaths(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    if (child && typeof child === "object" && !Array.isArray(child)) {
      paths.push(...collectPaths(child, path));
    }
    if (Array.isArray(child) && child[0] && typeof child[0] === "object") {
      paths.push(...collectPaths(child[0], `${path}[]`));
    }
  }
  return Array.from(new Set(paths)).sort();
}

function renderInventory(sample) {
  const allPaths = Array.from(new Set(sample.records.flatMap((record) => record.inventory.fieldPaths))).sort();
  const lines = [
    "# YouTube Video API Field Inventory",
    "",
    `Generated: ${sample.generatedAt}`,
    "",
    "## Request",
    "",
    `Endpoint: \`videos.list\``,
    "",
    `Parts: \`${sample.request.part.join(",")}\``,
    "",
    "Owner-only parts intentionally omitted: `fileDetails`, `processingDetails`, `suggestions`.",
    "",
    "## Selected Videos",
    "",
    "| Channel | Video ID | Title | Description chars | Caption flag | Views |",
    "|---|---|---|---:|---|---:|",
    ...sample.records.map((record) => {
      const signals = record.recipeSignals;
      return `| ${escapeMd(record.selection.channelTitle)} | \`${record.selection.videoId}\` | ${escapeMd(signals.title ?? record.selection.backlogTitle ?? "")} | ${signals.descriptionLength ?? 0} | ${signals.captionFlag ?? ""} | ${signals.viewCount ?? ""} |`;
    }),
    "",
    "## Fields Observed In This Sample",
    "",
    ...allPaths.map((path) => `- \`${path}\``),
    "",
    "## Per-Video Recipe Signals",
    "",
    ...sample.records.flatMap((record) => [
      `### ${record.selection.channelTitle} - ${record.selection.videoId}`,
      "",
      `- Title: ${record.recipeSignals.title}`,
      `- Description length: ${record.recipeSignals.descriptionLength ?? 0}`,
      `- Ingredients header: ${record.recipeSignals.descriptionHasIngredientsHeader ? "yes" : "no"}`,
      `- Method/steps header: ${record.recipeSignals.descriptionHasMethodHeader ? "yes" : "no"}`,
      `- Caption flag: ${record.recipeSignals.captionFlag ?? ""}`,
      `- Present parts: ${record.inventory.presentParts.map((part) => `\`${part}\``).join(", ")}`,
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function relativeToRepo(path) {
  return path.replace(`${repoRoot}/`, "");
}
