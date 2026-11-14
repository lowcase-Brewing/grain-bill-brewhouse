import { standardReference } from "./standard-malts";
import type { Ingredient } from "./types";

/** Public-only prose; never modifies account documents or exported snapshots. */
export function publicMaltProse(text: string): string {
  return text
    .replace(/Used in Novena Noche\.\s*/g, "")
    .replace(/Original \[1\] reference marker has no linked source; /g, "")
    .replace(/Original \[1\] marker has no linked source\./g, "")
    .replace(/D is blank because PPG is specified directly\./g, "")
    .replace(/\s*\[1\]/g, "")
    .trim();
}

export function publicMaltCardNotes(ingredient: Ingredient): string {
  const reference = standardReference(ingredient.id)?.reference;
  return publicMaltProse(reference && reference.yield.kind !== "historical-estimate"
    ? reference.handling
    : ingredient.notes);
}

export function hasCustomizedReferenceValues(ingredient: Ingredient): boolean {
  const standard = standardReference(ingredient.id)?.ingredient;
  return standard !== undefined && (
    ingredient.name !== standard.name || ingredient.ppg !== standard.ppg ||
    ingredient.extractFraction !== standard.extractFraction || ingredient.category !== standard.category
  );
}