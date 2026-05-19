import { icon } from "./icons";
import { formatScaledQuantity } from "./ingredient-scale";
import type { AppSnapshot, IngredientLine, InstructionStep, Recipe, RecipeVersion, Source } from "./types";

export type DetailViewState = {
  servings: number;
  miseCheckedIds: ReadonlySet<string>;
  expandedSections: Record<string, boolean>;
  cookStepIndex: number;
};

export interface DetailRefs {
  /** Detail screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Recipe title in the detail titlebar. */
  title: HTMLElement;
  /** Workflow rows container (overview / shop / prep / cook). */
  workflowRows: HTMLElement;
  /** Versions count badge in the history section label. */
  historyCount: HTMLElement;
  /** Versions list container. */
  historyList: HTMLElement;
}

export const DETAIL_REF_IDS = {
  root: "detail-root",
  title: "detail-title",
  workflowRows: "detail-workflow-rows",
  historyCount: "detail-history-count",
  historyList: "detail-history-list",
} as const;

export const DETAIL_FRAGMENT = `
<div id="${DETAIL_REF_IDS.root}" class="rr-content rr-detail-content rr-detail-content--plain">
  <div class="rr-detail-titlebar">
    <button class="rr-recipe-back" data-action="go-library" aria-label="back to recipes">${icon("back", 13)}</button>
    <h1 id="${DETAIL_REF_IDS.title}"></h1>
  </div>
  <div class="rr-recipe-scroll">
    <section id="${DETAIL_REF_IDS.workflowRows}" class="rr-workflow-rows"></section>
    <div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-cooking">${icon("flame", 12)} begin cooking</button></div>
    <section class="rr-history">
      <div class="rr-section-label"><span>versions</span><span id="${DETAIL_REF_IDS.historyCount}" class="count"></span></div>
      <div id="${DETAIL_REF_IDS.historyList}"></div>
    </section>
  </div>
</div>
`;

export function detailRefsFromDocument(root: ParentNode = document): DetailRefs {
  return {
    root: byId(root, DETAIL_REF_IDS.root),
    title: byId(root, DETAIL_REF_IDS.title),
    workflowRows: byId(root, DETAIL_REF_IDS.workflowRows),
    historyCount: byId(root, DETAIL_REF_IDS.historyCount),
    historyList: byId(root, DETAIL_REF_IDS.historyList),
  };
}

export function renderDetail(
  refs: DetailRefs,
  snapshot: AppSnapshot,
  recipe: Recipe,
  version: RecipeVersion,
  view: DetailViewState,
): void {
  const versions = snapshot.versions
    .filter((item) => item.recipeId === recipe.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalMinutes = version.times?.totalMinutes ?? 0;
  const activeMinutes = version.times?.prepMinutes ?? Math.min(15, totalMinutes || 15);
  const baseServings = version.yield?.quantity ?? 1;
  const multiplier = view.servings / baseServings;

  refs.title.textContent = version.title.toLowerCase();

  refs.workflowRows.innerHTML = [
    renderWorkflowRow(
      "overview",
      "overview",
      `${totalMinutes || 35} min total`,
      renderWorkflowOverview(snapshot, version, totalMinutes, activeMinutes, view.servings),
      view.expandedSections,
    ),
    renderWorkflowRow(
      "shop",
      "shop",
      `${version.ingredients.length} ingredients`,
      renderWorkflowShop(version, multiplier, view.servings),
      view.expandedSections,
    ),
    renderWorkflowRow(
      "prep",
      "prep",
      `${view.miseCheckedIds.size} / ${version.ingredients.length} ready`,
      renderWorkflowPrep(version, multiplier, view.miseCheckedIds, snapshot.settings.measurementSystem),
      view.expandedSections,
    ),
    renderWorkflowRow(
      "cook",
      "cook",
      `${version.steps.length} steps`,
      renderWorkflowCook(version, view.cookStepIndex),
      view.expandedSections,
    ),
  ].join("");

  refs.historyCount.textContent = String(versions.length);
  refs.historyList.innerHTML = versions.map((item) => renderVersionItem(item, version.id)).join("");
}

function renderWorkflowRow(
  key: string,
  title: string,
  meta: string,
  content: string,
  expandedSections: Record<string, boolean>,
): string {
  const expanded = expandedSections[`workflow-${key}`] ?? key === "overview";
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

function renderWorkflowOverview(
  snapshot: AppSnapshot,
  version: RecipeVersion,
  totalMinutes: number,
  activeMinutes: number,
  servings: number,
): string {
  const imageUrl = recipeVisualUrl(snapshot, version);
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

function recipeVisualUrl(snapshot: AppSnapshot, version: RecipeVersion): string | undefined {
  const visualSource = version.sourceIds
    .map((id) => snapshot.sources.find((source) => source.id === id))
    .find((source): source is Source => Boolean(source?.external?.imageUrl || source?.media?.thumbnailUrl));
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

function renderWorkflowPrep(
  version: RecipeVersion,
  multiplier: number,
  miseCheckedIds: ReadonlySet<string>,
  measurementSystem: string,
): string {
  return `
    <div class="rr-workflow-list">
      ${version.ingredients
        .map((ingredient) =>
          renderIngredientRow(ingredient, {
            checked: miseCheckedIds.has(ingredient.id),
            multiplier,
            mode: "checklist",
            measurementSystem,
          }),
        )
        .join("")}
    </div>
  `;
}

function renderWorkflowCook(version: RecipeVersion, cookStepIndex: number): string {
  return `
    <div class="rr-workflow-list">
      ${version.steps.map((step) => renderInlineCookStep(step, cookStepIndex)).join("")}
    </div>
  `;
}

function renderInlineCookStep(step: InstructionStep, cookStepIndex: number): string {
  const index = step.position - 1;
  const timer = step.timerSeconds ? `${Math.round(step.timerSeconds / 60)}m` : "—";
  return `
    <button class="rr-step-row rr-step-row-inline ${cookStepIndex === index ? "is-active" : ""}" data-action="select-cook-step" data-step-index="${index}">
      <div class="n">${String(step.position).padStart(2, "0")}</div>
      <div>
        <div class="title">${escapeHtml(stepLabel(step))}</div>
        <div class="detail">${escapeHtml(step.text)}</div>
      </div>
      <div class="t">${timer}</div>
    </button>
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

type IngredientRowOptions = {
  checked?: boolean;
  multiplier?: number;
  mode?: "plain" | "checklist";
  measurementSystem?: string;
};

function renderIngredientRow(ingredient: IngredientLine, options: IngredientRowOptions = {}): string {
  const checked = options.checked ?? false;
  const multiplier = options.multiplier ?? 1;
  const mode = options.mode ?? "checklist";
  const measurementSystem = options.measurementSystem ?? "original";
  const qty = ingredient.quantity && ingredient.unit ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.quantity ?? "";
  const name = ingredient.item ?? ingredient.raw.replace(String(qty), "").trim();
  return `
    <button class="rr-ing ${mode === "plain" ? "rr-ing--plain" : ""} ${checked ? "is-on" : ""}" ${mode === "checklist" ? `data-action="toggle-mise" data-ing-id="${ingredient.id}"` : ""}>
      <div class="qty">${escapeHtml(formatScaledQuantity(ingredient, multiplier) || "—")}</div>
      <div class="name">${escapeHtml(name || renderIngredient(ingredient, measurementSystem))}</div>
      ${mode === "checklist" ? `<div class="check">${checked ? icon("check", 10) : ""}</div>` : ""}
    </button>
  `;
}

function renderIngredient(ingredient: IngredientLine, measurementSystem: string): string {
  if (measurementSystem === "original") return ingredient.raw;
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
  if (!el) throw new Error(`render-detail: #${id} not found`);
  return el;
}
