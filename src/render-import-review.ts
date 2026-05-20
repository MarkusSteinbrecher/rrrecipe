import { icon } from "./icons";
import type { IngredientLine, InstructionStep, RecipeCandidate } from "./types";

export interface ImportReviewRefs {
  /** Review screen root for scoped lookups and smoke assertions. */
  root: HTMLElement;
  /** Back-to-import button. */
  back: HTMLButtonElement;
  /** Title strip showing the candidate name. */
  title: HTMLElement;
  /** Source kicker (channel + retrieval timestamp). */
  source: HTMLElement;
  /** Confidence badge row. */
  confidence: HTMLElement;
  /** Warning list container (hidden when no warnings). */
  warnings: HTMLElement;
  /** YouTube embed iframe container — the iframe is replaced on each render. */
  videoFrame: HTMLElement;
  /** Right-side body containing the editable candidate form. */
  body: HTMLElement;
}

export const IMPORT_REVIEW_REF_IDS = {
  root: "import-review-root",
  back: "import-review-back",
  title: "import-review-title",
  source: "import-review-source",
  confidence: "import-review-confidence",
  warnings: "import-review-warnings",
  videoFrame: "import-review-video",
  body: "import-review-body",
} as const;

export const IMPORT_REVIEW_FRAGMENT = `
<main id="${IMPORT_REVIEW_REF_IDS.root}" class="rr-import-review-shell">
  <header class="rr-import-review-head">
    <button id="${IMPORT_REVIEW_REF_IDS.back}" class="rr-mini-action" data-action="close-import-review">${icon("chevR", 12)} back to import</button>
    <div class="rr-import-review-head-titles">
      <h1 id="${IMPORT_REVIEW_REF_IDS.title}"></h1>
      <p id="${IMPORT_REVIEW_REF_IDS.source}" class="rr-import-review-source"></p>
    </div>
    <div id="${IMPORT_REVIEW_REF_IDS.confidence}" class="rr-confidence rr-import-review-confidence"></div>
  </header>
  <p id="${IMPORT_REVIEW_REF_IDS.warnings}" class="rr-import-review-warnings" hidden></p>
  <section class="rr-import-review-grid">
    <div id="${IMPORT_REVIEW_REF_IDS.videoFrame}" class="rr-import-review-video"></div>
    <div id="${IMPORT_REVIEW_REF_IDS.body}" class="rr-import-review-body"></div>
  </section>
</main>
`;

export function importReviewRefsFromDocument(root: ParentNode = document): ImportReviewRefs {
  return {
    root: byId(root, IMPORT_REVIEW_REF_IDS.root),
    back: byId(root, IMPORT_REVIEW_REF_IDS.back) as HTMLButtonElement,
    title: byId(root, IMPORT_REVIEW_REF_IDS.title),
    source: byId(root, IMPORT_REVIEW_REF_IDS.source),
    confidence: byId(root, IMPORT_REVIEW_REF_IDS.confidence),
    warnings: byId(root, IMPORT_REVIEW_REF_IDS.warnings),
    videoFrame: byId(root, IMPORT_REVIEW_REF_IDS.videoFrame),
    body: byId(root, IMPORT_REVIEW_REF_IDS.body),
  };
}

export function renderImportReview(refs: ImportReviewRefs, candidate: RecipeCandidate): void {
  refs.title.textContent = candidate.title.toLowerCase() || "untitled recipe";
  refs.source.textContent = buildSourceLine(candidate);
  refs.confidence.innerHTML = renderConfidenceBadges(candidate);
  renderWarnings(refs.warnings, candidate.warnings);
  renderVideoFrame(refs.videoFrame, candidate);
  refs.body.innerHTML = renderCandidateBody(candidate);
}

function buildSourceLine(candidate: RecipeCandidate): string {
  const channel = candidate.source.media?.channelTitle ?? candidate.source.author;
  const sourceType = candidate.source.type.toUpperCase();
  const parts = [sourceType, channel, candidate.source.title].filter(Boolean);
  return parts.join(" · ");
}

function renderConfidenceBadges(candidate: RecipeCandidate): string {
  return `
    <span>overall ${Math.round(candidate.confidence.overall * 100)}%</span>
    <span>source ${Math.round(candidate.confidence.source * 100)}%</span>
    <span>ingredients ${Math.round(candidate.confidence.ingredients * 100)}%</span>
    <span>steps ${Math.round(candidate.confidence.steps * 100)}%</span>
  `;
}

function renderWarnings(container: HTMLElement, warnings: string[]): void {
  if (!warnings.length) {
    container.hidden = true;
    container.textContent = "";
    return;
  }
  container.hidden = false;
  container.innerHTML = `<strong>review carefully:</strong> ${warnings.map(escapeHtml).join(" · ")}`;
}

function renderVideoFrame(container: HTMLElement, candidate: RecipeCandidate): void {
  const videoId = candidate.source.media?.videoId;
  if (!videoId) {
    container.innerHTML = `<p class="rr-import-review-novideo">No embedded video for this source.</p>`;
    return;
  }
  // youtube-nocookie matches the privacy-first stance — see #38 open question 1.
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`;
  container.innerHTML = `
    <iframe
      title="${escapeHtml(candidate.title)}"
      src="${src}"
      frameborder="0"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  `;
}

function renderCandidateBody(candidate: RecipeCandidate): string {
  return `
    ${renderHeaderEditor(candidate)}
    ${renderIngredientsEditor(candidate.ingredients)}
    ${renderStepsEditor(candidate.steps)}
    ${renderNotesEditor(candidate.notes)}
    ${renderTagsEditor(candidate.tags)}
    ${renderSaveBar()}
  `;
}

function renderHeaderEditor(candidate: RecipeCandidate): string {
  const times = candidate.times ?? {};
  const yieldData = candidate.yield ?? { raw: "" };
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>about</span></div>
      <label class="rr-import-review-field">
        <span class="rr-import-review-field-label">title</span>
        <input type="text" class="rr-import-review-input" data-action="edit-candidate-title" value="${escapeAttr(candidate.title)}" placeholder="recipe title">
      </label>
      <label class="rr-import-review-field">
        <span class="rr-import-review-field-label">description</span>
        <textarea class="rr-import-review-textarea" data-action="edit-candidate-description" rows="4" placeholder="one to three sentences">${escapeHtml(candidate.description ?? "")}</textarea>
      </label>
      <div class="rr-import-review-row-three">
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">yield (raw)</span>
          <input type="text" class="rr-import-review-input" data-action="edit-candidate-yield-raw" value="${escapeAttr(yieldData.raw ?? "")}" placeholder="4 servings">
        </label>
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">qty</span>
          <input type="number" min="0" step="0.5" class="rr-import-review-input" data-action="edit-candidate-yield-quantity" value="${yieldData.quantity ?? ""}">
        </label>
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">unit</span>
          <input type="text" class="rr-import-review-input" data-action="edit-candidate-yield-unit" value="${escapeAttr(yieldData.unit ?? "")}" placeholder="servings">
        </label>
      </div>
      <div class="rr-import-review-row-three">
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">prep (min)</span>
          <input type="number" min="0" class="rr-import-review-input" data-action="edit-candidate-time" data-time-field="prep" value="${times.prepMinutes ?? ""}">
        </label>
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">cook (min)</span>
          <input type="number" min="0" class="rr-import-review-input" data-action="edit-candidate-time" data-time-field="cook" value="${times.cookMinutes ?? ""}">
        </label>
        <label class="rr-import-review-field">
          <span class="rr-import-review-field-label">total (min)</span>
          <input type="number" min="0" class="rr-import-review-input" data-action="edit-candidate-time" data-time-field="total" value="${times.totalMinutes ?? ""}">
        </label>
      </div>
      <label class="rr-import-review-field rr-import-review-field-narrow">
        <span class="rr-import-review-field-label">language</span>
        <input type="text" class="rr-import-review-input" data-action="edit-candidate-language" value="${escapeAttr(candidate.language)}" placeholder="en">
      </label>
    </section>
  `;
}

function renderIngredientsEditor(ingredients: IngredientLine[]): string {
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label">
        <span>ingredients</span>
        <span class="count">${ingredients.length}</span>
      </div>
      <ul class="rr-import-review-edit-list">
        ${ingredients.map((line, index) => renderIngredientEditorRow(line, index, ingredients.length)).join("")}
      </ul>
      <div class="rr-import-review-add-row">
        <button class="rr-mini-action" data-action="add-ingredient">+ add ingredient</button>
        <button class="rr-mini-action" data-action="add-ingredient-section">+ add section header</button>
      </div>
    </section>
  `;
}

function renderIngredientEditorRow(line: IngredientLine, index: number, total: number): string {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return `
    <li class="rr-import-review-edit-row" data-ingredient-id="${escapeAttr(line.id)}">
      <div class="rr-import-review-edit-controls">
        <button class="rr-icon-btn" data-action="move-ingredient-up" data-ingredient-id="${escapeAttr(line.id)}" aria-label="move up" ${isFirst ? "disabled" : ""}>${icon("chevR", 10)}</button>
        <button class="rr-icon-btn" data-action="move-ingredient-down" data-ingredient-id="${escapeAttr(line.id)}" aria-label="move down" ${isLast ? "disabled" : ""}>${icon("chevR", 10)}</button>
      </div>
      <div class="rr-import-review-edit-fields">
        <input type="text" class="rr-import-review-input" data-action="edit-ingredient-section" data-ingredient-id="${escapeAttr(line.id)}" value="${escapeAttr(line.section ?? "")}" placeholder="section (optional)">
        <input type="text" class="rr-import-review-input rr-import-review-input-mono" data-action="edit-ingredient-raw" data-ingredient-id="${escapeAttr(line.id)}" value="${escapeAttr(line.raw)}" placeholder="500 g bread flour">
        <label class="rr-import-review-checkbox">
          <input type="checkbox" data-action="toggle-ingredient-optional" data-ingredient-id="${escapeAttr(line.id)}" ${line.optional ? "checked" : ""}>
          <span>optional</span>
        </label>
      </div>
      <button class="rr-icon-btn rr-icon-btn-remove" data-action="remove-ingredient" data-ingredient-id="${escapeAttr(line.id)}" aria-label="remove ingredient">${icon("close", 12)}</button>
    </li>
  `;
}

function renderStepsEditor(steps: InstructionStep[]): string {
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label">
        <span>steps</span>
        <span class="count">${steps.length}</span>
      </div>
      <ol class="rr-import-review-edit-list">
        ${steps.map((step, index) => renderStepEditorRow(step, index, steps.length)).join("")}
      </ol>
      <div class="rr-import-review-add-row">
        <button class="rr-mini-action" data-action="add-step">+ add step</button>
      </div>
    </section>
  `;
}

function renderStepEditorRow(step: InstructionStep, index: number, total: number): string {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return `
    <li class="rr-import-review-edit-row rr-import-review-edit-row-step" data-step-id="${escapeAttr(step.id)}">
      <div class="rr-import-review-edit-controls">
        <span class="rr-import-review-step-number">${String(index + 1).padStart(2, "0")}</span>
        <button class="rr-icon-btn" data-action="move-step-up" data-step-id="${escapeAttr(step.id)}" aria-label="move up" ${isFirst ? "disabled" : ""}>${icon("chevR", 10)}</button>
        <button class="rr-icon-btn" data-action="move-step-down" data-step-id="${escapeAttr(step.id)}" aria-label="move down" ${isLast ? "disabled" : ""}>${icon("chevR", 10)}</button>
      </div>
      <div class="rr-import-review-edit-fields">
        <input type="text" class="rr-import-review-input" data-action="edit-step-section" data-step-id="${escapeAttr(step.id)}" value="${escapeAttr(step.section ?? "")}" placeholder="section (optional)">
        <textarea class="rr-import-review-textarea" data-action="edit-step-text" data-step-id="${escapeAttr(step.id)}" rows="3" placeholder="describe one hands-on action with a real result cue">${escapeHtml(step.text)}</textarea>
        <div class="rr-import-review-step-meta-row">
          <label class="rr-import-review-field rr-import-review-field-inline">
            <span class="rr-import-review-field-label">timer (s)</span>
            <input type="number" min="0" class="rr-import-review-input" data-action="edit-step-timer" data-step-id="${escapeAttr(step.id)}" value="${step.timerSeconds ?? ""}" placeholder="0">
          </label>
          <label class="rr-import-review-field rr-import-review-field-inline">
            <span class="rr-import-review-field-label">temp</span>
            <input type="number" class="rr-import-review-input" data-action="edit-step-temp-value" data-step-id="${escapeAttr(step.id)}" value="${step.temperature?.value ?? ""}" placeholder="0">
          </label>
          <label class="rr-import-review-field rr-import-review-field-inline">
            <span class="rr-import-review-field-label">unit</span>
            <select class="rr-import-review-input" data-action="edit-step-temp-unit" data-step-id="${escapeAttr(step.id)}">
              <option value="">—</option>
              <option value="c" ${step.temperature?.unit === "c" ? "selected" : ""}>C</option>
              <option value="f" ${step.temperature?.unit === "f" ? "selected" : ""}>F</option>
            </select>
          </label>
        </div>
        ${renderStepAnchors(step)}
      </div>
      <button class="rr-icon-btn rr-icon-btn-remove" data-action="remove-step" data-step-id="${escapeAttr(step.id)}" aria-label="remove step">${icon("close", 12)}</button>
    </li>
  `;
}

function renderStepAnchors(step: InstructionStep): string {
  const anchors = step.mediaAnchors ?? [];
  const chips = anchors.map((anchor, anchorIndex) => `
    <span class="rr-import-review-anchor-chip">
      ${formatAnchor(anchor.startSeconds)}
      <button class="rr-icon-btn rr-icon-btn-tiny" data-action="remove-step-anchor" data-step-id="${escapeAttr(step.id)}" data-anchor-index="${anchorIndex}" aria-label="remove anchor">${icon("close", 9)}</button>
    </span>
  `).join("");
  return `
    <div class="rr-import-review-anchor-row">
      <span class="rr-import-review-field-label">video anchors</span>
      <div class="rr-import-review-anchor-chips">
        ${chips || `<span class="rr-import-review-anchor-empty">—</span>`}
      </div>
      <div class="rr-import-review-anchor-add">
        <input type="text" class="rr-import-review-input rr-import-review-input-mono" data-step-anchor-input data-step-id="${escapeAttr(step.id)}" placeholder="mm:ss or seconds" aria-label="anchor timestamp">
        <button class="rr-mini-action" data-action="add-step-anchor" data-step-id="${escapeAttr(step.id)}">add</button>
      </div>
    </div>
  `;
}

function renderNotesEditor(notes: string[]): string {
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label">
        <span>notes</span>
        <span class="count">${notes.length}</span>
      </div>
      <ul class="rr-import-review-edit-list">
        ${notes.map((note, index) => `
          <li class="rr-import-review-edit-row" data-note-index="${index}">
            <div class="rr-import-review-edit-fields">
              <textarea class="rr-import-review-textarea" data-action="edit-note" data-note-index="${index}" rows="2" placeholder="failure mode, variation, or storage hint">${escapeHtml(note)}</textarea>
            </div>
            <button class="rr-icon-btn rr-icon-btn-remove" data-action="remove-note" data-note-index="${index}" aria-label="remove note">${icon("close", 12)}</button>
          </li>
        `).join("")}
      </ul>
      <div class="rr-import-review-add-row">
        <button class="rr-mini-action" data-action="add-note">+ add note</button>
      </div>
    </section>
  `;
}

function renderTagsEditor(tags: string[]): string {
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label">
        <span>tags</span>
        <span class="count">${tags.length}</span>
      </div>
      <div class="rr-import-review-tags-edit">
        ${tags.map((tag) => `
          <span class="rr-chip rr-import-review-tag-chip">
            ${escapeHtml(tag)}
            <button class="rr-icon-btn rr-icon-btn-tiny" data-action="remove-tag" data-tag="${escapeAttr(tag)}" aria-label="remove tag">${icon("close", 9)}</button>
          </span>
        `).join("")}
      </div>
      <div class="rr-import-review-anchor-add">
        <input type="text" class="rr-import-review-input" data-new-tag-input placeholder="new tag" aria-label="new tag">
        <button class="rr-mini-action" data-action="add-tag">add</button>
      </div>
    </section>
  `;
}

function renderSaveBar(): string {
  return `
    <section class="rr-import-review-save-bar">
      <button class="rr-mini-action" data-action="close-import-review">discard</button>
      <button class="rr-action rr-action-flush" data-action="save-import-review" disabled aria-disabled="true">save recipe (phase D)</button>
    </section>
  `;
}

function formatAnchor(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
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

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function byId(root: ParentNode, id: string): HTMLElement {
  const el = root instanceof Document ? root.getElementById(id) : root.querySelector<HTMLElement>(`#${id}`);
  if (!el) throw new Error(`render-import-review: #${id} not found`);
  return el;
}

/** Parse an anchor input — accepts "1:23", "83", "1:23.4" — returns seconds or undefined. */
export function parseAnchorInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((p) => Number(p.trim()));
    if (parts.some((part) => !Number.isFinite(part))) return undefined;
    let seconds = 0;
    for (const part of parts) seconds = seconds * 60 + part;
    return seconds >= 0 ? seconds : undefined;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}
