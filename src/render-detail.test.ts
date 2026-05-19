// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { DETAIL_REF_IDS, detailRefsFromDocument, renderDetail, type DetailViewState } from "./render-detail";
import { mountIndexFragments } from "./render-test-harness";
import type { AppSnapshot, Recipe, RecipeVersion } from "./types";

function mountDetail() {
  mountIndexFragments({ ids: Object.values(DETAIL_REF_IDS) });
  return detailRefsFromDocument();
}

function snapshotFixture(): AppSnapshot {
  return {
    recipes: baselineCatalog.recipes,
    variants: baselineCatalog.variants,
    versions: baselineCatalog.versions,
    sources: baselineCatalog.sources,
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

function findFixture(snapshot: AppSnapshot, slug: string): { recipe: Recipe; version: RecipeVersion } {
  const version = snapshot.versions.find((v) => v.id === `version-baseline-${slug}-v1`);
  if (!version) throw new Error(`fixture missing: ${slug}`);
  const recipe = snapshot.recipes.find((r) => r.id === version.recipeId);
  if (!recipe) throw new Error(`fixture missing recipe for ${slug}`);
  return { recipe, version };
}

function view(overrides: Partial<DetailViewState> = {}): DetailViewState {
  const base: DetailViewState = {
    servings: 4,
    miseCheckedIds: new Set(),
    expandedSections: {},
    cookStepIndex: 0,
  };
  return { ...base, ...overrides };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderDetail", () => {
  it("renders the titlebar, all four workflow rows, and the begin-cooking CTA", () => {
    const refs = mountDetail();
    const snapshot = snapshotFixture();
    const { recipe, version } = findFixture(snapshot, "focaccia");

    renderDetail(refs, snapshot, recipe, version, view({ servings: version.yield?.quantity ?? 1 }));

    expect(refs.title.textContent).toBe("focaccia");
    const rows = refs.workflowRows.querySelectorAll(".rr-workflow-row");
    expect(rows).toHaveLength(4);
    const metaCounts = Array.from(refs.workflowRows.querySelectorAll(".rr-workflow-row > button .count")).map(
      (el) => el.textContent,
    );
    expect(metaCounts).toEqual([
      `${version.times?.totalMinutes ?? 35} min total`,
      `${version.ingredients.length} ingredients`,
      `0 / ${version.ingredients.length} ready`,
      `${version.steps.length} steps`,
    ]);
    const cta = refs.root.querySelector('button[data-action="start-cooking"]');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain("begin cooking");
  });

  it("reflects servings adjustments in the shop workflow row", () => {
    const refs = mountDetail();
    const snapshot = snapshotFixture();
    const { recipe, version } = findFixture(snapshot, "focaccia");

    renderDetail(
      refs,
      snapshot,
      recipe,
      version,
      view({ servings: 12, expandedSections: { "workflow-shop": true } }),
    );

    const shopRow = refs.workflowRows.querySelector(".rr-workflow-row--shop");
    expect(shopRow).not.toBeNull();
    const stepperLabel = shopRow!.querySelector(".rr-serving-stepper span:nth-child(2)");
    expect(stepperLabel?.textContent).toBe(`12 ${version.yield?.unit ?? "servings"}`);
  });

  it("labels the cook workflow row with the step count and renders one row per step", () => {
    const refs = mountDetail();
    const snapshot = snapshotFixture();
    const { recipe, version } = findFixture(snapshot, "focaccia");

    renderDetail(
      refs,
      snapshot,
      recipe,
      version,
      view({ expandedSections: { "workflow-cook": true } }),
    );

    const cookRow = refs.workflowRows.querySelector(".rr-workflow-row--cook");
    expect(cookRow?.querySelector(".rr-expand-right .count")?.textContent).toBe(
      `${version.steps.length} steps`,
    );
    const stepRows = cookRow!.querySelectorAll(".rr-step-row-inline");
    expect(stepRows).toHaveLength(version.steps.length);
  });

  it("renders the version history list with one entry per saved version", () => {
    const refs = mountDetail();
    const snapshot = snapshotFixture();
    const { recipe, version } = findFixture(snapshot, "focaccia");

    renderDetail(refs, snapshot, recipe, version, view());

    const recipeVersions = snapshot.versions.filter((v) => v.recipeId === recipe.id);
    expect(refs.historyCount.textContent).toBe(String(recipeVersions.length));
    expect(refs.historyList.querySelectorAll(".rr-version-line")).toHaveLength(recipeVersions.length);
    expect(refs.historyList.querySelector(".rr-version-line.active")?.getAttribute("data-version-id")).toBe(
      version.id,
    );
  });
});
