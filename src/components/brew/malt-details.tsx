import { ExternalLink } from "lucide-react";
import { standardReference } from "@/domain/standard-malts";

export function MaltDetails({ id }: { id: string }) {
  const entry = standardReference(id);
  if (!entry) return null;
  const r = entry.reference;
  return <details className="mt-3 border-t border-border pt-3 text-xs leading-relaxed">
    <summary className="cursor-pointer font-medium text-primary">Product & yield details</summary>
    <dl className="mt-3 space-y-2 break-words">
      <div><dt className="font-semibold">Product</dt><dd>{r.manufacturer} · {r.product}</dd></div>
      <div><dt className="font-semibold">Color (source units)</dt><dd>{r.color}</dd></div>
      <div><dt className="font-semibold">Handling</dt><dd>{r.handling}</dd></div>
      <div><dt className="font-semibold">{r.yield.kind === "manufacturer-analysis" ? "Manufacturer analysis → planning potential" : "Estimated planning potential"}</dt><dd>{r.yield.basis}</dd>{r.yield.analysis && <dd>{r.yield.analysis}</dd>}</div>
      {r.aliases.length > 0 && <div><dt className="font-semibold">Also known as</dt><dd>{r.aliases.join(", ")}</dd></div>}
    </dl>
    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-primary underline">{r.yield.kind === "historical-estimate" ? "Historical sheet" : "Official product reference"}<ExternalLink className="size-3"/><span className="sr-only"> (opens in new tab)</span></a>
    <p className="mt-1 text-muted-foreground">Checked {r.checkedOn}</p>
  </details>;
}