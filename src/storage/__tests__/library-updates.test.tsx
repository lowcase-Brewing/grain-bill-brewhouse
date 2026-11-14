import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocalBrewRepository, STORAGE_KEYS, type KeyValueStore } from "../local-repository";
import { CloudBrewRepository } from "../cloud-repository";
import { BrewStoreProvider } from "../brew-store";
import { LibraryUpdates } from "@/components/brew/library-updates";
import { seedLibrary } from "@/domain/library";
import { selectedStandardAdditions } from "@/domain/library-updates";
import type { Ingredient } from "@/domain/types";

const now = "2026-11-14T00:00:00Z";
const library = seedLibrary(now);
const first = library[0];
if (!first) throw new Error("Missing standard catalog");
const malt: Ingredient = first;
function memory() {
  const map = new Map<string, string>();
  const store: KeyValueStore = { getItem: (k) => map.get(k) ?? null, setItem: (k,v) => { map.set(k,v); }, removeItem: (k) => { map.delete(k); } };
  return { store, map };
}
/** In-memory account client, never contacts a hosted account. */
function fakeCloud(initial: Ingredient[] = []) {
  let user = "account-a";
  const docs = new Map(initial.map((i) => [i.id, i]));
  let failId: string | null = null;
  const writes: unknown[] = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: user } } } }) },
    from: (table: string) => {
      if (table !== "brew_ingredients") throw new Error("Unexpected table");
      let value: { id: string; doc: Ingredient; owner_id: string } | null = null;
      const filters: [string, string][] = [];
      const query = {
        select: () => query,
        eq: (key: string, v: string) => { filters.push([key,v]); return query; },
        upsert: (v: typeof value, options: { ignoreDuplicates?: boolean }) => {
          expect(options.ignoreDuplicates).toBe(true);
          value = v; return query;
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (value) {
            writes.push(value);
            expect(value.owner_id).toBe("account-a");
            if (value.id === failId) return Promise.resolve(resolve({ data: null, error: { message: "Simulated connection failure" } }));
            const present = docs.has(value.id);
            if (!present) docs.set(value.id, value.doc);
            return Promise.resolve(resolve({ data: present ? [] : [{ id: value.id }], error: null }));
          }
          expect(filters).toContainEqual(["owner_id", "account-a"]);
          return Promise.resolve(resolve({ data: [...docs.values()].map((doc) => ({ doc, schema_version: 1 })), error: null }));
        },
      };
      return query;
    },
  };
  return { repo: new CloudBrewRepository(client as never, "account-a"), docs, writes, fail: (id: string | null) => { failId = id; }, switchAccount: () => { user = "account-b"; } };
}
afterEach(cleanup);
describe("selected insert-only updates", () => {
  it("does not repopulate custom, empty or deleted libraries without selected ids", async () => {
    const { store } = memory(); const repo = new LocalBrewRepository(store, () => now);
    await repo.loadAll(); await repo.replaceLibrary([]);
    expect((await repo.loadAll()).library).toEqual([]);
    expect((await repo.addStandardIngredients([])).library).toEqual([]);
    const edited = { ...malt, ppg: 23, extractFraction: .5, notes: "My lot" };
    await repo.replaceLibrary([edited]);
    const other = library.find((i) => i.id !== malt.id);
    if (!other) throw new Error("Missing second entry");
    const result = await repo.addStandardIngredients([malt.id, other.id]);
    expect(result.insertedIds).toEqual([other.id]);
    expect(result.library.find((i) => i.id === malt.id)).toEqual(edited);
    expect((await repo.addStandardIngredients([other.id])).insertedIds).toEqual([]);
    await repo.deleteIngredient(other.id);
    expect((await repo.loadAll()).library.some((i) => i.id === other.id)).toBe(false);
    expect(selectedStandardAdditions(result.library, [], now)).toEqual([]);
  });
  it("rechecks stale local previews before writing and never overwrites another edit", async () => {
    const { store } = memory(); const repo = new LocalBrewRepository(store, () => now);
    await repo.loadAll(); await repo.replaceLibrary([]);
    const second = new LocalBrewRepository(store, () => now); await second.loadAll();
    const edited = { ...malt, notes: "Changed after preview", ppg: 23, extractFraction: .5 };
    await second.upsertIngredient(edited);
    const result = await repo.addStandardIngredients([malt.id]);
    expect(result.skippedIds).toEqual([malt.id]); expect(result.library).toEqual([edited]);
  });
  it("keeps existing ids and alias-name edits and retries only failed cloud additions", async () => {
    const victory = library.find((i) => i.name === "Victory Malt (Briess)");
    const rye = library.find((i) => i.name === "Rye Malt (Briess)");
    if (!victory || !rye) throw new Error("Missing products");
    const custom = { ...victory, id: "custom-victory", name: "Victory", ppg: 23, extractFraction: .5 };
    const cloud = fakeCloud([custom]); cloud.fail(rye.id);
    const result = await cloud.repo.addStandardIngredients([malt.id, victory.id, rye.id]);
    expect(result.insertedIds).toEqual([malt.id]); expect(result.skippedIds).toEqual([victory.id]);
    expect(result.failed).toEqual([{ id: rye.id, message: "Simulated connection failure" }]);
    expect(cloud.docs.get(custom.id)).toEqual(custom);
    cloud.fail(null);
    const retry = await cloud.repo.addStandardIngredients([malt.id, victory.id, rye.id]);
    expect(retry.insertedIds).toEqual([rye.id]); expect(retry.failed).toEqual([]);
    expect((await cloud.repo.addStandardIngredients([rye.id])).insertedIds).toEqual([]);
  });
  it("refuses writes after switching accounts", async () => {
    const cloud = fakeCloud(); cloud.switchAccount();
    await expect(cloud.repo.addStandardIngredients([malt.id])).rejects.toMatchObject({ name: "SessionChangedError" });
    expect(cloud.writes).toEqual([]);
  });
  it("shows selected additions, save failure and safe retry with a simulated repository", async () => {
    const { store, map } = memory(); const repo = new LocalBrewRepository(store, () => now);
    await repo.loadAll(); await repo.replaceLibrary([]);
    const original = store.setItem;
    let failing = true;
    store.setItem = (k,v) => { if (failing && k === STORAGE_KEYS.library) throw new Error("Offline simulation"); original(k,v); };
    render(<BrewStoreProvider createRepository={() => repo}><LibraryUpdates/></BrewStoreProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Review library updates (48)" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Maris Otter/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add selected ingredients (1)" }));
    expect(await screen.findByText(/could not be confirmed/)).toBeVisible();
    expect(JSON.parse(map.get(STORAGE_KEYS.library) ?? "{}").data).toEqual([]);
    failing = false;
    fireEvent.click(within(dialog).getByRole("button", { name: "Add selected ingredients (1)" }));
    await waitFor(() => expect(screen.getByText(/1 added; 0 already present/)).toBeVisible());
    expect(JSON.parse(map.get(STORAGE_KEYS.library) ?? "{}").data.map((i: Ingredient) => i.id)).toEqual([malt.id]);
  });
});