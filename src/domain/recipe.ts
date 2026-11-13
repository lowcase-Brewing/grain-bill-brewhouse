/** Recipe rules: form validation, creation, duplication, grain-bill write-back. */
import {
  checkEfficiency,
  checkRecovery,
  checkTargetOG,
  checkVolume,
  type GrainBillResult,
} from "./calculator";
import { numberToInput } from "./numbers";
import {
  BREW_METHODS,
  type BrewMethod,
  type CalcSettingsInput,
  type GrainRowInput,
  type Recipe,
  type RecipeParameters,
  type SavedGrainBillSummary,
} from "./types";

export const DEFAULT_RECIPE_VERSION = "1.0.0";
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

export const DEFAULT_PARAMETERS: RecipeParameters = {
  coldFermenterGal: 6.5,
  efficiencyPct: 70,
  targetOG: 1.052,
  extractRecoveryPct: 90,
};

export interface RecipeFormInput extends CalcSettingsInput {
  name: string;
  style: string;
  version: string;
  method: BrewMethod;
  description: string;
  notes: string;
  hopsNotes: string;
  yeastNotes: string;
  processNotes: string;
}

export type RecipeFormErrors = Partial<Record<keyof RecipeFormInput, string>>;

export type RecipeCore = Pick<
  Recipe,
  | "name"
  | "style"
  | "version"
  | "method"
  | "parameters"
  | "description"
  | "notes"
  | "hopsNotes"
  | "yeastNotes"
  | "processNotes"
>;

export function parametersToSettingsInput(p: RecipeParameters): CalcSettingsInput {
  return {
    coldFermenterGal: numberToInput(p.coldFermenterGal),
    efficiencyPct: numberToInput(p.efficiencyPct),
    targetOG: numberToInput(p.targetOG),
    extractRecoveryPct: numberToInput(p.extractRecoveryPct),
  };
}

export function emptyRecipeForm(): RecipeFormInput {
  return {
    name: "",
    style: "",
    version: DEFAULT_RECIPE_VERSION,
    method: "all-grain",
    ...parametersToSettingsInput(DEFAULT_PARAMETERS),
    description: "",
    notes: "",
    hopsNotes: "",
    yeastNotes: "",
    processNotes: "",
  };
}

export function recipeToFormInput(r: Recipe): RecipeFormInput {
  return {
    name: r.name,
    style: r.style,
    version: r.version,
    method: r.method,
    ...parametersToSettingsInput(r.parameters),
    description: r.description,
    notes: r.notes,
    hopsNotes: r.hopsNotes,
    yeastNotes: r.yeastNotes,
    processNotes: r.processNotes,
  };
}

/** Validates the four numeric parameters. All are required on a recipe except target OG. */
export function settingsToParameters(
  s: CalcSettingsInput,
): { ok: true; value: RecipeParameters } | { ok: false; errors: Partial<Record<keyof CalcSettingsInput, string>> } {
  const v = checkVolume(s.coldFermenterGal);
  const e = checkEfficiency(s.efficiencyPct);
  const t = checkTargetOG(s.targetOG);
  const r = checkRecovery(s.extractRecoveryPct);
  const errors: Partial<Record<keyof CalcSettingsInput, string>> = {};
  if (v.error) errors.coldFermenterGal = v.error;
  if (e.error) errors.efficiencyPct = e.error;
  if (t.error) errors.targetOG = t.error;
  if (r.error) errors.extractRecoveryPct = r.error;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      coldFermenterGal: v.value as number,
      efficiencyPct: e.value as number,
      targetOG: t.value,
      extractRecoveryPct: r.value as number,
    },
  };
}

export function validateRecipeForm(
  input: RecipeFormInput,
): { ok: true; value: RecipeCore } | { ok: false; errors: RecipeFormErrors } {
  const errors: RecipeFormErrors = {};
  const name = input.name.trim();
  const style = input.style.trim();
  const version = input.version.trim();
  if (!name) errors.name = "Recipe name is required.";
  if (!style) errors.style = "Style is required.";
  if (!VERSION_RE.test(version)) errors.version = "Use a version like 1.0.0.";
  if (!BREW_METHODS.includes(input.method)) errors.method = "Choose a method.";
  const params = settingsToParameters(input);
  if (!params.ok) Object.assign(errors, params.errors);
  if (Object.keys(errors).length || !params.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      style,
      version,
      method: input.method,
      parameters: params.value,
      description: input.description,
      notes: input.notes,
      hopsNotes: input.hopsNotes,
      yeastNotes: input.yeastNotes,
      processNotes: input.processNotes,
    },
  };
}

export function createRecipe(core: RecipeCore, id: string, now: string, grainBill: GrainRowInput[] = []): Recipe {
  return { ...core, id, grainBill, grainBillSummary: null, createdAt: now, updatedAt: now };
}

/** Applies edits from the recipe form while keeping the grain bill and summary intact. */
export function applyRecipeCore(recipe: Recipe, core: RecipeCore, now: string): Recipe {
  const paramsChanged = JSON.stringify(recipe.parameters) !== JSON.stringify(core.parameters);
  return {
    ...recipe,
    ...core,
    // A stored OG summary depends on parameters; mark stale ones as needing re-save.
    grainBillSummary:
      paramsChanged && recipe.grainBillSummary
        ? { ...recipe.grainBillSummary, complete: false, estimatedOG: null, totalPoints: null, differencePoints: null, reason: "Recipe settings changed since the grain bill was saved — reopen the calculator and save again." }
        : recipe.grainBillSummary,
    updatedAt: now,
  };
}

export function uniqueCopyName(name: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()));
  let candidate = `${name} (copy)`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) candidate = `${name} (copy ${n++})`;
  return candidate;
}

export function duplicateRecipe(r: Recipe, id: string, now: string, existingNames: string[]): Recipe {
  const clone: Recipe = JSON.parse(JSON.stringify(r));
  return { ...clone, id, name: uniqueCopyName(r.name, existingNames), createdAt: now, updatedAt: now };
}

export function summarizeGrainBill(result: GrainBillResult, now: string): SavedGrainBillSummary {
  const complete = result.estimatedOG !== null;
  return {
    savedAt: now,
    complete,
    reason: complete ? null : result.ogSuppressedReason,
    totalWeightLb: result.totalWeightLb,
    mashedGrainLb: result.mashedGrainLb,
    totalPoints: result.totalPoints,
    estimatedOG: result.estimatedOG,
    differencePoints: result.differencePoints,
  };
}

/** Writes calculator output back to a recipe without touching any other fields. */
export function applyGrainBillToRecipe(
  recipe: Recipe,
  parameters: RecipeParameters,
  rows: GrainRowInput[],
  result: GrainBillResult,
  now: string,
): Recipe {
  return {
    ...recipe,
    parameters,
    grainBill: rows.filter((r) => r.ingredient || r.lb.trim() || r.oz.trim()),
    grainBillSummary: summarizeGrainBill(result, now),
    updatedAt: now,
  };
}
