/** Malt Library rules: PPG derivation, validation, uniqueness, snapshots. */
import { parseNumberInput } from "./numbers";
import { SEED_MALT_RECORDS, seedIngredientId, type SeedMaltRecord } from "./seed-malts";
import { activeStandardLibrary } from "./standard-malts";
import {
  INGREDIENT_CATEGORIES,
  type Ingredient,
  type IngredientCategory,
  type IngredientSnapshot,
} from "./types";

/** Sheet constant: grain PPG = extractFraction * 46 (sucrose reference). */
export const GRAIN_PPG_FACTOR = 46;

export function isExtractCategory(c: IngredientCategory): boolean {
  return c === "Extract";
}

export function deriveGrainPpg(extractFraction: number): number {
  return extractFraction * GRAIN_PPG_FACTOR;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Returns the display names that appear more than once (case/whitespace-insensitive). */
export function findDuplicateNames(list: Pick<Ingredient, "name">[]): string[] {
  const seen = new Map<string, number>();
  for (const i of list) {
    const k = normalizeIngredientName(i.name);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return list
    .filter((i, idx, arr) => {
      const k = normalizeIngredientName(i.name);
      return (seen.get(k) ?? 0) > 1 && arr.findIndex((x) => normalizeIngredientName(x.name) === k) === idx;
    })
    .map((i) => i.name);
}

export interface IngredientDraft {
  name: string;
  category: IngredientCategory;
  origin: string;
  extractFraction: string;
  ppg: string;
  flavor: string;
  notes: string;
}

export type IngredientDraftErrors = Partial<Record<keyof IngredientDraft, string>>;

export type IngredientCore = Omit<Ingredient, "id" | "updatedAt" | "source">;

export function ingredientToDraft(i: Ingredient): IngredientDraft {
  return {
    name: i.name,
    category: i.category,
    origin: i.origin,
    extractFraction: i.extractFraction === null ? "" : String(i.extractFraction),
    ppg: String(i.ppg),
    flavor: i.flavor,
    notes: i.notes,
  };
}

export function emptyIngredientDraft(): IngredientDraft {
  return { name: "", category: "Base", origin: "", extractFraction: "", ppg: "", flavor: "", notes: "" };
}

export function validateIngredientDraft(
  draft: IngredientDraft,
  existing: Ingredient[],
  editingId?: string,
): { ok: true; value: IngredientCore; warnings: string[] } | { ok: false; errors: IngredientDraftErrors } {
  const errors: IngredientDraftErrors = {};
  const warnings: string[] = [];
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Name is required.";
  else {
    const k = normalizeIngredientName(name);
    if (existing.some((e) => e.id !== editingId && normalizeIngredientName(e.name) === k)) {
      errors.name = "An ingredient with this name already exists.";
    }
  }
  if (!INGREDIENT_CATEGORIES.includes(draft.category)) errors.category = "Choose a category.";

  let extractFraction: number | null = null;
  let ppg = NaN;
  if (isExtractCategory(draft.category)) {
    const p = parseNumberInput(draft.ppg);
    if (p.kind === "blank") errors.ppg = "PPG is required for extracts.";
    else if (p.kind === "invalid") errors.ppg = "PPG must be a finite number.";
    else if (p.value < 0) errors.ppg = "PPG can't be negative.";
    else {
      ppg = p.value;
      if (ppg === 0) warnings.push("PPG is 0 — this ingredient can't be used in calculations until it's positive.");
    }
  } else {
    const f = parseNumberInput(draft.extractFraction);
    if (f.kind === "blank") errors.extractFraction = "Extract fraction is required for grains and adjuncts.";
    else if (f.kind === "invalid") errors.extractFraction = "Extract fraction must be a finite number.";
    else if (!(f.value > 0 && f.value <= 1)) errors.extractFraction = "Extract fraction must be greater than 0 and at most 1.";
    else {
      extractFraction = f.value;
      ppg = deriveGrainPpg(f.value);
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    warnings,
    value: {
      name,
      category: draft.category,
      origin: draft.origin.trim(),
      extractFraction,
      ppg,
      flavor: draft.flavor.trim(),
      notes: draft.notes.trim(),
    },
  };
}

/** Validates a full stored ingredient (used for storage/import integrity). */
export function isIngredientUsableForCalc(i: Pick<Ingredient, "ppg">): boolean {
  return Number.isFinite(i.ppg) && i.ppg > 0;
}

export function seedRecordToIngredient(r: SeedMaltRecord, now: string): Ingredient {
  return {
    id: seedIngredientId(r.name),
    name: r.name,
    category: r.category,
    origin: r.origin,
    extractFraction: r.extractFraction,
    ppg: r.ppg,
    flavor: r.flavor,
    notes: r.notes,
    source: "seed",
    updatedAt: now,
  };
}

export function seedLibrary(now: string): Ingredient[] {
  return activeStandardLibrary(now);
}

/** Historical 23-row Google Sheet snapshot, unchanged. */
export function historicalSheetLibrary(now: string): Ingredient[] {
  return SEED_MALT_RECORDS.map((r) => seedRecordToIngredient(r, now));
}

export function snapshotIngredient(i: Ingredient, now: string): IngredientSnapshot {
  return {
    libraryId: i.id,
    name: i.name,
    category: i.category,
    origin: i.origin,
    extractFraction: i.extractFraction,
    ppg: i.ppg,
    notes: i.notes,
    capturedAt: now,
  };
}

/** True when the library entry's calculation-relevant values differ from the row snapshot. */
export function snapshotDiffersFromLibrary(s: IngredientSnapshot, i: Ingredient): boolean {
  return (
    s.name !== i.name ||
    s.category !== i.category ||
    s.ppg !== i.ppg ||
    s.extractFraction !== i.extractFraction
  );
}

export type SnapshotState = "current" | "library-changed" | "not-in-library";

export function snapshotState(s: IngredientSnapshot, library: Ingredient[]): SnapshotState {
  const i = library.find((x) => x.id === s.libraryId);
  if (!i) return "not-in-library";
  return snapshotDiffersFromLibrary(s, i) ? "library-changed" : "current";
}
