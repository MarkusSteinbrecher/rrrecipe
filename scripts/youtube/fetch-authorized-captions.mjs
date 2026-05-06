import { mkdir, writeFile } from "node:fs/promises";
import { loadDevVars } from "../lib/env.mjs";

loadDevVars();

const oauthToken = process.env.YOUTUBE_OAUTH_TOKEN;
const videoId = argValue("--video-id");
const language = argValue("--language");
const outDir = "data/youtube-recipes/transcripts";

if (!oauthToken) {
  console.error("Missing YOUTUBE_OAUTH_TOKEN. Official caption download requires OAuth and permission to edit the video.");
  process.exit(1);
}

if (!videoId) {
  console.error("Usage: npm run youtube:captions -- --video-id VIDEO_ID [--language en]");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const tracks = await youtubeGet("https://www.googleapis.com/youtube/v3/captions", {
  part: "snippet",
  videoId,
});

const track = selectTrack(tracks.items ?? [], language);
if (!track) {
  console.error(`No caption track found for ${videoId}${language ? ` language=${language}` : ""}`);
  process.exit(1);
}

const transcript = await downloadCaption(track.id);
const path = `${outDir}/${videoId}.txt`;
await writeFile(path, normalizeCaptionText(transcript));
console.log(`Wrote ${path}`);

async function youtubeGet(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { authorization: `Bearer ${oauthToken}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function downloadCaption(captionId) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/captions/${captionId}`);
  url.searchParams.set("tfmt", "srt");
  const response = await fetch(url, { headers: { authorization: `Bearer ${oauthToken}` } });
  const body = await response.text();
  if (!response.ok) throw new Error(`YouTube captions download ${response.status}: ${body}`);
  return body;
}

function selectTrack(items, preferredLanguage) {
  if (preferredLanguage) {
    return items.find((item) => item.snippet?.language === preferredLanguage);
  }
  return items.find((item) => item.snippet?.trackKind === "standard") ?? items[0];
}

function normalizeCaptionText(value) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !/^\d+$/.test(line.trim()))
    .filter((line) => !/^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

function argValue(name) {
  const arg = process.argv.find((item) => item === name || item.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  return process.argv[process.argv.indexOf(arg) + 1];
}
