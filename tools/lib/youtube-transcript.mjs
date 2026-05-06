// YouTube transcript retrieval, lifted from tools/import-dev-server/dev-server.mjs.
//
// Approach: fetch the watch-page HTML, scrape INNERTUBE_API_KEY, call the
// youtubei/v1/player endpoint (Android client) to get the caption track list,
// pick a track for the requested languages, fetch json3 (XML fallback), and
// return normalized segments. Same shape that scripts/lib/transcripts.mjs ->
// normalizeTranscriptSegments expects.
//
// This is a research/dev tool, not a public API surface. See ADR 0001 and
// tools/README.md.

export async function fetchYouTubeTranscript(videoId, languages = ["en"]) {
  const html = await fetchYouTubeWatchHtml(videoId);
  const apiKey = extractInnertubeApiKey(html);
  if (!apiKey) throw new Error("Could not extract YouTube player API key from watch page.");

  const player = await fetchInnertubePlayer(videoId, apiKey);
  assertYouTubePlayable(player, videoId);
  const captions = player?.captions?.playerCaptionsTracklistRenderer;
  const tracks = captions?.captionTracks ?? [];
  if (!tracks.length) throw new Error("No YouTube caption tracks are available for this video.");

  const selectedTrack = selectCaptionTrack(tracks, languages);
  if (!selectedTrack?.baseUrl) {
    throw new Error(`No caption track found for requested languages: ${languages.join(", ")}.`);
  }

  const segments = await fetchCaptionSegments(selectedTrack.baseUrl, videoId);
  const text = segments.map((segment) => segment.text).filter(Boolean).join("\n");
  if (!text.trim()) throw new Error("Caption track was found, but it did not contain transcript text.");

  return {
    videoId,
    language: captionTrackName(selectedTrack),
    languageCode: selectedTrack.languageCode ?? languages[0] ?? "en",
    isGenerated: selectedTrack.kind === "asr",
    isTranslatable: Boolean(selectedTrack.isTranslatable),
    translationLanguages: (captions.translationLanguages ?? []).map((language) => ({
      language: language.languageName?.runs?.[0]?.text ?? language.languageCode,
      languageCode: language.languageCode,
    })),
    segments,
    text,
    warning: "Transcript came from YouTube player caption tracks, not the official YouTube Data API.",
  };
}

async function fetchYouTubeWatchHtml(videoId) {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  let response = await fetch(url, { headers: youtubeTranscriptHeaders() });
  let html = htmlUnescape(await checkedText(response, videoId));

  if (html.includes('action="https://consent.youtube.com/s"')) {
    const consentToken = html.match(/name="v"\s+value="([^"]+)"/)?.[1];
    if (!consentToken) throw new Error("YouTube consent page was shown and no consent token could be parsed.");
    response = await fetch(url, {
      headers: {
        ...youtubeTranscriptHeaders(),
        cookie: `CONSENT=YES+${consentToken}`,
      },
    });
    html = htmlUnescape(await checkedText(response, videoId));
  }

  if (html.includes('class="g-recaptcha"')) {
    throw new Error("YouTube blocked the transcript request with a bot check.");
  }
  return html;
}

function youtubeTranscriptHeaders() {
  return {
    "accept-language": "en-US,en;q=0.9",
    "user-agent": "Mozilla/5.0 rrrecipe-local-dev/0.1",
  };
}

export function extractInnertubeApiKey(html) {
  return html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/)?.[1];
}

async function fetchInnertubePlayer(videoId, apiKey) {
  const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      ...youtubeTranscriptHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
        },
      },
      videoId,
    }),
  });
  return checkedJson(response, videoId);
}

export function assertYouTubePlayable(player, videoId) {
  const status = player?.playabilityStatus?.status;
  const reason = player?.playabilityStatus?.reason;
  if (!status || status === "OK") return;
  if (status === "LOGIN_REQUIRED" && reason === "Sign in to confirm you’re not a bot") {
    throw new Error("YouTube blocked the transcript request with a bot check.");
  }
  if (status === "LOGIN_REQUIRED" && reason?.includes("inappropriate")) {
    throw new Error("This video is age restricted and needs authentication.");
  }
  if (status === "ERROR" && reason === "This video is unavailable") {
    throw new Error(`Video is unavailable: ${videoId}`);
  }
  throw new Error(`YouTube video is not playable for transcript retrieval: ${reason ?? status}`);
}

export function selectCaptionTrack(tracks, languages) {
  const manualTracks = tracks.filter((track) => track.kind !== "asr");
  const generatedTracks = tracks.filter((track) => track.kind === "asr");
  for (const language of languages) {
    const manual = manualTracks.find((track) => track.languageCode === language);
    if (manual) return manual;
    const generated = generatedTracks.find((track) => track.languageCode === language);
    if (generated) return generated;
  }
  return manualTracks[0] ?? generatedTracks[0];
}

async function fetchCaptionSegments(baseUrl, videoId) {
  const jsonUrl = captionUrl(baseUrl, "json3");
  const response = await fetch(jsonUrl, { headers: youtubeTranscriptHeaders() });
  if (response.ok) {
    const data = await response.json();
    const jsonSegments = parseJson3CaptionSegments(data);
    if (jsonSegments.length) return jsonSegments;
  }

  const xmlUrl = captionUrl(baseUrl);
  const xmlResponse = await fetch(xmlUrl, { headers: youtubeTranscriptHeaders() });
  const xml = await checkedText(xmlResponse, videoId);
  return parseXmlCaptionSegments(xml);
}

export function captionUrl(baseUrl, format) {
  const url = new URL(baseUrl);
  url.searchParams.delete("fmt");
  if (format) url.searchParams.set("fmt", format);
  return url.toString();
}

export function parseJson3CaptionSegments(data) {
  return (data.events ?? [])
    .filter((event) => event.segs?.length)
    .map((event) => ({
      text: cleanupCaptionText(event.segs.map((segment) => segment.utf8 ?? "").join("")),
      start: Number(event.tStartMs ?? 0) / 1000,
      duration: Number(event.dDurationMs ?? 0) / 1000,
    }))
    .filter((segment) => segment.text);
}

export function parseXmlCaptionSegments(xml) {
  const segments = [];
  const pattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = pattern.exec(xml))) {
    const attributes = match[1];
    const text = cleanupCaptionText(stripHtml(htmlUnescape(match[2])));
    if (!text) continue;
    segments.push({
      text,
      start: Number(attributeValue(attributes, "start") ?? 0),
      duration: Number(attributeValue(attributes, "dur") ?? 0),
    });
  }
  return segments;
}

export function captionTrackName(track) {
  return track.name?.runs?.[0]?.text ?? track.name?.simpleText ?? track.languageCode ?? "unknown";
}

function attributeValue(attributes, name) {
  return attributes.match(new RegExp(`${name}="([^"]+)"`))?.[1];
}

function cleanupCaptionText(value) {
  return htmlUnescape(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "");
}

function htmlUnescape(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function checkedText(response, videoId) {
  const text = await response.text();
  if (response.status === 429) throw new Error(`YouTube blocked transcript request for ${videoId} with HTTP 429.`);
  if (!response.ok) throw new Error(`YouTube transcript request failed with HTTP ${response.status}: ${text.slice(0, 160)}`);
  return text;
}

async function checkedJson(response, videoId) {
  const text = await checkedText(response, videoId);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`YouTube transcript request returned non-JSON data for ${videoId}.`);
  }
}
