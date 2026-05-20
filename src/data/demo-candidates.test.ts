import { describe, expect, it } from "vitest";
import { demoCandidates, demoCandidatesAsBacklogVideos, demoCandidatesByPath } from "./demo-candidates";

describe("demoCandidates", () => {
  it("bundles five demo candidates", () => {
    expect(demoCandidates).toHaveLength(5);
  });

  it("each candidate carries a youtube source with a videoId", () => {
    for (const candidate of demoCandidates) {
      expect(candidate.source.type).toBe("youtube");
      expect(candidate.source.media?.videoId).toMatch(/^[\w-]{5,}$/);
    }
  });

  it("each candidate has confidence scores and a title", () => {
    for (const candidate of demoCandidates) {
      expect(candidate.title.length).toBeGreaterThan(0);
      expect(candidate.confidence.overall).toBeGreaterThan(0);
      expect(candidate.confidence.overall).toBeLessThanOrEqual(1);
    }
  });
});

describe("demoCandidatesByPath", () => {
  it("keys end with /candidates/<videoId>.candidate.json so the legacy path-suffix lookup matches", () => {
    for (const path of Object.keys(demoCandidatesByPath)) {
      expect(path).toMatch(/\/candidates\/[\w-]+\.candidate\.json$/);
    }
  });

  it("each entry wraps a candidate", () => {
    for (const entry of Object.values(demoCandidatesByPath)) {
      expect(entry.candidate).toBeDefined();
      expect(entry.candidate?.source.type).toBe("youtube");
    }
  });
});

describe("demoCandidatesAsBacklogVideos", () => {
  it("returns one backlog video per demo candidate, ready for the import list", () => {
    const videos = demoCandidatesAsBacklogVideos();
    expect(videos).toHaveLength(5);
    for (const video of videos) {
      expect(video.videoId).toMatch(/^[\w-]+$/);
      expect(video.url).toContain(video.videoId);
      expect((video.title ?? "").length).toBeGreaterThan(0);
      expect(video.status).toBe("candidate_ready");
      expect(video.candidate?.status).toBe("needs_review");
      expect(video.source).toBe("demo-candidate");
    }
  });

  it("preserves channel metadata when the candidate has it", () => {
    const videos = demoCandidatesAsBacklogVideos();
    expect(videos.some((video) => video.channelTitle && video.channelTitle.length > 0)).toBe(true);
    expect(videos.some((video) => video.thumbnailUrl && video.thumbnailUrl.startsWith("https://"))).toBe(true);
  });
});
