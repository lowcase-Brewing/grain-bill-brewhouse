/**
 * Authenticated backend repository. Every row is owner-scoped by RLS
 * (owner_id = auth.uid()); this class additionally binds itself to one user id
 * and refuses to read or write once the live session belongs to someone else.
 * Operations are serialized so a later draft save can never be overtaken by an
 * earlier one.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodTypeAny } from "zod";
import { seedLibrary } from "@/domain/library";
import { SCHEMA_VERSION, appSettingsSchema, calculatorDraftSchema, ingredientSchema, recipeSchema } from "@/domain/schema";
import type { AppSettings, CalculatorDraft, Ingredient, Recipe } from "@/domain/types";
import type { Database } from "@/integrations/supabase/types";
import { defaultSettings } from "./local-repository";
import { planLegacyImport, type ImportPlan, type LegacyData } from "./legacy-import";
import { StorageBlockedError, type BrewRepository, type RepositorySnapshot, type SectionIssue, type SectionKey } from "./repository";

type Client = SupabaseClient<Database>;
type Json = never;

export class SessionChangedError extends Error {
  constructor() {
    super("You were signed out or switched accounts; this change was not saved.");
    this.name = "SessionChangedError";
  }
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
const stamp = () => new Date().toISOString();

export class CloudBrewRepository implements BrewRepository {
  readonly kind = "authenticated-backend" as const;
  readonly description = "Saved privately to your lowcase account in the cloud. Only your signed-in account can read or change it.";
  private queue: Promise<unknown> = Promise.resolve();
  private blocked = new Set<SectionKey>();
  private hasSettings = false;

  constructor(private client: Client, readonly userId: string) {}

  private async assertSession() {
    const { data } = await this.client.auth.getSession();
    if (data.session?.user.id !== this.userId) throw new SessionChangedError();
  }

  private serial<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      await this.assertSession();
      return op();
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private parseRows<T>(section: SectionKey, rows: { doc: unknown; schema_version: number }[], schema: ZodTypeAny, issues: SectionIssue[]): T[] {
    const out: T[] = [];
    for (const row of rows) {
      const parsed = row.schema_version === SCHEMA_VERSION ? schema.safeParse(row.doc) : null;
      if (parsed?.success) out.push(parsed.data as T);
      else {
        this.blocked.add(section);
        issues.push({
          section,
          kind: row.schema_version === SCHEMA_VERSION ? "invalid-shape" : "unsupported-version",
          message: "A saved cloud entry failed validation. It was left untouched.",
          raw: JSON.stringify(row.doc),
        });
      }
    }
    return out;
  }

  private seedRows() {
    return seedLibrary(stamp()).map((i) => ({ owner_id: this.userId, id: i.id, doc: i as Json, schema_version: SCHEMA_VERSION }));
  }

  loadAll(): Promise<RepositorySnapshot> {
    return this.serial(async () => {
      this.blocked.clear();
      const uid = this.userId;
      // Seed the source library exactly once per account. The state row records
      // it, and seed ids are deterministic so a retried seed never duplicates.
      check(await this.client.from("brew_account_state").upsert({ owner_id: uid }, { onConflict: "owner_id", ignoreDuplicates: true }));
      const state = check(await this.client.from("brew_account_state").select("library_seeded_at").eq("owner_id", uid).single());
      if (!state.library_seeded_at) {
        check(await this.client.from("brew_ingredients").upsert(this.seedRows(), { onConflict: "owner_id,id", ignoreDuplicates: true }));
        check(await this.client.from("brew_account_state").update({ library_seeded_at: stamp() }).eq("owner_id", uid));
      }
      const [r, l, s, d] = await Promise.all([
        this.client.from("brew_recipes").select("doc,schema_version").eq("owner_id", uid),
        this.client.from("brew_ingredients").select("doc,schema_version").eq("owner_id", uid),
        this.client.from("brew_settings").select("doc,schema_version").eq("owner_id", uid).maybeSingle(),
        this.client.from("brew_drafts").select("doc,schema_version").eq("owner_id", uid),
      ]);
      const issues: SectionIssue[] = [];
      const recipes = this.parseRows<Recipe>("recipes", check(r), recipeSchema, issues);
      const library = this.parseRows<Ingredient>("library", check(l), ingredientSchema, issues).sort((a, b) => a.name.localeCompare(b.name));
      const settingsRow = check(s);
      this.hasSettings = !!settingsRow;
      const settings = (settingsRow && this.parseRows<AppSettings>("settings", [settingsRow], appSettingsSchema, issues)[0]) || defaultSettings();
      const drafts = this.parseRows<CalculatorDraft>("drafts", check(d), calculatorDraftSchema, issues);
      return { recipes, library, settings, drafts, issues };
    });
  }

  private guard(section: SectionKey) {
    if (this.blocked.has(section)) throw new StorageBlockedError(section);
  }

  upsertRecipe(recipe: Recipe) {
    return this.serial(async () => {
      this.guard("recipes");
      check(await this.client.from("brew_recipes").upsert({ owner_id: this.userId, id: recipe.id, doc: recipe as Json, schema_version: SCHEMA_VERSION, updated_at: stamp() }, { onConflict: "owner_id,id" }));
    });
  }
  deleteRecipe(id: string) {
    return this.serial(async () => {
      check(await this.client.from("brew_recipes").delete().eq("owner_id", this.userId).eq("id", id));
    });
  }
  upsertIngredient(i: Ingredient) {
    return this.serial(async () => {
      this.guard("library");
      check(await this.client.from("brew_ingredients").upsert({ owner_id: this.userId, id: i.id, doc: i as Json, schema_version: SCHEMA_VERSION, updated_at: stamp() }, { onConflict: "owner_id,id" }));
    });
  }
  deleteIngredient(id: string) {
    return this.serial(async () => {
      check(await this.client.from("brew_ingredients").delete().eq("owner_id", this.userId).eq("id", id));
    });
  }
  replaceLibrary(list: Ingredient[]) {
    return this.serial(async () => {
      this.guard("library");
      const existing = check(await this.client.from("brew_ingredients").select("id").eq("owner_id", this.userId));
      const keep = new Set(list.map((i) => i.id));
      const remove = existing.map((e) => e.id).filter((id) => !keep.has(id));
      if (list.length) check(await this.client.from("brew_ingredients").upsert(list.map((i) => ({ owner_id: this.userId, id: i.id, doc: i as Json, schema_version: SCHEMA_VERSION, updated_at: stamp() })), { onConflict: "owner_id,id" }));
      if (remove.length) check(await this.client.from("brew_ingredients").delete().eq("owner_id", this.userId).in("id", remove));
    });
  }
  saveSettings(settings: AppSettings) {
    return this.serial(async () => {
      this.guard("settings");
      check(await this.client.from("brew_settings").upsert({ owner_id: this.userId, doc: settings as Json, schema_version: SCHEMA_VERSION, updated_at: stamp() }, { onConflict: "owner_id" }));
      this.hasSettings = true;
    });
  }
  upsertDraft(d: CalculatorDraft) {
    return this.serial(async () => {
      this.guard("drafts");
      check(await this.client.from("brew_drafts").upsert({ owner_id: this.userId, key: d.key, doc: d as Json, schema_version: SCHEMA_VERSION, updated_at: stamp() }, { onConflict: "owner_id,key" }));
    });
  }
  deleteDraft(key: string) {
    return this.serial(async () => {
      check(await this.client.from("brew_drafts").delete().eq("owner_id", this.userId).eq("key", key));
    });
  }
  resetSection(section: SectionKey) {
    return this.serial(async () => {
      const uid = this.userId;
      if (section === "recipes") check(await this.client.from("brew_recipes").delete().eq("owner_id", uid));
      if (section === "drafts") check(await this.client.from("brew_drafts").delete().eq("owner_id", uid));
      if (section === "settings") check(await this.client.from("brew_settings").delete().eq("owner_id", uid));
      if (section === "library") {
        check(await this.client.from("brew_ingredients").delete().eq("owner_id", uid));
        check(await this.client.from("brew_ingredients").insert(this.seedRows()));
      }
      this.blocked.delete(section);
    });
  }

  legacyImportCompletedAt(): Promise<string | null> {
    return this.serial(async () => {
      const row = check(await this.client.from("brew_account_state").select("legacy_import_completed_at").eq("owner_id", this.userId).maybeSingle());
      return row?.legacy_import_completed_at ?? null;
    });
  }

  /** Inserts only what the plan marks as new; conflicts are ignored, never overwritten. */
  importLegacy(legacy: LegacyData, cloud: RepositorySnapshot): Promise<ImportPlan> {
    return this.serial(async () => {
      const plan = planLegacyImport(legacy, { recipes: cloud.recipes, library: cloud.library, drafts: cloud.drafts, hasSettings: this.hasSettings });
      const uid = this.userId;
      const v = SCHEMA_VERSION;
      if (plan.recipes.length) check(await this.client.from("brew_recipes").upsert(plan.recipes.map((r) => ({ owner_id: uid, id: r.id, doc: r as Json, schema_version: v })), { onConflict: "owner_id,id", ignoreDuplicates: true }));
      if (plan.library.length) check(await this.client.from("brew_ingredients").upsert(plan.library.map((i) => ({ owner_id: uid, id: i.id, doc: i as Json, schema_version: v })), { onConflict: "owner_id,id", ignoreDuplicates: true }));
      if (plan.drafts.length) check(await this.client.from("brew_drafts").upsert(plan.drafts.map((d) => ({ owner_id: uid, key: d.key, doc: d as Json, schema_version: v })), { onConflict: "owner_id,key", ignoreDuplicates: true }));
      if (plan.settings) {
        check(await this.client.from("brew_settings").upsert({ owner_id: uid, doc: plan.settings as Json, schema_version: v }, { onConflict: "owner_id", ignoreDuplicates: true }));
        this.hasSettings = true;
      }
      check(await this.client.from("brew_account_state").update({ legacy_import_completed_at: stamp() }).eq("owner_id", uid));
      return plan;
    });
  }
}
