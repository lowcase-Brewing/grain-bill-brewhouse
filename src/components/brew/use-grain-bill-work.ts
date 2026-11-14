import { useEffect, useMemo, useRef, useState } from "react";
import { calculateGrainBill } from "@/domain/calculator";
import type { CalculatorDraft } from "@/domain/types";
import { nowIso, useBrewStore } from "@/storage/brew-store";
import type { EditorState } from "./grain-bill-editor";

function sameWork(a: EditorState, b: EditorState) {
  return (
    JSON.stringify([a.settings, a.rows, a.loadedExample]) ===
    JSON.stringify([b.settings, b.rows, b.loadedExample])
  );
}

/**
 * Shared editor for the standalone calculator and a recipe's grain bill.
 * Keeps raw inputs, autosaves a draft whenever the work differs
 * from the baseline, and delegates saving/committing to the caller via `actions`.
 */
export function useGrainBillWork(draftKey: string, recipeId: string | null, baseline: EditorState) {
  const { data, actions } = useBrewStore();
  const existing = data?.drafts.find((d) => d.key === draftKey);
  const [state, setState] = useState<EditorState>(() =>
    existing
      ? { settings: existing.settings, rows: existing.rows, loadedExample: existing.loadedExample }
      : baseline,
  );
  const result = useMemo(
    () => calculateGrainBill(state.settings, state.rows),
    [state.settings, state.rows],
  );
  const dirty = !sameWork(state, baseline);
  const hasDraft = !!existing;

  const latest = useRef({ state, baseline, hasDraft });
  latest.current = { state, baseline, hasDraft };
  // Autosave is debounced, but a pending save is flushed on unmount so ordinary
  // navigation never drops the last edit. `pending` is cleared once handled.
  const pending = useRef(false);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const flush = useRef(() => {});
  flush.current = () => {
    if (!pending.current) return;
    pending.current = false;
    const { state: s, baseline: b, hasDraft: has } = latest.current;
    if (sameWork(s, b)) {
      if (has) void actionsRef.current.deleteDraft(draftKey);
    } else {
      const d: CalculatorDraft = {
        key: draftKey,
        recipeId,
        settings: s.settings,
        rows: s.rows,
        loadedExample: s.loadedExample,
        updatedAt: nowIso(),
      };
      void actionsRef.current.saveDraft(d);
    }
  };
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    pending.current = true;
    const t = setTimeout(() => flush.current(), 350);
    return () => clearTimeout(t);
  }, [state, baseline]);
  useEffect(() => () => flush.current(), []);

  const resetWork = (next: EditorState) => {
    // Resetting must remove an existing draft immediately. Waiting for the
    // autosave timer would leave a stale draft if the user navigates away now.
    latest.current = { state: next, baseline, hasDraft: false };
    pending.current = false;
    setState(next);
    void actions.deleteDraft(draftKey);
  };

  return { state, setState, resetWork, result, dirty, hasDraft };
}
