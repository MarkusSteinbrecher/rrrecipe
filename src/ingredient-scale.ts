import type { IngredientLine } from "./types";

export function parseQuantity(quantity?: string): number | undefined {
  if (!quantity) return undefined;
  const trimmed = quantity.trim();
  if (!trimmed) return undefined;
  // Allow plain fractions ("1/2") and integer-plus-fraction ("1 1/2").
  const compoundMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (compoundMatch) {
    const [, whole, num, den] = compoundMatch;
    const numerator = Number(num);
    const denominator = Number(den);
    if (numerator && denominator) return Number(whole) + numerator / denominator;
  }
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);
    if (num && den) return num / den;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatQuantity(value: number): string {
  const commonFractions: Array<[number, string]> = [
    [0.25, "1/4"],
    [0.333, "1/3"],
    [0.5, "1/2"],
    [0.667, "2/3"],
    [0.75, "3/4"],
  ];
  const whole = Math.floor(value);
  const fraction = value - whole;
  const match = commonFractions.find(([candidate]) => Math.abs(candidate - fraction) < 0.02);
  if (match) return whole > 0 ? `${whole} ${match[1]}` : match[1];
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatScaledQuantity(ingredient: IngredientLine, multiplier: number): string {
  const quantity = parseQuantity(ingredient.quantity);
  if (quantity === undefined) {
    return ingredient.quantity && ingredient.unit ? `${ingredient.quantity} ${ingredient.unit}` : ingredient.quantity ?? "";
  }
  const scaled = quantity * multiplier;
  const formatted = formatQuantity(scaled);
  return ingredient.unit ? `${formatted} ${ingredient.unit}` : formatted;
}
