import { describe, expect, it } from "vitest";
import { parseYouTubeVideoId } from "./youtube";

describe("parseYouTubeVideoId", () => {
  it("returns undefined for empty input", () => {
    expect(parseYouTubeVideoId("")).toBeUndefined();
    expect(parseYouTubeVideoId("   ")).toBeUndefined();
  });

  it("parses canonical youtube.com/watch URLs", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=SzECOCrCSWg")).toBe("SzECOCrCSWg");
    expect(parseYouTubeVideoId("https://youtube.com/watch?v=SzECOCrCSWg&t=120s")).toBe("SzECOCrCSWg");
  });

  it("parses youtu.be short URLs", () => {
    expect(parseYouTubeVideoId("https://youtu.be/SzECOCrCSWg")).toBe("SzECOCrCSWg");
    expect(parseYouTubeVideoId("https://youtu.be/SzECOCrCSWg?t=42")).toBe("SzECOCrCSWg");
  });

  it("parses /shorts/ and /embed/ URLs", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/shorts/SzECOCrCSWg")).toBe("SzECOCrCSWg");
    expect(parseYouTubeVideoId("https://www.youtube.com/embed/SzECOCrCSWg")).toBe("SzECOCrCSWg");
  });

  it("accepts a bare 11-character video id", () => {
    expect(parseYouTubeVideoId("SzECOCrCSWg")).toBe("SzECOCrCSWg");
    // Real backlog ids contain dashes/underscores.
    expect(parseYouTubeVideoId("-__qVqib9Pw")).toBe("-__qVqib9Pw");
  });

  it("extracts the URL when embedded in arbitrary text", () => {
    const pasted = "Check out https://www.youtube.com/watch?v=SzECOCrCSWg for the recipe!";
    expect(parseYouTubeVideoId(pasted)).toBe("SzECOCrCSWg");
  });
});
