import type { RecipeVersion } from "./types";

export interface EditorRefs {
  /** The form element itself (also the screen root). */
  root: HTMLFormElement;
  /** Recipe title input. */
  titleInput: HTMLInputElement;
  /** Change-summary input (defaults to "adjusted recipe"). */
  changeSummaryInput: HTMLInputElement;
  /** Ingredients textarea (one IngredientLine.raw per line). */
  ingredientsTextarea: HTMLTextAreaElement;
  /** Steps textarea (one InstructionStep.text per line). */
  stepsTextarea: HTMLTextAreaElement;
}

export const EDITOR_REF_IDS = {
  root: "recipe-editor",
  titleInput: "editor-title",
  changeSummaryInput: "editor-change-summary",
  ingredientsTextarea: "editor-ingredients",
  stepsTextarea: "editor-steps",
} as const;

export const EDITOR_FRAGMENT = `
<form id="${EDITOR_REF_IDS.root}" class="rr-editor" data-form="recipe-editor">
  <div class="rr-editor-actions">
    <button class="rr-mini-action" type="button" data-action="cancel-edit">cancel</button>
    <button class="rr-mini-action" type="submit">save version</button>
  </div>
  <label>title<input id="${EDITOR_REF_IDS.titleInput}" name="title"></label>
  <label>change note<input id="${EDITOR_REF_IDS.changeSummaryInput}" name="changeSummary"></label>
  <label>ingredients<textarea id="${EDITOR_REF_IDS.ingredientsTextarea}" name="ingredients" rows="9"></textarea></label>
  <label>steps<textarea id="${EDITOR_REF_IDS.stepsTextarea}" name="steps" rows="9"></textarea></label>
</form>
`;

export function editorRefsFromDocument(root: ParentNode = document): EditorRefs {
  return {
    root: byId(root, EDITOR_REF_IDS.root) as HTMLFormElement,
    titleInput: byId(root, EDITOR_REF_IDS.titleInput) as HTMLInputElement,
    changeSummaryInput: byId(root, EDITOR_REF_IDS.changeSummaryInput) as HTMLInputElement,
    ingredientsTextarea: byId(root, EDITOR_REF_IDS.ingredientsTextarea) as HTMLTextAreaElement,
    stepsTextarea: byId(root, EDITOR_REF_IDS.stepsTextarea) as HTMLTextAreaElement,
  };
}

export function renderEditor(refs: EditorRefs, version: RecipeVersion): void {
  refs.titleInput.value = version.title;
  refs.changeSummaryInput.value = "adjusted recipe";
  refs.ingredientsTextarea.value = version.ingredients.map((item) => item.raw).join("\n");
  refs.stepsTextarea.value = version.steps.map((item) => item.text).join("\n");
}

function byId(root: ParentNode, id: string): HTMLElement {
  const el = root instanceof Document ? root.getElementById(id) : root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`render-editor: #${id} not found`);
  return el;
}
