/**
 * Repository boundary. UI talks only to BrewRepository; today the only
 * implementation is browser-local (localStorage). A future authenticated
 * backend (per-user rows + RLS) implements the same interface.
 */
import type { AppSettings, CalculatorDraft, Ingredient, Recipe } from "@/domain/types";

export type SectionKey = "recipes" | "library" | "settings" | "drafts";

export type SectionIssueKind = "unreadable-json" | "invalid-shape" | "unsupported-version";

export interface SectionIssue {
  section: SectionKey;
  kind: SectionIssueKind;
  message: string;
  /** The untouched stored text, so the user can download it before any reset. */
  raw: string;
}

export interface RepositorySnapshot {
  recipes: Recipe[];
  library: Ingredient[];
  settings: AppSettings;
  drafts: CalculatorDraft[];
  issues: SectionIssue[];
}

export class StorageBlockedError extends Error {
  constructor(public section: SectionKey) {
    super(`Saving ${section} is paused because the stored data couldn't be read. Nothing was overwritten.`);
    this.name = "StorageBlockedError";
  }
}

export interface BrewRepository {
  readonly kind: "browser-local" | "authenticated-backend";
  /** Human description shown in Settings. */
  readonly description: string;
  loadAll(): Promise<RepositorySnapshot>;
  upsertRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;
  upsertIngredient(ingredient: Ingredient): Promise<void>;
  deleteIngredient(id: string): Promise<void>;
  replaceLibrary(list: Ingredient[]): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  upsertDraft(draft: CalculatorDraft): Promise<void>;
  deleteDraft(key: string): Promise<void>;
  /** Explicit, user-confirmed reset of a section (the only path that overwrites unreadable data). */
  resetSection(section: SectionKey): Promise<void>;
}
