/** Versioned recipe export (JSON), readable Markdown, and import parsing. */
import { calculateGrainBill } from "./calculator";
import { formatLb, formatOG, formatPercent, formatPoints, formatPpg, formatSignedPoints } from "./format";
import { parametersToSettingsInput } from "./recipe";
import { recipeSchema } from "./schema";
import { SHEET_SOURCE } from "./seed-malts";
import { BREW_METHOD_LABELS, type Recipe, type WorkflowTemplate } from "./types";
import { buildProjectManifest, exportFileNames, type ProjectManifest } from "./workflow";

export const RECIPE_EXPORT_FORMAT = "lowcase-brewing.recipe-export";
export const RECIPE_EXPORT_SCHEMA_VERSION = 1;

export interface RecipeExport {
  format: typeof RECIPE_EXPORT_FORMAT;
  schemaVersion: typeof RECIPE_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  app: { name: "lowcase Brewing" };
  formulaSource: typeof SHEET_SOURCE;
  recipe: Recipe;
  calculation: {
    note: string;
    totalWeightLb: number | null;
    mashedGrainLb: number | null;
    totalPoints: number | null;
    estimatedOG: number | null;
    differencePoints: number | null;
    suppressedReason: string | null;
  };
  manifest: ProjectManifest;
}

export function buildRecipeExport(recipe: Recipe, template: WorkflowTemplate, now: string): RecipeExport {
  const result = calculateGrainBill(parametersToSettingsInput(recipe.parameters), recipe.grainBill);
  return {
    format: RECIPE_EXPORT_FORMAT,
    schemaVersion: RECIPE_EXPORT_SCHEMA_VERSION,
    exportedAt: now,
    app: { name: "lowcase Brewing" },
    formulaSource: SHEET_SOURCE,
    recipe,
    calculation: {
      note: "Recomputed at export from the recipe's saved ingredient snapshots. Gravity prediction only; no ABV or color.",
      totalWeightLb: result.totalWeightLb,
      mashedGrainLb: result.mashedGrainLb,
      totalPoints: result.totalPoints,
      estimatedOG: result.estimatedOG,
      differencePoints: result.differencePoints,
      suppressedReason: result.ogSuppressedReason,
    },
    manifest: buildProjectManifest(recipe, template, now),
  };
}

export function serializeRecipeExport(e: RecipeExport): string {
  return JSON.stringify(e, null, 2) + "\n";
}

export type ParseExportResult = { ok: true; recipe: Recipe } | { ok: false; error: string };

export function parseRecipeExport(text: string): ParseExportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Unrecognized file." };
  const o = raw as Record<string, unknown>;
  if (o["format"] !== RECIPE_EXPORT_FORMAT) return { ok: false, error: "Not a lowcase Brewing recipe export." };
  if (o["schemaVersion"] !== RECIPE_EXPORT_SCHEMA_VERSION)
    return { ok: false, error: `Unsupported export version: ${String(o["schemaVersion"])}.` };
  const parsed = recipeSchema.safeParse(o["recipe"]);
  if (!parsed.success) return { ok: false, error: "The recipe in this file failed validation." };
  return { ok: true, recipe: parsed.data as Recipe };
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function section(title: string, body: string): string {
  return body.trim() ? `## ${title}\n\n${body.trim()}\n\n` : "";
}

export function recipeToMarkdown(recipe: Recipe, template: WorkflowTemplate, now: string): string {
  const p = recipe.parameters;
  const result = calculateGrainBill(parametersToSettingsInput(p), recipe.grainBill);
  const manifest = buildProjectManifest(recipe, template, now);
  let md = `# ${recipe.name}\n\n`;
  md += `*${recipe.style} · v${recipe.version} · ${BREW_METHOD_LABELS[recipe.method]}*\n\n`;
  if (recipe.description.trim()) md += `${recipe.description.trim()}\n\n`;
  md += `## Parameters\n\n| Setting | Value |\n|---|---|\n`;
  md += `| Cold fermenter volume | ${p.coldFermenterGal} US gal |\n`;
  md += `| Brewhouse efficiency | ${p.efficiencyPct}% |\n`;
  md += `| Extract recovery | ${p.extractRecoveryPct}% (provisional planning value) |\n`;
  md += `| Target OG | ${p.targetOG === null ? "—" : formatOG(p.targetOG)} |\n\n`;

  md += `## Grain bill\n\n`;
  if (result.activeRowCount === 0) md += `No ingredients yet.\n\n`;
  else {
    md += `| Ingredient | Category | lb | oz | Total lb | PPG | % bill | OG pts |\n|---|---|---:|---:|---:|---:|---:|---:|\n`;
    recipe.grainBill.forEach((row, i) => {
      const r = result.rows[i];
      if (!r || r.status === "blank") return;
      md += `| ${mdEscape(row.ingredient?.name ?? "(none)")} | ${row.ingredient?.category ?? "—"} | ${mdEscape(row.lb || "—")} | ${mdEscape(row.oz || "—")} | ${r.weightLb === null ? "—" : formatLb(r.weightLb)} | ${r.ppg === null ? "—" : formatPpg(r.ppg)} | ${r.percentOfBill === null ? "—" : formatPercent(r.percentOfBill)} | ${r.ogPoints === null ? "—" : formatPoints(r.ogPoints)} |\n`;
    });
    md += `\n`;
    if (result.totalWeightLb !== null)
      md += `- Total bill weight (incl. extract): **${formatLb(result.totalWeightLb)} lb**\n- Mashed grain load (excl. extract): **${formatLb(result.mashedGrainLb ?? 0)} lb**\n`;
    if (result.estimatedOG !== null) {
      md += `- Estimated OG: **${formatOG(result.estimatedOG)}** (${formatPoints(result.totalPoints ?? 0)} points)\n`;
      md += `- Difference from target: ${result.differencePoints === null ? `— (${result.differenceReason})` : `**${formatSignedPoints(result.differencePoints)} pts**`}\n`;
    } else md += `- Estimated OG not available: ${result.ogSuppressedReason}\n`;
    md += `\n> Gravity prediction only. Ingredient values are generic planning estimates from saved snapshots, not measured system or product specs.\n\n`;
  }

  md += section("Hops", recipe.hopsNotes);
  md += section("Yeast", recipe.yeastNotes);
  md += section("Process", recipe.processNotes);
  md += section("Notes", recipe.notes);

  md += `## Project folders (planned)\n\n`;
  md += `AppleScript workflow mapping pending — these folders were **not** created.\n\n`;
  md += "```\n" + [manifest.rootFolder + "/", ...manifest.folders.map((f) => "  " + f.slice(manifest.rootFolder.length + 1) + "/")].join("\n") + "\n```\n\n";
  md += `Files:\n\n${manifest.files.map((f) => `- \`${f.path}\``).join("\n")}\n\n`;
  md += `---\nExported ${now} from lowcase Brewing (schema v${RECIPE_EXPORT_SCHEMA_VERSION}). Formulas: ${SHEET_SOURCE.title}, ${SHEET_SOURCE.sync}, fetched ${SHEET_SOURCE.fetchedOn}.\n`;
  return md;
}

export { exportFileNames };
