import { icon } from "./icons";
import { formatScaledQuantity } from "./ingredient-scale";
import type { IngredientLine, RecipeVersion } from "./types";

export interface ShopRefs {
  /** Shop screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Shopping-list item count badge. */
  count: HTMLElement;
  /** Ingredient list container (plain mode, no checkboxes). */
  list: HTMLElement;
}

export const SHOP_REF_IDS = {
  root: "shop-root",
  count: "shop-count",
  list: "shop-list",
} as const;

const PREP_CTA_HTML = `<div class="rr-padded"><button class="rr-action rr-action-flush" data-action="start-mise">prep ingredients ${icon("chevR", 12)}</button></div>`;

export const SHOP_FRAGMENT = `
<div id="${SHOP_REF_IDS.root}">
  <div class="rr-mise-head">
    <h1>shop once.<br><span>cook calmly.</span></h1>
  </div>
  <div class="rr-mise-rail">
    <div class="rr-section-label"><span>shopping list</span><span id="${SHOP_REF_IDS.count}" class="count"></span></div>
    <div id="${SHOP_REF_IDS.list}" class="rr-content rr-mise-list"></div>
  </div>
</div>
`;

export function shopRefsFromDocument(root: ParentNode = document): ShopRefs {
  return {
    root: byId(root, SHOP_REF_IDS.root),
    count: byId(root, SHOP_REF_IDS.count),
    list: byId(root, SHOP_REF_IDS.list),
  };
}

export function renderShop(refs: ShopRefs, version: RecipeVersion): void {
  refs.count.textContent = `${version.ingredients.length} ITEMS`;
  refs.list.innerHTML = version.ingredients.map((ingredient) => renderIngredientRow(ingredient)).join("") + PREP_CTA_HTML;
}

function renderIngredientRow(ingredient: IngredientLine): string {
  const qty = ingredient.quantity && ingredient.unit ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.quantity ?? "";
  const name = ingredient.item ?? ingredient.raw.replace(String(qty), "").trim();
  return `
    <button class="rr-ing rr-ing--plain">
      <div class="qty">${escapeHtml(formatScaledQuantity(ingredient, 1) || "—")}</div>
      <div class="name">${escapeHtml(name || ingredient.raw)}</div>
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
  if (!el) throw new Error(`render-shop: #${id} not found`);
  return el;
}
