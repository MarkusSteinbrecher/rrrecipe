// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { BROWSE_FILTERS, BROWSE_REF_IDS, browseRefsFromDocument, renderBrowse, type BrowseFilters } from "./render-browse";
import { mountIndexFragments } from "./render-test-harness";
import type { AppSnapshot } from "./types";

function mountBrowse() {
  mountIndexFragments({ ids: Object.values(BROWSE_REF_IDS) });
  return browseRefsFromDocument();
}

function snapshotWithRecipeCount(count: number): AppSnapshot {
  const recipes = baselineCatalog.recipes.slice(0, count);
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  const versionIds = new Set(recipes.map((recipe) => recipe.currentVersionId));
  const sourceIds = new Set(baselineCatalog.versions.filter((version) => recipeIds.has(version.recipeId)).flatMap((version) => version.sourceIds));
  return {
    recipes,
    variants: baselineCatalog.variants.filter((variant) => recipeIds.has(variant.recipeId)),
    versions: baselineCatalog.versions.filter((version) => versionIds.has(version.id)),
    sources: baselineCatalog.sources.filter((source) => sourceIds.has(source.id)),
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
  };
}

function browseFilters(overrides: Partial<BrowseFilters> = {}): BrowseFilters {
  return {
    query: "",
    activeFilter: "all",
    recipeSourceFilter: "all",
    filters: BROWSE_FILTERS,
    sourceFilters: ["all", "baseline", "themealdb", "youtube"],
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderBrowse", () => {
  it("shows an empty state when no recipes match", () => {
    const refs = mountBrowse();
    renderBrowse(refs, snapshotWithRecipeCount(2), browseFilters({ query: "zzzz-not-a-recipe" }));

    expect(refs.count.textContent).toBe("0 RECIPES");
    expect(refs.list.children).toHaveLength(0);
    expect(refs.emptyState.hidden).toBe(false);
    expect(refs.emptyState.textContent).toContain("No recipes match");
  });

  it("renders a populated recipe list", () => {
    const refs = mountBrowse();
    renderBrowse(refs, snapshotWithRecipeCount(2), browseFilters());

    expect(refs.count.textContent).toBe("2 RECIPES");
    expect(refs.list.querySelectorAll(".rr-row")).toHaveLength(2);
    expect(refs.list.textContent).toContain("focaccia");
    expect(refs.list.textContent).toContain("spaghetti carbonara");
    expect(refs.emptyState.hidden).toBe(true);
  });

  it("renders recipe and source filter chips", () => {
    const refs = mountBrowse();
    renderBrowse(refs, snapshotWithRecipeCount(2), browseFilters({ activeFilter: "pasta", recipeSourceFilter: "baseline" }));

    expect(refs.filterChips.querySelectorAll(".rr-chip")).toHaveLength(BROWSE_FILTERS.length);
    expect(refs.sourceFilters.querySelectorAll(".rr-chip")).toHaveLength(4);
    expect(refs.filterChips.querySelector(".is-active")?.textContent).toBe("pasta");
    expect(refs.sourceFilters.querySelector(".is-active")?.textContent).toBe("baseline");
  });
});
