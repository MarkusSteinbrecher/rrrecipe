import type { AppSnapshot } from "./types";

const now = new Date().toISOString();

export const initialSnapshot: AppSnapshot = {
  recipes: [
    {
      id: "recipe-focaccia",
      currentVersionId: "version-focaccia-import",
      defaultVariantId: "variant-focaccia-original",
      createdAt: now,
      updatedAt: now,
    },
  ],
  variants: [
    {
      id: "variant-focaccia-original",
      recipeId: "recipe-focaccia",
      name: "Original",
      baseVersionId: "version-focaccia-import",
      currentVersionId: "version-focaccia-import",
      createdAt: now,
    },
  ],
  sources: [
    {
      id: "source-focaccia-video",
      type: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Example focaccia video",
      author: "Example Kitchen",
      retrievedAt: now,
      media: {
        provider: "youtube",
        videoId: "dQw4w9WgXcQ",
        durationSeconds: 213,
        thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    },
  ],
  versions: [
    {
      id: "version-focaccia-import",
      recipeId: "recipe-focaccia",
      variantId: "variant-focaccia-original",
      title: "Weeknight Focaccia",
      language: "en",
      subtitle: "A seeded example showing versions, cooking mode, and video markers.",
      description: "A simple baseline recipe for the first rrrecipe MVP.",
      sourceIds: ["source-focaccia-video"],
      imageIds: [],
      yield: {
        quantity: 1,
        unit: "tray",
        raw: "1 tray",
      },
      times: {
        prepMinutes: 20,
        cookMinutes: 25,
        totalMinutes: 165,
      },
      ingredients: [
        {
          id: "ing-flour",
          raw: "500 g bread flour",
          language: "en",
          quantity: "500",
          unit: "g",
          item: "bread flour",
          normalized: {
            quantityValue: 500,
            unit: "g",
            unitSystem: "metric",
            ingredientKey: "bread-flour",
          },
          conversion: {
            confidence: "exact",
            canonicalGrams: 500,
          },
        },
        {
          id: "ing-water",
          raw: "400 ml warm water",
          language: "en",
          quantity: "400",
          unit: "ml",
          item: "warm water",
          normalized: {
            quantityValue: 400,
            unit: "ml",
            unitSystem: "metric",
            ingredientKey: "water",
          },
          conversion: {
            confidence: "exact",
            canonicalMilliliters: 400,
          },
        },
        {
          id: "ing-yeast",
          raw: "7 g dry yeast",
          language: "en",
          quantity: "7",
          unit: "g",
          item: "dry yeast",
          normalized: {
            quantityValue: 7,
            unit: "g",
            unitSystem: "metric",
            ingredientKey: "dry-yeast",
          },
          conversion: {
            confidence: "exact",
            canonicalGrams: 7,
          },
        },
        {
          id: "ing-oil",
          raw: "3 tbsp olive oil",
          language: "en",
          quantity: "3",
          unit: "tbsp",
          item: "olive oil",
          normalized: {
            quantityValue: 3,
            unit: "tbsp",
            unitSystem: "us",
            ingredientKey: "olive-oil",
          },
          conversion: {
            confidence: "exact",
            canonicalMilliliters: 45,
          },
        },
        {
          id: "ing-salt",
          raw: "10 g salt",
          language: "en",
          quantity: "10",
          unit: "g",
          item: "salt",
          normalized: {
            quantityValue: 10,
            unit: "g",
            unitSystem: "metric",
            ingredientKey: "salt",
          },
          conversion: {
            confidence: "exact",
            canonicalGrams: 10,
          },
        },
      ],
      steps: [
        {
          id: "step-mix",
          position: 1,
          text: "Mix flour, yeast, water, and salt until no dry patches remain.",
          language: "en",
          mediaAnchors: [
            {
              sourceId: "source-focaccia-video",
              startSeconds: 18,
              endSeconds: 54,
              label: "Mix the dough",
              confidence: "manual",
            },
          ],
        },
        {
          id: "step-rest",
          position: 2,
          text: "Cover and rest until the dough is bubbly and relaxed.",
          language: "en",
          timerSeconds: 7200,
          mediaAnchors: [
            {
              sourceId: "source-focaccia-video",
              startSeconds: 55,
              endSeconds: 89,
              label: "Rest the dough",
              confidence: "manual",
            },
          ],
        },
        {
          id: "step-bake",
          position: 3,
          text: "Oil the tray, dimple the dough, and bake at 220 C until golden.",
          language: "en",
          timerSeconds: 1500,
          temperature: {
            value: 220,
            unit: "c",
            raw: "220 C",
          },
          mediaAnchors: [
            {
              sourceId: "source-focaccia-video",
              startSeconds: 126,
              endSeconds: 170,
              label: "Bake",
              confidence: "manual",
            },
          ],
        },
      ],
      notes: ["This is seed data for development. Replace with real imports later."],
      tags: ["bread", "video", "weeknight"],
      collections: ["Examples"],
      changeSummary: "Imported seed recipe",
      origin: "import",
      createdAt: now,
      createdBy: "importer",
    },
  ],
  settings: {
    appLanguage: "en",
    recipeLanguageMode: "original",
    measurementSystem: "original",
    temperatureUnit: "original",
    numberLocale: "en-US",
    cookingMode: {
      readbackEnabled: true,
      videoAutoSeek: false,
      commandInputEnabled: false,
    },
  },
};
