/** localStorage-backed repository with versioned, validated envelopes per section. */
import { seedLibrary } from "@/domain/library";
import {
  SCHEMA_VERSION,
  draftsEnvelope,
  libraryEnvelope,
  recipesEnvelope,
  settingsEnvelope,
} from "@/domain/schema";
import type { AppSettings, CalculatorDraft, Ingredient, Recipe } from "@/domain/types";
import { PROPOSED_DEFAULT_WORKFLOW } from "@/domain/workflow";
import type { ZodTypeAny } from "zod";
import {
  StorageBlockedError,
  type BrewRepository,
  type RepositorySnapshot,
  type SectionIssue,
  type SectionKey,
} from "./repository";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEYS: Record<SectionKey, string> = {
  recipes: "lowcase-brewing:recipes",
  library: "lowcase-brewing:malt-library",
  settings: "lowcase-brewing:settings",
  drafts: "lowcase-brewing:calculator-drafts",
};

const SCHEMAS: Record<SectionKey, ZodTypeAny> = {
  recipes: recipesEnvelope,
  library: libraryEnvelope,
  settings: settingsEnvelope,
  drafts: draftsEnvelope,
};

export function defaultSettings(): AppSettings {
  return { workflow: { ...PROPOSED_DEFAULT_WORKFLOW, folders: [...PROPOSED_DEFAULT_WORKFLOW.folders] } };
}

type ReadResult<T> = { state: "absent" } | { state: "ok"; data: T } | { state: "issue"; issue: SectionIssue };

export function readSection<T>(store: KeyValueStore, section: SectionKey): ReadResult<T> {
  const raw = store.getItem(STORAGE_KEYS[section]);
  if (raw === null) return { state: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "issue", issue: { section, kind: "unreadable-json", raw, message: "Stored data isn't valid JSON." } };
  }
  const version = (parsed as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === "number" && version !== SCHEMA_VERSION) {
    return {
      state: "issue",
      issue: { section, kind: "unsupported-version", raw, message: `Stored with schema v${version}; this app reads v${SCHEMA_VERSION}.` },
    };
  }
  const result = SCHEMAS[section].safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      state: "issue",
      issue: { section, kind: "invalid-shape", raw, message: `Stored data failed validation${first ? `: ${first.path.join(".") || "root"} ${first.message}` : "."}` },
    };
  }
  return { state: "ok", data: (result.data as { data: T }).data };
}

export function serializeSection(data: unknown, now: string): string {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: now, data });
}

export class LocalBrewRepository implements BrewRepository {
  readonly kind = "browser-local" as const;
  readonly description =
    "Saved only in this browser's local storage on this device. Not synced, not backed up, and cleared if you clear site data.";
  private cache: RepositorySnapshot | null = null;
  private blocked = new Set<SectionKey>();

  constructor(
    private store: KeyValueStore,
    private now: () => string = () => new Date().toISOString(),
  ) {}

  async loadAll(): Promise<RepositorySnapshot> {
    const issues: SectionIssue[] = [];
    this.blocked.clear();
    const take = <T>(section: SectionKey, fallback: () => T): T => {
      const r = readSection<T>(this.store, section);
      if (r.state === "ok") return r.data;
      if (r.state === "issue") {
        issues.push(r.issue);
        this.blocked.add(section);
      }
      return fallback();
    };
    const recipes = take<Recipe[]>("recipes", () => []);
    let seededLibrary = false;
    const library = take<Ingredient[]>("library", () => {
      seededLibrary = true;
      return seedLibrary(this.now());
    });
    const settings = take<AppSettings>("settings", defaultSettings);
    const drafts = take<CalculatorDraft[]>("drafts", () => []);
    this.cache = { recipes, library, settings, drafts, issues };
    // Seed the library only when nothing was stored (never over unreadable data).
    if (seededLibrary && !this.blocked.has("library")) this.write("library", library);
    return structuredClone(this.cache);
  }

  private snap(): RepositorySnapshot {
    if (!this.cache) throw new Error("Repository not loaded");
    return this.cache;
  }

  private write(section: SectionKey, data: unknown) {
    if (this.blocked.has(section)) throw new StorageBlockedError(section);
    this.store.setItem(STORAGE_KEYS[section], serializeSection(data, this.now()));
  }

  async upsertRecipe(recipe: Recipe) {
    const s = this.snap();
    const next = s.recipes.some((r) => r.id === recipe.id)
      ? s.recipes.map((r) => (r.id === recipe.id ? recipe : r))
      : [...s.recipes, recipe];
    this.write("recipes", next);
    s.recipes = next;
  }
  async deleteRecipe(id: string) {
    const s = this.snap();
    const next = s.recipes.filter((r) => r.id !== id);
    this.write("recipes", next);
    s.recipes = next;
  }
  async upsertIngredient(i: Ingredient) {
    const s = this.snap();
    const next = s.library.some((x) => x.id === i.id)
      ? s.library.map((x) => (x.id === i.id ? i : x))
      : [...s.library, i];
    this.write("library", next);
    s.library = next;
  }
  async deleteIngredient(id: string) {
    const s = this.snap();
    const next = s.library.filter((x) => x.id !== id);
    this.write("library", next);
    s.library = next;
  }
  async replaceLibrary(list: Ingredient[]) {
    const s = this.snap();
    this.write("library", list);
    s.library = list;
  }
  async saveSettings(settings: AppSettings) {
    const s = this.snap();
    this.write("settings", settings);
    s.settings = settings;
  }
  async upsertDraft(d: CalculatorDraft) {
    const s = this.snap();
    const next = s.drafts.some((x) => x.key === d.key)
      ? s.drafts.map((x) => (x.key === d.key ? d : x))
      : [...s.drafts, d];
    this.write("drafts", next);
    s.drafts = next;
  }
  async deleteDraft(key: string) {
    const s = this.snap();
    if (!s.drafts.some((x) => x.key === key)) return;
    const next = s.drafts.filter((x) => x.key !== key);
    this.write("drafts", next);
    s.drafts = next;
  }
  async resetSection(section: SectionKey) {
    const s = this.snap();
    this.blocked.delete(section);
    s.issues = s.issues.filter((i) => i.section !== section);
    const fresh =
      section === "recipes" ? [] : section === "library" ? seedLibrary(this.now()) : section === "settings" ? defaultSettings() : [];
    this.write(section, fresh);
    (s as unknown as Record<SectionKey, unknown>)[section] = fresh;
  }
}
