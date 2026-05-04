export type SourceType = "web" | "youtube" | "text" | "pdf" | "image" | "manual";
export type VersionOrigin = "import" | "manual_edit" | "translation" | "scaled" | "forked_variant";
export type MeasurementSystem = "original" | "metric" | "us" | "hybrid";
export type TemperatureUnit = "original" | "c" | "f";

export type MediaAnchor = {
  sourceId: string;
  startSeconds: number;
  endSeconds?: number;
  label?: string;
  confidence: "manual" | "imported" | "estimated";
};

export type Source = {
  id: string;
  type: SourceType;
  url?: string;
  title?: string;
  author?: string;
  retrievedAt: string;
  media?: {
    provider: "youtube";
    videoId: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    canonicalUrl: string;
  };
};

export type IngredientLine = {
  id: string;
  section?: string;
  raw: string;
  language: string;
  quantity?: string;
  unit?: string;
  item?: string;
  preparation?: string;
  optional?: boolean;
  normalized?: {
    quantityValue?: number;
    quantityMin?: number;
    quantityMax?: number;
    unit?: string;
    unitSystem?: "metric" | "us" | "imperial" | "count" | "unknown";
    ingredientKey?: string;
  };
  conversion?: {
    confidence: "exact" | "approximate" | "unknown";
    canonicalGrams?: number;
    canonicalMilliliters?: number;
    canonicalCount?: number;
    notes?: string;
  };
};

export type InstructionStep = {
  id: string;
  section?: string;
  position: number;
  text: string;
  language: string;
  timerSeconds?: number;
  mediaAnchors?: MediaAnchor[];
  temperature?: {
    value: number;
    unit: "c" | "f";
    raw: string;
  };
  ingredientRefs?: string[];
  mediaRefs?: string[];
};

export type Recipe = {
  id: string;
  currentVersionId: string;
  defaultVariantId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type RecipeVersion = {
  id: string;
  recipeId: string;
  parentVersionId?: string;
  variantId: string;
  title: string;
  language: string;
  subtitle?: string;
  description?: string;
  sourceIds: string[];
  imageIds: string[];
  yield?: {
    quantity?: number;
    unit?: string;
    raw: string;
  };
  times?: {
    prepMinutes?: number;
    cookMinutes?: number;
    totalMinutes?: number;
  };
  ingredients: IngredientLine[];
  steps: InstructionStep[];
  notes: string[];
  tags: string[];
  collections: string[];
  changeSummary?: string;
  origin: VersionOrigin;
  createdAt: string;
  createdBy: "user" | "importer";
};

export type RecipeVariant = {
  id: string;
  recipeId: string;
  name: string;
  baseVersionId: string;
  currentVersionId: string;
  description?: string;
  createdAt: string;
};

export type UserSettings = {
  appLanguage: string;
  recipeLanguageMode: "original" | "translated" | string;
  measurementSystem: MeasurementSystem;
  temperatureUnit: TemperatureUnit;
  numberLocale: string;
  cookingMode: {
    readbackEnabled: boolean;
    videoAutoSeek: boolean;
    commandInputEnabled: boolean;
  };
};

export type AppSnapshot = {
  recipes: Recipe[];
  versions: RecipeVersion[];
  variants: RecipeVariant[];
  sources: Source[];
  settings: UserSettings;
};
