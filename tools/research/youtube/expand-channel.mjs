import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevVars } from "../lib/env.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadDevVars(resolve(repoRoot, ".dev.vars"));

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before expanding channels.");
  process.exit(1);
}

const backlogPath = resolve(repoRoot, "data/youtube-recipes/backlog.json");
const channelInput = argValue("--channel");
const maxVideos = Number(argValue("--max-videos") ?? 500);

const backlog = JSON.parse(await readFile(backlogPath, "utf8"));
const channelEntry = channelInput
  ? findChannel(backlog.channels, channelInput)
  : backlog.channels.find((item) => item.status === "backlog");

if (!channelEntry) {
  console.error("No matching backlog channel found.");
  process.exit(1);
}

const channel = await resolveChannel(channelEntry);
const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
if (!uploadsPlaylistId) throw new Error(`No uploads playlist for ${channel.id}`);

const videos = await collectUploads(uploadsPlaylistId, maxVideos);
for (const video of videos) {
  const existing = backlog.videos.find((item) => item.videoId === video.videoId);
  const entry = {
    videoId: video.videoId,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    channelId: channel.id,
    channelTitle: channel.snippet?.title,
    channelHandle: channel.snippet?.customUrl ?? channelEntry.handle,
    status: "backlog",
    priority: channelEntry.priority ?? 3,
    notes: `From channel ${channel.snippet?.title ?? channel.id}`,
    source: "channel_uploads",
    addedAt: existing?.addedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, entry);
  else backlog.videos.push(entry);
}

Object.assign(channelEntry, {
  channelId: channel.id,
  handle: channel.snippet?.customUrl ?? channelEntry.handle,
  title: channel.snippet?.title,
  uploadsPlaylistId,
  status: "expanded",
  expandedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

backlog.updatedAt = new Date().toISOString();
backlog.videos.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
await mkdir(dirname(backlogPath), { recursive: true });
await writeFile(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

console.log(`Expanded ${channel.snippet?.title ?? channel.id}: added/updated ${videos.length} videos`);

async function resolveChannel(entry) {
  const params = { part: "snippet,contentDetails,statistics" };
  if (entry.channelId) params.id = entry.channelId;
  else if (entry.handle) params.forHandle = entry.handle.replace(/^@/, "");
  else throw new Error("Channel entry needs channelId or handle");
  const response = await youtubeGet("https://www.googleapis.com/youtube/v3/channels", params);
  const channel = response.items?.[0];
  if (!channel) throw new Error(`Channel not found: ${entry.channelId ?? entry.handle}`);
  return channel;
}

async function collectUploads(playlistId, limit) {
  const videos = [];
  let pageToken;
  while (videos.length < limit) {
    const response = await youtubeGet("https://www.googleapis.com/youtube/v3/playlistItems", {
      part: "snippet,contentDetails,status",
      playlistId,
      maxResults: "50",
      pageToken,
    });
    for (const item of response.items ?? []) {
      const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      videos.push({
        videoId,
        title: item.snippet?.title,
        publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt,
      });
      if (videos.length >= limit) break;
    }
    pageToken = response.nextPageToken;
    if (!pageToken) break;
  }
  return videos;
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

function findChannel(channels, input) {
  return channels.find((item) =>
    item.channelId === input ||
    item.handle === input ||
    item.handle === (input.startsWith("@") ? input : `@${input}`) ||
    item.input === input ||
    item.url === input
  );
}

function argValue(name) {
  const arg = process.argv.find((item) => item === name || item.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  return process.argv[process.argv.indexOf(arg) + 1];
}
