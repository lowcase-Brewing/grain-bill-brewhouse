import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPpg } from "@/domain/format";
import { deriveGrainPpg, emptyIngredientDraft, ingredientToDraft, validateIngredientDraft, type IngredientDraft, type IngredientDraftErrors } from "@/domain/library";
import { parseNumberInput } from "@/domain/numbers";
import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from "@/domain/types";
import { FieldError } from "./page";

export function IngredientDialog({
  open, onOpenChange, editing, library, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Ingredient | null;
  library: Ingredient[];
  onSave: (value: ReturnType<typeof validateIngredientDraft> & { ok: true }) => Promise<void>;
}) {
  const [d, setD] = useState<IngredientDraft>(emptyIngredientDraft());
  const [errors, setErrors] = useState<IngredientDraftErrors>({});
  useEffect(() => {
    if (open) {
      setD(editing ? ingredientToDraft(editing) : emptyIngredientDraft());
      setErrors({});
    }
  }, [open, editing]);
  const isExtract = d.category === "Extract";
  const f = parseNumberInput(d.extractFraction);
  const preview = !isExtract && f.kind === "number" && f.value > 0 && f.value <= 1 ? formatPpg(deriveGrainPpg(f.value)) : null;
  const set = (k: keyof IngredientDraft, v: string) => setD({ ...d, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "Add ingredient"}</DialogTitle>
          <DialogDescription>Saved recipes keep their own snapshot of these values, so edits here don't rewrite them.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = validateIngredientDraft(d, library, editing?.id);
            if (!r.ok) return setErrors(r.errors);
            await onSave(r);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ing-name">Name</Label>
            <Input id="ing-name" value={d.name} onChange={(e) => set("name", e.target.value)} />
            <FieldError message={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ing-cat">Category</Label>
              <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v as IngredientCategory })}>
                <SelectTrigger id="ing-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{INGREDIENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isExtract ? (
              <div className="space-y-1.5">
                <Label htmlFor="ing-ppg">PPG (direct)</Label>
                <Input id="ing-ppg" inputMode="decimal" className="tabular" value={d.ppg} onChange={(e) => set("ppg", e.target.value)} />
                <FieldError message={errors.ppg} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ing-ef">Extract fraction</Label>
                <Input id="ing-ef" inputMode="decimal" className="tabular" placeholder="0–1, e.g. 0.8" value={d.extractFraction} onChange={(e) => set("extractFraction", e.target.value)} />
                {errors.extractFraction ? <FieldError message={errors.extractFraction} /> : <p className="tabular text-[11px] text-muted-foreground">PPG = fraction × 46 {preview && `= ${preview}`}</p>}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ing-origin">Origin / examples</Label>
            <Input id="ing-origin" value={d.origin} onChange={(e) => set("origin", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ing-flavor">Flavor</Label>
            <Textarea id="ing-flavor" rows={2} value={d.flavor} onChange={(e) => set("flavor", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ing-notes">Source notes</Label>
            <Textarea id="ing-notes" rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Add ingredient"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
