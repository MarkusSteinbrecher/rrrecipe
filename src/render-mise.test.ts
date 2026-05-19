// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { MISE_REF_IDS, miseRefsFromDocument, renderMise } from "./render-mise";
import { mountIndexFragments } from "./render-test-harness";
import type { RecipeVersion } from "./types";

function mountMise() {
  mountIndexFragments({ ids: Object.values(MISE_REF_IDS) });
  return miseRefsFromDocument();
}

function fixtureVersion(slug: string): RecipeVersion {
  const version = baselineCatalog.versions.find((v) => v.id === `version-baseline-${slug}-v1`);
  if (!version) throw new Error(`fixture missing: ${slug}`);
  return version;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderMise", () => {
  it("renders zero-progress meta, bar, and an unchecked row per ingredient", () => {
    const refs = mountMise();
    const version = fixtureVersion("focaccia");

    renderMise(refs, version, new Set());

    expect(refs.meta.textContent).toContain(`0 of ${version.ingredients.length} ready`);
    expect(refs.meta.textContent).toContain("0%");
    expect(refs.progressBar.style.width).toBe("0%");
    const rows = refs.list.querySelectorAll<HTMLButtonElement>(".rr-ing");
    expect(rows).toHaveLength(version.ingredients.length);
    for (const row of rows) {
      expect(row.classList.contains("is-on")).toBe(false);
      expect(row.dataset.action).toBe("toggle-mise");
      expect(row.dataset.ingId).toBeTruthy();
    }
  });

  it("renders fully-checked meta and bar with every row marked", () => {
    const refs = mountMise();
    const version = fixtureVersion("focaccia");
    const allChecked = new Set(version.ingredients.map((i) => i.id));

    renderMise(refs, version, allChecked);

    expect(refs.meta.textContent).toContain(`${version.ingredients.length} of ${version.ingredients.length} ready`);
    expect(refs.meta.textContent).toContain("100%");
    expect(refs.progressBar.style.width).toBe("100%");
    const rows = refs.list.querySelectorAll<HTMLButtonElement>(".rr-ing");
    for (const row of rows) {
      expect(row.classList.contains("is-on")).toBe(true);
    }
  });

  it("renders partial progress with rounded percentage", () => {
    const refs = mountMise();
    const version = fixtureVersion("focaccia"); // 7 ingredients
    const partial = new Set([version.ingredients[0].id, version.ingredients[1].id]);

    renderMise(refs, version, partial);

    expect(refs.meta.textContent).toBe(`2 of ${version.ingredients.length} ready29%`);
    expect(refs.progressBar.style.width).toBe("29%");
    const onRows = refs.list.querySelectorAll(".rr-ing.is-on");
    expect(onRows).toHaveLength(2);
  });

  it("renders the begin-cooking CTA inside the mise shell", () => {
    const refs = mountMise();
    renderMise(refs, fixtureVersion("focaccia"), new Set());

    const cta = refs.root.querySelector('button[data-action="start-cooking"]');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain("begin cooking");
  });
});
