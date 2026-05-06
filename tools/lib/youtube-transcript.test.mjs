import { describe, expect, it } from "vitest";
import {
  assertYouTubePlayable,
  captionTrackName,
  captionUrl,
  extractInnertubeApiKey,
  parseJson3CaptionSegments,
  parseXmlCaptionSegments,
  selectCaptionTrack,
} from "./youtube-transcript.mjs";

describe("extractInnertubeApiKey", () => {
  it("pulls the key from a YouTube watch-page snippet", () => {
    const html = `before "INNERTUBE_API_KEY":"AIzaSyB-abc_DEF123" after`;
    expect(extractInnertubeApiKey(html)).toBe("AIzaSyB-abc_DEF123");
  });

  it("tolerates whitespace between the colon and the value", () => {
    const html = `"INNERTUBE_API_KEY":  "abc-XYZ_123"`;
    expect(extractInnertubeApiKey(html)).toBe("abc-XYZ_123");
  });

  it("returns undefined when the key is missing", () => {
    expect(extractInnertubeApiKey("no key here")).toBeUndefined();
  });
});

describe("selectCaptionTrack", () => {
  const manualEn = { kind: "manual", languageCode: "en", baseUrl: "https://example/en" };
  const manualDe = { kind: "manual", languageCode: "de", baseUrl: "https://example/de" };
  const asrEn = { kind: "asr", languageCode: "en", baseUrl: "https://example/asr-en" };
  const asrFr = { kind: "asr", languageCode: "fr", baseUrl: "https://example/asr-fr" };

  it("prefers a manual track over a generated one for the same language", () => {
    const tracks = [asrEn, manualEn];
    expect(selectCaptionTrack(tracks, ["en"])).toBe(manualEn);
  });

  it("prefers earlier languages in the request list over later ones", () => {
    const tracks = [manualEn, manualDe];
    expect(selectCaptionTrack(tracks, ["de", "en"])).toBe(manualDe);
  });

  it("falls back to a generated track when no manual is available", () => {
    expect(selectCaptionTrack([asrEn], ["en"])).toBe(asrEn);
  });

  it("falls back to the first available track when no language matches", () => {
    expect(selectCaptionTrack([manualDe, asrFr], ["es"])).toBe(manualDe);
    expect(selectCaptionTrack([asrFr], ["es"])).toBe(asrFr);
  });

  it("returns undefined when there are no tracks at all", () => {
    expect(selectCaptionTrack([], ["en"])).toBeUndefined();
  });
});

describe("captionUrl", () => {
  it("forces fmt=json3 when requested, replacing any prior fmt", () => {
    const url = captionUrl("https://example/captions?lang=en&fmt=srv3", "json3");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("fmt")).toBe("json3");
    expect(parsed.searchParams.get("lang")).toBe("en");
  });

  it("strips fmt entirely when called without a format", () => {
    const url = captionUrl("https://example/captions?lang=en&fmt=json3");
    expect(new URL(url).searchParams.has("fmt")).toBe(false);
  });
});

describe("parseJson3CaptionSegments", () => {
  it("flattens utf8 segments into one string per event", () => {
    const data = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 1500,
          segs: [{ utf8: "Heat" }, { utf8: " the oil" }],
        },
        {
          tStartMs: 2500,
          dDurationMs: 2000,
          segs: [{ utf8: "in a large pan" }],
        },
      ],
    };
    expect(parseJson3CaptionSegments(data)).toEqual([
      { text: "Heat the oil", start: 1, duration: 1.5 },
      { text: "in a large pan", start: 2.5, duration: 2 },
    ]);
  });

  it("skips events with no segs and events that produce empty text", () => {
    const data = {
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "  " }] },
        { tStartMs: 1000, dDurationMs: 1000 },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: "Stir well" }] },
      ],
    };
    expect(parseJson3CaptionSegments(data)).toEqual([
      { text: "Stir well", start: 2, duration: 1 },
    ]);
  });

  it("collapses runs of whitespace inside a single segment", () => {
    const data = {
      events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Add\nthe   salt" }] }],
    };
    expect(parseJson3CaptionSegments(data)[0]?.text).toBe("Add the salt");
  });

  it("returns an empty array when events is missing", () => {
    expect(parseJson3CaptionSegments({})).toEqual([]);
  });
});

describe("parseXmlCaptionSegments", () => {
  it("parses standard <text start=… dur=…> entries", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?><transcript>` +
      `<text start="0" dur="1.5">Heat the oil</text>` +
      `<text start="1.5" dur="2">in a large pan</text>` +
      `</transcript>`;
    expect(parseXmlCaptionSegments(xml)).toEqual([
      { text: "Heat the oil", start: 0, duration: 1.5 },
      { text: "in a large pan", start: 1.5, duration: 2 },
    ]);
  });

  it("unescapes HTML entities and strips inline tags", () => {
    const xml = `<text start="0" dur="1">Add &amp; stir &lt;b&gt;well&lt;/b&gt;</text>`;
    expect(parseXmlCaptionSegments(xml)[0]?.text).toBe("Add & stir well");
  });

  it("skips entries that produce empty text", () => {
    const xml = `<text start="0" dur="1">   </text><text start="1" dur="1">Salt</text>`;
    expect(parseXmlCaptionSegments(xml)).toEqual([{ text: "Salt", start: 1, duration: 1 }]);
  });

  it("returns an empty array when no <text> elements are present", () => {
    expect(parseXmlCaptionSegments(`<transcript></transcript>`)).toEqual([]);
  });
});

describe("captionTrackName", () => {
  it("prefers name.runs[0].text", () => {
    expect(captionTrackName({ name: { runs: [{ text: "English (auto)" }] }, languageCode: "en" })).toBe("English (auto)");
  });

  it("falls back to name.simpleText then to languageCode", () => {
    expect(captionTrackName({ name: { simpleText: "Deutsch" }, languageCode: "de" })).toBe("Deutsch");
    expect(captionTrackName({ languageCode: "es" })).toBe("es");
  });

  it("returns 'unknown' when nothing identifies the track", () => {
    expect(captionTrackName({})).toBe("unknown");
  });
});

describe("assertYouTubePlayable", () => {
  it("does not throw when the video is OK or status is missing", () => {
    expect(() => assertYouTubePlayable({}, "abc")).not.toThrow();
    expect(() => assertYouTubePlayable({ playabilityStatus: { status: "OK" } }, "abc")).not.toThrow();
  });

  it("maps the bot-check LOGIN_REQUIRED to a clear message", () => {
    expect(() =>
      assertYouTubePlayable({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm you’re not a bot" } }, "abc"),
    ).toThrow(/bot check/);
  });

  it("flags age-restricted videos", () => {
    expect(() =>
      assertYouTubePlayable({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "This video may be inappropriate for some users." } }, "abc"),
    ).toThrow(/age restricted/);
  });

  it("flags unavailable videos with the videoId", () => {
    expect(() =>
      assertYouTubePlayable({ playabilityStatus: { status: "ERROR", reason: "This video is unavailable" } }, "abc-123"),
    ).toThrow(/abc-123/);
  });

  it("falls through to a generic error for any other non-OK status", () => {
    expect(() =>
      assertYouTubePlayable({ playabilityStatus: { status: "UNPLAYABLE", reason: "Region locked" } }, "abc"),
    ).toThrow(/Region locked/);
  });
});
