import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Calculator, FlaskConical, Plus, Wheat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, WhenStoreReady } from "@/components/brew/page";
import { formatDate, formatOG } from "@/domain/format";
import { BREW_METHOD_LABELS } from "@/domain/types";
import { useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · lowcase Brewing" },
      { name: "description", content: "Recipe drafts and grain bill work for lowcase Brewing, saved in this browser." },
      { property: "og:title", content: "Dashboard · lowcase Brewing" },
      { property: "og:description", content: "Recipe drafts and grain bill work for lowcase Brewing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Workbench"
        title="What's on the mash tun?"
        description="Recipes, grain bills and calculator drafts — all kept in this browser for now."
        actions={
          <>
            <Button asChild><Link to="/recipes/new"><Plus /> New recipe</Link></Button>
            <Button asChild variant="outline"><Link to="/calculator"><Calculator /> Grain bill calculator</Link></Button>
          </>
        }
      />
      <WhenStoreReady>
        <DashboardBody />
      </WhenStoreReady>
    </>
  );
}

function StatCard({ label, value, icon: Icon, to }: { label: string; value: number; icon: typeof BookOpen; to: "/recipes" | "/calculator" | "/malts" }) {
  return (
    <Link to={to} className="group rounded-xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <Icon className="size-4 text-copper" strokeWidth={1.8} />
      </div>
      <div className="tabular mt-3 font-display text-4xl font-semibold">{value}</div>
    </Link>
  );
}

function DashboardBody() {
  const { data } = useBrewStore();
  if (!data) return null;
  const recipes = [...data.recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const withOG = recipes.filter((r) => r.grainBillSummary?.complete).length;
  const drafts = [...data.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recipes" value={recipes.length} icon={BookOpen} to="/recipes" />
        <StatCard label="With saved OG" value={withOG} icon={FlaskConical} to="/recipes" />
        <StatCard label="Calculator drafts" value={drafts.length} icon={Calculator} to="/calculator" />
        <StatCard label="Malt library" value={data.library.length} icon={Wheat} to="/malts" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Recent recipes" actions={recipes.length > 0 && <Button asChild variant="ghost" size="sm"><Link to="/recipes">All recipes <ArrowRight /></Link></Button>}>
          {recipes.length === 0 ? (
            <div className="py-8 text-center">
              <Wheat className="mx-auto size-8 text-copper/70" strokeWidth={1.4} />
              <p className="mt-3 font-display text-lg">No recipes yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Start one from scratch, or rough out a grain bill in the calculator first. Ruckus is supervising either way.
              </p>
              <Button asChild className="mt-5"><Link to="/recipes/new"><Plus /> New recipe</Link></Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recipes.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link to="/recipes/$recipeId" params={{ recipeId: r.id }} className="flex items-center justify-between gap-4 py-3 hover:text-primary">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.style} · v{r.version} · {BREW_METHOD_LABELS[r.method]}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-sm">{r.grainBillSummary?.estimatedOG != null ? formatOG(r.grainBillSummary.estimatedOG) : "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(r.updatedAt)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Unsaved calculator work">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in progress. Calculator edits autosave here until you save them to a recipe.</p>
            ) : (
              <ul className="space-y-2">
                {drafts.map((d) => {
                  const recipe = d.recipeId ? data.recipes.find((r) => r.id === d.recipeId) : null;
                  return (
                    <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                      {recipe ? (
                        <Link to="/recipes/$recipeId/grain-bill" params={{ recipeId: recipe.id }} className="truncate hover:text-primary">{recipe.name} — grain bill</Link>
                      ) : (
                        <Link to="/calculator" className="truncate hover:text-primary">Scratch calculator</Link>
                      )}
                      <span className="flex shrink-0 items-center gap-2">
                        {d.loadedExample && <Badge variant="amber">Example</Badge>}
                        <span className="text-[11px] text-muted-foreground">{formatDate(d.updatedAt)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel title="Reference example" description="From the sheet's Grain Bill tab — a test case, not a recipe.">
            <p className="tabular text-sm text-muted-foreground">
              6 lb Maris Otter, 1 lb Vienna, 2 lb German Munich I, 4 lb Pale DME at 6.5 gal, 70% / 90% → OG 1.060, +8.3 vs 1.052.
            </p>
            <Button asChild variant="soft" size="sm" className="mt-3"><Link to="/calculator">Load it in the calculator <ArrowRight /></Link></Button>
          </Panel>
        </div>
      </div>
    </div>
  );
}
