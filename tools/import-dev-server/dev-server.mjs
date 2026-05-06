import http from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeTranscriptSegments, transcriptBlocksToText } from "../lib/transcripts.mjs";
import { fetchYouTubeTranscript } from "../lib/youtube-transcript.mjs";

loadDevVars();

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
const aiProvider = process.env.AI_PROVIDER ?? "mock";
const openRouterModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "rrrecipe-import-dev",
        mode: aiProvider === "openrouter" ? "openrouter" : "local-mock",
        model: aiProvider === "openrouter" ? openRouterModel : "local-mock/refine-v0",
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import/refine") {
      const payload = await readJson(request);
      sendJson(response, 200, await refineCandidate(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import/youtube") {
      const payload = await readJson(request);
      sendJson(response, 200, importYouTube(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/channels") {
      const payload = await readJson(request);
      sendJson(response, 200, await addBacklogSource(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/channels/expand") {
      const payload = await readJson(request);
      sendJson(response, 200, await expandBacklogChannel(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/channels/videos/enrich") {
      const payload = await readJson(request);
      sendJson(response, 200, await enrichBacklogVideos(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/videos/transcript") {
      const payload = await readJson(request);
      sendJson(response, 200, saveBacklogVideoTranscript(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/videos/transcript/retrieve") {
      const payload = await readJson(request);
      sendJson(response, 200, await retrieveBacklogVideoTranscript(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/videos/transcript/read") {
      const payload = await readJson(request);
      sendJson(response, 200, readBacklogVideoTranscript(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/videos/source-pages/retrieve") {
      const payload = await readJson(request);
      sendJson(response, 200, await retrieveBacklogVideoSourcePages(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/backlog/videos/candidate") {
      const payload = await readJson(request);
      sendJson(response, 200, await processBacklogVideoCandidate(payload));
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    sendJson(response, 500, {
      error: "local_import_api_error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(port, host, () => {
  console.log(`rrrecipe local import API listening on http://${host}:${port}`);
  console.log(`AI provider: ${aiProvider === "openrouter" ? `openrouter (${openRouterModel})` : "local mock"}`);
});

function loadDevVars() {
  try {
    const raw = readFileSync(".dev.vars", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] ??= value;
    }
  } catch {
    // Optional local file. The server runs in mock mode without it.
  }
}

function setCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", allowedOrigin);
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,authorization");
  response.setHeader("vary", "origin");
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function refineCandidate(payload) {
  if (aiProvider === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return refineCandidateWithOpenRouter(payload);
  }
  if (aiProvider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    const fallback = refineCandidateLocally(payload);
    fallback.usedFallback = true;
    fallback.warnings.unshift("AI_PROVIDER=openrouter is set, but OPENROUTER_API_KEY is missing. Used local mock instead.");
    return fallback;
  }
  return refineCandidateLocally(payload);
}

function refineCandidateLocally(payload) {
  const candidate = cloneCandidate(payload.candidate);
  const text = String(payload.input ?? "");
  const parsed = parseRecipeText(text);

  if (parsed.title && isGenericTitle(candidate.title)) candidate.title = parsed.title;
  if (parsed.ingredients.length > candidate.ingredients.length) candidate.ingredients = parsed.ingredients;
  if (parsed.steps.length > candidate.steps.length) candidate.steps = parsed.steps;

  candidate.confidence = {
    source: Math.max(candidate.confidence?.source ?? 0, 0.9),
    ingredients: parsed.ingredients.length ? 0.72 : candidate.confidence?.ingredients ?? 0.2,
    steps: parsed.steps.length ? 0.68 : candidate.confidence?.steps ?? 0.2,
    overall: parsed.ingredients.length && parsed.steps.length ? 0.7 : candidate.confidence?.overall ?? 0.3,
  };
  candidate.warnings = [
    ...withoutLocalParserWarnings(candidate.warnings ?? []),
    "Local backend mock refinement ran. This is contract testing only; no external AI provider was called.",
  ];

  return {
    candidate,
    model: "local-mock/refine-v0",
    usedFallback: true,
    warnings: ["Replace this mock with a real provider before production."],
  };
}

async function refineCandidateWithOpenRouter(payload) {
  const candidate = cloneCandidate(payload.candidate);
  const input = String(payload.input ?? "");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": "http://localhost:5175",
      "x-title": "rrrecipe local import dev",
    },
    body: JSON.stringify({
      model: openRouterModel,
      require_parameters: true,
      messages: [
        {
          role: "system",
          content: [
            "You convert gathered YouTube recipe evidence into a reviewable recipe import draft.",
            "Return only JSON matching the schema.",
            "Use all evidence sections, prioritizing linked recipe pages first, then YouTube description, then sanitized transcript.",
            "The description often contains ingredients but no method; when that happens, derive the ordered cooking method from the transcript.",
            "Create concise, actionable steps from narrated actions, grouping chatter into practical recipe steps.",
            "Preserve raw ingredient text exactly where possible, including ingredient section names.",
            "Add temperatures, timers, and media anchors when the transcript supports them.",
            "Do not invent ingredients or steps not supported by the input.",
            "Ignore sponsorships, channel promotion, product links, merch, social links, tasting reactions, and subscribe requests.",
            "If evidence is incomplete, return the best supported draft and add warnings explaining what is missing.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Create a final recipe candidate with ingredients and ordered preparation/execution steps. Use currentCandidate as a seed, but improve it from rawInput when rawInput has better evidence.",
            rawInput: input,
            currentCandidate: candidate,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: recipeCandidateResponseSchema(),
      },
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const fallback = refineCandidateLocally(payload);
    return {
      ...fallback,
      usedFallback: true,
      warnings: [`OpenRouter request failed with ${response.status}: ${JSON.stringify(body).slice(0, 240)}`],
    };
  }

  const content = body?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  const refined = normalizeAiCandidate(parsed?.candidate ?? parsed, candidate);
  return {
    candidate: refined,
    model: body?.model ?? openRouterModel,
    usedFallback: false,
    warnings: [
      "OpenRouter refinement ran locally. Review the AI draft before saving.",
      ...(parsed?.warnings ?? []),
    ],
  };
}

function importYouTube(payload) {
  const url = String(payload.url ?? "");
  const videoId = parseYouTubeVideoId(url);
  const source = {
    id: createId("source"),
    type: "youtube",
    url,
    retrievedAt: new Date().toISOString(),
    media: videoId
      ? {
          provider: "youtube",
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        }
      : undefined,
  };
  const parsed = parseRecipeText(String(payload.text ?? ""));
  const candidate = {
    id: createId("candidate"),
    source,
    title: parsed.title ?? "YouTube recipe import",
    language: "en",
    description: "Local backend mock import.",
    ingredients: parsed.ingredients,
    steps: parsed.steps,
    notes: [],
    tags: ["youtube"],
    confidence: {
      source: videoId ? 0.9 : 0.1,
      ingredients: parsed.ingredients.length ? 0.65 : 0.1,
      steps: parsed.steps.length ? 0.6 : 0.1,
      overall: videoId && parsed.ingredients.length && parsed.steps.length ? 0.65 : 0.2,
    },
    warnings: [
      "Local backend mock import ran. YouTube metadata, transcript extraction, and AI normalization are not implemented in this process yet.",
    ],
  };
  return { status: "needs_review", candidate, warnings: candidate.warnings };
}

async function addBacklogSource(payload) {
  const input = String(payload.source ?? payload.channel ?? payload.url ?? "").trim();
  if (!input) throw new Error("Missing source");
  const videoId = parseYouTubeVideoId(input);
  if (videoId) return addBacklogVideoSource(payload, input, videoId);
  return addBacklogChannelSource(payload, input);
}

async function addBacklogChannelSource(payload, input) {
  if (!input) throw new Error("Missing source");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const parsed = parseChannelInput(input);
  const existing = backlog.channels.find((item) =>
    (parsed.channelId && item.channelId === parsed.channelId) ||
    (parsed.handle && item.handle === parsed.handle) ||
    item.input === input ||
    item.url === parsed.url
  );
  const now = new Date().toISOString();
  const channel = {
    ...existing,
    input,
    url: parsed.url ?? existing?.url,
    channelId: parsed.channelId ?? existing?.channelId,
    handle: parsed.handle ?? existing?.handle,
    title: existing?.title,
    uploadsPlaylistId: existing?.uploadsPlaylistId,
    status: existing?.status ?? "backlog",
    priority: Number(payload.priority ?? existing?.priority ?? 3),
    maxVideos: Number(payload.maxVideos ?? existing?.maxVideos ?? 500),
    notes: String(payload.notes ?? existing?.notes ?? ""),
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
    expandedAt: existing?.expandedAt,
  };

  if (youtubeApiKey) {
    try {
      const youtubeChannel = await resolveYouTubeChannel(channel);
      await enrichBacklogChannel(channel, youtubeChannel);
    } catch (error) {
      channel.notes = [channel.notes, `Channel info lookup failed: ${error instanceof Error ? error.message : "unknown error"}`].filter(Boolean).join(" | ");
    }
  }

  const index = backlog.channels.findIndex((item) =>
    (channel.channelId && item.channelId === channel.channelId) ||
    (channel.handle && item.handle === channel.handle) ||
    item.input === input ||
    item.url === channel.url
  );
  if (index >= 0) backlog.channels[index] = channel;
  else backlog.channels.push(channel);

  backlog.updatedAt = now;
  backlog.channels.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  mkdirSync(dirname(backlogPath), { recursive: true });
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

  return {
    channel,
    persisted: true,
    status: existing ? "channel_exists" : "channel_added",
    message: existing
      ? `Channel already exists: ${channel.title ?? channel.handle ?? channel.input}.`
      : `Channel added: ${channel.title ?? channel.handle ?? channel.input}. Use retrieve videos to populate uploads.`,
    command: `npm run youtube:backlog -- add-channel --channel ${JSON.stringify(input)} --max-videos ${channel.maxVideos}`,
  };
}

async function addBacklogVideoSource(payload, input, videoId) {
  if (!youtubeApiKey) throw new Error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before adding videos from the UI.");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const now = new Date().toISOString();
  const videoResource = await resolveYouTubeVideo(videoId);
  const snippet = videoResource.snippet ?? {};
  const statistics = videoResource.statistics ?? {};
  const contentDetails = videoResource.contentDetails ?? {};
  const channelResource = await resolveYouTubeChannel({ channelId: snippet.channelId });
  const channel = await ensureBacklogChannel(backlog, channelResource, {
    priority: Number(payload.priority ?? 3),
    maxVideos: Number(payload.maxVideos ?? 500),
    now,
  });
  const existing = existingVideo(backlog.videos, videoId);
  const video = {
    ...existing,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: snippet.title ?? existing?.title,
    description: snippet.description ?? existing?.description,
    publishedAt: snippet.publishedAt ?? existing?.publishedAt,
    thumbnailUrl: bestThumbnailUrl(snippet.thumbnails) ?? existing?.thumbnailUrl,
    durationIso8601: contentDetails.duration ?? existing?.durationIso8601,
    durationSeconds: parseIsoDuration(contentDetails.duration) ?? existing?.durationSeconds,
    viewCount: numberOrUndefined(statistics.viewCount) ?? existing?.viewCount,
    likeCount: numberOrUndefined(statistics.likeCount) ?? existing?.likeCount,
    commentCount: numberOrUndefined(statistics.commentCount) ?? existing?.commentCount,
    channelId: channel.channelId,
    channelTitle: channel.title,
    channelHandle: channel.handle,
    status: existing?.status ?? "backlog",
    priority: Number(payload.priority ?? existing?.priority ?? channel.priority ?? 3),
    notes: existing?.notes ?? `Added from video URL`,
    source: existing?.source ?? "manual_video",
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };

  upsertBacklogVideo(backlog.videos, video);
  backlog.updatedAt = now;
  backlog.channels.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  backlog.videos.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  mkdirSync(dirname(backlogPath), { recursive: true });
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

  return {
    channel,
    video,
    persisted: true,
    status: existing ? "video_exists" : "video_added",
    message: existing
      ? `Video already exists under ${channel.title ?? channel.handle ?? channel.input}: ${video.title ?? video.videoId}.`
      : `Video added under ${channel.title ?? channel.handle ?? channel.input}: ${video.title ?? video.videoId}.`,
    command: `npm run youtube:backlog -- add-video --url ${JSON.stringify(input)}`,
  };
}

async function expandBacklogChannel(payload) {
  if (!youtubeApiKey) throw new Error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before retrieving channel videos.");

  const input = String(payload.channel ?? "").trim();
  if (!input) throw new Error("Missing channel");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const channelEntry = findBacklogChannel(backlog.channels, input);
  if (!channelEntry) throw new Error(`No backlog channel found for ${input}`);

  const maxVideos = Number(payload.maxVideos ?? channelEntry.maxVideos ?? 500);
  const channel = await resolveYouTubeChannel(channelEntry);
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error(`No uploads playlist for ${channel.id}`);

  const now = new Date().toISOString();
  const uploads = await collectUploads(uploadsPlaylistId, maxVideos);
  await enrichBacklogChannel(channelEntry, channel);
  const channelHandle = channelEntry.handle;
  const resources = [];
  for (const batch of chunk(uploads.map((video) => video.videoId), 50)) {
    resources.push(...(await resolveYouTubeVideos(batch)));
  }
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const videos = uploads.map((upload) => {
    const existing = existingVideo(backlog.videos, upload.videoId);
    const base = {
      ...existing,
      videoId: upload.videoId,
      url: `https://www.youtube.com/watch?v=${upload.videoId}`,
      title: upload.title ?? existing?.title,
      publishedAt: upload.publishedAt ?? existing?.publishedAt,
      channelId: channel.id,
      channelTitle: channel.snippet?.title,
      channelHandle,
      status: existing?.status ?? "backlog",
      priority: existing?.priority ?? channelEntry.priority ?? 3,
      notes: existing?.notes ?? `From channel ${channel.snippet?.title ?? channel.id}`,
      source: existing?.source ?? "channel_uploads",
      addedAt: existing?.addedAt ?? now,
      updatedAt: now,
    };
    const resource = resourceById.get(upload.videoId);
    return resource ? { ...base, ...videoBacklogMetadata(resource, base, channelEntry, now) } : base;
  });

  for (const video of videos) upsertBacklogVideo(backlog.videos, video);

  Object.assign(channelEntry, {
    uploadsPlaylistId,
    status: "expanded",
    expandedAt: now,
    updatedAt: now,
  });

  backlog.updatedAt = now;
  backlog.videos.sort((a, b) => a.priority - b.priority || a.addedAt.localeCompare(b.addedAt));
  mkdirSync(dirname(backlogPath), { recursive: true });
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

  return {
    channel: channelEntry,
    videos,
    enrichedCount: resources.length,
    persisted: true,
    command: `npm run youtube:expand-channel -- --channel ${JSON.stringify(input)} --max-videos ${maxVideos}`,
  };
}

async function enrichBacklogVideos(payload) {
  if (!youtubeApiKey) throw new Error("Missing YOUTUBE_API_KEY. Add it to .dev.vars before enriching video metadata.");

  const input = String(payload.channel ?? "").trim();
  if (!input) throw new Error("Missing channel");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const channelEntry = findBacklogChannel(backlog.channels, input);
  if (!channelEntry) throw new Error(`No backlog channel found for ${input}`);

  const channelVideos = backlog.videos.filter((video) => videoBelongsToBacklogChannel(video, channelEntry));
  const requestedIds = Array.isArray(payload.videoIds) ? payload.videoIds.map(String).filter(Boolean) : [];
  const selected = requestedIds.length ? channelVideos.filter((video) => requestedIds.includes(video.videoId)) : channelVideos.filter((video) => !video.title || !video.thumbnailUrl || video.durationSeconds === undefined || video.viewCount === undefined);
  const ids = selected.map((video) => video.videoId);
  const resources = [];
  for (const batch of chunk(ids, 50)) {
    resources.push(...(await resolveYouTubeVideos(batch)));
  }

  const now = new Date().toISOString();
  for (const resource of resources) {
    const existing = existingVideo(backlog.videos, resource.id);
    if (!existing) continue;
    Object.assign(existing, videoBacklogMetadata(resource, existing, channelEntry, now));
  }

  channelEntry.updatedAt = now;
  backlog.updatedAt = now;
  mkdirSync(dirname(backlogPath), { recursive: true });
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);

  const updatedVideos = backlog.videos.filter((video) => videoBelongsToBacklogChannel(video, channelEntry));
  const pendingCount = updatedVideos.filter((video) => !video.title || !video.thumbnailUrl || video.durationSeconds === undefined || video.viewCount === undefined).length;
  return {
    channel: channelEntry,
    videos: updatedVideos,
    enrichedCount: resources.length,
    pendingCount,
    persisted: true,
    command: `npm run youtube:enrich-videos -- --channel ${JSON.stringify(input)}`,
  };
}

function saveBacklogVideoTranscript(payload) {
  const videoId = String(payload.videoId ?? "").trim();
  const transcript = String(payload.transcript ?? "").trim();
  const language = String(payload.language ?? "en").trim() || "en";
  if (!videoId) throw new Error("Missing videoId");
  if (transcript.length < 40) throw new Error("Transcript text is too short to save.");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const video = findBacklogVideo(backlog.videos, videoId);
  if (!video) throw new Error(`No backlog video found for ${videoId}`);

  const now = new Date().toISOString();
  const transcriptPath = `data/youtube-recipes/transcripts/${safeFilename(videoId)}.txt`;
  const fullPath = resolve(process.cwd(), transcriptPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${transcript}\n`);

  video.transcript = {
    status: "manual",
    localPath: transcriptPath,
    language,
    source: "manual_paste",
    notes: "Pasted in the local Import page.",
    updatedAt: now,
  };
  video.updatedAt = now;
  backlog.updatedAt = now;
  writeBacklog(backlogPath, backlog);

  return {
    video,
    transcriptPath,
    persisted: true,
  };
}

function readBacklogVideoTranscript(payload) {
  const videoId = String(payload.videoId ?? "").trim();
  if (!videoId) throw new Error("Missing videoId");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const video = findBacklogVideo(backlog.videos, videoId);
  if (!video) throw new Error(`No backlog video found for ${videoId}`);

  const text = readTranscriptRawFile(video);
  const json = readTranscriptJsonFile(video);
  if (!text.trim() && !json) throw new Error("No saved transcript file is available for this video.");

  const normalized = ensureTranscriptBlocks(video, json);
  if (normalized && video.transcript?.blocksPath && video.transcript?.sanitizedPath) {
    video.updatedAt = new Date().toISOString();
    backlog.updatedAt = video.updatedAt;
    writeBacklog(backlogPath, backlog);
  }
  const segments = Array.isArray(json?.segments) ? json.segments.slice(0, 500) : [];
  const blocks = Array.isArray(normalized?.blocks) ? normalized.blocks.slice(0, 500) : [];
  const paths = normalizedTranscriptPaths(video);
  return {
    video,
    text: normalized?.text || text,
    rawText: text,
    sanitizedText: normalized?.text ?? "",
    segments,
    blocks,
    segmentCount: json?.segmentCount ?? segments.length,
    blockCount: normalized?.blockCount ?? blocks.length,
    language: json?.languageCode ?? video.transcript?.language,
    isGenerated: json?.isGenerated ?? video.transcript?.isGenerated,
    localPath: video.transcript?.localPath,
    jsonPath: video.transcript?.jsonPath,
    sanitizedPath: video.transcript?.sanitizedPath ?? paths.sanitizedPath,
    blocksPath: video.transcript?.blocksPath ?? paths.blocksPath,
    persisted: true,
  };
}

async function retrieveBacklogVideoSourcePages(payload) {
  const videoId = String(payload.videoId ?? "").trim();
  if (!videoId) throw new Error("Missing videoId");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const video = findBacklogVideo(backlog.videos, videoId);
  if (!video) throw new Error(`No backlog video found for ${videoId}`);

  const now = new Date().toISOString();
  await refreshBacklogVideoMetadata(video, backlog, now);
  const result = await fetchAndStoreRecipeSourcePages(video, now);
  video.sourcePages = result.sourcePages;
  video.updatedAt = now;
  backlog.updatedAt = now;
  writeBacklog(backlogPath, backlog);

  return {
    video,
    pages: result.sourcePages.pages,
    retrievedCount: result.retrievedCount,
    persisted: result.retrievedCount > 0,
    warning: result.warning,
  };
}

async function retrieveBacklogVideoTranscript(payload) {
  const videoId = String(payload.videoId ?? "").trim();
  const languages = normalizeLanguages(payload.languages);
  if (!videoId) throw new Error("Missing videoId");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const video = findBacklogVideo(backlog.videos, videoId);
  if (!video) throw new Error(`No backlog video found for ${videoId}`);

  const now = new Date().toISOString();
  try {
    const transcript = await fetchYouTubeTranscript(videoId, languages);
    const basePath = `data/youtube-recipes/transcripts/${safeFilename(videoId)}`;
    const textPath = `${basePath}.txt`;
    const jsonPath = `${basePath}.json`;
    const sanitizedPath = `${basePath}.sanitized.txt`;
    const blocksPath = `${basePath}.blocks.json`;
    const textFullPath = resolve(process.cwd(), textPath);
    const jsonFullPath = resolve(process.cwd(), jsonPath);
    const sanitizedFullPath = resolve(process.cwd(), sanitizedPath);
    const blocksFullPath = resolve(process.cwd(), blocksPath);
    const blocks = normalizeTranscriptSegments(transcript.segments);
    const sanitizedText = transcriptBlocksToText(blocks);
    mkdirSync(dirname(textFullPath), { recursive: true });
    writeFileSync(textFullPath, `${transcript.text}\n`);
    writeFileSync(
      jsonFullPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          provider: "youtube-internal-captions",
          retrievedAt: now,
          videoId,
          language: transcript.language,
          languageCode: transcript.languageCode,
          isGenerated: transcript.isGenerated,
          isTranslatable: transcript.isTranslatable,
          translationLanguages: transcript.translationLanguages,
          segmentCount: transcript.segments.length,
          segments: transcript.segments,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(sanitizedFullPath, `${sanitizedText}\n`);
    writeFileSync(
      blocksFullPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          sourceTranscriptPath: jsonPath,
          generatedAt: now,
          videoId,
          language: transcript.language,
          languageCode: transcript.languageCode,
          isGenerated: transcript.isGenerated,
          rawSegmentCount: transcript.segments.length,
          blockCount: blocks.length,
          blocks,
          text: sanitizedText,
        },
        null,
        2,
      )}\n`,
    );

    video.transcript = {
      status: "provider",
      localPath: textPath,
      jsonPath,
      sanitizedPath,
      blocksPath,
      language: transcript.languageCode,
      source: "youtube_internal_captions",
      notes: `${transcript.isGenerated ? "Generated" : "Manual"} captions retrieved from YouTube player caption tracks.`,
      segmentCount: transcript.segments.length,
      blockCount: blocks.length,
      isGenerated: transcript.isGenerated,
      updatedAt: now,
    };
    video.updatedAt = now;
    backlog.updatedAt = now;
    writeBacklog(backlogPath, backlog);

    return {
      video,
      transcriptPath: textPath,
      transcriptJsonPath: jsonPath,
      sanitizedPath,
      blocksPath,
      segmentCount: transcript.segments.length,
      blockCount: blocks.length,
      language: transcript.languageCode,
      isGenerated: transcript.isGenerated,
      persisted: true,
      warning: transcript.warning,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript retrieval failed.";
    video.transcript = {
      status: "unavailable",
      language: languages[0] ?? "en",
      source: "youtube_internal_captions",
      notes: message,
      updatedAt: now,
    };
    video.updatedAt = now;
    backlog.updatedAt = now;
    writeBacklog(backlogPath, backlog);
    return {
      video,
      persisted: false,
      warning: message,
    };
  }
}

async function processBacklogVideoCandidate(payload) {
  const videoId = String(payload.videoId ?? "").trim();
  if (!videoId) throw new Error("Missing videoId");

  const backlogPath = resolve(process.cwd(), "data/youtube-recipes/backlog.json");
  const backlog = readBacklog(backlogPath);
  const video = findBacklogVideo(backlog.videos, videoId);
  if (!video) throw new Error(`No backlog video found for ${videoId}`);

  const now = new Date().toISOString();
  const metadata = await refreshBacklogVideoMetadata(video, backlog, now);
  let sourceText = "";
  let sourceTextKind = "none";
  const evidenceSections = [];

  const sourcePageResult = { refreshed: false };
  const sourcePageText = readSourcePageRecipeText(video);
  if (sourcePageText) evidenceSections.push(["linked recipe page", sourcePageText]);
  if (sourcePageText) {
    sourceText = sourcePageText;
    sourceTextKind = "linked recipe page";
  }

  const metadataText = [video.title, video.description].filter((value) => typeof value === "string" && value.trim()).join("\n\n");
  const metadataRecipe = parseRecipeText(metadataText);
  if (metadataText.trim()) evidenceSections.push(["youtube metadata description", metadataText]);
  if (!sourceText.trim() && metadataText.trim()) {
    if (metadataRecipe.ingredients.length || metadataRecipe.steps.length) {
      sourceText = metadataText;
      sourceTextKind = "youtube metadata description";
    }
  }

  ensureTranscriptBlocks(video, readTranscriptJsonFile(video));
  const transcriptText = readTranscriptFile(video);
  if (transcriptText.trim()) {
    evidenceSections.push([video.transcript?.sanitizedPath || video.transcript?.blocksPath ? "sanitized transcript" : "saved transcript", transcriptText]);
  }
  if (!sourceText.trim() && transcriptText) {
    sourceText = transcriptText;
    sourceTextKind = video.transcript?.sanitizedPath || video.transcript?.blocksPath ? "sanitized transcript" : "saved transcript";
  }

  if (!sourceText.trim()) {
    sourceText = metadataText;
    sourceTextKind = video.description?.trim() ? "youtube metadata description" : "youtube metadata title only";
  }

  if (!sourceText.trim()) throw new Error("YouTube metadata was retrieved, but no title, description, or saved transcript text is available.");

  const hasEnoughEvidence = Boolean(sourcePageText || transcriptText || (metadataRecipe.ingredients.length && metadataRecipe.steps.length));
  if (!hasEnoughEvidence) {
    video.candidate = {
      status: "failed",
      generatedAt: now,
      warnings: [
        "Not enough recipe evidence is available for AI draft creation.",
        "Retrieve a transcript or linked recipe page first, or use a YouTube description that contains both ingredients and method steps.",
      ],
    };
    video.updatedAt = now;
    backlog.updatedAt = now;
    writeBacklog(backlogPath, backlog);
    return {
      video,
      sourceTextKind,
      sourceTextLength: sourceText.length,
      metadataRefreshed: metadata.refreshed,
      recipeTextFound: false,
      persisted: false,
      warnings: video.candidate.warnings,
      warning: video.candidate.warnings.join(" "),
    };
  }

  const evidenceText = buildEvidenceText(evidenceSections) || sourceText;
  const evidenceLabels = evidenceSections.map(([label]) => label).join(", ");
  const candidateInput = buildCandidateInput(video, evidenceText, evidenceLabels ? `${sourceTextKind}; evidence sections: ${evidenceLabels}` : sourceTextKind);
  const baseCandidate = createCandidateFromBacklogVideo(video, sourceText, sourceTextKind);
  const result = payload.useAi === false ? { candidate: baseCandidate, model: "local-parser/v0", usedFallback: true, warnings: [] } : await refineCandidate({ input: candidateInput, candidate: baseCandidate });
  const candidate = result.candidate;
  const recipeTextFound = Boolean(candidate.ingredients?.length || candidate.steps?.length);
  if (!recipeTextFound && !sourceTextKind.includes("transcript")) {
    video.candidate = {
      status: "failed",
      generatedAt: now,
      model: result.model,
      warnings: [
        `YouTube metadata was refreshed${metadata.refreshed ? "" : " or checked"}, but it did not contain parseable recipe ingredients or steps.`,
        "The official YouTube Data API does not provide arbitrary public video transcripts. Automatic transcript creation needs an authorized captions path or a transcript provider.",
      ],
    };
    video.updatedAt = now;
    backlog.updatedAt = now;
    writeBacklog(backlogPath, backlog);
    return {
      video,
      candidate,
      sourceTextKind,
      sourceTextLength: sourceText.length,
      metadataRefreshed: metadata.refreshed,
      recipeTextFound,
      persisted: false,
      warnings: video.candidate.warnings,
      warning: video.candidate.warnings.join(" "),
    };
  }

  const candidatePath = `data/youtube-recipes/candidates/${safeFilename(videoId)}.candidate.json`;
  const fullPath = resolve(process.cwd(), candidatePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify({ schemaVersion: 1, generatedAt: now, sourceTextKind, sourceTextLength: sourceText.length, evidenceTextLength: evidenceText.length, metadataRefreshed: metadata.refreshed, candidate }, null, 2)}\n`);

  video.candidate = {
    status: "needs_review",
    localPath: candidatePath,
    generatedAt: now,
    model: result.model,
    warnings: [...(candidate.warnings ?? []), ...(result.warnings ?? [])].slice(0, 8),
  };
  video.updatedAt = now;
  backlog.updatedAt = now;
  writeBacklog(backlogPath, backlog);

  return {
    video,
    candidate,
    candidatePath,
    model: result.model,
    sourceTextKind,
    sourceTextLength: sourceText.length,
    metadataRefreshed: metadata.refreshed,
    recipePageRefreshed: sourcePageResult.refreshed,
    recipeTextFound,
    warnings: result.warnings,
    persisted: true,
  };
}

async function refreshBacklogVideoMetadata(video, backlog, now) {
  if (!youtubeApiKey) {
    return { refreshed: false, warning: "Missing YOUTUBE_API_KEY. Candidate uses existing backlog metadata only." };
  }
  const resource = await resolveYouTubeVideo(video.videoId);
  const channelEntry = backlog.channels.find((channel) => videoBelongsToBacklogChannel(video, channel)) ?? {};
  Object.assign(video, videoBacklogMetadata(resource, video, channelEntry, now));
  return { refreshed: true };
}

async function ensureBacklogVideoSourcePages(video, backlog, now) {
  if (hasUsableSourcePageFiles(video)) return { refreshed: false };
  const result = await fetchAndStoreRecipeSourcePages(video, now);
  video.sourcePages = result.sourcePages;
  video.updatedAt = now;
  backlog.updatedAt = now;
  writeBacklog(resolve(process.cwd(), "data/youtube-recipes/backlog.json"), backlog);
  return { refreshed: result.retrievedCount > 0, warning: result.warning };
}

function hasUsableSourcePageFiles(video) {
  return Boolean(
    video.sourcePages?.status === "retrieved" &&
      video.sourcePages.pages.some((page) => {
        const data = page.localPath ? readJsonFile(page.localPath) : undefined;
        return Boolean(data?.ingredients?.length || data?.steps?.length);
      }),
  );
}

async function fetchAndStoreRecipeSourcePages(video, now) {
  const urls = extractRecipePageUrls(video.description ?? "");
  if (!urls.length) {
    return {
      sourcePages: {
        status: "unavailable",
        updatedAt: now,
        notes: "No likely recipe page URLs were found in the YouTube description.",
        pages: [],
      },
      retrievedCount: 0,
      warning: "No likely recipe page URLs were found in the YouTube description.",
    };
  }

  const pages = [];
  for (const url of urls.slice(0, 6)) {
    try {
      pages.push(await fetchAndStoreRecipeSourcePage(video, url, now));
    } catch (error) {
      pages.push({
        url,
        status: "failed",
        error: error instanceof Error ? error.message : "Recipe page retrieval failed.",
      });
    }
  }

  const retrievedCount = pages.filter((page) => page.status === "retrieved").length;
  const sourcePages = {
    status: retrievedCount ? "retrieved" : "failed",
    updatedAt: now,
    notes: retrievedCount
      ? `Retrieved ${retrievedCount} linked recipe page${retrievedCount === 1 ? "" : "s"} from the YouTube description.`
      : "Recipe page URLs were found, but none could be retrieved.",
    pages,
  };

  return {
    sourcePages,
    retrievedCount,
    warning: retrievedCount ? undefined : sourcePages.notes,
  };
}

async function fetchAndStoreRecipeSourcePage(video, url, now) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 rrrecipe-local-dev/0.1",
    },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`Recipe page request failed with HTTP ${response.status}: ${html.slice(0, 120)}`);

  const extracted = extractRecipeDataFromHtml(html, url);
  const localPath = `data/youtube-recipes/source-pages/${safeFilename(video.videoId)}/${sourcePageFilename(url)}.json`;
  const fullPath = resolve(process.cwd(), localPath);
  const document = {
    schemaVersion: 1,
    provider: "linked-recipe-page",
    retrievedAt: now,
    videoId: video.videoId,
    sourceUrl: url,
    httpStatus: response.status,
    contentType: response.headers.get("content-type") ?? "",
    ...extracted,
  };
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(document, null, 2)}\n`);

  return {
    url,
    title: extracted.title,
    siteName: extracted.siteName,
    status: "retrieved",
    localPath,
    extractedAt: now,
    ingredientCount: extracted.ingredients.length,
    stepCount: extracted.steps.length,
  };
}

function readSourcePageRecipeText(video) {
  const pages = video.sourcePages?.pages ?? [];
  const chunks = [];
  for (const page of pages) {
    if (!page.localPath) continue;
    const data = readJsonFile(page.localPath);
    if (!data) continue;
    const ingredients = Array.isArray(data.ingredients) ? data.ingredients.filter(Boolean) : [];
    const steps = Array.isArray(data.steps) ? data.steps.filter(Boolean) : [];
    if (!ingredients.length && !steps.length) continue;
    chunks.push(
      [
        data.title ? `Title: ${data.title}` : undefined,
        `Recipe page: ${data.sourceUrl ?? page.url}`,
        data.description ? `Description: ${data.description}` : undefined,
        ingredients.length ? `Ingredients:\n${ingredients.map((item) => `- ${item}`).join("\n")}` : undefined,
        steps.length ? `Directions:\n${steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return chunks.join("\n\n---\n\n");
}

function readJsonFile(localPath) {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), localPath), "utf8"));
  } catch {
    return undefined;
  }
}

function readTranscriptFile(video) {
  const paths = [video.transcript?.sanitizedPath, normalizedTranscriptPaths(video).sanitizedPath, video.transcript?.localPath].filter(Boolean);
  for (const localPath of paths) {
    try {
      return readFileSync(resolve(process.cwd(), localPath), "utf8");
    } catch {
      // Try the next available transcript representation.
    }
  }
  return "";
}

function readTranscriptRawFile(video) {
  const localPath = video.transcript?.localPath;
  if (!localPath) return "";
  try {
    return readFileSync(resolve(process.cwd(), localPath), "utf8");
  } catch {
    return "";
  }
}

function readTranscriptJsonFile(video) {
  const localPath = video.transcript?.jsonPath;
  if (!localPath) return undefined;
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), localPath), "utf8"));
  } catch {
    return undefined;
  }
}

function ensureTranscriptBlocks(video, transcriptJson) {
  const existing = readTranscriptBlocksFile(video);
  if (existing) {
    const paths = normalizedTranscriptPaths(video);
    if (video.transcript) {
      video.transcript.sanitizedPath = video.transcript.sanitizedPath ?? paths.sanitizedPath;
      video.transcript.blocksPath = video.transcript.blocksPath ?? paths.blocksPath;
      video.transcript.blockCount = video.transcript.blockCount ?? existing.blockCount ?? existing.blocks?.length;
    }
    return existing;
  }
  if (!Array.isArray(transcriptJson?.segments) || !transcriptJson.segments.length) return undefined;

  const blocks = normalizeTranscriptSegments(transcriptJson.segments);
  const text = transcriptBlocksToText(blocks);
  const paths = normalizedTranscriptPaths(video);
  if (!paths.blocksPath || !paths.sanitizedPath) return { blocks, blockCount: blocks.length, text };

  const now = new Date().toISOString();
  const output = {
    schemaVersion: 1,
    sourceTranscriptPath: video.transcript?.jsonPath,
    generatedAt: now,
    videoId: video.videoId,
    language: transcriptJson.language,
    languageCode: transcriptJson.languageCode,
    isGenerated: transcriptJson.isGenerated,
    rawSegmentCount: transcriptJson.segments.length,
    blockCount: blocks.length,
    blocks,
    text,
  };
  const sanitizedFullPath = resolve(process.cwd(), paths.sanitizedPath);
  const blocksFullPath = resolve(process.cwd(), paths.blocksPath);
  mkdirSync(dirname(sanitizedFullPath), { recursive: true });
  writeFileSync(sanitizedFullPath, `${text}\n`);
  writeFileSync(blocksFullPath, `${JSON.stringify(output, null, 2)}\n`);
  if (video.transcript) {
    video.transcript.sanitizedPath = paths.sanitizedPath;
    video.transcript.blocksPath = paths.blocksPath;
    video.transcript.blockCount = blocks.length;
  }
  return output;
}

function readTranscriptBlocksFile(video) {
  const paths = normalizedTranscriptPaths(video);
  if (!paths.blocksPath) return undefined;
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), paths.blocksPath), "utf8"));
  } catch {
    return undefined;
  }
}

function normalizedTranscriptPaths(video) {
  const rawPath = video.transcript?.localPath;
  const jsonPath = video.transcript?.jsonPath;
  const base = rawPath?.replace(/\.txt$/i, "") ?? jsonPath?.replace(/\.json$/i, "");
  return {
    sanitizedPath: video.transcript?.sanitizedPath ?? (base ? `${base}.sanitized.txt` : undefined),
    blocksPath: video.transcript?.blocksPath ?? (base ? `${base}.blocks.json` : undefined),
  };
}

function normalizeLanguages(value) {
  const languages = Array.isArray(value) ? value : String(value ?? "en").split(",");
  const clean = languages.map((language) => String(language).trim()).filter(Boolean);
  return clean.length ? clean : ["en"];
}

function buildCandidateInput(video, sourceText, sourceTextKind) {
  return [
    `Source text kind: ${sourceTextKind}`,
    `YouTube URL: ${video.url}`,
    video.title ? `Title: ${video.title}` : undefined,
    video.channelTitle ? `Channel: ${video.channelTitle}` : undefined,
    video.durationSeconds ? `Duration seconds: ${video.durationSeconds}` : undefined,
    "",
    "Extraction guidance:",
    "- Use linked recipe pages as the most authoritative source when present.",
    "- Use YouTube description for ingredient lists, yield, temperatures, and notes.",
    "- Use sanitized transcript for method steps, especially when the description has ingredients only.",
    "- Ignore intros, sponsorships, merch, product links, social links, tasting reactions, and subscribe requests.",
    "- Return a practical recipe, not a transcript summary.",
    "",
    sourceText,
  ]
    .filter((part) => part !== undefined)
    .join("\n");
}

function buildEvidenceText(sections) {
  return sections
    .filter(([, text]) => typeof text === "string" && text.trim())
    .map(([label, text]) => `## ${label}\n${text.trim()}`)
    .join("\n\n---\n\n");
}

function createCandidateFromBacklogVideo(video, sourceText, sourceTextKind) {
  const sourceId = createId("source");
  const source = {
    id: sourceId,
    type: "youtube",
    url: video.url,
    title: video.title ?? "YouTube recipe import",
    author: video.channelTitle ?? "YouTube",
    retrievedAt: new Date().toISOString(),
    media: {
      provider: "youtube",
      videoId: video.videoId,
      channelId: video.channelId,
      channelTitle: video.channelTitle,
      channelHandle: video.channelHandle,
      durationSeconds: video.durationSeconds ?? 0,
      thumbnailUrl: video.thumbnailUrl ?? `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
      canonicalUrl: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
    },
  };
  const parsed = parseRecipeText([video.title, sourceText].filter(Boolean).join("\n\n"));
  return {
    id: createId("candidate"),
    source,
    title: parsed.title ?? video.title ?? "YouTube recipe import",
    language: video.transcript?.language ?? "en",
    description: video.description ?? `Draft created from ${sourceTextKind}.`,
    yield: { raw: "", quantity: 0, unit: "" },
    times: { prepMinutes: 0, cookMinutes: 0, totalMinutes: video.durationSeconds ? Math.max(1, Math.round(video.durationSeconds / 60)) : 0 },
    ingredients: parsed.ingredients,
    steps: parsed.steps.map((step) => ({
      ...step,
      mediaAnchors: (step.mediaAnchors ?? []).map((anchor) => ({ ...anchor, sourceId })),
    })),
    notes: [`Created from ${sourceTextKind}.`],
    tags: ["youtube", "import"],
    confidence: {
      source: 0.95,
      ingredients: parsed.ingredients.length ? 0.62 : 0.12,
      steps: parsed.steps.length ? 0.58 : 0.12,
      overall: parsed.ingredients.length && parsed.steps.length ? 0.62 : 0.24,
    },
    warnings: [
      ...(sourceTextKind.startsWith("youtube metadata") ? ["Draft uses YouTube Data API metadata only. No automatic transcript is attached."] : []),
      ...(parsed.ingredients.length ? [] : ["No ingredient-like lines were detected. AI refinement or manual review is needed."]),
      ...(parsed.steps.length ? [] : ["No instruction-like lines were detected. AI refinement or manual review is needed."]),
    ],
  };
}

function extractRecipePageUrls(description) {
  const matches = String(description)
    .match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
  const urls = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?]+$/g, "");
    let parsed;
    try {
      parsed = new URL(cleaned);
    } catch {
      continue;
    }
    if (!isLikelyRecipePageUrl(parsed)) continue;
    const normalized = parsed.toString();
    if (!urls.includes(normalized)) urls.push(normalized);
  }
  return urls;
}

function isLikelyRecipePageUrl(url) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = decodeURIComponent(url.pathname).toLowerCase();
  if (/(youtube|youtu\.be|instagram|tiktok|facebook|pinterest|x\.com|twitter|google|squarespace|bit\.ly|amzn\.to|amazon)/.test(host)) return false;
  return /\brecipes?\b|\/recipes?\//i.test(path) || /recipe/i.test(host);
}

function extractRecipeDataFromHtml(html, url) {
  const jsonLdRecipes = extractJsonLdRecipeObjects(html);
  const recipe = jsonLdRecipes[0];
  const fallbackText = htmlToReadableText(html);
  const fallbackParsed = parseRecipeText(fallbackText);
  const title = textOrUndefined(recipe?.name) ?? metaContent(html, "og:title") ?? firstMatchText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? firstMatchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = textOrUndefined(recipe?.description) ?? metaContent(html, "description") ?? metaContent(html, "og:description");
  const ingredients = mergeIngredientContinuations(normalizeStringArray(recipe?.recipeIngredient));
  const steps = normalizeRecipeInstructions(recipe?.recipeInstructions);

  return {
    title: cleanText(title) || new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/[-_]+/g, " "),
    siteName: metaContent(html, "og:site_name") ?? new URL(url).hostname.replace(/^www\./, ""),
    description: cleanText(description),
    image: firstRecipeImage(recipe?.image) ?? metaContent(html, "og:image"),
    yield: textOrUndefined(recipe?.recipeYield),
    totalTime: textOrUndefined(recipe?.totalTime),
    prepTime: textOrUndefined(recipe?.prepTime),
    cookTime: textOrUndefined(recipe?.cookTime),
    ingredients: ingredients.length ? ingredients : mergeIngredientContinuations(fallbackParsed.ingredients.map((item) => item.raw)),
    steps: steps.length ? steps : fallbackParsed.steps.map((item) => item.text),
    structuredDataFound: Boolean(recipe),
    visibleTextSample: fallbackText.slice(0, 6000),
  };
}

function extractJsonLdRecipeObjects(html) {
  const scripts = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const raw = htmlUnescape(match[1]).trim();
    if (!raw) continue;
    try {
      scripts.push(JSON.parse(raw));
    } catch {
      // Some sites put malformed JSON-LD in the page. The visible-text fallback handles those.
    }
  }
  return scripts.flatMap(flattenJsonLd).filter((item) => jsonLdTypeIncludes(item, "Recipe"));
}

function flattenJsonLd(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  return [value, ...flattenJsonLd(value["@graph"])];
}

function jsonLdTypeIncludes(value, type) {
  const raw = value?.["@type"];
  const types = Array.isArray(raw) ? raw : [raw];
  return types.some((item) => String(item).toLowerCase() === type.toLowerCase());
}

function normalizeRecipeInstructions(value) {
  if (!value) return [];
  if (typeof value === "string") return value.split(/\n+/).map(cleanText).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(normalizeRecipeInstructions).filter(Boolean);
  if (typeof value === "object") {
    if (Array.isArray(value.itemListElement)) return value.itemListElement.flatMap(normalizeRecipeInstructions).filter(Boolean);
    return [value.text, value.name].map(cleanText).filter(Boolean).slice(0, 1);
  }
  return [];
}

function normalizeStringArray(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map(textOrUndefined).map(cleanText).filter(Boolean);
}

function mergeIngredientContinuations(lines) {
  const merged = [];
  for (const line of lines.map(cleanText).filter(Boolean)) {
    const previous = merged[merged.length - 1];
    if (previous && (/^(or|and)\b/i.test(line) || hasUnclosedParenthesis(previous))) {
      merged[merged.length - 1] = `${previous}, ${line}`;
    } else {
      merged.push(line);
    }
  }
  return merged;
}

function hasUnclosedParenthesis(value) {
  return (value.match(/\(/g)?.length ?? 0) > (value.match(/\)/g)?.length ?? 0);
}

function firstRecipeImage(value) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstRecipeImage(value[0]);
  return value.url ?? value.contentUrl;
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return cleanText(htmlUnescape(html.match(pattern)?.[1] ?? ""));
}

function firstMatchText(html, pattern) {
  return cleanText(stripHtml(htmlUnescape(html.match(pattern)?.[1] ?? "")));
}

function textOrUndefined(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map(textOrUndefined).filter(Boolean).join(", ");
  if (typeof value === "object") return value.text ?? value.name ?? value.url;
  return String(value);
}

function htmlToReadableText(html) {
  return htmlUnescape(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "\n")
      .replace(/<(h[1-6]|p|div|section|article|header|footer|ul|ol|li|br|tr|td|th)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .join("\n");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function sourcePageFilename(url) {
  const parsed = new URL(url);
  const slug = [parsed.hostname.replace(/^www\./, ""), parsed.pathname]
    .join("-")
    .replace(/\/+$/g, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return safeFilename(slug || parsed.hostname);
}

async function resolveYouTubeChannel(entry) {
  const params = { part: "snippet,contentDetails,statistics,brandingSettings" };
  if (entry.channelId) params.id = entry.channelId;
  else if (entry.handle) params.forHandle = entry.handle.replace(/^@/, "");
  else if (entry.url || entry.input) {
    const parsed = parseChannelInput(entry.url ?? entry.input);
    if (parsed.channelId) params.id = parsed.channelId;
    else if (parsed.handle) params.forHandle = parsed.handle.replace(/^@/, "");
  }
  if (!params.id && !params.forHandle) throw new Error("Channel entry needs channelId, handle, or parseable channel URL");
  const response = await youtubeGet("https://www.googleapis.com/youtube/v3/channels", params);
  const channel = response.items?.[0];
  if (!channel) throw new Error(`Channel not found: ${entry.channelId ?? entry.handle ?? entry.input}`);
  return channel;
}

async function resolveYouTubeVideo(videoId) {
  const response = await youtubeGet("https://www.googleapis.com/youtube/v3/videos", {
    part: "snippet,contentDetails,statistics,status",
    id: videoId,
  });
  const video = response.items?.[0];
  if (!video) throw new Error(`Video not found: ${videoId}`);
  return video;
}

async function resolveYouTubeVideos(videoIds) {
  if (!videoIds.length) return [];
  const response = await youtubeGet("https://www.googleapis.com/youtube/v3/videos", {
    part: "snippet,contentDetails,statistics,status",
    id: videoIds.join(","),
    maxResults: "50",
  });
  return response.items ?? [];
}

function videoBacklogMetadata(resource, existing, channelEntry, now) {
  const snippet = resource.snippet ?? {};
  const statistics = resource.statistics ?? {};
  const contentDetails = resource.contentDetails ?? {};
  return {
    title: snippet.title ?? existing.title,
    description: snippet.description ?? existing.description,
    publishedAt: snippet.publishedAt ?? existing.publishedAt,
    thumbnailUrl: bestThumbnailUrl(snippet.thumbnails) ?? existing.thumbnailUrl,
    durationIso8601: contentDetails.duration ?? existing.durationIso8601,
    durationSeconds: parseIsoDuration(contentDetails.duration) ?? existing.durationSeconds,
    viewCount: numberOrUndefined(statistics.viewCount) ?? existing.viewCount,
    likeCount: numberOrUndefined(statistics.likeCount) ?? existing.likeCount,
    commentCount: numberOrUndefined(statistics.commentCount) ?? existing.commentCount,
    channelId: snippet.channelId ?? existing.channelId ?? channelEntry.channelId,
    channelTitle: snippet.channelTitle ?? existing.channelTitle ?? channelEntry.title,
    channelHandle: existing.channelHandle ?? channelEntry.handle,
    updatedAt: now,
  };
}

async function ensureBacklogChannel(backlog, youtubeChannel, options) {
  const now = options.now ?? new Date().toISOString();
  const handle = normalizeHandle(youtubeChannel.snippet?.customUrl);
  const existing = backlog.channels.find((item) => item.channelId === youtubeChannel.id || (handle && item.handle === handle));
  const entry = {
    ...existing,
    input: existing?.input ?? handle ?? youtubeChannel.id,
    status: existing?.status ?? "backlog",
    priority: Number(existing?.priority ?? options.priority ?? 3),
    maxVideos: Number(existing?.maxVideos ?? options.maxVideos ?? 500),
    notes: existing?.notes ?? "",
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  await enrichBacklogChannel(entry, youtubeChannel);
  const index = backlog.channels.findIndex((item) => item.channelId === entry.channelId || (entry.handle && item.handle === entry.handle));
  if (index >= 0) backlog.channels[index] = entry;
  else backlog.channels.push(entry);
  return entry;
}

async function enrichBacklogChannel(entry, channel) {
  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const handle = normalizeHandle(snippet.customUrl ?? entry.handle);
  const thumbnailUrl = bestThumbnailUrl(snippet.thumbnails);
  const bannerUrl = channel.brandingSettings?.image?.bannerExternalUrl ?? channel.brandingSettings?.image?.bannerImageUrl;
  const localThumbnailPath = thumbnailUrl ? await downloadChannelImage(thumbnailUrl, channel.id, "avatar") : entry.localThumbnailPath;
  const localBannerPath = bannerUrl ? await downloadChannelImage(bannerUrl, channel.id, "banner") : entry.localBannerPath;

  Object.assign(entry, {
    channelId: channel.id,
    handle,
    url: handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${channel.id}`,
    title: snippet.title ?? entry.title,
    description: snippet.description ?? entry.description,
    publishedAt: snippet.publishedAt ?? entry.publishedAt,
    country: snippet.country ?? entry.country,
    thumbnailUrl: thumbnailUrl ?? entry.thumbnailUrl,
    localThumbnailPath: localThumbnailPath ?? entry.localThumbnailPath,
    bannerUrl: bannerUrl ?? entry.bannerUrl,
    localBannerPath: localBannerPath ?? entry.localBannerPath,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads ?? entry.uploadsPlaylistId,
    statistics: {
      subscriberCount: numberOrUndefined(statistics.subscriberCount),
      videoCount: numberOrUndefined(statistics.videoCount),
      viewCount: numberOrUndefined(statistics.viewCount),
      hiddenSubscriberCount: Boolean(statistics.hiddenSubscriberCount),
    },
  });
}

function bestThumbnailUrl(thumbnails) {
  return thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url;
}

function normalizeHandle(value) {
  if (!value) return undefined;
  return value.startsWith("@") ? value : `@${value}`;
}

function numberOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function downloadChannelImage(url, channelId, kind) {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    const extension = imageExtension(contentType, url);
    const relativePath = `data/youtube-recipes/images/channels/${safeFilename(channelId)}-${kind}.${extension}`;
    const fullPath = resolve(process.cwd(), "public", relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, Buffer.from(await response.arrayBuffer()));
    return relativePath;
  } catch {
    return undefined;
  }
}

function imageExtension(contentType, url) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const match = new URL(url).pathname.match(/\.([a-z0-9]{3,4})$/i);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function safeFilename(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, "_");
}

function parseIsoDuration(value) {
  if (!value) return undefined;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
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
  url.searchParams.set("key", youtubeApiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(`YouTube API ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function findBacklogChannel(channels, input) {
  const parsed = parseChannelInput(input);
  return channels.find((item) =>
    item.channelId === input ||
    item.channelId === parsed.channelId ||
    item.handle === input ||
    item.handle === parsed.handle ||
    item.handle === (input.startsWith("@") ? input : `@${input}`) ||
    item.input === input ||
    item.url === input ||
    item.url === parsed.url
  );
}

function existingVideo(videos, videoId) {
  return videos.find((item) => item.videoId === videoId);
}

function findBacklogVideo(videos, videoId) {
  return videos.find((item) => item.videoId === videoId);
}

function upsertBacklogVideo(videos, video) {
  const index = videos.findIndex((item) => item.videoId === video.videoId);
  if (index >= 0) videos[index] = { ...videos[index], ...video };
  else videos.push(video);
}

function videoBelongsToBacklogChannel(video, channel) {
  const title = channel.title?.toLowerCase();
  return Boolean(
    (channel.channelId && video.channelId === channel.channelId) ||
      (channel.handle && video.channelHandle === channel.handle) ||
      (title && video.channelTitle?.toLowerCase() === title) ||
      (!video.channelId && !video.channelHandle && video.notes?.toLowerCase().includes(title ?? ""))
  );
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function readBacklog(backlogPath) {
  try {
    return JSON.parse(readFileSync(backlogPath, "utf8"));
  } catch {
    return { schemaVersion: 1, updatedAt: null, videos: [], channels: [] };
  }
}

function writeBacklog(backlogPath, backlog) {
  mkdirSync(dirname(backlogPath), { recursive: true });
  writeFileSync(backlogPath, `${JSON.stringify(backlog, null, 2)}\n`);
}

function parseRecipeText(input) {
  const lines = prepareRecipeLines(input)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//i.test(line));
  const ingredients = [];
  const steps = [];
  let title;
  let section;

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:：]\s*$/, "");
    if (line === "---" || /^(title|recipe page|description):/i.test(line)) {
      section = undefined;
      if (!title && /^title:/i.test(line)) title = line.replace(/^title:\s*/i, "").trim();
      continue;
    }
    if (/^(ingredients?|shopping list|for the dough|for topping)$/.test(lower)) {
      section = "ingredients";
      continue;
    }
    if (/^(steps?|method|instructions?|directions?|preparation)$/.test(lower)) {
      section = "steps";
      continue;
    }
    if (!title && isTitleLine(line)) title = line;
    if (section === "ingredients" || (!section && looksLikeIngredient(line))) {
      if (!looksLikeIngredient(line)) continue;
      const ingredientLines = section === "ingredients" ? [line] : splitIngredientLine(line);
      ingredients.push(...ingredientLines.map(parseIngredient));
      continue;
    }
    if (section === "steps" || (!section && looksLikeStep(line))) {
      const step = parseStep(line, steps.length);
      if (step.text) steps.push(step);
    }
  }

  return { title, ingredients, steps };
}

function prepareRecipeLines(input) {
  return input
    .replace(/\b(ingredients?|shopping list|for the dough|for topping)\s*[:：]/gi, "\n$1:\n")
    .replace(/\b(method|instructions?|directions?|steps?|preparation|recipe)\s*[:：]/gi, "\n$1:\n")
    .replace(/([.!?])\s+(?=(?:and then|then|next|now|once|when|while|meanwhile|to make|add|bake|boil|brown|chill|combine|cool|cover|cut|dimple|fold|grease|heat|knead|let|level|melt|mix|pipe|place|pop|pour|preheat|remove|rest|roll|season|serve|sprinkle|spread|stir|torch|transfer|whisk)\b)/gi, "$1\n")
    .split(/\r?\n/);
}

function splitIngredientLine(line) {
  const parts = line
    .split(/\s*(?:,|;|\band\b)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [line];
  const useful = parts.filter((part) => looksLikeIngredient(part) || /\b(cups?|tsp|teaspoons?|tbsp|tablespoons?|grams?|g|ml|oz|pounds?|lb)\b/i.test(part));
  return useful.length >= 2 ? useful : [line];
}

function parseIngredient(line) {
  const raw = cleanIngredientLine(line);
  const match = raw.match(/^([\d\s./⅛¼⅓½⅔¾⅞]+)?\s*([a-zA-Z]+\.?)?\s+(.+)$/);
  return {
    id: createId("ing"),
    raw,
    language: "en",
    quantity: match?.[1]?.trim(),
    unit: match?.[2]?.trim(),
    item: match?.[3]?.trim() ?? raw,
    normalized: { unitSystem: "unknown" },
    conversion: { confidence: "unknown" },
  };
}

function cleanIngredientLine(raw) {
  return raw
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s+(?=\d|[a-zA-Z¼⅓½⅔¾])/, "")
    .trim();
}

function parseStep(line, index) {
  const text = line.replace(/^\s*(?:\d+[:.)-]|\d{1,2}:\d{2}(?::\d{2})?)\s*/, "").trim();
  return {
    id: createId("step"),
    position: index + 1,
    text,
    language: "en",
    timerSeconds: parseTimerSeconds(text),
    temperature: parseTemperature(text),
    mediaAnchors: [{ sourceId: "source-local-mock", startSeconds: index * 45, label: text.slice(0, 36).toLowerCase(), confidence: "estimated" }],
  };
}

function parseTimerSeconds(text) {
  const match = text.match(/(\d+)\s*(minutes?|mins?|m)\b/i);
  return match ? Number(match[1]) * 60 : undefined;
}

function parseTemperature(text) {
  const celsius = text.match(/(\d{3})\s*°?\s*c\b/i);
  const fahrenheit = text.match(/(\d{3})\s*°?\s*f\b/i);
  if (celsius) return { value: Number(celsius[1]), unit: "c", raw: celsius[0] };
  if (fahrenheit) return { value: Number(fahrenheit[1]), unit: "f", raw: fahrenheit[0] };
  return undefined;
}

function looksLikeIngredient(line) {
  const clean = cleanIngredientLine(line);
  if (/^\d+$/.test(clean)) return false;
  if (/^\d+\s*°\s*[cf]\b/i.test(clean)) return false;
  return /^[-*•]?\s*(\d|[¼⅓½⅔¾]|a little|pinch|salt\b|pepper\b)/i.test(line) && !looksLikeStep(line);
}

function looksLikeStep(line) {
  return /^(?:\d+[:.)-]\s*)?(?:(?:and\s+)?then|next|now|once|when|while|meanwhile|to make|right[.,]?)?\s*\b(add|bake|boil|brown|chill|combine|cool|cover|cut|dimple|fold|grease|heat|knead|leave|let|level|melt|mix|pipe|place|pop|pour|preheat|remove|rest|roll|season|serve|sprinkle|spread|start|stir|torch|transfer|whisk)\b/i.test(line);
}

function isTitleLine(line) {
  if (line.length < 8 || line.length > 90) return false;
  if (looksLikeIngredient(line) || looksLikeStep(line)) return false;
  return !/^(ingredients?|instructions?|directions?|method|steps?|notes?|tips?)[:：]?$/i.test(line);
}

function parseYouTubeVideoId(input) {
  try {
    const url = new URL(input.match(/https?:\/\/\S+/)?.[0] ?? input);
    if (url.hostname.includes("youtu.be")) return cleanVideoId(url.pathname.slice(1));
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return cleanVideoId(url.searchParams.get("v") ?? "");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/") || url.pathname.startsWith("/live/")) {
        return cleanVideoId(url.pathname.split("/")[2] ?? "");
      }
      return undefined;
    }
  } catch {
    return cleanVideoId(input);
  }
  return undefined;
}

function parseChannelInput(input) {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return { handle: parts[0], url: input };
    if (parts[0] === "channel" && parts[1]) return { channelId: parts[1], url: input };
    return { url: input };
  } catch {
    if (input.startsWith("@")) return { handle: input };
    if (/^UC[\w-]{20,}$/.test(input)) return { channelId: input };
    return { handle: input.startsWith("@") ? input : `@${input}` };
  }
}

function cleanVideoId(value) {
  return value.match(/^[\w-]{11}/)?.[0];
}

function cloneCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("Missing candidate");
  return structuredClone(candidate);
}

function isGenericTitle(title) {
  return !title || /youtube recipe import/i.test(title);
}

function withoutLocalParserWarnings(warnings) {
  return warnings.filter((warning) => !/No ingredient-like lines|No instruction-like lines|No known recipe fixture/i.test(warning));
}

function normalizeAiCandidate(value, fallback) {
  if (!value || typeof value !== "object") throw new Error("OpenRouter returned no candidate object");
  return {
    ...fallback,
    ...value,
    id: stringOr(value.id, fallback.id),
    source: normalizeSource(value.source ?? fallback.source),
    title: stringOr(value.title, fallback.title),
    language: stringOr(value.language, fallback.language ?? "en"),
    description: optionalString(value.description),
    ingredients: Array.isArray(value.ingredients) ? value.ingredients.map(normalizeIngredient) : fallback.ingredients ?? [],
    steps: Array.isArray(value.steps) ? value.steps.map(normalizeStep) : fallback.steps ?? [],
    notes: stringArray(value.notes),
    tags: stringArray(value.tags),
    confidence: normalizeConfidence(value.confidence, fallback.confidence),
    warnings: stringArray(value.warnings),
  };
}

function normalizeSource(value) {
  return {
    id: stringOr(value?.id, createId("source")),
    type: stringOr(value?.type, "youtube"),
    url: optionalString(value?.url),
    title: optionalString(value?.title),
    author: optionalString(value?.author),
    retrievedAt: stringOr(value?.retrievedAt, new Date().toISOString()),
    media: value?.media
      ? {
          provider: "youtube",
          videoId: stringOr(value.media.videoId, ""),
          durationSeconds: optionalNumber(value.media.durationSeconds),
          thumbnailUrl: optionalString(value.media.thumbnailUrl),
          canonicalUrl: stringOr(value.media.canonicalUrl, value?.url ?? ""),
        }
      : undefined,
  };
}

function normalizeIngredient(value) {
  return {
    id: stringOr(value?.id, createId("ing")),
    section: optionalString(value?.section),
    raw: stringOr(value?.raw, ""),
    language: stringOr(value?.language, "en"),
    quantity: optionalString(value?.quantity),
    unit: optionalString(value?.unit),
    item: optionalString(value?.item),
    preparation: optionalString(value?.preparation),
    optional: Boolean(value?.optional),
    normalized: value?.normalized && typeof value.normalized === "object" ? value.normalized : { unitSystem: "unknown" },
    conversion: value?.conversion && typeof value.conversion === "object" ? value.conversion : { confidence: "unknown" },
  };
}

function normalizeStep(value, index) {
  return {
    id: stringOr(value?.id, createId("step")),
    section: optionalString(value?.section),
    position: Number.isFinite(value?.position) ? value.position : index + 1,
    text: stringOr(value?.text, ""),
    language: stringOr(value?.language, "en"),
    timerSeconds: optionalNumber(value?.timerSeconds),
    temperature: value?.temperature,
    ingredientRefs: stringArray(value?.ingredientRefs),
    mediaRefs: stringArray(value?.mediaRefs),
    mediaAnchors: Array.isArray(value?.mediaAnchors) ? value.mediaAnchors.map(normalizeMediaAnchor) : [],
  };
}

function normalizeMediaAnchor(value) {
  return {
    sourceId: stringOr(value?.sourceId, ""),
    startSeconds: Number.isFinite(value?.startSeconds) ? value.startSeconds : 0,
    endSeconds: optionalNumber(value?.endSeconds),
    label: optionalString(value?.label),
    confidence: ["manual", "imported", "estimated"].includes(value?.confidence) ? value.confidence : "estimated",
  };
}

function normalizeConfidence(value, fallback = {}) {
  return {
    overall: clamp01(value?.overall ?? fallback.overall ?? 0.2),
    source: clamp01(value?.source ?? fallback.source ?? 0.5),
    ingredients: clamp01(value?.ingredients ?? fallback.ingredients ?? 0.2),
    steps: clamp01(value?.steps ?? fallback.steps ?? 0.2),
  };
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value) {
  return Number.isFinite(value) ? value : undefined;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function recipeCandidateResponseSchema() {
  return {
    name: "recipe_candidate_refinement",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["candidate", "warnings"],
      properties: {
        warnings: { type: "array", items: { type: "string" } },
        candidate: recipeCandidateSchema(),
      },
    },
  };
}

function recipeCandidateSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "source",
      "title",
      "language",
      "description",
      "yield",
      "times",
      "ingredients",
      "steps",
      "notes",
      "tags",
      "confidence",
      "warnings",
    ],
    properties: {
      id: { type: "string" },
      source: sourceSchema(),
      title: { type: "string" },
      language: { type: "string" },
      description: { type: "string" },
      yield: {
        type: "object",
        additionalProperties: false,
        required: ["raw", "quantity", "unit"],
        properties: {
          raw: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
        },
      },
      times: {
        type: "object",
        additionalProperties: false,
        required: ["prepMinutes", "cookMinutes", "totalMinutes"],
        properties: {
          prepMinutes: { type: "number" },
          cookMinutes: { type: "number" },
          totalMinutes: { type: "number" },
        },
      },
      ingredients: { type: "array", items: ingredientSchema() },
      steps: { type: "array", items: stepSchema() },
      notes: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
      confidence: confidenceSchema(),
      warnings: { type: "array", items: { type: "string" } },
    },
  };
}

function sourceSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "type", "url", "title", "author", "retrievedAt", "media"],
    properties: {
      id: { type: "string" },
      type: { type: "string", enum: ["web", "youtube", "text", "pdf", "image", "manual"] },
      url: { type: "string" },
      title: { type: "string" },
      author: { type: "string" },
      retrievedAt: { type: "string" },
      media: {
        type: "object",
        additionalProperties: false,
        required: ["provider", "videoId", "durationSeconds", "thumbnailUrl", "canonicalUrl"],
        properties: {
          provider: { type: "string", enum: ["youtube"] },
          videoId: { type: "string" },
          durationSeconds: { type: "number" },
          thumbnailUrl: { type: "string" },
          canonicalUrl: { type: "string" },
        },
      },
    },
  };
}

function ingredientSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "section", "raw", "language", "quantity", "unit", "item", "preparation", "optional"],
    properties: {
      id: { type: "string" },
      section: { type: "string" },
      raw: { type: "string" },
      language: { type: "string" },
      quantity: { type: "string" },
      unit: { type: "string" },
      item: { type: "string" },
      preparation: { type: "string" },
      optional: { type: "boolean" },
    },
  };
}

function stepSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "section", "position", "text", "language", "timerSeconds", "temperature", "ingredientRefs", "mediaRefs", "mediaAnchors"],
    properties: {
      id: { type: "string" },
      section: { type: "string" },
      position: { type: "number" },
      text: { type: "string" },
      language: { type: "string" },
      timerSeconds: { type: "number" },
      temperature: {
        type: "object",
        additionalProperties: false,
        required: ["value", "unit", "raw"],
        properties: {
          value: { type: "number" },
          unit: { type: "string", enum: ["c", "f"] },
          raw: { type: "string" },
        },
      },
      ingredientRefs: { type: "array", items: { type: "string" } },
      mediaRefs: { type: "array", items: { type: "string" } },
      mediaAnchors: { type: "array", items: mediaAnchorSchema() },
    },
  };
}

function mediaAnchorSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["sourceId", "startSeconds", "endSeconds", "label", "confidence"],
    properties: {
      sourceId: { type: "string" },
      startSeconds: { type: "number" },
      endSeconds: { type: "number" },
      label: { type: "string" },
      confidence: { type: "string", enum: ["manual", "imported", "estimated"] },
    },
  };
}

function confidenceSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["overall", "source", "ingredients", "steps"],
    properties: {
      overall: { type: "number" },
      source: { type: "number" },
      ingredients: { type: "number" },
      steps: { type: "number" },
    },
  };
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
