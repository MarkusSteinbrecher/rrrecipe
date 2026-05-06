export type SourceType = "web" | "youtube" | "themealdb" | "text" | "pdf" | "image" | "manual";
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
  licenseNote?: string;
  retrievedAt: string;
  external?: {
    provider: "themealdb" | string;
    id: string;
    apiUrl?: string;
    pageUrl?: string;
    sourceUrl?: string;
    imageUrl?: string;
    category?: string;
    area?: string;
  };
  media?: {
    provider: "youtube";
    videoId: string;
    channelId?: string;
    channelTitle?: string;
    channelHandle?: string;
    channelUrl?: string;
    durationSeconds?: number;
    thumbnailUrl?: string;
    canonicalUrl: string;
  };
};

export type RecipeCandidate = {
  id: string;
  source: Source;
  title: string;
  language: string;
  description?: string;
  yield?: RecipeVersion["yield"];
  times?: RecipeVersion["times"];
  ingredients: IngredientLine[];
  steps: InstructionStep[];
  notes: string[];
  tags: string[];
  confidence: {
    overall: number;
    source: number;
    ingredients: number;
    steps: number;
  };
  warnings: string[];
};

export type RecipeCandidateRefinementRequest = {
  input: string;
  candidate: RecipeCandidate;
};

export type RecipeCandidateRefinementResponse = {
  candidate: RecipeCandidate;
  model?: string;
  warnings?: string[];
  usedFallback?: boolean;
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
  theme: "dark" | "light";
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

export type BaselineRecipeBacklogChannel = {
  id: string;
  title: string;
  type: "baseline" | string;
  status: string;
  priority: number;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type BaselineRecipeBacklogItem = {
  id: string;
  channelId: string;
  title: string;
  category: string;
  subcategory?: string;
  cuisine?: string;
  status: "backlog" | "drafted" | "promoted" | "deferred";
  priority: number;
  baselineRecipeId?: string;
  externalSources?: Array<{
    provider: "themealdb" | string;
    id: string;
    name?: string;
    url?: string;
    apiUrl?: string;
    sourceUrl?: string;
  }>;
  tags: string[];
  notes: string;
};

export type BaselineRecipeBacklog = {
  schemaVersion: number;
  updatedAt: string | null;
  coverageGoal: string;
  channels: BaselineRecipeBacklogChannel[];
  statuses: Record<string, string>;
  items: BaselineRecipeBacklogItem[];
};

export type TheMealDBRecord = {
  id: string;
  name: string;
  drinkAlternate?: string;
  category?: string;
  area?: string;
  tags: string[];
  instructions?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  sourceUrl?: string;
  mealDbUrl: string;
  apiUrl: string;
  ingredients: Array<{
    ingredient: string;
    measure?: string;
  }>;
  imageSource?: string;
  creativeCommonsConfirmed?: string;
  dateModified?: string;
};

export type TheMealDBCatalog = {
  schemaVersion: number;
  generatedAt: string;
  source: string;
  sourceUrl: string;
  apiBase: string;
  apiKey: string;
  productionNote: string;
  recordCount: number;
  records: TheMealDBRecord[];
};

export type YouTubeCatalogRecord = {
  rank: number;
  videoId: string;
  url: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnailUrl?: string;
  durationIso8601: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  discoveredBy: string[];
  transcript: {
    status: string;
    localPath: string;
    notes: string;
  };
};

export type YouTubeRecipeCatalog = {
  schemaVersion: number;
  generatedAt: string | null;
  targetCount: number;
  sort: string;
  source: string;
  records: YouTubeCatalogRecord[];
};

export type YouTubeBacklogVideo = {
  videoId: string;
  url: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  durationIso8601?: string;
  durationSeconds?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  channelId?: string;
  channelTitle?: string;
  channelHandle?: string;
  status: string;
  priority: number;
  notes: string;
  source: string;
  transcript?: {
    status: "not_collected" | "manual" | "authorized_caption" | "provider" | "unavailable";
    localPath?: string;
    jsonPath?: string;
    sanitizedPath?: string;
    blocksPath?: string;
    language?: string;
    source?: string;
    notes?: string;
    segmentCount?: number;
    blockCount?: number;
    isGenerated?: boolean;
    updatedAt?: string;
  };
  sourcePages?: {
    status: "not_started" | "found" | "retrieved" | "unavailable" | "failed";
    updatedAt?: string;
    notes?: string;
    pages: Array<{
      url: string;
      title?: string;
      siteName?: string;
      status: "pending" | "retrieved" | "failed";
      localPath?: string;
      extractedAt?: string;
      ingredientCount?: number;
      stepCount?: number;
      error?: string;
    }>;
  };
  candidate?: {
    status: "not_started" | "needs_review" | "promoted" | "failed";
    localPath?: string;
    generatedAt?: string;
    model?: string;
    warnings?: string[];
  };
  addedAt: string;
  updatedAt: string;
};

export type YouTubeBacklogChannel = {
  input: string;
  url?: string;
  handle?: string;
  channelId?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  country?: string;
  thumbnailUrl?: string;
  localThumbnailPath?: string;
  bannerUrl?: string;
  localBannerPath?: string;
  statistics?: {
    subscriberCount?: number;
    videoCount?: number;
    viewCount?: number;
    hiddenSubscriberCount?: boolean;
  };
  uploadsPlaylistId?: string;
  status: string;
  priority: number;
  maxVideos: number;
  notes: string;
  addedAt: string;
  updatedAt: string;
  expandedAt?: string;
};

export type YouTubeRecipeBacklog = {
  schemaVersion: number;
  updatedAt: string | null;
  videos: YouTubeBacklogVideo[];
  channels: YouTubeBacklogChannel[];
};
