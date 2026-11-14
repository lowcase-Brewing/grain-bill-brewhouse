import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { missingStandardIngredients } from "@/domain/library-updates";
import { STANDARD_CATALOG_VERSION } from "@/domain/standard-malts";
import { useBrewStore } from "@/storage/brew-store";
import { MaltDetails } from "./malt-details";

export function LibraryUpdates() {
  const { data, actions, reload } = useBrewStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<{ id: string; message: string }[]>([]);
  const missing = missingStandardIngredients(data?.library ?? [], "2026-11-14T00:00:00Z");
  const apply = async () => {
    setBusy(true); setMessage(""); setFailures([]);
    try {
      const result = await actions.addStandardIngredients(selected);
      if (!result) {
        setMessage("The update could not be confirmed. Some additions may have saved. Refresh the list before retrying; existing entries will not be overwritten.");
      } else {
        setFailures(result.failed);
        setSelected(result.failed.map((f) => f.id));
        setMessage(`${result.insertedIds.length} added; ${result.skippedIds.length} already present or no longer available; ${result.failed.length} failed. Existing entries were left unchanged.`);
      }
    } finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" onClick={() => { setOpen(true); setSelected([]); setMessage(""); setFailures([]); }}><RefreshCw/> Review library updates ({missing.length})</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Standard library updates</DialogTitle><DialogDescription>Catalog {STANDARD_CATALOG_VERSION}. Choose missing entries to add. Custom edits and saved grain bills stay unchanged. Removed entries return only if you select them here.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm">{missing.length} missing · {selected.filter((id) => missing.some((i) => i.id === id)).length} selected</p>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setSelected(missing.map((i) => i.id))}>Select all</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected([])}>Clear selection</Button>
          <Button size="icon" variant="ghost" title="Refresh missing entries" aria-label="Refresh missing entries" disabled={busy} onClick={async () => { setBusy(true); try { await reload(); setMessage("List refreshed; additions are checked again when saved."); } finally { setBusy(false); } }}><RefreshCw/></Button>
        </div>
        {message && <p role="status" className="text-sm">{message}</p>}
        {failures.length > 0 && <ul role="alert" className="text-sm text-destructive">{failures.map((f) => <li key={f.id}>{missing.find((i) => i.id === f.id)?.name ?? f.id}: {f.message}</li>)}</ul>}
        <ul className="divide-y divide-border">{missing.map((i) => <li key={i.id} className="py-3">
          <label className="flex items-start gap-3"><Checkbox disabled={busy} checked={selected.includes(i.id)} onCheckedChange={(checked) => setSelected((prev) => checked === true ? [...prev.filter((id) => id !== i.id), i.id] : prev.filter((id) => id !== i.id))}/><span className="min-w-0 text-sm"><span className="font-semibold">{i.name}</span><span className="block text-xs text-muted-foreground">{i.category} · {i.ppg.toFixed(2)} PPG</span></span></label>
          <MaltDetails id={i.id}/>
        </li>)}</ul>
        {!missing.length && <p className="text-sm text-muted-foreground">No missing standard ingredients.</p>}
        <Button disabled={busy || !selected.length} onClick={() => void apply()}>{busy ? "Checking and saving…" : `Add selected ingredients (${selected.length})`}</Button>
      </DialogContent>
    </Dialog>
  </>;
}