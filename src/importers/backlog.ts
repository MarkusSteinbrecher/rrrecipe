import type { YouTubeBacklogChannel, YouTubeBacklogVideo } from "../types";

export type AddBacklogChannelResult = {
  channel: YouTubeBacklogChannel;
  video?: YouTubeBacklogVideo;
  status?: "channel_added" | "channel_exists" | "video_added" | "video_exists";
  message?: string;
  persisted: boolean;
  command: string;
  warning?: string;
};

export type ExpandBacklogChannelResult = {
  channel: YouTubeBacklogChannel;
  videos: YouTubeBacklogVideo[];
  enrichedCount?: number;
  persisted: boolean;
  command: string;
  warning?: string;
};

export type EnrichBacklogVideosResult = {
  channel: YouTubeBacklogChannel;
  videos: YouTubeBacklogVideo[];
  enrichedCount: number;
  pendingCount: number;
  persisted: boolean;
  command: string;
  warning?: string;
};

export type SaveBacklogTranscriptResult = {
  video: YouTubeBacklogVideo;
  persisted: boolean;
  transcriptPath?: string;
  transcriptJsonPath?: string;
  sanitizedPath?: string;
  blocksPath?: string;
  segmentCount?: number;
  blockCount?: number;
  language?: string;
  isGenerated?: boolean;
  warning?: string;
};

export type TranscriptSegment = { text: string; start: number; duration: number };
export type TranscriptBlock = TranscriptSegment & { id?: string; end?: number; sourceSegmentIndexes?: number[] };

export type ReadBacklogTranscriptResult = {
  video: YouTubeBacklogVideo;
  text: string;
  rawText?: string;
  sanitizedText?: string;
  segments: TranscriptSegment[];
  blocks: TranscriptBlock[];
  segmentCount: number;
  blockCount: number;
  language?: string;
  isGenerated?: boolean;
  localPath?: string;
  jsonPath?: string;
  sanitizedPath?: string;
  blocksPath?: string;
  persisted: boolean;
  warning?: string;
};

export type RetrieveBacklogSourcePagesResult = {
  video: YouTubeBacklogVideo;
  pages: NonNullable<YouTubeBacklogVideo["sourcePages"]>["pages"];
  retrievedCount: number;
  persisted: boolean;
  warning?: string;
};

export type ProcessBacklogVideoResult = {
  video: YouTubeBacklogVideo;
  candidate?: import("../types").RecipeCandidate;
  persisted: boolean;
  candidatePath?: string;
  model?: string;
  sourceTextKind?: string;
  sourceTextLength?: number;
  metadataRefreshed?: boolean;
  recipeTextFound?: boolean;
  warnings?: string[];
  warning?: string;
};

export function hasBacklogEndpoint(): boolean {
  return Boolean(backlogEndpoint());
}

export async function addChannelToBacklog(input: string): Promise<AddBacklogChannelResult> {
  const endpoint = backlogEndpoint();
  const fallback = createLocalBacklogChannel(input);
  if (!endpoint) {
    return {
      channel: fallback,
      persisted: false,
      command: backlogCommand(input),
      warning: "No backlog API endpoint is configured. This channel is shown locally only until it is added with the npm command.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: input, maxVideos: 500, priority: 3 }),
  });

  if (!response.ok) {
    return {
      channel: fallback,
      persisted: false,
      command: backlogCommand(input),
      warning: `Backlog API failed with ${response.status}. This channel is shown locally only until it is added with the npm command.`,
    };
  }

  const result = (await response.json()) as Partial<AddBacklogChannelResult>;
  return {
    channel: result.channel ?? fallback,
    video: result.video,
    status: result.status,
    message: result.message,
    persisted: Boolean(result.persisted),
    command: result.command ?? backlogCommand(input),
    warning: result.warning,
  };
}

export async function retrieveChannelVideos(channel: YouTubeBacklogChannel): Promise<ExpandBacklogChannelResult> {
  const endpoint = backlogEndpoint();
  const channelInput = channel.channelId ?? channel.handle ?? channel.url ?? channel.input;
  const command = expandCommand(channelInput, channel.maxVideos);
  if (!endpoint) {
    return {
      channel,
      videos: [],
      persisted: false,
      command,
      warning: "No backlog API endpoint is configured. Run the command from the terminal to retrieve videos.",
    };
  }

  const response = await fetch(`${endpoint}/expand`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: channelInput, maxVideos: channel.maxVideos }),
  });

  if (!response.ok) {
    return {
      channel,
      videos: [],
      persisted: false,
      command,
      warning: `Backlog API failed with ${response.status}. Run the command from the terminal to retrieve videos.`,
    };
  }

  const result = (await response.json()) as Partial<ExpandBacklogChannelResult>;
  return {
    channel: result.channel ?? channel,
    videos: result.videos ?? [],
    enrichedCount: result.enrichedCount,
    persisted: Boolean(result.persisted),
    command: result.command ?? command,
    warning: result.warning,
  };
}

export async function enrichChannelVideos(channel: YouTubeBacklogChannel, videoIds: string[] = []): Promise<EnrichBacklogVideosResult> {
  const endpoint = backlogEndpoint();
  const channelInput = channel.channelId ?? channel.handle ?? channel.url ?? channel.input;
  const command = `npm run youtube:enrich-videos -- --channel ${JSON.stringify(channelInput.trim())}`;
  if (!endpoint) {
    return {
      channel,
      videos: [],
      enrichedCount: 0,
      pendingCount: 0,
      persisted: false,
      command,
      warning: "No backlog API endpoint is configured. Run enrichment from the terminal once the script exists.",
    };
  }

  const response = await fetch(`${endpoint}/videos/enrich`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: channelInput, videoIds }),
  });

  if (!response.ok) {
    return {
      channel,
      videos: [],
      enrichedCount: 0,
      pendingCount: 0,
      persisted: false,
      command,
      warning: `Backlog API failed with ${response.status}.`,
    };
  }

  const result = (await response.json()) as Partial<EnrichBacklogVideosResult>;
  return {
    channel: result.channel ?? channel,
    videos: result.videos ?? [],
    enrichedCount: result.enrichedCount ?? 0,
    pendingCount: result.pendingCount ?? 0,
    persisted: Boolean(result.persisted),
    command: result.command ?? command,
    warning: result.warning,
  };
}

export async function saveBacklogVideoTranscript(video: YouTubeBacklogVideo, transcript: string, language = "en"): Promise<SaveBacklogTranscriptResult> {
  const endpoint = backlogVideoEndpoint("transcript");
  if (!endpoint) {
    return {
      video,
      persisted: false,
      warning: "No backlog API endpoint is configured. Run the local API to save transcript files.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoId: video.videoId, transcript, language }),
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    return {
      video,
      persisted: false,
      warning: `Backlog API failed with ${response.status}: ${message}`,
    };
  }

  const result = (await response.json()) as Partial<SaveBacklogTranscriptResult>;
  return {
    video: result.video ?? video,
    persisted: Boolean(result.persisted),
    transcriptPath: result.transcriptPath,
    warning: result.warning,
  };
}

export async function retrieveBacklogVideoTranscript(video: YouTubeBacklogVideo, languages = ["en"]): Promise<SaveBacklogTranscriptResult> {
  const endpoint = backlogVideoEndpoint("transcript/retrieve");
  if (!endpoint) {
    return {
      video,
      persisted: false,
      warning: "No backlog API endpoint is configured. Run the local API to retrieve transcripts.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoId: video.videoId, languages }),
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    return {
      video,
      persisted: false,
      warning: `Backlog API failed with ${response.status}: ${message}`,
    };
  }

  const result = (await response.json()) as Partial<SaveBacklogTranscriptResult>;
  return {
    video: result.video ?? video,
    persisted: Boolean(result.persisted),
    transcriptPath: result.transcriptPath,
    transcriptJsonPath: result.transcriptJsonPath,
    sanitizedPath: result.sanitizedPath,
    blocksPath: result.blocksPath,
    segmentCount: result.segmentCount,
    blockCount: result.blockCount,
    language: result.language,
    isGenerated: result.isGenerated,
    warning: result.warning,
  };
}

export async function readBacklogVideoTranscript(video: YouTubeBacklogVideo): Promise<ReadBacklogTranscriptResult> {
  const endpoint = backlogVideoEndpoint("transcript/read");
  if (!endpoint) {
    return {
      video,
      text: "",
      rawText: "",
      sanitizedText: "",
      segments: [],
      blocks: [],
      segmentCount: 0,
      blockCount: 0,
      persisted: false,
      warning: "No backlog API endpoint is configured. Run the local API to read transcript previews.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoId: video.videoId }),
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    return {
      video,
      text: "",
      rawText: "",
      sanitizedText: "",
      segments: [],
      blocks: [],
      segmentCount: 0,
      blockCount: 0,
      persisted: false,
      warning: `Backlog API failed with ${response.status}: ${message}`,
    };
  }

  const result = (await response.json()) as Partial<ReadBacklogTranscriptResult>;
  return {
    video: result.video ?? video,
    text: result.text ?? "",
    rawText: result.rawText ?? "",
    sanitizedText: result.sanitizedText ?? result.text ?? "",
    segments: result.segments ?? [],
    blocks: result.blocks ?? [],
    segmentCount: result.segmentCount ?? result.segments?.length ?? 0,
    blockCount: result.blockCount ?? result.blocks?.length ?? 0,
    language: result.language,
    isGenerated: result.isGenerated,
    localPath: result.localPath,
    jsonPath: result.jsonPath,
    sanitizedPath: result.sanitizedPath,
    blocksPath: result.blocksPath,
    persisted: Boolean(result.persisted),
    warning: result.warning,
  };
}

export async function retrieveBacklogVideoSourcePages(video: YouTubeBacklogVideo): Promise<RetrieveBacklogSourcePagesResult> {
  const endpoint = backlogVideoEndpoint("source-pages/retrieve");
  if (!endpoint) {
    return {
      video,
      pages: video.sourcePages?.pages ?? [],
      retrievedCount: 0,
      persisted: false,
      warning: "No backlog API endpoint is configured. Run the local API to retrieve recipe pages.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoId: video.videoId }),
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    return {
      video,
      pages: video.sourcePages?.pages ?? [],
      retrievedCount: 0,
      persisted: false,
      warning: `Backlog API failed with ${response.status}: ${message}`,
    };
  }

  const result = (await response.json()) as Partial<RetrieveBacklogSourcePagesResult>;
  return {
    video: result.video ?? video,
    pages: result.pages ?? result.video?.sourcePages?.pages ?? [],
    retrievedCount: result.retrievedCount ?? 0,
    persisted: Boolean(result.persisted),
    warning: result.warning,
  };
}

export async function processBacklogVideo(video: YouTubeBacklogVideo, transcript = "", useAi = true): Promise<ProcessBacklogVideoResult> {
  const endpoint = backlogVideoEndpoint("candidate");
  if (!endpoint) {
    return {
      video,
      persisted: false,
      warning: "No backlog API endpoint is configured. Run the local API to create candidate files.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ videoId: video.videoId, transcript, useAi }),
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    return {
      video,
      persisted: false,
      warning: `Backlog API failed with ${response.status}: ${message}`,
    };
  }

  const result = (await response.json()) as Partial<ProcessBacklogVideoResult>;
  return {
    video: result.video ?? video,
    candidate: result.candidate,
    persisted: Boolean(result.persisted),
    candidatePath: result.candidatePath,
    model: result.model,
    sourceTextKind: result.sourceTextKind,
    sourceTextLength: result.sourceTextLength,
    metadataRefreshed: result.metadataRefreshed,
    recipeTextFound: result.recipeTextFound,
    warnings: result.warnings,
    warning: result.warning,
  };
}

export function createLocalBacklogChannel(input: string): YouTubeBacklogChannel {
  const clean = input.trim();
  const parsed = parseChannelInput(clean);
  const now = new Date().toISOString();
  return {
    input: clean,
    url: parsed.url,
    handle: parsed.handle,
    channelId: parsed.channelId,
    status: "backlog",
    priority: 3,
    maxVideos: 500,
    notes: "",
    addedAt: now,
    updatedAt: now,
  };
}

function backlogEndpoint(): string | undefined {
  const explicit = import.meta.env.VITE_RRRECIPE_BACKLOG_API_URL?.trim();
  if (explicit) return explicit;
  const importEndpoint = import.meta.env.VITE_RRRECIPE_IMPORT_API_URL?.trim();
  if (importEndpoint?.endsWith("/api/import/refine")) return importEndpoint.replace(/\/api\/import\/refine$/, "/api/backlog/channels");
  const localApiBase = localDevApiBaseUrl();
  if (localApiBase) return `${localApiBase}/api/backlog/channels`;
  return undefined;
}

function backlogVideoEndpoint(kind: "transcript" | "transcript/retrieve" | "transcript/read" | "source-pages/retrieve" | "candidate"): string | undefined {
  const endpoint = backlogEndpoint();
  if (!endpoint) return undefined;
  return `${endpoint.replace(/\/channels$/, "")}/videos/${kind}`;
}

function backlogCommand(input: string): string {
  return `npm run youtube:backlog -- add-channel --channel ${JSON.stringify(input.trim())} --max-videos 500`;
}

function expandCommand(input: string, maxVideos: number): string {
  return `npm run youtube:expand-channel -- --channel ${JSON.stringify(input.trim())} --max-videos ${maxVideos}`;
}

async function responseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
    return JSON.stringify(body).slice(0, 180);
  } catch {
    return response.statusText || "request failed";
  }
}

function localDevApiBaseUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  return isLocal ? `${window.location.protocol}//${hostname}:8787` : undefined;
}

function parseChannelInput(input: string): { handle?: string; channelId?: string; url?: string } {
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
