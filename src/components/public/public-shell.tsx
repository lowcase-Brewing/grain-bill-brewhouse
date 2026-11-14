import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/brew/brand";
import { accountBackendEnabled } from "@/lib/backend-config";

export function BetaSignIn({ className = "" }: { className?: string }) {
  return (
    <a
      href="/auth?redirect=%2Fworkbench"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <LockKeyhole className="size-3.5" aria-hidden /> Beta sign in{" "}
      <ArrowUpRight className="size-3.5" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#tools-content"
        className="sr-only focus:not-sr-only focus:block focus:bg-amber-soft focus:p-3"
      >
        Skip to content
      </a>
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-5 px-5 py-5 sm:px-8">
          <Link to="/" aria-label="lowcase Brewing tools home">
            <Brand />
          </Link>
          <nav
            aria-label="Public tools"
            className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm"
          >
            <Link
              to="/tools/grain-bill"
              className="text-sidebar-foreground/85 hover:text-sidebar-primary [&.active]:text-sidebar-primary"
            >
              Calculator
            </Link>
            <Link
              to="/tools/malts"
              className="text-sidebar-foreground/85 hover:text-sidebar-primary [&.active]:text-sidebar-primary"
            >
              Malt reference
            </Link>
            <BetaSignIn className="text-xs text-sidebar-muted hover:text-sidebar-primary" />
          </nav>
        </div>
      </header>
      <main id="tools-content" className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        {!accountBackendEnabled && (
          <p className="mb-7 w-fit rounded-full border border-amber/30 bg-amber-soft px-3 py-1 text-xs font-medium text-amber-foreground">
            Local preview · live accounts disconnected
          </p>
        )}
        {children}
      </main>
      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <a
            href="https://lowcasebrewing.com"
            className="inline-flex items-center gap-2 hover:text-primary"
          >
            <ArrowLeft className="size-3.5" /> Back to lowcase Brewing
          </a>
          <p>Weslaco, Texas · Good brewing starts with a little planning.</p>
        </div>
      </footer>
    </div>
  );
}
