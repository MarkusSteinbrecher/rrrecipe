import { icon } from "./icons";
import { formatScaledQuantity } from "./ingredient-scale";
import type { IngredientLine, RecipeVersion } from "./types";

export interface MiseRefs {
  /** Mise screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Progress meta row ("X of Y ready", "pct%"). */
  meta: HTMLElement;
  /** Progress bar fill element (sets `style.width`). */
  progressBar: HTMLElement;
  /** Checklist container (grid of ingredient rows + begin-cooking CTA). */
  list: HTMLElement;
}

export const MISE_REF_IDS = {
  root: "mise-root",
  meta: "mise-meta",
  progressBar: "mise-progress-bar",
  list: "mise-list",
} as const;

const COOK_CTA_HTML = `<div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-cooking">begin cooking ${icon("chevR", 12)}</button></div>`;

export const MISE_FRAGMENT = `
<div id="${MISE_REF_IDS.root}">
  <div class="rr-mise-head">
    <h1>set yourself up.<br><span>then cook.</span></h1>
  </div>
  <div class="rr-mise-rail">
    <div id="${MISE_REF_IDS.meta}" class="rr-mise-meta"></div>
    <div class="rr-progress"><i id="${MISE_REF_IDS.progressBar}"></i></div>
    <div id="${MISE_REF_IDS.list}" class="rr-content rr-mise-list"></div>
  </div>
</div>
`;

export function miseRefsFromDocument(root: ParentNode = document): MiseRefs {
  return {
    root: byId(root, MISE_REF_IDS.root),
    meta: byId(root, MISE_REF_IDS.meta),
    progressBar: byId(root, MISE_REF_IDS.progressBar),
    list: byId(root, MISE_REF_IDS.list),
  };
}

export function renderMise(refs: MiseRefs, version: RecipeVersion, miseCheckedIds: ReadonlySet<string>): void {
  const total = version.ingredients.length;
  const checked = miseCheckedIds.size;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  refs.meta.innerHTML = `<span>${checked} of ${total} ready</span><span>${pct}%</span>`;
  refs.progressBar.style.width = `${pct}%`;
  refs.list.innerHTML =
    version.ingredients.map((ingredient) => renderChecklistRow(ingredient, miseCheckedIds.has(ingredient.id))).join("") +
    COOK_CTA_HTML;
}

function renderChecklistRow(ingredient: IngredientLine, checked: boolean): string {
  const qty = ingredient.quantity && ingredient.unit ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.quantity ?? "";
  const name = ingredient.item ?? ingredient.raw.replace(String(qty), "").trim();
  return `
    <button class="rr-ing ${checked ? "is-on" : ""}" data-action="toggle-mise" data-ing-id="${ingredient.id}">
      <div class="qty">${escapeHtml(formatScaledQuantity(ingredient, 1) || "—")}</div>
      <div class="name">${escapeHtml(name || ingredient.raw)}</div>
      <div class="check">${checked ? icon("check", 10) : ""}</div>
    </button>
  `;
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
  if (!el) throw new Error(`render-mise: #${id} not found`);
  return el;
}
