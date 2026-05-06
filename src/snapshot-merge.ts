import type { AppSnapshot, Recipe, RecipeVariant, RecipeVersion, Source } from "./types";

export type BaselineCatalog = {
  recipes: Recipe[];
  variants: RecipeVariant[];
  versions: RecipeVersion[];
  sources: Source[];
};

export type MergeResult = {
  snapshot: AppSnapshot;
  changed: boolean;
};

export function mergeBaselineCatalog(snapshot: AppSnapshot, baseline: BaselineCatalog): MergeResult {
  const next = structuredClone(snapshot);
  const changed = [
    appendMissingById(next.sources, baseline.sources),
    appendMissingById(next.recipes, baseline.recipes),
    appendMissingById(next.variants, baseline.variants),
    appendMissingById(next.versions, baseline.versions),
    mergeVersionSourceIds(next, baseline),
  ].some(Boolean);

  return { snapshot: next, changed };
}

function appendMissingById<T extends { id: string }>(target: T[], additions: T[]): boolean {
  const existingIds = new Set(target.map((item) => item.id));
  let changed = false;

  for (const item of additions) {
    if (existingIds.has(item.id)) continue;
    target.push(structuredClone(item));
    existingIds.add(item.id);
    changed = true;
  }

  return changed;
}

function mergeVersionSourceIds(snapshot: AppSnapshot, baseline: BaselineCatalog): boolean {
  let changed = false;
  for (const baselineVersion of baseline.versions) {
    const existing = snapshot.versions.find((version) => version.id === baselineVersion.id);
    if (!existing) continue;
    for (const sourceId of baselineVersion.sourceIds) {
      if (existing.sourceIds.includes(sourceId)) continue;
      existing.sourceIds.push(sourceId);
      changed = true;
    }
  }
  return changed;
}
