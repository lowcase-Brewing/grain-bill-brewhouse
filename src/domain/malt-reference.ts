import type { IngredientCategory } from "./types";

export interface MaltReference {
  manufacturer: string;
  product: string;
  aliases: string[];
  group: string;
  color: string;
  handling: string;
  sourceUrl: string | null;
  checkedOn: string;
  yield: {
    kind: "manufacturer-analysis" | "generic-estimate" | "historical-estimate";
    basis: string;
    dryFraction?: number;
    moistureFraction?: number;
    analysis?: string;
  };
  category: IngredientCategory;
}

/** Dry fine-grind yield is not as-is yield. Inputs are fractions, not IoB L/kg. */
export function dryToAsIs(dryFraction: number, moistureFraction: number): number {
  if (!Number.isFinite(dryFraction) || !Number.isFinite(moistureFraction) ||
      dryFraction <= 0 || dryFraction > 1 || moistureFraction < 0 || moistureFraction >= 1) {
    throw new Error("Yield and moisture must be valid fractions.");
  }
  return dryFraction * (1 - moistureFraction);
}