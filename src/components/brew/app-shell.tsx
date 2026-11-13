import { Link } from "@tanstack/react-router";
import { BookOpen, Calculator, FlaskConical, LayoutDashboard, Menu, Settings2, Wheat } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { StorageStatus } from "./storage-status";

const NAV = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, exact: true },
  { to: "/recipes", label: "Recipes", short: "Recipes", icon: BookOpen, exact: false },
  { to: "/calculator", label: "Grain bill calculator", short: "Calculator", icon: Calculator, exact: false },
  { to: "/malts", label: "Malt library", short: "Malts", icon: Wheat, exact: false },
  { to: "/settings", label: "Workflow & settings", short: "Settings", icon: Settings2, exact: false },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact }}
          className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
        >
          <item.icon className="size-4 text-sidebar-muted group-data-[status=active]:text-sidebar-primary" strokeWidth={1.8} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-2 border-t border-sidebar-border px-4 py-4">
      <StorageStatus tone="dark" />
      <p className="flex items-center gap-1.5 text-[11px] leading-snug text-sidebar-muted">
        <FlaskConical className="size-3" aria-hidden /> Weslaco, Texas · private workbench
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="malt-lines fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Link to="/" aria-label="lowcase Brewing home">
            <Brand />
          </Link>
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Link to="/" aria-label="lowcase Brewing home">
          <Brand />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="malt-lines flex w-72 flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="px-5 pb-4 pt-6 text-left">
              <SheetTitle className="text-sidebar-foreground">
                <Brand />
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </header>

      <div className="lg:pl-64">
        <div className="flex justify-end border-b border-border/70 px-4 py-2 lg:hidden">
          <StorageStatus />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="size-5" strokeWidth={1.8} />
            {item.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
