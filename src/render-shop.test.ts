// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { SHOP_REF_IDS, shopRefsFromDocument, renderShop } from "./render-shop";
import { mountIndexFragments } from "./render-test-harness";
import type { RecipeVersion } from "./types";

function mountShop() {
  mountIndexFragments({ ids: Object.values(SHOP_REF_IDS) });
  return shopRefsFromDocument();
}

function fixtureVersion(slug: string): RecipeVersion {
  const version = baselineCatalog.versions.find((v) => v.id === `version-baseline-${slug}-v1`);
  if (!version) throw new Error(`fixture missing: ${slug}`);
  return version;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderShop", () => {
  it("populates the count badge and renders one ingredient row per item", () => {
    const refs = mountShop();
    const version = fixtureVersion("focaccia");

    renderShop(refs, version);

    expect(refs.count.textContent).toBe(`${version.ingredients.length} ITEMS`);
    expect(refs.list.querySelectorAll(".rr-ing")).toHaveLength(version.ingredients.length);
  });

  it("renders ingredients in plain mode without mise toggles or check slots", () => {
    const refs = mountShop();
    renderShop(refs, fixtureVersion("focaccia"));

    const rows = Array.from(refs.list.querySelectorAll<HTMLButtonElement>(".rr-ing"));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.classList.contains("rr-ing--plain")).toBe(true);
      expect(row.dataset.action).toBeUndefined();
      expect(row.querySelector(".check")).toBeNull();
    }
  });

  it("shows ingredient quantities and names from the version data", () => {
    const refs = mountShop();
    const version = fixtureVersion("focaccia");
    renderShop(refs, version);

    const firstRow = refs.list.querySelector(".rr-ing");
    const firstIngredient = version.ingredients[0];
    expect(firstRow?.querySelector(".name")?.textContent?.trim()).toBe(firstIngredient.item ?? firstIngredient.raw);
  });

  it("renders the prep-ingredients CTA inside the shop shell", () => {
    const refs = mountShop();
    renderShop(refs, fixtureVersion("focaccia"));

    const cta = refs.root.querySelector('button[data-action="start-mise"]');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain("prep ingredients");
  });
});
