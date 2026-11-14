import { calculateGrainBill } from "./calculator";
import { formatLb, formatOG, formatPpg, formatSignedPoints } from "./format";
import type { CalcSettingsInput, GrainRowInput } from "./types";
import { PUBLIC_REFERENCE_VERSION } from "./public-reference";

export function calculationText(settings: CalcSettingsInput, rows: GrainRowInput[]): string {
  const result = calculateGrainBill(settings, rows);
  const lines = [
    "lowcase Brewing — Grain bill calculation",
    "",
    `Status: ${result.estimatedOG === null ? "INCOMPLETE — check the inputs below" : "Calculated gravity estimate"}`,
    `Standard reference version: ${PUBLIC_REFERENCE_VERSION}`,
    "",
    "SETTINGS",
    `Cold fermenter volume: ${settings.coldFermenterGal || "not entered"} US gal`,
    `Brewhouse efficiency: ${settings.efficiencyPct || "not entered"}%`,
    `Target OG: ${settings.targetOG || "not set"}`,
    `Extract recovery: ${settings.extractRecoveryPct || "not entered"}% (provisional, not measured)`,
    "",
    "GRAIN BILL",
  ];
  rows.forEach((row, i) => {
    const check = result.rows[i]!;
    if (check.status === "blank") return;
    lines.push(
      `${i + 1}. ${row.ingredient?.name ?? "Ingredient not selected"} (${row.ingredient?.category ?? "unknown category"})`,
      `   Entered: ${row.lb || "0"} lb + ${row.oz || "0"} oz; PPG: ${row.ingredient ? formatPpg(row.ingredient.ppg) : "unavailable"}`,
    );
    if (check.errors.length) lines.push(`   Needs attention: ${check.errors.join(" ")}`);
    if (check.pointsBlockedReason) lines.push(`   ${check.pointsBlockedReason}`);
  });
  lines.push(
    "",
    "RESULTS",
    `Estimated OG: ${result.estimatedOG === null ? "unavailable" : formatOG(result.estimatedOG)}`,
    `Total bill weight: ${result.totalWeightLb === null ? "unavailable" : `${formatLb(result.totalWeightLb)} lb`}`,
    `Mashed grain load: ${result.mashedGrainLb === null ? "unavailable" : `${formatLb(result.mashedGrainLb)} lb`}`,
    `Versus target: ${result.differencePoints === null ? (result.differenceReason ?? "unavailable") : `${formatSignedPoints(result.differencePoints)} points`}`,
  );
  if (result.ogSuppressedReason) lines.push(`Needs attention: ${result.ogSuppressedReason}`);
  lines.push(
    "",
    "ASSUMPTIONS",
    "Grain/adjunct points = lb × PPG × brewhouse efficiency / cold fermenter US gal.",
    "Extract points = lb × PPG × extract recovery / cold fermenter US gal.",
    "Estimated OG = 1 + total points / 1000. Full precision is used before display rounding.",
    "Generic reference values: verify actual malt/lot specifications.",
    "Gravity estimate only; no attenuation, ABV, or color prediction.",
    "This file was generated in your browser. Your guest calculation was not autosaved.",
  );
  return lines.join("\n") + "\n";
}
