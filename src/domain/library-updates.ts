import { ACTIVE_STANDARD_CATALOG, STANDARD_CATALOG } from "./standard-malts";
import type { Ingredient } from "./types";

const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export function ingredientNames(i: Ingredient): string[] {
  return [i.name, ...(STANDARD_CATALOG.find((s) => s.id === i.id)?.reference.aliases ?? [])];
}
export function ingredientsConflict(a: Ingredient, b: Ingredient): boolean {
  return a.id === b.id || ingredientNames(a).some((n) => ingredientNames(b).some((m) => normalize(n) === normalize(m)));
}
/** Pure insert-only plan. An empty/deleted library is never implicitly reseeded. */
export function missingStandardIngredients(existing: Ingredient[], now: string): Ingredient[] {
  return ACTIVE_STANDARD_CATALOG.map((i) => ({ ...i.ingredient, updatedAt: now }))
    .filter((i) => !existing.some((e) => ingredientsConflict(i, e)));
}
export function selectedStandardAdditions(existing: Ingredient[], ids: string[], now: string): Ingredient[] {
  const selected = new Set(ids);
  return missingStandardIngredients(existing, now).filter((i) => selected.has(i.id));
}
export function ingredientSearchText(i: Ingredient): string {
  const ref = STANDARD_CATALOG.find((s) => s.id === i.id)?.reference;
  return [i.name, i.origin, i.category, i.flavor, ref?.manufacturer, ref?.product, ref?.group, ...(ref?.aliases ?? [])].join(" ").toLocaleLowerCase();
}