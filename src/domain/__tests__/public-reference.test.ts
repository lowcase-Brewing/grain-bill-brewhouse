import { describe, expect, it } from "vitest";
import { seedLibrary } from "../library";
import { PUBLIC_REFERENCE_LIBRARY } from "../public-reference";

describe("curated public reference", () => {
  it("preserves every numeric planning value from the standard snapshot", () => {
    const seed = seedLibrary("2026-11-13T00:00:00.000Z");
    expect(PUBLIC_REFERENCE_LIBRARY).toHaveLength(23);
    expect(
      PUBLIC_REFERENCE_LIBRARY.map((i) => [i.id, i.name, i.category, i.ppg, i.extractFraction]),
    ).toEqual(seed.map((i) => [i.id, i.name, i.category, i.ppg, i.extractFraction]));
  });
  it("omits internal project notes, orphaned citations, and sheet cell explanations", () => {
    const prose = PUBLIC_REFERENCE_LIBRARY.map((i) => i.flavor + " " + i.notes).join(" ");
    expect(prose).not.toMatch(/Novena Noche|\[1\]|D is blank|docs.google.com/);
    expect(
      seedLibrary("2026-11-13T00:00:00.000Z").some((i) => i.flavor.includes("Novena Noche")),
    ).toBe(true);
  });
});
