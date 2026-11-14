import { describe, expect, it } from "vitest";
import { LocalBrewRepository, STORAGE_KEYS, type KeyValueStore } from "../local-repository";
import { StorageBlockedError } from "../repository";
import { createRecipe, DEFAULT_PARAMETERS } from "@/domain/recipe";

function memStore(init: Record<string, string> = {}): KeyValueStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}
const NOW = "2026-11-13T00:00:00.000Z";
const recipe = createRecipe(
  { name: "Test", style: "Ale", version: "1.0.0", method: "all-grain", parameters: DEFAULT_PARAMETERS, description: "", notes: "", hopsNotes: "", yeastNotes: "", processNotes: "" },
  "r1",
  NOW,
);

describe("LocalBrewRepository", () => {
  it("seeds the library on first load and roundtrips recipes", async () => {
    const store = memStore();
    const repo = new LocalBrewRepository(store, () => NOW);
    const snap = await repo.loadAll();
    expect(snap.library).toHaveLength(48);
    expect(snap.issues).toEqual([]);
    await repo.upsertRecipe(recipe);
    const again = await new LocalBrewRepository(store, () => NOW).loadAll();
    expect(again.recipes).toEqual([recipe]);
    expect(JSON.parse(store.map.get(STORAGE_KEYS.recipes)!).schemaVersion).toBe(1);
  });

  it("does not reseed a library the user emptied", async () => {
    const store = memStore();
    const repo = new LocalBrewRepository(store, () => NOW);
    await repo.loadAll();
    await repo.replaceLibrary([]);
    expect((await new LocalBrewRepository(store, () => NOW).loadAll()).library).toEqual([]);
  });

  it.each([
    ["unreadable-json", "{not json"],
    ["invalid-shape", JSON.stringify({ schemaVersion: 1, savedAt: NOW, data: [{ id: 1 }] })],
    ["unsupported-version", JSON.stringify({ schemaVersion: 9, savedAt: NOW, data: [] })],
  ])("reports %s and never overwrites it", async (kind, raw) => {
    const store = memStore({ [STORAGE_KEYS.recipes]: raw });
    const repo = new LocalBrewRepository(store, () => NOW);
    const snap = await repo.loadAll();
    expect(snap.issues[0]).toMatchObject({ section: "recipes", kind, raw });
    expect(snap.recipes).toEqual([]);
    await expect(repo.upsertRecipe(recipe)).rejects.toBeInstanceOf(StorageBlockedError);
    expect(store.map.get(STORAGE_KEYS.recipes)).toBe(raw);
    // other sections keep working
    await repo.saveSettings(snap.settings);
    // explicit reset is the only overwrite path
    await repo.resetSection("recipes");
    await repo.upsertRecipe(recipe);
    expect((await new LocalBrewRepository(store, () => NOW).loadAll()).recipes).toHaveLength(1);
  });

  it("rejects stored libraries with duplicate names", async () => {
    const repo1 = new LocalBrewRepository(memStore(), () => NOW);
    const lib = (await repo1.loadAll()).library;
    const raw = JSON.stringify({ schemaVersion: 1, savedAt: NOW, data: [lib[0]!, { ...lib[1]!, name: lib[0]!.name.toUpperCase() }] });
    const store = memStore({ [STORAGE_KEYS.library]: raw });
    const snap = await new LocalBrewRepository(store, () => NOW).loadAll();
    expect(snap.issues[0]!.section).toBe("library");
    expect(store.map.get(STORAGE_KEYS.library)).toBe(raw);
  });
});
