/**
 * Pure planning for the optional, user-confirmed import of legacy browser data
 * into a signed-in account. Never overwrites: existing cloud ids/keys win, and
 * library entries whose name already exists in the cloud library are skipped.
 */
import { normalizeName } from "@/domain/library";
import type { AppSettings, CalculatorDraft, Ingredient, Recipe } from "@/domain/types";

export interface LegacyData {
  recipes: Recipe[];
  library: Ingredient[];
  settings: AppSettings | null;
  drafts: CalculatorDraft[];
}

export interface ImportPlan {
  recipes: Recipe[];
  library: Ingredient[];
  settings: AppSettings | null;
  drafts: CalculatorDraft[];
  skipped: { recipes: number; library: number; settings: number; drafts: number };
}

export function planLegacyImport(
  legacy: LegacyData,
  cloud: { recipes: Recipe[]; library: Ingredient[]; hasSettings: boolean; drafts: CalculatorDraft[] },
): ImportPlan {
  const recipeIds = new Set(cloud.recipes.map((r) => r.id));
  const recipes = legacy.recipes.filter((r) => !recipeIds.has(r.id));
  const libIds = new Set(cloud.library.map((i) => i.id));
  const libNames = new Set(cloud.library.map((i) => normalizeName(i.name)));
  const library: Ingredient[] = [];
  for (const i of legacy.library) {
    const n = normalizeName(i.name);
    if (libIds.has(i.id) || libNames.has(n)) continue;
    libNames.add(n);
    library.push(i);
  }
  const draftKeys = new Set(cloud.drafts.map((d) => d.key));
  const validRecipeIds = new Set([...recipeIds, ...recipes.map((r) => r.id)]);
  const drafts = legacy.drafts.filter((d) => !draftKeys.has(d.key) && (d.recipeId === null || validRecipeIds.has(d.recipeId)));
  const settings = cloud.hasSettings ? null : legacy.settings;
  return {
    recipes,
    library,
    settings,
    drafts,
    skipped: {
      recipes: legacy.recipes.length - recipes.length,
      library: legacy.library.length - library.length,
      settings: legacy.settings && !settings ? 1 : 0,
      drafts: legacy.drafts.length - drafts.length,
    },
  };
}
