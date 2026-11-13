/** Display-only rounding. Never feed these strings back into calculations. */
export function formatOG(og: number): string {
  return og.toFixed(3);
}

export function formatSignedPoints(points: number): string {
  const rounded = Number(points.toFixed(1));
  if (rounded === 0) return "0.0";
  return (rounded > 0 ? "+" : "−") + Math.abs(rounded).toFixed(1);
}

export function formatPoints(points: number): string {
  return points.toFixed(1);
}

export function formatLb(lb: number): string {
  return Number(lb.toFixed(3)).toString();
}

export function formatPercent(pct: number): string {
  return pct.toFixed(1) + "%";
}

export function formatPpg(ppg: number): string {
  return Number(ppg.toFixed(2)).toString();
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
