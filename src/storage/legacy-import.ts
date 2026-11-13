/**
 * Pure planning for the optional, user-confirmed import of legacy browser data
 * into a signed-in account. Never overwrites: existing cloud ids/keys win, and
 * library entries whose name already exists in the cloud library are skipped.
 */
import { normalizeIngredientName as normalizeName } from "@/domain/library";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cloud recipe ids are UUIDs. A legacy recipe with another id gets a stable
 * UUID derived from its old id, so a retried import maps to the same row.
 */
export function cloudRecipeId(id: string): string {
  if (UUID.test(id)) return id.toLowerCase();
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822507); h3 = Math.imul(h3 ^ c, 3266489909); h4 = Math.imul(h4 ^ c, 668265263);
  }
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function planLegacyImport(
  legacyIn: LegacyData,
  cloud: { recipes: Recipe[]; library: Ingredient[]; hasSettings: boolean; drafts: CalculatorDraft[] },
): ImportPlan {
  const remap = (id: string) => cloudRecipeId(id);
  const legacy: LegacyData = {
    ...legacyIn,
    recipes: legacyIn.recipes.map((r) => ({ ...r, id: remap(r.id) })),
    drafts: legacyIn.drafts.map((d) =>
      d.recipeId ? { ...d, recipeId: remap(d.recipeId), key: d.key === `recipe:${d.recipeId}` ? `recipe:${remap(d.recipeId)}` : d.key } : d,
    ),
  };
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
