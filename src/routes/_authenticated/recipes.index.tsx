import { WhenStoreReady } from "@/components/brew/when-store-ready";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calculator, Copy, Plus, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { PageHeader } from "@/components/brew/page";
import { parseRecipeExport } from "@/domain/export";
import { formatDate, formatOG } from "@/domain/format";
import { BREW_METHOD_LABELS } from "@/domain/types";
import { useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated/recipes/")({
  head: () => ({
    meta: [
      { title: "Recipes · lowcase Brewing" },
      {
        name: "description",
        content: "Search, edit, duplicate and export lowcase Brewing recipe drafts.",
      },
      { property: "og:title", content: "Recipes · lowcase Brewing" },
      { property: "og:description", content: "Recipe drafts saved to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { actions } = useBrewStore();
  const navigate = useNavigate();
  const onImport = async (file: File) => {
    const parsed = parseRecipeExport(await file.text());
    if (!parsed.ok) {
      toast.error("Couldn't import", { description: parsed.error });
      return;
    }
    const r = await actions.importRecipe(parsed.recipe);
    if (r) {
      toast.success(`Imported “${r.name}”`);
      void navigate({ to: "/recipes/$recipeId", params: { recipeId: r.id } });
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Recipes"
        description="Recipe drafts saved to your account."
        actions={
          <>
            <Button asChild>
              <Link to="/recipes/new">
                <Plus /> New recipe
              </Link>
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />
      <WhenStoreReady>
        <RecipeList />
      </WhenStoreReady>
    </>
  );
}

function RecipeList() {
  const { data, actions } = useBrewStore();
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  if (!data) return null;
  const needle = q.trim().toLowerCase();
  const list = [...data.recipes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter(
      (r) =>
        !needle ||
        [r.name, r.style, r.version, r.description, r.notes].some((s) =>
          s.toLowerCase().includes(needle),
        ),
    );

  if (data.recipes.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-display text-lg">Your recipe shelf is empty.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a recipe, or import a lowcase recipe JSON export.
        </p>
        <Button asChild className="mt-5">
          <Link to="/recipes/new">
            <Plus /> New recipe
          </Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search recipes"
          placeholder="Search by name, style, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-card pl-9"
        />
      </div>
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">No recipes match “{q}”.</p>
      )}
      <ul className="grid gap-3">
        {list.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              to="/recipes/$recipeId"
              params={{ recipeId: r.id }}
              className="min-w-0 flex-1 hover:text-primary"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-display text-lg font-semibold">{r.name}</span>
                <Badge variant="muted">v{r.version}</Badge>
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {r.style} · {BREW_METHOD_LABELS[r.method]} · {r.parameters.coldFermenterGal} gal ·
                updated {formatDate(r.updatedAt)}
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="eyebrow">Est. OG</div>
                <div className="tabular font-semibold">
                  {r.grainBillSummary?.estimatedOG != null
                    ? formatOG(r.grainBillSummary.estimatedOG)
                    : "—"}
                </div>
              </div>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="icon" aria-label={`Grain bill for ${r.name}`}>
                  <Link to="/recipes/$recipeId/grain-bill" params={{ recipeId: r.id }}>
                    <Calculator />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Duplicate ${r.name}`}
                  onClick={async () => {
                    const c = await actions.duplicateRecipe(r.id);
                    if (c) {
                      toast.success(`Duplicated as “${c.name}”`);
                      void navigate({ to: "/recipes/$recipeId", params: { recipeId: c.id } });
                    }
                  }}
                >
                  <Copy />
                </Button>
                <ConfirmButton
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${r.name}`}
                      className="hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  }
                  title={`Delete “${r.name}”?`}
                  description="This removes the recipe and any unsaved calculator draft for it from your account. Export it first if you want a copy."
                  confirmLabel="Delete recipe"
                  onConfirm={async () => {
                    if (await actions.deleteRecipe(r.id)) toast.success("Recipe deleted");
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
