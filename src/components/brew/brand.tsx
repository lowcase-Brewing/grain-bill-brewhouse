import { Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <Wheat
        className={cn("size-5 self-center", tone === "dark" ? "text-sidebar-primary" : "text-copper")}
        aria-hidden
        strokeWidth={1.6}
      />
      <span className="font-display text-xl font-semibold lowercase leading-none tracking-tight">lowcase</span>
      <span
        className={cn(
          "text-xs font-medium uppercase tracking-[0.18em]",
          tone === "dark" ? "text-sidebar-muted" : "text-muted-foreground",
        )}
      >
        Brewing
      </span>
    </span>
  );
}
