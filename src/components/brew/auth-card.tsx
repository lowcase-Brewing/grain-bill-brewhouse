import type { ReactNode } from "react";
import { Brand } from "./brand";

export function AuthCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="malt-lines flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
        <div className="mb-5"><Brand /></div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
