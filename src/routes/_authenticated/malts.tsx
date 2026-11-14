import { WhenStoreReady } from "@/components/brew/when-store-ready";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { IngredientDialog } from "@/components/brew/ingredient-dialog";
import { PageHeader } from "@/components/brew/page";
import { formatPpg } from "@/domain/format";
import { isIngredientUsableForCalc } from "@/domain/library";
import { SHEET_SOURCE } from "@/domain/seed-malts";
import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from "@/domain/types";
import { cn } from "@/lib/utils";
import { newId, nowIso, useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated/malts")({
  head: () => ({
    meta: [
      { title: "Malt library · lowcase Brewing" },
      {
        name: "description",
        content: "Editable malt, adjunct and extract library seeded from the lowcase sheet.",
      },
      { property: "og:title", content: "Malt library · lowcase Brewing" },
      {
        property: "og:description",
        content: "Planning PPG values for malts, adjuncts and extracts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaltsPage,
});

function MaltsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Malt library"
        description={
          <>
            Seeded from the Malt Library tab ({SHEET_SOURCE.sync}, fetched {SHEET_SOURCE.fetchedOn}
            ). Values are generic planning estimates —{" "}
            <strong className="font-semibold text-foreground">
              not measured specs for your system or a specific product lot.
            </strong>
          </>
        }
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Add ingredient
          </Button>
        }
      />
      <WhenStoreReady>
        <Library
          onEdit={(i) => {
            setEditing(i);
            setOpen(true);
          }}
        />
        <DialogHost open={open} setOpen={setOpen} editing={editing} />
      </WhenStoreReady>
    </>
  );
}

function DialogHost({
  open,
  setOpen,
  editing,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  editing: Ingredient | null;
}) {
  const { data, actions } = useBrewStore();
  return (
    <IngredientDialog
      open={open}
      onOpenChange={setOpen}
      editing={editing}
      library={data?.library ?? []}
      onSave={async (r) => {
        const item: Ingredient = {
          ...r.value,
          id: editing?.id ?? `user-${newId()}`,
          source: editing?.source ?? "user",
          updatedAt: nowIso(),
        };
        if (await actions.saveIngredient(item)) {
          setOpen(false);
          toast.success(editing ? "Ingredient updated" : "Ingredient added", {
            description: r.warnings[0],
          });
        }
      }}
    />
  );
}

function Library({ onEdit }: { onEdit: (i: Ingredient) => void }) {
  const { data, actions } = useBrewStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<IngredientCategory | "All">("All");
  if (!data) return null;
  const needle = q.trim().toLowerCase();
  const list = data.library.filter(
    (i) =>
      (cat === "All" || i.category === cat) &&
      (!needle ||
        [i.name, i.origin, i.flavor, i.notes].some((s) => s.toLowerCase().includes(needle))),
  );
  const usedBy = (id: string) =>
    data.recipes.filter((r) => r.grainBill.some((row) => row.ingredient?.libraryId === id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search malt library"
            placeholder="Search name, origin, flavor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category filter">
          {(["All", ...INGREDIENT_CATEGORIES] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {list.length} of {data.library.length} ingredients
      </p>
      {data.library.length === 0 && (
        <p className="text-sm text-muted-foreground">
          The library is empty. Restore the seed entries from Settings, or add your own.
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((i) => (
          <li
            key={i.id}
            className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-base font-semibold">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.origin}</div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "tabular font-display text-xl font-semibold",
                    !isIngredientUsableForCalc(i) && "text-destructive",
                  )}
                >
                  {formatPpg(i.ppg)}
                </div>
                <div className="eyebrow">PPG</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant={i.category === "Extract" ? "amber" : "muted"}>{i.category}</Badge>
              <Badge variant="outline" className="tabular font-normal">
                {i.extractFraction === null ? "PPG direct" : `fraction ${i.extractFraction} × 46`}
              </Badge>
              {i.source === "user" && <Badge variant="success">Custom</Badge>}
              {!isIngredientUsableForCalc(i) && (
                <Badge variant="danger">PPG must be &gt; 0 to calculate</Badge>
              )}
            </div>
            {i.flavor && <p className="mt-3 text-sm">{i.flavor}</p>}
            {i.notes && <p className="mt-2 text-xs italic text-muted-foreground">{i.notes}</p>}
            <div className="mt-auto flex justify-end gap-1 pt-3">
              <Button variant="ghost" size="sm" onClick={() => onEdit(i)}>
                <Pencil /> Edit
              </Button>
              <ConfirmButton
                trigger={
                  <Button variant="ghost" size="sm" className="hover:text-destructive">
                    <Trash2 /> Delete
                  </Button>
                }
                title={`Delete “${i.name}”?`}
                description={
                  usedBy(i.id) > 0
                    ? `${usedBy(i.id)} saved recipe(s) use it. They keep their saved snapshot of its values.`
                    : "It's removed from your library. Seed entries can be restored from Settings."
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                  if (await actions.deleteIngredient(i.id)) toast.success("Ingredient deleted");
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
