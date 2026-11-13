import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calculator, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { ExportActions } from "@/components/brew/export-actions";
import { PageHeader, Panel, WhenStoreReady } from "@/components/brew/page";
import { RecipeForm } from "@/components/brew/recipe-form";
import { RecipeMissing } from "@/components/brew/recipe-missing";
import { formatDate, formatLb, formatOG, formatPoints, formatSignedPoints } from "@/domain/format";
import { applyRecipeCore, parametersToSettingsInput, recipeToFormInput } from "@/domain/recipe";
import { buildProjectManifest } from "@/domain/workflow";
import { nowIso, useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/recipes/$recipeId/")({
  head: () => ({
    meta: [
      { title: "Recipe · lowcase Brewing" },
      { name: "description", content: "Edit a lowcase Brewing recipe, its grain bill summary and exports." },
      { property: "og:title", content: "Recipe · lowcase Brewing" },
      { property: "og:description", content: "Edit a recipe draft and export it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecipePage,
});

function RecipePage() {
  return <WhenStoreReady><RecipeDetail /></WhenStoreReady>;
}

function RecipeDetail() {
  const { recipeId } = Route.useParams();
  const { data, actions } = useBrewStore();
  const navigate = useNavigate();
  const recipe = data?.recipes.find((r) => r.id === recipeId);
  if (!data || !recipe) return <RecipeMissing />;
  const s = recipe.grainBillSummary;
  const manifest = buildProjectManifest(recipe, data.settings.workflow, nowIso());
  const draft = data.drafts.find((d) => d.key === `recipe:${recipe.id}`);

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/recipes" className="hover:text-foreground">← Recipes</Link>}
        title={recipe.name}
        description={`${recipe.style} · v${recipe.version} · updated ${formatDate(recipe.updatedAt)}`}
        actions={
          <>
            <Button asChild><Link to="/recipes/$recipeId/grain-bill" params={{ recipeId: recipe.id }}><Calculator /> Grain bill calculator</Link></Button>
            <Button variant="outline" onClick={async () => {
              const c = await actions.duplicateRecipe(recipe.id);
              if (c) { toast.success(`Duplicated as “${c.name}”`); void navigate({ to: "/recipes/$recipeId", params: { recipeId: c.id } }); }
            }}><Copy /> Duplicate</Button>
            <ConfirmButton
              trigger={<Button variant="outline" className="hover:text-destructive"><Trash2 /> Delete</Button>}
              title={`Delete “${recipe.name}”?`}
              description="This removes the recipe and any unsaved calculator draft for it from this browser."
              confirmLabel="Delete recipe"
              onConfirm={async () => { if (await actions.deleteRecipe(recipe.id)) { toast.success("Recipe deleted"); void navigate({ to: "/recipes" }); } }}
            />
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <RecipeForm
          key={recipe.updatedAt}
          initial={recipeToFormInput(recipe)}
          submitLabel="Save recipe"
          onSubmit={async (core) => {
            const next = applyRecipeCore(recipe, core, nowIso());
            if (await actions.saveRecipe(next)) {
              // Keep an open calculator draft consistent with the recipe's settings.
              if (draft) await actions.saveDraft({ ...draft, settings: parametersToSettingsInput(next.parameters), updatedAt: nowIso() });
              toast.success("Recipe saved in this browser");
            }
          }}
        />
        <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <Panel title="Grain bill">
            {!s ? (
              <p className="text-sm text-muted-foreground">No grain bill saved yet.</p>
            ) : (
              <dl className="tabular space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Estimated OG</dt><dd className="font-display text-2xl font-semibold">{s.estimatedOG != null ? formatOG(s.estimatedOG) : "—"}</dd></div>
                {s.totalPoints != null && <div className="flex justify-between"><dt className="text-muted-foreground">Points</dt><dd>{formatPoints(s.totalPoints)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted-foreground">vs target</dt><dd>{s.differencePoints != null ? `${formatSignedPoints(s.differencePoints)} pts` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Total bill</dt><dd>{s.totalWeightLb != null ? `${formatLb(s.totalWeightLb)} lb` : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Mashed grain</dt><dd>{s.mashedGrainLb != null ? `${formatLb(s.mashedGrainLb)} lb` : "—"}</dd></div>
                {s.reason && <p className="pt-2 text-xs text-warning-foreground">{s.reason}</p>}
                <p className="pt-1 text-[11px] text-muted-foreground">{recipe.grainBill.length} row{recipe.grainBill.length === 1 ? "" : "s"} · saved {formatDate(s.savedAt)}</p>
              </dl>
            )}
            {draft && <Badge variant="amber" className="mt-3">Unsaved calculator changes</Badge>}
          </Panel>
          <Panel title="Export" description="Versioned JSON, readable Markdown, and a manifest of planned folders.">
            <ExportActions recipe={recipe} template={data.settings.workflow} />
            <div className="mt-4 rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <div className="text-foreground">{manifest.rootFolder}/</div>
              {manifest.folders.map((f) => <div key={f}>&nbsp;&nbsp;{f.slice(manifest.rootFolder.length + 1)}/</div>)}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">AppleScript workflow mapping pending. No folders are created on your Mac or Drive.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
