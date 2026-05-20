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
  /** Right-side body containing the read-only candidate details. */
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
  refs.title.textContent = candidate.title.toLowerCase();
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
    ${renderHeaderBlock(candidate)}
    ${renderIngredientsBlock(candidate.ingredients)}
    ${renderStepsBlock(candidate.steps)}
    ${renderNotesBlock(candidate.notes)}
    ${renderTagsBlock(candidate.tags)}
  `;
}

function renderHeaderBlock(candidate: RecipeCandidate): string {
  const yieldLine = candidate.yield?.raw?.trim();
  const times = candidate.times;
  const timeParts: string[] = [];
  if (times?.prepMinutes) timeParts.push(`prep ${times.prepMinutes} min`);
  if (times?.cookMinutes) timeParts.push(`cook ${times.cookMinutes} min`);
  if (times?.totalMinutes) timeParts.push(`total ${times.totalMinutes} min`);
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>about</span></div>
      ${candidate.description ? `<p class="rr-import-review-description">${escapeHtml(truncateDescription(candidate.description))}</p>` : ""}
      <dl class="rr-import-review-meta">
        ${yieldLine ? `<div><dt>yield</dt><dd>${escapeHtml(yieldLine)}</dd></div>` : ""}
        ${timeParts.length ? `<div><dt>times</dt><dd>${escapeHtml(timeParts.join(" · "))}</dd></div>` : ""}
        <div><dt>language</dt><dd>${escapeHtml(candidate.language)}</dd></div>
      </dl>
    </section>
  `;
}

function renderIngredientsBlock(ingredients: IngredientLine[]): string {
  if (!ingredients.length) {
    return `
      <section class="rr-import-review-section">
        <div class="rr-section-label"><span>ingredients</span><span class="count">0</span></div>
        <p class="rr-import-review-empty">No ingredients extracted yet.</p>
      </section>
    `;
  }
  const grouped = groupBySection(ingredients);
  const blocks = grouped.map(({ section, items }) => `
    ${section ? `<h3 class="rr-import-review-subhead">${escapeHtml(section)}</h3>` : ""}
    <ul class="rr-import-review-ingredients">
      ${items.map((line) => `
        <li class="${line.optional ? "is-optional" : ""}">
          <span class="rr-import-review-ingredient-raw">${escapeHtml(line.raw || `${line.quantity ?? ""} ${line.unit ?? ""} ${line.item ?? ""}`.trim())}</span>
          ${line.optional ? `<span class="rr-import-review-ingredient-flag">optional</span>` : ""}
        </li>
      `).join("")}
    </ul>
  `).join("");
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>ingredients</span><span class="count">${ingredients.length}</span></div>
      ${blocks}
    </section>
  `;
}

function renderStepsBlock(steps: InstructionStep[]): string {
  if (!steps.length) {
    return `
      <section class="rr-import-review-section">
        <div class="rr-section-label"><span>steps</span><span class="count">0</span></div>
        <p class="rr-import-review-empty">No steps extracted yet.</p>
      </section>
    `;
  }
  const grouped = groupBySection(steps);
  const blocks = grouped.map(({ section, items }) => `
    ${section ? `<h3 class="rr-import-review-subhead">${escapeHtml(section)}</h3>` : ""}
    <ol class="rr-import-review-steps">
      ${items.map((step) => `
        <li>
          <div class="rr-import-review-step-text">${escapeHtml(step.text)}</div>
          ${renderStepMeta(step)}
        </li>
      `).join("")}
    </ol>
  `).join("");
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>steps</span><span class="count">${steps.length}</span></div>
      ${blocks}
    </section>
  `;
}

function renderStepMeta(step: InstructionStep): string {
  const bits: string[] = [];
  if (step.timerSeconds) bits.push(`timer ${formatMinutesShort(step.timerSeconds)}`);
  if (step.temperature) bits.push(`temp ${escapeHtml(step.temperature.raw)}`);
  if (step.mediaAnchors?.length) bits.push(`${step.mediaAnchors.length} anchor${step.mediaAnchors.length === 1 ? "" : "s"}`);
  if (!bits.length) return "";
  return `<div class="rr-import-review-step-meta">${bits.join(" · ")}</div>`;
}

function renderNotesBlock(notes: string[]): string {
  if (!notes.length) return "";
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>notes</span><span class="count">${notes.length}</span></div>
      <ul class="rr-import-review-notes">
        ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderTagsBlock(tags: string[]): string {
  if (!tags.length) return "";
  return `
    <section class="rr-import-review-section">
      <div class="rr-section-label"><span>tags</span></div>
      <div class="rr-import-review-tags">
        ${tags.map((tag) => `<span class="rr-chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </section>
  `;
}

type Sectioned<T extends { section?: string }> = { section: string | undefined; items: T[] };

function groupBySection<T extends { section?: string }>(items: T[]): Sectioned<T>[] {
  const groups: Sectioned<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }
  return groups;
}

function formatMinutesShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

function truncateDescription(text: string): string {
  const max = 600;
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
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
  if (!el) throw new Error(`render-import-review: #${id} not found`);
  return el;
}
