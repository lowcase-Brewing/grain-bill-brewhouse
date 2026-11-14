import { useEffect, useMemo, useState } from "react";
import { Download, Eraser, FlaskConical, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { GrainBillWorkspace, type EditorState } from "@/components/brew/grain-bill-editor";
import { PageHeader } from "@/components/brew/page";
import { DEFAULT_CALC_SETTINGS, calculateGrainBill } from "@/domain/calculator";
import { referenceExample } from "@/domain/examples";
import { PUBLIC_REFERENCE_LIBRARY, PUBLIC_REFERENCE_VERSION } from "@/domain/public-reference";
import { calculationText } from "@/domain/calculation-download";
import { nowIso } from "@/lib/identity";
import { BetaSignIn } from "./public-shell";

function blankWork(): EditorState {
  return { settings: { ...DEFAULT_CALC_SETTINGS }, rows: [], loadedExample: false };
}

export function GuestCalculator() {
  const [state, setState] = useState<EditorState>(blankWork);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const result = useMemo(
    () => calculateGrainBill(state.settings, state.rows),
    [state.settings, state.rows],
  );
  const hasRows = state.rows.some((row) => row.ingredient || row.lb.trim() || row.oz.trim());
  const dirty =
    state.rows.length > 0 ||
    JSON.stringify(state.settings) !== JSON.stringify(DEFAULT_CALC_SETTINGS);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const loadExample = () => {
    const example = referenceExample(nowIso());
    setState({ ...example, loadedExample: true });
  };
  const download = () => {
    setDownloadError(null);
    let url: string | undefined;
    let anchor: HTMLAnchorElement | undefined;
    try {
      const blob = new Blob([calculationText(state.settings, state.rows)], {
        type: "text/plain;charset=utf-8",
      });
      url = URL.createObjectURL(blob);
      anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "lowcase-grain-bill.txt";
      document.body.appendChild(anchor);
      anchor.click();
    } catch {
      setDownloadError("The download couldn’t start. Please try again before leaving this page.");
    } finally {
      anchor?.remove();
      if (url) {
        const fileUrl = url;
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      }
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Public brewing tools"
        title="Grain bill calculator"
        description="Plan your grain bill. No account needed. Enter ingredient weights to estimate original gravity from your batch volume and efficiency."
      />
      <div className="mb-6 rounded-xl border border-primary/15 bg-secondary/70 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">Your calculation is not autosaved.</p>
        <p>It runs in this page. Download a copy before leaving or refreshing.</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {dirty ? (
          <ConfirmButton
            destructive={false}
            trigger={
              <Button variant="soft">
                <FlaskConical /> Load reference example
              </Button>
            }
            title="Replace your calculation with the reference example?"
            description="Your current inputs will be replaced. Download a copy first if you need to keep them."
            confirmLabel="Load example"
            onConfirm={loadExample}
          />
        ) : (
          <Button variant="soft" onClick={loadExample}>
            <FlaskConical /> Load reference example
          </Button>
        )}
        <Button variant="outline" disabled={!hasRows} onClick={download}>
          <Download /> Download calculation
        </Button>
        <ConfirmButton
          trigger={
            <Button variant="ghost" disabled={!dirty}>
              <Eraser /> Clear
            </Button>
          }
          title="Clear this calculation?"
          description="Your rows will be removed and the settings reset. This only clears this page’s scratch work."
          confirmLabel="Clear calculation"
          onConfirm={() => {
            setState(blankWork());
            setDownloadError(null);
          }}
        />
      </div>
      {downloadError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {downloadError}
        </p>
      )}
      <GrainBillWorkspace
        state={state}
        setState={setState}
        result={result}
        library={PUBLIC_REFERENCE_LIBRARY}
        publicReference
        banner={
          state.loadedExample ? (
            <div className="rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-amber-foreground">
              <strong>Reference example</strong> — a calculation test case, not a lowcase recipe.
              Expected: 13 lb total, 9 lb mashed grain, OG 1.060, +8.3 points vs 1.052.
            </div>
          ) : undefined
        }
        resultsFooter={
          <p>Standard reference: {PUBLIC_REFERENCE_VERSION}. No account draft is created.</p>
        }
      />
      <section
        className="mt-8 flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
        aria-label="Account recipe saving"
      >
        <div className="flex gap-3">
          <LockKeyhole className="mt-1 size-4 shrink-0 text-copper" />
          <div>
            <h2 className="font-medium">Want to save recipes and sync across devices?</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Those features are for invited beta accounts. Public registration isn’t open yet.
              Signing in won’t transfer this calculation; download a copy to keep it.
            </p>
          </div>
        </div>
        <BetaSignIn className="shrink-0 text-sm font-medium text-primary" />
      </section>
    </>
  );
}
