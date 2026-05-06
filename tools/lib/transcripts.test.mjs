import { describe, expect, it } from "vitest";
import { normalizeTranscriptSegments, transcriptBlocksToText } from "./transcripts.mjs";

describe("normalizeTranscriptSegments", () => {
  it("returns an empty array when given no segments", () => {
    expect(normalizeTranscriptSegments([])).toEqual([]);
  });

  it("collapses contiguous segments into one block", () => {
    const blocks = normalizeTranscriptSegments([
      { text: "Heat the oil", start: 0, duration: 1.5 },
      { text: "in a large pan", start: 1.5, duration: 1.5 },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe("Heat the oil in a large pan");
    expect(blocks[0]?.id).toBe("block-1");
    expect(blocks[0]?.sourceSegmentIndexes).toEqual([0, 1]);
  });

  it("starts a new block at sentence boundaries", () => {
    const blocks = normalizeTranscriptSegments([
      { text: "Add the salt.", start: 0, duration: 1 },
      { text: "Stir well.", start: 1, duration: 1 },
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.text).toBe("Add the salt.");
    expect(blocks[1]?.text).toBe("Stir well.");
  });

  it("starts a new block on a long pause between captions", () => {
    const blocks = normalizeTranscriptSegments(
      [
        { text: "Mix everything", start: 0, duration: 1 },
        { text: "together", start: 5, duration: 1 },
      ],
      { maxGapSeconds: 1.2 },
    );
    expect(blocks).toHaveLength(2);
  });

  it("breaks a block when joining would exceed maxBlockChars", () => {
    const segments = Array.from({ length: 20 }, (_, index) => ({
      text: "and another long phrase",
      start: index,
      duration: 1,
    }));
    const blocks = normalizeTranscriptSegments(segments, { maxBlockChars: 100 });
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.text.length).toBeLessThanOrEqual(120);
    }
  });

  it("skips empty captions", () => {
    const blocks = normalizeTranscriptSegments([
      { text: "Step one", start: 0, duration: 1 },
      { text: "   ", start: 1, duration: 1 },
      { text: "Step two", start: 2, duration: 1 },
    ]);
    // The middle empty segment is dropped; the surrounding segments collapse together.
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe("Step one Step two");
  });

  it("rounds timestamps to millisecond precision", () => {
    const blocks = normalizeTranscriptSegments([{ text: "hello", start: 0.123456, duration: 1.234567 }]);
    expect(blocks[0]?.start).toBe(0.123);
    expect(blocks[0]?.duration).toBe(1.235);
  });
});

describe("transcriptBlocksToText", () => {
  it("joins block texts with newlines", () => {
    const text = transcriptBlocksToText([
      { id: "block-1", text: "Add the salt.", start: 0, end: 1, duration: 1, sourceSegmentIndexes: [0] },
      { id: "block-2", text: "Stir well.", start: 1, end: 2, duration: 1, sourceSegmentIndexes: [1] },
    ]);
    expect(text).toBe("Add the salt.\nStir well.");
  });
});
