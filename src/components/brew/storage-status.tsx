import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useBrewStore } from "@/storage/brew-store";

export function StorageStatus({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const { status, saveState } = useBrewStore();
  let label = "Saved in this browser";
  let dot = "bg-success";
  let problem = false;
  if (status === "loading") {
    label = "Opening browser storage…";
    dot = "bg-muted-foreground";
  } else if (status === "unavailable") {
    label = "Browser storage unavailable";
    dot = "bg-destructive";
    problem = true;
  } else if (saveState === "saving") {
    label = "Saving in this browser…";
    dot = "bg-amber";
  } else if (saveState === "blocked") {
    label = "Some saving paused — see Settings";
    dot = "bg-amber";
    problem = true;
  } else if (saveState === "error") {
    label = "Couldn't save — see Settings";
    dot = "bg-destructive";
    problem = true;
  }
  const content = (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        tone === "dark" ? "text-sidebar-muted" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
  return problem ? (
    <Link to="/settings" className="hover:underline">
      {content}
    </Link>
  ) : (
    content
  );
}
