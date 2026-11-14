/** Accept same-origin paths only; old root destinations now open the workbench. */
export function safeAccountPath(target: string | undefined, origin: string): string {
  const fallback = "/workbench";
  if (!target) return fallback;
  try {
    const url = new URL(target, origin);
    if (url.origin !== origin || /^\/(auth|reset-password)(\/|$)/.test(url.pathname))
      return fallback;
    if (url.pathname === "/") return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
