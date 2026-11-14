import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MaltDetails } from "@/components/brew/malt-details";
import { STANDARD_CATALOG } from "@/domain/standard-malts";
import { hasCustomizedReferenceValues, publicMaltCardNotes } from "@/domain/malt-presentation";

afterEach(cleanup);
const rye = STANDARD_CATALOG.find((i) => i.ingredient.name === "Rye Malt (Briess)");
if (!rye) throw new Error("Missing Rye reference");
const ingredient = rye.ingredient;

describe("malt reference presentation boundaries", () => {
  it("shows original planning provenance without exposing the historical sheet", () => {
    const historical = STANDARD_CATALOG.filter((i) => i.reference.yield.kind === "historical-estimate");
    expect(historical).toHaveLength(23);
    for (const entry of historical) {
      expect(entry.reference.sourceUrl).toBeNull();
      const view = render(<MaltDetails id={entry.id}/>);
      fireEvent.click(screen.getByText("Product & yield details"));
      expect(screen.getByText("Original lowcase planning reference, 2026-11-13")).toBeVisible();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it.each([
    { name: "My rye lot" },
    { ppg: 23 },
    { extractFraction: .5 },
  ])("identifies a customized reference without mutating it: %j", (edit) => {
    const customized = { ...ingredient, ...edit, notes: "Personal lot notes" };
    const before = structuredClone(customized);
    expect(hasCustomizedReferenceValues(ingredient)).toBe(false);
    expect(hasCustomizedReferenceValues(customized)).toBe(true);
    render(<MaltDetails id={customized.id} accountIngredient={customized}/>);
    fireEvent.click(screen.getByText("Product & yield details"));
    expect(screen.getByText("Standard reference specs.")).toBeVisible();
    expect(screen.getByText(/Your account’s displayed values take precedence/)).toBeVisible();
    expect(screen.getByText(/not manufacturer-verified by this reference/)).toBeVisible();
    expect(customized).toEqual(before);
  });

  it("uses short public handling notes while preserving full stored notes and potentials", () => {
    const before = structuredClone(ingredient);
    expect(ingredient.notes).toContain("Fine-grind dry fraction");
    expect(publicMaltCardNotes(ingredient)).toBe("Mash; huskless rye can slow lautering.");
    expect(ingredient).toEqual(before);
    expect(ingredient.ppg).toBe(.84 * (1 - .045) * 46);
  });
});