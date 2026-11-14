/** Local public-tools rehearsals deliberately leave account connections off. */
export const accountBackendEnabled =
  import.meta.env["VITE_PUBLIC_TOOLS_LOCAL_ONLY"] !== "true" &&
  Boolean(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);

export function isPublicToolsPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/tools/grain-bill" || pathname === "/tools/malts";
}
