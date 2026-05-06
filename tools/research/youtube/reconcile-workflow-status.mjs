import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
const transcriptDir = "data/youtube-recipes/transcripts";
const candidateDir = "data/youtube-recipes/candidates";
const backlog = JSON.parse(readFileSync(backlogPath, "utf8"));
const now = new Date().toISOString();
let changed = 0;

for (const video of backlog.videos ?? []) {
  const transcript = transcriptFiles(video.videoId);
  if (transcript.rawText || transcript.rawJson || transcript.sanitizedText || transcript.blocksJson) {
    video.transcript ??= {};
    const before = JSON.stringify(video.transcript);
    video.transcript.status = video.transcript.status === "manual" || video.transcript.status === "authorized_caption" ? video.transcript.status : "provider";
    video.transcript.localPath = video.transcript.localPath ?? transcript.rawText;
    video.transcript.jsonPath = video.transcript.jsonPath ?? transcript.rawJson;
    video.transcript.sanitizedPath = video.transcript.sanitizedPath ?? transcript.sanitizedText;
    video.transcript.blocksPath = video.transcript.blocksPath ?? transcript.blocksJson;
    video.transcript.source = video.transcript.source ?? "youtube_internal_captions";
    video.transcript.updatedAt = video.transcript.updatedAt ?? now;
    const blocks = readBlocks(transcript.blocksJson);
    if (blocks) video.transcript.blockCount = video.transcript.blockCount ?? blocks.blockCount ?? blocks.blocks?.length;
    if (JSON.stringify(video.transcript) !== before) {
      video.updatedAt = now;
      changed += 1;
    }
  }

  const candidatePath = `${candidateDir}/${safeFilename(video.videoId)}.candidate.json`;
  if (existsSync(candidatePath)) {
    video.candidate ??= {};
    const before = JSON.stringify(video.candidate);
    video.candidate.status = video.candidate.status && video.candidate.status !== "not_started" ? video.candidate.status : "needs_review";
    video.candidate.localPath = video.candidate.localPath ?? candidatePath;
    video.candidate.generatedAt = video.candidate.generatedAt ?? now;
    if (JSON.stringify(video.candidate) !== before) {
      video.updatedAt = now;
      changed += 1;
    }
  }
}

if (changed) {
  backlog.updatedAt = now;
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);
}

console.log(`Reconciled ${changed} backlog video workflow records.`);

function transcriptFiles(videoId) {
  const base = `${transcriptDir}/${safeFilename(videoId)}`;
  return {
    rawText: existsSync(`${base}.txt`) ? `${base}.txt` : undefined,
    rawJson: existsSync(`${base}.json`) ? `${base}.json` : undefined,
    sanitizedText: existsSync(`${base}.sanitized.txt`) ? `${base}.sanitized.txt` : undefined,
    blocksJson: existsSync(`${base}.blocks.json`) ? `${base}.blocks.json` : undefined,
  };
}

function readBlocks(path) {
  if (!path || !existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function safeFilename(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, "_");
}
