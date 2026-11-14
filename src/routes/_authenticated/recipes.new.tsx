import { WhenStoreReady } from "@/components/brew/when-store-ready";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/brew/page";
import { RecipeForm } from "@/components/brew/recipe-form";
import { emptyRecipeForm } from "@/domain/recipe";
import { useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated/recipes/new")({
  head: () => ({
    meta: [
      { title: "New recipe · lowcase Brewing" },
      { name: "description", content: "Start a new lowcase Brewing recipe draft." },
      { property: "og:title", content: "New recipe · lowcase Brewing" },
      { property: "og:description", content: "Start a new recipe draft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRecipe,
});

function NewRecipe() {
  const { actions } = useBrewStore();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        eyebrow="Recipes"
        title="New recipe"
        description="Defaults come from the sheet: 6.5 gal, 70% efficiency, 1.052 target, 90% provisional extract recovery."
      />
      <WhenStoreReady>
        <RecipeForm
          initial={emptyRecipeForm()}
          submitLabel="Create recipe"
          onCancel={() => void navigate({ to: "/recipes" })}
          onSubmit={async (core) => {
            const r = await actions.createRecipe(core);
            if (r) {
              toast.success(`Created “${r.name}”`);
              void navigate({ to: "/recipes/$recipeId/grain-bill", params: { recipeId: r.id } });
            }
          }}
        />
      </WhenStoreReady>
    </>
  );
}
