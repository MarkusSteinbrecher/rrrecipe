// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { demoCandidates } from "./data/demo-candidates";
import {
  IMPORT_REVIEW_REF_IDS,
  importReviewRefsFromDocument,
  parseAnchorInput,
  renderImportReview,
} from "./render-import-review";
import { mountIndexFragments } from "./render-test-harness";
import type { RecipeCandidate } from "./types";

function mountReview() {
  mountIndexFragments({ ids: Object.values(IMPORT_REVIEW_REF_IDS) });
  return importReviewRefsFromDocument();
}

function focacciaCandidate(): RecipeCandidate {
  const focaccia = demoCandidates.find((candidate) => candidate.source.media?.videoId === "SzECOCrCSWg");
  if (!focaccia) throw new Error("focaccia demo candidate missing");
  return focaccia;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderImportReview", () => {
  it("renders the candidate title, source line, and confidence badges", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    expect(refs.title.textContent?.toLowerCase()).toContain("focaccia");
    expect(refs.source.textContent).toContain("YOUTUBE");
    expect(refs.source.textContent?.toLowerCase()).toContain("food language");
    expect(refs.confidence.textContent).toMatch(/overall \d+%/);
    expect(refs.confidence.querySelectorAll("span").length).toBe(4);
  });

  it("embeds a youtube-nocookie iframe with the video id", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    const iframe = refs.videoFrame.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("youtube-nocookie.com/embed/SzECOCrCSWg");
    expect(iframe?.getAttribute("allowfullscreen")).not.toBeNull();
  });

  it("renders every ingredient line and every step from the candidate", () => {
    const refs = mountReview();
    const candidate = focacciaCandidate();
    renderImportReview(refs, candidate);

    expect(refs.body.querySelectorAll("li[data-ingredient-id]").length).toBe(candidate.ingredients.length);
    expect(refs.body.querySelectorAll("li[data-step-id]").length).toBe(candidate.steps.length);
  });

  it("shows the warnings strip only when the candidate has warnings", () => {
    const refs = mountReview();
    const candidate = focacciaCandidate();

    const stripped: RecipeCandidate = { ...candidate, warnings: [] };
    renderImportReview(refs, stripped);
    expect(refs.warnings.hidden).toBe(true);

    const warned: RecipeCandidate = { ...candidate, warnings: ["check the salt twice"] };
    renderImportReview(refs, warned);
    expect(refs.warnings.hidden).toBe(false);
    expect(refs.warnings.textContent).toContain("check the salt twice");
  });

  it("renders empty editable lists with add buttons when there are no steps or ingredients", () => {
    const refs = mountReview();
    const candidate = focacciaCandidate();
    const empty: RecipeCandidate = { ...candidate, ingredients: [], steps: [] };
    renderImportReview(refs, empty);

    expect(refs.body.querySelectorAll("li[data-ingredient-id]").length).toBe(0);
    expect(refs.body.querySelectorAll("li[data-step-id]").length).toBe(0);
    expect(refs.body.querySelector('[data-action="add-ingredient"]')).not.toBeNull();
    expect(refs.body.querySelector('[data-action="add-step"]')).not.toBeNull();
  });

  it("falls back to a no-video message when the source has no videoId", () => {
    const refs = mountReview();
    const candidate = focacciaCandidate();
    const noVideo: RecipeCandidate = {
      ...candidate,
      source: { ...candidate.source, media: undefined },
    };
    renderImportReview(refs, noVideo);

    expect(refs.videoFrame.querySelector("iframe")).toBeNull();
    expect(refs.videoFrame.textContent).toContain("No embedded video");
  });

  it("exposes a back button with the close-import-review action", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());
    expect(refs.back.dataset.action).toBe("close-import-review");
  });

  it("renders editable text inputs for the candidate header", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    const titleInput = refs.body.querySelector<HTMLInputElement>('[data-action="edit-candidate-title"]');
    expect(titleInput).not.toBeNull();
    expect(titleInput?.value.toLowerCase()).toContain("focaccia");

    expect(refs.body.querySelector('[data-action="edit-candidate-description"]')).not.toBeNull();
    expect(refs.body.querySelector('[data-action="edit-candidate-yield-raw"]')).not.toBeNull();
    expect(refs.body.querySelectorAll('[data-action="edit-candidate-time"]').length).toBe(3);
    expect(refs.body.querySelector('[data-action="edit-candidate-language"]')).not.toBeNull();
  });

  it("renders per-ingredient edit controls (raw, optional, reorder, remove)", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    const firstRow = refs.body.querySelector<HTMLElement>("li[data-ingredient-id]");
    expect(firstRow).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="edit-ingredient-raw"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="toggle-ingredient-optional"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="move-ingredient-up"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="move-ingredient-down"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="remove-ingredient"]')).not.toBeNull();
  });

  it("renders per-step edit controls (text, timer, temperature, anchors, remove)", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    const firstRow = refs.body.querySelector<HTMLElement>("li[data-step-id]");
    expect(firstRow).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="edit-step-text"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="edit-step-timer"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="edit-step-temp-value"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="edit-step-temp-unit"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="add-step-anchor"]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-step-anchor-input]')).not.toBeNull();
    expect(firstRow?.querySelector('[data-action="remove-step"]')).not.toBeNull();
  });

  it("renders the save bar with a disabled save button and a discard button", () => {
    const refs = mountReview();
    renderImportReview(refs, focacciaCandidate());

    const save = refs.body.querySelector<HTMLButtonElement>('[data-action="save-import-review"]');
    expect(save).not.toBeNull();
    expect(save?.disabled).toBe(true);
    expect(save?.textContent?.toLowerCase()).toContain("phase d");

    const discard = refs.body.querySelector<HTMLButtonElement>('[data-action="close-import-review"]');
    expect(discard).not.toBeNull();
  });
});

describe("parseAnchorInput", () => {
  it("parses mm:ss form", () => {
    expect(parseAnchorInput("1:23")).toBe(83);
    expect(parseAnchorInput("0:30")).toBe(30);
    expect(parseAnchorInput("10:00")).toBe(600);
  });

  it("parses hh:mm:ss form", () => {
    expect(parseAnchorInput("1:00:00")).toBe(3600);
    expect(parseAnchorInput("0:01:30")).toBe(90);
  });

  it("parses raw seconds", () => {
    expect(parseAnchorInput("45")).toBe(45);
    expect(parseAnchorInput("  120 ")).toBe(120);
  });

  it("rejects empty and garbage input", () => {
    expect(parseAnchorInput("")).toBeUndefined();
    expect(parseAnchorInput("   ")).toBeUndefined();
    expect(parseAnchorInput("nope")).toBeUndefined();
    expect(parseAnchorInput("-5")).toBeUndefined();
    expect(parseAnchorInput("1:abc")).toBeUndefined();
  });
});
