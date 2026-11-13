import { createFileRoute, Link } from "@tanstack/react-router";
import { Save, Undo2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { GrainBillWorkspace, useGrainBillWork, type EditorState } from "@/components/brew/grain-bill-editor";
import { PageHeader, WhenStoreReady } from "@/components/brew/page";
import { applyGrainBillToRecipe, parametersToSettingsInput, settingsToParameters } from "@/domain/recipe";
import type { Recipe } from "@/domain/types";
import { nowIso, useBrewStore } from "@/storage/brew-store";
import { RecipeMissing } from "@/components/brew/recipe-missing";

export const Route = createFileRoute("/recipes/$recipeId/grain-bill")({
  head: () => ({
    meta: [
      { title: "Recipe grain bill · lowcase Brewing" },
      { name: "description", content: "Calculate and save a recipe's grain bill using the lowcase sheet formulas." },
      { property: "og:title", content: "Recipe grain bill · lowcase Brewing" },
      { property: "og:description", content: "Grain bill calculator for a saved recipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { recipeId } = Route.useParams();
  return (
    <WhenStoreReady>
      <Loader recipeId={recipeId} />
    </WhenStoreReady>
  );
}

function Loader({ recipeId }: { recipeId: string }) {
  const { data } = useBrewStore();
  const recipe = data?.recipes.find((r) => r.id === recipeId);
  if (!data || !recipe) return <RecipeMissing />;
  return <RecipeGrainBill key={recipe.id} recipe={recipe} />;
}

function RecipeGrainBill({ recipe }: { recipe: Recipe }) {
  const { data, actions } = useBrewStore();
  const baseline = useMemo<EditorState>(
    () => ({ settings: parametersToSettingsInput(recipe.parameters), rows: recipe.grainBill, loadedExample: false }),
    [recipe],
  );
  const { state, setState, resetWork, result, dirty } = useGrainBillWork(`recipe:${recipe.id}`, recipe.id, baseline);

  const save = async () => {
    const params = settingsToParameters(state.settings);
    if (!params.ok) {
      toast.error("Fix the settings before saving", { description: Object.values(params.errors).join(" ") });
      return;
    }
    const rows = state.rows.filter((r) => r.ingredient || r.lb.trim() || r.oz.trim());
    const next = applyGrainBillToRecipe(recipe, params.value, rows, result, nowIso());
    if (await actions.saveRecipe(next)) {
      resetWork({ settings: parametersToSettingsInput(params.value), rows, loadedExample: false });
      if (next.grainBillSummary?.complete) toast.success("Grain bill saved to recipe");
      else toast.warning("Saved — OG not recorded", { description: next.grainBillSummary?.reason ?? undefined });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className="hover:text-foreground">← {recipe.name}</Link>}
        title="Grain bill"
        description={`${recipe.name} · ${recipe.style} · v${recipe.version}. Changes autosave as a draft in this browser until you save them to the recipe.`}
        actions={
          <>
            <Button onClick={save} disabled={!dirty}><Save /> Save to recipe</Button>
            <ConfirmButton
              trigger={<Button variant="outline" disabled={!dirty}><Undo2 /> Discard changes</Button>}
              title="Discard unsaved grain bill changes?"
              description="The calculator goes back to what's saved on the recipe."
              confirmLabel="Discard"
              onConfirm={() => resetWork(baseline)}
            />
          </>
        }
      />
      <GrainBillWorkspace
        state={state}
        setState={setState}
        result={result}
        library={data?.library ?? []}
        resultsFooter={<p>{dirty ? "Unsaved draft — autosaved in this browser." : "Matches the saved recipe."}</p>}
      />
    </>
  );
}
