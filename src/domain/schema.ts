/** Runtime validation schemas (zod) for persisted and exported data. Schema version 1. */
import { z } from "zod";
import { BREW_METHODS, INGREDIENT_CATEGORIES } from "./types";

export const SCHEMA_VERSION = 1 as const;

const finite = z.number().refine(Number.isFinite, "must be finite");

export const ingredientSnapshotSchema = z.object({
  libraryId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(INGREDIENT_CATEGORIES),
  origin: z.string(),
  extractFraction: finite.nullable(),
  ppg: finite,
  notes: z.string(),
  capturedAt: z.string(),
});

export const ingredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    category: z.enum(INGREDIENT_CATEGORIES),
    origin: z.string(),
    extractFraction: finite.nullable(),
    ppg: finite.refine((v) => v >= 0, "PPG must be ≥ 0"),
    flavor: z.string(),
    notes: z.string(),
    source: z.enum(["seed", "user"]),
    updatedAt: z.string(),
  })
  .refine(
    (i) =>
      i.category === "Extract"
        ? i.extractFraction === null
        : i.extractFraction !== null && i.extractFraction > 0 && i.extractFraction <= 1,
    "extractFraction must be null for Extract and within (0,1] otherwise",
  );

export const grainRowSchema = z.object({
  id: z.string().min(1),
  ingredient: ingredientSnapshotSchema.nullable(),
  lb: z.string(),
  oz: z.string(),
});

export const calcSettingsSchema = z.object({
  coldFermenterGal: z.string(),
  efficiencyPct: z.string(),
  targetOG: z.string(),
  extractRecoveryPct: z.string(),
});

export const recipeParametersSchema = z.object({
  coldFermenterGal: finite.refine((v) => v > 0),
  efficiencyPct: finite.refine((v) => v > 0 && v <= 100),
  targetOG: finite.refine((v) => v > 1 && v <= 1.3).nullable(),
  extractRecoveryPct: finite.refine((v) => v > 0 && v <= 100),
});

export const savedSummarySchema = z.object({
  savedAt: z.string(),
  complete: z.boolean(),
  reason: z.string().nullable(),
  totalWeightLb: finite.nullable(),
  mashedGrainLb: finite.nullable(),
  totalPoints: finite.nullable(),
  estimatedOG: finite.nullable(),
  differencePoints: finite.nullable(),
});

export const recipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  style: z.string().trim().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  method: z.enum(BREW_METHODS),
  parameters: recipeParametersSchema,
  description: z.string(),
  notes: z.string(),
  hopsNotes: z.string(),
  yeastNotes: z.string(),
  processNotes: z.string(),
  grainBill: z.array(grainRowSchema),
  grainBillSummary: savedSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calculatorDraftSchema = z.object({
  key: z.string().min(1),
  recipeId: z.string().nullable(),
  settings: calcSettingsSchema,
  rows: z.array(grainRowSchema),
  loadedExample: z.boolean(),
  updatedAt: z.string(),
});

export const workflowTemplateSchema = z.object({
  rootFolderPattern: z.string(),
  folders: z.array(z.string()),
  recipeFolder: z.string(),
  fileBasePattern: z.string(),
  matchedToOriginalAppleScript: z.literal(false),
});

export const appSettingsSchema = z.object({ workflow: workflowTemplateSchema });

export function envelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    savedAt: z.string(),
    data,
  });
}

export const recipesEnvelope = envelopeSchema(z.array(recipeSchema));
export const libraryEnvelope = envelopeSchema(
  z.array(ingredientSchema).superRefine((list, ctx) => {
    const seen = new Set<string>();
    for (const i of list) {
      const k = i.name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (seen.has(k)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate ingredient name: ${i.name}` });
      seen.add(k);
    }
  }),
);
export const settingsEnvelope = envelopeSchema(appSettingsSchema);
export const draftsEnvelope = envelopeSchema(z.array(calculatorDraftSchema));
