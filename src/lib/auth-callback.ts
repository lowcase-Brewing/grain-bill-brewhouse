/**
 * Captures the auth callback type (invite / recovery) and any link error from
 * the URL at first module evaluation, before the auth client consumes and
 * clears the hash. Imported first by the root route.
 */
export interface AuthCallbackInfo {
  type: string | null;
  error: string | null;
}

function parse(): AuthCallbackInfo | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const type = params.get("type") ?? query.get("type");
  const error = params.get("error_description") ?? query.get("error_description") ?? params.get("error") ?? query.get("error");
  if (!type && !error) return null;
  return { type, error };
}

let captured: AuthCallbackInfo | null = parse();

/** Returns the pending invite/recovery callback once, then forgets it. */
export function takePasswordSetupCallback(): AuthCallbackInfo | null {
  const c = captured;
  if (c && (c.type === "invite" || c.type === "recovery" || c.error)) {
    captured = null;
    return c;
  }
  return null;
}

export function peekAuthCallback(): AuthCallbackInfo | null {
  return captured;
}
