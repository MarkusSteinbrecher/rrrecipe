import { icon } from "./icons";
import type { AppSnapshot, RecipeCandidate } from "./types";

export type ImportSourceFilter = "all" | "baseline" | "themealdb" | "youtube";

export type ImportSourceSections = {
  showYouTube: boolean;
  youtubeHtml: string;
  showBaseline: boolean;
  baselineHtml: string;
  showMealDb: boolean;
  mealDbHtml: string;
  emptyMessage: string;
};

export type ImportIntakeState = {
  channelInput: string;
  channelStatus?: string;
  backlogEndpointAvailable: boolean;
  search: string;
  sourceFilter: ImportSourceFilter;
  sourceFilters: readonly ImportSourceFilter[];
  sourceSections: ImportSourceSections;
  candidate?: RecipeCandidate;
  candidateHtml?: string;
};

export interface ImportRefs {
  /** Import screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Intake API availability label beside the add-source heading. */
  apiStatus: HTMLElement;
  /** YouTube channel/video intake input. */
  channelInput: HTMLInputElement;
  /** Channel intake status or offline message. */
  channelStatus: HTMLElement;
  /** Import source search input. */
  search: HTMLInputElement;
  /** Source filter chip container. */
  sourceFilters: HTMLElement;
  /** YouTube source/candidate list section. */
  youtubeSection: HTMLElement;
  /** Dynamic YouTube source/candidate list content. */
  youtubeContent: HTMLElement;
  /** Empty-state copy shown when no source rows are queued. */
  emptyState: HTMLElement;
  /** Baseline source/candidate list section. */
  baselineSection: HTMLElement;
  /** TheMealDB source/candidate list section. */
  mealDbSection: HTMLElement;
  /** Candidate review pane. */
  candidateReview: HTMLElement;
}

export const IMPORT_REF_IDS = {
  root: "import-root",
  apiStatus: "import-api-status",
  channelInput: "import-channel-input",
  channelStatus: "import-channel-status",
  search: "import-search",
  sourceFilters: "import-source-filters",
  youtubeSection: "import-youtube-section",
  youtubeContent: "import-youtube-content",
  emptyState: "import-empty-state",
  baselineSection: "import-baseline-section",
  mealDbSection: "import-mealdb-section",
  candidateReview: "import-candidate-review",
} as const;

export const IMPORT_FRAGMENT = `
<main id="${IMPORT_REF_IDS.root}" class="rr-import-shell">
  <section class="rr-import-panel rr-import-workbench">
    <section class="rr-add-channel">
      <div class="rr-section-label"><span>add video or channel</span><span id="${IMPORT_REF_IDS.apiStatus}" class="count"></span></div>
      <div class="rr-add-channel-row">
        <input id="${IMPORT_REF_IDS.channelInput}" data-action="update-channel-backlog-input" placeholder="paste a YouTube video URL, @handle, channel URL, or channel ID">
        <button class="rr-mini-action" data-action="add-backlog-channel">add source</button>
      </div>
      <p id="${IMPORT_REF_IDS.channelStatus}" class="rr-import-status rr-channel-status" hidden></p>
    </section>

    <section id="${IMPORT_REF_IDS.youtubeSection}" class="rr-import-source-list">
      <div class="rr-import-toolbar">
        <div class="rr-search-wrap">
          ${icon("search")}
          <input id="${IMPORT_REF_IDS.search}" class="rr-search" data-action="import-search" placeholder="search baseline, themealdb, youtube">
        </div>
        <div id="${IMPORT_REF_IDS.sourceFilters}" class="rr-filter-row rr-import-filter-row"></div>
      </div>
      <div id="${IMPORT_REF_IDS.youtubeContent}" data-import-candidate-list></div>
      <p id="${IMPORT_REF_IDS.emptyState}" class="rr-import-empty" hidden></p>
    </section>

    <section id="${IMPORT_REF_IDS.baselineSection}" class="rr-import-source-list rr-import-baseline-list"></section>
    <section id="${IMPORT_REF_IDS.mealDbSection}" class="rr-import-source-list rr-import-catalog-list"></section>
  </section>
  <section id="${IMPORT_REF_IDS.candidateReview}" class="rr-import-panel" hidden></section>
</main>
`;

export function importRefsFromDocument(root: ParentNode = document): ImportRefs {
  return {
    root: byId(root, IMPORT_REF_IDS.root),
    apiStatus: byId(root, IMPORT_REF_IDS.apiStatus),
    channelInput: byId(root, IMPORT_REF_IDS.channelInput) as HTMLInputElement,
    channelStatus: byId(root, IMPORT_REF_IDS.channelStatus),
    search: byId(root, IMPORT_REF_IDS.search) as HTMLInputElement,
    sourceFilters: byId(root, IMPORT_REF_IDS.sourceFilters),
    youtubeSection: byId(root, IMPORT_REF_IDS.youtubeSection),
    youtubeContent: byId(root, IMPORT_REF_IDS.youtubeContent),
    emptyState: byId(root, IMPORT_REF_IDS.emptyState),
    baselineSection: byId(root, IMPORT_REF_IDS.baselineSection),
    mealDbSection: byId(root, IMPORT_REF_IDS.mealDbSection),
    candidateReview: byId(root, IMPORT_REF_IDS.candidateReview),
  };
}

export function renderImport(refs: ImportRefs, snapshot: AppSnapshot, intake: ImportIntakeState): void {
  void snapshot;
  refs.apiStatus.textContent = intake.backlogEndpointAvailable ? "local api" : "import api offline";
  refs.channelInput.value = intake.channelInput;
  refs.channelStatus.textContent = intake.channelStatus ?? "";
  refs.channelStatus.hidden = !intake.channelStatus;
  refs.search.value = intake.search;
  renderFilterChips(refs.sourceFilters, intake.sourceFilters, intake.sourceFilter);

  const { sourceSections } = intake;
  renderSection(refs.youtubeSection, refs.youtubeContent, sourceSections.youtubeHtml, sourceSections.showYouTube);
  refs.emptyState.textContent = sourceSections.emptyMessage;
  refs.emptyState.hidden = !sourceSections.showYouTube || Boolean(sourceSections.youtubeHtml.trim());
  renderSection(refs.baselineSection, refs.baselineSection, sourceSections.baselineHtml, sourceSections.showBaseline);
  renderSection(refs.mealDbSection, refs.mealDbSection, sourceSections.mealDbHtml, sourceSections.showMealDb);

  const candidateHtml = intake.candidateHtml ?? (intake.candidate ? renderCandidateSummary(intake.candidate) : "");
  refs.candidateReview.innerHTML = candidateHtml;
  refs.candidateReview.hidden = !candidateHtml.trim();
}

function renderSection(section: HTMLElement, content: HTMLElement, html: string, visible: boolean): void {
  section.hidden = !visible;
  content.innerHTML = visible ? html : "";
}

function renderFilterChips(container: HTMLElement, values: readonly ImportSourceFilter[], active: ImportSourceFilter): void {
  container.replaceChildren(
    ...values.map((value) => {
      const button = document.createElement("button");
      button.className = `rr-chip ${active === value ? "is-active" : ""}`.trim();
      button.dataset.action = "import-source-filter";
      button.dataset.importSourceFilter = value;
      button.textContent = importFilterLabel(value);
      return button;
    }),
  );
}

function renderCandidateSummary(candidate: RecipeCandidate): string {
  return `
    <section class="rr-import-review">
      <div class="rr-import-source">
        <div>
          <div class="rr-kicker">${escapeHtml(candidate.source.type)} draft</div>
          <h2>${escapeHtml(candidate.title.toLowerCase())}</h2>
          <p>${escapeHtml(candidate.source.title ?? candidate.source.author ?? "recipe source")}</p>
        </div>
      </div>
      <div class="rr-confidence">
        <span>overall ${Math.round(candidate.confidence.overall * 100)}%</span>
        <span>ingredients ${Math.round(candidate.confidence.ingredients * 100)}%</span>
        <span>steps ${Math.round(candidate.confidence.steps * 100)}%</span>
      </div>
    </section>
  `;
}

function importFilterLabel(value: ImportSourceFilter): string {
  if (value === "themealdb") return "TheMealDB";
  if (value === "youtube") return "YT";
  return value;
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

function byId(root: ParentNode, id: string): HTMLElement {
  const el = root instanceof Document ? root.getElementById(id) : root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`render-import: #${id} not found`);
  return el;
}
