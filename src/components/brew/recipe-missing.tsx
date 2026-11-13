import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecipeMissing() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-display text-lg">That recipe isn't in this browser.</p>
      <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or saved in a different browser.</p>
      <Button asChild className="mt-5" variant="outline"><Link to="/recipes"><ArrowLeft /> Back to recipes</Link></Button>
    </div>
  );
}

