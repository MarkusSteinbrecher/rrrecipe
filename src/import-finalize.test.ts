import { describe, expect, it } from "vitest";
import { buildSnapshotForCandidate } from "./import-finalize";
import type { AppSnapshot, IngredientLine, InstructionStep, RecipeCandidate, Source } from "./types";

const now = "2026-05-06T21:00:00.000Z";

const emptySnapshot = (): AppSnapshot => ({
  recipes: [],
  variants: [],
  versions: [],
  sources: [],
  settings: {
    appLanguage: "en",
    recipeLanguageMode: "original",
    measurementSystem: "original",
    temperatureUnit: "original",
    theme: "dark",
    numberLocale: "en-US",
    cookingMode: {
      readbackEnabled: false,
      videoAutoSeek: false,
      commandInputEnabled: false,
    },
  },
});

const source = (overrides: Partial<Source> = {}): Source => ({
  id: "source-youtube-focaccia",
  type: "youtube",
  url: "https://www.youtube.com/watch?v=SzECOCrCSWg",
  retrievedAt: "2026-05-06T20:00:00.000Z",
  media: {
    provider: "youtube",
    videoId: "SzECOCrCSWg",
    canonicalUrl: "https://www.youtube.com/watch?v=SzECOCrCSWg",
  },
  ...overrides,
});

const ingredient = (overrides: Partial<IngredientLine> = {}): IngredientLine => ({
  id: "ing-1",
  raw: "500 g bread flour",
  language: "en",
  quantity: "500",
  unit: "g",
  item: "bread flour",
  conversion: { confidence: "unknown" },
  normalized: { unitSystem: "metric" },
  ...overrides,
});

const step = (overrides: Partial<InstructionStep> = {}): InstructionStep => ({
  id: "step-1",
  position: 1,
  text: "Mix flour and water.",
  language: "en",
  ...overrides,
});

const candidate = (overrides: Partial<RecipeCandidate> = {}): RecipeCandidate => ({
  id: "candidate-1",
  source: source(),
  title: "Focaccia",
  language: "en",
  description: "Olive oil flatbread.",
  yield: { quantity: 1, unit: "tray", raw: "1 tray" },
  times: { prepMinutes: 15, cookMinutes: 25, totalMinutes: 180 },
  ingredients: [ingredient()],
  steps: [step()],
  notes: ["Use plenty of oil."],
  tags: ["bread", "baking"],
  confidence: {
    overall: 0.9,
    source: 0.9,
    ingredients: 0.9,
    steps: 0.9,
  },
  warnings: [],
  ...overrides,
});

describe("buildSnapshotForCandidate", () => {
  it("promotes a candidate into recipe, version, variant, and source records", () => {
    const result = buildSnapshotForCandidate(emptySnapshot(), candidate(), now);

    expect(result.snapshot.recipes).toHaveLength(1);
    expect(result.snapshot.versions).toHaveLength(1);
    expect(result.snapshot.variants).toHaveLength(1);
    expect(result.snapshot.sources).toHaveLength(1);

    const recipe = result.snapshot.recipes[0];
    const version = result.snapshot.versions[0];
    const variant = result.snapshot.variants[0];
    expect(recipe?.id).toMatch(/^recipe-import-/);
    expect(version?.id).toMatch(/^version-import-/);
    expect(variant?.id).toMatch(/^variant-import-.*-original$/);
    expect(recipe?.currentVersionId).toBe(version?.id);
    expect(recipe?.defaultVariantId).toBe(variant?.id);
    expect(variant?.name).toBe("Original");
    expect(variant?.baseVersionId).toBe(version?.id);
    expect(variant?.currentVersionId).toBe(version?.id);
  });

  it("copies required candidate fields without rewriting ingredient raw text or step text", () => {
    const result = buildSnapshotForCandidate(emptySnapshot(), candidate(), now);
    const version = result.snapshot.versions[0];

    expect(version?.title).toBe("Focaccia");
    expect(version?.language).toBe("en");
    expect(version?.yield?.raw).toBe("1 tray");
    expect(version?.times?.totalMinutes).toBe(180);
    expect(version?.ingredients[0]?.raw).toBe("500 g bread flour");
    expect(version?.steps[0]?.text).toBe("Mix flour and water.");
    expect(version?.notes).toEqual(["Use plenty of oil."]);
    expect(version?.tags).toEqual(["bread", "baking"]);
  });

  it("marks import provenance on the created version", () => {
    const result = buildSnapshotForCandidate(emptySnapshot(), candidate(), now);
    const version = result.snapshot.versions[0];

    expect(version?.origin).toBe("import");
    expect(version?.createdBy).toBe("importer");
    expect(version?.createdAt).toBe(now);
    expect(version?.changeSummary).toBe("youtube import");
  });

  it("reuses an existing source id instead of adding a duplicate source", () => {
    const snapshot = emptySnapshot();
    snapshot.sources.push(source({ title: "Existing source title" }));

    const result = buildSnapshotForCandidate(snapshot, candidate({ source: source({ title: "Updated title" }) }), now);

    expect(result.snapshot.sources).toHaveLength(1);
    expect(result.snapshot.sources[0]?.id).toBe("source-youtube-focaccia");
    expect(result.snapshot.sources[0]?.title).toBe("Updated title");
    expect(result.snapshot.versions[0]?.sourceIds).toEqual(["source-youtube-focaccia"]);
  });

  it("does not mutate the input snapshot", () => {
    const snapshot = emptySnapshot();
    buildSnapshotForCandidate(snapshot, candidate(), now);
    expect(snapshot.recipes).toHaveLength(0);
    expect(snapshot.versions).toHaveLength(0);
    expect(snapshot.variants).toHaveLength(0);
    expect(snapshot.sources).toHaveLength(0);
  });
});
