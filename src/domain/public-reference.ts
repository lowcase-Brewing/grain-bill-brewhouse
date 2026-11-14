import { seedLibrary } from "./library";

/** Reviewed standard reference snapshot; never read from an account repository. */
export const PUBLIC_REFERENCE_VERSION = "2026-11-13";
export const PUBLIC_REFERENCE_LIBRARY = seedLibrary(
  `${PUBLIC_REFERENCE_VERSION}T00:00:00.000Z`,
).map((ingredient) => ({
  ...ingredient,
  // Public reference prose omits project notes and orphaned sheet footnotes.
  // Numerical planning values and the private seed library stay unchanged.
  flavor: ingredient.flavor
    .replace(/Used in Novena Noche\.\s*/g, "")
    .replace(/\s*\[1\]/g, "")
    .trim(),
  notes: ingredient.notes
    .replace(/Original \[1\] reference marker has no linked source; /g, "")
    .replace(/Original \[1\] marker has no linked source\./g, "")
    .replace(/D is blank because PPG is specified directly\./g, "")
    .trim(),
}));
