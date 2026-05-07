import "./style.css";
import { formatTimestamp, speakStep, textareaLines, uid, youtubeTimestampUrl } from "./format";
import { buildSnapshotForCandidate } from "./import-finalize";
import { formatScaledQuantity } from "./ingredient-scale";
import { hasAiImportEndpoint, refineCandidateWithAi } from "./importers/ai";
import { addChannelToBacklog, hasBacklogEndpoint, processBacklogVideo, readBacklogVideoTranscript, retrieveBacklogVideoSourcePages, retrieveBacklogVideoTranscript, retrieveChannelVideos, saveBacklogVideoTranscript } from "./importers/backlog";
import { createMealDbCandidate } from "./importers/themealdb";
import { createYouTubeCandidate, createYouTubeCandidateFromCatalog, sampleYouTubeImportUrl } from "./importers/youtube";
import { icon } from "./icons";
import { BROWSE_FILTERS, BROWSE_FRAGMENT, browseRefsFromDocument, renderBrowse, renderBrowseList, type BrowseFilters } from "./render-browse";
import { loadSnapshot, resetSnapshot, saveSnapshot } from "./storage";
import type {
  AppSnapshot,
  BaselineRecipeBacklog,
  BaselineRecipeBacklogItem,
  IngredientLine,
  InstructionStep,
  Recipe,
  RecipeCandidate,
  RecipeVersion,
  Source,
  TheMealDBCatalog,
  TheMealDBRecord,
  YouTubeBacklogChannel,
  YouTubeBacklogVideo,
  YouTubeCatalogRecord,
  YouTubeRecipeBacklog,
  YouTubeRecipeCatalog,
} from "./types";

type Screen = "import" | "library" | "detail" | "shop" | "mise" | "edit" | "cook";

type StepTimer = {
  remaining: number;
  total: number;
  running: boolean;
  label: string;
};

type TranscriptPreview = {
  rawText: string;
  sanitizedText: string;
  segments: Array<{ text: string; start: number; duration: number }>;
  blocks: Array<{ text: string; start: number; duration: number; id?: string; end?: number; sourceSegmentIndexes?: number[] }>;
  segmentCount: number;
  blockCount: number;
  warning?: string;
};

type NotificationItem = {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
  createdAt: string;
  visibleUntil: number;
};

type UiState = {
  snapshot?: AppSnapshot;
  screen: Screen;
  selectedRecipeId?: string;
  selectedVersionId?: string;
  activeFilter: string;
  recipeSourceFilter: ImportSourceFilter;
  search: string;
  cookStepIndex: number;
  miseChecked: Set<string>;
  voiceMode: boolean;
  voiceListening: boolean;
  stepTimer: StepTimer | null;
  pointerStartX?: number;
  servingsByRecipe: Record<string, number>;
  expandedSections: Record<string, boolean>;
  pendingScrollTargetId?: string;
  expandedBacklogChannels: Record<string, boolean>;
  expandedImportSources: Record<string, boolean>;
  importInput: string;
  importSearch: string;
  importSourceFilter: ImportSourceFilter;
  importCandidate?: RecipeCandidate;
  importStatus?: string;
  channelBacklogInput: string;
  channelBacklogStatus?: string;
  notifications: NotificationItem[];
  notificationsExpanded: boolean;
  localBacklogChannels: YouTubeBacklogChannel[];
  localBacklogVideos: YouTubeBacklogVideo[];
  transcriptDrafts: Record<string, string>;
  transcriptPreviews: Record<string, TranscriptPreview>;
  transcriptPreviewModes: Record<string, "sanitized" | "raw">;
  expandedTranscriptPreviews: Record<string, boolean>;
  expandedVideoDetailRows: Record<string, Record<string, boolean>>;
  videoActionStatus: Record<string, { tone: "info" | "success" | "error"; message: string }>;
  expandingChannelKey?: string;
  savingTranscriptVideoId?: string;
  retrievingSourcePagesVideoId?: string;
  processingVideoId?: string;
  refiningImportVideoId?: string;
  finalizingImportVideoId?: string;
  selectedImportVideoId?: string;
  selectedBacklogVideoIds: Set<string>;
  deletedBacklogVideoIds: Set<string>;
  deletedBacklogChannelKeys: Set<string>;
  mealDbCatalog: TheMealDBCatalog;
};

type ImportSourceFilter = "all" | "baseline" | "themealdb" | "youtube";

type ImportUiSession = {
  screen?: Screen;
  expandedBacklogChannels?: Record<string, boolean>;
  expandedImportSources?: Record<string, boolean>;
  pendingExpandChannelKey?: string;
  selectedImportVideoId?: string;
  selectedBacklogVideoIds?: string[];
  deletedBacklogVideoIds?: string[];
  deletedBacklogChannelKeys?: string[];
  importSourceFilter?: ImportSourceFilter;
  channelBacklogStatus?: string;
};

type RenderOptions = {
  preserveScroll?: boolean;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const importSourceFilters: ImportSourceFilter[] = ["all", "baseline", "themealdb", "youtube"];
const detailWorkflowSections = ["workflow-overview", "workflow-shop", "workflow-prep", "workflow-cook"];

type BacklogChannelGroup = {
  key: string;
  title: string;
  meta: string;
  channel?: YouTubeBacklogChannel;
  videos: YouTubeBacklogVideo[];
};

type BaselineBacklogGroup = {
  key: string;
  title: string;
  meta: string;
  items: BaselineRecipeBacklogItem[];
};

type MealDbRecordGroup = {
  key: string;
  title: string;
  meta: string;
  records: TheMealDBRecord[];
};

// Research datasets (YouTube backlog/catalog, TheMealDB, baseline backlog) used to be
// imported into the SPA. They moved out of the build per ADR 0001 — research lives
// under tools/ and research/, not in the cooking app. The workbench UI still renders
// against these structures; they're empty stubs so the build stays small.
const collectedBacklog: YouTubeRecipeBacklog = { schemaVersion: 1, updatedAt: null, videos: [], channels: [] };
const collectedCatalog: YouTubeRecipeCatalog = {
  schemaVersion: 1,
  generatedAt: null,
  targetCount: 0,
  sort: "viewCount_desc",
  source: "",
  records: [],
};
const collectedBaselineBacklog: BaselineRecipeBacklog = {
  schemaVersion: 1,
  updatedAt: null,
  coverageGoal: "",
  channels: [],
  statuses: {},
  items: [],
};
const emptyMealDbCatalog: TheMealDBCatalog = {
  schemaVersion: 1,
  generatedAt: "",
  source: "TheMealDB catalog not loaded",
  sourceUrl: "https://www.themealdb.com/api.php",
  apiBase: "https://www.themealdb.com/api/json/v1/1",
  apiKey: "developer-test-key-1",
  productionNote: "TheMealDB catalog is loaded from a static JSON asset.",
  recordCount: 0,
  records: [],
};
const localTranscriptFiles: string[] = [];
const localCandidateModules: Record<string, { candidate?: RecipeCandidate }> = {};
const localCandidateFiles: string[] = [];
const localSourcePageFiles: string[] = [];
const importUiSessionKey = "rrrecipe:import-ui";

const state: UiState = {
  screen: "library",
  activeFilter: "all",
  recipeSourceFilter: "all",
  search: "",
  cookStepIndex: 0,
  miseChecked: new Set(),
  voiceMode: false,
  voiceListening: false,
  stepTimer: null,
  servingsByRecipe: {},
  expandedSections: {
    ingredients: true,
    plan: true,
  },
  expandedBacklogChannels: {},
  expandedImportSources: {
    youtubeBacklog: true,
    baseline: true,
    themealdb: true,
    youtubeCatalog: false,
  },
  importInput: sampleYouTubeImportUrl,
  importSearch: "",
  importSourceFilter: "all",
  channelBacklogInput: "",
  notifications: [],
  notificationsExpanded: false,
  localBacklogChannels: [],
  localBacklogVideos: [],
  transcriptDrafts: {},
  transcriptPreviews: {},
  transcriptPreviewModes: {},
  expandedTranscriptPreviews: {},
  expandedVideoDetailRows: {},
  videoActionStatus: {},
  selectedBacklogVideoIds: new Set(),
  deletedBacklogVideoIds: new Set(),
  deletedBacklogChannelKeys: new Set(),
  mealDbCatalog: emptyMealDbCatalog,
};

let timerInterval: number | undefined;
let notificationTimeout: number | undefined;
let recognition: BrowserSpeechRecognition | undefined;
let wakeLock: { release: () => Promise<void> } | undefined;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");
const appEl = app;

void boot();

async function boot(): Promise<void> {
  state.snapshot = await loadSnapshot();
  if (state.snapshot.recipes.length === 1 && state.snapshot.recipes[0]?.id === "recipe-focaccia") {
    state.snapshot = await resetSnapshot();
  }
  state.snapshot.settings.theme ??= "dark";
  applyTheme(state.snapshot.settings.theme);
  selectFirstRecipe();
  restoreImportUiSession();
  render();
}

function selectFirstRecipe(): void {
  const recipe = state.snapshot?.recipes[0];
  state.selectedRecipeId = state.selectedRecipeId ?? recipe?.id;
}

function currentRecipe(): Recipe | undefined {
  return state.snapshot?.recipes.find((recipe) => recipe.id === state.selectedRecipeId) ?? state.snapshot?.recipes[0];
}

function versionFor(recipe: Recipe): RecipeVersion | undefined {
  const versionId = state.selectedVersionId ?? recipe.currentVersionId;
  return state.snapshot?.versions.find((version) => version.id === versionId);
}

function currentVersion(): RecipeVersion | undefined {
  const recipe = currentRecipe();
  return recipe ? versionFor(recipe) : undefined;
}

function sourceById(id: string): Source | undefined {
  return state.snapshot?.sources.find((source) => source.id === id);
}

function importedRecipeForSource(source: Source): { recipe: Recipe; version: RecipeVersion; source: Source } | undefined {
  const snapshot = state.snapshot;
  if (!snapshot) return undefined;
  const matchedSource = snapshot.sources.find((item) =>
    item.id === source.id ||
    Boolean(source.media?.videoId && item.media?.videoId === source.media.videoId) ||
    Boolean(source.url && item.url === source.url),
  );
  if (!matchedSource) return undefined;
  const version = snapshot.versions.find((item) => item.sourceIds.includes(matchedSource.id));
  const recipe = version ? snapshot.recipes.find((item) => item.id === version.recipeId) : undefined;
  return recipe && version ? { recipe, version, source: matchedSource } : undefined;
}

function importedRecipeForVideo(videoId: string): { recipe: Recipe; version: RecipeVersion; source: Source } | undefined {
  const snapshot = state.snapshot;
  if (!snapshot) return undefined;
  const source = snapshot.sources.find((item) => item.media?.videoId === videoId);
  return source ? importedRecipeForSource(source) : undefined;
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function mealDbRecordForTitle(title: string): TheMealDBRecord | undefined {
  const normalizedTitle = normalizeRecipeTitle(title);
  return state.mealDbCatalog.records.find((record) => normalizeRecipeTitle(record.name) === normalizedTitle);
}

function mealDbRecordForBaselineItem(item: BaselineRecipeBacklogItem): TheMealDBRecord | undefined {
  const sourceId = item.externalSources?.find((source) => source.provider === "themealdb")?.id;
  return state.mealDbCatalog.records.find((record) => record.id === sourceId) ?? mealDbRecordForTitle(item.title);
}

function normalizeRecipeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(classic|easy|homemade|the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function render(options: RenderOptions = {}): void {
  const snapshot = state.snapshot;
  if (!snapshot) {
    appEl.innerHTML = `<main class="rr-app"><p>loading...</p></main>`;
    return;
  }

  const scrollTop = options.preserveScroll ? document.querySelector<HTMLElement>(".rr-screen-scroll")?.scrollTop : undefined;
  appEl.innerHTML = renderScreen(snapshot);
  if (state.screen === "library") renderCurrentBrowse(snapshot);
  bindEvents();
  syncTimerInterval();
  if (scrollTop !== undefined) {
    const scrollEl = document.querySelector<HTMLElement>(".rr-screen-scroll");
    if (scrollEl) scrollEl.scrollTop = scrollTop;
  }
  if (state.pendingScrollTargetId) {
    const targetId = state.pendingScrollTargetId;
    state.pendingScrollTargetId = undefined;
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function renderScreen(snapshot: AppSnapshot): string {
  if (state.screen === "import") return renderImport();
  if (state.screen === "library") return renderLibrary(snapshot);
  if (state.screen === "edit") return renderEditor();
  if (state.screen === "shop") return renderShop();
  if (state.screen === "mise") return renderMise();
  if (state.screen === "cook") return renderCookingMode();
  return renderDetail();
}

function renderApp(content: string, active: "import" | "browse" | "recipe", recipePhase?: "shop" | "prep" | "cook"): string {
  return `
    <div class="rr-app">
      ${renderAppChrome(active)}
      ${active === "recipe" && recipePhase ? renderRecipeWorkflow(recipePhase) : ""}
      <div class="rr-screen-scroll">${content}</div>
      ${renderBottomLayer()}
    </div>
  `;
}

function renderBottomLayer(): string {
  const now = Date.now();
  const latest = state.notifications[0];
  const visibleNotification = latest && (state.notificationsExpanded || latest.visibleUntil > now) ? latest : undefined;
  const hasHistory = state.notifications.length > 0;
  return `
    <footer class="rr-bottom-layer ${state.notificationsExpanded ? "is-expanded" : ""}">
      ${state.notificationsExpanded ? renderNotificationHistory() : ""}
      <div class="rr-bottom-notice ${visibleNotification ? visibleNotification.tone : "idle"}" role="status">
        <button class="rr-notice-toggle" data-action="toggle-notifications" aria-expanded="${state.notificationsExpanded}" aria-label="${state.notificationsExpanded ? "collapse notifications" : "expand notifications"}">
          ${icon(state.notificationsExpanded ? "close" : "bell", 16)}
          <span>${hasHistory ? state.notifications.length : 0}</span>
        </button>
        <div class="rr-notice-message">
          ${visibleNotification ? `<span>${escapeHtml(visibleNotification.message)}</span><time>${formatNotificationTime(visibleNotification.createdAt)}</time>` : `<span>No recent notifications</span>`}
        </div>
      </div>
    </footer>
  `;
}

function renderNotificationHistory(): string {
  const items = state.notifications.slice(0, 12);
  return `
    <section class="rr-notification-history" aria-label="notification history">
      <div class="rr-notification-history-head">
        <span>notifications</span>
        <button class="rr-mini-action" data-action="clear-notifications" ${items.length ? "" : "disabled"}>clear</button>
      </div>
      ${items.length ? items.map((item) => `
        <div class="rr-notification-row ${item.tone}">
          <span class="rr-notification-dot" aria-hidden="true"></span>
          <p>${escapeHtml(item.message)}</p>
          <time>${formatNotificationTime(item.createdAt)}</time>
        </div>
      `).join("") : `<p class="rr-row-empty">No notifications yet.</p>`}
    </section>
  `;
}

function formatNotificationTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function showToast(message: string | undefined, tone: "info" | "success" | "error" = "info", duration = 5000): void {
  if (!message) return;
  const now = Date.now();
  const notification: NotificationItem = {
    id: now,
    message,
    tone,
    createdAt: new Date(now).toISOString(),
    visibleUntil: now + duration,
  };
  state.notifications = [notification, ...state.notifications].slice(0, 30);
  if (notificationTimeout !== undefined) window.clearTimeout(notificationTimeout);
  notificationTimeout = window.setTimeout(() => {
    render({ preserveScroll: state.screen === "import" });
  }, duration);
}

function renderAppChrome(active: "import" | "browse" | "recipe"): string {
  return `
    <header class="rr-global-header">
      <button class="rr-brand-wordmark" data-action="go-library" aria-label="go to browse">
        <span class="rr-brand-wordmark__rrr">r r r</span> e c i p e . o r g
      </button>
      <div class="rr-global-center">${renderScreenNav(active)}</div>
      <div class="rr-global-actions">
        <button class="rr-icon-btn" data-action="toggle-theme" aria-label="switch theme">
          ${icon(state.snapshot?.settings.theme === "light" ? "sun" : "moon")}
        </button>
        <button class="rr-icon-btn" data-action="settings" aria-label="settings">${icon("settings")}</button>
      </div>
    </header>
  `;
}

function renderLibrary(snapshot: AppSnapshot): string {
  void snapshot;
  return renderApp(BROWSE_FRAGMENT, "browse");
}

function currentBrowseFilters(): BrowseFilters {
  return {
    query: state.search,
    activeFilter: state.activeFilter,
    recipeSourceFilter: state.recipeSourceFilter,
    filters: BROWSE_FILTERS,
    sourceFilters: importSourceFilters,
  };
}

function renderCurrentBrowse(snapshot: AppSnapshot): void {
  renderBrowse(browseRefsFromDocument(), snapshot, currentBrowseFilters());
}

function renderImport(): string {
  const candidate = state.importCandidate;
  return renderApp(
    `
      <main class="rr-import-shell">
        ${renderImportWorkbench()}
        ${candidate ? `<section class="rr-import-panel">${renderImportCandidate(candidate)}</section>` : ""}
      </main>
    `,
    "import",
  );
}

function renderImportWorkbench(): string {
  const youtubeGroups = filteredBacklogChannelGroups();
  const totalVideos = youtubeGroups.reduce((sum, group) => sum + group.videos.length, 0);
  const baselineGroups = baselineBacklogGroups(filteredBaselineBacklogItems());
  const baselineCount = baselineGroups.reduce((sum, group) => sum + group.items.length, 0);
  const mealDbGroups = mealDbRecordGroups(filteredMealDbRecords());
  const mealDbCount = mealDbGroups.reduce((sum, group) => sum + group.records.length, 0);
  const showBaseline = state.importSourceFilter === "all" || state.importSourceFilter === "baseline";
  const showMealDb = state.importSourceFilter === "all" || state.importSourceFilter === "themealdb";
  const showYouTube = state.importSourceFilter === "all" || state.importSourceFilter === "youtube";
  const youtubeExpanded = isImportSourceExpanded("source:youtube");
  const baselineExpanded = isImportSourceExpanded("baseline");
  const mealDbExpanded = isImportSourceExpanded("themealdb");
  const backlogEndpointAvailable = hasBacklogEndpoint();
  const youtubeEmptyMessage = backlogEndpointAvailable
    ? "No YouTube videos yet."
    : "Import API offline. Start `npm run research:dev-api` on the workstation to add channels.";
  return `
    <section class="rr-import-panel rr-import-workbench">
      <section class="rr-add-channel">
        <div class="rr-section-label"><span>add video or channel</span><span class="count">${backlogEndpointAvailable ? "local api" : "import api offline"}</span></div>
        <div class="rr-add-channel-row">
          <input data-action="update-channel-backlog-input" value="${escapeHtml(state.channelBacklogInput)}" placeholder="paste a YouTube video URL, @handle, channel URL, or channel ID">
          <button class="rr-mini-action" data-action="add-backlog-channel">add source</button>
        </div>
      </section>

      <section class="rr-import-source-list">
        <div class="rr-import-toolbar">
          <div class="rr-search-wrap">
            ${icon("search")}
            <input class="rr-search" data-action="import-search" value="${escapeHtml(state.importSearch)}" placeholder="search baseline, themealdb, youtube">
          </div>
          <div class="rr-filter-row rr-import-filter-row">
            ${importSourceFilters.map((filter) => `<button class="rr-chip ${state.importSourceFilter === filter ? "is-active" : ""}" data-action="import-source-filter" data-import-source-filter="${filter}">${filter === "themealdb" ? "TheMealDB" : filter === "youtube" ? "YT" : filter}</button>`).join("")}
          </div>
        </div>
        ${showYouTube ? `
        ${renderImportSourceHeader("youtube", `${youtubeGroups.length} groups · ${totalVideos + collectedCatalog.records.length} videos`, "source:youtube", youtubeExpanded)}
        ${youtubeExpanded ? `
          <div data-import-backlog-list>
            ${youtubeGroups.length ? youtubeGroups.map(renderBacklogChannelGroup).join("") : `<p class="rr-import-empty">${state.importSearch.trim() ? "No YouTube videos match this search." : youtubeEmptyMessage}</p>`}
            ${collectedCatalog.records.length ? renderYouTubeCatalogGroup() : ""}
          </div>
        ` : ""}
        ` : ""}
      </section>

      ${showBaseline ? `
      <section class="rr-import-source-list rr-import-baseline-list">
        ${renderImportSourceHeader("baseline", `${baselineCount} / ${collectedBaselineBacklog.items.length} recipes`, "baseline", baselineExpanded)}
        ${baselineExpanded ? `
          ${baselineGroups.map(renderBaselineBacklogGroup).join("")}
        ` : ""}
      </section>
      ` : ""}

      ${showMealDb ? `
      <section class="rr-import-source-list rr-import-catalog-list">
        ${renderImportSourceHeader("themealdb", `${mealDbCount} / ${state.mealDbCatalog.recordCount} recipes`, "themealdb", mealDbExpanded)}
        ${mealDbExpanded ? `
          ${mealDbGroups.map(renderMealDbRecordGroup).join("")}
        ` : ""}
      </section>
      ` : ""}
    </section>
  `;
}

function renderImportSourceHeader(title: string, count: string, key: string, expanded: boolean): string {
  return `
    <button class="rr-section-label rr-import-source-header" data-action="toggle-import-source" data-import-source-key="${escapeHtml(key)}" aria-expanded="${expanded}">
      <span>${escapeHtml(title)}</span>
      <span class="rr-expand-right"><span class="count">${escapeHtml(count)}</span><span class="rr-caret">${expanded ? "-" : "+"}</span></span>
    </button>
  `;
}

function renderBaselineBacklogGroup(group: BaselineBacklogGroup): string {
  const isExpanded = isImportSourceExpanded(group.key, false);
  return `
    <section class="rr-backlog-channel rr-import-item-group">
      ${renderImportSourceHeader(group.title, group.meta, group.key, isExpanded)}
      ${isExpanded ? `
        <div class="rr-import-group-items">
          ${group.items.slice(0, 80).map(renderBaselineBacklogRow).join("")}
          ${group.items.length > 80 ? `<p class="rr-import-empty">Showing first 80 recipes in this group. Use search to narrow it.</p>` : ""}
        </div>
      ` : ""}
    </section>
  `;
}

function renderMealDbRecordGroup(group: MealDbRecordGroup): string {
  const isExpanded = isImportSourceExpanded(group.key, false);
  return `
    <section class="rr-backlog-channel rr-import-item-group">
      ${renderImportSourceHeader(group.title, group.meta, group.key, isExpanded)}
      ${isExpanded ? `
        <div class="rr-import-group-items">
          ${group.records.slice(0, 80).map(renderMealDbSourceRow).join("")}
          ${group.records.length > 80 ? `<p class="rr-import-empty">Showing first 80 recipes in this group. Use search to narrow it.</p>` : ""}
        </div>
      ` : ""}
    </section>
  `;
}

function renderYouTubeCatalogGroup(): string {
  const key = "youtube:catalog";
  const isExpanded = isImportSourceExpanded(key, false);
  return `
    <section class="rr-backlog-channel rr-import-item-group">
      ${renderImportSourceHeader("catalog", `${collectedCatalog.records.length} videos`, key, isExpanded)}
      ${isExpanded ? `<div class="rr-import-group-items">${collectedCatalog.records.map(renderCatalogSourceRow).join("")}</div>` : ""}
    </section>
  `;
}

function renderBacklogChannelGroup(group: BacklogChannelGroup, index: number): string {
  const isExpanded = isBacklogChannelExpanded(group.key, index);
  const canRetrieve = Boolean(group.channel);
  const isRetrieving = state.expandingChannelKey === group.key;
  const channel = group.channel;
  const channelUrl = channel?.url ?? (channel?.channelId ? `https://www.youtube.com/channel/${channel.channelId}` : undefined);
  const emptyState = group.channel
    ? `<div class="rr-backlog-empty"><p>No videos retrieved yet.</p><button class="rr-mini-action" data-action="retrieve-channel-videos" data-channel-key="${escapeHtml(group.key)}" ${isRetrieving ? "disabled" : ""}>${isRetrieving ? "retrieving" : "retrieve videos"}</button></div>`
    : `<div class="rr-backlog-empty"><p>No videos are linked to this group yet.</p></div>`;
  const retrievingState = `<div class="rr-backlog-loading"><span class="rr-spinner" aria-hidden="true"></span><div><p>retrieving videos</p><span>Fetching uploads plus title, description, thumbnails, duration, stats, and channel fields.</span></div></div>`;
  return `
    <section class="rr-backlog-channel">
      <div class="rr-backlog-channel-head">
        <button class="rr-backlog-channel-toggle" data-action="toggle-backlog-channel" data-channel-key="${escapeHtml(group.key)}" aria-expanded="${isExpanded}">
          ${renderChannelAvatar(channel)}
          <span class="rr-import-source-main">
            <span class="rr-import-source-title">${escapeHtml(group.title.toLowerCase())}</span>
            <span class="rr-import-source-meta">${escapeHtml(group.meta)}</span>
          </span>
          <span class="rr-import-source-action">${isExpanded ? "hide" : "show"}</span>
        </button>
        ${channelUrl ? `<a class="rr-channel-youtube" href="${escapeHtml(channelUrl)}" target="_blank" rel="noreferrer" data-stop-click aria-label="open ${escapeHtml(group.title)} on YouTube">${icon("youtube", 15)}</a>` : ""}
        ${canRetrieve ? `<button class="rr-mini-action rr-retrieve-videos" data-action="retrieve-channel-videos" data-channel-key="${escapeHtml(group.key)}" ${isRetrieving ? "disabled" : ""}>${isRetrieving ? "retrieving" : "retrieve videos"}</button>` : ""}
        <button class="rr-mini-action rr-delete-source" data-action="delete-backlog-channel" data-channel-key="${escapeHtml(group.key)}" data-stop-propagation>delete source</button>
      </div>
      ${isExpanded ? `<div class="rr-backlog-videos">${renderChannelInfo(channel)}${isRetrieving ? retrievingState : group.videos.length ? renderBacklogVideoTable(group) : emptyState}</div>` : ""}
    </section>
  `;
}

function renderChannelAvatar(channel?: YouTubeBacklogChannel): string {
  const image = channelImageUrl(channel);
  return image ? `<img class="rr-channel-avatar" src="${escapeHtml(image)}" alt="">` : `<span class="rr-import-source-mark">CH</span>`;
}

function renderChannelInfo(channel?: YouTubeBacklogChannel): string {
  if (!channel) return "";
  const stats = [
    channel.statistics?.subscriberCount !== undefined && !channel.statistics.hiddenSubscriberCount ? `${formatCompactViews(channel.statistics.subscriberCount)} subscribers` : undefined,
    channel.statistics?.videoCount !== undefined ? `${channel.statistics.videoCount.toLocaleString()} videos` : undefined,
    channel.statistics?.viewCount !== undefined ? `${formatCompactViews(channel.statistics.viewCount)} views` : undefined,
    channel.country,
  ].filter(Boolean);
  if (!channel.description && !stats.length) return "";
  return `
    <div class="rr-channel-info">
      ${channel.description ? `<p>${escapeHtml(channel.description.slice(0, 260))}</p>` : ""}
      ${stats.length ? `<div class="rr-import-detail-meta">${stats.map((item) => `<span>${escapeHtml(item ?? "")}</span>`).join("")}</div>` : ""}
    </div>
  `;
}

function renderBacklogVideoTable(group: BacklogChannelGroup): string {
  const selectedCount = group.videos.filter((video) => state.selectedBacklogVideoIds.has(video.videoId)).length;
  return `
    <div class="rr-video-table">
      <div class="rr-video-table-tools">
        <span>${selectedCount ? `${selectedCount} selected` : `${group.videos.length} videos`}</span>
        <button class="rr-mini-action" data-action="delete-selected-backlog-videos" ${selectedCount ? "" : "disabled"}>delete selected</button>
      </div>
      <div class="rr-video-table-head">
        <span></span>
        <span>video</span>
        <span>workflow</span>
        <span>recipe</span>
        <span>youtube</span>
        <span></span>
      </div>
      ${group.videos.map((video) => renderBacklogVideoRow(video)).join("")}
    </div>
  `;
}

function renderBacklogVideoRow(video: YouTubeBacklogVideo): string {
  const record = collectedCatalog.records.find((item) => item.videoId === video.videoId);
  const title = record?.title ?? video.title ?? video.videoId;
  const thumbnailUrl = record?.thumbnailUrl ?? video.thumbnailUrl;
  const importedRecipe = importedRecipeForVideo(video.videoId);
  const meta = [
    importedRecipe ? "approved in recipes" : undefined,
    video.status,
    `p${video.priority}`,
    record?.viewCount !== undefined ? `${formatCompactViews(record.viewCount)} views` : video.viewCount !== undefined ? `${formatCompactViews(video.viewCount)} views` : "metadata pending",
    transcriptStatusLabel(video, record),
    video.notes,
  ].filter(Boolean);
  const isSelected = state.selectedImportVideoId === video.videoId;
  const isChecked = state.selectedBacklogVideoIds.has(video.videoId);
  return `
    <div class="rr-import-video-item ${importedRecipe ? "is-approved" : ""}">
      <div class="rr-import-source-row rr-video-table-row ${isSelected ? "is-open" : ""}">
        <input class="rr-video-select" type="checkbox" data-action="toggle-backlog-video-selection" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation aria-label="select ${escapeHtml(title)}" ${isChecked ? "checked" : ""}>
        <button class="rr-video-open" data-action="select-backlog-video" data-video-id="${escapeHtml(video.videoId)}">
          ${thumbnailUrl ? `<img class="rr-import-source-thumb" src="${escapeHtml(thumbnailUrl)}" alt="">` : `<span class="rr-import-source-mark">YT</span>`}
          <span class="rr-import-source-main">
            <span class="rr-import-source-title">${escapeHtml(title.toLowerCase())}</span>
            <span class="rr-import-source-meta">${escapeHtml(meta.join(" · "))}</span>
          </span>
        </button>
        ${renderVideoWorkflowDots(video, record)}
        ${importedRecipe ? `<button class="rr-video-recipe-link" data-action="open-recipe" data-recipe-id="${escapeHtml(importedRecipe.recipe.id)}" data-stop-propagation>recipe</button>` : `<span></span>`}
        <a class="rr-video-youtube" href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer" data-stop-propagation aria-label="open ${escapeHtml(title)} on YouTube">${icon("youtubeOfficial", 22)}</a>
        <button class="rr-video-delete" data-action="delete-backlog-video" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation aria-label="delete ${escapeHtml(title)}">${icon("close", 15)}</button>
      </div>
      ${isSelected ? renderImportVideoDetail(video, record) : ""}
    </div>
  `;
}

function renderCatalogSourceRow(record: YouTubeCatalogRecord): string {
  const meta = [
    `#${record.rank}`,
    record.channelTitle,
    `${formatCompactViews(record.viewCount)} views`,
    formatMinutesShort(record.durationSeconds),
    record.transcript.status.replace(/_/g, " "),
  ];
  return `
    <button class="rr-import-source-row" data-action="load-catalog-video" data-video-id="${escapeHtml(record.videoId)}">
      ${record.thumbnailUrl ? `<img class="rr-import-source-thumb" src="${escapeHtml(record.thumbnailUrl)}" alt="">` : `<span class="rr-import-source-mark">YT</span>`}
      <span class="rr-import-source-main">
        <span class="rr-import-source-title">${escapeHtml(record.title.toLowerCase())}</span>
        <span class="rr-import-source-meta">${escapeHtml(meta.join(" · "))}</span>
      </span>
      <span class="rr-import-source-action">draft</span>
    </button>
  `;
}

function renderBaselineBacklogRow(item: BaselineRecipeBacklogItem): string {
  const mealDbMatch = mealDbRecordForBaselineItem(item);
  const meta = [
    item.status,
    `p${item.priority}`,
    item.category,
    item.subcategory,
    item.cuisine,
    item.baselineRecipeId ? "recipe ready" : mealDbMatch ? "themealdb match" : "needs draft",
  ].filter(Boolean);
  return `
    <button class="rr-import-source-row" data-action="load-baseline-item" data-baseline-item-id="${escapeHtml(item.id)}">
      <span class="rr-import-source-mark">BL</span>
      <span class="rr-import-source-main">
        <span class="rr-import-source-title">${escapeHtml(item.title.toLowerCase())}</span>
        <span class="rr-import-source-meta">${escapeHtml(meta.join(" · "))}</span>
      </span>
      <span class="rr-import-source-action">${item.baselineRecipeId || mealDbMatch ? "draft" : "queue"}</span>
    </button>
  `;
}

function renderMealDbSourceRow(record: TheMealDBRecord): string {
  const meta = [
    record.id,
    record.category,
    record.area,
    `${record.ingredients.length} ingredients`,
    record.sourceUrl && record.sourceUrl !== record.mealDbUrl ? sourceHost(record.sourceUrl) : "themealdb",
  ].filter(Boolean);
  return `
    <button class="rr-import-source-row" data-action="load-themealdb-meal" data-mealdb-id="${escapeHtml(record.id)}">
      ${record.thumbnailUrl ? `<img class="rr-import-source-thumb" src="${escapeHtml(record.thumbnailUrl)}/small" alt="">` : `<span class="rr-import-source-mark">DB</span>`}
      <span class="rr-import-source-main">
        <span class="rr-import-source-title">${escapeHtml(record.name.toLowerCase())}</span>
        <span class="rr-import-source-meta">${escapeHtml(meta.join(" · "))}</span>
      </span>
      <span class="rr-import-source-action">draft</span>
    </button>
  `;
}

function renderImportVideoDetail(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): string {
  const description = record?.description ?? video.description ?? "Metadata has not been collected for this video yet.";
  const actionStatus = state.videoActionStatus[video.videoId];
  const isRetrievingSourcePages = state.retrievingSourcePagesVideoId === video.videoId;
  const isSaving = state.savingTranscriptVideoId === video.videoId;
  const isProcessing = state.processingVideoId === video.videoId;
  const isTranscriptExpanded = Boolean(state.expandedTranscriptPreviews[video.videoId]);
  const transcriptAvailable = videoHasTranscriptOutput(video);
  const sourcePages = video.sourcePages?.pages ?? [];
  const retrievedSourcePages = sourcePages.filter((page) => page.status === "retrieved");
  const metadataFacts = videoMetadataFacts(video, record);
  const metadataDone = videoHasMetadata(video, record);
  const sourcePageStep = sourcePageWorkflow(video);
  const transcriptStep = transcriptWorkflow(video, record);
  const draftStatus = video.candidate?.status ?? "not_started";
  const draftCandidate = candidateForVideo(video.videoId);
  const importedRecipe = importedRecipeForVideo(video.videoId);
  const draftDone = Boolean(importedRecipe || draftCandidate || video.candidate?.localPath || localCandidateFileExists(video.videoId) || draftStatus === "promoted");
  const recipeEvidence = videoRecipeEvidence(video, record);
  return `
    <div class="rr-import-video-detail">
      ${importedRecipe ? renderApprovedImportPanel(video, importedRecipe) : ""}
      ${renderVideoDetailRow(video.videoId, "metadata", {
        label: "Metadata",
        meta: metadataDone ? `${metadataFacts.length} fields` : "pending",
        state: metadataDone ? "done" : "pending",
        content: renderVideoMetadataFacts(metadataFacts),
      })}
      ${renderVideoDetailRow(video.videoId, "description", {
        label: "Description",
        meta: `${description.length.toLocaleString()} chars`,
        state: video.description || record?.description ? "done" : "pending",
        content: `<div class="rr-youtube-description"><p>${escapeHtml(description)}</p></div>`,
      })}
      ${renderVideoDetailRow(video.videoId, "source-pages", {
        label: "Recipe Pages",
        meta: sourcePageStep.detail,
        state: sourcePageStep.state,
        content: `
          <div class="rr-row-actions">
            <button class="rr-mini-action" data-action="retrieve-source-pages" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation ${isRetrievingSourcePages ? "disabled" : ""}>${isRetrievingSourcePages ? "retrieving pages" : retrievedSourcePages.length ? "refresh recipe pages" : "retrieve recipe pages"}</button>
          </div>
          ${sourcePages.length ? renderSourcePageList(sourcePages) : `<p class="rr-row-empty">${sourcePageStep.state === "done" ? "Recipe page files are stored locally." : "No linked recipe pages stored yet."}</p>`}
        `,
      })}
      ${renderVideoDetailRow(video.videoId, "transcript", {
        label: "Transcript",
        meta: transcriptStep.detail,
        state: transcriptStep.state,
        content: `
          <div class="rr-row-actions">
            ${transcriptAvailable
              ? `<button class="rr-mini-action" data-action="toggle-transcript-preview" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation>${isTranscriptExpanded ? "hide transcript" : "show transcript"}</button>`
              : `<button class="rr-mini-action" data-action="retrieve-video-transcript" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation ${isSaving ? "disabled" : ""}>${isSaving ? "retrieving" : "retrieve transcript"}</button>`}
          </div>
          ${isTranscriptExpanded ? renderTranscriptPreview(video) : `<p class="rr-row-empty">${transcriptAvailable ? "Transcript is stored. Expand preview when needed." : "No transcript stored yet."}</p>`}
        `,
      })}
      ${renderVideoDetailRow(video.videoId, "draft", {
        label: "Final Recipe",
        meta: draftDone ? candidateStatusLabel(video) : recipeEvidence.label,
        state: draftDone ? "done" : draftStatus === "failed" ? "failed" : "pending",
        content: `
          ${draftDone ? "" : `<div class="rr-row-actions"><button class="rr-mini-action" data-action="process-backlog-video" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation ${isProcessing || !recipeEvidence.ready ? "disabled" : ""}>${isProcessing ? "creating" : "create draft"}</button></div>`}
          ${!draftCandidate && actionStatus ? `<div class="rr-video-action-status ${actionStatus.tone}">${escapeHtml(actionStatus.message)}</div>` : draftCandidate ? "" : `<p class="rr-row-empty">${draftDone ? "Final recipe candidate file exists, but the preview is not loaded in this session." : recipeEvidence.message}</p>`}
          ${draftCandidate ? renderVideoDraftPreview(draftCandidate, video.videoId) : ""}
        `,
      })}
    </div>
  `;
}

function renderApprovedImportPanel(video: YouTubeBacklogVideo, imported: { recipe: Recipe; version: RecipeVersion; source: Source }): string {
  const candidate = candidateForVideo(video.videoId);
  return `
    <div class="rr-approved-import-panel">
      <div>
        <span>approved in recipes</span>
        <strong>${escapeHtml(imported.version.title.toLowerCase())}</strong>
        <p>Updates from this import source will create a new version of the existing recipe.</p>
      </div>
      <div class="rr-row-actions">
        <button class="rr-mini-action" data-action="open-recipe" data-recipe-id="${escapeHtml(imported.recipe.id)}" data-stop-propagation>open recipe</button>
        ${candidate ? `<button class="rr-mini-action" data-action="finalize-import-candidate" data-video-id="${escapeHtml(video.videoId)}" data-stop-propagation>update recipe</button>` : ""}
      </div>
    </div>
  `;
}

function renderVideoDetailRow(videoId: string, rowKey: string, row: { label: string; meta: string; state: WorkflowStepState; content: string }): string {
  const expanded = isVideoDetailRowExpanded(videoId, rowKey);
  return `
    <section class="rr-video-detail-row ${expanded ? "is-expanded" : ""}">
      <button class="rr-video-detail-row-head" data-action="toggle-video-detail-row" data-video-id="${escapeHtml(videoId)}" data-row-key="${escapeHtml(rowKey)}" data-stop-propagation aria-expanded="${expanded}">
        <span class="rr-row-caret" aria-hidden="true">${expanded ? "v" : ">"}</span>
        <span class="rr-workflow-dot ${row.state}" aria-hidden="true"></span>
        <span class="rr-video-detail-row-title">${escapeHtml(row.label)}</span>
        <span class="rr-video-detail-row-meta">${escapeHtml(row.meta)}</span>
      </button>
      ${expanded ? `<div class="rr-video-detail-row-body">${row.content}</div>` : ""}
    </section>
  `;
}

function isVideoDetailRowExpanded(videoId: string, rowKey: string): boolean {
  return state.expandedVideoDetailRows[videoId]?.[rowKey] ?? (rowKey === "draft" && Boolean(importedRecipeForVideo(videoId)));
}

function expandVideoDetailRow(videoId: string, rowKey: string): void {
  state.expandedVideoDetailRows[videoId] ??= {};
  state.expandedVideoDetailRows[videoId][rowKey] = true;
}

function videoMetadataFacts(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): Array<[string, string]> {
  return [
    ["video id", video.videoId],
    ["channel", video.channelTitle ?? record?.channelTitle],
    ["channel id", video.channelId ?? record?.channelId],
    ["published", record?.publishedAt ?? video.publishedAt],
    ["duration", record?.durationSeconds !== undefined ? formatMinutesShort(record.durationSeconds) : video.durationSeconds !== undefined ? formatMinutesShort(video.durationSeconds) : undefined],
    ["views", record?.viewCount !== undefined ? record.viewCount.toLocaleString() : video.viewCount !== undefined ? video.viewCount.toLocaleString() : undefined],
    ["likes", record?.likeCount !== undefined ? record.likeCount.toLocaleString() : video.likeCount !== undefined ? video.likeCount.toLocaleString() : undefined],
    ["comments", record?.commentCount !== undefined ? record.commentCount.toLocaleString() : video.commentCount !== undefined ? video.commentCount.toLocaleString() : undefined],
    ["thumbnail", record?.thumbnailUrl ?? video.thumbnailUrl],
    ["description", video.description ? `${video.description.length.toLocaleString()} chars` : undefined],
    ["source pages", sourcePageStatusLabel(video)],
    ["transcript", transcriptStatusLabel(video, record)],
    ["final recipe", candidateStatusLabel(video)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
}

function renderVideoMetadataFacts(facts: Array<[string, string]>): string {
  return `
    <div class="rr-video-facts">
      ${facts.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(value)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSourcePageList(pages: NonNullable<YouTubeBacklogVideo["sourcePages"]>["pages"]): string {
  return `
    <div class="rr-source-pages">
      ${pages.map((page) => `
        <a href="${escapeHtml(page.url)}" target="_blank" rel="noreferrer">
          <span>${escapeHtml((page.title ?? page.url).toLowerCase())}</span>
          <small>${escapeHtml(sourcePageMeta(page))}</small>
        </a>
      `).join("")}
    </div>
  `;
}

function localCandidateForVideo(videoId: string): RecipeCandidate | undefined {
  return Object.entries(localCandidateModules).find(([path]) => path.endsWith(`/candidates/${videoId}.candidate.json`))?.[1].candidate;
}

function candidateForVideo(videoId: string): RecipeCandidate | undefined {
  const candidate = state.importCandidate;
  return localCandidateForVideo(videoId) ?? (candidate?.source.media?.videoId === videoId ? candidate : undefined);
}

function splitCandidateSteps(candidate: RecipeCandidate): { preparation: InstructionStep[]; execution: InstructionStep[] } {
  const executionStart = candidate.steps.findIndex((step) => /\b(heat|bake|cook|fry|roast|grill|simmer|boil|steam|sear|serve|finish)\b/i.test(step.text));
  if (executionStart >= 0) {
    return {
      preparation: candidate.steps.slice(0, executionStart),
      execution: candidate.steps.slice(executionStart),
    };
  }
  const splitAt = Math.ceil(candidate.steps.length / 2);
  return {
    preparation: candidate.steps.slice(0, splitAt),
    execution: candidate.steps.slice(splitAt),
  };
}

function renderVideoDraftPreview(candidate: RecipeCandidate, videoId?: string): string {
  const ingredients = candidate.ingredients.slice(0, 12);
  const { preparation, execution } = splitCandidateSteps(candidate);
  const actionStatus = videoId ? state.videoActionStatus[videoId] : undefined;
  const isRefining = Boolean(videoId && state.refiningImportVideoId === videoId);
  const isFinalizing = Boolean(videoId && state.finalizingImportVideoId === videoId);
  const importedRecipe = videoId ? importedRecipeForVideo(videoId) : importedRecipeForSource(candidate.source);
  return `
    <div class="rr-draft-preview ${importedRecipe ? "is-approved" : ""}">
      <div class="rr-draft-preview-head">
        <div>
          <span>${importedRecipe ? "approved recipe" : "final recipe"}</span>
          <h3>${escapeHtml(candidate.title.toLowerCase())}</h3>
          ${importedRecipe ? `<p class="rr-approved-note">Already in recipes as "${escapeHtml(importedRecipe.version.title)}". Updating will create a new version of that recipe.</p>` : ""}
        </div>
        <div class="rr-confidence rr-confidence-inline">
          <span>overall ${Math.round(candidate.confidence.overall * 100)}%</span>
          <span>ingredients ${Math.round(candidate.confidence.ingredients * 100)}%</span>
          <span>steps ${Math.round(candidate.confidence.steps * 100)}%</span>
        </div>
      </div>
      ${videoId ? `<div class="rr-draft-preview-status ${actionStatus?.tone ?? "info"} ${actionStatus ? "" : "is-empty"}">${escapeHtml(actionStatus?.message ?? " ")}</div>` : ""}
      ${candidate.warnings.length ? `<div class="rr-import-warnings">${candidate.warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}</div>` : ""}
      <div class="rr-draft-preview-grid">
        <div>
          <div class="rr-section-label"><span>ingredients</span><span class="count">${candidate.ingredients.length}</span></div>
          ${ingredients.map((ingredient) => `<p class="rr-draft-line">${escapeHtml(ingredient.raw)}</p>`).join("")}
          ${candidate.ingredients.length ? "" : `<p class="rr-row-empty">No ingredients extracted yet.</p>`}
          ${candidate.ingredients.length > ingredients.length ? `<p class="rr-row-empty">Showing first ${ingredients.length} ingredients.</p>` : ""}
        </div>
        <div>
          <div class="rr-section-label"><span>preparation</span><span class="count">${preparation.length}</span></div>
          ${preparation.map((step) => `<p class="rr-draft-line"><span>${String(step.position).padStart(2, "0")}</span>${escapeHtml(step.text)}</p>`).join("")}
          ${preparation.length ? "" : `<p class="rr-row-empty">No preparation steps extracted yet.</p>`}
        </div>
        <div>
          <div class="rr-section-label"><span>execution</span><span class="count">${execution.length}</span></div>
          ${execution.map((step) => `<p class="rr-draft-line"><span>${String(step.position).padStart(2, "0")}</span>${escapeHtml(step.text)}</p>`).join("")}
          ${execution.length ? "" : `<p class="rr-row-empty">No execution steps extracted yet.</p>`}
        </div>
      </div>
      <div class="rr-row-actions">
        <button class="rr-mini-action rr-refine-action" data-action="refine-import-ai" ${videoId ? `data-video-id="${escapeHtml(videoId)}"` : ""} ${isRefining ? `aria-busy="true"` : ""} ${hasAiImportEndpoint() && !isRefining ? "" : "disabled"}>refine with ai</button>
        ${importedRecipe ? `<button class="rr-mini-action" data-action="open-recipe" data-recipe-id="${escapeHtml(importedRecipe.recipe.id)}">open recipe</button>` : ""}
        <button class="rr-mini-action" data-action="finalize-import-candidate" ${videoId ? `data-video-id="${escapeHtml(videoId)}"` : ""} ${isFinalizing ? "disabled" : ""}>${isFinalizing ? "updating" : importedRecipe ? "update recipe" : "approve + finalize"}</button>
      </div>
    </div>
  `;
}

function renderTranscriptPreview(video: YouTubeBacklogVideo): string {
  const preview = state.transcriptPreviews[video.videoId];
  const mode = state.transcriptPreviewModes[video.videoId] ?? "sanitized";
  if (!videoHasTranscriptOutput(video)) {
    return `<div class="rr-transcript-preview"><p>No saved transcript is available yet.</p></div>`;
  }
  if (!preview) {
    return `<div class="rr-transcript-preview"><p>Loading transcript preview...</p></div>`;
  }
  if (preview.warning) {
    return `<div class="rr-transcript-preview"><p>${escapeHtml(preview.warning)}</p></div>`;
  }
  const rows = mode === "raw" ? preview.segments.slice(0, 80) : preview.blocks.slice(0, 80);
  const totalRows = mode === "raw" ? preview.segmentCount : preview.blockCount;
  const charCount = mode === "raw" ? preview.rawText.length : preview.sanitizedText.length;
  return `
    <div class="rr-transcript-preview">
      <div class="rr-transcript-preview-head">
        <span>${mode === "raw" ? `${preview.segmentCount.toLocaleString()} raw segments` : `${preview.blockCount.toLocaleString()} sanitized blocks`}</span>
        <span>${charCount.toLocaleString()} chars</span>
        <span>${mode === "raw" ? "youtube caption timing" : "sentence merged"}</span>
      </div>
      <div class="rr-transcript-mode-toggle">
        <button class="${mode === "sanitized" ? "active" : ""}" data-action="set-transcript-preview-mode" data-video-id="${escapeHtml(video.videoId)}" data-mode="sanitized" data-stop-propagation>sanitized</button>
        <button class="${mode === "raw" ? "active" : ""}" data-action="set-transcript-preview-mode" data-video-id="${escapeHtml(video.videoId)}" data-mode="raw" data-stop-propagation>raw</button>
      </div>
      <div class="rr-transcript-segments">
        ${rows.map((segment) => `
          <div class="rr-transcript-segment">
            <a href="${escapeHtml(`${video.url}&t=${Math.floor(segment.start)}s`)}" target="_blank" rel="noreferrer">${formatTimestamp(Math.floor(segment.start))}</a>
            <p>${escapeHtml(segment.text)}</p>
          </div>
        `).join("")}
      </div>
      ${totalRows > rows.length ? `<p class="rr-transcript-more">Showing first ${rows.length} ${mode === "raw" ? "segments" : "blocks"}.</p>` : ""}
    </div>
  `;
}

function filteredBaselineBacklogItems(): BaselineRecipeBacklogItem[] {
  const query = state.importSearch.trim().toLowerCase();
  const items = [...collectedBaselineBacklog.items].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
  if (!query) return items;
  return items.filter((item) =>
    [
      item.id,
      item.title,
      item.category,
      item.subcategory,
      item.cuisine,
      item.status,
      item.baselineRecipeId,
      item.notes,
      ...item.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function filteredMealDbRecords(): TheMealDBRecord[] {
  const query = state.importSearch.trim().toLowerCase();
  const records = [...state.mealDbCatalog.records].sort((a, b) => a.name.localeCompare(b.name));
  if (!query) return records;
  return records.filter((record) =>
    [
      record.id,
      record.name,
      record.category,
      record.area,
      record.sourceUrl,
      record.mealDbUrl,
      ...record.tags,
      ...record.ingredients.map((ingredient) => `${ingredient.measure ?? ""} ${ingredient.ingredient}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function baselineBacklogGroups(items: BaselineRecipeBacklogItem[]): BaselineBacklogGroup[] {
  const groups = new Map<string, BaselineRecipeBacklogItem[]>();
  for (const item of items) {
    const title = titleCase(item.category || "Other");
    groups.set(title, [...(groups.get(title) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([title, groupItems]) => ({
      key: `baseline:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      meta: `${groupItems.length} recipes · ${groupItems.filter((item) => item.status === "promoted").length} promoted`,
      items: groupItems.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function mealDbRecordGroups(records: TheMealDBRecord[]): MealDbRecordGroup[] {
  const groups = new Map<string, TheMealDBRecord[]>();
  for (const record of records) {
    const title = titleCase(record.category || "Other");
    groups.set(title, [...(groups.get(title) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([title, groupRecords]) => ({
      key: `themealdb:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      meta: `${groupRecords.length} recipes`,
      records: groupRecords.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function backlogChannels(): YouTubeBacklogChannel[] {
  const merged = [...collectedBacklog.channels];
  for (const channel of state.localBacklogChannels) {
    const key = channelKey(channel);
    if (!merged.some((item) => channelKey(item) === key)) merged.push(channel);
  }
  return merged.filter((channel) => !state.deletedBacklogChannelKeys.has(channelKey(channel)));
}

function backlogVideos(): YouTubeBacklogVideo[] {
  const merged = [...collectedBacklog.videos];
  for (const video of state.localBacklogVideos) {
    const index = merged.findIndex((item) => item.videoId === video.videoId);
    if (index >= 0) merged[index] = { ...merged[index], ...video };
    else merged.push(video);
  }
  return merged.filter((video) => !state.deletedBacklogVideoIds.has(video.videoId));
}

function backlogChannelGroups(): BacklogChannelGroup[] {
  const channels = backlogChannels();
  const assignedVideoIds = new Set<string>();
  const groups: BacklogChannelGroup[] = channels.map((channel) => {
    const videos = backlogVideos().filter((video) => videoBelongsToChannel(video, channel));
    videos.forEach((video) => assignedVideoIds.add(video.videoId));
    return {
      key: channelKey(channel),
      title: channel.title ?? channel.handle ?? channel.channelId ?? channel.input,
      meta: [
        `${channel.status}`,
        `p${channel.priority}`,
        `${videos.length} queued`,
        channel.statistics?.videoCount !== undefined ? `${channel.statistics.videoCount.toLocaleString()} total videos` : undefined,
        channel.statistics?.subscriberCount !== undefined && !channel.statistics.hiddenSubscriberCount ? `${formatCompactViews(channel.statistics.subscriberCount)} subs` : undefined,
        channel.notes,
      ]
        .filter(Boolean)
        .join(" · "),
      channel,
      videos,
    };
  });

  const unassigned = backlogVideos().filter((video) => !assignedVideoIds.has(video.videoId));
  if (unassigned.length) {
    groups.push({
      key: "manual",
      title: "manual video backlog",
      meta: `${unassigned.length} videos · channel metadata pending`,
      videos: unassigned,
    });
  }

  return groups;
}

function filteredBacklogChannelGroups(): BacklogChannelGroup[] {
  const query = state.importSearch.trim().toLowerCase();
  const groups = backlogChannelGroups();
  if (!query) return groups;
  return groups
    .map((group) => {
      const channelMatches = [group.title, group.meta, group.channel?.handle, group.channel?.channelId, group.channel?.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const videos = channelMatches ? group.videos : group.videos.filter((video) => videoMatchesImportSearch(video, query));
      return { ...group, videos, meta: `${videos.length} matching videos · ${group.meta}` };
    })
    .filter((group) => group.videos.length);
}

function videoMatchesImportSearch(video: YouTubeBacklogVideo, query: string): boolean {
  const record = collectedCatalog.records.find((item) => item.videoId === video.videoId);
  return [
    video.videoId,
    video.url,
    video.title,
    video.channelTitle,
    video.channelHandle,
    video.description,
    video.notes,
    record?.title,
    record?.channelTitle,
    record?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function groupForVideo(videoId: string): BacklogChannelGroup | undefined {
  return backlogChannelGroups().find((group) => group.videos.some((video) => video.videoId === videoId));
}

function videoHasMetadata(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): boolean {
  return Boolean(record || (video.title && video.thumbnailUrl && video.durationSeconds !== undefined && video.viewCount !== undefined));
}

function videoRecipeEvidence(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): { ready: boolean; label: string; message: string } {
  const hasMetadata = videoHasMetadata(video, record);
  const hasSourcePage = videoHasSourcePageOutput(video);
  const hasTranscript = videoHasTranscriptOutput(video);
  const description = [video.title ?? record?.title, video.description ?? record?.description].filter(Boolean).join("\n\n");
  const descriptionHasIngredients = /\b(ingredients?|shopping list|for the dough|for topping)\b/i.test(description) && /\b(\d+\s*(?:g|kg|ml|l|oz|lb|cups?|tsp|tbsp|teaspoons?|tablespoons?)|[¼⅓½⅔¾]\s*(?:cups?|tsp|tbsp)|pinch)\b/i.test(description);
  const descriptionHasMethod = /\b(method|instructions?|directions?|steps?|preheat|bake|boil|brown|combine|cook|fold|fry|heat|knead|mix|roast|simmer|stir|whisk)\b/i.test(description);
  const hasCompleteDescription = descriptionHasIngredients && descriptionHasMethod;
  const ready = hasMetadata && (hasSourcePage || hasTranscript || hasCompleteDescription);
  if (!hasMetadata) {
    return {
      ready: false,
      label: "metadata needed",
      message: "Retrieve video metadata before creating a final recipe.",
    };
  }
  if (ready) {
    const sources = [
      hasSourcePage ? "recipe page" : undefined,
      hasTranscript ? "transcript" : undefined,
      hasCompleteDescription ? "description" : undefined,
    ].filter(Boolean);
    return {
      ready: true,
      label: `${sources.join(" + ")} ready`,
      message: `Ready to create a final recipe from ${sources.join(", ")}.`,
    };
  }
  return {
    ready: false,
    label: "evidence needed",
    message: "Retrieve a transcript or recipe page first. A description-only import must include both ingredients and method signals.",
  };
}

function localTranscriptFileExists(videoId: string, suffix: ".txt" | ".json" | ".sanitized.txt" | ".blocks.json"): boolean {
  return localTranscriptFiles.some((path) => path.endsWith(`/transcripts/${videoId}${suffix}`));
}

function localCandidateFileExists(videoId: string): boolean {
  return localCandidateFiles.some((path) => path.endsWith(`/candidates/${videoId}.candidate.json`));
}

function localSourcePageFileExists(videoId: string): boolean {
  return localSourcePageFiles.some((path) => path.includes(`/source-pages/${videoId}/`) && path.endsWith(".json"));
}

function localSourcePageCount(videoId: string): number {
  return localSourcePageFiles.filter((path) => path.includes(`/source-pages/${videoId}/`) && path.endsWith(".json")).length;
}

function videoHasSourcePageOutput(video: YouTubeBacklogVideo): boolean {
  return Boolean(
    video.sourcePages?.pages.some((page) => page.status === "retrieved" && page.localPath) ||
      localSourcePageFileExists(video.videoId),
  );
}

function videoHasTranscriptOutput(video: YouTubeBacklogVideo): boolean {
  const transcriptStatus = video.transcript?.status ?? "not_collected";
  const hasSanitizedOutput = Boolean(
    video.transcript?.sanitizedPath ||
      video.transcript?.blocksPath ||
      localTranscriptFileExists(video.videoId, ".sanitized.txt") ||
      localTranscriptFileExists(video.videoId, ".blocks.json"),
  );
  return Boolean(
    hasSanitizedOutput ||
      (video.transcript?.localPath && (transcriptStatus === "manual" || transcriptStatus === "authorized_caption")),
  );
}

function transcriptStatusLabel(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): string {
  return transcriptWorkflow(video, record).detail;
}

function sourcePageStatusLabel(video: YouTubeBacklogVideo): string {
  return sourcePageWorkflow(video).detail;
}

function sourcePageMeta(page: NonNullable<YouTubeBacklogVideo["sourcePages"]>["pages"][number]): string {
  const counts = [
    page.ingredientCount !== undefined ? `${page.ingredientCount} ingredients` : undefined,
    page.stepCount !== undefined ? `${page.stepCount} steps` : undefined,
    page.status.replace(/_/g, " "),
  ].filter(Boolean);
  return counts.join(" · ");
}

function candidateStatusLabel(video: YouTubeBacklogVideo): string {
  if (importedRecipeForVideo(video.videoId)) return "final recipe approved";
  const candidateLoaded = Boolean(candidateForVideo(video.videoId));
  if (candidateLoaded) return video.candidate?.status === "promoted" ? "final recipe promoted" : "final recipe needs review";
  return video.candidate?.status ? `final recipe ${video.candidate.status.replace(/_/g, " ")}` : "final recipe not started";
}

type WorkflowStepState = "done" | "pending" | "failed" | "skipped";

type WorkflowStep = {
  label: string;
  state: WorkflowStepState;
  detail: string;
};

function sourcePageWorkflow(video: YouTubeBacklogVideo): WorkflowStep {
  const status = video.sourcePages?.status ?? "not_started";
  const retrievedCount = Math.max(video.sourcePages?.pages.filter((page) => page.status === "retrieved").length ?? 0, localSourcePageCount(video.videoId));
  if (retrievedCount > 0 || videoHasSourcePageOutput(video)) {
    return {
      label: "Recipe Pages",
      state: "done",
      detail: `recipe pages ${retrievedCount || 1}`,
    };
  }
  if (status === "unavailable") {
    return {
      label: "Recipe Pages",
      state: "skipped",
      detail: "recipe pages unavailable",
    };
  }
  if (status === "failed") {
    return {
      label: "Recipe Pages",
      state: "failed",
      detail: "recipe pages failed",
    };
  }
  return {
    label: "Recipe Pages",
    state: "pending",
    detail: `recipe pages ${status.replace(/_/g, " ")}`,
  };
}

function transcriptWorkflow(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): WorkflowStep {
  const status = video.transcript?.status ?? record?.transcript.status ?? "not_collected";
  if (videoHasTranscriptOutput(video)) {
    const count = video.transcript?.blockCount ?? video.transcript?.segmentCount;
    return {
      label: "Transcript",
      state: "done",
      detail: count ? `transcript ${count} ${video.transcript?.blockCount ? "blocks" : "segments"}` : "transcript collected",
    };
  }
  if (status === "unavailable") {
    return {
      label: "Transcript",
      state: "skipped",
      detail: "transcript unavailable",
    };
  }
  return {
    label: "Transcript",
    state: "pending",
    detail: `transcript ${status.replace(/_/g, " ")}`,
  };
}

function renderVideoWorkflowDots(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): string {
  const steps = videoWorkflowSteps(video, record);
  return `
    <span class="rr-video-workflow" aria-label="${escapeHtml(steps.map((step) => `${step.label}: ${step.state}`).join(", "))}">
      ${steps.map((step) => `<span class="rr-workflow-dot ${step.state}" title="${escapeHtml(`${step.label}: ${step.detail}`)}" aria-hidden="true"></span>`).join("")}
    </span>
  `;
}

function videoWorkflowSteps(video: YouTubeBacklogVideo, record?: YouTubeCatalogRecord): WorkflowStep[] {
  const metadataDone = videoHasMetadata(video, record);
  const descriptionDone = Boolean(video.description || record?.description);
  const draftStatus = video.candidate?.status ?? "not_started";
  const candidateFileExists = Boolean(video.candidate?.localPath || localCandidateFileExists(video.videoId));
  const approvedRecipe = importedRecipeForVideo(video.videoId);
  const draftDone = Boolean(approvedRecipe) || candidateFileExists || Boolean(candidateForVideo(video.videoId)) || draftStatus === "promoted";
  const draftFailed = draftStatus === "failed";
  return [
    {
      label: "Metadata",
      state: metadataDone ? "done" : "pending",
      detail: metadataDone ? "ready" : "pending",
    },
    {
      label: "Description",
      state: descriptionDone ? "done" : "pending",
      detail: descriptionDone ? "ready" : "pending",
    },
    sourcePageWorkflow(video),
    transcriptWorkflow(video, record),
    {
      label: "Final Recipe",
      state: draftDone ? "done" : draftFailed ? "failed" : "pending",
      detail: approvedRecipe ? "approved in catalog" : candidateFileExists ? "candidate ready" : draftStatus.replace(/_/g, " "),
    },
  ];
}

function isBacklogChannelExpanded(key: string, index?: number): boolean {
  if (state.expandedBacklogChannels[key] !== undefined) return state.expandedBacklogChannels[key];
  const groupIndex = index ?? backlogChannelGroups().findIndex((group) => group.key === key);
  return groupIndex === 0;
}

function isImportSourceExpanded(key: string, defaultExpanded = true): boolean {
  return state.expandedImportSources[key] ?? defaultExpanded;
}

function videoBelongsToChannel(video: YouTubeBacklogVideo, channel: YouTubeBacklogChannel): boolean {
  const record = collectedCatalog.records.find((item) => item.videoId === video.videoId);
  const title = channel.title?.toLowerCase();
  return Boolean(
    (channel.channelId && (video.channelId === channel.channelId || record?.channelId === channel.channelId)) ||
      (channel.handle && video.channelHandle === channel.handle) ||
      (title && (video.channelTitle?.toLowerCase() === title || record?.channelTitle.toLowerCase() === title || video.notes.toLowerCase().includes(title))),
  );
}

function channelKey(channel: YouTubeBacklogChannel): string {
  return channel.handle ?? channel.channelId ?? channel.url ?? channel.input;
}

function mergeBacklogVideos(existing: YouTubeBacklogVideo[], incoming: YouTubeBacklogVideo[]): YouTubeBacklogVideo[] {
  const merged = [...existing];
  for (const video of incoming) {
    const index = merged.findIndex((item) => item.videoId === video.videoId);
    if (index >= 0) merged[index] = { ...merged[index], ...video };
    else merged.push(video);
  }
  return merged;
}

function persistImportUiSession(options: Partial<ImportUiSession> = {}): void {
  const payload: ImportUiSession = {
    screen: state.screen,
    expandedBacklogChannels: state.expandedBacklogChannels,
    expandedImportSources: state.expandedImportSources,
    selectedImportVideoId: state.selectedImportVideoId,
    selectedBacklogVideoIds: [...state.selectedBacklogVideoIds],
    deletedBacklogVideoIds: [...state.deletedBacklogVideoIds],
    deletedBacklogChannelKeys: [...state.deletedBacklogChannelKeys],
    importSourceFilter: state.importSourceFilter,
    channelBacklogStatus: state.channelBacklogStatus,
    ...options,
  };
  try {
    sessionStorage.setItem(importUiSessionKey, JSON.stringify(payload));
  } catch {
    // Session restore is a local-dev convenience only.
  }
}

function clearImportUiSession(): void {
  try {
    sessionStorage.removeItem(importUiSessionKey);
  } catch {
    // Session restore is a local-dev convenience only.
  }
}

function restoreImportUiSession(): void {
  let payload: ImportUiSession | undefined;
  try {
    const raw = sessionStorage.getItem(importUiSessionKey);
    payload = raw ? (JSON.parse(raw) as ImportUiSession) : undefined;
  } catch {
    payload = undefined;
  }
  if (!payload || payload.screen !== "import") return;

  state.screen = "import";
  state.expandedBacklogChannels = payload.expandedBacklogChannels ?? {};
  state.expandedImportSources = { ...state.expandedImportSources, ...(payload.expandedImportSources ?? {}) };
  state.selectedImportVideoId = payload.selectedImportVideoId;
  state.selectedBacklogVideoIds = new Set(payload.selectedBacklogVideoIds ?? []);
  state.deletedBacklogVideoIds = new Set(payload.deletedBacklogVideoIds ?? []);
  state.deletedBacklogChannelKeys = new Set(payload.deletedBacklogChannelKeys ?? []);
  state.importSourceFilter = payload.importSourceFilter ?? state.importSourceFilter;
  state.channelBacklogStatus = payload.channelBacklogStatus;

  if (payload.pendingExpandChannelKey) {
    const group = backlogChannelGroups().find((item) => item.key === payload.pendingExpandChannelKey);
    if (group?.videos.length) {
      state.expandedBacklogChannels[payload.pendingExpandChannelKey] = true;
      state.channelBacklogStatus = `Retrieved ${group.videos.length} videos for ${group.title}.`;
      persistImportUiSession({ pendingExpandChannelKey: undefined });
    } else {
      state.expandingChannelKey = payload.pendingExpandChannelKey;
      state.channelBacklogStatus = payload.channelBacklogStatus ?? "Retrieving videos...";
    }
  }
}

function renderImportCandidate(candidate: RecipeCandidate): string {
  const source = candidate.source;
  const imageUrl = source.media?.thumbnailUrl ?? source.external?.imageUrl;
  const sourceLabel = source.type === "youtube" ? "youtube draft" : source.type === "themealdb" ? "themealdb draft" : source.type === "manual" ? "baseline draft" : `${source.type} draft`;
  const sourceDescription = source.author ?? source.title ?? source.media?.canonicalUrl ?? source.external?.pageUrl ?? "recipe source";
  return `
    <section class="rr-import-review">
      <div class="rr-import-source">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : ""}
        <div>
          <div class="rr-kicker">${escapeHtml(sourceLabel)}</div>
          <h2>${escapeHtml(candidate.title.toLowerCase())}</h2>
          <p>${escapeHtml(sourceDescription)}</p>
        </div>
      </div>
      <div class="rr-confidence">
        <span>overall ${Math.round(candidate.confidence.overall * 100)}%</span>
        <span>ingredients ${Math.round(candidate.confidence.ingredients * 100)}%</span>
        <span>steps ${Math.round(candidate.confidence.steps * 100)}%</span>
      </div>
      ${candidate.warnings.length ? `<div class="rr-import-warnings">${candidate.warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}</div>` : ""}
      <div class="rr-import-review-actions">
        <button class="rr-mini-action" data-action="refine-import-ai" ${hasAiImportEndpoint() ? "" : "disabled"}>refine with ai</button>
      </div>
      <div class="rr-import-grid">
        <div>
          <div class="rr-section-label"><span>ingredients</span><span class="count">${candidate.ingredients.length}</span></div>
          ${candidate.ingredients.map((ingredient) => renderIngredientRow(ingredient, { mode: "plain" })).join("")}
        </div>
        <div>
          <div class="rr-section-label"><span>steps</span><span class="count">${candidate.steps.length}</span></div>
          ${candidate.steps.map((step) => renderCandidateStep(step)).join("")}
        </div>
      </div>
      <button class="rr-action rr-action-flush" data-action="finalize-import-candidate">${icon("check", 13)} approve + finalize</button>
    </section>
  `;
}

function renderCandidateStep(step: InstructionStep): string {
  const anchor = step.mediaAnchors?.[0];
  return `
    <div class="rr-step-row rr-step-row-static">
      <div class="n">${String(step.position).padStart(2, "0")}</div>
      <div>
        <div class="title">${escapeHtml(stepLabel(step))}</div>
        <div class="detail">${escapeHtml(step.text)}</div>
      </div>
      <div class="t">${anchor ? formatTimestamp(anchor.startSeconds) : "—"}</div>
    </div>
  `;
}

function renderDetail(): string {
  const recipe = currentRecipe();
  const snapshot = state.snapshot;
  const version = recipe ? versionFor(recipe) : undefined;
  if (!recipe || !snapshot || !version) return renderMissing();

  const versions = snapshot.versions
    .filter((item) => item.recipeId === recipe.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalMinutes = version.times?.totalMinutes ?? 0;
  const activeMinutes = version.times?.prepMinutes ?? Math.min(15, totalMinutes || 15);
  const baseServings = version.yield?.quantity ?? 1;
  const servings = state.servingsByRecipe[recipe.id] ?? baseServings;
  const multiplier = servings / baseServings;

  return renderApp(
    `
      <div class="rr-content rr-detail-content rr-detail-content--plain">
        <div class="rr-detail-titlebar">
          <button class="rr-recipe-back" data-action="go-library" aria-label="back to recipes">${icon("back", 13)}</button>
          <h1>${escapeHtml(version.title.toLowerCase())}</h1>
        </div>
        <div class="rr-recipe-scroll">
          <section class="rr-workflow-rows">
            ${renderWorkflowRow("overview", "overview", `${totalMinutes || 35} min total`, renderWorkflowOverview(version, totalMinutes, activeMinutes, servings))}
            ${renderWorkflowRow("shop", "shop", `${version.ingredients.length} ingredients`, renderWorkflowShop(version, multiplier, servings))}
            ${renderWorkflowRow("prep", "prep", `${state.miseChecked.size} / ${version.ingredients.length} ready`, renderWorkflowPrep(version, multiplier))}
            ${renderWorkflowRow("cook", "cook", `${version.steps.length} steps`, renderWorkflowCook(version))}
          </section>
          <div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-cooking">${icon("flame", 12)} begin cooking</button></div>
          <section class="rr-history">
            <div class="rr-section-label"><span>versions</span><span class="count">${versions.length}</span></div>
            ${versions.map((item) => renderVersionItem(item, version.id)).join("")}
          </section>
        </div>
      </div>
    `,
    "recipe",
    undefined,
  );
}

function renderIngredientRow(
  ingredient: IngredientLine,
  options: { checked?: boolean; multiplier?: number; mode?: "plain" | "checklist" } = {},
): string {
  const checked = options.checked ?? false;
  const multiplier = options.multiplier ?? 1;
  const mode = options.mode ?? "checklist";
  const qty = ingredient.quantity && ingredient.unit ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.quantity ?? "";
  const name = ingredient.item ?? ingredient.raw.replace(qty, "").trim();
  return `
    <button class="rr-ing ${mode === "plain" ? "rr-ing--plain" : ""} ${checked ? "is-on" : ""}" ${mode === "checklist" ? `data-action="toggle-mise" data-ing-id="${ingredient.id}"` : ""}>
      <div class="qty">${escapeHtml(formatScaledQuantity(ingredient, multiplier) || "—")}</div>
      <div class="name">${escapeHtml(name || renderIngredient(ingredient))}</div>
      ${mode === "checklist" ? `<div class="check">${checked ? icon("check", 10) : ""}</div>` : ""}
    </button>
  `;
}

function renderWorkflowOverview(version: RecipeVersion, totalMinutes: number, activeMinutes: number, servings: number): string {
  const imageUrl = recipeVisualUrl(version);
  const keyword = version.tags.find((tag) => tag !== "baseline") ?? version.collections[0] ?? "recipe";
  return `
    <div class="rr-overview-panel">
      <div class="rr-overview-copy">
        <div class="rr-kicker">${version.tags.map((tag) => tag.toLowerCase()).join(" · ")}</div>
        <p>${escapeHtml(version.description ?? version.subtitle ?? "")}</p>
        <div class="rr-overview-facts" aria-label="Recipe facts">
          <span><strong>${totalMinutes || 35}</strong> min total</span>
          <span><strong>${activeMinutes}</strong> min active</span>
          <span><strong>${escapeHtml(servingsLabel(servings, version.yield?.unit))}</strong></span>
        </div>
        <div class="rr-detail-actions rr-detail-actions--flush">
          <button class="rr-mini-action" data-action="edit-recipe">edit</button>
          <button class="rr-mini-action" data-action="reset-demo">reset demo</button>
        </div>
      </div>
      <div class="rr-overview-media" aria-label="Recipe visual">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(version.title)}">`
            : `<div class="rr-overview-placeholder"><span>${escapeHtml(keyword.toLowerCase())}</span><strong>${escapeHtml(version.title.toLowerCase())}</strong></div>`
        }
      </div>
    </div>
  `;
}

function recipeVisualUrl(version: RecipeVersion): string | undefined {
  // Baseline recipes use the design-spec striped placeholder (no image).
  // Real food photography is intentional out-of-scope per the design canon.
  const visualSource = version.sourceIds.map(sourceById).find((source) => source?.external?.imageUrl || source?.media?.thumbnailUrl);
  return visualSource?.external?.imageUrl ?? visualSource?.media?.thumbnailUrl;
}

function renderWorkflowShop(version: RecipeVersion, multiplier: number, servings: number): string {
  return `
    <div class="rr-workflow-list">
      <div class="rr-shop-control">
        <span>${escapeHtml(version.yield?.raw ?? "recipe yield")}</span>
        <span class="rr-serving-stepper"><button class="rr-icon-btn" data-action="servings-minus" data-stop-propagation>${icon("minus", 11)}</button><span>${servingsLabel(servings, version.yield?.unit)}</span><button class="rr-icon-btn" data-action="servings-plus" data-stop-propagation>${icon("plus", 11)}</button></span>
      </div>
      ${version.ingredients.map((ingredient) => renderIngredientRow(ingredient, { multiplier, mode: "plain" })).join("")}
    </div>
  `;
}

function renderWorkflowPrep(version: RecipeVersion, multiplier: number): string {
  return `
    <div class="rr-workflow-list">
      ${version.ingredients
        .map((ingredient) =>
          renderIngredientRow(ingredient, { checked: state.miseChecked.has(ingredient.id), multiplier, mode: "checklist" }),
        )
        .join("")}
    </div>
  `;
}

function renderWorkflowCook(version: RecipeVersion): string {
  return `
    <div class="rr-workflow-list">
      ${version.steps.map((step) => renderInlineCookStep(step)).join("")}
    </div>
  `;
}

function renderInlineCookStep(step: InstructionStep): string {
  const index = step.position - 1;
  const timer = step.timerSeconds ? `${Math.round(step.timerSeconds / 60)}m` : "—";
  return `
    <button class="rr-step-row rr-step-row-inline ${state.cookStepIndex === index ? "is-active" : ""}" data-action="select-cook-step" data-step-index="${index}">
      <div class="n">${String(step.position).padStart(2, "0")}</div>
      <div>
        <div class="title">${escapeHtml(stepLabel(step))}</div>
        <div class="detail">${escapeHtml(step.text)}</div>
      </div>
      <div class="t">${timer}</div>
    </button>
  `;
}

function renderWorkflowRow(key: string, title: string, meta: string, content: string): string {
  const expanded = state.expandedSections[`workflow-${key}`] ?? key === "overview";
  const stepNumber = ({ overview: "01", shop: "02", prep: "03", cook: "04" } as Record<string, string>)[key] ?? "00";
  return `
    <section class="rr-workflow-row rr-workflow-row--${escapeHtml(key)}" id="workflow-${escapeHtml(key)}">
      <button class="rr-section-label rr-expand-trigger" data-action="toggle-workflow-section" data-section="workflow-${key}" role="button" tabindex="0" aria-expanded="${expanded}">
        <span class="rr-workflow-title"><span class="rr-workflow-index">${stepNumber}</span><span>${escapeHtml(title)}</span></span>
        <span class="rr-expand-right"><span class="count">${escapeHtml(meta)}</span><span class="rr-caret">${expanded ? "-" : "+"}</span></span>
      </button>
      ${expanded ? `
        <div class="rr-workflow-row-body">
          ${content}
        </div>
      ` : ""}
    </section>
  `;
}

function renderVersionItem(version: RecipeVersion, activeId: string): string {
  return `
    <button class="rr-version-line ${version.id === activeId ? "active" : ""}" data-action="select-version" data-version-id="${version.id}">
      <span>${escapeHtml(version.changeSummary ?? version.origin)}</span>
      <small>${new Date(version.createdAt).toLocaleString()}</small>
    </button>
  `;
}

function renderRecipeWorkflow(active?: "shop" | "prep" | "cook"): string {
  const title = currentVersion()?.title ?? "recipe";
  const items = [
    ["shop", "shop", "start-shop"],
    ["prep", "prep", "start-mise"],
    ["cook", "cook", "start-cooking"],
  ] as const;
  return `
    <nav class="rr-recipe-flow" aria-label="Recipe workflow">
      <button class="rr-recipe-back" data-action="go-library" aria-label="back to browse">${icon("back", 13)}</button>
      <button class="rr-recipe-title" data-action="go-detail">${escapeHtml(title.toLowerCase())}</button>
      <div class="rr-recipe-phase-group">
        ${items.map(([id, label, action]) => `<button class="${active === id ? "active" : ""}" data-action="${action}">${label}</button>`).join("")}
      </div>
    </nav>
  `;
}

function renderShop(): string {
  const version = currentVersion();
  if (!version) return renderMissing();
  return renderApp(
    `
      <div class="rr-mise-head">
        <h1>shop once.<br><span>cook calmly.</span></h1>
      </div>
      <div class="rr-mise-rail">
        <div class="rr-section-label"><span>shopping list</span><span class="count">${version.ingredients.length} ITEMS</span></div>
        <div class="rr-content rr-mise-list">
          ${version.ingredients.map((ingredient) => renderIngredientRow(ingredient, { mode: "plain" })).join("")}
          <div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-mise">prep ingredients ${icon("chevR", 12)}</button></div>
        </div>
      </div>
    `,
    "recipe",
    "shop",
  );
}

function renderMise(): string {
  const version = currentVersion();
  if (!version) return renderMissing();
  const total = version.ingredients.length;
  const checked = state.miseChecked.size;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  return renderApp(
    `
      <div class="rr-mise-head">
        <h1>set yourself up.<br><span>then cook.</span></h1>
      </div>
      <div class="rr-mise-rail">
        <div class="rr-mise-meta"><span>${checked} of ${total} ready</span><span>${pct}%</span></div>
        <div class="rr-progress"><i style="width:${pct}%"></i></div>
        <div class="rr-content rr-mise-list">
          ${version.ingredients.map((ingredient) => renderIngredientRow(ingredient, { checked: state.miseChecked.has(ingredient.id), mode: "checklist" })).join("")}
          <div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-cooking">begin cooking ${icon("chevR", 12)}</button></div>
        </div>
      </div>
    `,
    "recipe",
    "prep",
  );
}

function renderEditor(): string {
  const recipe = currentRecipe();
  if (!recipe) return renderMissing();
  const version = versionFor(recipe);
  if (!version) return renderMissing();

  return renderApp(
    `
      <form id="recipe-editor" class="rr-editor" data-form="recipe-editor">
        <div class="rr-editor-actions">
          <button class="rr-mini-action" type="button" data-action="cancel-edit">cancel</button>
          <button class="rr-mini-action" type="submit">save version</button>
        </div>
        <label>title<input name="title" value="${escapeHtml(version.title)}"></label>
        <label>change note<input name="changeSummary" value="adjusted recipe"></label>
        <label>ingredients<textarea name="ingredients" rows="9">${escapeHtml(version.ingredients.map((item) => item.raw).join("\n"))}</textarea></label>
        <label>steps<textarea name="steps" rows="9">${escapeHtml(version.steps.map((item) => item.text).join("\n"))}</textarea></label>
      </form>
    `,
    "recipe",
  );
}

function renderCookingMode(): string {
  const version = currentVersion();
  if (!version) return renderMissing();
  const index = Math.min(state.cookStepIndex, version.steps.length - 1);
  const step = version.steps[index];
  const anchor = step.mediaAnchors?.[0];
  const source = anchor ? sourceById(anchor.sourceId) : undefined;
  const url = anchor && source ? youtubeTimestampUrl(source, anchor.startSeconds) : undefined;
  const pct = state.stepTimer ? ((state.stepTimer.total - state.stepTimer.remaining) / state.stepTimer.total) * 100 : 0;

  return renderApp(
    `
      <div class="rr-cook-layout" data-swipe-surface="cook">
        <div class="rr-cook__header">
          <button class="rr-icon-btn" data-action="exit-cooking" aria-label="close">${icon("close")}</button>
          <div class="rr-cook__pips">
            ${version.steps.map((_, i) => `<i class="${i < index ? "done" : i === index ? "now" : ""}"></i>`).join("")}
          </div>
          <button class="rr-icon-btn" data-action="go-detail" aria-label="recipe overview">${icon("book")}</button>
          <button class="rr-icon-btn ${state.voiceMode ? "is-voice-on" : ""}" data-action="toggle-voice" aria-label="voice commands">${icon("mic")}</button>
        </div>
        <div class="rr-cook__photo">
          <div class="rr-cook__stripes"></div>
          <div class="rr-cook__label">step ${String(index + 1).padStart(2, "0")} · ${escapeHtml(stepDetail(step))}</div>
          ${url && anchor ? `<a class="rr-cook__media-toggle" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${icon("play", 10)} watch ${formatTimestamp(anchor.startSeconds)}</a>` : ""}
        </div>
        <div class="rr-cook__body" data-action="tap-next" role="button" tabindex="0" aria-label="advance to next step">
          <div class="rr-cook__num">
            <span>step ${String(index + 1).padStart(2, "0")} / ${String(version.steps.length).padStart(2, "0")}</span>
            <span class="rule"></span>
            <span>${escapeHtml(stepDetail(step))}${step.timerSeconds ? ` · ${Math.round(step.timerSeconds / 60)}m` : ""}</span>
          </div>
          <div class="rr-cook__title">${accentLastWord(stepLabel(step))}</div>
          <div class="rr-cook__instr">${escapeHtml(step.text)}</div>
          ${state.stepTimer ? renderInlineTimer(state.stepTimer, pct) : ""}
        </div>
        <div class="rr-cook__nav">
          <button class="rr-cook__back" data-action="cook-prev" ${index === 0 ? "disabled" : ""}>${icon("chevL", 11)} back</button>
          <button class="rr-cook__next" data-action="cook-next">${index === version.steps.length - 1 ? "finish" : "next step"} ${icon("chevR", 11)}</button>
        </div>
        ${state.voiceListening ? `<div class="rr-voice"><span class="bars"><i></i><i></i><i></i></span>listening · "next step"</div>` : ""}
      </div>
    `,
    "recipe",
    "cook",
  );
}

function renderInlineTimer(timer: StepTimer, pct: number): string {
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference * (1 - pct / 100);
  return `
    <div class="rr-cook__timer" data-stop-click>
      <svg class="ring" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="18" fill="none" stroke="var(--line-2)" stroke-width="2"></circle>
        <circle cx="21" cy="21" r="18" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 21 21)"></circle>
      </svg>
      <div class="timer-copy"><div class="label">${escapeHtml(timer.label)}</div><div class="clock">${formatClock(timer.remaining)}</div></div>
      <button class="go" data-action="toggle-step-timer">${icon(timer.running ? "pause" : "play", 11)}</button>
    </div>
  `;
}

function renderMissing(): string {
  return renderApp(`<div class="rr-content rr-padded"><p>recipe not found.</p><button class="rr-action rr-action-flush" data-action="go-library">back to library</button></div>`, "browse");
}

function renderScreenNav(active: "import" | "browse" | "recipe"): string {
  const items = [
    ["import", "import", "go-import"],
    ["browse", "browse", "go-library"],
    ["recipe", "recipe", "go-detail"],
  ] as const;
  return `
    <nav class="rr-screen-nav" aria-label="MVP screens">
      ${items.map(([id, label, action]) => `<button class="${active === id ? "active" : ""}" data-action="${action}">${label}</button>`).join("")}
    </nav>
  `;
}

function renderIngredient(ingredient: IngredientLine): string {
  const system = state.snapshot?.settings.measurementSystem ?? "original";
  if (system === "original") return ingredient.raw;
  if (ingredient.conversion?.canonicalGrams) return `${ingredient.raw} (${ingredient.conversion.canonicalGrams} g)`;
  if (ingredient.conversion?.canonicalMilliliters) return `${ingredient.raw} (${ingredient.conversion.canonicalMilliliters} ml)`;
  return ingredient.raw;
}

function servingsLabel(servings: number, unit?: string): string {
  const rounded = Number.isInteger(servings) ? String(servings) : servings.toFixed(1);
  return `${rounded} ${unit ?? "servings"}`;
}

function stepLabel(step: InstructionStep): string {
  const firstSentence = step.text.split(/[.—]/)[0]?.trim();
  if (!firstSentence) return `step ${step.position}`;
  if (firstSentence.length <= 28) return firstSentence.toLowerCase();
  return firstSentence.slice(0, 28).replace(/\s+\S*$/, "").toLowerCase();
}

function stepDetail(step: InstructionStep): string {
  const anchor = step.mediaAnchors?.[0]?.label?.toLowerCase();
  if (anchor) return anchor;
  if (step.timerSeconds) return "timed step";
  return "hands free";
}

function accentLastWord(label: string): string {
  const words = label.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return `${escapeHtml(words.join(" "))} <span class="accent">${escapeHtml(last)}</span>`;
}

function formatClock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatCompactViews(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}b`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function formatMinutesShort(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function aiFallbackWarning(warnings: string[]): string | undefined {
  const warning = warnings.find((item) => /openrouter|provider|rate.?limit|429/i.test(item)) ?? warnings[0];
  if (!warning) return undefined;
  return warning.length > 260 ? `${warning.slice(0, 260)}...` : warning;
}

function channelImageUrl(channel?: YouTubeBacklogChannel): string | undefined {
  if (!channel) return undefined;
  if (channel.localThumbnailPath) return `${import.meta.env.BASE_URL}${channel.localThumbnailPath}`;
  return channel.thumbnailUrl;
}

function bindEvents(): void {
  bindActionElements(document);

  document.querySelectorAll<HTMLElement>("[data-stop-click]").forEach((element) => {
    element.addEventListener("click", (event) => event.stopPropagation());
  });
  document.querySelectorAll<HTMLElement>("[data-stop-propagation]").forEach((element) => {
    element.addEventListener("click", (event) => event.stopPropagation());
  });

  const swipeSurface = document.querySelector<HTMLElement>("[data-swipe-surface='cook']");
  swipeSurface?.addEventListener("pointerdown", (event) => {
    state.pointerStartX = event.clientX;
  });
  swipeSurface?.addEventListener("pointerup", (event) => {
    if (state.pointerStartX === undefined) return;
    const delta = event.clientX - state.pointerStartX;
    state.pointerStartX = undefined;
    if (Math.abs(delta) < 60) return;
    delta < 0 ? nextStep() : previousStep();
    render();
  });

  const form = document.querySelector<HTMLFormElement>("[data-form='recipe-editor']");
  form?.addEventListener("submit", handleEditorSubmit);
}

function bindActionElements(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.addEventListener("change", handleAction);
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.addEventListener("input", handleAction);
    } else {
      element.addEventListener("click", handleAction);
    }
    element.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      if (element.getAttribute("role") !== "button") return;
      event.preventDefault();
      void handleAction(event);
    });
  });
}

function setActiveWorkflowSection(section: string, options: { allowClose?: boolean } = {}): void {
  const wasOpen = state.expandedSections[section] ?? section === "workflow-overview";
  for (const item of detailWorkflowSections) {
    state.expandedSections[item] = item === section ? !(options.allowClose && wasOpen) : false;
  }
}

async function handleAction(event: Event): Promise<void> {
  const target = event.currentTarget as HTMLElement;
  const action = target.dataset.action;
  const screenBeforeAction = state.screen;

  if (action === "search" && target instanceof HTMLInputElement) {
    state.search = target.value;
    updateBrowseRows();
    return;
  }

  if (action === "import-search" && target instanceof HTMLInputElement) {
    state.importSearch = target.value;
    render({ preserveScroll: true });
    return;
  }

  if (action === "import-source-filter") {
    const filter = target.dataset.importSourceFilter as ImportSourceFilter | undefined;
    if (filter && importSourceFilters.includes(filter)) {
      state.importSourceFilter = filter;
      const sourceKey = filter === "youtube" ? "source:youtube" : filter === "all" ? undefined : filter;
      if (sourceKey) state.expandedImportSources[sourceKey] = true;
      persistImportUiSession();
    }
  }

  if (action === "update-import-input" && target instanceof HTMLTextAreaElement) {
    state.importInput = target.value;
    return;
  }

  if (action === "update-channel-backlog-input" && target instanceof HTMLInputElement) {
    state.channelBacklogInput = target.value;
    return;
  }

  if (action === "update-video-transcript" && target instanceof HTMLTextAreaElement) {
    const videoId = target.dataset.videoId;
    if (videoId) state.transcriptDrafts[videoId] = target.value;
    return;
  }

  if (action === "filter") {
    state.activeFilter = target.dataset.filter ?? "all";
  }

  if (action === "recipe-source-filter") {
    const filter = target.dataset.recipeSourceFilter as ImportSourceFilter | undefined;
    if (filter && importSourceFilters.includes(filter)) state.recipeSourceFilter = filter;
  }

  if (action === "toggle-theme" && state.snapshot) {
    state.snapshot.settings.theme = state.snapshot.settings.theme === "light" ? "dark" : "light";
    applyTheme(state.snapshot.settings.theme);
    await saveSnapshot(state.snapshot);
  }

  if (action === "settings") {
    state.screen = "detail";
  }

  if ((action === "servings-minus" || action === "servings-plus") && currentRecipe()) {
    const recipe = currentRecipe() as Recipe;
    const version = versionFor(recipe);
    const base = version?.yield?.quantity ?? 1;
    const current = state.servingsByRecipe[recipe.id] ?? base;
    const delta = action === "servings-plus" ? 1 : -1;
    state.servingsByRecipe[recipe.id] = Math.max(1, current + delta);
  }

  if (action === "toggle-section") {
    const section = target.dataset.section;
    if (section) state.expandedSections[section] = !state.expandedSections[section];
  }

  if (action === "toggle-workflow-section") {
    const section = target.dataset.section;
    if (section) setActiveWorkflowSection(section, { allowClose: true });
  }

  if (action === "jump-workflow-section") {
    const section = target.dataset.workflowSection;
    if (section) {
      setActiveWorkflowSection(`workflow-${section}`);
      state.pendingScrollTargetId = `workflow-${section}`;
    }
  }

  if (action === "go-library") {
    state.screen = "library";
    state.selectedVersionId = undefined;
    clearImportUiSession();
    void releaseWakeLock();
  }

  if (action === "go-import") {
    state.screen = "import";
    void releaseWakeLock();
  }

  if (action === "load-youtube-sample") {
    state.importInput = sampleYouTubeImportUrl;
    state.importCandidate = undefined;
    state.importStatus = undefined;
  }

  if (action === "create-import-draft") {
    state.importCandidate = createYouTubeCandidate(state.importInput);
    state.importStatus = "Local draft created. Review it before saving.";
  }

  if (action === "toggle-backlog-channel") {
    const key = target.dataset.channelKey;
    if (key) state.expandedBacklogChannels[key] = !isBacklogChannelExpanded(key);
    persistImportUiSession();
  }

  if (action === "toggle-import-source") {
    const key = target.dataset.importSourceKey;
    if (key) state.expandedImportSources[key] = !isImportSourceExpanded(key, false);
    persistImportUiSession();
  }

  if (action === "toggle-notifications") {
    state.notificationsExpanded = !state.notificationsExpanded;
  }

  if (action === "clear-notifications") {
    state.notifications = [];
    state.notificationsExpanded = false;
  }

  if (action === "toggle-transcript-preview") {
    const videoId = target.dataset.videoId;
    const video = backlogVideos().find((item) => item.videoId === videoId);
    if (videoId) state.expandedTranscriptPreviews[videoId] = !state.expandedTranscriptPreviews[videoId];
    if (video && state.expandedTranscriptPreviews[video.videoId] && !state.transcriptPreviews[video.videoId]) {
      state.videoActionStatus[video.videoId] = { tone: "info", message: "Loading transcript preview..." };
      render({ preserveScroll: true });
      const result = await readBacklogVideoTranscript(video);
      state.transcriptPreviews[video.videoId] = {
        rawText: result.rawText ?? result.text,
        sanitizedText: result.sanitizedText ?? result.text,
        segments: result.segments,
        blocks: result.blocks,
        segmentCount: result.segmentCount,
        blockCount: result.blockCount,
        warning: result.persisted ? undefined : result.warning,
      };
      state.transcriptPreviewModes[video.videoId] ??= "sanitized";
      if (result.video) state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
      state.videoActionStatus[video.videoId] = {
        tone: result.persisted ? "success" : "error",
        message: result.persisted ? `Loaded transcript preview: ${result.blockCount} sanitized blocks, ${result.segmentCount} raw segments.` : result.warning ?? "Transcript preview failed.",
      };
    }
  }

  if (action === "set-transcript-preview-mode") {
    const videoId = target.dataset.videoId;
    const mode = target.dataset.mode === "raw" ? "raw" : "sanitized";
    if (videoId) state.transcriptPreviewModes[videoId] = mode;
  }

  if (action === "toggle-video-detail-row") {
    const videoId = target.dataset.videoId;
    const rowKey = target.dataset.rowKey;
    if (videoId && rowKey) {
      state.expandedVideoDetailRows[videoId] ??= {};
      state.expandedVideoDetailRows[videoId][rowKey] = !state.expandedVideoDetailRows[videoId][rowKey];
    }
  }

  if (action === "select-backlog-video") {
    const videoId = target.dataset.videoId;
    state.selectedImportVideoId = state.selectedImportVideoId === videoId ? undefined : videoId;
    const group = videoId ? groupForVideo(videoId) : undefined;
    if (group) state.expandedBacklogChannels[group.key] = true;
    persistImportUiSession();
  }

  if (action === "toggle-backlog-video-selection") {
    const videoId = target.dataset.videoId;
    if (videoId) {
      if (state.selectedBacklogVideoIds.has(videoId)) state.selectedBacklogVideoIds.delete(videoId);
      else state.selectedBacklogVideoIds.add(videoId);
      persistImportUiSession();
    }
  }

  if (action === "delete-backlog-video") {
    const videoId = target.dataset.videoId;
    if (videoId) {
      state.deletedBacklogVideoIds.add(videoId);
      state.selectedBacklogVideoIds.delete(videoId);
      if (state.selectedImportVideoId === videoId) state.selectedImportVideoId = undefined;
      delete state.videoActionStatus[videoId];
      persistImportUiSession();
      showToast("Video removed from the import workspace.", "success");
    }
  }

  if (action === "delete-selected-backlog-videos") {
    const videoIds = [...state.selectedBacklogVideoIds];
    for (const videoId of videoIds) {
      state.deletedBacklogVideoIds.add(videoId);
      delete state.videoActionStatus[videoId];
    }
    if (state.selectedImportVideoId && state.deletedBacklogVideoIds.has(state.selectedImportVideoId)) state.selectedImportVideoId = undefined;
    state.selectedBacklogVideoIds.clear();
    persistImportUiSession();
    showToast(videoIds.length ? `Removed ${videoIds.length} selected video${videoIds.length === 1 ? "" : "s"} from the import workspace.` : "No videos selected.", videoIds.length ? "success" : "info");
  }

  if (action === "delete-backlog-channel") {
    const key = target.dataset.channelKey;
    const group = key ? backlogChannelGroups().find((item) => item.key === key) : undefined;
    if (key) {
      state.deletedBacklogChannelKeys.add(key);
      for (const video of group?.videos ?? []) {
        state.deletedBacklogVideoIds.add(video.videoId);
        state.selectedBacklogVideoIds.delete(video.videoId);
        delete state.videoActionStatus[video.videoId];
      }
      if (state.selectedImportVideoId && state.deletedBacklogVideoIds.has(state.selectedImportVideoId)) state.selectedImportVideoId = undefined;
      delete state.expandedBacklogChannels[key];
      persistImportUiSession();
      showToast(`Source removed${group ? ` with ${group.videos.length} video${group.videos.length === 1 ? "" : "s"}` : ""}.`, "success");
    }
  }

  if (action === "add-backlog-channel") {
    const input = state.channelBacklogInput.trim();
    if (!input) {
      state.channelBacklogStatus = "Paste a YouTube channel handle, channel URL, or channel ID first.";
      showToast(state.channelBacklogStatus, "error");
    } else {
      state.channelBacklogStatus = "Adding channel to backlog...";
      showToast(state.channelBacklogStatus);
      render({ preserveScroll: true });
      const result = await addChannelToBacklog(input);
      state.localBacklogChannels = [...state.localBacklogChannels.filter((channel) => channelKey(channel) !== channelKey(result.channel)), result.channel];
      if (result.video) state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
      state.expandedBacklogChannels[channelKey(result.channel)] = true;
      if (result.video) state.selectedImportVideoId = result.video.videoId;
      state.channelBacklogInput = "";
      state.channelBacklogStatus = result.persisted ? result.message ?? "Source added to backlog.json." : `${result.warning ?? "Source added locally."} ${result.command}`;
      showToast(state.channelBacklogStatus, result.persisted ? "success" : "error");
    }
  }

  if (action === "retrieve-channel-videos") {
    const key = target.dataset.channelKey;
    const channel = backlogChannels().find((item) => channelKey(item) === key);
    if (!channel) {
      state.channelBacklogStatus = "Could not find that channel in the backlog.";
      showToast(state.channelBacklogStatus, "error");
    } else {
      state.expandingChannelKey = channelKey(channel);
      state.expandedBacklogChannels[channelKey(channel)] = true;
      state.channelBacklogStatus = `Retrieving videos for ${channel.title ?? channel.handle ?? channel.input}...`;
      showToast(state.channelBacklogStatus);
      persistImportUiSession({ pendingExpandChannelKey: channelKey(channel) });
      render({ preserveScroll: true });
      const result = await retrieveChannelVideos(channel);
      state.expandingChannelKey = undefined;
      state.localBacklogChannels = [...state.localBacklogChannels.filter((item) => channelKey(item) !== channelKey(result.channel)), result.channel];
      state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, result.videos);
      state.expandedBacklogChannels[channelKey(result.channel)] = true;
      state.channelBacklogStatus = result.persisted
        ? `Retrieved ${result.videos.length} videos with metadata for ${result.channel.title ?? result.channel.handle ?? result.channel.input}.`
        : `${result.warning ?? "Could not retrieve videos from the UI."} ${result.command}`;
      showToast(state.channelBacklogStatus, result.persisted ? "success" : "error");
      persistImportUiSession({ pendingExpandChannelKey: undefined });
    }
  }

  if (action === "save-video-transcript") {
    const videoId = target.dataset.videoId;
    const video = backlogVideos().find((item) => item.videoId === videoId);
      const transcript = "";
    const group = videoId ? groupForVideo(videoId) : undefined;
    if (!video) {
      state.channelBacklogStatus = "Could not find that video in the backlog.";
      showToast(state.channelBacklogStatus, "error");
    } else if (transcript.length < 40) {
      state.channelBacklogStatus = "Paste at least a short transcript or recipe text before saving.";
      state.videoActionStatus[video.videoId] = { tone: "error", message: state.channelBacklogStatus };
      showToast(state.channelBacklogStatus, "error");
    } else {
      state.savingTranscriptVideoId = video.videoId;
      state.selectedImportVideoId = video.videoId;
      if (group) state.expandedBacklogChannels[group.key] = true;
      state.channelBacklogStatus = `Saving transcript for ${video.title ?? video.videoId}...`;
      state.videoActionStatus[video.videoId] = { tone: "info", message: state.channelBacklogStatus };
      showToast(state.channelBacklogStatus);
      persistImportUiSession();
      render({ preserveScroll: true });
      try {
        const result = await saveBacklogVideoTranscript(video, transcript);
        state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
        state.channelBacklogStatus = result.persisted ? `Saved transcript to ${result.transcriptPath}.` : result.warning;
        state.videoActionStatus[video.videoId] = {
          tone: result.persisted ? "success" : "error",
          message: state.channelBacklogStatus ?? "Transcript save returned no status.",
        };
        showToast(state.channelBacklogStatus, result.persisted ? "success" : "error");
      } catch (error) {
        state.channelBacklogStatus = error instanceof Error ? error.message : "Transcript save failed.";
        state.videoActionStatus[video.videoId] = { tone: "error", message: state.channelBacklogStatus };
        showToast(state.channelBacklogStatus, "error");
      } finally {
        state.savingTranscriptVideoId = undefined;
        state.selectedImportVideoId = video.videoId;
        const updatedGroup = groupForVideo(video.videoId);
        if (updatedGroup) state.expandedBacklogChannels[updatedGroup.key] = true;
        persistImportUiSession();
      }
    }
  }

  if (action === "retrieve-video-transcript") {
    const videoId = target.dataset.videoId;
    const video = backlogVideos().find((item) => item.videoId === videoId);
    const group = videoId ? groupForVideo(videoId) : undefined;
    if (!video) {
      state.channelBacklogStatus = "Could not find that video in the backlog.";
      showToast(state.channelBacklogStatus, "error");
    } else {
      expandVideoDetailRow(video.videoId, "transcript");
      state.savingTranscriptVideoId = video.videoId;
      state.selectedImportVideoId = video.videoId;
      if (group) state.expandedBacklogChannels[group.key] = true;
      state.channelBacklogStatus = `Retrieving transcript for ${video.title ?? video.videoId}...`;
      state.videoActionStatus[video.videoId] = { tone: "info", message: state.channelBacklogStatus };
      showToast(state.channelBacklogStatus);
      persistImportUiSession();
      render({ preserveScroll: true });
      try {
        const result = await retrieveBacklogVideoTranscript(video, ["en"]);
        state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
        delete state.transcriptPreviews[video.videoId];
        state.transcriptPreviewModes[video.videoId] = "sanitized";
        state.channelBacklogStatus = result.persisted
          ? `Saved transcript to ${result.transcriptPath}.`
          : result.warning;
        state.videoActionStatus[video.videoId] = {
          tone: result.persisted ? "success" : "error",
          message: result.persisted
            ? `Transcript retrieved: ${result.segmentCount ?? 0} raw segments, ${result.blockCount ?? 0} sanitized blocks, ${result.language ?? "unknown language"}${result.isGenerated ? ", generated captions" : ""}.`
            : state.channelBacklogStatus ?? "Transcript retrieval failed.",
        };
        showToast(state.videoActionStatus[video.videoId]?.message, result.persisted ? "success" : "error");
      } catch (error) {
        state.channelBacklogStatus = error instanceof Error ? error.message : "Transcript retrieval failed.";
        state.videoActionStatus[video.videoId] = { tone: "error", message: state.channelBacklogStatus };
        showToast(state.channelBacklogStatus, "error");
      } finally {
        state.savingTranscriptVideoId = undefined;
        state.selectedImportVideoId = video.videoId;
        const updatedGroup = groupForVideo(video.videoId);
        if (updatedGroup) state.expandedBacklogChannels[updatedGroup.key] = true;
        persistImportUiSession();
      }
    }
  }

  if (action === "retrieve-source-pages") {
    const videoId = target.dataset.videoId;
    const video = backlogVideos().find((item) => item.videoId === videoId);
    const group = videoId ? groupForVideo(videoId) : undefined;
    if (!video) {
      state.channelBacklogStatus = "Could not find that video in the backlog.";
      showToast(state.channelBacklogStatus, "error");
    } else {
      expandVideoDetailRow(video.videoId, "source-pages");
      state.retrievingSourcePagesVideoId = video.videoId;
      state.selectedImportVideoId = video.videoId;
      if (group) state.expandedBacklogChannels[group.key] = true;
      state.channelBacklogStatus = `Retrieving linked recipe pages for ${video.title ?? video.videoId}...`;
      state.videoActionStatus[video.videoId] = { tone: "info", message: state.channelBacklogStatus };
      showToast(state.channelBacklogStatus);
      persistImportUiSession();
      render({ preserveScroll: true });
      try {
        const result = await retrieveBacklogVideoSourcePages(video);
        state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
        state.channelBacklogStatus = result.persisted
          ? `Retrieved ${result.retrievedCount} linked recipe page${result.retrievedCount === 1 ? "" : "s"}.`
          : result.warning;
        state.videoActionStatus[video.videoId] = {
          tone: result.persisted ? "success" : "error",
          message: state.channelBacklogStatus ?? "Recipe page retrieval returned no status.",
        };
        showToast(state.videoActionStatus[video.videoId]?.message, result.persisted ? "success" : "error");
      } catch (error) {
        state.channelBacklogStatus = error instanceof Error ? error.message : "Recipe page retrieval failed.";
        state.videoActionStatus[video.videoId] = { tone: "error", message: state.channelBacklogStatus };
        showToast(state.channelBacklogStatus, "error");
      } finally {
        state.retrievingSourcePagesVideoId = undefined;
        state.selectedImportVideoId = video.videoId;
        const updatedGroup = groupForVideo(video.videoId);
        if (updatedGroup) state.expandedBacklogChannels[updatedGroup.key] = true;
        persistImportUiSession();
      }
    }
  }

  if (action === "process-backlog-video") {
    const videoId = target.dataset.videoId;
    const video = backlogVideos().find((item) => item.videoId === videoId);
    const transcript = "";
    const group = videoId ? groupForVideo(videoId) : undefined;
    if (!video) {
      state.channelBacklogStatus = "Could not find that video in the backlog.";
      showToast(state.channelBacklogStatus, "error");
    } else {
      const recipeEvidence = videoRecipeEvidence(video);
      if (!recipeEvidence.ready) {
        state.selectedImportVideoId = video.videoId;
        if (group) state.expandedBacklogChannels[group.key] = true;
        expandVideoDetailRow(video.videoId, "draft");
        state.channelBacklogStatus = recipeEvidence.message;
        state.videoActionStatus[video.videoId] = { tone: "error", message: recipeEvidence.message };
        showToast(recipeEvidence.message, "error");
        persistImportUiSession();
        render({ preserveScroll: true });
        return;
      }
      expandVideoDetailRow(video.videoId, "draft");
      state.processingVideoId = video.videoId;
      state.selectedImportVideoId = video.videoId;
      if (group) state.expandedBacklogChannels[group.key] = true;
      state.channelBacklogStatus = `Creating recipe draft for ${video.title ?? video.videoId}...`;
      state.videoActionStatus[video.videoId] = { tone: "info", message: state.channelBacklogStatus };
      showToast(state.channelBacklogStatus);
      persistImportUiSession();
      render({ preserveScroll: true });
      try {
        const sourceVideo = video;
        const result = await processBacklogVideo(sourceVideo, transcript, true);
        state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [result.video]);
        if (result.candidate && result.recipeTextFound !== false) {
          state.importCandidate = result.candidate;
          state.importInput = [
            video.url,
            video.title,
            video.description,
          ]
            .filter(Boolean)
            .join("\n\n");
          state.importStatus = `Draft created${result.model ? ` with ${result.model}` : ""}. Review it before saving.`;
          state.channelBacklogStatus = result.persisted ? `Saved candidate to ${result.candidatePath}.` : result.warning;
          state.videoActionStatus[video.videoId] = {
            tone: result.persisted ? "success" : "error",
            message: result.persisted
              ? `Draft created from ${result.sourceTextKind ?? "automatic source"}: ${result.candidate.ingredients.length} ingredients, ${result.candidate.steps.length} steps. Saved to ${result.candidatePath}.`
              : state.channelBacklogStatus ?? "Draft was created locally but not persisted.",
          };
          showToast(state.videoActionStatus[video.videoId]?.message, result.persisted ? "success" : "error");
        } else {
          state.importCandidate = undefined;
          state.importStatus = result.warning ?? "No automatic recipe text was found in YouTube metadata.";
          state.channelBacklogStatus = result.warning;
          state.videoActionStatus[video.videoId] = {
            tone: "error",
            message: `${state.importStatus} Source checked: ${result.sourceTextKind ?? "unknown"}${result.sourceTextLength !== undefined ? ` (${result.sourceTextLength} chars)` : ""}.`,
          };
          showToast(state.videoActionStatus[video.videoId]?.message, "error");
        }
      } catch (error) {
        state.importStatus = error instanceof Error ? error.message : "Draft creation failed.";
        state.channelBacklogStatus = state.importStatus;
        state.videoActionStatus[video.videoId] = { tone: "error", message: state.importStatus };
        showToast(state.importStatus, "error");
      } finally {
        state.processingVideoId = undefined;
        state.selectedImportVideoId = video.videoId;
        const updatedGroup = groupForVideo(video.videoId);
        if (updatedGroup) state.expandedBacklogChannels[updatedGroup.key] = true;
        persistImportUiSession();
      }
    }
  }

  if (action === "load-catalog-video") {
    const record = collectedCatalog.records.find((item) => item.videoId === target.dataset.videoId);
    if (record) loadCatalogRecord(record);
  }

  if (action === "load-baseline-item") {
    const item = collectedBaselineBacklog.items.find((entry) => entry.id === target.dataset.baselineItemId);
    if (item) loadBaselineBacklogItem(item);
  }

  if (action === "load-themealdb-meal") {
    const record = state.mealDbCatalog.records.find((item) => item.id === target.dataset.mealdbId);
    if (record) loadMealDbRecord(record);
  }

  if (action === "load-backlog-video") {
    const videoId = target.dataset.videoId;
    const record = collectedCatalog.records.find((item) => item.videoId === videoId);
    if (record) {
      state.selectedImportVideoId = videoId;
      loadCatalogRecord(record);
    } else {
      const video = backlogVideos().find((item) => item.videoId === videoId);
      if (video) {
        state.selectedImportVideoId = video.videoId;
        state.importInput = [video.url, video.title, video.description, video.notes].filter(Boolean).join("\n\n");
        state.importCandidate = createYouTubeCandidate(state.importInput);
        state.importStatus = "Backlog video loaded. Metadata/transcript collection is still pending, so this draft may be sparse.";
      }
    }
  }

  if (action === "refine-import-ai") {
    const videoId = target.dataset.videoId;
    const video = videoId ? backlogVideos().find((item) => item.videoId === videoId) : undefined;
    const candidate = videoId ? candidateForVideo(videoId) : state.importCandidate;
    if (!candidate) {
      state.importStatus = "Create a local draft before using AI refinement.";
      if (videoId) state.videoActionStatus[videoId] = { tone: "error", message: state.importStatus };
    } else if (!hasAiImportEndpoint()) {
      state.importStatus = "AI refinement is not configured for this build.";
      if (videoId) state.videoActionStatus[videoId] = { tone: "error", message: state.importStatus };
    } else {
      state.importCandidate = candidate;
      state.importStatus = "Refining draft with AI...";
      if (videoId) {
        state.refiningImportVideoId = videoId;
        state.selectedImportVideoId = videoId;
        const group = groupForVideo(videoId);
        if (group) state.expandedBacklogChannels[group.key] = true;
        state.videoActionStatus[videoId] = { tone: "info", message: "Refining final recipe with AI..." };
        showToast(state.videoActionStatus[videoId]?.message);
      }
      render({ preserveScroll: state.screen === "import" });
      try {
        let input = video ? [video.url, video.title, video.description, video.notes].filter(Boolean).join("\n\n") : state.importInput;
        if (video && videoHasTranscriptOutput(video)) {
          if (videoId) {
            state.videoActionStatus[videoId] = { tone: "info", message: "Loading saved transcript context for AI..." };
            showToast(state.videoActionStatus[videoId]?.message);
            render({ preserveScroll: true });
          }
          const transcript = await readBacklogVideoTranscript(video);
          input = [
            input,
            transcript.sanitizedText ? `Sanitized transcript:\n${transcript.sanitizedText}` : undefined,
          ].filter(Boolean).join("\n\n---\n\n");
        }
        if (videoId) {
          state.videoActionStatus[videoId] = { tone: "info", message: "Waiting for AI refinement response..." };
          showToast(state.videoActionStatus[videoId]?.message);
          render({ preserveScroll: true });
        }
        const result = await refineCandidateWithAi(input, candidate);
        state.importCandidate = result.candidate;
        const aiProviderWarning = aiFallbackWarning(result.warnings);
        state.importStatus = result.usedFallback
          ? `AI provider did not complete; local fallback was used${result.model ? ` (${result.model})` : ""}.${aiProviderWarning ? ` ${aiProviderWarning}` : ""}`
          : `AI refinement complete${result.model ? ` (${result.model})` : ""}. Review the updated draft before saving.`;
        if (videoId) {
          state.videoActionStatus[videoId] = { tone: result.usedFallback ? "error" : "success", message: state.importStatus };
          showToast(state.importStatus, result.usedFallback ? "error" : "success");
        }
      } catch (error) {
        state.importStatus = error instanceof Error ? error.message : "AI refinement failed.";
        if (videoId) {
          state.videoActionStatus[videoId] = { tone: "error", message: state.importStatus };
          showToast(state.importStatus, "error");
        }
      } finally {
        if (videoId) state.refiningImportVideoId = undefined;
      }
    }
  }

  if (action === "finalize-import-candidate" || action === "save-import-candidate") {
    const videoId = target.dataset.videoId;
    const candidate = videoId ? candidateForVideo(videoId) : state.importCandidate;
    if (candidate) {
      try {
        if (videoId) {
          state.finalizingImportVideoId = videoId;
          state.videoActionStatus[videoId] = { tone: "info", message: "Finalizing recipe into the catalog..." };
        }
        state.importStatus = "Finalizing recipe into the catalog...";
        render({ preserveScroll: state.screen === "import" });
        const wasImported = Boolean(importedRecipeForSource(candidate.source));
        await finalizeImportCandidate(candidate, videoId);
        showToast(wasImported ? "Recipe updated with a new version." : "Recipe approved and finalized into the catalog.", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Recipe finalization failed.";
        state.importStatus = message;
        if (videoId) state.videoActionStatus[videoId] = { tone: "error", message };
        showToast(message, "error");
      } finally {
        if (videoId) state.finalizingImportVideoId = undefined;
      }
    } else {
      state.importStatus = "No recipe draft is loaded to finalize.";
      if (videoId) state.videoActionStatus[videoId] = { tone: "error", message: state.importStatus };
      showToast(state.importStatus, "error");
    }
  }

  if (action === "go-detail" || action === "exit-cooking") {
    state.screen = "detail";
    void releaseWakeLock();
  }

  if (action === "open-recipe") {
    const recipeId = target.dataset.recipeId;
    if (recipeId?.startsWith("recipe-")) state.selectedRecipeId = recipeId;
    else selectFirstRecipe();
    state.selectedVersionId = undefined;
    state.screen = "detail";
  }

  if (action === "edit-recipe") state.screen = "edit";
  if (action === "cancel-edit") state.screen = "detail";
  if (action === "start-shop") state.screen = "shop";
  if (action === "start-mise") state.screen = "mise";

  if (action === "start-cooking") {
    state.screen = "cook";
    resetStepTimer();
    void requestWakeLock();
  }

  if (action === "start-step") {
    state.cookStepIndex = Number(target.dataset.stepIndex ?? 0);
    state.screen = "cook";
    resetStepTimer();
    void requestWakeLock();
  }

  if (action === "select-cook-step") {
    state.cookStepIndex = Number(target.dataset.stepIndex ?? 0);
    setActiveWorkflowSection("workflow-cook");
  }

  if (action === "tap-next") nextStep();
  if (action === "cook-prev") previousStep();
  if (action === "cook-next") nextStep();

  if (action === "toggle-step-timer" && state.stepTimer) {
    state.stepTimer.running = !state.stepTimer.running;
  }

  if (action === "toggle-voice") toggleVoice();

  if (action === "toggle-mise") {
    const id = target.dataset.ingId;
    if (id) state.miseChecked.has(id) ? state.miseChecked.delete(id) : state.miseChecked.add(id);
  }

  if (action === "select-version") {
    state.selectedVersionId = target.dataset.versionId;
  }

  if (action === "reset-demo") {
    state.snapshot = await resetSnapshot();
    selectFirstRecipe();
    state.screen = "library";
    state.selectedVersionId = undefined;
    state.miseChecked.clear();
  }

  render({ preserveScroll: shouldPreserveScroll(action, screenBeforeAction) });
}

function shouldPreserveScroll(action: string | undefined, screenBeforeAction: Screen): boolean {
  if (screenBeforeAction !== state.screen) return false;
  if (state.screen === "detail") {
    return Boolean(
      action === "toggle-section" ||
        action === "toggle-workflow-section" ||
        action === "jump-workflow-section" ||
        action === "select-cook-step",
    );
  }
  if (state.screen !== "import") return false;
  return Boolean(
      action === "toggle-backlog-channel" ||
      action === "toggle-import-source" ||
      action === "import-source-filter" ||
      action === "select-backlog-video" ||
      action === "toggle-video-detail-row" ||
      action === "retrieve-channel-videos" ||
      action === "save-video-transcript" ||
      action === "retrieve-source-pages" ||
      action === "retrieve-video-transcript" ||
      action === "toggle-transcript-preview" ||
      action === "set-transcript-preview-mode" ||
      action === "process-backlog-video" ||
      action === "refine-import-ai" ||
      action === "add-backlog-channel" ||
      action === "create-import-draft" ||
      action === "load-baseline-item" ||
      action === "load-themealdb-meal" ||
      action === "load-youtube-sample",
  );
}

function loadCatalogRecord(record: YouTubeCatalogRecord): void {
  state.importInput = `${record.url}\n\n${record.title}\n\n${record.description}`;
  state.importCandidate = createYouTubeCandidateFromCatalog(record);
  state.importStatus = "Catalog source loaded. Review/refine this draft before saving it as a recipe.";
  state.screen = "import";
}

function loadBaselineBacklogItem(item: BaselineRecipeBacklogItem): void {
  const version = item.baselineRecipeId ? state.snapshot?.versions.find((candidate) => candidate.recipeId === item.baselineRecipeId) : undefined;
  const mealDbRecord = mealDbRecordForBaselineItem(item);
  if (version) {
    state.importInput = [item.title, item.notes, `Baseline recipe id: ${item.baselineRecipeId}`].filter(Boolean).join("\n\n");
    state.importCandidate = createCandidateFromVersion(version, "Baseline catalogue");
    state.importStatus = "Baseline recipe loaded from the baseline channel. Review before saving a new local recipe.";
  } else if (mealDbRecord) {
    loadMealDbRecord(mealDbRecord);
    state.importStatus = "Baseline backlog item has a TheMealDB match. Review the external draft before promoting it into the baseline catalogue.";
  } else {
    state.importInput = [item.title, item.category, item.subcategory, item.cuisine, item.notes].filter(Boolean).join("\n");
    state.importCandidate = createQueuedBaselineCandidate(item);
    state.importStatus = "Baseline backlog item loaded. This queue item needs a drafted recipe before it can be saved.";
  }
  state.screen = "import";
}

function loadMealDbRecord(record: TheMealDBRecord): void {
  state.importInput = [record.mealDbUrl, record.sourceUrl, record.name, record.category, record.area].filter(Boolean).join("\n");
  state.importCandidate = createMealDbCandidate(record);
  state.importStatus = "TheMealDB source loaded. Review attribution and recipe details before saving.";
  state.screen = "import";
}

function createCandidateFromVersion(version: RecipeVersion, sourceTitle: string): RecipeCandidate {
  const source = version.sourceIds.map(sourceById).find(Boolean) ?? {
    id: `source-baseline-import-${version.recipeId}`,
    type: "manual",
    title: sourceTitle,
    author: "rrrecipe",
    retrievedAt: new Date().toISOString(),
  };
  return {
    id: uid("candidate"),
    source,
    title: version.title,
    language: version.language,
    description: version.description,
    yield: version.yield,
    times: version.times,
    ingredients: structuredClone(version.ingredients),
    steps: structuredClone(version.steps),
    notes: [...version.notes, `Loaded from ${sourceTitle}.`],
    tags: Array.from(new Set(["baseline", ...version.tags])),
    confidence: { overall: 0.9, source: 0.95, ingredients: 0.9, steps: 0.9 },
    warnings: ["This draft comes from the baseline catalogue. Saving it creates a separate recipe record."],
  };
}

function createQueuedBaselineCandidate(item: BaselineRecipeBacklogItem): RecipeCandidate {
  return {
    id: uid("candidate"),
    source: {
      id: `source-${item.id}`,
      type: "manual",
      title: "Baseline recipe backlog",
      author: "rrrecipe",
      retrievedAt: new Date().toISOString(),
    },
    title: item.title,
    language: "en",
    description: [item.cuisine, item.category, item.subcategory].filter(Boolean).join(" · "),
    ingredients: [],
    steps: [],
    notes: [item.notes || "Queued baseline recipe identity."],
    tags: Array.from(new Set(["baseline", item.category, item.subcategory, item.cuisine, ...item.tags].filter((tag): tag is string => Boolean(tag)))).slice(0, 8),
    confidence: { overall: 0.1, source: 0.8, ingredients: 0, steps: 0 },
    warnings: ["This baseline backlog item is not drafted yet. Add ingredients and steps before saving."],
  };
}

function updateBrowseRows(): void {
  if (!state.snapshot) return;
  const refs = browseRefsFromDocument();
  renderBrowseList(refs, state.snapshot, currentBrowseFilters());
  bindBrowseRowEvents(refs.list);
}

function bindBrowseRowEvents(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-action='open-recipe']").forEach((element) => {
    element.addEventListener("click", handleAction);
  });
}

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.classList.add("theme-switching");
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#fafaf8" : "#0a0a0a";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.documentElement.classList.remove("theme-switching"));
  });
}

function nextStep(): void {
  const version = currentVersion();
  if (!version) return;
  const next = Math.min(version.steps.length - 1, state.cookStepIndex + 1);
  if (next !== state.cookStepIndex) {
    state.cookStepIndex = next;
    resetStepTimer();
  }
}

function previousStep(): void {
  const previous = Math.max(0, state.cookStepIndex - 1);
  if (previous !== state.cookStepIndex) {
    state.cookStepIndex = previous;
    resetStepTimer();
  }
}

function resetStepTimer(): void {
  const step = currentVersion()?.steps[state.cookStepIndex];
  state.stepTimer = step?.timerSeconds
    ? { remaining: step.timerSeconds, total: step.timerSeconds, running: false, label: stepDetail(step) }
    : null;
}

function syncTimerInterval(): void {
  if (timerInterval !== undefined) {
    window.clearInterval(timerInterval);
    timerInterval = undefined;
  }
  if (!state.stepTimer?.running) return;
  timerInterval = window.setInterval(() => {
    if (!state.stepTimer?.running) return;
    state.stepTimer.remaining = Math.max(0, state.stepTimer.remaining - 1);
    if (state.stepTimer.remaining === 0) state.stepTimer.running = false;
    render();
  }, 1000);
}

function toggleVoice(): void {
  state.voiceMode = !state.voiceMode;
  if (!state.voiceMode) {
    recognition?.abort();
    recognition = undefined;
    state.voiceListening = false;
    return;
  }

  const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const step = currentVersion()?.steps[state.cookStepIndex];
    if (step) speakStep(step);
    state.voiceMode = false;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  recognition.onresult = (resultEvent) => {
    const latest = resultEvent.results[resultEvent.results.length - 1];
    const phrase = latest?.[0]?.transcript.toLowerCase().trim() ?? "";
    handleVoicePhrase(phrase);
  };
  recognition.onend = () => {
    state.voiceListening = false;
    if (state.voiceMode) {
      try {
        recognition?.start();
        state.voiceListening = true;
      } catch {
        state.voiceMode = false;
      }
    }
    render();
  };
  recognition.onerror = () => {
    state.voiceListening = false;
    state.voiceMode = false;
    render();
  };
  try {
    recognition.start();
    state.voiceListening = true;
  } catch {
    state.voiceMode = false;
    state.voiceListening = false;
  }
}

function handleVoicePhrase(phrase: string): void {
  if (phrase.includes("next step")) nextStep();
  if (phrase === "back" || phrase.includes("previous")) previousStep();
  if (phrase.includes("repeat") || phrase.includes("read")) {
    const step = currentVersion()?.steps[state.cookStepIndex];
    if (step) speakStep(step);
  }
  if (phrase.includes("start timer") && state.stepTimer) state.stepTimer.running = true;
  if (phrase.includes("pause timer") && state.stepTimer) state.stepTimer.running = false;
  render();
}

async function finalizeImportCandidate(candidate: RecipeCandidate, backlogVideoId?: string): Promise<void> {
  if (!state.snapshot) throw new Error("Recipe catalog is not loaded yet.");
  if (!candidate.ingredients.length || !candidate.steps.length) {
    throw new Error("This draft needs ingredients and steps before it can be finalized.");
  }

  const finalized = buildSnapshotForCandidate(state.snapshot, candidate);
  state.snapshot = finalized.snapshot;
  const recipeId = finalized.recipeId;
  const versionId = finalized.versionId;
  const createdAt = finalized.createdAt;
  state.selectedRecipeId = recipeId;
  state.selectedVersionId = versionId;
  const videoId = backlogVideoId ?? candidate.source.media?.videoId;
  if (videoId) {
    const video = backlogVideos().find((item) => item.videoId === videoId);
    if (video) {
      state.localBacklogVideos = mergeBacklogVideos(state.localBacklogVideos, [
        {
          ...video,
          candidate: {
            status: "promoted",
            localPath: video.candidate?.localPath,
            generatedAt: createdAt,
            model: video.candidate?.model ?? "manual-candidate/v1",
            warnings: candidate.warnings,
          },
          updatedAt: createdAt,
        },
      ]);
      state.videoActionStatus[videoId] = { tone: "success", message: finalized.updatedExistingRecipe ? "Recipe updated with a new version." : "Recipe approved and finalized into the catalog." };
    }
  }
  state.importCandidate = undefined;
  state.screen = "detail";
  await saveSnapshot(state.snapshot);
}

async function requestWakeLock(): Promise<void> {
  const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
  try {
    wakeLock = await nav.wakeLock?.request("screen");
  } catch {
    wakeLock = undefined;
  }
}

async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release();
  } finally {
    wakeLock = undefined;
  }
}

async function handleEditorSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.snapshot) return;
  const recipe = currentRecipe();
  if (!recipe) return;
  const base = versionFor(recipe);
  if (!base) return;

  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const title = String(formData.get("title") ?? base.title).trim() || base.title;
  const changeSummary = String(formData.get("changeSummary") ?? "manual edit").trim();
  const ingredientLines = textareaLines(String(formData.get("ingredients") ?? ""));
  const stepLines = textareaLines(String(formData.get("steps") ?? ""));
  const createdAt = new Date().toISOString();

  const version: RecipeVersion = {
    ...base,
    id: uid("version"),
    parentVersionId: base.id,
    title,
    ingredients: ingredientLines.map((line, index) => ({
      id: uid("ing"),
      raw: line,
      language: base.language,
      conversion: { confidence: "unknown" },
      normalized: { unitSystem: "unknown" },
      section: base.ingredients[index]?.section,
    })),
    steps: stepLines.map((line, index) => ({
      id: uid("step"),
      position: index + 1,
      text: line,
      language: base.language,
      mediaAnchors: base.steps[index]?.mediaAnchors,
      timerSeconds: base.steps[index]?.timerSeconds,
      temperature: base.steps[index]?.temperature,
    })),
    changeSummary: changeSummary || "manual edit",
    origin: "manual_edit",
    createdAt,
    createdBy: "user",
  };

  recipe.currentVersionId = version.id;
  recipe.updatedAt = createdAt;
  const variant = state.snapshot.variants.find((item) => item.id === base.variantId);
  if (variant) variant.currentVersionId = version.id;

  state.snapshot.versions.push(version);
  state.selectedVersionId = version.id;
  state.screen = "detail";
  await saveSnapshot(state.snapshot);
  render();
}
