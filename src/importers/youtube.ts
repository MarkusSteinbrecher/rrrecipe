import { randomId } from "../format";
import type { IngredientLine, InstructionStep, RecipeCandidate, Source, YouTubeCatalogRecord } from "../types";

const FOCACCIA_VIDEO_ID = "SzECOCrCSWg";
const FOCACCIA_URL = `https://www.youtube.com/watch?v=${FOCACCIA_VIDEO_ID}`;

type YouTubeFixture = {
  title: string;
  author: string;
  channelId?: string;
  channelHandle?: string;
  description: string;
  yield: RecipeCandidate["yield"];
  times: RecipeCandidate["times"];
  ingredients: Array<Omit<IngredientLine, "id" | "language">>;
  steps: Array<Omit<InstructionStep, "id" | "language" | "mediaAnchors"> & { startSeconds: number; endSeconds?: number }>;
  notes: string[];
  tags: string[];
};

const knownYouTubeFixtures: Record<string, YouTubeFixture> = {
  [FOCACCIA_VIDEO_ID]: {
    title: "The Best Focaccia Bread",
    author: "Food Language",
    channelId: "UCLxplAwE9ijOwkKyEGeoZTQ",
    channelHandle: "@food-language",
    description: "A same-day no-knead focaccia with a crisp olive-oil crust and an airy interior.",
    yield: { raw: "1 tray", quantity: 1, unit: "tray" },
    times: { prepMinutes: 10, cookMinutes: 20, totalMinutes: 110 },
    ingredients: [
      { raw: "1 2/3 cups water (400 ml)", quantity: "1 2/3", unit: "cups", item: "water", conversion: { confidence: "exact", canonicalMilliliters: 400 }, normalized: { quantityValue: 1.667, unit: "cups", unitSystem: "us", ingredientKey: "water" } },
      { raw: "4 tsp fresh yeast (12 g), or 2 tsp dry yeast (6 g)", quantity: "4", unit: "tsp", item: "fresh yeast", conversion: { confidence: "exact", canonicalGrams: 12 }, normalized: { quantityValue: 4, unit: "tsp", unitSystem: "us", ingredientKey: "fresh_yeast" } },
      { raw: "1 tsp sugar", quantity: "1", unit: "tsp", item: "sugar", conversion: { confidence: "approximate" }, normalized: { quantityValue: 1, unit: "tsp", unitSystem: "us", ingredientKey: "sugar" } },
      { raw: "4 cups bread flour (500 g)", quantity: "4", unit: "cups", item: "bread flour", conversion: { confidence: "exact", canonicalGrams: 500 }, normalized: { quantityValue: 4, unit: "cups", unitSystem: "us", ingredientKey: "bread_flour" } },
      { raw: "2 tbsp olive oil, plus more for the tray and top", quantity: "2", unit: "tbsp", item: "olive oil", conversion: { confidence: "approximate", canonicalMilliliters: 30 }, normalized: { quantityValue: 2, unit: "tbsp", unitSystem: "us", ingredientKey: "olive_oil" } },
      { raw: "2 tsp salt, plus coarse salt for topping", quantity: "2", unit: "tsp", item: "salt", conversion: { confidence: "approximate" }, normalized: { quantityValue: 2, unit: "tsp", unitSystem: "us", ingredientKey: "salt" } },
      { raw: "A little water for the top", quantity: "1", item: "water for sprinkling", conversion: { confidence: "unknown" }, normalized: { unitSystem: "unknown", ingredientKey: "water" } },
    ],
    steps: [
      { position: 1, startSeconds: 0, text: "Dissolve yeast and sugar in the water until the yeast has broken up and the mixture looks even.", ingredientRefs: [] },
      { position: 2, startSeconds: 20, text: "Add the bread flour and mix with a wooden spoon until a soft, sticky dough forms.", ingredientRefs: [] },
      { position: 3, startSeconds: 44, text: "Mix in olive oil and salt until fully incorporated. Scrape down the bowl, cover, and rest for 30 minutes.", timerSeconds: 1800, ingredientRefs: [] },
      { position: 4, startSeconds: 78, text: "With wet hands, fold the four sides of the dough into the center, then lift and slap the dough back into the bowl a few times.", ingredientRefs: [] },
      { position: 5, startSeconds: 116, text: "Cover and rest for another 30 minutes, then repeat the stretch, fold, lift, and slap sequence.", timerSeconds: 1800, ingredientRefs: [] },
      { position: 6, startSeconds: 160, text: "Oil the baking tray generously, transfer the dough, add more oil on top, and gently spread it toward the edges.", ingredientRefs: [] },
      { position: 7, startSeconds: 204, text: "Cover the tray and rest for 30 minutes while the oven heats to 440°F (230°C).", timerSeconds: 1800, temperature: { value: 230, unit: "c", raw: "440°F (230°C)" }, ingredientRefs: [] },
      { position: 8, startSeconds: 246, text: "Oil your fingers and dimple the dough deeply, then sprinkle a little water and coarse salt over the surface.", ingredientRefs: [] },
      { position: 9, startSeconds: 292, text: "Bake at 440°F (230°C) for 20 minutes until deeply golden and crisp underneath.", timerSeconds: 1200, temperature: { value: 230, unit: "c", raw: "440°F (230°C)" }, ingredientRefs: [] },
      { position: 10, startSeconds: 328, text: "Move the focaccia to a wire rack and let it cool briefly before slicing.", ingredientRefs: [] },
    ],
    notes: [
      "Wet hands make the sticky dough easier to handle.",
      "The imported timestamps are approximate and should be editable in the marker workflow.",
    ],
    tags: ["bread", "baking", "italian", "youtube"],
  },
};

export function parseYouTubeVideoId(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed.match(/https?:\/\/\S+/)?.[0] ?? trimmed);
    if (url.hostname.includes("youtu.be")) return cleanVideoId(url.pathname.slice(1));
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return cleanVideoId(url.searchParams.get("v") ?? "");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return cleanVideoId(url.pathname.split("/")[2] ?? "");
      }
    }
  } catch {
    return cleanVideoId(trimmed);
  }

  return undefined;
}

export function createYouTubeCandidate(input: string): RecipeCandidate {
  const videoId = parseYouTubeVideoId(input);
  if (!videoId) {
    return emptyCandidate(input, ["No YouTube video ID found. Paste a normal YouTube, youtu.be, shorts, or embed URL."]);
  }

  const fixture = knownYouTubeFixtures[videoId];
  const source = createYouTubeSource(videoId, input, fixture);
  if (fixture) return candidateFromFixture(source, fixture);

  return candidateFromText(source, input);
}

export function createYouTubeCandidateFromCatalog(record: YouTubeCatalogRecord): RecipeCandidate {
  const source = createYouTubeSource(record.videoId, record.url, {
    title: record.title,
    author: record.channelTitle,
    description: record.description,
    yield: undefined,
    times: { totalMinutes: Math.max(1, Math.round(record.durationSeconds / 60)) },
    ingredients: [],
    steps: [],
    notes: [],
    tags: record.tags,
  });
  source.title = record.title;
  source.author = record.channelTitle;
  source.retrievedAt = new Date().toISOString();
  if (source.media) {
    source.media.durationSeconds = record.durationSeconds;
    source.media.thumbnailUrl = record.thumbnailUrl;
    source.media.channelId = record.channelId;
    source.media.channelTitle = record.channelTitle;
  }

  const candidate = candidateFromText(source, `${record.title}\n\n${record.description}`);
  return {
    ...candidate,
    title: record.title,
    description: record.description || "Draft source captured from the YouTube catalog.",
    times: { totalMinutes: Math.max(1, Math.round(record.durationSeconds / 60)) },
    tags: Array.from(new Set(["youtube", ...record.discoveredBy.slice(0, 3), ...record.tags.slice(0, 3).map((tag) => tag.toLowerCase())])).slice(0, 8),
    notes: [
      `Collected from YouTube catalog rank ${record.rank.toLocaleString()} by view count.`,
      `${record.viewCount.toLocaleString()} views on collection.`,
      record.transcript.notes,
    ],
    confidence: {
      ...candidate.confidence,
      source: 0.95,
      overall: candidate.ingredients.length && candidate.steps.length ? candidate.confidence.overall : 0.24,
    },
    warnings: [
      "This is a source catalog item, not a saved recipe yet. Review/refine before saving.",
      ...candidate.warnings,
    ],
  };
}

function candidateFromFixture(source: Source, fixture: YouTubeFixture): RecipeCandidate {
  return {
    id: createId("candidate"),
    source,
    title: fixture.title,
    language: "en",
    description: fixture.description,
    yield: fixture.yield,
    times: fixture.times,
    ingredients: fixture.ingredients.map((ingredient) => ({ id: createId("ing"), language: "en", ...ingredient })),
    steps: fixture.steps.map((step) => ({
      id: createId("step"),
      language: "en",
      text: step.text,
      position: step.position,
      timerSeconds: step.timerSeconds,
      temperature: step.temperature,
      ingredientRefs: step.ingredientRefs,
      mediaAnchors: [
        {
          sourceId: source.id,
          startSeconds: step.startSeconds,
          endSeconds: step.endSeconds,
          label: step.text.split(/[.,]/)[0]?.toLowerCase(),
          confidence: "estimated",
        },
      ],
    })),
    notes: fixture.notes,
    tags: fixture.tags,
    confidence: { overall: 0.82, source: 0.95, ingredients: 0.88, steps: 0.76 },
    warnings: ["Transcript access is not automatic in the static MVP. This candidate uses a known fixture plus editable estimated markers."],
  };
}

function candidateFromText(source: Source, input: string): RecipeCandidate {
  const sections = parseTextSections(input);
  const ingredientLines = sections.ingredients.slice(0, 40);
  const stepLines = sections.steps.slice(0, 30);
  const title = sections.title ?? source.title ?? "YouTube recipe import";
  const hasUsefulText = ingredientLines.length > 0 || stepLines.length > 0;
  const hasPastedRecipeText = sections.nonUrlLineCount > 0;

  return {
    id: createId("candidate"),
    source,
    title,
    language: "en",
    description: "Draft imported from a YouTube URL and pasted text.",
    ingredients: ingredientLines.map((raw) => parseIngredient(raw)),
    steps: stepLines.map((text, index) => ({
      id: createId("step"),
      position: index + 1,
      text: stripStepPrefix(text),
      language: "en",
      mediaAnchors: estimateAnchor(source.id, text, index),
      timerSeconds: parseTimerSeconds(text),
      temperature: parseTemperature(text),
    })),
    notes: [],
    tags: ["youtube"],
    confidence: {
      overall: ingredientLines.length && stepLines.length ? 0.64 : hasUsefulText ? 0.42 : 0.18,
      source: 0.9,
      ingredients: ingredientLines.length ? 0.62 : 0.1,
      steps: stepLines.length ? 0.56 : 0.1,
    },
    warnings: candidateWarnings(hasPastedRecipeText, ingredientLines.length, stepLines.length),
  };
}

function parseTextSections(input: string): { title?: string; ingredients: string[]; steps: string[]; nonUrlLineCount: number } {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//i.test(line));
  const title = lines.find((line) => isTitleLine(line));
  const ingredients: string[] = [];
  const steps: string[] = [];
  let section: "ingredients" | "steps" | "notes" | undefined;

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:：]\s*$/, "");
    if (/^(ingredients?|for the dough|for topping|shopping list)$/.test(lower)) {
      section = "ingredients";
      continue;
    }
    if (/^(instructions?|directions?|method|steps?|preparation|recipe)$/.test(lower)) {
      section = "steps";
      continue;
    }
    if (/^(notes?|tips?)$/.test(lower)) {
      section = "notes";
      continue;
    }

    if (section === "ingredients" && !looksLikeStep(line)) {
      ingredients.push(line);
      continue;
    }
    if (section === "steps" && !looksLikeIngredient(line)) {
      steps.push(line);
      continue;
    }
    if (!section && looksLikeIngredient(line)) ingredients.push(line);
    if (!section && looksLikeStep(line)) steps.push(line);
  }

  return {
    title,
    ingredients: dedupeLines(ingredients).filter((line) => !isTitleLine(line)),
    steps: dedupeLines(steps).filter((line) => line.length > 12),
    nonUrlLineCount: lines.length,
  };
}

function candidateWarnings(hasPastedRecipeText: boolean, ingredientCount: number, stepCount: number): string[] {
  if (!hasPastedRecipeText) {
    return [
      "Video source captured. To draft the recipe for an unknown video, paste the video description, transcript, or NotebookLM output below the URL.",
      "Automatic YouTube transcript extraction needs a backend provider and is not available in this static browser build.",
    ];
  }

  return [
    "No known recipe fixture found for this video. This draft is parsed locally from pasted text; use AI refinement when configured for a better structured result.",
    ...(ingredientCount ? [] : ["No ingredient-like lines were detected. Add an Ingredients section for better parsing."]),
    ...(stepCount ? [] : ["No instruction-like lines were detected. Add a Steps or Method section for better parsing."]),
  ];
}

function createYouTubeSource(videoId: string, input: string, fixture?: YouTubeFixture): Source {
  return {
    id: createId("source"),
    type: "youtube",
    url: input.match(/https?:\/\/\S+/)?.[0] ?? `https://www.youtube.com/watch?v=${videoId}`,
    title: fixture?.title,
    author: fixture?.author,
    retrievedAt: new Date().toISOString(),
    media: {
      provider: "youtube",
      videoId,
      channelId: fixture?.channelId,
      channelTitle: fixture?.author,
      channelHandle: fixture?.channelHandle,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
}

function emptyCandidate(input: string, warnings: string[]): RecipeCandidate {
  const source: Source = {
    id: createId("source"),
    type: "youtube",
    url: input,
    retrievedAt: new Date().toISOString(),
  };
  return {
    id: createId("candidate"),
    source,
    title: "YouTube recipe import",
    language: "en",
    ingredients: [],
    steps: [],
    notes: [],
    tags: ["youtube"],
    confidence: { overall: 0, source: 0, ingredients: 0, steps: 0 },
    warnings,
  };
}

function parseIngredient(raw: string): IngredientLine {
  const cleaned = cleanIngredientLine(raw);
  const match = cleaned.match(/^([\d\s./⅛¼⅓½⅔¾⅞]+)?\s*([a-zA-Z]+\.?)?\s+(.+)$/);
  return {
    id: createId("ing"),
    raw: cleaned,
    language: "en",
    quantity: match?.[1]?.trim(),
    unit: match?.[2]?.trim(),
    item: match?.[3]?.trim() ?? cleaned,
    normalized: { unitSystem: "unknown" },
    conversion: { confidence: "unknown" },
  };
}

function cleanIngredientLine(raw: string): string {
  return raw
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s+(?=\d|[a-zA-Z¼⅓½⅔¾])/, "")
    .trim();
}

function estimateAnchor(sourceId: string, text: string, index: number): InstructionStep["mediaAnchors"] {
  const timestamp = parseTimestamp(text);
  return [
    {
      sourceId,
      startSeconds: timestamp ?? index * 45,
      label: stripStepPrefix(text).slice(0, 36).toLowerCase(),
      confidence: timestamp === undefined ? "estimated" : "imported",
    },
  ];
}

function parseTimerSeconds(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(minutes?|mins?|m)\b/i);
  return match ? Number(match[1]) * 60 : undefined;
}

function parseTemperature(text: string): InstructionStep["temperature"] {
  const fahrenheit = text.match(/(\d{3})\s*°?\s*f\b/i);
  const celsius = text.match(/(\d{3})\s*°?\s*c\b/i);
  if (celsius) return { value: Number(celsius[1]), unit: "c", raw: celsius[0] };
  if (fahrenheit) return { value: Number(fahrenheit[1]), unit: "f", raw: fahrenheit[0] };
  return undefined;
}

function parseTimestamp(text: string): number | undefined {
  const match = text.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
  if (!match) return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

function looksLikeIngredient(line: string): boolean {
  return /^[-*•]?\s*(\d|[¼⅓½⅔¾]|a little|pinch|salt\b|pepper\b)/i.test(line) && !looksLikeStep(line);
}

function looksLikeStep(line: string): boolean {
  return /^(?:\d+[:.)-]\s*)?\b(add|bake|boil|combine|cover|cut|dimple|fold|grease|heat|knead|let|mix|place|preheat|remove|rest|roll|season|serve|sprinkle|stir|transfer|whisk)\b/i.test(line);
}

function stripStepPrefix(text: string): string {
  return text.replace(/^\s*(?:\d+[:.)-]|\d{1,2}:\d{2}(?::\d{2})?)\s*/, "").trim();
}

function isTitleLine(line: string): boolean {
  if (line.includes("http")) return false;
  if (line.length < 8 || line.length > 90) return false;
  if (looksLikeIngredient(line) || looksLikeStep(line)) return false;
  return !/^(ingredients?|instructions?|directions?|method|steps?|notes?|tips?)[:：]?$/i.test(line);
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanVideoId(value: string): string | undefined {
  const match = value.match(/^[\w-]{11}/);
  return match?.[0];
}

function createId(prefix: string): string {
  return `${prefix}-${randomId()}`;
}

export const sampleYouTubeImportUrl = FOCACCIA_URL;
