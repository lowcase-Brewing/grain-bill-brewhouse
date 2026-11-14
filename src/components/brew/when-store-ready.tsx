import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBrewStore } from "@/storage/brew-store";

/** Renders children only after browser storage has loaded (nothing is read during SSR). */
export function WhenStoreReady({ children }: { children: ReactNode }) {
  const { status } = useBrewStore();
  if (status === "unavailable")
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-6 text-sm text-destructive">
        This browser isn't allowing local storage (private mode or blocked site data), so nothing
        can be saved here.
      </div>
    );
  if (status === "loading")
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  return <>{children}</>;
}
