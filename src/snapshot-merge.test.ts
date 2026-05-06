import { describe, expect, it } from "vitest";
import { mergeBaselineCatalog, type BaselineCatalog } from "./snapshot-merge";
import type { AppSnapshot, Recipe, RecipeVariant, RecipeVersion, Source } from "./types";

const recipe = (id: string, overrides: Partial<Recipe> = {}): Recipe => ({
  id,
  currentVersionId: `${id}-v1`,
  defaultVariantId: `${id}-original`,
  createdAt: "2026-05-04T00:00:00.000Z",
  updatedAt: "2026-05-04T00:00:00.000Z",
  ...overrides,
});

const variant = (id: string, recipeId: string): RecipeVariant => ({
  id,
  recipeId,
  name: "Original",
  baseVersionId: `${recipeId}-v1`,
  currentVersionId: `${recipeId}-v1`,
  createdAt: "2026-05-04T00:00:00.000Z",
});

const version = (id: string, recipeId: string, sourceIds: string[] = []): RecipeVersion => ({
  id,
  recipeId,
  variantId: `${recipeId}-original`,
  title: "Test recipe",
  language: "en",
  sourceIds,
  imageIds: [],
  ingredients: [],
  steps: [],
  notes: [],
  tags: [],
  collections: [],
  origin: "import",
  createdAt: "2026-05-04T00:00:00.000Z",
  createdBy: "importer",
});

const source = (id: string): Source => ({
  id,
  type: "manual",
  retrievedAt: "2026-05-04T00:00:00.000Z",
});

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

describe("mergeBaselineCatalog", () => {
  it("appends baseline records when the snapshot is empty", () => {
    const baseline: BaselineCatalog = {
      recipes: [recipe("r1")],
      variants: [variant("r1-original", "r1")],
      versions: [version("r1-v1", "r1", ["s1"])],
      sources: [source("s1")],
    };
    const result = mergeBaselineCatalog(emptySnapshot(), baseline);
    expect(result.changed).toBe(true);
    expect(result.snapshot.recipes).toHaveLength(1);
    expect(result.snapshot.recipes[0]?.id).toBe("r1");
    expect(result.snapshot.versions[0]?.sourceIds).toEqual(["s1"]);
  });

  it("does not duplicate records that already exist by id", () => {
    const snapshot = emptySnapshot();
    snapshot.recipes.push(recipe("r1"));
    snapshot.versions.push(version("r1-v1", "r1", ["s-existing"]));
    snapshot.variants.push(variant("r1-original", "r1"));
    snapshot.sources.push(source("s-existing"));

    const baseline: BaselineCatalog = {
      recipes: [recipe("r1")],
      variants: [variant("r1-original", "r1")],
      versions: [version("r1-v1", "r1", [])],
      sources: [],
    };
    const result = mergeBaselineCatalog(snapshot, baseline);
    expect(result.changed).toBe(false);
    expect(result.snapshot.recipes).toHaveLength(1);
  });

  it("merges new sourceIds into an existing version without removing user-added ones", () => {
    const snapshot = emptySnapshot();
    snapshot.recipes.push(recipe("r1"));
    snapshot.versions.push(version("r1-v1", "r1", ["s-user"]));
    snapshot.variants.push(variant("r1-original", "r1"));
    snapshot.sources.push(source("s-user"));

    const baseline: BaselineCatalog = {
      recipes: [recipe("r1")],
      variants: [variant("r1-original", "r1")],
      versions: [version("r1-v1", "r1", ["s-baseline"])],
      sources: [source("s-baseline")],
    };
    const result = mergeBaselineCatalog(snapshot, baseline);
    expect(result.changed).toBe(true);
    expect(result.snapshot.versions[0]?.sourceIds).toEqual(["s-user", "s-baseline"]);
  });

  it("does not mutate the input snapshot", () => {
    const snapshot = emptySnapshot();
    const baseline: BaselineCatalog = {
      recipes: [recipe("r1")],
      variants: [variant("r1-original", "r1")],
      versions: [version("r1-v1", "r1")],
      sources: [],
    };
    mergeBaselineCatalog(snapshot, baseline);
    expect(snapshot.recipes).toHaveLength(0);
  });

  it("reports changed=false when nothing new lands", () => {
    const snapshot = emptySnapshot();
    const baseline: BaselineCatalog = { recipes: [], variants: [], versions: [], sources: [] };
    const result = mergeBaselineCatalog(snapshot, baseline);
    expect(result.changed).toBe(false);
  });
});
