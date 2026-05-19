// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { baselineCatalog } from "./data/baseline-catalog";
import { EDITOR_REF_IDS, editorRefsFromDocument, renderEditor } from "./render-editor";
import { mountIndexFragments } from "./render-test-harness";
import type { RecipeVersion } from "./types";

function mountEditor() {
  mountIndexFragments({ ids: Object.values(EDITOR_REF_IDS) });
  return editorRefsFromDocument();
}

function fixtureVersion(slug: string): RecipeVersion {
  const version = baselineCatalog.versions.find((v) => v.id === `version-baseline-${slug}-v1`);
  if (!version) throw new Error(`fixture missing: ${slug}`);
  return version;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderEditor", () => {
  it("pre-fills the title and change-note inputs from the version", () => {
    const refs = mountEditor();
    const version = fixtureVersion("focaccia");

    renderEditor(refs, version);

    expect(refs.titleInput.value).toBe(version.title);
    expect(refs.changeSummaryInput.value).toBe("adjusted recipe");
  });

  it("renders one ingredient and one step per line, preserving raw text", () => {
    const refs = mountEditor();
    const version = fixtureVersion("focaccia");

    renderEditor(refs, version);

    expect(refs.ingredientsTextarea.value).toBe(version.ingredients.map((i) => i.raw).join("\n"));
    expect(refs.ingredientsTextarea.value.split("\n")).toHaveLength(version.ingredients.length);
    expect(refs.stepsTextarea.value).toBe(version.steps.map((s) => s.text).join("\n"));
    expect(refs.stepsTextarea.value.split("\n")).toHaveLength(version.steps.length);
  });

  it("keeps cancel + save buttons wired through the document-level delegate", () => {
    const refs = mountEditor();
    renderEditor(refs, fixtureVersion("focaccia"));

    const cancel = refs.root.querySelector<HTMLButtonElement>('button[data-action="cancel-edit"]');
    expect(cancel).not.toBeNull();
    expect(cancel?.type).toBe("button");

    const save = refs.root.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(save).not.toBeNull();
    expect(save?.textContent).toBe("save version");
  });

  it("preserves the form contract the submit handler reads", () => {
    const refs = mountEditor();
    renderEditor(refs, fixtureVersion("focaccia"));

    expect(refs.root.dataset.form).toBe("recipe-editor");
    const data = new FormData(refs.root);
    expect(data.get("title")).toBe(fixtureVersion("focaccia").title);
    expect(data.get("changeSummary")).toBe("adjusted recipe");
  });
});
