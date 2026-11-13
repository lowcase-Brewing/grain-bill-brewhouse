import { describe, expect, it } from "vitest";
import { calculateGrainBill, DEFAULT_CALC_SETTINGS } from "../calculator";
import { referenceExample, REFERENCE_EXAMPLE_EXPECTED as X } from "../examples";
import { formatOG, formatSignedPoints } from "../format";
import { seedLibrary, snapshotIngredient } from "../library";
import type { CalcSettingsInput, GrainRowInput, Ingredient } from "../types";

const NOW = "2026-11-13T00:00:00.000Z";
const lib = seedLibrary(NOW);
const ing = (name: string): Ingredient => {
  const i = lib.find((x) => x.name === name);
  if (!i) throw new Error(name);
  return i;
};
const row = (name: string | null, lb: string, oz = "", id = Math.random().toString(36)): GrainRowInput => ({
  id,
  ingredient: name ? snapshotIngredient(ing(name), NOW) : null,
  lb,
  oz,
});
const S = (over: Partial<CalcSettingsInput> = {}): CalcSettingsInput => ({ ...DEFAULT_CALC_SETTINGS, ...over });
const DME = "DME — Pale / Light (Unhopped)";

describe("sheet parity — reference example", () => {
  const { settings, rows } = referenceExample(NOW);
  const r = calculateGrainBill(settings, rows);

  it("uses the sheet defaults 6.5 gal / 70% / 1.052 / 90%", () => {
    expect(DEFAULT_CALC_SETTINGS).toEqual({ coldFermenterGal: "6.5", efficiencyPct: "70", targetOG: "1.052", extractRecoveryPct: "90" });
  });
  it("totals 13 lb bill and 9 lb mashed grain", () => {
    expect(r.totalWeightLb).toBe(X.totalWeightLb);
    expect(r.mashedGrainLb).toBe(X.mashedGrainLb);
    expect(r.extractWeightLb).toBe(4);
  });
  it("matches total points and OG to full precision", () => {
    expect(r.totalPoints).toBeCloseTo(X.totalPoints, 12);
    expect(r.estimatedOG).toBeCloseTo(X.estimatedOG, 14);
  });
  it("equals the authoritative recomputation (6*36.57*.70 + 36.8*.70 + 2*36.11*.70 + 4*45*.90)/6.5", () => {
    expect(r.totalPoints).toBeCloseTo((6 * 36.57 * 0.7 + 1 * 36.8 * 0.7 + 2 * 36.11 * 0.7 + 4 * 45 * 0.9) / 6.5, 12);
    expect(r.totalPoints).toBeCloseTo(60.29353846153846, 12);
    expect(r.estimatedOG).toBeCloseTo(1.0602935384615384, 14);
    expect(r.differencePoints).toBeCloseTo(8.29353846153846, 10);
  });
  it("matches signed target difference", () => {
    expect(r.differencePoints).toBeCloseTo(X.differencePoints, 10);
  });
  it("matches ingredient percentages of total bill (extract included)", () => {
    r.rows.forEach((row, i) => expect(row.percentOfBill).toBeCloseTo(X.percentages[i]!, 5));
  });
  it("displays OG 1.060 and delta +8.3", () => {
    expect(formatOG(r.estimatedOG!)).toBe("1.060");
    expect(formatSignedPoints(r.differencePoints!)).toBe("+8.3");
  });
  it("row points follow WeightLb*PPG*factor/volume", () => {
    expect(r.rows[0]!.ogPoints).toBe((6 * 36.57 * 0.7) / 6.5);
    expect(r.rows[3]!.ogPoints).toBe((4 * 45 * 0.9) / 6.5);
  });
});

describe("grain vs extract treatment", () => {
  it("extract uses recovery, not brewhouse efficiency", () => {
    const a = calculateGrainBill(S({ efficiencyPct: "50" }), [row(DME, "1")]);
    const b = calculateGrainBill(S({ efficiencyPct: "100" }), [row(DME, "1")]);
    expect(a.totalPoints).toBe(b.totalPoints);
    expect(a.totalPoints).toBe((1 * 45 * 0.9) / 6.5);
  });
  it("grain uses efficiency, not extract recovery", () => {
    const a = calculateGrainBill(S({ extractRecoveryPct: "10" }), [row("Maris Otter", "1")]);
    const b = calculateGrainBill(S({ extractRecoveryPct: "100" }), [row("Maris Otter", "1")]);
    expect(a.totalPoints).toBe(b.totalPoints);
    expect(a.totalPoints).toBe((1 * 36.57 * 0.7) / 6.5);
  });
  it("mashed grain load excludes extract", () => {
    const r = calculateGrainBill(S(), [row("Maris Otter", "5"), row(DME, "3")]);
    expect(r.totalWeightLb).toBe(8);
    expect(r.mashedGrainLb).toBe(5);
  });
});

describe("weights", () => {
  it("accepts ounces-only rows", () => {
    const r = calculateGrainBill(S(), [row("Maris Otter", "", "8")]);
    expect(r.rows[0]!.weightLb).toBe(0.5);
    expect(r.estimatedOG).not.toBeNull();
  });
  it("allows ounces of 16 or more", () => {
    const r = calculateGrainBill(S(), [row("Maris Otter", "1", "24")]);
    expect(r.rows[0]!.weightLb).toBe(2.5);
    expect(r.rows[0]!.status).toBe("valid");
  });
  it.each([["-1"], ["abc"], ["Infinity"], ["1e400"], ["NaN"], ["1,5"]])("rejects lb %s without coercing to zero", (lb) => {
    const r = calculateGrainBill(S(), [row("Maris Otter", "5"), row("Vienna Malt", lb)]);
    expect(r.rows[1]!.status).toBe("invalid");
    expect(r.estimatedOG).toBeNull();
    expect(r.totalPoints).toBeNull();
    expect(r.differencePoints).toBeNull();
    expect(r.totalWeightLb).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/1 row needs attention/);
  });
  it("selected ingredient with zero or missing weight is invalid", () => {
    expect(calculateGrainBill(S(), [row("Maris Otter", "0", "0")]).rows[0]!.status).toBe("invalid");
    const missing = calculateGrainBill(S(), [row("Maris Otter", "", "")]);
    expect(missing.rows[0]!.status).toBe("invalid");
    expect(missing.estimatedOG).toBeNull();
  });
  it("weight without an ingredient is invalid", () => {
    const r = calculateGrainBill(S(), [row(null, "2")]);
    expect(r.rows[0]!.errors[0]).toMatch(/Choose an ingredient/);
    expect(r.estimatedOG).toBeNull();
  });
  it("ignores fully blank rows", () => {
    const r = calculateGrainBill(S(), [row("Maris Otter", "6"), row(null, "", ""), row(null, "  ", "")]);
    expect(r.activeRowCount).toBe(1);
    expect(r.rows[1]!.status).toBe("blank");
    expect(r.estimatedOG).toBeCloseTo(1 + (6 * 36.57 * 0.7) / 6.5 / 1000, 14);
  });
  it("no rows → no OG with a reason", () => {
    const r = calculateGrainBill(S(), []);
    expect(r.estimatedOG).toBeNull();
    expect(r.ogSuppressedReason).toBeTruthy();
  });
  it("ingredient snapshot with zero PPG is invalid for calculations", () => {
    const bad: GrainRowInput = { ...row(DME, "1"), ingredient: { ...snapshotIngredient(ing(DME), NOW), ppg: 0 } };
    const r = calculateGrainBill(S(), [bad]);
    expect(r.rows[0]!.status).toBe("invalid");
    expect(r.estimatedOG).toBeNull();
  });
});

describe("settings validation", () => {
  it.each([["0"], ["-6"], [""], ["x"]])("invalid volume %s suppresses OG", (v) => {
    const r = calculateGrainBill(S({ coldFermenterGal: v }), [row("Maris Otter", "6")]);
    expect(r.estimatedOG).toBeNull();
    expect(r.rows[0]!.ogPoints).toBeNull();
    expect(r.blockingSettingErrors.map((e) => e.field)).toContain("coldFermenterGal");
    expect(r.totalWeightLb).toBe(6); // weights don't depend on volume
  });
  it.each([["0"], ["100.1"], ["-5"], [""]])("invalid efficiency %s suppresses OG when grains are used", (e) => {
    const r = calculateGrainBill(S({ efficiencyPct: e }), [row("Maris Otter", "6")]);
    expect(r.estimatedOG).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/efficiency/i);
  });
  it("efficiency of exactly 100% is allowed", () => {
    expect(calculateGrainBill(S({ efficiencyPct: "100" }), [row("Maris Otter", "6")]).estimatedOG).not.toBeNull();
  });
  it.each([["0"], ["101"], [""]])("invalid recovery %s suppresses OG when extract is used", (rec) => {
    const r = calculateGrainBill(S({ extractRecoveryPct: rec }), [row("Maris Otter", "6"), row(DME, "2")]);
    expect(r.estimatedOG).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/recovery/i);
  });
  it("recovery is not required when no extract is used", () => {
    const r = calculateGrainBill(S({ extractRecoveryPct: "" }), [row("Maris Otter", "6")]);
    expect(r.estimatedOG).not.toBeNull();
  });
  it("blank target leaves difference blank", () => {
    const r = calculateGrainBill(S({ targetOG: "" }), [row("Maris Otter", "6")]);
    expect(r.estimatedOG).not.toBeNull();
    expect(r.differencePoints).toBeNull();
    expect(r.differenceReason).toMatch(/No target/);
  });
  it.each([["1.000"], ["1.301"], ["0.9"], ["abc"]])("invalid entered target %s suppresses aggregate OG and difference", (t) => {
    const r = calculateGrainBill(S({ targetOG: t }), [row("Maris Otter", "6")]);
    expect(r.estimatedOG).toBeNull();
    expect(r.totalPoints).toBeNull();
    expect(r.differencePoints).toBeNull();
    expect(r.settings.targetOG.error).toBeTruthy();
    expect(r.ogSuppressedReason).toMatch(/Target OG/);
    expect(r.blockingSettingErrors.map((e) => e.field)).toContain("targetOG");
  });
  it("target of exactly 1.300 is accepted; negative difference is signed", () => {
    const r = calculateGrainBill(S({ targetOG: "1.3" }), [row("Maris Otter", "6")]);
    expect(r.differencePoints!).toBeLessThan(0);
    expect(formatSignedPoints(r.differencePoints!)).toMatch(/^−/);
  });
  it.each([["0"], [""], ["abc"]])("source A8 validates efficiency %s even for an extract-only bill", (efficiencyPct) => {
    const r = calculateGrainBill(S({ efficiencyPct }), [row(DME, "4")]);
    expect(r.estimatedOG).toBeNull();
    expect(r.totalPoints).toBeNull();
    expect(r.differencePoints).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/efficiency/i);
    expect(r.blockingSettingErrors.map((e) => e.field)).toContain("efficiencyPct");
  });
});

describe("finite-input overflow protection", () => {
  it("marks an extreme finite row weight invalid instead of returning infinite points", () => {
    const r = calculateGrainBill(S({ coldFermenterGal: "1" }), [row("Maris Otter", "1e308")]);
    expect(r.rows[0]!.status).toBe("invalid");
    expect(r.rows[0]!.errors.join(" ")).toMatch(/too large/);
    expect(r.rows[0]!.ogPoints).toBeNull();
    expect(r.totalPoints).toBeNull();
    expect(r.estimatedOG).toBeNull();
    expect(r.differencePoints).toBeNull();
  });
  it("handles a tiny volume without exposing Infinity or NaN", () => {
    const r = calculateGrainBill(S({ coldFermenterGal: "1e-320" }), [row("Maris Otter", "6")]);
    expect(r.rows[0]!.status).toBe("invalid");
    expect(r.rows[0]!.ogPoints).toBeNull();
    expect(r.totalPoints).toBeNull();
    expect(r.estimatedOG).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/needs attention/);
  });
  it("suppresses bill totals when individually finite weights overflow their sum", () => {
    const lowPpg = (name: string): GrainRowInput => ({
      ...row(name, "1e308"),
      ingredient: { ...snapshotIngredient(ing(name), NOW), ppg: 1 },
    });
    const r = calculateGrainBill(
      S({ coldFermenterGal: "1e308", efficiencyPct: "1e-300" }),
      [lowPpg("Maris Otter"), lowPpg("Vienna Malt")],
    );
    expect(r.invalidRowCount).toBe(0);
    expect(r.totalWeightLb).toBeNull();
    expect(r.mashedGrainLb).toBeNull();
    expect(r.extractWeightLb).toBeNull();
    expect(r.rows.every((x) => x.percentOfBill === null)).toBe(true);
    expect(r.totalPoints).toBeNull();
    expect(r.estimatedOG).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/weight is too large/);
  });
  it("suppresses aggregate points when finite row points overflow their sum", () => {
    const rows = Array.from({ length: 6 }, () => row("Maris Otter", "1"));
    const r = calculateGrainBill(S({ coldFermenterGal: "1e-306", efficiencyPct: "100" }), rows);
    expect(r.invalidRowCount).toBe(0);
    expect(r.rows.every((x) => x.ogPoints !== null && Number.isFinite(x.ogPoints))).toBe(true);
    expect(r.totalWeightLb).toBe(6);
    expect(r.totalPoints).toBeNull();
    expect(r.estimatedOG).toBeNull();
    expect(r.differencePoints).toBeNull();
    expect(r.ogSuppressedReason).toMatch(/Total gravity points are too large/);
  });
});
