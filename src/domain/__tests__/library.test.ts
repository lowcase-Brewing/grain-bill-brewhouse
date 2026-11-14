import { describe, expect, it } from "vitest";
import {
  deriveGrainPpg,
  findDuplicateNames,
  seedLibrary,
  historicalSheetLibrary,
  snapshotIngredient,
  snapshotState,
  validateIngredientDraft,
  emptyIngredientDraft,
} from "../library";
import { SEED_MALT_RECORDS } from "../seed-malts";
import { calculateGrainBill, DEFAULT_CALC_SETTINGS } from "../calculator";

const NOW = "2026-11-13T00:00:00.000Z";

describe("seed library", () => {
  const lib = historicalSheetLibrary(NOW);
  it("includes all 23 reference entries verbatim", () => {
    expect(lib).toHaveLength(23);
    lib.forEach((i, idx) => {
      const s = SEED_MALT_RECORDS[idx]!;
      expect([i.name, i.category, i.origin, i.extractFraction, i.ppg, i.flavor, i.notes]).toEqual([
        s.name, s.category, s.origin, s.extractFraction, s.ppg, s.flavor, s.notes,
      ]);
    });
  });
  it("grain PPG equals extractFraction * 46; extract PPG is direct", () => {
    for (const i of lib) {
      if (i.category === "Extract") expect(i.extractFraction).toBeNull();
      else expect(i.ppg).toBeCloseTo(deriveGrainPpg(i.extractFraction!), 10);
    }
    expect(lib.find((i) => i.category === "Extract")!.ppg).toBe(45);
  });
  it("has unique names and unique ids", () => {
    expect(findDuplicateNames(lib)).toEqual([]);
    expect(new Set(lib.map((i) => i.id)).size).toBe(lib.length);
  });
});

describe("ingredient validation", () => {
  const lib = seedLibrary(NOW);
  it("rejects duplicate names case- and whitespace-insensitively", () => {
    const r = validateIngredientDraft({ ...emptyIngredientDraft(), name: "  maris   OTTER ", extractFraction: "0.8" }, lib);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toMatch(/already exists/);
  });
  it("allows keeping the same name when editing that entry", () => {
    const mo = lib[0]!;
    const r = validateIngredientDraft({ ...emptyIngredientDraft(), name: "Maris Otter", extractFraction: "0.8" }, lib, mo.id);
    expect(r.ok).toBe(true);
  });
  it("findDuplicateNames flags duplicates", () => {
    expect(findDuplicateNames([{ name: "A" }, { name: " a " }, { name: "B" }])).toEqual(["A"]);
  });
  it.each([["0"], ["1.01"], ["-0.2"], ["x"], [""]])("rejects grain fraction %s outside (0,1]", (f) => {
    expect(validateIngredientDraft({ ...emptyIngredientDraft(), name: "New", extractFraction: f }, lib).ok).toBe(false);
  });
  it("derives grain PPG from fraction (1 → 46)", () => {
    const r = validateIngredientDraft({ ...emptyIngredientDraft(), name: "New", extractFraction: "1" }, lib);
    expect(r.ok && r.value.ppg).toBe(46);
  });
  it("extract: PPG direct, nonnegative finite; 0 allowed with warning", () => {
    const base = { ...emptyIngredientDraft(), name: "LME", category: "Extract" as const };
    expect(validateIngredientDraft({ ...base, ppg: "-1" }, lib).ok).toBe(false);
    expect(validateIngredientDraft({ ...base, ppg: "Infinity" }, lib).ok).toBe(false);
    const zero = validateIngredientDraft({ ...base, ppg: "0" }, lib);
    expect(zero.ok && zero.warnings.length).toBe(1);
    const ok = validateIngredientDraft({ ...base, ppg: "37" }, lib);
    expect(ok.ok && ok.value).toMatchObject({ ppg: 37, extractFraction: null });
  });
});

describe("ingredient snapshots", () => {
  it("library edits don't change saved recipe calculations, but are detected", () => {
    const lib = seedLibrary(NOW);
    const mo = lib[0]!;
    const rows = [{ id: "r1", ingredient: snapshotIngredient(mo, NOW), lb: "6", oz: "" }];
    const before = calculateGrainBill(DEFAULT_CALC_SETTINGS, rows).totalPoints;
    const edited = lib.map((i) => (i.id === mo.id ? { ...i, extractFraction: 0.5, ppg: 23 } : i));
    const after = calculateGrainBill(DEFAULT_CALC_SETTINGS, rows).totalPoints;
    expect(after).toBe(before);
    expect(snapshotState(rows[0]!.ingredient!, lib)).toBe("current");
    expect(snapshotState(rows[0]!.ingredient!, edited)).toBe("library-changed");
    expect(snapshotState(rows[0]!.ingredient!, edited.filter((i) => i.id !== mo.id))).toBe("not-in-library");
  });
});
