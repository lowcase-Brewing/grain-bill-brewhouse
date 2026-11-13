import { describe, expect, it } from "vitest";
import { buildRecipeExport, parseRecipeExport, recipeToMarkdown, serializeRecipeExport } from "../export";
import { referenceExample } from "../examples";
import { createRecipe, DEFAULT_PARAMETERS, duplicateRecipe, applyGrainBillToRecipe, validateRecipeForm, emptyRecipeForm } from "../recipe";
import { calculateGrainBill, DEFAULT_CALC_SETTINGS } from "../calculator";
import { buildProjectManifest, PROPOSED_DEFAULT_WORKFLOW, sanitizePathComponent } from "../workflow";
import type { Recipe } from "../types";

const NOW = "2026-11-13T12:00:00.000Z";

function sample(): Recipe {
  const ex = referenceExample(NOW);
  const r = createRecipe(
    { name: "Novena Noche", style: "Dark Lager", version: "1.0.0", method: "partial-mash", parameters: DEFAULT_PARAMETERS, description: "d", notes: "n", hopsNotes: "h", yeastNotes: "y", processNotes: "p" },
    "rec-1",
    NOW,
    ex.rows,
  );
  return applyGrainBillToRecipe(r, DEFAULT_PARAMETERS, ex.rows, calculateGrainBill(DEFAULT_CALC_SETTINGS, ex.rows), NOW);
}

describe("path sanitizing", () => {
  it.each([
    ["../../etc/passwd", "etc-passwd"],
    ["a/b\\c", "a-b-c"],
    ["..", "untitled"],
    [".", "untitled"],
    ["", "untitled"],
    ["CON", "_CON"],
    ["nul.txt", "_nul.txt"],
    ["lpt1", "_lpt1"],
    ["  Brew: Logs?  ", "Brew- Logs-"],
    ["trailing dots...", "trailing dots"],
  ])("%s → %s", (input, out) => {
    expect(sanitizePathComponent(input)).toBe(out);
  });
  it("manifest paths never contain traversal segments", () => {
    const m = buildProjectManifest({ name: "../evil", version: "1.0.0", style: "x" }, { ...PROPOSED_DEFAULT_WORKFLOW, folders: ["..", "a/b", "CON"], recipeFolder: "a/b" }, NOW);
    const all = [m.rootFolder, ...m.folders, ...m.files.map((f) => f.path)];
    for (const p of all) {
      expect(p.split("/").every((seg) => seg !== ".." && seg !== "." && seg !== "")).toBe(true);
      expect(p).not.toContain("\\");
    }
    expect(m.folders).toContain(`${m.rootFolder}/_CON`);
    expect(m.automation.foldersCreated).toBe(false);
    expect(m.automation.appleScriptMapping).toBe("pending");
  });
  it("default manifest previews the proposed folders", () => {
    const m = buildProjectManifest({ name: "Novena Noche", version: "1.2.0", style: "Lager" }, PROPOSED_DEFAULT_WORKFLOW, NOW);
    expect(m.rootFolder).toBe("Novena Noche v1.2.0");
    expect(m.folders).toEqual(["Recipe", "Brew Logs", "Labels", "Assets"].map((f) => `Novena Noche v1.2.0/${f}`));
    expect(m.files[0]!.path).toBe("Novena Noche v1.2.0/Recipe/novena-noche-v1.2.0.recipe.json");
  });
});

describe("recipe export roundtrip", () => {
  it("JSON export parses back to an identical recipe", () => {
    const r = sample();
    const text = serializeRecipeExport(buildRecipeExport(r, PROPOSED_DEFAULT_WORKFLOW, NOW));
    const parsed = parseRecipeExport(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.recipe).toEqual(r);
    const obj = JSON.parse(text);
    expect(obj.format).toBe("lowcase-brewing.recipe-export");
    expect(obj.schemaVersion).toBe(1);
    expect(obj.calculation.estimatedOG).toBeCloseTo(1.0602935384615384, 14);
  });
  it("rejects malformed, foreign or future-version files", () => {
    expect(parseRecipeExport("{oops").ok).toBe(false);
    expect(parseRecipeExport(JSON.stringify({ format: "other" })).ok).toBe(false);
    const r = sample();
    const e = buildRecipeExport(r, PROPOSED_DEFAULT_WORKFLOW, NOW);
    expect(parseRecipeExport(JSON.stringify({ ...e, schemaVersion: 2 })).ok).toBe(false);
    expect(parseRecipeExport(JSON.stringify({ ...e, recipe: { ...r, version: "one" } })).ok).toBe(false);
  });
  it("markdown includes OG, delta and the pending AppleScript note", () => {
    const md = recipeToMarkdown(sample(), PROPOSED_DEFAULT_WORKFLOW, NOW);
    expect(md).toContain("**1.060**");
    expect(md).toContain("**+8.3 pts**");
    expect(md).toContain("AppleScript workflow mapping pending");
    expect(md).not.toMatch(/ABV/);
  });
});

describe("recipe rules", () => {
  it("new recipe defaults to version 1.0.0 and sheet parameters", () => {
    const f = emptyRecipeForm();
    expect(f.version).toBe("1.0.0");
    expect([f.coldFermenterGal, f.efficiencyPct, f.targetOG, f.extractRecoveryPct]).toEqual(["6.5", "70", "1.052", "90"]);
  });
  it("requires name and style; target OG optional", () => {
    const bad = validateRecipeForm(emptyRecipeForm());
    expect(bad.ok).toBe(false);
    const ok = validateRecipeForm({ ...emptyRecipeForm(), name: "X", style: "Y", targetOG: "" });
    expect(ok.ok && ok.value.parameters.targetOG).toBeNull();
  });
  it("saving grain bill back keeps all other recipe fields", () => {
    const r = sample();
    const next = applyGrainBillToRecipe(r, { ...DEFAULT_PARAMETERS, coldFermenterGal: 5 }, [], calculateGrainBill(DEFAULT_CALC_SETTINGS, []), NOW);
    expect([next.name, next.style, next.version, next.hopsNotes, next.notes, next.method]).toEqual([r.name, r.style, r.version, r.hopsNotes, r.notes, r.method]);
    expect(next.parameters.coldFermenterGal).toBe(5);
  });
  it("duplicate gets a unique name and deep-copied grain bill", () => {
    const r = sample();
    const d = duplicateRecipe(r, "rec-2", NOW, [r.name]);
    expect(d.name).toBe("Novena Noche (copy)");
    d.grainBill[0]!.lb = "99";
    expect(r.grainBill[0]!.lb).toBe("6");
  });
});
