import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Download, LockKeyhole, Wheat } from "lucide-react";
import { PublicShell, BetaSignIn } from "@/components/public/public-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brewing tools · lowcase Brewing" },
      {
        name: "description",
        content:
          "Plan a grain bill and explore standard malt values. Free brewing tools, no account needed.",
      },
      { property: "og:title", content: "Brewing tools · lowcase Brewing" },
      { property: "og:description", content: "Public grain bill planning and standard malt reference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolsHome,
});

function ToolsHome() {
  return (
    <PublicShell>
      <section className="grid gap-10 pb-12 pt-3 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-16 lg:py-12">
        <div>
          <p className="eyebrow mb-4 text-copper">A little planning. A better brew day.</p>
          <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Let’s brew
            <br />
            <span className="text-primary">something good.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Work out your grain bill, get a gravity estimate, and get to know your ingredients. A
            few useful tools from the lowcase brew bench.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to="/tools/grain-bill">
                <Calculator /> Open the calculator <ArrowRight />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">Free to use. No account needed.</span>
          </div>
        </div>
        <div className="malt-lines rounded-2xl border border-sidebar-border bg-sidebar p-7 text-sidebar-foreground shadow-raised sm:p-9">
          <Wheat className="mb-6 size-10 text-sidebar-primary" strokeWidth={1.3} />
          <p className="eyebrow text-sidebar-muted">From grain to gravity</p>
          <h2 className="mt-3 font-display text-3xl leading-tight">
            Know what’s going
            <br />
            in the mash tun.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/80">
            Choose your ingredients, enter their weights, and see how the bill adds up. Grains and
            extracts each get the right treatment.
          </p>
          <div className="mt-7 border-t border-sidebar-border pt-5 text-xs leading-relaxed text-sidebar-muted">
            Planning estimates, grounded in the lowcase calculation model. Your actual brew day gets
            the final say.
          </div>
        </div>
      </section>
      <section
        aria-label="Available brewing tools"
        className="grid gap-5 border-t border-border pt-10 md:grid-cols-2"
      >
        <Link
          to="/tools/grain-bill"
          className="group rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/50 sm:p-8"
        >
          <Calculator className="size-6 text-copper" />
          <h2 className="mt-5 font-display text-2xl font-semibold">Grain bill calculator</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Estimate original gravity from grain and extract weights, your batch volume, and
            efficiency. Download a copy for brew day.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
            Plan a grain bill <ArrowRight className="size-4" />
          </span>
        </Link>
        <Link
          to="/tools/malts"
          className="group rounded-xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/50 sm:p-8"
        >
          <Wheat className="size-6 text-copper" />
          <h2 className="mt-5 font-display text-2xl font-semibold">Standard malt reference</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Browse malts, adjuncts, and extracts, with flavor notes and planning values. A handy
            starting point for your next recipe.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
            Explore the ingredients <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>
      <section className="mt-10 grid gap-6 rounded-xl bg-secondary/70 p-6 sm:p-8 md:grid-cols-2">
        <div className="flex gap-3">
          <Download className="mt-1 size-5 shrink-0 text-copper" />
          <div>
            <h2 className="font-medium">Your scratch work stays on this page.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Public calculations are not autosaved. Download a copy before leaving or refreshing.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <LockKeyhole className="mt-1 size-5 shrink-0 text-copper" />
          <div>
            <h2 className="font-medium">A private workbench is brewing.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Saved recipes and syncing are for invited beta accounts. Public account registration
              isn’t open yet.
            </p>
            <BetaSignIn className="mt-3 text-xs font-medium text-primary" />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
