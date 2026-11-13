# lowcase Brewing

A private, local-first brewing workbench for lowcase Brewing in Weslaco, Texas. This is an unpublished functional MVP for recipe projects and grain bill calculations, not a marketing site.

## What is implemented

- Dashboard with real browser-saved recipe, saved-OG, draft, and library counts.
- Recipe creation, search, editing, duplication, deletion, and versioned JSON import.
- Recipe fields for name, style, semantic version, brew method, gravity parameters, description, notes, hops, yeast, and process.
- Shared standalone and recipe grain bill calculator with raw-input validation, per-row results, autosaved browser drafts, and save-back to a recipe.
- A 23-entry editable malt, adjunct, and extract library seeded from the source sheet. Saved rows retain ingredient numeric snapshots when the library changes.
- Client-side recipe JSON, readable Markdown, and planned-project manifest downloads, with sanitized file and path components.
- Editable proposed folder template and preview in Settings.
- Full browser-data backup download, raw download of unreadable storage sections, explicit section reset, and seed-library restoration.
- Desktop and mobile navigation.

The app predicts gravity only. It does not calculate ABV, attenuation, color, hops, yeast, or process schedules.

## Browser-only data and project access

Recipes, calculator drafts, library edits, and settings are stored only in this browser's `localStorage`. There is no login, cloud sync, shared database, server-side recipe storage, or automatic backup. Another browser or device will not see the data; clearing site data removes it. Download backups or recipe exports for separate copies.

The Lovable project remains **unpublished**. Its editor is workspace-accessible on the current plan; owner-only editor access requires Business/Enterprise. Brewing data entered in the app is not stored in the Lovable project.

## Source and formula mapping

Authoritative source: [lowcase Grain Bill Calculations](https://docs.google.com/spreadsheets/d/1Pt1-_KuAajbMuQyurMEO_3zRcpQgrYSYx5pL1SHncqA/edit), **Grain Bill** and **Malt Library** tabs. The included data is a read-only snapshot fetched 2026-11-13, not a live sync.

For each row:

```text
weightLb = pounds + ounces / 16
grain points   = weightLb × PPG × brewhouseEfficiency / coldFermenterGal
extract points = weightLb × PPG × extractRecovery / coldFermenterGal
estimated OG = 1 + sum(points) / 1000
difference = (estimated OG - target OG) × 1000
```

- Grain PPG is the source extract fraction × 46. The default pale DME uses direct 45 PPG.
- Grain and extract factors are never both applied to the same row.
- Bill weight and ingredient percentages include extract; mashed grain load excludes it.
- Matching source Grain Bill A8 readiness, brewhouse efficiency is validated even for extract-only bills. An entered invalid target OG suppresses aggregate points, estimated OG, and delta. A blank target allows OG and leaves only the delta blank.
- Invalid relevant rows suppress aggregate OG. Fully blank rows are ignored. Finite inputs that overflow row points or aggregate totals are reported as too large; the app never presents Infinity or NaN as a result.
- Full precision is retained in domain calculations and storage. Formatting rounds only for presentation.

Reference fixture: Maris Otter 6 lb at 36.57 PPG, Vienna 1 lb at 36.8, German Munich I 2 lb at 36.11, and pale DME 4 lb at 45; 6.5 gal, 70% grain efficiency, and 90% extract recovery. Exact results are 13 lb total, 9 lb mashed grain, 60.29353846153846 points, OG 1.0602935384615384, and +8.29353846153846 points against target 1.052. Display is OG 1.060 and +8.3.

### Extract recovery caveat

The default 90% recovery is provisional, not measured. It represents the dissolved kettle extract fraction reaching the fermenter at uniform gravity: cold fermenter volume divided by total cold post-boil kettle volume. Grain efficiency already includes its losses. Source yields are generic planning estimates; dry/as-is basis is unverified, and actual product specifications should replace assumptions.

## Architecture

```text
src/domain/        Pure formulas, validation, recipes, library, exports, manifests
src/storage/       BrewRepository interface, browser repository, React store binding
src/components/    Screens' shared UI and grain bill editor
src/routes/        TanStack Start routes and per-route metadata
```

`src/domain/calculator.ts` has no browser, UI, or storage dependencies. `src/storage/repository.ts` is the persistence boundary; the UI calls repository actions through `BrewStoreProvider` rather than reading storage directly.

`LocalBrewRepository` uses schema-versioned, Zod-validated envelopes under four keys:

- `lowcase-brewing:recipes`
- `lowcase-brewing:malt-library`
- `lowcase-brewing:settings`
- `lowcase-brewing:calculator-drafts`

Unreadable, invalid, or unsupported-version sections are not overwritten. Saving that section pauses until the user downloads the raw value, if desired, and explicitly resets it. Other sections remain usable. If browser storage cannot be opened or read, the app reports it as unavailable instead of crashing.

### Replacing the repository with authenticated storage

A future Lovable Cloud implementation should implement `BrewRepository` with kind `authenticated-backend` and keep the domain and screen contracts unchanged:

1. Enable Lovable Cloud and add authenticated user accounts.
2. Add per-user recipe, ingredient, settings, and draft records with an owner user ID and validated numeric snapshots.
3. Enforce row-level security so users can select, insert, update, and delete only their own rows. Keep privileged server access out of ordinary reads.
4. Call authenticated app server functions from a new repository implementation; do not expose private records through public routes or loaders.
5. Preserve versioned validation, explicit migration/reset behavior, and the current ingredient snapshot semantics.
6. Add conflict/offline behavior and migration from browser exports before presenting the backend as synchronized storage.

None of those backend steps is active in this scaffold.

## AppleScript and folder automation

The original AppleScript was not provided, so exact naming and action mapping are still pending. The proposed template contains Recipe, Brew Logs, Labels, and Assets folders. JSON, Markdown, and manifest exports describe that plan only. No AppleScript runs, and no Finder, local-folder, or Google Drive automation exists.

## Development and verification

```sh
bun install
bun run dev
bunx vitest run
oj typecheck -b --noEmit
bun run build
```

Verification on 2026-11-13:

- `bunx vitest run`: 6 test files, 92 tests passed.
- `oj typecheck -b --noEmit`: passed with no errors.
- `bun run build`: production client, SSR, and Cloudflare-module build passed.
- Playwright against the local app exercised recipe-form creation, reference-example calculation and save, exact saved OG, reload persistence, recipe editing without grain-bill loss, library editing with snapshot preservation, invalid-row OG suppression, and mobile drawer/bottom navigation.
- A fresh `/` load returned HTTP 200 and rendered the dashboard with no console or page errors. Two mobile menu open/close cycles and a fresh reload also passed; forced AppShell hot refreshes with the drawer both closed and open produced no errors.
- Actual JSON, Markdown, and manifest downloads were saved and inspected for recipe data, exact calculations, readable output, sanitized paths, and pending-automation metadata.

Tests cover formula parity, grain/extract factors, readiness and validation, overflow, weights and blank rows, library uniqueness and PPG derivation, snapshots, storage envelopes and reset behavior, unavailable browser storage, recipe duplication/write-back, export round trips, path sanitization, `/` route matching, and a real provider/AppShell render with Radix mobile-menu open/close.
