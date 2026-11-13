/**
 * Error text carried by an auth link (invitation or password reset) is already
 * percent-decoded by the time a component sees it: the router's search parsing and
 * URLSearchParams decode it once. Decoding it a second time throws URIError on a
 * literal "%" (for example a link whose error value is "%25"), which would crash the
 * recovery page instead of showing the problem. This formatter never throws and
 * returns plain text, so React's normal text escaping still applies when it renders.
 */
export function formatLinkError(
  raw: string | null | undefined,
  fallback: string,
): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length === 0) return fallback;
  return text;
}
