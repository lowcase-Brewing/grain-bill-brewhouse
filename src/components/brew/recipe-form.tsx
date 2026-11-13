import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateRecipeForm, type RecipeCore, type RecipeFormErrors, type RecipeFormInput } from "@/domain/recipe";
import { BREW_METHODS, BREW_METHOD_LABELS, type BrewMethod } from "@/domain/types";
import { cn } from "@/lib/utils";
import { FieldError, Panel } from "./page";

type TextKey = Exclude<keyof RecipeFormInput, "method">;

function Field({
  form, errors, k, label, required, hint, unit, set, numeric,
}: {
  form: RecipeFormInput; errors: RecipeFormErrors; k: TextKey; label: string; required?: boolean; hint?: string; unit?: string; numeric?: boolean;
  set: (k: TextKey, v: string) => void;
}) {
  const id = `recipe-${k}`;
  const err = errors[k];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-copper">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={form[k]}
          onChange={(e) => set(k, e.target.value)}
          inputMode={numeric ? "decimal" : undefined}
          autoComplete="off"
          aria-invalid={err ? true : undefined}
          className={cn("bg-card", numeric && "tabular", unit && "pr-14", err && "border-destructive")}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>}
      </div>
      {err ? <FieldError message={err} /> : hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Area({ form, k, label, hint, set, rows = 3 }: { form: RecipeFormInput; k: TextKey; label: string; hint?: string; set: (k: TextKey, v: string) => void; rows?: number }) {
  const id = `recipe-${k}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={form[k]} onChange={(e) => set(k, e.target.value)} className="bg-card" />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RecipeForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial: RecipeFormInput;
  submitLabel: string;
  onSubmit: (core: RecipeCore) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: TextKey, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (attempted) {
      const r = validateRecipeForm(next);
      setErrors(r.ok ? {} : r.errors);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    const r = validateRecipeForm(form);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(r.value);
    } finally {
      setBusy(false);
    }
  };

  const p = { form, errors, set };
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Panel title="Recipe" description="Name, style and version identify the project folder and export files.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field {...p} k="name" label="Recipe name" required />
          <Field {...p} k="style" label="Style" required hint="e.g. Dark Lager, Witbier" />
          <Field {...p} k="version" label="Version" required hint="Semantic version, e.g. 1.0.0" />
          <div className="space-y-1.5">
            <Label htmlFor="recipe-method">Method <span className="text-copper">*</span></Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as BrewMethod })}>
              <SelectTrigger id="recipe-method" className="bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BREW_METHODS.map((m) => <SelectItem key={m} value={m}>{BREW_METHOD_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <Panel title="Gravity settings" description="Used by this recipe's grain bill calculator. Kept in sync both ways.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field {...p} k="coldFermenterGal" label="Cold fermenter volume" unit="US gal" numeric required />
          <Field {...p} k="efficiencyPct" label="Brewhouse efficiency" unit="%" numeric required hint="Grains and adjuncts" />
          <Field {...p} k="targetOG" label="Target OG" unit="SG" numeric hint="Optional, 1.000–1.300" />
          <Field {...p} k="extractRecoveryPct" label="Extract recovery" unit="%" numeric required hint="Provisional, not measured" />
        </div>
      </Panel>

      <Panel title="Notes" description="Free text. Hops, yeast and process aren't calculated — they're kept as written.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Area {...p} k="description" label="Description" />
          <Area {...p} k="notes" label="Notes" />
          <Area {...p} k="hopsNotes" label="Hops" hint="Optional" />
          <Area {...p} k="yeastNotes" label="Yeast" hint="Optional" />
          <div className="lg:col-span-2"><Area {...p} k="processNotes" label="Process" hint="Optional — mash, boil, fermentation schedule" rows={4} /></div>
        </div>
      </Panel>

      {attempted && Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm text-destructive">Check the highlighted fields above.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
