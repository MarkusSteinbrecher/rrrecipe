# Handoff: Recipe Cooking App

## Overview

A mobile recipe app whose core promise is **hands-free cooking mode**: you can advance through a recipe without touching the screen with greasy hands. The flow goes Browse → Recipe → Mise en place → Cook → Timers, with the cook screen being the centerpiece.

The visual direction is monochrome and typographic — near-black canvas, hairline rules, IBM Plex (Sans + Mono), a single yellow `#ffff00` accent, and lowercase prose. Striped placeholder frames stand in where real food photography belongs.

## About the design files

The files in `design_files/` are **design references created in HTML/React-via-Babel** — prototypes showing intended look and behavior, not production code to copy directly. The job is to **recreate these designs in your target codebase's environment** (React Native, SwiftUI, Compose, web React, etc.) using its established patterns, navigation primitives, design tokens, and component library.

If no codebase exists yet, choose the framework that best matches the deployment target (this is a phone-first product — React Native or native iOS/Android are the natural picks) and implement against it.

## Fidelity

**High-fidelity.** Final colors, type scale, spacing, layout, and interaction model are settled. Treat hex values, font sizes, and spacing as canonical. The yellow accent is meant to be loud and singular — don't dilute with secondary accents.

## Screens

The app has 5 screens, plus a top tab bar in the prototype that lets you jump between them (the tab bar is **prototype-only navigation chrome** — drop it; the real app uses normal stack/tab navigation).

### 1. Browse (`screens-browse.jsx` → `ScreenBrowse`)

**Purpose.** Recipe library. User lands here, scans tonight's pick, browses or searches.

**Layout (top → bottom):**
- **Top bar** (sticky): wordmark "mise · recipes" left (Plex Mono 13px, lowercase, with a 6px yellow dot prefix), `+` icon button right (28px circle, 1px hairline border).
- **Search field**: full-width pill, dark fill `#131313`, hairline border, mono 13px, search icon left-inset.
- **Filter chip row**: horizontal-scrolling chips (`all`, `quick`, `brunch`, `dinner`, `baking`). Active chip is yellow fill on black ink; inactive is dark fill with hairline border. Lowercase.
- **Hero frame**: full-width banner, ~220px tall. Dark fill, diagonal stripe pattern overlay (see "Striped hero frame" below). Top-left mono caps eyebrow ("tonight's pick"), top-right mono caps code ("01 / 06"), bottom-left large headline in Plex Sans with a yellow accent fragment ("shakshuka, **35 min**" — the time fragment is yellow).
- **Section header**: row with "library" left and "7 RECIPES" right (mono caps, ink-3 color).
- **Recipe rows**: each row is a 56px-ish horizontal card with: a 44px square monogram tile (mono 14px caps, dark fill, sometimes a tone variant), title + tags column (sans 15px / mono 11px), and a right column with a star (curated) and heart (favorite). Active row has a yellow 2px left border and slight yellow tint background.
- **Bottom tab bar** (in-app): home / library / cooking / saved. Sans 11px lowercase + 14px icon stacked. Active tab gets yellow ink.

**Copy:** Full recipe list is in `data.jsx` → `BROWSE`. Hero recipe is `RECIPE` (Shakshuka).

### 2. Recipe Detail (`screens-browse.jsx` → `ScreenDetail`)

**Purpose.** Pre-cook overview — what you'll need, how long, the plan.

**Layout:**
- **Top bar**: back button left, mono caps "recipe · 01" center, heart right.
- **Hero frame**: same striped pattern. Eyebrow "house recipe", code "35 MIN · 06 STEPS", headline "shakshuka, **easy**" (yellow on the difficulty word).
- **Description block**: mono caps tag list ("brunch · one-pan · vegetarian"), then a 2–3 sentence description in Plex Sans 15px / 1.55 / `text-wrap: pretty`.
- **Stats row** (3 columns, hairline divided): `total / 35 min`, `active / 15 min`, `level / easy` (the "easy" value is yellow). Mono caps key, large sans 22px value with smaller "min" suffix.
- **Ingredients section**: header with count, plus a `– / + servings` stepper on the right (mono, hairline circles around the icons). Items below grouped by `Sauce` / `To finish`. Each ingredient is a 3-column row: qty (mono, 70px fixed), name (sans), trailing space.
- **The plan section**: 6 step rows with two-digit step number, title + lowercase detail caption, and trailing duration ("8m" or "—"). Hairline rules between rows.
- **Primary CTA**: full-width yellow button "begin cooking" with flame icon, sans 14px caps lowercase.

### 3. Mise en place (`screens-browse.jsx` → `ScreenMise`)

**Purpose.** Pre-cook checklist. Confirm everything is prepped before starting.

**Layout:**
- **Top bar**: back, "mise en place" mono caps center.
- **Heading**: 28px sans, 1.1 leading, two lines: "set yourself up." / "**then cook.**" (second line yellow).
- **Progress meta row**: "2 of 13 ready" left / "15%" right (mono caps).
- **Progress bar**: 2px tall, dark track, yellow fill.
- **Checklist**: same row layout as the ingredients list, but each row is a button. Tap toggles the check. Checked rows show a yellow check icon in the trailing 24px circle and dim slightly.
- **Bottom CTA**: full-width yellow "begin cooking" with chev-right.

### 4. Cook (`screens-cook.jsx` → `ScreenCook`) — **the core flow**

**Purpose.** Hands-free step-by-step cooking. This is what the app is for.

**Layout (vertical):**
- **Header strip**: close (×) / step pip indicator (1 hairline rectangle per step, current is yellow, completed are 50% yellow, upcoming are dim) / timer button / mic button (yellow border + ink when voice mode is on).
- **Photo region** (~38% of viewport): striped placeholder, mono caps eyebrow "step 03 · sauce, not soup", "watch" toggle top-right when the step has a video.
- **Body region** (rest of viewport, scrollable, **tappable to advance**):
  - Mono caps row: "step 03 / 06" — hairline rule — "reduce · 12m"
  - Headline: 32px Plex Sans 500, lowercase, with the **last word yellow** ("build the **sauce**").
  - Instruction: 17px sans, 1.5 line-height, ink-2 color.
  - Optional tip card: dark fill, hairline border, "TIP" label in yellow mono caps + italicized body.
  - Inline timer (when step has one): 42px ring SVG (yellow stroke arc, dark track), label + monospaced clock, yellow play/pause circle button.
- **Bottom nav**: "back" ghost button left / "next step" yellow button right.
- **Voice listening pill** (when mic active): centered above bottom nav, dark fill, 3 animated yellow bars, "listening · "next step"".

**Three ways to advance** — implement all three:
1. **Tap** anywhere on the body region (large hands-free target — primary mechanism).
2. **Swipe** left/right on the whole screen (touch/pointer events; 60px threshold).
3. **Voice** — when mic is on, listen for a small phrase set: "next step", "back", "repeat", "start timer", "pause timer". Use the Speech Recognition API on web, or `SFSpeechRecognizer` on iOS / `SpeechRecognizer` on Android. The voice toggle in the top bar enables/disables.

Plus an explicit "next step" button as the always-available fallback.

**State:**
- `currentStepIndex: number`
- `voiceMode: boolean`
- `timer: { remaining: number, total: number, running: boolean } | null` — reset whenever step changes (if the step has a timer config).
- Step data lives in `RECIPE.steps` (`data.jsx`), with each step carrying `{ n, title, instruction, detail, timer?, uses, tip? }`.

**Per-second tick** when `timer.running` — decrement `remaining`, stop at 0. Use `setInterval` cleared on cleanup.

### 5. Timers (`screens-cook.jsx` → `ScreenTimers`)

**Purpose.** Multi-timer overview when juggling parallel cooking.

**Layout:**
- **Top bar**: close (×) / "timers" mono caps / `+`.
- **Hero stat**: 32px sans "3 **running**" (running is dim) + mono caps yellow "next: bread in 1:15" hint underneath.
- **Timer cards**: each card is a hairline-bordered tile with:
  - Header row: recipe context (mono caps, dim) + label (sans 18px) on left; large monospaced clock on right (yellow if urgent < 2min remaining, ink if normal, "DONE" caps if finished).
  - Action row: pause/resume primary button (yellow), `+1 min`, `reset` ghost buttons.
  - 1px progress bar at the very bottom of the card showing elapsed.
- Urgent state: yellow border + slight yellow tint background.
- Done state: collapsed to a single "dismiss" action, dim.

## Interactions & behavior

- **Servings stepper** (Recipe Detail) recalculates ingredient quantities. Mock data is fixed in the prototype; in the real app, store base quantities + a multiplier and format on render.
- **Mise en place check** is purely local state in the prototype; persist per-recipe in real app.
- **Cooking advance**: tap → `setStep(i + 1)`; swipe → same with 60px threshold; voice → listen for command vocabulary above. Boundary: don't advance past last step; "Finish" on last step navigates to a (not-yet-designed) completion view.
- **Timer auto-reset**: changing step re-initializes the timer to the new step's `timer.minutes`. Running state does NOT carry over.
- **Inline timer button** click — start/pause toggle.
- **Voice mode toggle** — in real app, request mic permission on first activation; show denied state if rejected. Listening pill only when actively listening (turn on mic, recognition active = pill visible).
- **Multi-timer** lifecycle: timers persist across screens. Don't tear down the cook-mode timer when navigating to Timers; users routinely flip between them.

## Animations & transitions

- All button/icon-button presses: `transform: scale(0.92)` on `:active`, 150ms ease.
- Step transition (cook mode): a subtle horizontal translate on swipe (drag follows finger at 30% rate; snaps back if under threshold). Without swipe, hard-cut on tap is fine.
- Timer ring: `stroke-dashoffset` animates linearly over 1s per tick — feels like a continuous sweep.
- Voice listening bars: 3 bars, each `animation: voiceBar 0.9s ease-in-out infinite alternate`, staggered 0.1s. Bars scale Y from 0.3 to 1.

## State management

A flat per-recipe state object is sufficient. Suggested shape:

```ts
type CookSession = {
  recipeId: string
  servingsMultiplier: number
  miseChecked: Set<string>            // ingredient ids
  currentStepIndex: number
  voiceMode: boolean
  stepTimer: { remaining: number; total: number; running: boolean } | null
  // multi-timers (across recipes)
  ambientTimers: Array<{
    id: string; recipeId: string; stepN: number;
    label: string; remaining: number; total: number; running: boolean;
  }>
}
```

Persist `miseChecked` and `currentStepIndex` so a session survives app backgrounding / phone-call interruption — that's a real cooking scenario.

## Design tokens

```css
/* Colors */
--accent:  #ffff00         /* singular yellow accent */
--bg:      #0a0a0a         /* canvas */
--bg-2:    #131313         /* surface (search field, cards) */
--bg-3:    #1a1a1a         /* elevated surface */
--ink:     #f4f4f2         /* primary text */
--ink-2:   rgba(244,244,242,0.80)
--ink-3:   rgba(244,244,242,0.62)
--ink-4:   rgba(244,244,242,0.40)
--line:    rgba(255,255,255,0.08)   /* hairline */
--line-2:  rgba(255,255,255,0.14)   /* hairline emphasis */
--good:    #4ade80
--accent-tint: rgba(255,255,0,0.10)

/* Typography — IBM Plex Sans + IBM Plex Mono only */
sans:    'IBM Plex Sans', weights 300/400/500/600
mono:    'IBM Plex Mono', weights 300/400/500/600

/* Type roles */
display headline:  Plex Sans 28–38px / 1.05–1.1 / -0.02em / weight 500 / lowercase
section header:    Plex Sans 18–22px
body:              Plex Sans 15–17px / 1.45–1.55
eyebrow / meta:    Plex Mono 10–11px / 0.18–0.22em letter-spacing / UPPERCASE
quantity / clock:  Plex Mono, tabular-nums, sized to context

/* Spacing — 4px base, common values: 6 8 10 14 20 24 30 */
/* Radii */
button / pill:     999px
card:              0 (the design uses hairlines, not rounded cards)
icon button:       50% (28px circles)
inline timer:      no radius — flat hairline rectangle

/* Borders */
all dividers:      1px solid var(--line) — hairlines, no thicker
```

### Striped hero frame

The placeholder hero is a deliberate aesthetic, not a missing-image fallback. CSS:

```css
.rr-hero__stripes {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(
      135deg,
      transparent 0 14px,
      rgba(255,255,0,0.04) 14px 16px
    );
}
```

When real photography lands, replace with a `background-image` and keep the same eyebrow / code / headline overlays.

## Assets

- **Fonts**: IBM Plex Sans + IBM Plex Mono (Google Fonts / open license).
- **Icons**: bundled inline SVGs in `data.jsx` → `Icon` component. ~16 icons total. Replace with your icon system (Lucide / Phosphor / SF Symbols / native vector drawables) — match stroke weight to ~1.6px equivalent.
- **Imagery**: none in this design. Placeholder striped frames are intentional.

## Files in `design_files/`

- `Recipe App.html` — entry point that loads everything else.
- `styles.css` — full stylesheet (the canonical source for tokens, layout, and component styling).
- `data.jsx` — `RECIPE`, `BROWSE`, `Icon` component, `HeroFrame` component.
- `screens-browse.jsx` — `ScreenBrowse`, `ScreenDetail`, `ScreenMise`.
- `screens-cook.jsx` — `ScreenCook`, `ScreenTimers`.
- `app.jsx` — composition + tweaks panel.
- `ios-frame.jsx` — device bezel for the prototype (drop entirely in production).
- `tweaks-panel.jsx` — variation controls for the prototype (drop entirely in production).
- `design-canvas.jsx` — multi-screen presentation layout (drop entirely in production).

## Open design questions for the developer

1. **Wake lock** — cook mode should keep the screen on. Use `WakeLock` on web, `idleTimerDisabled` on iOS, `FLAG_KEEP_SCREEN_ON` on Android.
2. **Voice command vocabulary** — start with the 5 listed; expand based on user testing.
3. **Background timer** — timers must continue when the app is backgrounded (notifications when each fires). Out of scope for the design; mandatory for the product.
4. **Completion screen** — after the last step's "Finish", we need a celebrate / rate / save state. Not yet designed.
