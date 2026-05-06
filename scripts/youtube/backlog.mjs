import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const backlogPath = resolve(repoRoot, "data/youtube-recipes/backlog.json");

const command = process.argv[2];

if (!command || !["add-video", "add-channel", "list"].includes(command)) {
  usage();
  process.exit(command ? 1 : 0);
}

const backlog = await readBacklog();

if (command === "add-video") {
  const url = requiredArg("--url");
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) throw new Error(`Could not parse video ID from ${url}`);
  const existing = backlog.videos.find((item) => item.videoId === videoId);
  const entry = {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    channelId: argValue("--channel-id") ?? existing?.channelId,
    channelTitle: argValue("--channel-title") ?? existing?.channelTitle,
    channelHandle: argValue("--channel-handle") ?? existing?.channelHandle,
    status: "backlog",
    priority: Number(argValue("--priority") ?? existing?.priority ?? 3),
    notes: argValue("--notes") ?? existing?.notes ?? "",
    source: argValue("--source") ?? existing?.source ?? "manual",
    addedAt: existing?.addedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsert(backlog.videos, "videoId", entry);
  await writeBacklog(backlog);
  console.log(`Backlog video saved: ${entry.videoId}`);
}

if (command === "add-channel") {
  const input = requiredArg("--channel");
  const parsed = parseChannelInput(input);
  const key = parsed.channelId ?? parsed.handle ?? input;
  const existing = backlog.channels.find((item) => item.channelId === parsed.channelId || item.handle === parsed.handle || item.input === input);
  const entry = {
    input,
    channelId: parsed.channelId ?? existing?.channelId,
    handle: parsed.handle ?? existing?.handle,
    url: parsed.url,
    status: "backlog",
    priority: Number(argValue("--priority") ?? existing?.priority ?? 3),
    maxVideos: Number(argValue("--max-videos") ?? existing?.maxVideos ?? 500),
    notes: argValue("--notes") ?? existing?.notes ?? "",
    addedAt: existing?.addedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const index = backlog.channels.findIndex((item) => item.channelId === key || item.handle === key || item.input === input);
  if (index >= 0) backlog.channels[index] = entry;
  else backlog.channels.push(entry);
  await writeBacklog(backlog);
  console.log(`Backlog channel saved: ${entry.channelId ?? entry.handle ?? entry.input}`);
}

if (command === "list") {
  console.log(JSON.stringify({
    videos: backlog.videos.length,
    channels: backlog.channels.length,
    topVideos: backlog.videos.slice(0, 10),
    topChannels: backlog.channels.slice(0, 10),
  }, null, 2));
}

async function readBacklog() {
  try {
    return JSON.parse(await readFile(backlogPath, "utf8"));
  } catch {
    return { schemaVersion: 1, updatedAt: null, videos: [], channels: [] };
  }
}

async function writeBacklog(backlog) {
  backlog.updatedAt = new Date().toISOString();
  backlog.videos.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  backlog.channels.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  await mkdir(dirname(backlogPath), { recursive: true });
  await writeFile(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);
}

function upsert(items, key, entry) {
  const index = items.findIndex((item) => item[key] === entry[key]);
  if (index >= 0) items[index] = entry;
  else items.push(entry);
}

function parseYouTubeVideoId(input) {
  try {
    const url = new URL(input.match(/https?:\/\/\S+/)?.[0] ?? input);
    if (url.hostname.includes("youtu.be")) return cleanVideoId(url.pathname.slice(1));
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return cleanVideoId(url.searchParams.get("v") ?? "");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) return cleanVideoId(url.pathname.split("/")[2] ?? "");
    }
  } catch {
    return cleanVideoId(input);
  }
  return undefined;
}

function parseChannelInput(input) {
  const clean = input.trim();
  try {
    const url = new URL(clean);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return { handle: parts[0], url: clean };
    if (parts[0] === "channel" && parts[1]) return { channelId: parts[1], url: clean };
    return { url: clean };
  } catch {
    if (clean.startsWith("@")) return { handle: clean };
    if (/^UC[\w-]{20,}$/.test(clean)) return { channelId: clean };
    return { handle: clean.startsWith("@") ? clean : `@${clean}` };
  }
}

function cleanVideoId(value) {
  return value?.match(/^[\w-]{11}/)?.[0];
}

function argValue(name) {
  const arg = process.argv.find((item) => item === name || item.startsWith(`${name}=`));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  return process.argv[process.argv.indexOf(arg) + 1];
}

function requiredArg(name) {
  const value = argValue(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function usage() {
  console.log(`Usage:
  npm run youtube:backlog -- add-video --url URL [--priority 1] [--notes "..."]
  npm run youtube:backlog -- add-channel --channel @handle|CHANNEL_ID|URL [--max-videos 500]
  npm run youtube:backlog -- list`);
}
