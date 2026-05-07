import type { AppSnapshot, Source } from "./types";

export type BrowseSourceFilter = "all" | "baseline" | "themealdb" | "youtube";

export type BrowseFilters = {
  query: string;
  activeFilter: string;
  recipeSourceFilter: BrowseSourceFilter;
  filters: readonly string[];
  sourceFilters: readonly BrowseSourceFilter[];
};

export interface BrowseRefs {
  /** Browse screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Recipe and ingredient search input. */
  search: HTMLInputElement;
  /** Source filter chip container. */
  sourceFilters: HTMLElement;
  /** Recipe tag filter chip container. */
  filterChips: HTMLElement;
  /** Visible recipe count in the section label. */
  count: HTMLElement;
  /** Recipe-card list container. */
  list: HTMLElement;
  /** Empty-state copy shown when filters produce no rows. */
  emptyState: HTMLElement;
}

type BrowseRow = {
  id: string;
  title: string;
  tags: string;
  filterText: string;
  sourceFilters: BrowseSourceFilter[];
  mark: string;
  tone: string;
  curated: boolean;
};

export const BROWSE_FILTERS = ["all", "baseline", "cooking", "baking", "pasta", "bread", "vegetarian", "quick"] as const;

export const BROWSE_REF_IDS = {
  root: "browse-root",
  search: "browse-search",
  sourceFilters: "browse-source-filters",
  filterChips: "browse-filter-chips",
  count: "browse-count",
  list: "browse-list",
  emptyState: "browse-empty-state",
} as const;

const searchIcon = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="currentColor"><circle cx="11" cy="11" r="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="m20 20-3.5-3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const BROWSE_FRAGMENT = `
<section id="${BROWSE_REF_IDS.root}">
  <div class="rr-topbar">
    <div class="rr-search-wrap">
      ${searchIcon}
      <input id="${BROWSE_REF_IDS.search}" class="rr-search" data-action="search" placeholder="search recipes, ingredients" />
    </div>
    <div id="${BROWSE_REF_IDS.sourceFilters}" class="rr-filter-row rr-recipe-source-filter-row"></div>
    <div id="${BROWSE_REF_IDS.filterChips}" class="rr-filter-row"></div>
  </div>

  <div class="rr-content rr-browse-content rr-browse-content--plain">
    <div class="rr-section-label"><span>library</span><span id="${BROWSE_REF_IDS.count}" class="count" data-browse-count></span></div>
    <div id="${BROWSE_REF_IDS.list}" class="rr-browse-list" data-browse-list></div>
    <p id="${BROWSE_REF_IDS.emptyState}" class="rr-row-empty" hidden>No recipes match this search.</p>
  </div>
</section>
`;

export function browseRefsFromDocument(root: ParentNode = document): BrowseRefs {
  return {
    root: byId(root, BROWSE_REF_IDS.root),
    search: byId(root, BROWSE_REF_IDS.search) as HTMLInputElement,
    sourceFilters: byId(root, BROWSE_REF_IDS.sourceFilters),
    filterChips: byId(root, BROWSE_REF_IDS.filterChips),
    count: byId(root, BROWSE_REF_IDS.count),
    list: byId(root, BROWSE_REF_IDS.list),
    emptyState: byId(root, BROWSE_REF_IDS.emptyState),
  };
}

export function renderBrowse(refs: BrowseRefs, snapshot: AppSnapshot, filters: BrowseFilters): void {
  refs.search.value = filters.query;
  renderFilterChips(refs.sourceFilters, filters.sourceFilters, filters.recipeSourceFilter, "recipe-source-filter", "recipeSourceFilter");
  renderFilterChips(refs.filterChips, filters.filters, filters.activeFilter, "filter", "filter");
  renderBrowseList(refs, snapshot, filters);
}

export function renderBrowseList(refs: Pick<BrowseRefs, "count" | "list" | "emptyState">, snapshot: AppSnapshot, filters: BrowseFilters): void {
  const query = filters.query.trim().toLowerCase();
  const visibleRows = browseRows(snapshot).filter((row) => {
    const matchesFilter = filters.activeFilter === "all" || row.filterText.includes(filters.activeFilter);
    const matchesSource = filters.recipeSourceFilter === "all" || row.sourceFilters.includes(filters.recipeSourceFilter);
    const matchesSearch = !query || row.filterText.includes(query);
    return matchesFilter && matchesSource && matchesSearch;
  });
  refs.count.textContent = `${visibleRows.length} RECIPES`;
  refs.list.replaceChildren(...visibleRows.map((row, index) => renderBrowseRow(row, index)));
  refs.emptyState.hidden = visibleRows.length > 0;
}

function browseRows(snapshot: AppSnapshot): BrowseRow[] {
  return snapshot.recipes.map((recipe, index) => {
    const version = snapshot.versions.find((item) => item.id === recipe.currentVersionId);
    const title = version?.title.toLowerCase() ?? "untitled recipe";
    const minutes = version?.times?.totalMinutes ? `${version.times.totalMinutes}min` : "recipe";
    const tags = [...(version?.tags.slice(0, 2) ?? []), minutes].join(" · ");
    const versionSources = version?.sourceIds.map((id) => snapshot.sources.find((source) => source.id === id)).filter((source): source is Source => Boolean(source)) ?? [];
    const sourceFilters: BrowseSourceFilter[] = [
      version?.tags.includes("baseline") || version?.collections.includes("Baseline") ? "baseline" : undefined,
      versionSources.some((source) => source.type === "themealdb") ? "themealdb" : undefined,
      versionSources.some((source) => source.type === "youtube") ? "youtube" : undefined,
    ].filter((filter): filter is BrowseSourceFilter => Boolean(filter));
    const filterText = [
      title,
      ...(version?.tags ?? []),
      ...(version?.collections ?? []),
      ...(version?.ingredients.map((ingredient) => `${ingredient.raw} ${ingredient.item ?? ""}`) ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const mark = title
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
    return {
      id: recipe.id,
      title,
      tags,
      filterText,
      sourceFilters,
      mark: mark || "RR",
      tone: index % 2 === 0 ? "warm" : "",
      curated: version?.sourceIds.some((id) => snapshot.sources.find((source) => source.id === id)?.type === "youtube") ?? false,
    };
  });
}

function renderFilterChips(container: HTMLElement, values: readonly string[], active: string, action: string, dataKey: string): void {
  container.replaceChildren(
    ...values.map((value) => {
      const button = document.createElement("button");
      button.className = `rr-chip ${active === value ? "is-active" : ""}`.trim();
      button.dataset.action = action;
      button.dataset[dataKey] = value;
      button.textContent = browseFilterLabel(value);
      return button;
    }),
  );
}

function renderBrowseRow(row: BrowseRow, index: number): HTMLElement {
  const button = document.createElement("button");
  button.className = `rr-row ${index === 0 ? "is-active" : ""}`.trim();
  button.dataset.action = "open-recipe";
  button.dataset.recipeId = row.id;

  const fav = document.createElement("div");
  fav.className = `rr-fav ${row.tone}`.trim();
  fav.textContent = row.mark;
  button.append(fav);

  const info = document.createElement("div");
  info.className = "rr-row-info";
  const name = document.createElement("div");
  name.className = "rr-row-name";
  name.textContent = row.title;
  const tags = document.createElement("div");
  tags.className = "rr-row-tags";
  tags.textContent = row.tags;
  info.append(name, tags);
  button.append(info);

  const right = document.createElement("div");
  right.className = "rr-row-right";
  if (row.curated) right.append(svgIcon("star", 13));
  const heart = document.createElement("span");
  if (index === 0) heart.className = "rr-heart-on";
  heart.append(svgIcon("heart", 13));
  right.append(heart);
  button.append(right);

  return button;
}

function browseFilterLabel(value: string): string {
  if (value === "themealdb") return "TheMealDB";
  if (value === "youtube") return "YT";
  return value;
}

function svgIcon(name: "heart" | "star", size: number): SVGElement {
  const paths = {
    heart: `<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="none" stroke-linejoin="round"/>`,
    star: `<path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5-5.5-3.5L6.5 20.5 8 14 3 9.5l6.5-.5L12 3z" fill="none" stroke-linejoin="round"/>`,
  };
  const template = document.createElement("template");
  template.innerHTML = `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" fill="currentColor">${paths[name]}</svg>`;
  return template.content.firstElementChild as SVGElement;
}

function byId(root: ParentNode, id: string): HTMLElement {
  const el = root instanceof Document ? root.getElementById(id) : root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`render-browse: #${id} not found`);
  return el;
}
