// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { IMPORT_REF_IDS, importRefsFromDocument, renderImport, type ImportIntakeState } from "./render-import";
import { mountIndexFragments } from "./render-test-harness";
import type { AppSnapshot, RecipeCandidate } from "./types";

function mountImport() {
  mountIndexFragments({ ids: Object.values(IMPORT_REF_IDS) });
  return importRefsFromDocument();
}

function snapshotFixture(): AppSnapshot {
  return {
    recipes: baselineCatalog.recipes.slice(0, 1),
    variants: baselineCatalog.variants.slice(0, 1),
    versions: baselineCatalog.versions.slice(0, 1),
    sources: baselineCatalog.sources.slice(0, 1),
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

function candidateFixture(): RecipeCandidate {
  return {
    id: "candidate-1",
    source: {
      id: "source-1",
      type: "youtube",
      title: "Weeknight pasta",
      author: "Test Kitchen",
      retrievedAt: "2026-05-07T00:00:00.000Z",
      media: {
        provider: "youtube",
        videoId: "video-1",
        canonicalUrl: "https://www.youtube.com/watch?v=video-1",
      },
    },
    title: "Weeknight Pasta",
    language: "en",
    ingredients: [{ id: "ingredient-1", raw: "200 g pasta", language: "en", item: "pasta" }],
    steps: [{ id: "step-1", position: 1, text: "Boil the pasta.", language: "en" }],
    notes: [],
    tags: ["quick"],
    confidence: {
      overall: 0.82,
      source: 0.9,
      ingredients: 0.8,
      steps: 0.76,
    },
    warnings: [],
  };
}

function intake(overrides: Partial<ImportIntakeState> = {}): ImportIntakeState {
  return {
    channelInput: "",
    backlogEndpointAvailable: true,
    search: "",
    sourceFilter: "all",
    sourceFilters: ["all", "baseline", "themealdb", "youtube"],
    sourceSections: {
      showYouTube: true,
      youtubeHtml: "",
      showBaseline: true,
      baselineHtml: "",
      showMealDb: true,
      mealDbHtml: "",
      emptyMessage: "No YouTube videos yet.",
    },
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderImport", () => {
  it("shows an empty state when no candidates are queued", () => {
    const refs = mountImport();
    renderImport(refs, snapshotFixture(), intake());

    expect(refs.emptyState.hidden).toBe(false);
    expect(refs.emptyState.textContent).toBe("No YouTube videos yet.");
    expect(refs.youtubeContent.children).toHaveLength(0);
    expect(refs.candidateReview.hidden).toBe(true);
  });

  it("renders a single candidate source and review pane", () => {
    const refs = mountImport();
    const candidate = candidateFixture();
    renderImport(
      refs,
      snapshotFixture(),
      intake({
        sourceSections: {
          showYouTube: true,
          youtubeHtml: `<button class="rr-import-source-row" data-action="load-catalog-video" data-video-id="video-1">weeknight pasta</button>`,
          showBaseline: false,
          baselineHtml: "",
          showMealDb: false,
          mealDbHtml: "",
          emptyMessage: "No YouTube videos yet.",
        },
        candidate,
      }),
    );

    expect(refs.youtubeContent.querySelectorAll(".rr-import-source-row")).toHaveLength(1);
    expect(refs.emptyState.hidden).toBe(true);
    expect(refs.candidateReview.hidden).toBe(false);
    expect(refs.candidateReview.textContent).toContain("weeknight pasta");
    expect(refs.candidateReview.textContent).toContain("overall 82%");
  });

  it("renders channel-intake error state when the import api is offline", () => {
    const refs = mountImport();
    renderImport(
      refs,
      snapshotFixture(),
      intake({
        backlogEndpointAvailable: false,
        channelInput: "https://www.youtube.com/@example",
        channelStatus: "Import API offline. Start npm run research:dev-api.",
        sourceSections: {
          showYouTube: true,
          youtubeHtml: "",
          showBaseline: false,
          baselineHtml: "",
          showMealDb: false,
          mealDbHtml: "",
          emptyMessage: "Import API offline.",
        },
      }),
    );

    expect(refs.apiStatus.textContent).toBe("import api offline");
    expect(refs.channelInput.value).toBe("https://www.youtube.com/@example");
    expect(refs.channelStatus.hidden).toBe(false);
    expect(refs.channelStatus.textContent).toContain("Import API offline");
    expect(refs.emptyState.textContent).toBe("Import API offline.");
  });

  it("renders import source filter chips", () => {
    const refs = mountImport();
    renderImport(refs, snapshotFixture(), intake({ sourceFilter: "themealdb" }));

    expect(refs.sourceFilters.querySelectorAll(".rr-chip")).toHaveLength(4);
    expect(refs.sourceFilters.querySelector(".is-active")?.textContent).toBe("TheMealDB");
  });
});
