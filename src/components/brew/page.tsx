import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBrewStore } from "@/storage/brew-store";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="text-3xl font-semibold text-foreground sm:text-[2.1rem]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, title, description, actions }: { className?: string; children: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card shadow-card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="space-y-0.5">
            {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Renders children only after browser storage has loaded (nothing is read during SSR). */
export function WhenStoreReady({ children }: { children: ReactNode }) {
  const { status } = useBrewStore();
  if (status === "unavailable")
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-6 text-sm text-destructive">
        This browser isn't allowing local storage (private mode or blocked site data), so nothing can be saved here.
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

export function FieldError({ message, id }: { message?: string | null | undefined; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}
