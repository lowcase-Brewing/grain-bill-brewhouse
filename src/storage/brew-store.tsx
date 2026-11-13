/**
 * React binding for the repository. Loads after hydration (browser storage is
 * never read during SSR), exposes data + actions, and tracks save status.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { duplicateRecipe as duplicateRecipeDomain, createRecipe as createRecipeDomain, type RecipeCore } from "@/domain/recipe";
import type { AppSettings, CalculatorDraft, GrainRowInput, Ingredient, Recipe } from "@/domain/types";
import { LocalBrewRepository, STORAGE_KEYS } from "./local-repository";
import type { BrewRepository, RepositorySnapshot, SectionKey } from "./repository";

export type SaveState = "idle" | "saving" | "saved" | "error" | "blocked";

interface BrewStoreValue {
  status: "loading" | "ready" | "unavailable";
  data: RepositorySnapshot | null;
  saveState: SaveState;
  repositoryDescription: string;
  actions: {
    createRecipe(core: RecipeCore, grainBill?: GrainRowInput[]): Promise<Recipe | null>;
    saveRecipe(recipe: Recipe): Promise<boolean>;
    deleteRecipe(id: string): Promise<boolean>;
    duplicateRecipe(id: string): Promise<Recipe | null>;
    importRecipe(recipe: Recipe): Promise<Recipe | null>;
    saveIngredient(i: Ingredient): Promise<boolean>;
    deleteIngredient(id: string): Promise<boolean>;
    replaceLibrary(list: Ingredient[]): Promise<boolean>;
    saveSettings(s: AppSettings): Promise<boolean>;
    saveDraft(d: CalculatorDraft): Promise<boolean>;
    deleteDraft(key: string): Promise<boolean>;
    resetSection(section: SectionKey): Promise<boolean>;
  };
}

const Ctx = createContext<BrewStoreValue | null>(null);

export function newId(): string {
  return crypto.randomUUID();
}
export function nowIso(): string {
  return new Date().toISOString();
}

export function BrewStoreProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<BrewRepository | null>(null);
  const [status, setStatus] = useState<BrewStoreValue["status"]>("loading");
  const [data, setData] = useState<RepositorySnapshot | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lastErrorToast = useRef(0);

  const load = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    try {
      const snap = await repo.loadAll();
      setData(snap);
      setSaveState(snap.issues.length ? "blocked" : "saved");
      setStatus("ready");
    } catch {
      setSaveState("error");
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    try {
      const storage = window.localStorage;
      if (!storage) throw new Error("Browser storage is unavailable");
      repoRef.current = new LocalBrewRepository(storage);
    } catch {
      setStatus("unavailable");
      return;
    }
    void load();
    const onStorage = (e: StorageEvent) => {
      if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) void load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const run = useCallback(
    async (op: (repo: BrewRepository) => Promise<void>, apply: (d: RepositorySnapshot) => RepositorySnapshot, quiet = false) => {
      const repo = repoRef.current;
      if (!repo) return false;
      setSaveState("saving");
      try {
        await op(repo);
        setData((d) => (d ? apply(d) : d));
        setSaveState("saved");
        return true;
      } catch (err) {
        setSaveState(err instanceof Error && err.name === "StorageBlockedError" ? "blocked" : "error");
        const t = Date.now();
        if (!quiet || t - lastErrorToast.current > 5000) {
          lastErrorToast.current = t;
          toast.error("Couldn't save in this browser", {
            description: err instanceof Error ? err.message : "Storage may be full or unavailable.",
          });
        }
        return false;
      }
    },
    [],
  );

  const actions = useMemo<BrewStoreValue["actions"]>(
    () => ({
      async createRecipe(core, grainBill = []) {
        const r = createRecipeDomain(core, newId(), nowIso(), grainBill);
        const ok = await run((repo) => repo.upsertRecipe(r), (d) => ({ ...d, recipes: [...d.recipes, r] }));
        return ok ? r : null;
      },
      async saveRecipe(recipe) {
        return run(
          (repo) => repo.upsertRecipe(recipe),
          (d) => ({ ...d, recipes: d.recipes.map((r) => (r.id === recipe.id ? recipe : r)) }),
        );
      },
      async deleteRecipe(id) {
        const ok = await run((repo) => repo.deleteRecipe(id), (d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id) }));
        if (ok) await run((repo) => repo.deleteDraft(`recipe:${id}`), (d) => ({ ...d, drafts: d.drafts.filter((x) => x.key !== `recipe:${id}`) }), true);
        return ok;
      },
      async duplicateRecipe(id) {
        const src = data?.recipes.find((r) => r.id === id);
        if (!src || !data) return null;
        const copy = duplicateRecipeDomain(src, newId(), nowIso(), data.recipes.map((r) => r.name));
        const ok = await run((repo) => repo.upsertRecipe(copy), (d) => ({ ...d, recipes: [...d.recipes, copy] }));
        return ok ? copy : null;
      },
      async importRecipe(recipe) {
        const exists = data?.recipes.some((r) => r.id === recipe.id);
        const r: Recipe = exists ? { ...recipe, id: newId() } : recipe;
        const ok = await run((repo) => repo.upsertRecipe(r), (d) => ({ ...d, recipes: [...d.recipes, r] }));
        return ok ? r : null;
      },
      async saveIngredient(i) {
        return run(
          (repo) => repo.upsertIngredient(i),
          (d) => ({
            ...d,
            library: d.library.some((x) => x.id === i.id) ? d.library.map((x) => (x.id === i.id ? i : x)) : [...d.library, i],
          }),
        );
      },
      async deleteIngredient(id) {
        return run((repo) => repo.deleteIngredient(id), (d) => ({ ...d, library: d.library.filter((x) => x.id !== id) }));
      },
      async replaceLibrary(list) {
        return run((repo) => repo.replaceLibrary(list), (d) => ({ ...d, library: list }));
      },
      async saveSettings(s) {
        return run((repo) => repo.saveSettings(s), (d) => ({ ...d, settings: s }));
      },
      async saveDraft(draft) {
        return run(
          (repo) => repo.upsertDraft(draft),
          (d) => ({
            ...d,
            drafts: d.drafts.some((x) => x.key === draft.key) ? d.drafts.map((x) => (x.key === draft.key ? draft : x)) : [...d.drafts, draft],
          }),
          true,
        );
      },
      async deleteDraft(key) {
        return run((repo) => repo.deleteDraft(key), (d) => ({ ...d, drafts: d.drafts.filter((x) => x.key !== key) }), true);
      },
      async resetSection(section) {
        const ok = await run((repo) => repo.resetSection(section), (d) => d);
        if (ok) await load();
        return ok;
      },
    }),
    [run, data, load],
  );

  const value = useMemo<BrewStoreValue>(
    () => ({
      status,
      data,
      saveState,
      repositoryDescription:
        repoRef.current?.description ?? "Saved only in this browser's local storage on this device.",
      actions,
    }),
    [status, data, saveState, actions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrewStore(): BrewStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBrewStore must be used inside BrewStoreProvider");
  return v;
}
