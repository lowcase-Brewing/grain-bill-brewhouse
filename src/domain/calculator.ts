/**
 * Grain bill calculator — pure functions reproducing the "Grain Bill" tab of
 * "lowcase Grain Bill Calculations" (read-only snapshot fetched 2026-11-13).
 *
 *   WeightLb     = pounds + ounces / 16
 *   grain rows   : OGpoints = WeightLb * PPG * brewhouseEfficiencyFraction / coldFermenterGallons
 *   Extract rows : OGpoints = WeightLb * PPG * extractRecoveryFraction     / coldFermenterGallons
 *   Estimated OG = 1 + sum(points) / 1000
 *   Difference   = (estimatedOG - targetOG) * 1000   (signed; blank without a target)
 *
 * Bill weight and % include Extract. Mashed grain load excludes Extract.
 * Predicts gravity only — no attenuation, ABV or color.
 * Full precision is kept; round only at display time.
 */
import { parseNumberInput } from "./numbers";
import type { CalcSettingsInput, GrainRowInput, IngredientCategory } from "./types";

export const OUNCES_PER_POUND = 16;
export const TARGET_OG_MIN_EXCLUSIVE = 1;
export const TARGET_OG_MAX = 1.3;

export const DEFAULT_CALC_SETTINGS: CalcSettingsInput = {
  coldFermenterGal: "6.5",
  efficiencyPct: "70",
  targetOG: "1.052",
  /** PROVISIONAL, not measured. See README "Extract recovery". */
  extractRecoveryPct: "90",
};

export type SettingField = keyof CalcSettingsInput;

export interface FieldCheck {
  /** Parsed value when valid, otherwise null. */
  value: number | null;
  /** Error for an entered-but-invalid value, or a missing required value. */
  error: string | null;
  blank: boolean;
}

export interface SettingsCheck {
  coldFermenterGal: FieldCheck;
  efficiencyPct: FieldCheck;
  targetOG: FieldCheck;
  extractRecoveryPct: FieldCheck;
}

function check(
  raw: string,
  opts: { label: string; required: boolean; validate: (v: number) => string | null },
): FieldCheck {
  const p = parseNumberInput(raw);
  if (p.kind === "blank") {
    return { value: null, blank: true, error: opts.required ? `${opts.label} is required.` : null };
  }
  if (p.kind === "invalid") {
    return { value: null, blank: false, error: `${opts.label} must be a finite number.` };
  }
  const err = opts.validate(p.value);
  return { value: err ? null : p.value, blank: false, error: err };
}

export function checkVolume(raw: string): FieldCheck {
  return check(raw, {
    label: "Cold fermenter volume",
    required: true,
    validate: (v) => (v > 0 ? null : "Cold fermenter volume must be greater than 0 gal."),
  });
}

export function checkEfficiency(raw: string): FieldCheck {
  return check(raw, {
    label: "Brewhouse efficiency",
    required: true,
    validate: (v) =>
      v > 0 && v <= 100 ? null : "Brewhouse efficiency must be greater than 0% and at most 100%.",
  });
}

export function checkRecovery(raw: string): FieldCheck {
  return check(raw, {
    label: "Extract recovery",
    required: true,
    validate: (v) =>
      v > 0 && v <= 100 ? null : "Extract recovery must be greater than 0% and at most 100%.",
  });
}

export function checkTargetOG(raw: string): FieldCheck {
  return check(raw, {
    label: "Target OG",
    required: false,
    validate: (v) =>
      v > TARGET_OG_MIN_EXCLUSIVE && v <= TARGET_OG_MAX
        ? null
        : "Target OG must be greater than 1.000 and at most 1.300.",
  });
}

export function checkSettings(s: CalcSettingsInput): SettingsCheck {
  return {
    coldFermenterGal: checkVolume(s.coldFermenterGal),
    efficiencyPct: checkEfficiency(s.efficiencyPct),
    targetOG: checkTargetOG(s.targetOG),
    extractRecoveryPct: checkRecovery(s.extractRecoveryPct),
  };
}

export type RowStatus = "blank" | "valid" | "invalid";

export interface RowResult {
  rowId: string;
  status: RowStatus;
  errors: string[];
  category: IngredientCategory | null;
  isExtract: boolean;
  /** pounds + ounces/16 when the weight entries are valid numbers. */
  weightLb: number | null;
  ppg: number | null;
  /** % of total bill weight (extract included). Null unless every active row is valid. */
  percentOfBill: number | null;
  ogPoints: number | null;
  /** Why points are missing for an otherwise valid row (e.g. invalid volume). */
  pointsBlockedReason: string | null;
}

export interface GrainBillResult {
  settings: SettingsCheck;
  rows: RowResult[];
  activeRowCount: number;
  invalidRowCount: number;
  usesExtract: boolean;
  usesGrain: boolean;
  /** Settings errors that block the aggregate OG. */
  blockingSettingErrors: { field: SettingField; message: string }[];
  totalWeightLb: number | null;
  /** Total weight excluding Extract — what actually goes in the mash. */
  mashedGrainLb: number | null;
  extractWeightLb: number | null;
  totalPoints: number | null;
  estimatedOG: number | null;
  ogSuppressedReason: string | null;
  differencePoints: number | null;
  differenceReason: string | null;
}

function isRowBlank(row: GrainRowInput): boolean {
  return !row.ingredient && row.lb.trim() === "" && row.oz.trim() === "";
}

export function calculateGrainBill(
  settingsInput: CalcSettingsInput,
  rowsInput: GrainRowInput[],
): GrainBillResult {
  const settings = checkSettings(settingsInput);
  const volume = settings.coldFermenterGal.value;
  const efficiency =
    settings.efficiencyPct.value === null ? null : settings.efficiencyPct.value / 100;
  const recovery =
    settings.extractRecoveryPct.value === null ? null : settings.extractRecoveryPct.value / 100;

  const rows: RowResult[] = rowsInput.map((row) => {
    const base: RowResult = {
      rowId: row.id,
      status: "blank",
      errors: [],
      category: row.ingredient?.category ?? null,
      isExtract: row.ingredient?.category === "Extract",
      weightLb: null,
      ppg: null,
      percentOfBill: null,
      ogPoints: null,
      pointsBlockedReason: null,
    };
    if (isRowBlank(row)) return base;

    const errors: string[] = [];
    if (!row.ingredient) errors.push("Choose an ingredient for this row.");

    const lb = parseNumberInput(row.lb);
    const oz = parseNumberInput(row.oz);
    let weightOk = true;
    if (lb.kind === "invalid") {
      errors.push("Pounds must be a finite number.");
      weightOk = false;
    } else if (lb.kind === "number" && lb.value < 0) {
      errors.push("Pounds can't be negative.");
      weightOk = false;
    }
    if (oz.kind === "invalid") {
      errors.push("Ounces must be a finite number.");
      weightOk = false;
    } else if (oz.kind === "number" && oz.value < 0) {
      errors.push("Ounces can't be negative.");
      weightOk = false;
    }
    if (lb.kind === "blank" && oz.kind === "blank") {
      errors.push("Enter a weight in lb, oz, or both.");
      weightOk = false;
    }

    let weightLb: number | null = null;
    if (weightOk) {
      const pounds = lb.kind === "number" ? lb.value : 0;
      const ounces = oz.kind === "number" ? oz.value : 0;
      weightLb = pounds + ounces / OUNCES_PER_POUND;
      if (!Number.isFinite(weightLb)) {
        errors.push("Weight is too large to calculate.");
        weightLb = null;
      } else if (weightLb <= 0) {
        errors.push("Row weight must be greater than zero.");
      }
    }

    let ppg: number | null = null;
    if (row.ingredient) {
      const p = row.ingredient.ppg;
      if (typeof p === "number" && Number.isFinite(p) && p > 0) ppg = p;
      else errors.push("This ingredient has no usable PPG (it must be greater than 0).");
    }

    return {
      ...base,
      status: errors.length ? "invalid" : "valid",
      errors,
      weightLb,
      ppg,
    };
  });

  const active = rows.filter((r) => r.status !== "blank");
  const usesExtract = active.some((r) => r.isExtract);
  const usesGrain = active.some((r) => r.category !== null && !r.isExtract);

  // Source Grain Bill A8 readiness: efficiency is always required, even for an
  // extract-only bill. An entered invalid target also blocks the aggregate OG;
  // a blank target is allowed and only leaves the delta blank.
  const blockingSettingErrors: GrainBillResult["blockingSettingErrors"] = [];
  if (settings.coldFermenterGal.error)
    blockingSettingErrors.push({ field: "coldFermenterGal", message: settings.coldFermenterGal.error });
  if (settings.efficiencyPct.error)
    blockingSettingErrors.push({ field: "efficiencyPct", message: settings.efficiencyPct.error });
  if (usesExtract && settings.extractRecoveryPct.error)
    blockingSettingErrors.push({
      field: "extractRecoveryPct",
      message: settings.extractRecoveryPct.error,
    });
  if (settings.targetOG.error)
    blockingSettingErrors.push({ field: "targetOG", message: settings.targetOG.error });

  // Per-row points for valid rows when their own factor and the volume are valid.
  for (const r of rows) {
    if (r.status !== "valid" || r.weightLb === null || r.ppg === null) continue;
    const factor = r.isExtract ? recovery : efficiency;
    if (volume === null) {
      r.pointsBlockedReason = "Needs a valid cold fermenter volume.";
    } else if (factor === null) {
      r.pointsBlockedReason = r.isExtract
        ? "Needs a valid extract recovery %."
        : "Needs a valid brewhouse efficiency %.";
    } else {
      r.ogPoints = (r.weightLb * r.ppg * factor) / volume;
    }
  }

  let totalWeightLb: number | null = null;
  let mashedGrainLb: number | null = null;
  let extractWeightLb: number | null = null;
  if (active.length > 0 && invalid.length === 0) {
    totalWeightLb = 0;
    mashedGrainLb = 0;
    extractWeightLb = 0;
    for (const r of active) {
      const w = r.weightLb as number;
      totalWeightLb += w;
      if (r.isExtract) extractWeightLb += w;
      else mashedGrainLb += w;
    }
    for (const r of active) {
      r.percentOfBill = ((r.weightLb as number) / totalWeightLb) * 100;
    }
  }

  let totalPoints: number | null = null;
  let estimatedOG: number | null = null;
  let ogSuppressedReason: string | null = null;
  if (active.length === 0) {
    ogSuppressedReason = "Add an ingredient and weight to estimate OG.";
  } else if (invalid.length > 0) {
    ogSuppressedReason = `${invalid.length} row${invalid.length === 1 ? " needs" : "s need"} attention before OG can be estimated.`;
  } else if (blockingSettingErrors.length > 0) {
    ogSuppressedReason = blockingSettingErrors.map((e) => e.message).join(" ");
  } else {
    totalPoints = 0;
    for (const r of active) totalPoints += r.ogPoints as number;
    estimatedOG = 1 + totalPoints / 1000;
  }

  let differencePoints: number | null = null;
  let differenceReason: string | null = null;
  if (settings.targetOG.blank) {
    differenceReason = "No target OG set.";
  } else if (settings.targetOG.error) {
    differenceReason = settings.targetOG.error;
  } else if (estimatedOG === null) {
    differenceReason = "Estimated OG unavailable.";
  } else {
    differencePoints = (estimatedOG - (settings.targetOG.value as number)) * 1000;
  }

  return {
    settings,
    rows,
    activeRowCount: active.length,
    invalidRowCount: invalid.length,
    usesExtract,
    usesGrain,
    blockingSettingErrors,
    totalWeightLb,
    mashedGrainLb,
    extractWeightLb,
    totalPoints,
    estimatedOG,
    ogSuppressedReason,
    differencePoints,
    differenceReason,
  };
}
