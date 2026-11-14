import { describe, expect, it } from "vitest";
import { seedLibrary } from "@/domain/library";
import type { Recipe } from "@/domain/types";
import { cloudRecipeId, planLegacyImport } from "../legacy-import";

const now = "2026-11-13T00:00:00.000Z";
const recipe = (id: string, name: string) => ({ id, name } as unknown as Recipe);

describe("legacy browser import plan", () => {
  it("never overwrites existing cloud recipes, library names or settings", () => {
    const cloudLib = seedLibrary(now);
    const legacyLib = [...seedLibrary(now), { ...cloudLib[0]!, id: "custom-1", name: `  ${cloudLib[0]!.name.toUpperCase()} ` }, { ...cloudLib[0]!, id: "custom-2", name: "House Malt" }];
    const existing = recipe("11111111-1111-4111-8111-111111111111", "Cloud version");
    const plan = planLegacyImport(
      { recipes: [{ ...existing, name: "Browser version" }, recipe("22222222-2222-4222-8222-222222222222", "New")], library: legacyLib, settings: { workflow: {} } as never, drafts: [] },
      { recipes: [existing], library: cloudLib, hasSettings: true, drafts: [] },
    );
    expect(plan.recipes.map((r) => r.name)).toEqual(["New"]);
    expect(plan.library.map((i) => i.name)).toEqual(["House Malt"]);
    expect(plan.settings).toBeNull();
    expect(plan.skipped).toEqual({ recipes: 1, library: 49, settings: 1, drafts: 0 });
  });

  it("is idempotent: a retry after a completed import has nothing new", () => {
    const legacy = { recipes: [recipe("legacy-id", "Old")], library: seedLibrary(now), settings: null, drafts: [{ key: "recipe:legacy-id", recipeId: "legacy-id" } as never] };
    const first = planLegacyImport(legacy, { recipes: [], library: seedLibrary(now), hasSettings: false, drafts: [] });
    expect(first.recipes[0]!.id).toBe(cloudRecipeId("legacy-id"));
    expect(first.drafts[0]!.key).toBe(`recipe:${cloudRecipeId("legacy-id")}`);
    const retry = planLegacyImport(legacy, { recipes: first.recipes, library: seedLibrary(now), hasSettings: false, drafts: first.drafts });
    expect(retry.recipes).toHaveLength(0);
    expect(retry.drafts).toHaveLength(0);
  });

  it("maps non-UUID recipe ids to a stable UUID", () => {
    expect(cloudRecipeId("abc")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(cloudRecipeId("abc")).toBe(cloudRecipeId("abc"));
  });
});
