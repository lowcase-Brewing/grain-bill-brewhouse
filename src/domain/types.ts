/**
 * Core domain models for lowcase Brewing.
 * Pure data shapes only — no UI, no storage concerns.
 */

export const INGREDIENT_CATEGORIES = ["Base", "Specialty", "Adjunct", "Extract"] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  origin: string;
  /** Fraction of grain weight recoverable as extract. Null for Extract category (PPG is direct). */
  extractFraction: number | null;
  /** Points per pound per gallon. Grains: extractFraction * 46. Extract: entered directly. */
  ppg: number;
  flavor: string;
  notes: string;
  source: "seed" | "user";
  updatedAt: string;
}

/**
 * Frozen copy of the ingredient values a grain-bill row was calculated with.
 * Saved recipes keep these so later library edits never silently rewrite a recipe.
 */
export interface IngredientSnapshot {
  libraryId: string;
  name: string;
  category: IngredientCategory;
  origin: string;
  extractFraction: number | null;
  ppg: number;
  notes: string;
  capturedAt: string;
}

/** Raw user input for a row. Weights stay strings so invalid entries are never coerced to zero. */
export interface GrainRowInput {
  id: string;
  ingredient: IngredientSnapshot | null;
  lb: string;
  oz: string;
}

/** Raw calculator settings as typed by the user. */
export interface CalcSettingsInput {
  coldFermenterGal: string;
  efficiencyPct: string;
  targetOG: string;
  extractRecoveryPct: string;
}

export const BREW_METHODS = ["all-grain", "partial-mash", "extract"] as const;
export type BrewMethod = (typeof BREW_METHODS)[number];

export const BREW_METHOD_LABELS: Record<BrewMethod, string> = {
  "all-grain": "All-grain",
  "partial-mash": "Partial mash",
  extract: "Extract",
};

/** Validated numeric recipe parameters. */
export interface RecipeParameters {
  coldFermenterGal: number;
  efficiencyPct: number;
  targetOG: number | null;
  extractRecoveryPct: number;
}

export interface SavedGrainBillSummary {
  savedAt: string;
  complete: boolean;
  /** Why the OG was not recorded (incomplete/invalid rows). */
  reason: string | null;
  totalWeightLb: number | null;
  mashedGrainLb: number | null;
  totalPoints: number | null;
  estimatedOG: number | null;
  differencePoints: number | null;
}

export interface Recipe {
  id: string;
  name: string;
  style: string;
  version: string;
  method: BrewMethod;
  parameters: RecipeParameters;
  description: string;
  notes: string;
  hopsNotes: string;
  yeastNotes: string;
  processNotes: string;
  grainBill: GrainRowInput[];
  grainBillSummary: SavedGrainBillSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** In-progress calculator work, autosaved in the browser. */
export interface CalculatorDraft {
  /** "scratch" for the standalone calculator, or `recipe:<id>`. */
  key: string;
  recipeId: string | null;
  settings: CalcSettingsInput;
  rows: GrainRowInput[];
  loadedExample: boolean;
  updatedAt: string;
}

export interface WorkflowTemplate {
  /** Pattern for the project root folder. Tokens: {name} {version} {style} {slug} {date}. */
  rootFolderPattern: string;
  folders: string[];
  /** Which folder receives the exported recipe files. */
  recipeFolder: string;
  /** Pattern for exported file base names (no extension). */
  fileBasePattern: string;
  /** Always false until mapped against the original AppleScript. */
  matchedToOriginalAppleScript: false;
}

export interface AppSettings {
  workflow: WorkflowTemplate;
}
