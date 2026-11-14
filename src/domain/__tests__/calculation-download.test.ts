import { describe, expect, it } from "vitest";
import { calculationText } from "../calculation-download";
import { referenceExample } from "../examples";
import { DEFAULT_CALC_SETTINGS } from "../calculator";

describe("public calculation download", () => {
  it("exports the reference bill, settings, rounded results and assumptions", () => {
    const ex = referenceExample("2026-11-14T00:00:00Z");
    const text = calculationText(ex.settings, ex.rows);
    expect(text).toContain("Estimated OG: 1.060");
    expect(text).toContain("Versus target: +8.3 points");
    expect(text).toContain("Total bill weight: 13 lb");
    expect(text).toContain("Mashed grain load: 9 lb");
    expect(text).toContain("DME — Pale / Light (Unhopped) (Extract)");
    expect(text).toContain("Extract recovery: 90% (provisional, not measured)");
    expect(text).toContain("Standard reference version: 2026-11-13");
    expect(text).not.toMatch(/owner_id|access_token|docs.google.com/);
  });
  it("labels invalid work incomplete and never exports the old valid result", () => {
    const ex = referenceExample("2026-11-14T00:00:00Z");
    ex.rows[0]!.lb = "-1";
    const text = calculationText(ex.settings, ex.rows);
    expect(text).toContain("Status: INCOMPLETE");
    expect(text).toContain("Pounds can't be negative.");
    expect(text).toContain("Estimated OG: unavailable");
    expect(text).not.toContain("Estimated OG: 1.060");
  });
  it("identifies a blank target without inventing a comparison", () => {
    const ex = referenceExample("2026-11-14T00:00:00Z");
    const text = calculationText({ ...DEFAULT_CALC_SETTINGS, targetOG: "" }, ex.rows);
    expect(text).toContain("Target OG: not set");
    expect(text).toContain("No target OG set.");
  });
});
