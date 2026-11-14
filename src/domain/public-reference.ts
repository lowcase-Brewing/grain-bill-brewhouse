import { seedLibrary } from "./library";
import { STANDARD_CATALOG_VERSION } from "./standard-malts";
import { publicMaltProse } from "./malt-presentation";

/** Reviewed standard reference snapshot; never read from an account repository. */
export const PUBLIC_REFERENCE_VERSION = STANDARD_CATALOG_VERSION;
export const PUBLIC_REFERENCE_LIBRARY = seedLibrary(
  "2026-11-14T00:00:00.000Z",
).map((ingredient) => ({
  ...ingredient,
  // Public reference prose omits project notes and orphaned sheet footnotes.
  // Numerical planning values and the private seed library stay unchanged.
  flavor: publicMaltProse(ingredient.flavor),
  notes: publicMaltProse(ingredient.notes),
}));
