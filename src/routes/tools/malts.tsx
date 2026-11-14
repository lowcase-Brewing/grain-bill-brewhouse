import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, Wheat } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { PageHeader } from "@/components/brew/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INGREDIENT_CATEGORIES } from "@/domain/types";
import { formatPpg } from "@/domain/format";
import { PUBLIC_REFERENCE_LIBRARY, PUBLIC_REFERENCE_VERSION } from "@/domain/public-reference";

export const Route = createFileRoute("/tools/malts")({
  head: () => ({
    meta: [
      { title: "Standard malt reference · lowcase Brewing" },
      {
        name: "description",
        content: "Browse planning values and flavor notes for malts, adjuncts, and extracts.",
      },
    ],
  }),
  component: PublicMalts,
});

function PublicMalts() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const q = query.trim().toLocaleLowerCase();
  const matches = PUBLIC_REFERENCE_LIBRARY.filter(
    (i) =>
      (category === "All" || i.category === category) &&
      `${i.name} ${i.origin} ${i.flavor} ${i.category}`.toLocaleLowerCase().includes(q),
  );
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Public brewing tools"
        title="Standard malt reference"
        description="Get to know what goes into the bill. Browse standard planning values for malts, adjuncts, and extracts."
        actions={
          <Button asChild variant="outline">
            <Link to="/tools/grain-bill">
              Use the calculator <ArrowRight />
            </Link>
          </Button>
        }
      />
      <p className="mb-7 rounded-xl border border-amber/30 bg-amber-soft px-5 py-4 text-sm leading-relaxed text-amber-foreground">
        These are generic planning values, not measured specifications for your equipment or a
        particular malt lot. Check the actual product specification when precision matters.
        Reference version: {PUBLIC_REFERENCE_VERSION}.
      </p>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-64 space-y-2">
          <Label htmlFor="reference-search">Search the reference</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              id="reference-search"
              placeholder="Try Vienna, biscuit, or extract…"
              autoComplete="off"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference-category">Category</Label>
          <select
            id="reference-category"
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All categories</option>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <p role="status" className="pb-2 text-sm text-muted-foreground">
          {matches.length} of {PUBLIC_REFERENCE_LIBRARY.length} ingredients
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((i) => (
          <article key={i.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge variant={i.category === "Extract" ? "amber" : "muted"}>{i.category}</Badge>
              <span className="tabular text-sm font-semibold text-primary">
                {formatPpg(i.ppg)} PPG
              </span>
            </div>
            <h2 className="font-display text-xl font-semibold">{i.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{i.origin}</p>
            <p className="mt-4 text-sm leading-relaxed">{i.flavor}</p>
            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              {i.notes}
            </p>
          </article>
        ))}
      </div>
      {!matches.length && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Wheat className="mx-auto size-7 text-copper" />
          <h2 className="mt-3 font-display text-xl">No matching ingredients.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or category.</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
      <p className="mt-8 text-xs text-muted-foreground">
        This is the shared standard reference. Personal library changes stay in the private account
        workbench.
      </p>
    </PublicShell>
  );
}
