import type { RecipeCandidate, YouTubeBacklogVideo } from "../types";

import banoffeeLasagna from "./demo-candidates/-__qVqib9Pw.candidate.json";
import flapjacks from "./demo-candidates/7SeMTPzWbx4.candidate.json";
import sMoresBlondie from "./demo-candidates/GJnQvXqRtdE.candidate.json";
import focaccia from "./demo-candidates/SzECOCrCSWg.candidate.json";
import fourIngredientBread from "./demo-candidates/yz3mSclK5kk.candidate.json";

type CandidateWrapper = {
  schemaVersion: number;
  generatedAt: string;
  sourceTextKind?: string;
  sourceTextLength?: number;
  metadataRefreshed?: boolean;
  candidate: RecipeCandidate;
};

const wrappers: CandidateWrapper[] = [
  focaccia as CandidateWrapper,
  banoffeeLasagna as CandidateWrapper,
  sMoresBlondie as CandidateWrapper,
  flapjacks as CandidateWrapper,
  fourIngredientBread as CandidateWrapper,
];

export const demoCandidates: RecipeCandidate[] = wrappers.map((w) => w.candidate);

export const demoCandidatesByPath: Record<string, { candidate: RecipeCandidate }> = Object.fromEntries(
  wrappers.map((w) => [`demo/candidates/${w.candidate.source.media?.videoId ?? w.candidate.id}.candidate.json`, { candidate: w.candidate }]),
);

export function demoCandidatesAsBacklogVideos(): YouTubeBacklogVideo[] {
  const now = "2026-05-20T00:00:00.000Z";
  return demoCandidates.map((candidate) => {
    const media = candidate.source.media;
    const videoId = media?.videoId ?? candidate.id;
    return {
      videoId,
      url: media?.canonicalUrl ?? candidate.source.url ?? `https://www.youtube.com/watch?v=${videoId}`,
      title: candidate.source.title ?? candidate.title,
      description: candidate.description,
      thumbnailUrl: media?.thumbnailUrl,
      durationSeconds: media?.durationSeconds,
      channelId: media?.channelId,
      channelTitle: media?.channelTitle,
      channelHandle: media?.channelHandle,
      status: "candidate_ready",
      priority: 1,
      notes: "Bundled demo candidate — ready to review without an import API.",
      source: "demo-candidate",
      candidate: {
        status: "needs_review",
        generatedAt: now,
      },
      addedAt: now,
      updatedAt: now,
    } satisfies YouTubeBacklogVideo;
  });
}
