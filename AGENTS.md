<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## lowcase Brewing architecture

- Social sign-in uses the generated Lovable helper and a public `/auth` callback; navigate to the sanitized destination only after validated session confirmation to preserve the existing private-route gate.

- Keep calculator, recipe, library, workflow, and export rules in pure modules under `src/domain/`; this preserves formula parity and makes storage or UI changes independently testable.
- UI code accesses persistence only through `BrewRepository`; signed-in screens use `CloudBrewRepository` bound to one user id, keeping storage swappable without rewriting screens.
- Private routes live under `src/routes/_authenticated/`, whose layout keys `BrewStoreProvider` by user id; this discards prior-account state and late responses on sign-out or account switch.
- Cloud tables store validated JSON documents per owner with owner-only RLS; legacy browser data imports only via explicit, non-overwriting `planLegacyImport`.
- Use `LocalBrewRepository` with versioned, validated storage envelopes and preserve unreadable sections until explicit reset; this prevents silent data loss and prepares schema evolution.
- Store ingredient snapshots inside grain-bill rows; this keeps saved recipe calculations stable when the malt library changes.
- Keep browser storage access behind the hydrated store provider; TanStack Start SSR must not read browser-only state.
- Keep JSON, Markdown, and manifest exports client-generated; no Finder, Drive, or AppleScript automation is active.
- Run focused Vitest coverage for numeric parity, validation, snapshots, storage, and exports whenever those rules change.
