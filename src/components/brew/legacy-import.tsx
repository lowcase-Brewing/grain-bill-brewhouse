import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppSettings, CalculatorDraft, Ingredient, Recipe } from "@/domain/types";
import { readSection } from "@/storage/local-repository";
import { planLegacyImport, type LegacyData } from "@/storage/legacy-import";
import { CloudBrewRepository } from "@/storage/cloud-repository";
import { useBrewStore } from "@/storage/brew-store";
import { Panel } from "./page";

/** Reads legacy browser data without writing anything back to browser storage. */
function readLegacy(): { data: LegacyData; unreadable: string[] } | null {
  let store: Storage;
  try {
    store = window.localStorage;
  } catch {
    return null;
  }
  const unreadable: string[] = [];
  const get = <T,>(section: "recipes" | "library" | "settings" | "drafts"): T | null => {
    const r = readSection<T>(store, section);
    if (r.state === "issue") unreadable.push(section);
    return r.state === "ok" ? r.data : null;
  };
  const data: LegacyData = {
    recipes: get<Recipe[]>("recipes") ?? [],
    library: get<Ingredient[]>("library") ?? [],
    settings: get<AppSettings>("settings"),
    drafts: get<CalculatorDraft[]>("drafts") ?? [],
  };
  const any = data.recipes.length || data.library.length || data.settings || data.drafts.length || unreadable.length;
  return any ? { data, unreadable } : null;
}

export function LegacyImportPanel() {
  const { data, repository, reload } = useBrewStore();
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacy>>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cloud = repository instanceof CloudBrewRepository ? repository : null;

  useEffect(() => {
    setLegacy(readLegacy());
    if (cloud) void cloud.legacyImportCompletedAt().then(setCompletedAt).catch(() => undefined);
  }, [cloud]);

  const plan = useMemo(
    () => (legacy && data ? planLegacyImport(legacy.data, { recipes: data.recipes, library: data.library, drafts: data.drafts, hasSettings: true }) : null),
    [legacy, data],
  );
  if (!cloud || !legacy || !data || !plan) return null;
  const nothingNew = !plan.recipes.length && !plan.library.length && !plan.drafts.length;

  const run = async () => {
    setBusy(true);
    try {
      const result = await cloud.importLegacy(legacy.data, data);
      await reload();
      setCompletedAt(new Date().toISOString());
      toast.success("Browser data imported to your account", {
        description: `${result.recipes.length} recipes, ${result.library.length} library entries, ${result.drafts.length} drafts${result.settings ? ", settings" : ""}. Existing account data was kept.`,
      });
    } catch (err) {
      toast.error("Import didn't finish", { description: err instanceof Error ? err.message : "Nothing was overwritten; you can retry." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Data from this browser">
      <div className="space-y-3 text-sm">
        <p>This browser still holds data from before accounts existed. Importing copies it into your account; the browser copy stays untouched.</p>
        <ul className="grid gap-1 text-muted-foreground sm:grid-cols-2">
          <li>Recipes: {legacy.data.recipes.length} found · <strong className="text-foreground">{plan.recipes.length} new</strong></li>
          <li>Library entries: {legacy.data.library.length} found · <strong className="text-foreground">{plan.library.length} new</strong></li>
          <li>Calculator drafts: {legacy.data.drafts.length} found · <strong className="text-foreground">{plan.drafts.length} new</strong></li>
          <li>Settings: {legacy.data.settings ? "found · imported only if your account has none" : "none"}</li>
        </ul>
        <p className="text-xs text-muted-foreground">Recipes, ingredients (matched by id or name) and drafts already in your account are never overwritten.</p>
        {legacy.unreadable.length ? <p className="text-xs text-amber-foreground">Unreadable browser sections skipped: {legacy.unreadable.join(", ")}.</p> : null}
        {completedAt ? <p className="text-xs text-muted-foreground">Last import: {new Date(completedAt).toLocaleString()}.</p> : null}
        <Button onClick={() => void run()} disabled={busy || nothingNew}>
          {busy ? "Importing…" : nothingNew ? "Nothing new to import" : "Import into my account"}
        </Button>
      </div>
    </Panel>
  );
}
