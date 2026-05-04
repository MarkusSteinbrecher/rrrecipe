import "./style.css";
import { formatMinutes, formatTimer, formatTimestamp, speakStep, textareaLines, uid, youtubeTimestampUrl } from "./format";
import { loadSnapshot, resetSnapshot, saveSnapshot } from "./storage";
import type { AppSnapshot, IngredientLine, InstructionStep, Recipe, RecipeVersion, Source } from "./types";

type Screen = "library" | "detail" | "edit" | "cook";

type UiState = {
  snapshot?: AppSnapshot;
  screen: Screen;
  selectedRecipeId?: string;
  selectedVersionId?: string;
  cookStepIndex: number;
};

const state: UiState = {
  screen: "library",
  cookStepIndex: 0,
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");
const appEl = app;

void boot();

async function boot(): Promise<void> {
  state.snapshot = await loadSnapshot();
  render();
}

function currentRecipe(): Recipe | undefined {
  return state.snapshot?.recipes.find((recipe) => recipe.id === state.selectedRecipeId);
}

function versionFor(recipe: Recipe): RecipeVersion | undefined {
  const versionId = state.selectedVersionId ?? recipe.currentVersionId;
  return state.snapshot?.versions.find((version) => version.id === versionId);
}

function sourceById(id: string): Source | undefined {
  return state.snapshot?.sources.find((source) => source.id === id);
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

function render(): void {
  const snapshot = state.snapshot;
  if (!snapshot) {
    appEl.innerHTML = `<main class="shell"><p>Loading...</p></main>`;
    return;
  }

  appEl.innerHTML = `
    <header class="topbar">
      <button class="brand" data-action="go-library" aria-label="Open recipe library">rrrecipe</button>
      <div class="topbar-actions">
        <label class="select-label">
          Units
          <select data-action="measurement">
            ${["original", "metric", "us", "hybrid"]
              .map((mode) => `<option value="${mode}" ${snapshot.settings.measurementSystem === mode ? "selected" : ""}>${mode}</option>`)
              .join("")}
          </select>
        </label>
      </div>
    </header>
    ${renderScreen(snapshot)}
  `;

  bindEvents();
}

function renderScreen(snapshot: AppSnapshot): string {
  if (state.screen === "library") return renderLibrary(snapshot);
  if (state.screen === "edit") return renderEditor();
  if (state.screen === "cook") return renderCookingMode();
  return renderDetail();
}

function renderLibrary(snapshot: AppSnapshot): string {
  const recipes = snapshot.recipes
    .map((recipe) => {
      const version = snapshot.versions.find((item) => item.id === recipe.currentVersionId);
      if (!version) return "";
      return `
        <article class="recipe-row">
          <div>
            <p class="eyebrow">${version.tags.map(escapeHtml).join(" / ") || "Recipe"}</p>
            <h2>${escapeHtml(version.title)}</h2>
            <p>${escapeHtml(version.subtitle ?? version.description ?? "No description yet.")}</p>
          </div>
          <button class="icon-button" data-action="open-recipe" data-recipe-id="${recipe.id}" aria-label="Open ${escapeHtml(version.title)}">-></button>
        </article>
      `;
    })
    .join("");

  return `
    <main class="shell">
      <section class="intro">
        <div>
          <p class="eyebrow">Private-first recipe library</p>
          <h1>Cook from saved recipes, versions, and video steps.</h1>
        </div>
        <button data-action="reset-demo">Reset demo data</button>
      </section>
      <section class="recipe-list" aria-label="Recipes">
        ${recipes}
      </section>
    </main>
  `;
}

function renderDetail(): string {
  const recipe = currentRecipe();
  if (!recipe) return renderMissing();
  const snapshot = state.snapshot;
  const version = versionFor(recipe);
  if (!snapshot || !version) return renderMissing();

  const source = version.sourceIds.map(sourceById).find(Boolean);
  const versions = snapshot.versions
    .filter((item) => item.recipeId === recipe.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return `
    <main class="shell detail-grid">
      <section class="recipe-main">
        <p class="eyebrow">${escapeHtml(version.origin)} / ${escapeHtml(version.language)}</p>
        <h1>${escapeHtml(version.title)}</h1>
        <p class="lede">${escapeHtml(version.description ?? version.subtitle ?? "")}</p>
        <div class="toolbar">
          <button data-action="edit-recipe">Edit</button>
          <button data-action="start-cooking">Cook</button>
          ${source?.url ? `<a class="button-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Video</a>` : ""}
        </div>

        <div class="facts">
          <span>Yield: ${escapeHtml(version.yield?.raw ?? "Not set")}</span>
          <span>Total: ${formatMinutes(version.times?.totalMinutes)}</span>
          <span>Versions: ${versions.length}</span>
        </div>

        <section>
          <h2>Ingredients</h2>
          <ul class="ingredients">
            ${version.ingredients.map((ingredient) => `<li>${escapeHtml(renderIngredient(ingredient))}</li>`).join("")}
          </ul>
        </section>

        <section>
          <h2>Steps</h2>
          <ol class="steps">
            ${version.steps.map(renderStep).join("")}
          </ol>
        </section>
      </section>

      <aside class="side-panel">
        <h2>History</h2>
        <div class="version-list">
          ${versions
            .map(
              (item) => `
                <button class="version-item ${item.id === version.id ? "active" : ""}" data-action="select-version" data-version-id="${item.id}">
                  <span>${escapeHtml(item.changeSummary ?? item.origin)}</span>
                  <small>${new Date(item.createdAt).toLocaleString()}</small>
                </button>
              `,
            )
            .join("")}
        </div>
      </aside>
    </main>
  `;
}

function renderIngredient(ingredient: IngredientLine): string {
  const system = state.snapshot?.settings.measurementSystem ?? "original";
  if (system === "original") return ingredient.raw;
  if (ingredient.conversion?.canonicalGrams) {
    return `${ingredient.raw} (${ingredient.conversion.canonicalGrams} g)`;
  }
  if (ingredient.conversion?.canonicalMilliliters) {
    return `${ingredient.raw} (${ingredient.conversion.canonicalMilliliters} ml)`;
  }
  return ingredient.raw;
}

function renderStep(step: InstructionStep): string {
  const anchor = step.mediaAnchors?.[0];
  const source = anchor ? sourceById(anchor.sourceId) : undefined;
  const url = anchor && source ? youtubeTimestampUrl(source, anchor.startSeconds) : undefined;

  return `
    <li>
      <p>${escapeHtml(step.text)}</p>
      <div class="step-actions">
        ${step.timerSeconds ? `<span>${formatTimer(step.timerSeconds)}</span>` : ""}
        ${url && anchor ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Video ${formatTimestamp(anchor.startSeconds)}</a>` : ""}
      </div>
    </li>
  `;
}

function renderEditor(): string {
  const recipe = currentRecipe();
  if (!recipe) return renderMissing();
  const version = versionFor(recipe);
  if (!version) return renderMissing();

  return `
    <main class="shell editor">
      <form data-form="recipe-editor">
        <div class="editor-header">
          <div>
            <p class="eyebrow">Editing from ${escapeHtml(version.changeSummary ?? "current version")}</p>
            <h1>Save a new version</h1>
          </div>
          <div class="toolbar">
            <button type="button" data-action="cancel-edit">Cancel</button>
            <button type="submit">Save version</button>
          </div>
        </div>
        <label>
          Title
          <input name="title" value="${escapeHtml(version.title)}" />
        </label>
        <label>
          Change note
          <input name="changeSummary" value="Adjusted recipe" />
        </label>
        <label>
          Ingredients
          <textarea name="ingredients" rows="10">${escapeHtml(version.ingredients.map((item) => item.raw).join("\n"))}</textarea>
        </label>
        <label>
          Steps
          <textarea name="steps" rows="10">${escapeHtml(version.steps.map((item) => item.text).join("\n"))}</textarea>
        </label>
      </form>
    </main>
  `;
}

function renderCookingMode(): string {
  const recipe = currentRecipe();
  if (!recipe) return renderMissing();
  const version = versionFor(recipe);
  if (!version) return renderMissing();
  const index = Math.min(state.cookStepIndex, version.steps.length - 1);
  const step = version.steps[index];
  const anchor = step.mediaAnchors?.[0];
  const source = anchor ? sourceById(anchor.sourceId) : undefined;
  const url = anchor && source ? youtubeTimestampUrl(source, anchor.startSeconds) : undefined;

  return `
    <main class="cook-shell">
      <section class="cook-step">
        <p class="eyebrow">Step ${index + 1} of ${version.steps.length}</p>
        <h1>${escapeHtml(step.text)}</h1>
        <div class="cook-meta">
          ${step.timerSeconds ? `<span>Timer ${formatTimer(step.timerSeconds)}</span>` : ""}
          ${url && anchor ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Video ${formatTimestamp(anchor.startSeconds)}</a>` : ""}
        </div>
        <div class="cook-controls">
          <button data-action="cook-prev" aria-label="Previous step"><-</button>
          <button data-action="cook-repeat">Repeat</button>
          <button data-action="cook-next" aria-label="Next step">-></button>
        </div>
        <button class="secondary" data-action="exit-cooking">Exit cooking mode</button>
      </section>
    </main>
  `;
}

function renderMissing(): string {
  return `
    <main class="shell">
      <p>Recipe not found.</p>
      <button data-action="go-library">Back to library</button>
    </main>
  `;
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
    element.addEventListener("change", handleAction);
  });

  const form = document.querySelector<HTMLFormElement>("[data-form='recipe-editor']");
  form?.addEventListener("submit", handleEditorSubmit);
}

async function handleAction(event: Event): Promise<void> {
  const target = event.currentTarget as HTMLElement;
  const action = target.dataset.action;

  if (action === "measurement" && target instanceof HTMLSelectElement && state.snapshot) {
    state.snapshot.settings.measurementSystem = target.value as AppSnapshot["settings"]["measurementSystem"];
    await saveSnapshot(state.snapshot);
    render();
    return;
  }

  if (action === "go-library") {
    state.screen = "library";
    state.selectedRecipeId = undefined;
    state.selectedVersionId = undefined;
  }

  if (action === "open-recipe") {
    state.selectedRecipeId = target.dataset.recipeId;
    state.selectedVersionId = undefined;
    state.screen = "detail";
  }

  if (action === "edit-recipe") {
    state.screen = "edit";
  }

  if (action === "cancel-edit") {
    state.screen = "detail";
  }

  if (action === "start-cooking") {
    state.screen = "cook";
    state.cookStepIndex = 0;
  }

  if (action === "exit-cooking") {
    state.screen = "detail";
  }

  if (action === "cook-prev") {
    state.cookStepIndex = Math.max(0, state.cookStepIndex - 1);
  }

  if (action === "cook-next") {
    const version = currentRecipe() ? versionFor(currentRecipe() as Recipe) : undefined;
    state.cookStepIndex = Math.min((version?.steps.length ?? 1) - 1, state.cookStepIndex + 1);
  }

  if (action === "cook-repeat") {
    const recipe = currentRecipe();
    const version = recipe ? versionFor(recipe) : undefined;
    const step = version?.steps[state.cookStepIndex];
    if (step) speakStep(step);
  }

  if (action === "select-version") {
    state.selectedVersionId = target.dataset.versionId;
  }

  if (action === "reset-demo") {
    state.snapshot = await resetSnapshot();
    state.screen = "library";
    state.selectedRecipeId = undefined;
    state.selectedVersionId = undefined;
  }

  render();
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
  const changeSummary = String(formData.get("changeSummary") ?? "Manual edit").trim();
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
    changeSummary: changeSummary || "Manual edit",
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
