import { ExternalLink } from "lucide-react";
import { standardReference } from "@/domain/standard-malts";
import { hasCustomizedReferenceValues } from "@/domain/malt-presentation";
import type { Ingredient } from "@/domain/types";

export function MaltDetails({ id, accountIngredient }: { id: string; accountIngredient?: Ingredient }) {
  const entry = standardReference(id);
  if (!entry) return null;
  const r = entry.reference;
  const customized = accountIngredient && hasCustomizedReferenceValues(accountIngredient);
  return <details className="mt-3 border-t border-border pt-3 text-xs leading-relaxed">
    <summary className="cursor-pointer font-medium text-primary">Product & yield details</summary>
    {accountIngredient && <p className="mt-3 text-muted-foreground"><strong>Standard reference specs.</strong> Your account’s displayed values take precedence.{customized && " This entry has been customized; its edited name and potential are not manufacturer-verified by this reference."}</p>}
    <dl className="mt-3 space-y-2 break-words">
      <div><dt className="font-semibold">Product</dt><dd>{r.manufacturer} · {r.product}</dd></div>
      <div><dt className="font-semibold">Color (source units)</dt><dd>{r.color}</dd></div>
      <div><dt className="font-semibold">Handling</dt><dd>{r.handling}</dd></div>
      <div><dt className="font-semibold">{r.yield.kind === "manufacturer-analysis" ? "Manufacturer analysis → planning potential" : "Estimated planning potential"}</dt><dd>{r.yield.basis}</dd>{r.yield.analysis && <dd>{r.yield.analysis}</dd>}</div>
      {r.aliases.length > 0 && <div><dt className="font-semibold">Also known as</dt><dd>{r.aliases.join(", ")}</dd></div>}
    </dl>
    {r.yield.kind === "historical-estimate" ? <p className="mt-3 text-muted-foreground">Original lowcase planning reference, 2026-11-13</p> : <>
      <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-primary underline">Official product reference<ExternalLink className="size-3"/><span className="sr-only"> (opens in new tab)</span></a>
      <p className="mt-1 text-muted-foreground">Checked {r.checkedOn}</p>
    </>}
  </details>;
}