import { describe, expect, it } from "vitest";
import { formatQuantity, formatScaledQuantity, parseQuantity } from "./ingredient-scale";
import type { IngredientLine } from "./types";

describe("parseQuantity", () => {
  it("returns undefined for nullish or whitespace input", () => {
    expect(parseQuantity(undefined)).toBeUndefined();
    expect(parseQuantity("")).toBeUndefined();
    expect(parseQuantity("  ")).toBeUndefined();
  });

  it("parses integers and decimals", () => {
    expect(parseQuantity("3")).toBe(3);
    expect(parseQuantity("0.5")).toBe(0.5);
    expect(parseQuantity("1.25")).toBe(1.25);
  });

  it("parses simple fractions", () => {
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("3/4")).toBe(0.75);
  });

  it("parses integer-plus-fraction (e.g. '1 1/2')", () => {
    // Common in baking: "1 1/2 cups flour". The original implementation
    // returned NaN here; the extracted helper handles it.
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("2 3/4")).toBeCloseTo(2.75);
  });

  it("returns undefined for non-numeric strings", () => {
    expect(parseQuantity("a pinch")).toBeUndefined();
    expect(parseQuantity("to taste")).toBeUndefined();
  });
});

describe("formatQuantity", () => {
  it("formats integers without decimals", () => {
    expect(formatQuantity(3)).toBe("3");
    expect(formatQuantity(10)).toBe("10");
  });

  it("snaps near-fractions to common cooking fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(0.75)).toBe("3/4");
    expect(formatQuantity(1.5)).toBe("1 1/2");
  });

  it("falls back to one-decimal precision off the fraction grid", () => {
    expect(formatQuantity(1.2)).toBe("1.2");
    expect(formatQuantity(0.4)).toBe("0.4");
  });

  it("strips a trailing .0", () => {
    expect(formatQuantity(2.0)).toBe("2");
  });
});

describe("formatScaledQuantity", () => {
  const ingredient = (overrides: Partial<IngredientLine>): IngredientLine => ({
    id: "ing",
    raw: "",
    language: "en",
    ...overrides,
  });

  it("scales numeric quantities and keeps the unit", () => {
    const line = ingredient({ quantity: "2", unit: "tbsp" });
    expect(formatScaledQuantity(line, 2)).toBe("4 tbsp");
  });

  it("snaps fractional results", () => {
    const line = ingredient({ quantity: "1", unit: "cup" });
    expect(formatScaledQuantity(line, 0.5)).toBe("1/2 cup");
  });

  it("preserves the original quantity string when unparseable", () => {
    const line = ingredient({ quantity: "a pinch", unit: "salt" });
    expect(formatScaledQuantity(line, 2)).toBe("a pinch salt");
  });

  it("returns an empty string when there is no quantity at all", () => {
    expect(formatScaledQuantity(ingredient({}), 2)).toBe("");
  });
});
