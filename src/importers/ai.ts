import type { RecipeCandidate, RecipeCandidateRefinementRequest, RecipeCandidateRefinementResponse } from "../types";

export type AiRefinementResult = {
  candidate: RecipeCandidate;
  model?: string;
  warnings: string[];
  usedFallback: boolean;
};

export function hasAiImportEndpoint(): boolean {
  return Boolean(importEndpoint());
}

export async function refineCandidateWithAi(input: string, candidate: RecipeCandidate): Promise<AiRefinementResult> {
  const endpoint = importEndpoint();
  if (!endpoint) {
    throw new Error("AI import endpoint is not configured. Set VITE_RRRECIPE_IMPORT_API_URL to a backend endpoint.");
  }

  const payload: RecipeCandidateRefinementRequest = { input, candidate };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AI import endpoint failed with ${response.status}`);
  }

  const result = (await response.json()) as RecipeCandidateRefinementResponse;
  const warnings = [...(result.candidate.warnings ?? []), ...(result.warnings ?? [])];
  return {
    candidate: {
      ...result.candidate,
      warnings,
    },
    model: result.model,
    warnings,
    usedFallback: Boolean(result.usedFallback || result.model?.includes("local-mock")),
  };
}

function importEndpoint(): string | undefined {
  const explicit = import.meta.env.VITE_RRRECIPE_IMPORT_API_URL?.trim();
  if (explicit) return explicit;
  return localDevApiBaseUrl() ? `${localDevApiBaseUrl()}/api/import/refine` : undefined;
}

function localDevApiBaseUrl(): string | undefined {
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  return isLocal ? `${window.location.protocol}//${hostname}:8787` : undefined;
}
