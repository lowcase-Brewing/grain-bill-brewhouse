import { AlertTriangle, Info, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateGrainBill, type FieldCheck, type GrainBillResult, type SettingField } from "@/domain/calculator";
import { formatLb, formatOG, formatPercent, formatPoints, formatPpg, formatSignedPoints } from "@/domain/format";
import { snapshotIngredient, snapshotState } from "@/domain/library";
import type { CalcSettingsInput, CalculatorDraft, GrainRowInput, Ingredient } from "@/domain/types";
import { cn } from "@/lib/utils";
import { newId, nowIso, useBrewStore } from "@/storage/brew-store";
import { IngredientPicker } from "./ingredient-picker";
import { FieldError, Panel } from "./page";

export interface EditorState {
  settings: CalcSettingsInput;
  rows: GrainRowInput[];
  loadedExample: boolean;
}

export function emptyRow(): GrainRowInput {
  return { id: newId(), ingredient: null, lb: "", oz: "" };
}

function sameWork(a: EditorState, b: EditorState) {
  return JSON.stringify([a.settings, a.rows, a.loadedExample]) === JSON.stringify([b.settings, b.rows, b.loadedExample]);
}

/**
 * Shared editor for the standalone calculator and a recipe's grain bill.
 * Keeps raw inputs, autosaves a draft in this browser whenever the work differs
 * from the baseline, and delegates saving/committing to the caller via `actions`.
 */
export function useGrainBillWork(draftKey: string, recipeId: string | null, baseline: EditorState) {
  const { data, actions } = useBrewStore();
  const existing = data?.drafts.find((d) => d.key === draftKey);
  const [state, setState] = useState<EditorState>(() =>
    existing ? { settings: existing.settings, rows: existing.rows, loadedExample: existing.loadedExample } : baseline,
  );
  const result = useMemo(() => calculateGrainBill(state.settings, state.rows), [state.settings, state.rows]);
  const dirty = !sameWork(state, baseline);
  const hasDraft = !!existing;

  const latest = useRef({ state, baseline, hasDraft });
  latest.current = { state, baseline, hasDraft };
  useEffect(() => {
    const t = setTimeout(() => {
      const { state: s, baseline: b, hasDraft: has } = latest.current;
      if (sameWork(s, b)) {
        if (has) void actions.deleteDraft(draftKey);
      } else {
        const d: CalculatorDraft = { key: draftKey, recipeId, settings: s.settings, rows: s.rows, loadedExample: s.loadedExample, updatedAt: nowIso() };
        void actions.saveDraft(d);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, baseline]);

  return { state, setState, result, dirty, hasDraft };
}

const SETTING_FIELDS: { field: SettingField; label: string; unit: string; hint: string }[] = [
  { field: "coldFermenterGal", label: "Cold fermenter volume", unit: "US gal", hint: "Volume reaching the fermenter, cold." },
  { field: "efficiencyPct", label: "Brewhouse efficiency", unit: "%", hint: "Applied to grains and adjuncts only." },
  { field: "targetOG", label: "Target OG", unit: "SG", hint: "Optional. Between 1.000 and 1.300." },
  { field: "extractRecoveryPct", label: "Extract recovery", unit: "%", hint: "Applied to Extract only. Provisional." },
];

export function SettingsInputs({
  settings,
  result,
  onChange,
}: {
  settings: CalcSettingsInput;
  result: GrainBillResult;
  onChange: (s: CalcSettingsInput) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {SETTING_FIELDS.map(({ field, label, unit, hint }) => {
        const check: FieldCheck = result.settings[field];
        const relevant =
          field === "extractRecoveryPct" ? result.usesExtract : field === "efficiencyPct" ? result.usesGrain || !check.blank : true;
        const showError = check.error && (relevant || !check.blank);
        const id = `setting-${field}`;
        return (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
              {label}
            </Label>
            <div className="relative">
              <Input
                id={id}
                inputMode="decimal"
                autoComplete="off"
                value={settings[field]}
                aria-invalid={showError ? true : undefined}
                aria-describedby={`${id}-msg`}
                onChange={(e) => onChange({ ...settings, [field]: e.target.value })}
                className={cn("tabular bg-card pr-14", showError && "border-destructive focus-visible:ring-destructive")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
            </div>
            {showError ? (
              <FieldError id={`${id}-msg`} message={check.error} />
            ) : (
              <p id={`${id}-msg`} className="text-[11px] leading-snug text-muted-foreground">
                {field === "extractRecoveryPct" && !result.usesExtract ? "Only used when an Extract is in the bill." : hint}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Cell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="eyebrow mb-1 md:hidden">{label}</div>
      {children}
    </div>
  );
}

const GRID = "md:grid md:grid-cols-[minmax(0,2.6fr)_4.5rem_4.5rem_4.5rem_4rem_4.25rem_4.25rem_2.25rem] md:items-start md:gap-3";

export function RowsEditor({
  rows,
  result,
  library,
  onChange,
}: {
  rows: GrainRowInput[];
  result: GrainBillResult;
  library: Ingredient[];
  onChange: (rows: GrainRowInput[]) => void;
}) {
  const update = (id: string, patch: Partial<GrainRowInput>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div>
      <div className={cn("hidden border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", GRID)}>
        <span>Ingredient</span>
        <span>lb</span>
        <span>+ oz</span>
        <span className="text-right">Total lb</span>
        <span className="text-right">PPG</span>
        <span className="text-right">% bill</span>
        <span className="text-right">OG pts</span>
        <span className="sr-only">Remove</span>
      </div>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No rows yet. Add an ingredient to begin.</p>}
      <ul className="divide-y divide-border">
        {rows.map((row, idx) => {
          const r = result.rows[idx];
          const invalid = r?.status === "invalid";
          const snap = row.ingredient ? snapshotState(row.ingredient, library) : null;
          const lib = row.ingredient ? library.find((i) => i.id === row.ingredient!.libraryId) : undefined;
          return (
            <li key={row.id} className={cn("py-3", invalid && "rounded-md bg-destructive-soft/50 md:bg-transparent")}>
              <div className={cn("grid grid-cols-3 gap-3", GRID)}>
                <Cell label="Ingredient" className="col-span-3 md:col-span-1">
                  <IngredientPicker
                    id={`row-${row.id}-ingredient`}
                    library={library}
                    value={row.ingredient}
                    invalid={invalid && !row.ingredient}
                    onChange={(i) => update(row.id, { ingredient: snapshotIngredient(i, nowIso()) })}
                  />
                  {row.ingredient && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={row.ingredient.category === "Extract" ? "amber" : "muted"} className="px-1.5 py-0 text-[10px]">
                        {row.ingredient.category}
                      </Badge>
                      {snap === "library-changed" && lib && (
                        <button
                          type="button"
                          onClick={() => update(row.id, { ingredient: snapshotIngredient(lib, nowIso()) })}
                          className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 text-[10px] font-medium text-warning-foreground hover:underline"
                          title="This row keeps the values it was added with. Click to use the current library values."
                        >
                          <RefreshCcw className="size-3" /> Library changed — use current values
                        </button>
                      )}
                      {snap === "not-in-library" && (
                        <Badge variant="muted" className="px-1.5 py-0 text-[10px]" title="Kept from the saved snapshot">
                          Not in library · snapshot kept
                        </Badge>
                      )}
                    </div>
                  )}
                </Cell>
                <Cell label="lb">
                  <Input
                    aria-label={`Pounds, row ${idx + 1}`}
                    inputMode="decimal"
                    autoComplete="off"
                    value={row.lb}
                    onChange={(e) => update(row.id, { lb: e.target.value })}
                    aria-invalid={invalid && r.errors.some((e) => /Pounds|weight|Weight/.test(e)) ? true : undefined}
                    className="tabular h-9 bg-card px-2"
                  />
                </Cell>
                <Cell label="+ oz">
                  <Input
                    aria-label={`Additional ounces, row ${idx + 1}`}
                    inputMode="decimal"
                    autoComplete="off"
                    value={row.oz}
                    onChange={(e) => update(row.id, { oz: e.target.value })}
                    aria-invalid={invalid && r.errors.some((e) => /Ounces|weight|Weight/.test(e)) ? true : undefined}
                    className="tabular h-9 bg-card px-2"
                  />
                </Cell>
                <Cell label="Total lb" className="tabular text-sm md:pt-2 md:text-right">
                  {r?.weightLb != null && r.status !== "blank" ? formatLb(r.weightLb) : "—"}
                </Cell>
                <Cell label="PPG" className="tabular text-sm md:pt-2 md:text-right">
                  {row.ingredient ? formatPpg(row.ingredient.ppg) : "—"}
                </Cell>
                <Cell label="% bill" className="tabular text-sm md:pt-2 md:text-right">
                  {r?.percentOfBill != null ? formatPercent(r.percentOfBill) : "—"}
                </Cell>
                <Cell label="OG pts" className="tabular text-sm font-medium md:pt-2 md:text-right">
                  {r?.ogPoints != null ? formatPoints(r.ogPoints) : "—"}
                </Cell>
                <div className="col-span-3 flex justify-end md:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove row ${idx + 1}`}
                    onClick={() => onChange(rows.filter((x) => x.id !== row.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {invalid && (
                <ul className="mt-2 space-y-0.5 text-xs text-destructive" role="alert">
                  {r.errors.map((e) => (
                    <li key={e} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-px size-3 shrink-0" /> {e}
                    </li>
                  ))}
                </ul>
              )}
              {r?.status === "valid" && r.pointsBlockedReason && (
                <p className="mt-1.5 text-xs text-muted-foreground">{r.pointsBlockedReason}</p>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => onChange([...rows, emptyRow()])}>
        <Plus /> Add row
      </Button>
    </div>
  );
}

function Stat({ label, value, sub, emphasis }: { label: string; value: ReactNode; sub?: ReactNode; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("tabular text-right", emphasis ? "text-base font-semibold" : "text-sm")}>
        {value}
        {sub && <div className="text-[11px] font-normal text-muted-foreground">{sub}</div>}
      </dd>
    </div>
  );
}

export function ResultsPanel({ result, children }: { result: GrainBillResult; children?: ReactNode }) {
  const og = result.estimatedOG;
  return (
    <section className="rounded-xl border border-border bg-card shadow-raised" aria-label="Results">
      <div className="rounded-t-xl border-b border-border bg-sidebar px-5 py-5 text-sidebar-foreground malt-lines">
        <div className="eyebrow text-sidebar-muted">Estimated OG</div>
        {og !== null ? (
          <div className="tabular font-display text-5xl font-semibold text-sidebar-primary">{formatOG(og)}</div>
        ) : (
          <div className="tabular font-display text-5xl font-semibold text-sidebar-muted/60">—</div>
        )}
        {og === null && result.ogSuppressedReason && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-sidebar-foreground/85">
            <Info className="mt-px size-3.5 shrink-0" /> {result.ogSuppressedReason}
          </p>
        )}
      </div>
      <dl className="divide-y divide-border px-5 py-2">
        <Stat label="Gravity points" value={result.totalPoints !== null ? formatPoints(result.totalPoints) : "—"} />
        <Stat
          label="vs target"
          emphasis
          value={result.differencePoints !== null ? `${formatSignedPoints(result.differencePoints)} pts` : "—"}
          sub={result.differencePoints === null ? result.differenceReason : undefined}
        />
        <Stat label="Total bill weight" value={result.totalWeightLb !== null ? `${formatLb(result.totalWeightLb)} lb` : "—"} sub="Includes extract" />
        <Stat
          label="Mashed grain load"
          value={result.mashedGrainLb !== null ? `${formatLb(result.mashedGrainLb)} lb` : "—"}
          sub="Excludes extract — what goes in the malt pipe"
        />
        {result.usesExtract && (
          <Stat label="Kettle extract" value={result.extractWeightLb !== null ? `${formatLb(result.extractWeightLb)} lb` : "—"} />
        )}
      </dl>
      <div className="space-y-2 border-t border-border px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <p>Predicts gravity only — no attenuation, ABV, or color.</p>
        {result.usesExtract && (
          <p>
            Extract recovery is <strong className="font-semibold text-foreground">provisional, not measured</strong>: the fraction of dissolved
            kettle extract reaching the fermenter (cold fermenter volume ÷ total cold post-boil kettle volume at uniform gravity). Include
            extract-dissolving water in volume planning.
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
