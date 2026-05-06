export function normalizeTranscriptSegments(segments, options = {}) {
  const maxGapSeconds = Number(options.maxGapSeconds ?? 1.2);
  const maxBlockChars = Number(options.maxBlockChars ?? 420);
  const cleanSegments = segments
    .map((segment, index) => ({
      text: cleanCaptionText(segment.text),
      start: numberOrZero(segment.start),
      duration: numberOrZero(segment.duration),
      sourceSegmentIndexes: [index],
    }))
    .filter((segment) => segment.text);

  const blocks = [];
  let current;

  for (const segment of cleanSegments) {
    if (!current) {
      current = startBlock(segment);
      continue;
    }

    const gap = Math.max(0, segment.start - current.end);
    const joined = joinCaptionText(current.text, segment.text);
    const shouldFlush =
      (endsSentence(current.text) && startsSentence(segment.text)) ||
      gap > maxGapSeconds ||
      joined.length > maxBlockChars;

    if (shouldFlush) {
      blocks.push(finalizeBlock(current, blocks.length));
      current = startBlock(segment);
      continue;
    }

    current.text = joined;
    current.end = Math.max(current.end, segment.start + segment.duration);
    current.duration = Math.max(0, current.end - current.start);
    current.sourceSegmentIndexes.push(...segment.sourceSegmentIndexes);
  }

  if (current) blocks.push(finalizeBlock(current, blocks.length));
  return blocks;
}

export function transcriptBlocksToText(blocks) {
  return blocks.map((block) => block.text).join("\n");
}

function startBlock(segment) {
  return {
    text: segment.text,
    start: segment.start,
    end: segment.start + segment.duration,
    duration: segment.duration,
    sourceSegmentIndexes: [...segment.sourceSegmentIndexes],
  };
}

function finalizeBlock(block, index) {
  return {
    id: `block-${index + 1}`,
    text: block.text.trim(),
    start: roundSeconds(block.start),
    duration: roundSeconds(block.duration),
    end: roundSeconds(block.end),
    sourceSegmentIndexes: block.sourceSegmentIndexes,
  };
}

function cleanCaptionText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function joinCaptionText(left, right) {
  if (!left) return right;
  if (!right) return left;
  const cleanRight = right.replace(/^\s+/, "");
  return `${left}${needsSpace(left, cleanRight) ? " " : ""}${cleanRight}`.replace(/\s+([,.!?;:])/g, "$1");
}

function needsSpace(left, right) {
  if (!right) return false;
  if (/[-/([{]$/.test(left)) return false;
  if (/^[,.;:!?)]/.test(right)) return false;
  return true;
}

function endsSentence(text) {
  return /[.!?]["')\]]?$/.test(text.trim());
}

function startsSentence(text) {
  return /^[A-Z0-9"']/.test(text.trim());
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundSeconds(value) {
  return Math.round(value * 1000) / 1000;
}
