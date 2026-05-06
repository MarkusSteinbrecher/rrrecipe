import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevVars } from "../lib/env.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

loadDevVars(resolve(repoRoot, ".dev.vars"));

const apiKey = process.env.YOUTUBE_API_KEY;
const target = Number(argValue("--target") ?? 500);
const maxPagesPerQuery = Number(argValue("--pages-per-query") ?? 10);
const dataDir = resolve(repoRoot, "data/youtube-recipes");
const rawDir = `${dataDir}/raw`;
const catalogPath = `${dataDir}/catalog.json`;
const queriesPath = `${dataDir}/queries.json`;

if (!apiKey) {
  console.error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before collecting.");
  process.exit(1);
}

await mkdir(rawDir, { recursive: true });

const queries = JSON.parse(await readFile(queriesPath, "utf8"));
const discovered = new Map();
const runStartedAt = new Date().toISOString();

for (const query of queries) {
  let pageToken;
  for (let page = 0; page < maxPagesPerQuery; page += 1) {
    const search = await youtubeGet("https://www.googleapis.com/youtube/v3/search", {
      part: "snippet",
      type: "video",
      q: query,
      order: "viewCount",
      videoEmbeddable: "true",
      relevanceLanguage: "en",
      safeSearch: "none",
      maxResults: "50",
      pageToken,
    });
    await writeJson(`${rawDir}/search-${slug(query)}-${page + 1}.json`, search);

    const ids = search.items?.map((item) => item.id?.videoId).filter(Boolean) ?? [];
    const details = await fetchVideoDetails(ids);
    await writeJson(`${rawDir}/videos-${slug(query)}-${page + 1}.json`, details);

    for (const item of details.items ?? []) {
      const record = toRecord(item, query);
      if (!record) continue;
      const existing = discovered.get(record.videoId);
      if (!existing || record.viewCount > existing.viewCount) {
        discovered.set(record.videoId, {
          ...existing,
          ...record,
          discoveredBy: Array.from(new Set([...(existing?.discoveredBy ?? []), query])),
        });
      }
    }

    const likelyCount = Array.from(discovered.values()).filter((record) => isLikelyRecipe(record)).length;
    console.log(`${query}: page ${page + 1}, discovered ${discovered.size}, likely ${likelyCount}`);
    pageToken = search.nextPageToken;
    if (!pageToken) break;
  }
  const likelyCount = Array.from(discovered.values()).filter((record) => isLikelyRecipe(record)).length;
  if (likelyCount >= target * 1.25) break;
}

const records = Array.from(discovered.values())
  .filter((record) => isLikelyRecipe(record))
  .sort((a, b) => b.viewCount - a.viewCount)
  .slice(0, target)
  .map((record, index) => ({ rank: index + 1, ...record }));

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  targetCount: target,
  sort: "viewCount_desc",
  source: "YouTube Data API search.list + videos.list",
  run: {
    startedAt: runStartedAt,
    queries,
    maxPagesPerQuery,
  },
  records,
};

await writeJson(catalogPath, catalog);
console.log(`Wrote ${records.length} records to ${relativeToRepo(catalogPath)}`);

async function fetchVideoDetails(ids) {
  const items = [];
  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    if (!chunk.length) continue;
    const response = await youtubeGet("https://www.googleapis.com/youtube/v3/videos", {
      part: "snippet,statistics,contentDetails,status,topicDetails",
      id: chunk.join(","),
      maxResults: "50",
    });
    items.push(...(response.items ?? []));
  }
  return { items };
}

function toRecord(item, query) {
  const videoId = item.id;
  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  if (!videoId || item.status?.privacyStatus !== "public") return undefined;
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: snippet.title ?? "",
    channelId: snippet.channelId ?? "",
    channelTitle: snippet.channelTitle ?? "",
    publishedAt: snippet.publishedAt ?? "",
    description: snippet.description ?? "",
    thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url,
    durationIso8601: item.contentDetails?.duration ?? "",
    durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
    viewCount: Number(stats.viewCount ?? 0),
    likeCount: Number(stats.likeCount ?? 0),
    commentCount: Number(stats.commentCount ?? 0),
    tags: snippet.tags ?? [],
    discoveredBy: [query],
    transcript: {
      status: "not_collected",
      localPath: `data/youtube-recipes/transcripts/${videoId}.txt`,
      notes: "Official caption download is only available for owned/authorized videos. Add allowed transcript text manually or via an approved provider.",
    },
  };
}

function isLikelyRecipe(record) {
  const text = `${record.title} ${record.description} ${record.tags.join(" ")}`.toLowerCase();
  const positive = /\b(recipe|recipes|how to make|how to cook|cook|cooking|bake|baking|ingredients|dinner|meal prep|bread|cake|pasta|soup|chicken|vegan|vegetarian)\b/.test(text);
  const instructionSignal = /\b(ingredients|method|instructions|preheat|add|mix|bake|cook|boil|fry|roast|knead|stir)\b/.test(text);
  const negative = /\b(mukbang|asmr|eating challenge|compilation|reaction|restaurant|street food tour|stick ice cream|popsicle|factory|village|colorful)\b/.test(text);
  return positive && instructionSignal && !negative && record.durationSeconds >= 90;
}

async function youtubeGet(base, params) {
  const url = new URL(base);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`YouTube API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function parseIsoDuration(value) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function argValue(name) {
  const arg = process.argv.find((item) => item === name || item.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  return process.argv[process.argv.indexOf(arg) + 1];
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToRepo(path) {
  return path.replace(`${repoRoot}/`, "");
}
