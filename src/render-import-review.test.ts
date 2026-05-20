// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { demoCandidates } from "./data/demo-candidates";
import {
  IMPORT_REVIEW_REF_IDS,
  importReviewRefsFromDocument,
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

    expect(refs.body.querySelectorAll(".rr-import-review-ingredients li").length).toBe(candidate.ingredients.length);
    expect(refs.body.querySelectorAll(".rr-import-review-steps li").length).toBe(candidate.steps.length);
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

  it("shows an empty hint when there are no steps or ingredients", () => {
    const refs = mountReview();
    const candidate = focacciaCandidate();
    const empty: RecipeCandidate = { ...candidate, ingredients: [], steps: [] };
    renderImportReview(refs, empty);

    expect(refs.body.textContent).toContain("No ingredients extracted yet.");
    expect(refs.body.textContent).toContain("No steps extracted yet.");
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
});
