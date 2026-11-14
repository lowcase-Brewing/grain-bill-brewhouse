import { describe, expect, it } from "vitest";
import { ACTIVE_STANDARD_CATALOG, LEGACY_STANDARD_CATALOG, STANDARD_CATALOG, STANDARD_CATALOG_VERSION } from "../standard-malts";
import { historicalSheetLibrary, seedLibrary, snapshotIngredient } from "../library";
import { ingredientSchema } from "../schema";
import { dryToAsIs } from "../malt-reference";
import { ingredientSearchText, missingStandardIngredients, selectedStandardAdditions } from "../library-updates";
import { seedIngredientId } from "../seed-malts";
import { calculateGrainBill, DEFAULT_CALC_SETTINGS } from "../calculator";
import { buildRecipeExport, parseRecipeExport, serializeRecipeExport } from "../export";
import { createRecipe, DEFAULT_PARAMETERS } from "../recipe";
import { PROPOSED_DEFAULT_WORKFLOW } from "../workflow";

const now = "2026-11-14T00:00:00Z";
const get = (name: string) => {
  const value = STANDARD_CATALOG.find((i) => i.ingredient.name === name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
describe("expanded catalog rules", () => {
  it("contains exactly 48 active unique identities and 8 legacy buckets", () => {
    expect(ACTIVE_STANDARD_CATALOG).toHaveLength(48);
    expect(LEGACY_STANDARD_CATALOG).toHaveLength(8);
    expect(new Set(STANDARD_CATALOG.map((i) => i.id)).size).toBe(56);
    expect(new Set(ACTIVE_STANDARD_CATALOG.map((i) => i.ingredient.name.toLowerCase())).size).toBe(48);
    expect(seedLibrary(now)).toHaveLength(48);
  });
  it("keeps 15 original active identities and all 23 historical numeric values", () => {
    const old = historicalSheetLibrary(now);
    expect(old).toHaveLength(23);
    expect(ACTIVE_STANDARD_CATALOG.filter((i) => old.some((o) => o.id === i.id))).toHaveLength(15);
    for (const i of old) {
      const current = STANDARD_CATALOG.find((c) => c.id === i.id);
      expect(current?.ingredient.ppg).toBe(i.ppg);
      expect(current?.ingredient.extractFraction).toBe(i.extractFraction);
    }
  });
  it("has finite positive potentials without adding calculator categories", () => {
    for (const { ingredient: i } of STANDARD_CATALOG) {
      expect(ingredientSchema.safeParse(i).success).toBe(true);
      expect(Number.isFinite(i.ppg) && i.ppg > 0).toBe(true);
      if (i.category === "Extract") expect(i.extractFraction).toBeNull();
      else expect(i.ppg).toBeCloseTo((i.extractFraction ?? 0) * 46, 12);
    }
    expect(ACTIVE_STANDARD_CATALOG.filter((i) => i.ingredient.category === "Extract")).toHaveLength(8);
  });
  it("converts dry yield and moisture to as-is without rounding", () => {
    expect(dryToAsIs(.84, .045)).toBe(.8021999999999999);
    expect(get("Rye Malt (Briess)").ingredient.ppg).toBe(.84 * (1 - .045) * 46);
    expect(get("Golden Promise (Simpsons)").ingredient.extractFraction).toBe(.81 * .963);
    expect(() => dryToAsIs(306, .04)).toThrow();
    expect(() => dryToAsIs(.8, 1)).toThrow();
  });
  it("separates official analysis from generic defaults and direct extract potential", () => {
    const newEntries = ACTIVE_STANDARD_CATALOG.filter((i) => i.reference.yield.kind !== "historical-estimate");
    expect(newEntries).toHaveLength(33);
    expect(newEntries.filter((i) => i.reference.yield.kind === "manufacturer-analysis")).toHaveLength(20);
    expect(newEntries.filter((i) => i.reference.yield.kind === "generic-estimate")).toHaveLength(13);
    for (const i of newEntries) {
      expect(i.reference.sourceUrl.startsWith("https://")).toBe(true);
      expect(i.reference.checkedOn).toBe("2026-11-14");
      if (i.reference.yield.kind === "generic-estimate") expect(i.reference.yield.basis).toMatch(/NOT a manufacturer/);
    }
    expect(get("Peated Malt (Crisp)").ingredient.extractFraction).toBe(.786);
    expect(get("Wheat DME (Briess)").ingredient.ppg).toBe(44);
    expect(get("Wheat LME (Briess)").ingredient.ppg).toBe(36);
  });
  it("preserves oat id and recognizes old spelling and manufacturer aliases", () => {
    const oat = get("Flaked Oats").ingredient;
    expect(oat.id).toBe(seedIngredientId("Flakes Oats"));
    expect(ingredientSearchText(oat)).toContain("flakes oats");
    expect(missingStandardIngredients([{ ...oat, id: "custom-oats", name: "Flakes Oats" }], now).some((i) => i.id === oat.id)).toBe(false);
    expect(selectedStandardAdditions([{ ...get("Victory Malt (Briess)").ingredient, id: "custom", name: "Victory" }], [get("Victory Malt (Briess)").id], now)).toEqual([]);
  });
  it("uses grain efficiency for new malt and recovery only for new liquid extract", () => {
    const malt = get("Rye Malt (Briess)").ingredient;
    const extract = get("Wheat LME (Briess)").ingredient;
    const result = calculateGrainBill(DEFAULT_CALC_SETTINGS, [malt, extract].map((i, idx) => ({ id: String(idx), ingredient: snapshotIngredient(i, now), lb: "1", oz: "" })));
    expect(result.totalPoints).toBe((malt.ppg * .7 + 36 * .9) / 6.5);
    expect(result.mashedGrainLb).toBe(1);
  });
  it("keeps old oat/broad snapshots and old exports readable", () => {
    const old = historicalSheetLibrary(now).filter((i) => ["Flakes Oats", "Smoked Malts"].includes(i.name));
    const rows = old.map((i) => ({ id: i.id, ingredient: snapshotIngredient(i, now), lb: "1", oz: "" }));
    const recipe = createRecipe({ name: "Historical", style: "Ale", version: "1.0.0", method: "all-grain", parameters: DEFAULT_PARAMETERS, description: "", notes: "", hopsNotes: "", yeastNotes: "", processNotes: "" }, "r", now, rows);
    const file = buildRecipeExport(recipe, PROPOSED_DEFAULT_WORKFLOW, now);
    expect(file.catalogVersion).toBe(STANDARD_CATALOG_VERSION);
    delete file.catalogVersion;
    const read = parseRecipeExport(serializeRecipeExport(file));
    expect(read.ok && read.recipe.grainBill).toEqual(rows);
    expect(calculateGrainBill(DEFAULT_CALC_SETTINGS, rows).totalPoints).toBe((33.12 + 35.88) * .7 / 6.5);
  });
});