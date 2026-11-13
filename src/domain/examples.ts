/**
 * The reference test case from the "Grain Bill" tab. Loaded only on explicit
 * request and always labeled as an example — never saved as a user recipe automatically.
 */
import { DEFAULT_CALC_SETTINGS } from "./calculator";
import { seedRecordToIngredient, snapshotIngredient } from "./library";
import { SEED_MALT_RECORDS } from "./seed-malts";
import type { CalcSettingsInput, GrainRowInput } from "./types";

/**
 * Expected values from exact rational arithmetic of the sheet formulas with the
 * stated inputs. The project brief listed 60.28523076923076 points /
 * OG 1.0602852307692308 / +8.28523076923076; the formula with these inputs gives
 * 391.908 / 6.5 = 60.29353846153846 (a 0.0083-point difference). Both display as
 * OG 1.060 and +8.3. See README "Reference example".
 */
export const REFERENCE_EXAMPLE_EXPECTED = {
  totalWeightLb: 13,
  mashedGrainLb: 9,
  totalPoints: 60.29353846153846,
  estimatedOG: 1.0602935384615384,
  differencePoints: 8.293538461538462,
  briefStatedPoints: 60.28523076923076,
  percentages: [46.153846, 7.692308, 15.384615, 30.769231],
  displayOG: "1.060",
  displayDifference: "+8.3",
} as const;

const EXAMPLE_ROWS: { name: string; lb: string }[] = [
  { name: "Maris Otter", lb: "6" },
  { name: "Vienna Malt", lb: "1" },
  { name: "German Munich I", lb: "2" },
  { name: "DME — Pale / Light (Unhopped)", lb: "4" },
];

export function referenceExample(now: string): { settings: CalcSettingsInput; rows: GrainRowInput[] } {
  return {
    settings: { ...DEFAULT_CALC_SETTINGS },
    rows: EXAMPLE_ROWS.map((r, i) => {
      const rec = SEED_MALT_RECORDS.find((m) => m.name === r.name);
      if (!rec) throw new Error(`Seed record missing: ${r.name}`);
      return {
        id: `example-${i + 1}`,
        ingredient: snapshotIngredient(seedRecordToIngredient(rec, now), now),
        lb: r.lb,
        oz: "",
      };
    }),
  };
}
