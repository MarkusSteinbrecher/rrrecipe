import { uid } from "./format";
import type { AppSnapshot, Recipe, RecipeCandidate, RecipeVariant, RecipeVersion, Source } from "./types";

export type FinalizedImportSnapshot = {
  snapshot: AppSnapshot;
  recipeId: string;
  versionId: string;
  sourceId: string;
  createdAt: string;
  updatedExistingRecipe: boolean;
};

export function buildSnapshotForCandidate(
  snapshot: AppSnapshot,
  candidate: RecipeCandidate,
  now = new Date().toISOString(),
): FinalizedImportSnapshot {
  const next: AppSnapshot = {
    ...snapshot,
    recipes: snapshot.recipes.map((recipe) => ({ ...recipe })),
    variants: snapshot.variants.map((variant) => ({ ...variant })),
    versions: snapshot.versions.map((version) => ({ ...version, sourceIds: [...version.sourceIds] })),
    sources: snapshot.sources.map((source) => ({ ...source })),
  };

  const matchedSource = findMatchingSource(next.sources, candidate.source);
  const source: Source = {
    ...candidate.source,
    id: matchedSource?.id ?? candidate.source.id,
    retrievedAt: candidate.source.retrievedAt || now,
  };
  const sourceIndex = next.sources.findIndex((item) => item.id === source.id);
  if (sourceIndex >= 0) next.sources[sourceIndex] = source;
  else next.sources.push(source);

  const existingImport = findImportedRecipeForSource(next, source);
  const recipeId = existingImport?.recipe.id ?? uid("recipe-import");
  const variantId = existingImport?.variant?.id ?? `${uid("variant-import")}-original`;
  const versionId = uid("version-import");
  const version: RecipeVersion = {
    id: versionId,
    recipeId,
    variantId,
    title: candidate.title,
    language: candidate.language,
    description: candidate.description,
    sourceIds: [source.id],
    imageIds: [],
    yield: candidate.yield,
    times: candidate.times,
    ingredients: candidate.ingredients,
    steps: candidate.steps,
    notes: candidate.notes,
    tags: candidate.tags,
    collections: [],
    changeSummary: existingImport ? `${source.type} import update` : `${source.type} import`,
    origin: "import",
    createdAt: now,
    createdBy: "importer",
  };

  if (existingImport) {
    existingImport.recipe.currentVersionId = versionId;
    existingImport.recipe.updatedAt = now;
    if (existingImport.variant) existingImport.variant.currentVersionId = versionId;
  } else {
    const recipe: Recipe = {
      id: recipeId,
      currentVersionId: versionId,
      defaultVariantId: variantId,
      createdAt: now,
      updatedAt: now,
    };
    const variant: RecipeVariant = {
      id: variantId,
      recipeId,
      name: "Original",
      baseVersionId: versionId,
      currentVersionId: versionId,
      description: `Imported from ${source.type}`,
      createdAt: now,
    };
    next.recipes.push(recipe);
    next.variants.push(variant);
  }

  next.versions.push(version);

  return {
    snapshot: next,
    recipeId,
    versionId,
    sourceId: source.id,
    createdAt: now,
    updatedExistingRecipe: Boolean(existingImport),
  };
}

function findMatchingSource(sources: Source[], source: Source): Source | undefined {
  return sources.find((item) =>
    item.id === source.id ||
    Boolean(source.media?.videoId && item.media?.videoId === source.media.videoId) ||
    Boolean(source.external?.id && source.external.provider === item.external?.provider && item.external?.id === source.external.id) ||
    Boolean(source.url && item.url === source.url),
  );
}

function findImportedRecipeForSource(
  snapshot: Pick<AppSnapshot, "recipes" | "versions" | "variants" | "sources">,
  source: Source,
): { recipe: Recipe; version: RecipeVersion; variant?: RecipeVariant; source: Source } | undefined {
  const matchedSource = findMatchingSource(snapshot.sources, source);
  if (!matchedSource) return undefined;
  const version = snapshot.versions.find((item) => item.sourceIds.includes(matchedSource.id));
  const recipe = version ? snapshot.recipes.find((item) => item.id === version.recipeId) : undefined;
  const variant = recipe ? snapshot.variants.find((item) => item.id === recipe.defaultVariantId) : undefined;
  return recipe && version ? { recipe, version, variant, source: matchedSource } : undefined;
}
