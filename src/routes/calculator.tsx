import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, Eraser, FlaskConical } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { emptyRow, GrainBillWorkspace, useGrainBillWork, type EditorState } from "@/components/brew/grain-bill-editor";
import { FieldError, PageHeader, WhenStoreReady } from "@/components/brew/page";
import { DEFAULT_CALC_SETTINGS } from "@/domain/calculator";
import { referenceExample } from "@/domain/examples";
import { applyGrainBillToRecipe, emptyRecipeForm, validateRecipeForm, type RecipeFormErrors } from "@/domain/recipe";
import { BREW_METHODS, BREW_METHOD_LABELS, type BrewMethod } from "@/domain/types";
import { nowIso, useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Grain bill calculator · lowcase Brewing" },
      { name: "description", content: "Estimate OG from a grain bill using the lowcase Grain Bill Calculations sheet formulas." },
      { property: "og:title", content: "Grain bill calculator · lowcase Brewing" },
      { property: "og:description", content: "Gravity estimate using the lowcase sheet formulas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalculatorPage,
});

const SCRATCH_KEY = "scratch";

function CalculatorPage() {
  return (
    <>
      <PageHeader
        eyebrow="Calculator"
        title="Grain bill calculator"
        description="Reproduces the Grain Bill tab of lowcase Grain Bill Calculations (read-only snapshot, 2026-11-13). Scratch work autosaves in this browser."
      />
      <WhenStoreReady><Scratch /></WhenStoreReady>
    </>
  );
}

function Scratch() {
  const { data, actions } = useBrewStore();
  const navigate = useNavigate();
  const baseline = useMemo<EditorState>(() => ({ settings: { ...DEFAULT_CALC_SETTINGS }, rows: [], loadedExample: false }), []);
  const { state, setState, resetWork, result, dirty } = useGrainBillWork(SCRATCH_KEY, null, baseline);
  const [saveOpen, setSaveOpen] = useState(false);

  const loadExample = () => {
    const ex = referenceExample(nowIso());
    setState({ settings: ex.settings, rows: ex.rows, loadedExample: true });
  };
  const hasRows = state.rows.some((r) => r.ingredient || r.lb.trim() || r.oz.trim());

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {hasRows ? (
          <ConfirmButton
            destructive={false}
            trigger={<Button variant="soft"><FlaskConical /> Load reference example</Button>}
            title="Replace the scratch calculator with the reference example?"
            description="Your current scratch rows and settings will be replaced."
            confirmLabel="Load example"
            onConfirm={loadExample}
          />
        ) : (
          <Button variant="soft" onClick={loadExample}><FlaskConical /> Load reference example</Button>
        )}
        <Button variant="outline" onClick={() => setState({ ...state, rows: [...state.rows, emptyRow()] })}>Add row</Button>
        <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!hasRows}><BookmarkPlus /> Save as new recipe</Button>
        <ConfirmButton
          trigger={<Button variant="ghost" disabled={!dirty}><Eraser /> Clear</Button>}
          title="Clear the scratch calculator?"
          description="Rows are removed and settings return to the sheet defaults."
          confirmLabel="Clear"
          onConfirm={() => resetWork(baseline)}
        />
      </div>
      <GrainBillWorkspace
        state={state}
        setState={setState}
        result={result}
        library={data?.library ?? []}
        banner={
          state.loadedExample ? (
            <div className="rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-amber-foreground">
              <strong className="font-semibold">Reference example from the sheet</strong> — a calculator test case, not a lowcase recipe. Expected: 13 lb total, 9 lb mashed grain,
              60.2935… points, OG 1.060, +8.3 vs 1.052. Uses the original seed values even if you've edited the library.
            </div>
          ) : undefined
        }
        resultsFooter={<p>{dirty ? "Scratch draft autosaved in this browser." : "Nothing in progress."}</p>}
      />
      <SaveAsRecipeDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSave={async (form) => {
          const r = validateRecipeForm({ ...emptyRecipeForm(), ...form, ...state.settings });
          if (!r.ok) return r.errors;
          const rows = state.rows.filter((x) => x.ingredient || x.lb.trim() || x.oz.trim());
          const created = await actions.createRecipe(r.value, rows);
          if (!created) return {};
          await actions.saveRecipe(applyGrainBillToRecipe(created, r.value.parameters, rows, result, nowIso()));
          resetWork(baseline);
          setSaveOpen(false);
          toast.success(`Saved as “${created.name}”`);
          void navigate({ to: "/recipes/$recipeId", params: { recipeId: created.id } });
          return null;
        }}
      />
    </>
  );
}

type SaveForm = { name: string; style: string; version: string; method: BrewMethod };

function SaveAsRecipeDialog({
  open, onOpenChange, onSave,
}: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (f: SaveForm) => Promise<RecipeFormErrors | null> }) {
  const [f, setF] = useState<SaveForm>({ name: "", style: "", version: "1.0.0", method: "all-grain" });
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const settingErr = errors.coldFermenterGal || errors.efficiencyPct || errors.targetOG || errors.extractRecoveryPct;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as new recipe</DialogTitle>
          <DialogDescription>Rows, ingredient snapshots and settings move into a new recipe. Add notes on the recipe page.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await onSave(f);
            setErrors(res ?? {});
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="save-name">Recipe name</Label>
            <Input id="save-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <FieldError message={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="save-style">Style</Label>
              <Input id="save-style" value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })} />
              <FieldError message={errors.style} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="save-version">Version</Label>
              <Input id="save-version" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} />
              <FieldError message={errors.version} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="save-method">Method</Label>
            <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v as BrewMethod })}>
              <SelectTrigger id="save-method"><SelectValue /></SelectTrigger>
              <SelectContent>{BREW_METHODS.map((m) => <SelectItem key={m} value={m}>{BREW_METHOD_LABELS[m]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {settingErr && <FieldError message={`Calculator settings need fixing first: ${settingErr}`} />}
          <DialogFooter>
            <Button type="submit">Create recipe</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
